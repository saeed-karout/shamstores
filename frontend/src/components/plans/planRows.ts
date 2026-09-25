// frontend/src/components/plans/planRows.ts
//
// بيانات مقارنة الخطط — مصدرٌ واحد لصفحة الأسعار العامّة وصفحتَي الخطط في
// لوحة التاجر (المتجر والمطعم).
//
// **كلّ خلية تُحسب من حقول الخطة** كما يعيدها `GET /api/plans`: أيّ تعديلٍ
// يجريه الأدمن على حدٍّ أو بوابة يظهر هنا بلا نشرة.
//
// **وكلّ صفّ مُتحقَّقٌ منه في الخادم** — ما يفحصه كلّ حارس:
//   - checkPlanFeature (صارمة): online_orders (الطلبات والتوصيل والسائقون)،
//     table_qr، coupons، promotions (قسم التسويق)، analytics، custom_domain،
//     pos، affiliate — تُفتح بعَلَم الخطة أو برمزها في `features` أو بإضافة مشتراة
//   - inventory غير صارمة في middleware/checkPlan.ts: تمرّ لأي خطة مدفوعة لا للمجانية
//   - requirePaidPlanForStaff: إدارة الموظفين لأي خطة مدفوعة فقط — فالمجانية
//     «المالك فقط» مهما كان maxUsers
//   - businessHasEntitlement: pwa، branding_removal، multi_language
//   - بلا بوابة (كل الخطط): الزبائن والتعليقات والتقييمات، الحملات، الرسائل
//     التلقائية، مناطق التوصيل، القسم المالي، القوالب، SEO، الدفع (نقداً وشام كاش
//     — services/payment.service.ts لا يفحص الخطة)
// الإضافات المنفردة (`GET /api/public/addons`) تُشترى على أي خطة، فالميزة غير
// المشمولة وذات الإضافة تُعرض «كإضافة» لا «غير متاحة».

import type { IconType } from 'react-icons';
import {
  PiSlidersHorizontalDuotone, PiForkKnifeDuotone, PiReceiptDuotone, PiMegaphoneDuotone, PiMopedDuotone,
  PiUsersThreeDuotone, PiWalletDuotone, PiChartLineUpDuotone, PiGlobeHemisphereEastDuotone, PiPaletteDuotone,
  PiUserGearDuotone, PiLifebuoyDuotone
} from 'react-icons/pi';
import { planLabel } from '@/utils/planLabels';

// ===== الأنواع =====

export interface ComparablePlan {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  price: number;
  position?: number | null;
  isPopular?: boolean | null;
  maxMenuItems?: number | null;
  maxProducts?: number | null;
  maxOrders?: number | null;
  maxUsers?: number | null;
  maxRestaurants?: number | null;
  maxStores?: number | null;
  hasTableQr?: boolean | null;
  hasWhatsapp?: boolean | null;
  hasOnlineOrders?: boolean | null;
  hasCoupons?: boolean | null;
  hasPromotions?: boolean | null;
  hasAnalytics?: boolean | null;
  hasBrandingRemoval?: boolean | null;
  hasCustomDomain?: boolean | null;
  hasMultiLanguage?: boolean | null;
  features?: unknown;
  pricing?: { amountUsd: number; amountSyp: number | null; isFree: boolean } | null;
}

export interface PublicAddon {
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  group?: string;
  price: number;
  isOneTime?: boolean;
  pricing?: { amountUsd: number; amountSyp: number | null } | null;
}

/** نوع النشاط يغيّر الكلمات لا القيم: «الأصناف» للمطعم و«المنتجات» للمتجر */
export type BusinessKind = 'restaurant' | 'store' | undefined;

/**
 * - true / false: ضمن الخطة / غير متاحة
 * - 'addon': غير مشمولة، وتُشترى منفردة
 * - 'soon': قريباً
 * - نصّ: قيمة (حدّ أو وصف قصير)
 */
export type Cell = boolean | 'addon' | 'soon' | string;

export interface RowCtx {
  kind: BusinessKind;
  /** رموز الإضافات المعروضة للبيع؛ null قبل التحميل أو عند الفشل — يُفترض توفّرها */
  addons: Set<string> | null;
}

export interface Row {
  key: string;
  label: string | ((ctx: RowCtx) => string);
  hint?: string | ((ctx: RowCtx) => string);
  /** صفٌّ رقميّ — لا يدخل في «ما الجديد في هذه الخطة» */
  metric?: boolean;
  /** عنوانٌ أقصر يظهر في بطاقة الخطة ضمن «ما الجديد» */
  perk?: string;
  value: (p: ComparablePlan, ctx: RowCtx) => Cell;
}

export interface Section {
  key: string;
  title: string;
  icon: IconType;
  rows: Row[];
}

// ===== أدوات =====

export const UNLIMITED = 99999;

// أرقامٌ لاتينية كأسعار المتاجر نفسها — لا خليط من ١٠٠ و100 في البطاقة الواحدة
export const limit = (n?: number | null) => (!n ? '—' : n >= UNLIMITED ? 'غير محدود' : n.toLocaleString('en-US'));
export const isUnlimited = (n?: number | null) => !!n && n >= UNLIMITED;

export const isFreePlan = (p: ComparablePlan) =>
  p.pricing?.isFree ?? (p.price <= 0 || p.slug === 'free' || p.name === 'free');

export const planKey = (p: ComparablePlan) => p.slug || p.name;

export const planUsd = (p: ComparablePlan) => p.pricing?.amountUsd ?? p.price ?? 0;

/** رموز `features` الحرّة بالصيغة التي يوحّدها الخادم (pos، affiliate، pwa…) */
const codeCache = new WeakMap<ComparablePlan, Set<string>>();
export const planCodes = (p: ComparablePlan): Set<string> => {
  const cached = codeCache.get(p);
  if (cached) return cached;
  let raw: unknown = p.features;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  const list = Array.isArray(raw) ? raw : [];
  const set = new Set(list.map((c) => String(c).trim().replace(/-/g, '_').toLowerCase()));
  codeCache.set(p, set);
  return set;
};

export const hasCode = (p: ComparablePlan, code: string) => planCodes(p).has(code);
export const planItems = (p: ComparablePlan) => Math.max(p.maxMenuItems || 0, p.maxProducts || 0);
export const planBranches = (p: ComparablePlan) => Math.max(p.maxRestaurants || 0, p.maxStores || 0, 1);

/** هل الخطة تشمل الميزة — بعَلَمها أو برمزها في `features` */
const FLAG: Record<string, keyof ComparablePlan> = {
  coupons: 'hasCoupons',
  promotions: 'hasPromotions',
  analytics: 'hasAnalytics',
  branding_removal: 'hasBrandingRemoval',
  custom_domain: 'hasCustomDomain',
  multi_language: 'hasMultiLanguage'
};
export const planIncludes = (p: ComparablePlan, code: string) => {
  const flag = FLAG[code];
  return (!!flag && !!p[flag]) || hasCode(p, code);
};

/** مشمولة، وإلا «كإضافة» إن كانت تُباع منفردة، وإلا غير متاحة */
const gate = (code: string) => (p: ComparablePlan, ctx: RowCtx): Cell =>
  planIncludes(p, code) ? true : !ctx.addons || ctx.addons.has(code) ? 'addon' : false;

const byKind = (restaurant: string, store: string, both: string) => (ctx: RowCtx) =>
  ctx.kind === 'restaurant' ? restaurant : ctx.kind === 'store' ? store : both;

export const sortPlans = <T extends ComparablePlan>(plans: T[]) =>
  plans.slice().sort((a, b) => planUsd(a) - planUsd(b) || (a.position ?? 0) - (b.position ?? 0));

/** سطرٌ واحد يقول لمن الخطة */
export const audienceTag = (p: ComparablePlan): string | null => {
  if (p.isPopular) return 'الأكثر اختياراً';
  const tags: Record<string, string> = {
    free: 'للبداية',
    basic: 'للانطلاق',
    pos: 'للمحلّات',
    pro: 'للنموّ',
    business: 'للأعمال المتنامية',
    enterprise: 'للسلاسل والفروع'
  };
  return tags[planKey(p)] || null;
};

// ===== أقسام المقارنة =====

export const SECTIONS: Section[] = [
  {
    key: 'basics',
    title: 'الأساسيات والحدود',
    icon: PiSlidersHorizontalDuotone,
    rows: [
      {
        key: 'items',
        label: byKind('الأصناف في القائمة', 'المنتجات', 'الأصناف أو المنتجات'),
        hint: byKind('عدد أصناف قائمتك', 'عدد المنتجات في متجرك', 'أصناف القائمة للمطعم، أو منتجات المتجر'),
        metric: true,
        value: (p) => limit(planItems(p))
      },
      { key: 'orders', label: 'الطلبات شهرياً', hint: 'تُعدّ من أول الشهر وتتجدّد كلّ شهر', metric: true, value: (p) => limit(p.maxOrders) },
      { key: 'kind', label: 'مطعم أو متجر إلكتروني', hint: 'تختار نوع نشاطك عند التسجيل', value: () => true },
      { key: 'dashboard', label: 'لوحة تحكّم من الجوال والحاسوب', value: () => true },
      { key: 'home', label: 'ملخّص يومك في الرئيسية', hint: 'المبيعات والطلبات الجديدة وما ينتظر قرارك', value: () => true }
    ]
  },
  {
    key: 'catalog',
    title: 'القائمة والمنتجات',
    icon: PiForkKnifeDuotone,
    rows: [
      { key: 'catalog', label: 'صور وأسعار وتصنيفات فرعية ووسوم', value: () => true },
      { key: 'options', label: 'خيارات: مقاسات وألوان وإضافات', hint: 'بسعرٍ مختلف لكل خيار', value: () => true },
      {
        key: 'inventory',
        label: 'المخزون وتنبيه قرب النفاد',
        hint: 'الكمية لكل منتج ولكل خيار، وتنقص تلقائياً مع كل بيع',
        perk: 'إدارة المخزون',
        value: (p) => !isFreePlan(p) || hasCode(p, 'inventory')
      },
      { key: 'soldout', label: 'عرض «نفد» للمنتج المنتهي', hint: 'يبقى ظاهراً لزبائنك بلا زرّ شراء', value: () => true },
      { key: 'soon', label: 'منتجات «قريباً» مع «أعلمني حين يتوفّر»', hint: 'يترك الزبون رقمه، وترى من ينتظر كل منتج', value: () => true },
      { key: 'search', label: 'بحث عميق بالاسم والوصف ورمز SKU', value: () => true },
      { key: 'csv', label: 'استيراد وتصدير بملفّات CSV', value: () => true }
    ]
  },
  {
    key: 'orders',
    title: 'الطلبات والكاشير',
    icon: PiReceiptDuotone,
    rows: [
      { key: 'online', label: 'طلبات أونلاين وتتبّع للزبون', hint: 'توصيل أو استلام أو داخل المطعم، والزبون يتابع حالة طلبه من رابطه', value: (p) => !!p.hasOnlineOrders },
      { key: 'alerts', label: 'تنبيه صوتيّ وإشعار متصفّح وتيليغرام', hint: 'لا يفوتك طلب ولو كانت اللوحة مغلقة', value: (p) => !!p.hasOnlineOrders },
      { key: 'invoice', label: 'طباعة فاتورة الطلب', value: (p) => !!p.hasOnlineOrders },
      {
        key: 'qr',
        label: byKind('الطاولات ورموز QR', 'رموز QR للمتجر والمنتجات', 'الطاولات ورموز QR'),
        hint: byKind('رمز لكل طاولة، والطلب يصل برقمها', 'رمز يفتح متجرك أو منتجاً بعينه', 'رمز لكل طاولة أو منتج، والطلب يصل برقم الطاولة'),
        perk: 'رموز QR',
        value: (p) => !!p.hasTableQr
      },
      { key: 'pos', label: 'الكاشير POS', hint: 'بيع داخل المحلّ من الهاتف بمسح الباركود بالكاميرا', perk: 'الكاشير POS', value: gate('pos') },
      { key: 'pos_extra', label: 'إيصال ومرتجعات وملخّص وردية', hint: 'ضمن الكاشير', value: gate('pos') }
    ]
  },
  {
    key: 'marketing',
    title: 'التسويق والنموّ',
    icon: PiMegaphoneDuotone,
    rows: [
      { key: 'coupons', label: 'كوبونات الخصم', hint: 'نسبة أو مبلغ، بحدّ أدنى وتاريخ انتهاء وسقف استخدام', perk: 'كوبونات الخصم', value: gate('coupons') },
      { key: 'promotions', label: 'العروض والأقسام التسويقية', hint: 'شرائح إعلانية وأقسام مميّزة في واجهتك', perk: 'العروض والأقسام التسويقية', value: gate('promotions') },
      { key: 'affiliate', label: 'المسوّقون بالعمولة', hint: 'رابط لكل مسوّق، وعمولة تُحسب عند اكتمال الطلب', perk: 'المسوّقون بالعمولة', value: gate('affiliate') },
      { key: 'campaigns', label: 'حملات رسائل للزبائن', hint: 'لمن وافق على الاستلام فقط، مع رابط إلغاء', value: () => true },
      { key: 'automations', label: 'رسائل تلقائية', hint: 'تذكير بالسلّة المتروكة، ورسالة لمن انقطع عن الطلب', value: () => true }
    ]
  },
  {
    key: 'shipping',
    title: 'الشحن والتوصيل',
    icon: PiMopedDuotone,
    rows: [
      { key: 'zones', label: 'مناطق توصيل وأجرة لكل منطقة أو محافظة', value: () => true },
      { key: 'drivers', label: 'السائقون وإسناد طلبات التوصيل', hint: 'تسلّم الطلب لسائق وتتابع التسليم', value: (p) => !!p.hasOnlineOrders },
      { key: 'label', label: 'طباعة ملصق الشحن', value: (p) => !!p.hasOnlineOrders }
    ]
  },
  {
    key: 'customers',
    title: 'العملاء',
    icon: PiUsersThreeDuotone,
    rows: [
      { key: 'crm', label: 'سجلّ الزبائن وطلبات كلّ زبون', hint: 'كم مرّة طلب، وبكم، ومتى آخر مرّة', value: () => true },
      { key: 'filters', label: 'فلاتر متقدّمة وتصدير CSV', value: () => true },
      { key: 'comments', label: byKind('تعليقات على الوجبات', 'تعليقات على المنتجات', 'تعليقات على المنتجات والوجبات'), hint: 'تردّ عليها وتخفي ما لا يناسب', value: () => true },
      { key: 'reviews', label: 'تقييمات موثّقة من المشترين', hint: 'لا يقيّم إلا من اشترى فعلاً', value: () => true },
      { key: 'whatsapp', label: 'تواصل الزبون معك عبر واتساب', value: (p) => !!p.hasWhatsapp }
    ]
  },
  {
    key: 'payment',
    title: 'الدفع',
    icon: PiWalletDuotone,
    rows: [
      { key: 'cod', label: 'الدفع عند الاستلام', value: () => true },
      { key: 'shamcash', label: 'تحويل شام كاش', hint: 'يحوّل الزبون إلى محفظتك مباشرة، بلا وسيط', value: () => true }
    ]
  },
  {
    key: 'reports',
    title: 'التقارير والتحليلات',
    icon: PiChartLineUpDuotone,
    rows: [
      { key: 'finance', label: 'القسم المالي', hint: 'الإيراد والتكلفة والربح الفعليّ لكل طلب — للمالك وحده', value: () => true },
      { key: 'analytics', label: 'لوحة التحليلات', hint: 'المبيعات عبر الوقت، ساعات الذروة، أكثر المنتجات طلباً، ومصادر الزيارات', perk: 'لوحة التحليلات', value: gate('analytics') },
      { key: 'pixels', label: 'بكسلات الإعلانات: Meta، TikTok، Google Analytics', hint: 'لقياس إعلاناتك وبناء جمهورك — ضمن التحليلات', perk: 'بكسلات الإعلانات', value: gate('analytics') }
    ]
  },
  {
    key: 'identity',
    title: 'الدومين والهوية وSEO',
    icon: PiGlobeHemisphereEastDuotone,
    rows: [
      { key: 'subdomain', label: 'رابط فرعيّ باسمك', hint: 'name.shamstores.com — فور التسجيل', value: () => true },
      { key: 'domain', label: 'نطاقك الخاص مع SSL تلقائية', hint: 'مثل mystore.com بسجلّ CNAME واحد', perk: 'نطاقك الخاص', value: gate('custom_domain') },
      { key: 'seo', label: 'إعدادات SEO لمتجرك', hint: 'العنوان والوصف وصورة المشاركة لمحركات البحث وروابط التواصل', value: () => true },
      { key: 'badge', label: 'إخفاء «مدعوم من شام ستورز»', perk: 'بلا شارة المنصّة', value: gate('branding_removal') },
      { key: 'pwa', label: 'تطبيق باسمك (PWA)', hint: 'يُثبَّت على شاشة هاتف الزبون باسمك وشعارك', perk: 'تطبيق باسمك', value: gate('pwa') }
    ]
  },
  {
    key: 'design',
    title: 'التصميم والقوالب',
    icon: PiPaletteDuotone,
    rows: [
      { key: 'templates', label: 'قوالب جاهزة بألوانك وشعارك', hint: 'مع معاينة قبل النشر', value: () => true },
      { key: 'lang', label: 'واجهة بالعربية والإنجليزية', hint: 'واختر أيّهما يراها الزائر أولاً', perk: 'واجهة بلغتين', value: gate('multi_language') }
    ]
  },
  {
    key: 'team',
    title: 'الفريق والفروع',
    icon: PiUserGearDuotone,
    rows: [
      {
        key: 'users',
        label: 'حسابات اللوحة',
        hint: 'المالك والموظفون',
        metric: true,
        // حارس الموظفين يرفض المجانية مهما كان حدّها — فلا نَعِد بما يُرفض
        value: (p) => (isFreePlan(p) ? 'المالك فقط' : limit(p.maxUsers))
      },
      { key: 'staff', label: 'موظفون بصلاحيات لكل شاشة', hint: 'تحدّد ما يراه كلّ موظف وما يعدّله', perk: 'موظفون بصلاحيات', value: (p) => !isFreePlan(p) },
      {
        key: 'branches',
        label: 'الفروع',
        hint: byKind('مطاعم إضافية تحت حسابك', 'متاجر إضافية تحت حسابك', 'مطاعم أو متاجر إضافية تحت حسابك'),
        metric: true,
        value: (p) => {
          const b = planBranches(p);
          return b === 1 ? 'فرع واحد' : b >= UNLIMITED ? 'غير محدود' : `${limit(b)} فروع`;
        }
      }
    ]
  },
  {
    key: 'support',
    title: 'الدعم',
    icon: PiLifebuoyDuotone,
    rows: [
      { key: 'support', label: 'دعم بالعربية', value: () => true },
      { key: 'export', label: 'بياناتك ملكك: تصدير ومغادرة بلا رسوم', value: () => true },
      { key: 'addons', label: 'إضافات منفردة من لوحتك', hint: 'اشترِ ميزة واحدة دون تغيير خطتك', value: () => true }
    ]
  }
];

export const ALL_ROWS: Row[] = SECTIONS.flatMap((s) => s.rows);

export const rowText = (v: Row['label'] | Row['hint'], ctx: RowCtx) => (typeof v === 'function' ? v(ctx) : v);

// ===== بطاقة الخطة =====

/**
 * أبرز ما في الخطة: حدودها، ثم ما تضيفه على الخطة التي قبلها. «ما قبلها» هي
 * أغلى خطةٍ أرخص تحتويها كاملة — خطة «الكاشير» مثلاً ليست جزءاً من «النموّ».
 */
export const planHeadlines = (plans: ComparablePlan[], i: number, ctx: RowCtx) => {
  const p = plans[i];
  const itemWord = ctx.kind === 'restaurant' ? 'صنف' : ctx.kind === 'store' ? 'منتج' : 'منتج أو صنف';
  const items = planItems(p);
  const limits: string[] = [
    isUnlimited(items) ? `${ctx.kind === 'restaurant' ? 'أصناف' : 'منتجات'} بلا حدود` : `حتى ${limit(items)} ${itemWord}`,
    isUnlimited(p.maxOrders) ? 'طلبات بلا حدود' : `${limit(p.maxOrders)} طلب شهرياً`,
    isFreePlan(p) ? 'حساب المالك' : `${limit(p.maxUsers)} حسابات للفريق`
  ];
  const b = planBranches(p);
  if (b > 1) limits.push(`${limit(b)} فروع`);

  const onRows = (x: ComparablePlan) => ALL_ROWS.filter((r) => r.perk && r.value(x, ctx) === true);
  const on = onRows(p);
  const onKeys = new Set(on.map((r) => r.key));
  let base: ComparablePlan | undefined;
  for (let j = i - 1; j >= 0; j--) {
    if (onRows(plans[j]).every((r) => onKeys.has(r.key))) {
      base = plans[j];
      break;
    }
  }
  const perks = base
    ? on.filter((r) => r.value(base as ComparablePlan, ctx) !== true).map((r) => r.perk as string)
    : ['طلبات أونلاين ورموز QR', 'الدفع عند الاستلام وشام كاش', 'قوالب بألوانك وشعارك'];
  // «موظفون بصلاحيات» مفهومٌ من سطر الحسابات
  const trimmed = perks.filter((x) => x !== 'موظفون بصلاحيات');
  return { base, limits, perks: trimmed };
};

// ===== الإضافات =====

export const ADDON_BULLETS: Record<string, string[]> = {
  branding_removal: ['واجهتك بهويتك وحدها', 'بلا شارة «مدعوم من شام ستورز»', 'على كل صفحات متجرك'],
  custom_domain: ['اربط نطاقاً مثل mystore.com', 'شهادة SSL تُصدر وتُجدَّد تلقائياً', 'سجلّ CNAME واحد والباقي آليّ'],
  analytics: ['المبيعات عبر الوقت وساعات الذروة', 'أكثر المنتجات طلباً ومتوسّط الطلب', 'مصادر الزيارات وأين يتوقّف الزائر', 'بكسلات Meta، TikTok، Google Analytics'],
  coupons: ['خصم بنسبة أو بمبلغ ثابت', 'حدّ أدنى للطلب وتاريخ انتهاء', 'سقف استخدام ومتابعة كل كود'],
  promotions: ['شرائح إعلانية في واجهتك', 'أقسام عروض مميّزة', 'بالترتيب الذي تختاره'],
  affiliate: ['رابط خاص لكل مسوّق', 'زيارات كل مسوّق ومبيعاته', 'عمولة تُحسب عند اكتمال الطلب وتسقط بإلغائه'],
  pos: ['باركود بالكاميرا أو بحث بالاسم', 'إيصال مطبوع وحساب الباقي', 'مرتجعات وملخّص الوردية', 'المخزون والتقارير مع طلبات الأونلاين'],
  multi_language: ['واجهة بالعربية والإنجليزية', 'اختر اللغة التي تظهر أولاً', 'يبدّل الزائر اللغة بنقرة'],
  pwa: ['يُثبَّت على شاشة هاتف زبونك', 'باسمك وشعارك وألوانك', 'يفتح كتطبيق مستقلّ بلا متجر تطبيقات']
};

/** أرخص خطةٍ ظاهرة تشمل الإضافة — «مشمولة من خطة كذا» */
export const addonIncludedFrom = (plans: ComparablePlan[], code: string): string | null => {
  const i = plans.findIndex((p) => planIncludes(p, code));
  if (i < 0) return null;
  const andAbove = i < plans.length - 1 && plans.slice(i + 1).every((p) => planIncludes(p, code));
  return `مشمولة في «${planLabel(plans[i])}»${andAbove ? ' فما فوق' : ''}`;
};

/** نصّ السعر الشهري: بالليرة حين يتوفّر سعر الصرف، وإلا بالدولار */
export const priceParts = (pricing: { amountUsd?: number; amountSyp?: number | null } | null | undefined, usd: number) => {
  const syp = pricing?.amountSyp;
  if (syp) return { amount: syp.toLocaleString('en-US'), unit: 'ل.س' };
  const n = pricing?.amountUsd ?? usd;
  return { amount: `$${Math.round(n * 100) / 100}`, unit: '' };
};
