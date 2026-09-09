// backend/src/controllers/posController.ts
//
// الكاشير — البيع داخل المحلّ، للمتاجر والمطاعم معاً.
//
// **لماذا يهمّ:** المحلّ السوري يبيع داخل المتجر أكثر ممّا يبيع أونلاين.
// وبلا كاشير يبقى نصف مبيعاته خارج النظام: المخزون يخطئ، والتقارير تكذب،
// والقسم المالي يحسب نصف الحقيقة.
//
// **والبيع يصير `Order` كاملاً** لا جدولاً منفصلاً: بذلك يدخل التقارير
// والمخزون والقسم المالي بلا سطر إضافي في أيٍّ منها. جدولٌ موازٍ كان سيعني
// حسابين لكل رقم، ويفترقان بصمت عند أوّل تعديل.
//
// **والفرق بين النشاطين حقيقي لا شكلي:**
//   - المتجر يبيع `Product` بمخزونٍ يُخصم ويُفحص قبل البيع.
//   - المطعم يبيع `MenuItem` بلا مخزون — الوجبة تُطبخ عند الطلب، وفحصُ
//     رصيدٍ لا وجود له كان سيمنع كل بيعة.
// ولذلك الشيفرة تتفرّع عند المخزون وحده، لا عند كل خطوة.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { emitOrderRealtimeEvent } from '../realtime/socket';

/** طرق الدفع كما في تعداد Prisma — قيمة خارجها ترتدّ 500 بلا سبب مفهوم */
const PAYMENT_METHODS = ['cash', 'card', 'online', 'sham_cash'];

type BusinessKind = 'restaurant' | 'store';
interface Business {
  id: string;
  kind: BusinessKind;
}

const getBusiness = (req: AuthRequest): Business | null => {
  if (req.user?.restaurantId) return { id: req.user.restaurantId, kind: 'restaurant' };
  if (req.user?.storeId) return { id: req.user.storeId, kind: 'store' };
  return null;
};

/** شكلٌ موحَّد للصنف مهما كان مصدره — الواجهة لا تعرف الفرق ولا تحتاجه */
interface SellableItem {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  /** `null` للمطعم: لا مخزون يُتتبَّع، وصفرٌ هنا كان سيُقرأ «نفد» */
  stock: number | null;
  unit: string;
  imageUrl: string | null;
}

// ==================== البحث ====================

/**
 * بحث سريع للكاشير.
 *
 * حقولٌ قليلة عمداً: الشاشة تُستعمل بيدٍ واحدة وزبونٌ ينتظر، فكل حقل زائد
 * تأخيرٌ في شبكةٍ بطيئة. والصور تُرسَل لأنها ما يميّز الصنف بالنظر أسرع من
 * قراءة الاسم.
 */
export const searchProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;

    let items: SellableItem[];

    if (business.kind === 'store') {
      const rows = await prisma.product.findMany({
        where: {
          storeId: business.id,
          isAvailable: true,
          ...(categoryId ? { categoryId } : {}),
          ...(term ? { OR: [{ name: { contains: term } }, { sku: { contains: term } }] } : {})
        },
        select: { id: true, name: true, sku: true, price: true, stock: true, unit: true, imageUrl: true },
        // الأكثر مبيعاً أولاً: الكاشير يبيع نفس العشرة أصناف طوال اليوم
        orderBy: [{ ordersCount: 'desc' }, { name: 'asc' }],
        take: 60
      });
      items = rows.map((r) => ({ ...r, price: Number(r.price) }));
    } else {
      const rows = await prisma.menuItem.findMany({
        where: {
          restaurantId: business.id,
          isAvailable: true,
          ...(categoryId ? { categoryId } : {}),
          ...(term ? { OR: [{ name: { contains: term } }, { sku: { contains: term } }] } : {})
        },
        select: { id: true, name: true, sku: true, price: true, image: true, trackStock: true, stock: true },
        orderBy: [{ ordersCount: 'desc' }, { name: 'asc' }],
        take: 60
      });
      items = rows.map((r) => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        price: Number(r.price),
        // `null` لغير المتتبَّع، والرقم للمتتبَّع — والفرق يحسم هل يُمنع البيع
        stock: r.trackStock ? (r.stock ?? 0) : null,
        unit: 'piece',
        imageUrl: r.image
      }));
    }

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('POS searchProducts failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب الأصناف' });
  }
};

/**
 * قراءة الباركود.
 *
 * البحث مقيَّد بالنشاط دائماً: رمزان متطابقان في محلّين مختلفين ليسا
 * تعارضاً، وبلا القيد يقرأ كاشيرٌ صنفَ غيره.
 */
export const lookupBySku = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    const sku = String(req.params.sku || '').trim();

    if (!business || !sku) {
      res.status(400).json({ success: false, error: 'الرمز مطلوب' });
      return;
    }

    let item: SellableItem | null = null;

    if (business.kind === 'store') {
      const row = await prisma.product.findFirst({
        where: { storeId: business.id, sku },
        select: { id: true, name: true, sku: true, price: true, stock: true, unit: true, imageUrl: true }
      });
      if (row) item = { ...row, price: Number(row.price) };
    } else {
      const row = await prisma.menuItem.findFirst({
        where: { restaurantId: business.id, sku },
        select: { id: true, name: true, sku: true, price: true, image: true, trackStock: true, stock: true }
      });
      if (row) {
        item = {
          id: row.id, name: row.name, sku: row.sku, price: Number(row.price),
          stock: row.trackStock ? (row.stock ?? 0) : null, unit: 'piece', imageUrl: row.image
        };
      }
    }

    if (!item) {
      res.status(404).json({ success: false, error: `لا صنف بالرمز ${sku}` });
      return;
    }

    res.json({ success: true, data: item });
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
 * يعني أن أي أحد يملك رمز موظّف يستطيع بيع صنفٍ بليرة واحدة. الواجهة تعرض،
 * والخادم يحسب.
 *
 * **وكلّه في معاملة واحدة**: بيعةٌ تُسجَّل ثم يفشل خصم المخزون تترك رقماً
 * كاذباً في الجرد لا يكتشفه أحد حتى الجرد التالي.
 */
export const createSale = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
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

    const ids = clean.map((l) => l.productId);
    const isStore = business.kind === 'store';

    const catalog = isStore
      ? (await prisma.product.findMany({
          where: { id: { in: ids }, storeId: business.id },
          select: { id: true, name: true, price: true, cost: true, stock: true }
        })).map((p) => ({ ...p, price: Number(p.price), stock: p.stock as number | null }))
      : (await prisma.menuItem.findMany({
          where: { id: { in: ids }, restaurantId: business.id },
          select: { id: true, name: true, price: true, trackStock: true, stock: true }
        })).map((m: any) => ({
          ...m,
          price: Number(m.price),
          cost: null as number | null,
          // نفس القاعدة: غير المتتبَّع `null` فلا يُفحص سقفه
          stock: m.trackStock ? ((m.stock as number | null) ?? 0) : null
        }));

    const byId = new Map(catalog.map((c) => [c.id, c]));

    if (clean.some((l) => !byId.has(l.productId))) {
      res.status(400).json({ success: false, error: 'صنفٌ في البيعة لا يتبع هذا النشاط' });
      return;
    }

    // **المخزون يُفحص للمتتبَّع لا لنوع النشاط.**
    //
    // كان الفحص للمتاجر وحدها، بحجّة أن المطعم يطبخ عند الطلب. والحجّة
    // صحيحةٌ للوجبات وخاطئةٌ للمعلّبات: مطعمٌ يبيع بيبسي له عدد. فالمعيار
    // الآن `stock !== null` — أي «هل لهذا الصنف رصيدٌ يُتتبَّع» — وهو صحيح
    // للطرفين، ويستثني وجبات المطعم من تلقاء نفسه.
    const short = clean.find((l) => {
      const item = byId.get(l.productId)!;
      return item.stock !== null && item.stock < l.quantity;
    });
    if (short) {
      const item = byId.get(short.productId)!;
      res.status(400).json({
        success: false,
        error: `الكمية غير متوفّرة من «${item.name}» — المتاح ${item.stock}`
      });
      return;
    }

    const items = clean.map((l) => {
      const found = byId.get(l.productId)!;
      return { id: found.id, quantity: l.quantity, price: found.price, cost: found.cost ?? null };
    });

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discount = Math.min(discountAmount, subtotal);
    const total = subtotal - discount;
    const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          ...(isStore ? { storeId: business.id } : { restaurantId: business.id }),
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
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            ...(isStore ? { productId: item.id } : { menuItemId: item.id }),
            quantity: item.quantity,
            price: item.price,
            cost: item.cost
          }
        });

        if (isStore) {
          await tx.product.update({
            where: { id: item.id },
            data: { stock: { decrement: item.quantity }, ordersCount: { increment: item.quantity } }
          });
        } else {
          // المخزون يُخصم للمتتبَّع وحده. والكتالوج مقروءٌ قبل المعاملة فلا
          // نستعلم داخلها لكل صنف — معاملةٌ طويلة تُقفل صفوفاً تحت الضغط.
          const tracked = byId.get(item.id)?.stock !== null;
          await tx.menuItem.update({
            where: { id: item.id },
            data: {
              ordersCount: { increment: item.quantity },
              ...(tracked ? { stock: { decrement: item.quantity } } : {})
            }
          });
        }
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
          restaurantId: isStore ? null : business.id,
          storeId: isStore ? business.id : null,
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
          name: byId.get(i.id)!.name,
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
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const sales = await prisma.order.findMany({
      where: {
        ...(business.kind === 'store' ? { storeId: business.id } : { restaurantId: business.id }),
        orderSource: 'pos',
        createdAt: { gte: since }
      },
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
      data: { count: sales.length, total, byMethod, recent: sales.slice(0, 12) }
    });
  } catch (error) {
    console.error('POS shift summary failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب ملخّص النوبة' });
  }
};

export default { searchProducts, lookupBySku, createSale, getShiftSummary };
