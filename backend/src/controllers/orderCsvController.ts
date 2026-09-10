// backend/src/controllers/orderCsvController.ts
//
// تصدير الطلبات ملفَّ CSV.
//
// **ما يحلّه:** التاجر يحتاج طلباته في جدول ليضمّها إلى دفتره أو يرسلها
// لمحاسبه أو يفرزها بما لا تفرزه الشاشة. وكان يقرأها من الشاشة صفحةً
// صفحة — والشاشة مُصفَّحة، فالتصدير من الخادم يشمل المدى كلّه لا
// المحمَّل منه.
//
// **وصفٌّ لكل صنفٍ لا لكل طلب.** جدولٌ بسطرٍ لكل طلبٍ ومحتوياته مكدّسة في
// خلية لا يُفرز ولا يُجمَع في Excel. والسطر لكل صنف هو ما يسمح بجدول
// محوريّ يقول «كم بيعتُ من هذا المنتج» — وهو أوّل سؤال يُسأل.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { toCsv, sendCsv } from '../services/csv.service';

const STATUS_LABEL: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكَّد',
  preparing: 'قيد التجهيز',
  ready: 'جاهز',
  delivering: 'في الطريق',
  delivered: 'تمّ التسليم',
  served: 'مكتمل',
  cancelled: 'ملغي'
};

const TYPE_LABEL: Record<string, string> = {
  dine_in: 'في المكان',
  takeaway: 'استلام',
  delivery: 'توصيل',
  shipping: 'شحن'
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'نقداً',
  sham_cash: 'شام كاش',
  card: 'بطاقة'
};

/** يقبل مطعماً أو متجراً — الشاشتان مختلفتان والتصدير واحد */
const scopeOf = (req: AuthRequest): Record<string, string> | null => {
  if (req.user?.storeId) return { storeId: req.user.storeId };
  if (req.user?.restaurantId) return { restaurantId: req.user.restaurantId };
  return null;
};

export const exportOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = scopeOf(req);
    if (!scope) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    // المدى اختياريّ: بلا تاريخين يُصدَّر كل شيء، وهو ما يريده من ينقل
    // بياناته. و`to` يُمدّ إلى آخر اليوم وإلا سقطت طلبات يومه الأخير
    const { from, to } = req.query as { from?: string; to?: string };
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) createdAt.lte = new Date(`${to}T23:59:59.999Z`);

    const orders = await prisma.order.findMany({
      where: { ...scope, ...(from || to ? { createdAt } : {}) },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
            menuItem: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      // حدٌّ يحمي الذاكرة: عشرون ألف طلبٍ بأصنافها ملفٌّ بعشرات الميغا
      take: 20000
    });

    const headers = [
      'رقم الطلب',
      'التاريخ',
      'الحالة',
      'نوع الطلب',
      'الزبون',
      'الهاتف',
      'المحافظة',
      'العنوان',
      'رمز المنتج',
      'الصنف',
      'الكمية',
      'سعر الوحدة',
      'إجمالي الصنف',
      'المجموع الفرعي',
      'الخصم',
      'التوصيل',
      'إجمالي الطلب',
      'طريقة الدفع',
      'مدفوع',
      'ملاحظات'
    ];

    const rows: (string | number)[][] = [];

    for (const order of orders) {
      const at = order.createdAt.toISOString().replace('T', ' ').slice(0, 16);
      const head = [
        order.orderNumber,
        at,
        STATUS_LABEL[order.status] || order.status,
        TYPE_LABEL[order.orderType] || order.orderType,
        order.customerName || '',
        order.customerPhone || '',
        order.governorate || '',
        order.deliveryAddress || ''
      ];
      const tail = [
        Number(order.subtotal ?? 0),
        Number(order.discountAmount ?? 0),
        Number(order.deliveryFee ?? 0),
        Number(order.total ?? 0),
        PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod,
        order.isPaid ? 'نعم' : 'لا',
        order.notes || ''
      ];

      // طلبٌ بلا أصناف يبقى سطراً واحداً: إخفاؤه يجعل مجموع الملفّ لا
      // يطابق مجموع الشاشة، والتاجر يعدّ ذلك عيباً بحقّ
      if (order.items.length === 0) {
        rows.push([...head, '', '', '', '', '', ...tail]);
        continue;
      }

      order.items.forEach((item, index) => {
        const unit = Number(item.price) || 0;
        const qty = Number(item.quantity) || 0;
        rows.push([
          ...head,
          item.product?.sku || '',
          item.product?.name || item.menuItem?.name || 'صنف',
          qty,
          unit,
          Math.round(unit * qty * 100) / 100,
          // مجاميع الطلب على سطره الأوّل وحده — تكرارها على كل صنف يجعل
          // جمعَ العمود في Excel يضاعف الإيراد
          ...(index === 0 ? tail : ['', '', '', '', '', '', ''])
        ]);
      });
    }

    const stamp = from || to ? `${from || 'all'}_${to || 'now'}` : new Date().toISOString().slice(0, 10);
    sendCsv(res, `orders-${stamp}.csv`, toCsv(headers, rows));
  } catch (error) {
    console.error('exportOrders failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تصدير الطلبات' });
  }
};

export default { exportOrders };
