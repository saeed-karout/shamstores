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
import { getPricingConfig, priceForItem } from '../services/usdPricing.service';
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
        select: { id: true, name: true, sku: true, price: true, priceUsd: true, stock: true, unit: true, imageUrl: true },
        // الأكثر مبيعاً أولاً: الكاشير يبيع نفس العشرة أصناف طوال اليوم
        orderBy: [{ ordersCount: 'desc' }, { name: 'asc' }],
        take: 60
      });
      // نفس سعر الواجهة والطلب: المسعّر بالدولار يُحسب بسعر الصرف الآن
      const cfg = await getPricingConfig('store', business.id);
      items = rows.map(({ priceUsd, ...r }) => ({ ...r, price: priceForItem({ price: r.price, priceUsd }, cfg).price }));
    } else {
      const rows = await prisma.menuItem.findMany({
        where: {
          restaurantId: business.id,
          isAvailable: true,
          ...(categoryId ? { categoryId } : {}),
          ...(term ? { OR: [{ name: { contains: term } }, { sku: { contains: term } }] } : {})
        },
        select: { id: true, name: true, sku: true, price: true, priceUsd: true, image: true, trackStock: true, stock: true },
        orderBy: [{ ordersCount: 'desc' }, { name: 'asc' }],
        take: 60
      });
      const cfg = await getPricingConfig('restaurant', business.id);
      items = rows.map((r) => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        price: priceForItem(r, cfg).price,
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
        select: { id: true, name: true, sku: true, price: true, priceUsd: true, stock: true, unit: true, imageUrl: true }
      });
      if (row) {
        const { priceUsd, ...rest } = row;
        const cfg = await getPricingConfig('store', business.id);
        item = { ...rest, price: priceForItem({ price: row.price, priceUsd }, cfg).price };
      }
    } else {
      const row = await prisma.menuItem.findFirst({
        where: { restaurantId: business.id, sku },
        select: { id: true, name: true, sku: true, price: true, priceUsd: true, image: true, trackStock: true, stock: true }
      });
      if (row) {
        const cfg = await getPricingConfig('restaurant', business.id);
        item = {
          id: row.id, name: row.name, sku: row.sku, price: priceForItem(row, cfg).price,
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
  /** سعر الجهاز — يُقرأ للبيعة المؤجّلة وحدها */
  price?: number;
}

// ==================== البيع دون اتصال ====================
//
// الكهرباء والإنترنت ينقطعان في المحلّ السوري أكثر ممّا يبقيان. والكاشير
// لا يستطيع أن يقول للزبون «ارجع حين يعود النت» — فيبيع، والجهاز يحفظ
// البيعة في طابورٍ محلّي ويرسلها حين يعود الاتصال.
//
// **مفتاح عدم التكرار يولّده الجهاز لا الخادم:** على شبكةٍ ضعيفة قد تصل
// البيعة ويضيع الردّ، فيظنّها الجهاز فشلت ويعيدها. المفتاح نفسه في
// المحاولتين يجعل الثانية تعيد إيصال الأولى بدل بيعةٍ مكرّرة ومخزونٍ
// مخصومٍ مرّتين.

const IDEMPOTENCY_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** أقصى عمرٍ لبيعةٍ مؤجّلة يُقبل تاريخها كما هو — جهازٌ بساعةٍ مخطئة لا يكتب في الشهر الماضي */
const OFFLINE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * وقت البيع الفعليّ لبيعةٍ مؤجّلة.
 *
 * بيعةٌ تمّت الحادية عشرة ليلاً ووصلت صباحاً تُحسب لنوبة أمس لا اليوم —
 * وإلا لم يطابق الصندوق أيّاً من اليومين. والتاريخ المستقبليّ أو القديم
 * جداً ساعةُ جهازٍ مخطئة فيُهمل ويُعتمد وقت الوصول.
 */
const parseSoldAt = (value: unknown): Date | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  const now = Date.now();
  if (time > now + 5 * 60 * 1000 || now - time > OFFLINE_MAX_AGE_MS) return null;
  return date;
};

/** إيصال بيعةٍ مسجّلة — لإعادته كما هو حين تصل المحاولة نفسها مرّةً ثانية */
const receiptOf = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          quantity: true,
          price: true,
          product: { select: { name: true } },
          menuItem: { select: { name: true } }
        }
      }
    }
  });
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    subtotal: Number(order.subtotal ?? 0),
    discountAmount: Number(order.discountAmount ?? 0),
    total: Number(order.total),
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    stockShortage: order.stockShortage,
    duplicate: true,
    items: order.items.map((i) => ({
      name: i.product?.name || i.menuItem?.name || '—',
      quantity: i.quantity,
      price: Number(i.price),
      lineTotal: Number(i.price) * i.quantity
    }))
  };
};

/** بيعةٌ سبقت بالمفتاح نفسه لهذا النشاط؟ — مفتاحُ نشاطٍ آخر لا يكشف بيعته */
const findByIdempotencyKey = async (business: Business, key: string) => {
  const row = await prisma.posSaleKey.findUnique({
    where: { key },
    select: { order: { select: { id: true, storeId: true, restaurantId: true } } }
  });
  const existing = row?.order;
  if (!existing) return { found: false as const };
  const owner = business.kind === 'store' ? existing.storeId : existing.restaurantId;
  if (owner !== business.id) return { found: true as const, foreign: true as const };
  return { found: true as const, foreign: false as const, id: existing.id };
};

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

    // ---------- عدم التكرار والبيع المؤجّل ----------
    const rawKey = typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey.trim() : '';
    const idempotencyKey = IDEMPOTENCY_RE.test(rawKey) ? rawKey : null;
    // «مؤجّلة» = بيعت والجهاز بلا اتصال والنقود في الدرج. لا تُرفض لنقص
    // الرصيد: رفضُها لا يعيد البضاعة إلى الرفّ، بل يُسقط بيعةً حقيقية من
    // الدفاتر. فتُقبل ويُرفع علمٌ يراجعه التاجر.
    const offline = req.body?.offline === true;
    const soldAt = offline ? parseSoldAt(req.body?.soldAt) : null;

    if (idempotencyKey) {
      const prior = await findByIdempotencyKey(business, idempotencyKey);
      if (prior.found) {
        if (prior.foreign) {
          res.status(409).json({ success: false, error: 'مفتاح البيعة مستعمل' });
          return;
        }
        const receipt = await receiptOf(prior.id);
        res.status(200).json({ success: true, message: 'البيعة مسجّلة سابقاً', data: receipt });
        return;
      }
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
      .map((l) => ({
        productId: l.productId,
        quantity: Math.floor(Number(l.quantity)),
        // سعر الجهاز لحظة البيع — يُعتمد للمؤجّلة وحدها (راجع `items` أدناه)
        devicePrice: offline && Number.isFinite(Number(l.price)) ? Number(l.price) : null
      }));

    if (clean.length === 0) {
      res.status(400).json({ success: false, error: 'لا أصناف في البيعة' });
      return;
    }

    const ids = clean.map((l) => l.productId);
    const isStore = business.kind === 'store';

    // السعر المسعّر بالدولار يُحسب بالليرة بسعر الصرف لحظة البيع — نفس دالة
    // الطلب الإلكتروني، فلا يفترق سعر الكاشير عن سعر الواجهة
    const pricing = await getPricingConfig(business.kind, business.id);
    const catalog = isStore
      ? (await prisma.product.findMany({
          where: { id: { in: ids }, storeId: business.id },
          select: { id: true, name: true, price: true, priceUsd: true, cost: true, stock: true }
        })).map((p) => ({ ...p, ...priceForItem(p, pricing), stock: p.stock as number | null }))
      : (await prisma.menuItem.findMany({
          where: { id: { in: ids }, restaurantId: business.id },
          select: { id: true, name: true, price: true, priceUsd: true, trackStock: true, stock: true }
        })).map((m: any) => ({
          ...m,
          ...priceForItem(m, pricing),
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
    const shortages = clean.filter((l) => {
      const item = byId.get(l.productId)!;
      return item.stock !== null && item.stock < l.quantity;
    });
    const short = shortages[0];
    // البيعة المؤجّلة تمرّ ولو نقص الرصيد — راجع التعليق عند `offline` أعلاه
    if (short && !offline) {
      const item = byId.get(short.productId)!;
      res.status(400).json({
        success: false,
        error: `الكمية غير متوفّرة من «${item.name}» — المتاح ${item.stock}`
      });
      return;
    }

    // **البيعة المؤجّلة بسعر الجهاز لا بسعر اليوم.** الزبون دفع ما رآه على
    // الشاشة والنقود في الدرج؛ إعادة حسابها بسعر صرفٍ تغيّر بعد ساعات تجعل
    // الدفاتر تخالف الدرج. والحدّ (نصف السعر الحالي إلى ضعفه) يصدّ رقماً
    // فاسداً في ذاكرة الجهاز لا تقلّب سعر الصرف — وما خرج عنه يُحسب بسعر اليوم.
    const items = clean.map((l) => {
      const found = byId.get(l.productId)!;
      const trusted =
        l.devicePrice !== null &&
        l.devicePrice > 0 &&
        l.devicePrice >= found.price * 0.5 &&
        l.devicePrice <= found.price * 2;
      return {
        id: found.id,
        quantity: l.quantity,
        price: trusted ? (l.devicePrice as number) : found.price,
        priceUsd: found.priceUsd,
        cost: found.cost ?? null
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discount = Math.min(discountAmount, subtotal);
    const total = subtotal - discount;
    const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;

    // الرصيد يصير سالباً هنا عمداً: هو الحقيقة — البضاعة خرجت من المحلّ.
    // والملاحظة تسمّي الأصناف كي يعرف التاجر ماذا يجرد، لا أن هناك «شيئاً ما»
    const stockShortage = offline && shortages.length > 0;
    const shortageNote = stockShortage
      ? `بيعت دون اتصال والرصيد لم يكفِ: ${shortages
          .map((l) => `«${byId.get(l.productId)!.name}» (المتاح ${byId.get(l.productId)!.stock}، المباع ${l.quantity})`)
          .join('، ')}`
      : null;

    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
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
          createdBy: req.user?.id || null,
          idempotencyKey,
          ...(soldAt ? { createdAt: soldAt, offlineSoldAt: soldAt } : {}),
          stockShortage,
          notes: shortageNote,
          exchangeRate: items.some((i) => i.priceUsd !== null) ? pricing?.effectiveRate ?? null : null
        }
      });

      // المفتاح داخل المعاملة: إن سبقه مطابقٌ رفضه القيد الفريد وسقطت البيعة كلّها
      if (idempotencyKey) {
        await tx.posSaleKey.create({ data: { key: idempotencyKey, orderId: created.id } });
      }

      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            ...(isStore ? { productId: item.id } : { menuItemId: item.id }),
            quantity: item.quantity,
            price: item.price,
            priceUsd: item.priceUsd,
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
    } catch (error: any) {
      // سباق: محاولتان بالمفتاح نفسه وصلتا معاً (الطابور وإعادة يدوية)،
      // فسبقت إحداهما. قيد التفرّد رفض الثانية كاملةً — لا صنف ولا خصم —
      // فنعيد إيصال الأولى كأن الثانية لم تكن.
      if (idempotencyKey && error?.code === 'P2002') {
        const prior = await findByIdempotencyKey(business, idempotencyKey);
        if (prior.found && !prior.foreign) {
          res.status(200).json({ success: true, message: 'البيعة مسجّلة سابقاً', data: await receiptOf(prior.id) });
          return;
        }
      }
      throw error;
    }

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
        stockShortage,
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

    /**
     * مرتجعات اليوم — بتاريخ الإرجاع لا بتاريخ البيعة.
     *
     * الكاشير يطابق ما في الصندوق **الآن**: مالٌ خرج اليوم لبيعةٍ من الأمس
     * خرج من صندوق اليوم. أمّا القسم المالي فيطرحه من بيعته الأصل (الربح
     * يُنسب إلى يوم البيع) — سؤالان مختلفان وجوابان صحيحان كلٌّ في مكانه.
     */
    const returns = await prisma.posReturn.findMany({
      where: {
        ...(business.kind === 'store' ? { storeId: business.id } : { restaurantId: business.id }),
        createdAt: { gte: since }
      },
      select: { returnNumber: true, orderNumber: true, amount: true, refundMethod: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    const refundsByMethod: Record<string, number> = {};
    let refundsTotal = 0;
    for (const ret of returns) {
      refundsTotal += ret.amount;
      refundsByMethod[ret.refundMethod] = (refundsByMethod[ret.refundMethod] || 0) + ret.amount;
    }

    // بيعاتٌ مؤجّلة وصلت والرصيد لا يكفيها — أسبوعٌ لا يومٌ: المزامنة قد
    // تتأخّر يوماً، والتاجر يحتاج أن يراها حتى يجرد لا أن تختفي بانتهاء النوبة
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stockShortages = await prisma.order.findMany({
      where: {
        ...(business.kind === 'store' ? { storeId: business.id } : { restaurantId: business.id }),
        orderSource: 'pos',
        stockShortage: true,
        createdAt: { gte: weekAgo }
      },
      select: { orderNumber: true, notes: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // الصافي لكل طريقة — «النقد في الدرج» هو صافي النقد لا إجمالي مبيعاته
    const netByMethod: Record<string, number> = { ...byMethod };
    for (const [method, amount] of Object.entries(refundsByMethod)) {
      netByMethod[method] = (netByMethod[method] || 0) - amount;
    }

    res.json({
      success: true,
      data: {
        count: sales.length,
        /** إجمالي المبيعات قبل المرتجعات — يبقى كما كان لمن يقرؤه (تطبيق التاجر) */
        total,
        byMethod,
        recent: sales.slice(0, 12),
        refundsCount: returns.length,
        refundsTotal,
        refundsByMethod,
        /** صافي المبيعات = المبيعات − المرتجعات */
        net: total - refundsTotal,
        netByMethod,
        recentReturns: returns.slice(0, 12),
        stockShortages
      }
    });
  } catch (error) {
    console.error('POS shift summary failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب ملخّص النوبة' });
  }
};

// ==================== المرتجعات ====================
//
// **المرتجع مستندٌ لا تعديل.** البيعة تبقى كما كانت — بأصنافها وكمّياتها
// ومبلغها — ويُضاف بجانبها مستندُ إرجاعٍ بما عاد ومتى ولماذا وكيف رُدّ المال.
// تعديل البيعة نفسها كان سيمحو أن البيع حدث، فيبدو يومٌ باع فيه الكاشير
// عشرين قطعةً وأرجع خمساً كأنه باع خمس عشرة — والفرق هو بالضبط ما يحتاج
// التاجر أن يراه (بضاعةٌ ترتدّ = عيبٌ في الصنف أو في البيع).
//
// **والأثر المالي يمرّ عبر `Order.returnAmount`** الذي يقرؤه القسم المالي
// أصلاً ويطرحه من الصافي ويقتطع من الربح بنسبته. فيُحدَّث هنا مجموعاً لكلّ
// مرتجعات البيعة، ولا يتعلّم القسم المالي مصدراً ثانياً.

/** حالاتٌ تعني أن البيع تمّ فعلاً — ما قبلها يُلغى لا يُرجَع */
const RETURNABLE_STATUSES = ['served', 'delivered'];

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** يقبل رقم البيعة بصيغها التي يكتبها الكاشير فعلاً، أو معرّفها */
const findSaleForBusiness = async (business: Business, ref: string) => {
  const scope = business.kind === 'store' ? { storeId: business.id } : { restaurantId: business.id };
  const clean = ref.trim().replace(/^#/, '');
  // الكاشير يقرأ الرقم من الإيصال فيكتبه بلا البادئة أحياناً — «LZ3K9» لا
  // «POS-LZ3K9». والمقارنة في MySQL لا تفرّق بين الحروف الكبيرة والصغيرة.
  const candidates = Array.from(new Set([clean, `POS-${clean}`.replace(/^POS-POS-/i, 'POS-')]));

  return prisma.order.findFirst({
    where: { ...scope, OR: [{ id: clean }, { orderNumber: { in: candidates } }] },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      orderSource: true,
      createdAt: true,
      total: true,
      subtotal: true,
      discountAmount: true,
      paymentMethod: true,
      customerName: true,
      customerPhone: true,
      returnedAt: true,
      returnAmount: true,
      items: {
        select: {
          id: true,
          productId: true,
          menuItemId: true,
          quantity: true,
          price: true,
          product: { select: { name: true } },
          menuItem: { select: { name: true } }
        }
      }
    }
  });
};

type SaleRecord = NonNullable<Awaited<ReturnType<typeof findSaleForBusiness>>>;

/**
 * نسبة ما يُردّ من كل ليرة في سعر الصنف.
 *
 * خصم البيعة يُوزَّع على أصنافها بالنسبة: بيعةٌ بـ١٠٠ألف وخصم ١٠آلاف أرجع
 * الزبون نصفها، فيستردّ ٤٥ ألفاً لا ٥٠. ردُّ السعر الكامل كان يعني أن من
 * يشتري بخصمٍ ثم يُرجع يربح الخصم نقداً.
 */
const refundRatio = (sale: SaleRecord): number => {
  const itemsTotal = sale.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  if (itemsTotal <= 0) return 0;
  return Math.min(Number(sale.total) / itemsTotal, 1);
};

/** كم أُرجع من كل سطر سابقاً — بمجموعٍ واحد لا باستعلامٍ لكل سطر */
const returnedByLine = async (
  client: { posReturnItem: typeof prisma.posReturnItem },
  orderItemIds: string[]
): Promise<Map<string, number>> => {
  if (orderItemIds.length === 0) return new Map();
  const rows = await client.posReturnItem.groupBy({
    by: ['orderItemId'],
    where: { orderItemId: { in: orderItemIds } },
    _sum: { quantity: true }
  });
  return new Map(rows.map((r) => [r.orderItemId, r._sum.quantity || 0]));
};

/** شكل البيعة كما تعرضها شاشة المرتجع — بما بقي قابلاً للإرجاع من كل سطر */
const presentSale = async (sale: SaleRecord) => {
  const returned = await returnedByLine(prisma, sale.items.map((i) => i.id));
  const ratio = refundRatio(sale);
  const returns = await prisma.posReturn.findMany({
    where: { orderId: sale.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, returnNumber: true, amount: true, refundMethod: true, reason: true, createdAt: true,
      items: { select: { name: true, quantity: true, refund: true } }
    }
  });

  return {
    id: sale.id,
    orderNumber: sale.orderNumber,
    status: sale.status,
    source: sale.orderSource,
    createdAt: sale.createdAt,
    subtotal: Number(sale.subtotal) || 0,
    discountAmount: Number(sale.discountAmount) || 0,
    total: Number(sale.total),
    paymentMethod: sale.paymentMethod,
    customerName: sale.customerName,
    refundedTotal: round2(returns.reduce((sum, r) => sum + r.amount, 0)),
    /**
     * مرتجعٌ سُجّل يدوياً من القسم المالي قبل هذه الشاشة. لا يُبنى عليه
     * مرتجعٌ بالأصناف: لا نعرف أيّ قطعٍ عادت فيه، ومرتجعٌ ثانٍ فوقه يطرح
     * نفس المبلغ مرّتين.
     */
    manualReturn: Boolean(sale.returnedAt) && returns.length === 0,
    returnable:
      RETURNABLE_STATUSES.includes(String(sale.status)) &&
      !(Boolean(sale.returnedAt) && returns.length === 0),
    items: sale.items.map((item) => {
      const done = returned.get(item.id) || 0;
      return {
        orderItemId: item.id,
        productId: item.productId,
        menuItemId: item.menuItemId,
        name: item.product?.name || item.menuItem?.name || 'صنف',
        quantity: item.quantity,
        returnedQuantity: done,
        returnableQuantity: Math.max(item.quantity - done, 0),
        price: Number(item.price),
        /** ما يُردّ عن القطعة الواحدة بعد حصّتها من الخصم */
        unitRefund: round2(Number(item.price) * ratio)
      };
    }),
    returns
  };
};

/**
 * جلب بيعةٍ برقمها لشاشة المرتجع.
 *
 * `GET /api/pos/sales/:ref` — الرقم المطبوع على الإيصال (بالبادئة أو بدونها)
 * أو معرّف الطلب.
 */
export const getSaleForReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    const ref = String(req.params.ref || '').trim();
    if (!business || !ref) {
      res.status(400).json({ success: false, error: 'رقم البيعة مطلوب' });
      return;
    }

    const sale = await findSaleForBusiness(business, ref);
    if (!sale) {
      res.status(404).json({ success: false, error: `لا بيعة بالرقم ${ref}` });
      return;
    }

    res.json({ success: true, data: await presentSale(sale) });
  } catch (error) {
    console.error('POS getSaleForReturn failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب البيعة' });
  }
};

interface ReturnLineInput {
  orderItemId?: string;
  productId?: string;
  menuItemId?: string;
  quantity: number;
}

/**
 * تسجيل مرتجع.
 *
 * `POST /api/pos/returns`
 * `{ orderId, items: [{ orderItemId | productId | menuItemId, quantity }], reason?, refundMethod? }`
 *
 * **كلّه في معاملة، وقفلُ البيعة أوّل خطوة فيها.** كاشيران يُرجعان نفس
 * القطعة من جهازين في اللحظة نفسها كانا سيقرآن «المُرجَع سابقاً = صفر»
 * معاً فيُرجعان قطعتين من بيعةٍ فيها واحدة. تحديث صفّ الطلب أولاً يُمسك
 * قفله، فينتظر الثاني حتى يلتزم الأوّل ثم يقرأ ما كتبه.
 */
export const createReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : '';
    const lines: ReturnLineInput[] = Array.isArray(req.body?.items) ? req.body.items : [];
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) || null : null;

    if (!orderId) {
      res.status(400).json({ success: false, error: 'البيعة مطلوبة' });
      return;
    }

    const sale = await findSaleForBusiness(business, orderId);
    if (!sale) {
      res.status(404).json({ success: false, error: 'البيعة غير موجودة' });
      return;
    }

    if (!RETURNABLE_STATUSES.includes(String(sale.status))) {
      res.status(400).json({
        success: false,
        error: 'لا يُرجَع إلا ما سُلّم فعلاً — الطلب الذي لم يكتمل يُلغى من شاشة الطلبات'
      });
      return;
    }

    // طريقة الردّ الافتراضية هي طريقة الدفع: من دفع بشام كاش يستردّ بها،
    // ونقدٌ يخرج من الصندوق لبيعةٍ دُفعت إلكترونياً يُربك مطابقة النوبة
    const refundMethod = PAYMENT_METHODS.includes(req.body?.refundMethod)
      ? req.body.refundMethod
      : sale.paymentMethod || 'cash';

    // يُطابَق السطر بمعرّفه، أو بالصنف لمن يعرف الصنف لا السطر (قارئ باركود)
    const requested = new Map<string, number>();
    for (const line of lines) {
      const quantity = Math.floor(Number(line?.quantity));
      if (!line || !(quantity > 0)) continue;
      const item = sale.items.find((i) =>
        line.orderItemId
          ? i.id === line.orderItemId
          : line.productId
          ? i.productId === line.productId
          : line.menuItemId
          ? i.menuItemId === line.menuItemId
          : false
      );
      if (!item) {
        res.status(400).json({ success: false, error: 'صنفٌ في المرتجع ليس من هذه البيعة' });
        return;
      }
      requested.set(item.id, (requested.get(item.id) || 0) + quantity);
    }

    if (requested.size === 0) {
      res.status(400).json({ success: false, error: 'اختر صنفاً واحداً على الأقلّ للإرجاع' });
      return;
    }

    const ratio = refundRatio(sale);
    const isStore = business.kind === 'store';
    // لاحقةٌ عشوائية: مرتجعان في نفس الجزء من الثانية (كاشيران) كانا سيتصادمان
    // على القيد الفريد فيسقط الثاني بخطأ لا يفهمه الكاشير
    const returnNumber = `RET-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 4)
      .toUpperCase()}`;

    // أرصدة الأصناف المتتبَّعة في المطعم — تُقرأ قبل المعاملة كما في البيع
    const trackedMenuItems = isStore
      ? new Set<string>()
      : new Set(
          (
            await prisma.menuItem.findMany({
              where: {
                restaurantId: business.id,
                trackStock: true,
                id: { in: sale.items.map((i) => i.menuItemId).filter((v): v is string => Boolean(v)) }
              },
              select: { id: true }
            })
          ).map((m) => m.id)
        );

    const outcome = await prisma.$transaction(async (tx) => {
      // القفل — راجع التعليق أعلى الدالّة
      await tx.order.update({ where: { id: sale.id }, data: { updatedAt: new Date() } });

      const existingReturns = await tx.posReturn.count({ where: { orderId: sale.id } });
      const fresh = await tx.order.findUnique({
        where: { id: sale.id },
        select: { returnedAt: true, total: true }
      });
      if (fresh?.returnedAt && existingReturns === 0) {
        return {
          error: 'سُجّل لهذه البيعة مرتجعٌ يدويّ من القسم المالي — ألغِه هناك أولاً ثم أرجع الأصناف من هنا'
        } as const;
      }

      const already = await returnedByLine(tx, Array.from(requested.keys()));

      const itemsData: Array<{
        orderItemId: string; productId: string | null; menuItemId: string | null;
        name: string; quantity: number; unitPrice: number; refund: number; restocked: boolean;
      }> = [];

      for (const [orderItemId, quantity] of requested) {
        const item = sale.items.find((i) => i.id === orderItemId)!;
        const left = item.quantity - (already.get(orderItemId) || 0);
        const name = item.product?.name || item.menuItem?.name || 'صنف';
        if (quantity > left) {
          return {
            error: left > 0
              ? `المتبقّي للإرجاع من «${name}» ${left} فقط`
              : `«${name}» أُرجع كاملاً من قبل`
          } as const;
        }
        const restocked = isStore
          ? Boolean(item.productId)
          : Boolean(item.menuItemId && trackedMenuItems.has(item.menuItemId));
        itemsData.push({
          orderItemId,
          productId: item.productId,
          menuItemId: item.menuItemId,
          name,
          quantity,
          unitPrice: Number(item.price),
          refund: round2(Number(item.price) * quantity * ratio),
          restocked
        });
      }

      const previous = await tx.posReturn.aggregate({
        where: { orderId: sale.id },
        _sum: { amount: true }
      });
      const previousTotal = previous._sum.amount || 0;
      const saleTotal = Number(fresh?.total ?? sale.total);
      // التقريب قد يتجاوز الإجمالي بكسرٍ عند إرجاع آخر قطعة — الحدّ يمنع
      // أن يُردّ أكثر ممّا دُفع ولو بقرش
      const amount = round2(
        Math.min(itemsData.reduce((sum, i) => sum + i.refund, 0), Math.max(saleTotal - previousTotal, 0))
      );

      const created = await tx.posReturn.create({
        data: {
          returnNumber,
          orderId: sale.id,
          orderNumber: sale.orderNumber,
          ...(isStore ? { storeId: business.id } : { restaurantId: business.id }),
          amount,
          refundMethod,
          reason,
          createdBy: req.user?.id || null,
          items: { create: itemsData }
        },
        include: { items: true }
      });

      // المخزون يعود — مع حركةٍ في دفتر المتجر تقول لماذا زاد الرصيد
      for (const line of itemsData) {
        if (!line.restocked) continue;
        if (isStore && line.productId) {
          await tx.product.update({
            where: { id: line.productId },
            data: { stock: { increment: line.quantity } }
          });
          await tx.inventoryMovement.create({
            data: {
              productId: line.productId,
              quantity: line.quantity,
              type: 'return',
              reason: `مرتجع كاشير ${returnNumber} من ${sale.orderNumber}${reason ? ` — ${reason}` : ''}`.slice(0, 190),
              referenceId: created.id,
              referenceType: 'return'
            }
          });
        } else if (!isStore && line.menuItemId) {
          await tx.menuItem.update({
            where: { id: line.menuItemId },
            data: { stock: { increment: line.quantity } }
          });
        }
      }

      // المجموع لا الفرق: القسم المالي يقرأ `returnAmount` مبلغاً مُعاداً
      // للطلب كلّه، فيُكتب مجموع كل دفعات الإرجاع حتى الآن
      await tx.order.update({
        where: { id: sale.id },
        data: {
          returnedAt: new Date(),
          returnAmount: round2(previousTotal + amount),
          returnReason: reason ?? undefined
        }
      });

      return { created } as const;
    });

    if ('error' in outcome) {
      res.status(400).json({ success: false, error: outcome.error });
      return;
    }

    const { created } = outcome;
    res.status(201).json({
      success: true,
      message: 'تمّ تسجيل المرتجع',
      data: {
        id: created.id,
        returnNumber: created.returnNumber,
        orderId: sale.id,
        orderNumber: sale.orderNumber,
        amount: created.amount,
        refundMethod: created.refundMethod,
        reason: created.reason,
        createdAt: created.createdAt,
        items: created.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          refund: i.refund,
          restocked: i.restocked
        }))
      }
    });
  } catch (error) {
    console.error('POS createReturn failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تسجيل المرتجع' });
  }
};

/**
 * قائمة المرتجعات.
 *
 * `GET /api/pos/returns?from=YYYY-MM-DD&to=YYYY-MM-DD` — افتراضياً آخر
 * ثلاثين يوماً. والحدّ مئتان: شاشةٌ لا تقرير، والتقرير في القسم المالي.
 */
export const listReturns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const parse = (value: unknown, endOfDay: boolean): Date | null => {
      if (typeof value !== 'string' || !value.trim()) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) d.setUTCHours(23, 59, 59, 999);
      return d;
    };

    const to = parse(req.query.to, true) || new Date();
    const from = parse(req.query.from, false) || new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    const returns = await prisma.posReturn.findMany({
      where: {
        ...(business.kind === 'store' ? { storeId: business.id } : { restaurantId: business.id }),
        createdAt: { gte: from, lte: to }
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { items: { select: { name: true, quantity: true, unitPrice: true, refund: true, restocked: true } } }
    });

    res.json({
      success: true,
      data: {
        range: { from, to },
        count: returns.length,
        total: round2(returns.reduce((sum, r) => sum + r.amount, 0)),
        returns
      }
    });
  } catch (error) {
    console.error('POS listReturns failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب المرتجعات' });
  }
};

export default {
  searchProducts,
  lookupBySku,
  createSale,
  getShiftSummary,
  getSaleForReturn,
  createReturn,
  listReturns
};
