// backend/src/controllers/posController.ts
//
// الكاشير — البيع داخل المحلّ.
//
// **لماذا يهمّ:** المحلّ السوري يبيع داخل المتجر أكثر ممّا يبيع أونلاين.
// وبلا كاشير يبقى نصف مبيعاته خارج النظام: المخزون يخطئ، والتقارير تكذب،
// والقسم المالي يحسب نصف الحقيقة.
//
// **والبيع يصير `Order` كاملاً** لا جدولاً منفصلاً: بذلك يدخل التقارير
// والمخزون والقسم المالي بلا سطر إضافي في أيٍّ منها. جدولٌ موازٍ كان سيعني
// حسابين لكل رقم، ويفترقان بصمت عند أوّل تعديل.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { emitOrderRealtimeEvent } from '../realtime/socket';

/** طرق الدفع كما في تعداد Prisma — قيمة خارجها ترتدّ 500 بلا سبب مفهوم */
const PAYMENT_METHODS = ['cash', 'card', 'online', 'sham_cash'];

const getStoreId = (req: AuthRequest): string | null => req.user?.storeId || null;

// ==================== البحث ====================

/**
 * بحث سريع للكاشير.
 *
 * حقولٌ قليلة عمداً: الشاشة تُستعمل بيدٍ واحدة وزبونٌ ينتظر، فكل حقل زائد
 * تأخيرٌ في شبكةٍ بطيئة. والصور تُرسَل لأنها ما يميّز المنتج بالنظر أسرع من
 * قراءة الاسم.
 */
export const searchProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;

    const products = await prisma.product.findMany({
      where: {
        storeId,
        isAvailable: true,
        ...(categoryId ? { categoryId } : {}),
        ...(term
          ? { OR: [{ name: { contains: term } }, { sku: { contains: term } }] }
          : {})
      },
      select: {
        id: true, name: true, sku: true, price: true,
        stock: true, unit: true, imageUrl: true, categoryId: true
      },
      // الأكثر مبيعاً أولاً: الكاشير يبيع نفس العشرة أصناف طوال اليوم
      orderBy: [{ ordersCount: 'desc' }, { name: 'asc' }],
      take: 60
    });

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('POS searchProducts failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب المنتجات' });
  }
};

/**
 * قراءة الباركود.
 *
 * `sku` فريدٌ على مستوى المنصّة، ولذلك يُقيَّد بالمتجر أيضاً: بدونه يقرأ
 * كاشير متجرٍ منتجَ متجرٍ آخر لو تشابه الرمز.
 */
export const lookupBySku = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = getStoreId(req);
    const sku = String(req.params.sku || '').trim();

    if (!storeId || !sku) {
      res.status(400).json({ success: false, error: 'الرمز مطلوب' });
      return;
    }

    const product = await prisma.product.findFirst({
      where: { storeId, sku },
      select: { id: true, name: true, sku: true, price: true, stock: true, unit: true, imageUrl: true }
    });

    if (!product) {
      res.status(404).json({ success: false, error: `لا منتج بالرمز ${sku}` });
      return;
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('POS lookupBySku failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر البحث بالرمز' });
  }
};

// ==================== البيع ====================

interface SaleLine {
  productId: string;
  quantity: number;
}

/**
 * إتمام بيعة.
 *
 * **الأسعار تُقرأ من قاعدة البيانات لا من الطلب.** إرسال السعر من الواجهة
 * يعني أن أي أحد يملك رمز موظّف يستطيع بيع منتجٍ بليرة واحدة. الواجهة تعرض،
 * والخادم يحسب.
 *
 * **وكلّه في معاملة واحدة**: بيعةٌ تُسجَّل ثم يفشل خصم المخزون تترك رقماً
 * كاذباً في الجرد لا يكتشفه أحد حتى الجرد التالي.
 */
export const createSale = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    const lines: SaleLine[] = Array.isArray(req.body?.items) ? req.body.items : [];
    const paymentMethod = PAYMENT_METHODS.includes(req.body?.paymentMethod)
      ? req.body.paymentMethod
      : 'cash';
    const discountAmount = Math.max(0, Number(req.body?.discountAmount) || 0);
    const customerName = typeof req.body?.customerName === 'string'
      ? req.body.customerName.trim().slice(0, 120) || null
      : null;
    const customerPhone = typeof req.body?.customerPhone === 'string'
      ? req.body.customerPhone.trim().slice(0, 30) || null
      : null;

    const clean = lines
      .filter((l) => l && typeof l.productId === 'string' && Number(l.quantity) > 0)
      .map((l) => ({ productId: l.productId, quantity: Math.floor(Number(l.quantity)) }));

    if (clean.length === 0) {
      res.status(400).json({ success: false, error: 'لا أصناف في البيعة' });
      return;
    }

    const products = await prisma.product.findMany({
      where: { id: { in: clean.map((l) => l.productId) }, storeId },
      select: { id: true, name: true, price: true, cost: true, stock: true }
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const missing = clean.filter((l) => !byId.has(l.productId));
    if (missing.length > 0) {
      res.status(400).json({ success: false, error: 'صنفٌ في البيعة لا يتبع هذا المتجر' });
      return;
    }

    // المخزون يُفحص قبل الكتابة: بيعُ ما ليس موجوداً يترك رصيداً سالباً
    // يفسد الجرد ولا يُكتشف إلا يدوياً
    const short = clean.find((l) => (byId.get(l.productId)!.stock ?? 0) < l.quantity);
    if (short) {
      const p = byId.get(short.productId)!;
      res.status(400).json({
        success: false,
        error: `الكمية غير متوفّرة من «${p.name}» — المتاح ${p.stock}`
      });
      return;
    }

    const items = clean.map((l) => {
      const product = byId.get(l.productId)!;
      return {
        productId: product.id,
        quantity: l.quantity,
        price: Number(product.price),
        cost: product.cost ?? null
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discount = Math.min(discountAmount, subtotal);
    const total = subtotal - discount;

    const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          storeId,
          status: 'served',
          orderType: 'takeaway',
          // يميّز بيع الكاشير عن الطلب الإلكتروني في التقارير والحصّة
          orderSource: 'pos',
          customerName,
          customerPhone,
          subtotal,
          discountAmount: discount,
          total,
          paymentMethod,
          // البيع في المحلّ مدفوعٌ عند إتمامه — لا حالة «قيد التحصيل»
          isPaid: true,
          createdBy: req.user?.id || null
        }
      });

      for (const item of items) {
        await tx.orderItem.create({ data: { orderId: created.id, ...item } });
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            ordersCount: { increment: item.quantity }
          }
        });
      }

      return created;
    });

    // اللوحة على جهازٍ آخر ترى البيعة فوراً — والمخزون معها
    try {
      emitOrderRealtimeEvent({
        event: 'order.created',
        title: 'بيعة كاشير',
        message: `${orderNumber}: ${items.length} صنفاً`,
        actorId: req.user?.id || null,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          isPaid: true,
          total: Number(order.total),
          orderType: order.orderType,
          restaurantId: null,
          storeId,
          createdBy: order.createdBy,
          assignedDriverId: null
        },
        extraData: { source: 'pos' }
      });
    } catch (err) {
      console.error('تعذّر بثّ بيعة الكاشير:', err);
    }

    res.status(201).json({
      success: true,
      message: 'تمّت البيعة',
      data: {
        id: order.id,
        orderNumber,
        subtotal,
        discountAmount: discount,
        total,
        paymentMethod,
        createdAt: order.createdAt,
        items: items.map((i) => ({
          name: byId.get(i.productId)!.name,
          quantity: i.quantity,
          price: i.price,
          lineTotal: i.price * i.quantity
        }))
      }
    });
  } catch (error) {
    console.error('POS createSale failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر إتمام البيعة' });
  }
};

// ==================== ملخّص النوبة ====================

/**
 * ما بيع اليوم من الكاشير.
 *
 * الكاشير يُغلق نوبته ويطابق الصندوق — ورقمٌ نقديّ منفصل عن البطاقة هو ما
 * يحتاجه للمطابقة، لا مجموعٌ واحد.
 */
export const getShiftSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const sales = await prisma.order.findMany({
      where: { storeId, orderSource: 'pos', createdAt: { gte: since } },
      select: { total: true, paymentMethod: true, orderNumber: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    const byMethod: Record<string, number> = {};
    let total = 0;
    for (const sale of sales) {
      const amount = Number(sale.total) || 0;
      total += amount;
      const method = sale.paymentMethod || 'cash';
      byMethod[method] = (byMethod[method] || 0) + amount;
    }

    res.json({
      success: true,
      data: {
        count: sales.length,
        total,
        byMethod,
        recent: sales.slice(0, 12)
      }
    });
  } catch (error) {
    console.error('POS shift summary failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب ملخّص النوبة' });
  }
};

export default { searchProducts, lookupBySku, createSale, getShiftSummary };
