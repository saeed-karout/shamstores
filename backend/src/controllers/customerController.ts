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
  /** أُدخل بملفٍّ أو باليد لا باستنتاجٍ من طلب */
  isImported?: boolean;
  /** محافظة آخر طلبٍ حملها — طلب الكاشير والاستلام بلا محافظة فتبقى فارغة */
  governorate: string | null;
  /**
   * وافق على الرسائل التسويقية — من سجلّ الاستيراد أو من اشتراكٍ لم يُلغَ.
   *
   * الموافقة على تتبّع الطلب وحده ليست موافقةً تسويقية، ولذلك يُقرأ العلَم
   * `marketingOptIn` لا مجرّد وجود الاشتراك.
   */
  marketingOptIn: boolean;
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
        governorate: true,
        returnedAt: true,
        returnAmount: true,
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
      // الإنفاق صافٍ من المرتجع — بنفس قاعدة القسم المالي: `returnedAt` بلا
      // مبلغٍ يعني الطلب كلّه. زبونٌ أرجع كل ما اشتراه ليس «الأوفى» لأن
      // فاتورته كانت كبيرة
      const gross = Number(order.total) || 0;
      const refunded = order.returnedAt ? Number(order.returnAmount) || gross : 0;
      const total = Math.max(gross - refunded, 0);
      const at = order.createdAt.toISOString();

      if (existing) {
        existing.ordersCount += 1;
        existing.totalSpent += total;
        // الطلبات مرتّبة تنازلياً، فالأوّل هو الأحدث والأخير هو الأقدم
        existing.firstOrderAt = at;
        // المحافظة من أحدث طلبٍ حملها — طلب كاشيرٍ أحدث بلا محافظة لا يمحو
        // أن الزبون يسكن حلب
        if (!existing.governorate && order.governorate) existing.governorate = order.governorate;
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
          isLapsed: order.createdAt < lapsedBefore,
          governorate: order.governorate || null,
          marketingOptIn: false
        });
      }
    }

    /**
     * الزبائن المستوردون — يُدمجون بنفس المفتاح لا يُضافون بعده.
     *
     * الضيف يُميَّز بـ`guest:<هاتف>` في كل هذا المشروع، والمستورد يحمل
     * نفس المفتاح. فمن استُورد ثمّ طلب يظهر **صفّاً واحداً** بطلباته
     * الحقيقية — لا مرّتين، إحداهما بصفرٍ والأخرى بطلباته.
     *
     * ومن لم يطلب بعد يظهر بصفرِ طلبات: هذا كتاب زبائن التاجر، وإخفاء من
     * لم يشترِ منه يُفرغه من فائدته.
     */
    const contacts = await prisma.customerContact.findMany({
      where: {
        businessId: (scope as any).storeId || (scope as any).restaurantId,
        businessType: (scope as any).storeId ? 'store' : 'restaurant'
      },
      select: { name: true, phone: true, email: true, marketingOptIn: true }
    });

    for (const contact of contacts) {
      const key = `guest:${contact.phone}`;
      const existing = byKey.get(key);
      if (existing) {
        // الاسم المكتوب من التاجر أدقّ من اسمٍ كتبه الزبون عند الدفع
        existing.name = contact.name || existing.name;
        existing.email = existing.email || contact.email || null;
        existing.isImported = true;
        existing.marketingOptIn = existing.marketingOptIn || contact.marketingOptIn;
        continue;
      }
      byKey.set(key, {
        key,
        userId: null,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        isGuest: true,
        ordersCount: 0,
        totalSpent: 0,
        lastOrderAt: null,
        firstOrderAt: null,
        // من لم يطلب قطُّ ليس «متغيّباً» — المتغيّب من طلب ثمّ انقطع
        isLapsed: false,
        isImported: true,
        governorate: null,
        marketingOptIn: contact.marketingOptIn
      });
    }

    /**
     * الموافقة التسويقية من الاشتراكات — استعلامٌ واحد لا استعلامٌ لكل زبون.
     *
     * الاشتراك يُطابَق بالحساب أولاً ثم بالهاتف: ضيفٌ اشترك عند طلبه يحمل
     * هاتفه في الاشتراك، ومفتاحه في القائمة `guest:<هاتف>`.
     */
    const subscriptions = await prisma.customerSubscription.findMany({
      where: {
        businessId: (scope as any).storeId || (scope as any).restaurantId,
        businessType: (scope as any).storeId ? 'store' : 'restaurant',
        marketingOptIn: true,
        unsubscribedAt: null
      },
      select: { userId: true, phone: true }
    });
    for (const sub of subscriptions) {
      const row =
        (sub.userId && byKey.get(`user:${sub.userId}`)) ||
        (sub.phone && byKey.get(`guest:${sub.phone}`)) ||
        null;
      if (row) row.marketingOptIn = true;
    }

    return Array.from(byKey.values()).sort((a, b) => b.totalSpent - a.totalSpent);
};

// ==================== الفلترة والترتيب ====================

/**
 * شروط الفلترة كما تصل في الرابط — **نفسها للشاشة والتصدير**.
 *
 * التصدير كان يُخرج القائمة كلّها مهما ضيّق التاجر ما يراه، فيطلب «من
 * انقطع منذ ثلاثة أشهر في حلب» ليرسل لهم عرضاً، ثم يفتح الملفّ فيجد ألف
 * اسم لا يعنيه منها إلا عشرون. الشرط الواحد يُقرأ هنا مرّةً ويُطبَّق على
 * الاثنين، فما يُصدَّر هو ما على الشاشة حرفياً.
 */
export interface CustomerFilters {
  q?: string;
  /** شرائح الشاشة — أسرع طريقٍ لأكثر الأسئلة شيوعاً */
  segment?: 'returning' | 'lapsed' | 'new' | 'imported';
  type?: 'registered' | 'guest';
  minOrders?: number;
  maxOrders?: number;
  minSpent?: number;
  maxSpent?: number;
  lastFrom?: Date;
  lastTo?: Date;
  firstFrom?: Date;
  firstTo?: Date;
  governorate?: string;
  hasPhone?: boolean;
  optIn?: boolean;
  sort: 'spent' | 'orders' | 'recent' | 'oldest' | 'name';
}

const SORTS = ['spent', 'orders', 'recent', 'oldest', 'name'] as const;
const SEGMENTS = ['returning', 'lapsed', 'new', 'imported'] as const;
/** «جديد» = أوّل طلبٍ خلال هذه المدّة — نافذة حملة الترحيب المعتادة */
const NEW_DAYS = 30;

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/** رقمٌ غير سالب أو لا شيء — «abc» في الرابط تُهمَل بدل أن تُفرغ القائمة */
const num = (value: unknown): number | undefined => {
  const raw = str(value);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/**
 * تاريخٌ من `YYYY-MM-DD` أو ISO.
 *
 * `endOfDay` لحدّ «إلى»: التاجر يختار «حتى ٢٠ أيلول» ويقصد اليوم كلّه، لا
 * منتصف الليل الذي يسبقه — وإلا سقط زبائن ذلك اليوم بلا تفسير.
 */
const date = (value: unknown, endOfDay = false): Date | undefined => {
  const raw = str(value);
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(raw)) d.setUTCHours(23, 59, 59, 999);
  return d;
};

const flag = (value: unknown): boolean | undefined => {
  const raw = str(value);
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return undefined;
};

export const parseCustomerFilters = (query: Record<string, unknown>): CustomerFilters => {
  const sort = str(query.sort);
  const segment = str(query.segment);
  const type = str(query.type);
  return {
    q: str(query.q)?.toLowerCase().slice(0, 100),
    segment: (SEGMENTS as readonly string[]).includes(segment || '')
      ? (segment as CustomerFilters['segment'])
      : undefined,
    type: type === 'registered' || type === 'guest' ? type : undefined,
    minOrders: num(query.minOrders),
    maxOrders: num(query.maxOrders),
    minSpent: num(query.minSpent),
    maxSpent: num(query.maxSpent),
    lastFrom: date(query.lastFrom),
    lastTo: date(query.lastTo, true),
    firstFrom: date(query.firstFrom),
    firstTo: date(query.firstTo, true),
    governorate: str(query.governorate)?.slice(0, 60),
    hasPhone: flag(query.hasPhone),
    optIn: flag(query.optIn),
    sort: (SORTS as readonly string[]).includes(sort || '') ? (sort as CustomerFilters['sort']) : 'spent'
  };
};

/** يقع التاريخ داخل المدى — ومن لا تاريخ له خارج أي مدىً محدَّد */
const inRange = (iso: string | null, from?: Date, to?: Date): boolean => {
  if (!from && !to) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
};

/**
 * يطبّق الشروط ثم الترتيب.
 *
 * **في الذاكرة بعد التجميع لا في الاستعلام**: «عدد الطلبات» و«الإنفاق»
 * و«آخر طلب» صفاتٌ للزبون المجمَّع لا للطلب الواحد، ولا تُعرف إلا بعد
 * دمج طلبات الحساب وطلبات الضيف بهاتفه. والمرور على الصفوف خطّيٌّ رخيص
 * أمام استعلام الطلبات نفسه.
 */
export const applyCustomerFilters = (rows: CustomerRow[], f: CustomerFilters): CustomerRow[] => {
  const newSince = Date.now() - NEW_DAYS * 24 * 60 * 60 * 1000;
  // الهاتف يُقارن بأرقامه وحدها: «0944 123» و«0944123» رقمٌ واحد
  const qDigits = f.q ? f.q.replace(/\D/g, '') : '';

  const out = rows.filter((c) => {
    if (f.q) {
      const hit =
        c.name.toLowerCase().includes(f.q) ||
        (c.email || '').toLowerCase().includes(f.q) ||
        (qDigits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(qDigits));
      if (!hit) return false;
    }

    if (f.segment === 'returning' && c.ordersCount < 2) return false;
    if (f.segment === 'lapsed' && !c.isLapsed) return false;
    if (f.segment === 'imported' && !c.isImported) return false;
    if (f.segment === 'new' && !(c.firstOrderAt && new Date(c.firstOrderAt).getTime() >= newSince)) {
      return false;
    }

    if (f.type === 'registered' && c.isGuest) return false;
    if (f.type === 'guest' && !c.isGuest) return false;

    if (f.minOrders !== undefined && c.ordersCount < f.minOrders) return false;
    if (f.maxOrders !== undefined && c.ordersCount > f.maxOrders) return false;
    if (f.minSpent !== undefined && c.totalSpent < f.minSpent) return false;
    if (f.maxSpent !== undefined && c.totalSpent > f.maxSpent) return false;

    if (!inRange(c.lastOrderAt, f.lastFrom, f.lastTo)) return false;
    if (!inRange(c.firstOrderAt, f.firstFrom, f.firstTo)) return false;

    if (f.governorate && c.governorate !== f.governorate) return false;
    if (f.hasPhone === true && !c.phone) return false;
    if (f.hasPhone === false && c.phone) return false;
    if (f.optIn === true && !c.marketingOptIn) return false;
    if (f.optIn === false && c.marketingOptIn) return false;

    return true;
  });

  const time = (iso: string | null, fallback: number) => (iso ? new Date(iso).getTime() : fallback);

  switch (f.sort) {
    case 'orders':
      out.sort((a, b) => b.ordersCount - a.ordersCount || b.totalSpent - a.totalSpent);
      break;
    case 'recent':
      // من لم يطلب قطُّ في الذيل لا في الرأس
      out.sort((a, b) => time(b.lastOrderAt, 0) - time(a.lastOrderAt, 0));
      break;
    case 'oldest':
      // «الأقدم» = أقدم زبائنك عهداً: من بدأ الشراء أولاً
      out.sort((a, b) => time(a.firstOrderAt, Infinity) - time(b.firstOrderAt, Infinity));
      break;
    case 'name':
      out.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      break;
    default:
      out.sort((a, b) => b.totalSpent - a.totalSpent);
  }

  return out;
};

export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scope = getBusinessScope(req);
    if (!scope) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const customers = await buildCustomerRows(scope as Record<string, unknown>);
    const filters = parseCustomerFilters(req.query as Record<string, unknown>);
    const matched = applyCustomerFilters(customers, filters);

    /**
     * صفحاتٌ لا القائمة كلّها.
     *
     * متجرٌ بعشرة آلاف زبون كان يُرسل عشرة آلاف صفٍّ إلى هاتفٍ على شبكة
     * بطيئة ليعرض منها عشرين. التجميع يبقى كاملاً على الخادم (الترتيب
     * والفلترة يحتاجانه)، والنقل وحده يُقسَّم.
     *
     * **وبلا `limit` تعود القائمة كاملة** كما كانت: تطبيق التاجر
     * (sham-merchant-app) ينادي `/customers` بلا معاملات ويتوقّع الكلّ، وتقسيمٌ
     * افتراضيّ كان سيُخفي عنه كل زبونٍ بعد الخمسين بصمت.
     */
    const limit = req.query.limit
      ? Math.min(Math.max(Math.floor(Number(req.query.limit)) || 50, 1), 500)
      : Math.max(matched.length, 1);
    const page = Math.max(Math.floor(Number(req.query.page)) || 1, 1);

    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const countedOrders = customers.reduce((sum, c) => sum + c.ordersCount, 0);
    const returning = customers.filter((c) => c.ordersCount > 1).length;

    const governorates = Array.from(
      new Set(customers.map((c) => c.governorate).filter((g): g is string => Boolean(g)))
    ).sort((a, b) => a.localeCompare(b, 'ar'));

    res.json({
      success: true,
      data: {
        customers: matched.slice((page - 1) * limit, page * limit),
        pagination: {
          page,
          limit,
          total: matched.length,
          pages: Math.max(1, Math.ceil(matched.length / limit))
        },
        /** أرقام النتيجة المفلترة — ما يقوله شريط «٤٢ زبوناً أنفقوا…» */
        filtered: {
          total: matched.length,
          totalSpent: matched.reduce((sum, c) => sum + c.totalSpent, 0),
          ordersCount: matched.reduce((sum, c) => sum + c.ordersCount, 0)
        },
        /**
         * خيارات الفلاتر من البيانات نفسها — قائمة محافظاتٍ لم يطلب منها
         * أحد تُغري بخيارٍ نتيجته صفرٌ دائماً.
         */
        facets: { governorates },
        summary: {
          total: customers.length,
          registered: customers.filter((c) => !c.isGuest).length,
          guests: customers.filter((c) => c.isGuest).length,
          /** من طلب أكثر من مرّة — الرقم الذي يقول هل يعود الناس */
          returning,
          lapsed: customers.filter((c) => c.isLapsed).length,
          optedIn: customers.filter((c) => c.marketingOptIn).length,
          /** أعداد الشرائح — تُعرض على أزرارها قبل الضغط عليها */
          newCustomers: applyCustomerFilters(customers, { segment: 'new', sort: 'spent' }).length,
          imported: customers.filter((c) => c.isImported).length,
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

    // نفس الشروط التي على الشاشة — بلا تقسيم صفحات: الملفّ هو النتيجة كلّها
    const customers = applyCustomerFilters(
      await buildCustomerRows(scope as Record<string, unknown>),
      parseCustomerFilters(req.query as Record<string, unknown>)
    );
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
      c.isLapsed ? 'نعم' : 'لا',
      c.governorate ?? '',
      c.marketingOptIn ? 'نعم' : 'لا'
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
          'متغيّب',
          'المحافظة',
          'يقبل الرسائل التسويقية'
        ],
        rows
      )
    );
  } catch (error) {
    console.error('exportCustomers failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تصدير قائمة الزبائن' });
  }
};
