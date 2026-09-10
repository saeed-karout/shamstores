// backend/src/controllers/customerController.ts
//
// زبائن النشاط: من اشترى، وكم أنفق، ومتى آخر مرّة.
//
// **البيانات كانت كاملة والعرض غائباً.** كل طلب يحمل `createdBy` أو اسم
// وهاتف زبونٍ ضيف، ومع ذلك لا يستطيع التاجر أن يعرف من زبونه الأوفى ولا من
// انقطع عنه منذ شهرين. فالمنصّة تجمع المعلومة ولا تردّها إليه.
//
// **ولماذا يهمّ الآن:** أي حملة تسويقية لاحقة تبدأ من هنا — لا معنى
// لاستهدافٍ بلا قائمة يُستهدَف منها.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { toCsv, sendCsv } from '../services/csv.service';

/** النشاط من الرمز لا من الطلب — فلا يقرأ تاجرٌ زبائن غيره */
const getBusinessScope = (
  req: AuthRequest
): { restaurantId: string } | { storeId: string } | null => {
  if (req.user?.restaurantId) return { restaurantId: req.user.restaurantId };
  if (req.user?.storeId) return { storeId: req.user.storeId };
  return null;
};

/** الطلبات التي تُحتسب في سلوك الزبون — الملغاة ليست شراءً */
// `as const` ضروري: بدونه يستنتج TypeScript ‏`string[]` فيرفضه Prisma،
// وتتسلسل الرمية فيسقط استنتاج `select` كلّه معها
const COUNTED_STATUSES = ['pending', 'preparing', 'ready', 'delivering', 'delivered', 'served'] as const;

interface CustomerRow {
  /** معرّف الحساب، أو `guest:<هاتف>` لمن طلب بلا تسجيل */
  key: string;
  userId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  isGuest: boolean;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  firstOrderAt: string | null;
  /** لا طلب منذ ستّين يوماً — وهو الجمهور الذي تستهدفه حملة استرجاع */
  isLapsed: boolean;
}

const LAPSED_DAYS = 60;

/**
 * قائمة الزبائن مجمَّعة من الطلبات.
 *
 * **التجميع في الذاكرة لا في قاعدة البيانات** عمداً: الزبون قد يكون حساباً
 * (`createdBy`) أو ضيفاً يُعرَّف بهاتفه، ودمج المصدرين في استعلام واحد يحتاج
 * `UNION` نيئاً يكسر أمان Prisma النوعي. وحجم البيانات هنا حجم طلبات متجرٍ
 * واحد لا المنصّة كلها.
 */
/**
 * صفوف الزبائن — **دالّةٌ واحدة تخدم الشاشة والتصدير**.
 *
 * كان التجميع داخل معالج الشاشة، فالتصدير كان سيحتاج نسخةً ثانية منه —
 * ونسختان من قاعدة «الضيف بلا هاتف لا يُحتسب» تتفرّقان عند أوّل تعديل،
 * فيُصدَّر عددٌ لا يطابق ما على الشاشة.
 */
const buildCustomerRows = async (scope: Record<string, unknown>): Promise<CustomerRow[]> => {
    const orders = await prisma.order.findMany({
      where: { ...scope, status: { in: [...COUNTED_STATUSES] } },
      select: {
        createdBy: true,
        customerName: true,
        customerPhone: true,
        total: true,
        createdAt: true,
        creator: { select: { id: true, name: true, phone: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const byKey = new Map<string, CustomerRow>();
    const lapsedBefore = new Date(Date.now() - LAPSED_DAYS * 24 * 60 * 60 * 1000);

    for (const order of orders) {
      const phone = order.customerPhone || order.creator?.phone || null;

      // الضيف بلا هاتف لا يُميَّز عن غيره — دمجُه بالاسم يخلط شخصين
      // يتشابه اسمهما، فيُترك خارج القائمة بدل أن يُنسب إليه إنفاق غيره
      const key = order.createdBy
        ? `user:${order.createdBy}`
        : phone
        ? `guest:${phone}`
        : null;
      if (!key) continue;

      const existing = byKey.get(key);
      const total = Number(order.total) || 0;
      const at = order.createdAt.toISOString();

      if (existing) {
        existing.ordersCount += 1;
        existing.totalSpent += total;
        // الطلبات مرتّبة تنازلياً، فالأوّل هو الأحدث والأخير هو الأقدم
        existing.firstOrderAt = at;
      } else {
        byKey.set(key, {
          key,
          userId: order.createdBy || null,
          name: order.creator?.name || order.customerName || 'زبون',
          phone,
          email: order.creator?.email || null,
          isGuest: !order.createdBy,
          ordersCount: 1,
          totalSpent: total,
          lastOrderAt: at,
          firstOrderAt: at,
          isLapsed: order.createdAt < lapsedBefore
        });
      }
    }

    return Array.from(byKey.values()).sort((a, b) => b.totalSpent - a.totalSpent);
};

export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = getBusinessScope(req);
    if (!scope) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const customers = await buildCustomerRows(scope as Record<string, unknown>);

    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const countedOrders = customers.reduce((sum, c) => sum + c.ordersCount, 0);
    const returning = customers.filter((c) => c.ordersCount > 1).length;

    res.json({
      success: true,
      data: {
        customers,
        summary: {
          total: customers.length,
          registered: customers.filter((c) => !c.isGuest).length,
          guests: customers.filter((c) => c.isGuest).length,
          /** من طلب أكثر من مرّة — الرقم الذي يقول هل يعود الناس */
          returning,
          lapsed: customers.filter((c) => c.isLapsed).length,
          totalRevenue,
          /**
           * متوسّط قيمة الطلب.
           *
           * المقام مجموع طلبات الزبائن المعروفين لا كل الطلبات المحسوبة.
           * وكان الثاني — فتُقسَم إيراداتٌ مَنسوبة على طلباتٍ بعضها غير
           * منسوب (ضيفٌ بلا هاتف)، فيخرج متوسّطٌ أقلّ من الحقيقة.
           */
          averageOrderValue:
            countedOrders > 0 ? Math.round((totalRevenue / countedOrders) * 100) / 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('getCustomers failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب الزبائن' });
  }
};

/** طلبات زبونٍ واحد — يُفتح من القائمة */
export const getCustomerOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = getBusinessScope(req);
    if (!scope) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const { key } = req.params;
    const [kind, value] = String(key).split(/:(.+)/);

    if (!value || (kind !== 'user' && kind !== 'guest')) {
      res.status(400).json({ success: false, error: 'معرّف الزبون غير صالح' });
      return;
    }

    const where: any = { ...scope, status: { in: [...COUNTED_STATUSES] } };
    if (kind === 'user') where.createdBy = value;
    else {
      where.createdBy = null;
      where.customerPhone = value;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        orderType: true,
        isPaid: true,
        rating: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            price: true,
            menuItem: { select: { name: true } },
            product: { select: { name: true } }
          }
        }
      }
    });

    res.json({
      success: true,
      data: orders.map((order) => ({
        ...order,
        items: order.items.map((item) => ({
          name: item.menuItem?.name || item.product?.name || 'صنف',
          quantity: item.quantity,
          price: Number(item.price)
        }))
      }))
    });
  } catch (error) {
    console.error('getCustomerOrders failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب طلبات الزبون' });
  }
};

export default { getCustomers, getCustomerOrders };

// ==================== التصدير ====================

/**
 * قائمة الزبائن ملفَّ CSV.
 *
 * **ما فيه وما ليس فيه:** الاسم والهاتف والبريد وعدد الطلبات والإنفاق
 * وتاريخا أوّل طلبٍ وآخره. ولا معرّفات داخلية — الملفّ يُفتح في Excel
 * ويُرسل إلى محاسبٍ أو يُستعمل في حملة، ومعرّف الحساب لا يعني شيئاً هناك
 * ويصعّب قراءة الجدول.
 */
export const exportCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = getBusinessScope(req);
    if (!scope) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const customers = await buildCustomerRows(scope as Record<string, unknown>);
    const day = (value: string | null) => (value ? value.slice(0, 10) : '');

    const rows = customers.map((c) => [
      c.name,
      c.phone ?? '',
      c.email ?? '',
      c.isGuest ? 'ضيف' : 'مسجَّل',
      c.ordersCount,
      c.totalSpent,
      day(c.firstOrderAt),
      day(c.lastOrderAt),
      c.isLapsed ? 'نعم' : 'لا'
    ]);

    sendCsv(
      res,
      `customers-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        [
          'الاسم',
          'الهاتف',
          'البريد',
          'النوع',
          'عدد الطلبات',
          'إجمالي الإنفاق',
          'أول طلب',
          'آخر طلب',
          'متغيّب'
        ],
        rows
      )
    );
  } catch (error) {
    console.error('exportCustomers failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تصدير قائمة الزبائن' });
  }
};
