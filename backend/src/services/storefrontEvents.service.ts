// backend/src/services/storefrontEvents.service.ts
//
// أحداث واجهة المتجر: التنقية عند الدخول، والتجميع عند العرض.
//
// **لماذا خدمةٌ واحدة للاثنين:** التقرير يفترض شكل البيانات الذي كتبه
// المُدخِل — نوعُ الحدث، وأسماء المصادر، وحدود المدّة. ولو تفرّقا لأصبح
// «add_to_cart» في جهةٍ و«addToCart» في أخرى، فيُحسب صفراً بلا خطأ يُرى.
//
// **ومسار الدخول عامٌّ بلا مصادقة** — أي أنّ أيّ أحدٍ يستطيع نداءه. فكلُّ
// حقلٍ يُقاس بقائمةٍ مغلقة أو يُرفض: لا نصَّ حرّاً يُخزَّن كما جاء، ولا
// معرّفَ نشاطٍ يُقبل قبل التأكّد من وجوده.

import prisma from './prisma';

// ==================== القوائم المغلقة ====================

export const EVENT_TYPES = [
  'view_store',
  'view_product',
  'add_to_cart',
  'begin_checkout',
  'order_placed'
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

const TYPES = new Set<string>(EVENT_TYPES);
const DEVICES = new Set(['mobile', 'desktop']);
const BUSINESS_TYPES = new Set(['store', 'restaurant']);

/** أطول ما يُقبل في `sessionId` و`source` — الزيادة تُقصّ لا تُرفض */
const MAX_SESSION = 40;
const MAX_SOURCE = 60;

/** أكثر من هذا في الدفعة الواحدة ليس زائراً بل إساءة */
export const MAX_BATCH = 20;

// ==================== تطبيع المصدر ====================

/**
 * يُرجع مضيف المُحيل وحده، مُبسَّطاً إلى ما يفيد التاجر.
 *
 * **المضيف لا الرابط الكامل:** روابط الإحالة تحمل أحياناً معرّفاتٍ
 * شخصية (`?fbclid=`, `?igshid=`)، وتخزينها يجعل جدول الأحداث سجلَّ
 * تتبّعٍ لا سجلَّ إحصاء. والتاجر لا يسأل «أيّ رابط» بل «من أين».
 */
export const normalizeSource = (referrer: unknown, selfHost?: string): string => {
  if (typeof referrer !== 'string' || !referrer.trim()) return 'direct';

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'direct';
  }

  if (!host) return 'direct';
  // التنقّل داخل المتجر نفسه ليس إحالة
  if (selfHost && (host === selfHost.toLowerCase() || host.endsWith('.shamstores.com'))) return 'direct';

  const bare = host.replace(/^www\./, '').replace(/^m\./, '').replace(/^l\./, '');

  // التجميع مقصود: `l.instagram.com` و`instagram.com` مصدرٌ واحد في نظر
  // التاجر، وفصلُهما يُشتّت الرقم على سطرين لا معنى لهما
  const groups: Array<[RegExp, string]> = [
    [/(^|\.)instagram\.com$/, 'instagram'],
    [/(^|\.)facebook\.com$|(^|\.)fb\.(com|me)$/, 'facebook'],
    [/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/, 'whatsapp'],
    [/(^|\.)t\.me$|(^|\.)telegram\.(org|me)$/, 'telegram'],
    [/(^|\.)tiktok\.com$/, 'tiktok'],
    [/(^|\.)snapchat\.com$/, 'snapchat'],
    [/(^|\.)google\./, 'google'],
    [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'youtube'],
    [/(^|\.)x\.com$|(^|\.)twitter\.com$/, 'x']
  ];

  for (const [re, label] of groups) if (re.test(bare)) return label;

  return bare.slice(0, MAX_SOURCE);
};

// ==================== الإدخال ====================

export interface RawEvent {
  type?: unknown;
  productId?: unknown;
  sessionId?: unknown;
  source?: unknown;
  device?: unknown;
}

export interface EventScope {
  businessType: string;
  businessId: string;
}

interface Clean {
  businessType: string;
  businessId: string;
  type: string;
  productId: string | null;
  sessionId: string;
  source: string;
  device: string;
}

const asId = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  // معرّفاتنا cuid والجلسة نصنعها نحن: حروفٌ وأرقامٌ وشُرَط فقط
  return /^[A-Za-z0-9_-]+$/.test(s) ? s : null;
};

/**
 * ينقّي دفعةً ويكتب ما صحّ منها.
 *
 * **ما فسد يُسقط ولا يُفشل الدفعة:** المُرسِل متصفّحُ زائرٍ لا يقرأ رداً
 * (نستعمل `sendBeacon`)، فالرفضُ بـ400 لا يبلغ أحداً. والصمتُ عن حدثٍ
 * واحدٍ أفضل من فقدان الدفعة كلّها بسببه.
 *
 * @returns عدد ما كُتب
 */
export const recordEvents = async (
  scope: EventScope,
  events: RawEvent[],
  selfHost?: string
): Promise<number> => {
  if (!BUSINESS_TYPES.has(scope.businessType)) return 0;
  const businessId = asId(scope.businessId, 40);
  if (!businessId) return 0;

  const rows: Clean[] = [];

  for (const e of events.slice(0, MAX_BATCH)) {
    if (typeof e?.type !== 'string' || !TYPES.has(e.type)) continue;

    const sessionId = asId(e.sessionId, MAX_SESSION);
    if (!sessionId) continue;

    const device = typeof e.device === 'string' && DEVICES.has(e.device) ? e.device : 'mobile';
    // المصدر يأتي مُطبَّعاً من الواجهة، ونُعيد تطبيعه هنا: ما يصل من
    // الخارج لا يُصدَّق
    const source =
      typeof e.source === 'string' && /^[a-z0-9.-]{1,60}$/.test(e.source) ? e.source : 'direct';

    rows.push({
      businessType: scope.businessType,
      businessId,
      type: e.type,
      productId: e.type === 'view_product' || e.type === 'add_to_cart' ? asId(e.productId, 40) : null,
      sessionId,
      source,
      device
    });
  }

  if (!rows.length) return 0;

  await prisma.storefrontEvent.createMany({ data: rows });
  return rows.length;
};

// ==================== التقرير ====================

export type Period = '7d' | '30d' | '90d' | 'today';

export const periodStart = (period: Period): Date => {
  const now = new Date();
  if (period === 'today') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
};

export interface VisitsReport {
  period: Period;
  from: string;
  /** جلساتٌ متمايزة — «زيارات» بالمعنى الذي يقصده التاجر */
  visits: number;
  storeViews: number;
  productViews: number;
  addToCart: number;
  beginCheckout: number;
  ordersPlaced: number;
  /** من زار ثمّ طلب، بالنسبة المئوية */
  conversionRate: number;
  byDay: Array<{ day: string; visits: number; orders: number }>;
  sources: Array<{ source: string; visits: number }>;
  devices: Array<{ device: string; visits: number }>;
  topProducts: Array<{ productId: string; name: string; views: number; addToCart: number }>;
};

/**
 * يبني التقرير من الأحداث الخام.
 *
 * **الزيارة جلسةٌ متمايزة لا صفٌّ:** لو عددنا الصفوف لصار من تنقّل بين
 * عشر صفحاتٍ عشرَ زيارات، فيرى التاجر رقماً منتفخاً يبني عليه قراراً.
 * ولذلك كلّ ما يُقاس هنا يُقاس بعدد الجلسات لا الأحداث — إلا العدّادات
 * التي يقصد التاجر منها الفعل نفسه (مشاهدات المنتج).
 */
export const buildVisitsReport = async (
  scope: EventScope,
  period: Period
): Promise<VisitsReport> => {
  const from = periodStart(period);
  const where = {
    businessId: scope.businessId,
    businessType: scope.businessType,
    createdAt: { gte: from }
  };

  const events = await prisma.storefrontEvent.findMany({
    where,
    select: { type: true, productId: true, sessionId: true, source: true, device: true, createdAt: true }
  });

  const sessions = new Set<string>();
  const orderSessions = new Set<string>();
  const bySource = new Map<string, Set<string>>();
  const byDevice = new Map<string, Set<string>>();
  const byDay = new Map<string, { visits: Set<string>; orders: number }>();
  const perProduct = new Map<string, { views: number; addToCart: number }>();

  let storeViews = 0;
  let productViews = 0;
  let addToCart = 0;
  let beginCheckout = 0;
  let ordersPlaced = 0;

  for (const e of events) {
    sessions.add(e.sessionId);

    const day = e.createdAt.toISOString().slice(0, 10);
    let bucket = byDay.get(day);
    if (!bucket) {
      bucket = { visits: new Set(), orders: 0 };
      byDay.set(day, bucket);
    }
    bucket.visits.add(e.sessionId);

    if (!bySource.has(e.source)) bySource.set(e.source, new Set());
    bySource.get(e.source)!.add(e.sessionId);
    if (!byDevice.has(e.device)) byDevice.set(e.device, new Set());
    byDevice.get(e.device)!.add(e.sessionId);

    switch (e.type) {
      case 'view_store':
        storeViews += 1;
        break;
      case 'view_product':
        productViews += 1;
        if (e.productId) {
          const p = perProduct.get(e.productId) || { views: 0, addToCart: 0 };
          p.views += 1;
          perProduct.set(e.productId, p);
        }
        break;
      case 'add_to_cart':
        addToCart += 1;
        if (e.productId) {
          const p = perProduct.get(e.productId) || { views: 0, addToCart: 0 };
          p.addToCart += 1;
          perProduct.set(e.productId, p);
        }
        break;
      case 'begin_checkout':
        beginCheckout += 1;
        break;
      case 'order_placed':
        ordersPlaced += 1;
        orderSessions.add(e.sessionId);
        bucket.orders += 1;
        break;
    }
  }

  // أسماء المنتجات لأعلى عشرة — استعلامٌ واحد لا واحدٌ لكلّ منتج
  const topIds = [...perProduct.entries()]
    .sort((a, b) => b[1].views - a[1].views || b[1].addToCart - a[1].addToCart)
    .slice(0, 10);

  const names = new Map<string, string>();
  if (topIds.length) {
    const found = await prisma.product.findMany({
      where: { id: { in: topIds.map(([id]) => id) } },
      select: { id: true, name: true }
    });
    found.forEach((p) => names.set(p.id, p.name));
  }

  const visits = sessions.size;

  return {
    period,
    from: from.toISOString(),
    visits,
    storeViews,
    productViews,
    addToCart,
    beginCheckout,
    ordersPlaced,
    // بالجلسات لا بالطلبات: زائرٌ طلب مرّتين في جلسةٍ واحدة زائرٌ تحوّل
    // مرّةً واحدة، والقسمة على الطلبات تعطي نسبةً تتجاوز المئة
    conversionRate: visits ? Math.round((orderSessions.size / visits) * 1000) / 10 : 0,
    byDay: [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, v]) => ({ day, visits: v.visits.size, orders: v.orders })),
    sources: [...bySource.entries()]
      .map(([source, s]) => ({ source, visits: s.size }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 8),
    devices: [...byDevice.entries()]
      .map(([device, s]) => ({ device, visits: s.size }))
      .sort((a, b) => b.visits - a.visits),
    topProducts: topIds.map(([productId, v]) => ({
      productId,
      // منتجٌ حُذف تبقى أحداثه: اسمٌ صريح أفضل من سطرٍ فارغ يظنّه التاجر خللاً
      name: names.get(productId) || 'منتج محذوف',
      views: v.views,
      addToCart: v.addToCart
    }))
  };
};

/** يحذف الأحداث الأقدم من `days` — يُنادى من المجدول */
export const pruneEvents = async (days = 120): Promise<number> => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { count } = await prisma.storefrontEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
};

export default { recordEvents, buildVisitsReport, normalizeSource, pruneEvents, EVENT_TYPES, MAX_BATCH };
