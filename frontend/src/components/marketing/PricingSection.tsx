// frontend/src/components/marketing/PricingSection.tsx
//
// الأسعار: بطاقات الخطط، و«ماذا يشمل كل قسم؟»، وجدول مقارنةٍ كامل.
//
// **كلّه من بيانات الخادم.** الأسعار والحدود وبوابات الميزات تُقرأ من
// `GET /api/plans`، والجدول يُبنى من إعداد صفوفٍ `{ group, label, value(plan) }`
// فأيّ تعديلٍ يجريه الأدمن على خطة يظهر هنا بلا نشرة.
//
// **كلّ صفّ مُتحقَّقٌ منه في الخادم** — ما يُفحص بأي بوابة:
//   - checkPlanFeature: online_orders (الطلبات والسائقون)، table_qr، coupons،
//     promotions (قسم التسويق)، analytics، custom_domain، pos، affiliate
//   - inventory غير «صارم» في checkPlan.ts: تمرّ لأي خطة مدفوعة، لا للمجانية
//   - requirePaidPlanForStaff: الموظفون لأي خطة مدفوعة
//   - businessHasEntitlement: pwa، branding_removal، multi_language
//   - بلا بوابة (كل الخطط): الزبائن، الحملات، الرسائل التلقائية، مناطق
//     التوصيل، القسم المالي، القوالب، الدفع
// والإضافات المنفردة (كتالوج seed-features.js) تُشترى على أي خطة، فالميزة
// غير المشمولة تُعرض «كإضافة» لا «غير متاح».

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PiCheckBold, PiMinusBold, PiReceiptDuotone, PiBarcodeDuotone, PiQrCodeDuotone, PiMopedDuotone,
  PiMapPinDuotone, PiForkKnifeDuotone, PiPackageDuotone, PiUsersThreeDuotone, PiTicketDuotone,
  PiMegaphoneDuotone, PiLightningDuotone, PiHandshakeDuotone, PiChartLineUpDuotone,
  PiWalletDuotone, PiPaletteDuotone, PiUserGearDuotone, PiSparkleDuotone, PiGlobeHemisphereEastDuotone,
  PiTranslateDuotone, PiDeviceMobileDuotone, PiHouseDuotone, PiInfoDuotone, PiCrownSimpleDuotone
} from 'react-icons/pi';
import type { IconType } from 'react-icons';
import { planLabel } from '@/utils/planLabels';

// ===== النوع =====

export interface PublicPlan {
  id: string;
  name: string;
  slug?: string | null;
  description?: string;
  price: number;
  isPopular?: boolean;
  maxMenuItems?: number;
  maxProducts?: number;
  maxOrders?: number;
  maxUsers?: number;
  maxRestaurants?: number;
  maxStores?: number;
  hasTableQr?: boolean;
  hasWhatsapp?: boolean;
  hasOnlineOrders?: boolean;
  hasCoupons?: boolean;
  hasPromotions?: boolean;
  hasAnalytics?: boolean;
  hasBrandingRemoval?: boolean;
  hasCustomDomain?: boolean;
  hasMultiLanguage?: boolean;
  features?: unknown;
  pricing?: { amountUsd: number; amountSyp: number | null; isFree: boolean };
}

// ===== أدوات =====

const UNLIMITED = 99999;
// أرقامٌ لاتينية كأسعار المتاجر نفسها — لا خليط من ١٠٠ و100 في البطاقة الواحدة
export const limit = (n?: number) => (!n ? '—' : n >= UNLIMITED ? 'غير محدود' : n.toLocaleString('en-US'));

const isFree = (p: PublicPlan) => p.pricing?.isFree ?? (p.price <= 0 || p.slug === 'free' || p.name === 'free');

/** رموز `features` الحرّة بالصيغة التي يوحّدها الخادم (pos، affiliate، pwa…) */
const extraCodes = (p: PublicPlan): Set<string> => {
  let raw: unknown = p.features;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  const list = Array.isArray(raw) ? raw : [];
  return new Set(list.map((c) => String(c).trim().replace(/-/g, '_').toLowerCase()));
};

const hasCode = (p: PublicPlan, code: string) => extraCodes(p).has(code);
const items = (p: PublicPlan) => Math.max(p.maxMenuItems || 0, p.maxProducts || 0);
const branches = (p: PublicPlan) => Math.max(p.maxRestaurants || 0, p.maxStores || 0, 1);

type Cell = boolean | 'addon' | string;
const orAddon = (on: boolean): Cell => (on ? true : 'addon');

// ===== صفوف المقارنة =====

type GroupKey = 'limits' | 'identity' | 'sales' | 'growth' | 'admin' | 'support';

const GROUP_LABEL: Record<GroupKey, string> = {
  limits: 'الأساسيات والحدود',
  identity: 'الواجهة والهوية',
  sales: 'الطلبات والبيع',
  growth: 'التسويق والنموّ',
  admin: 'الإدارة والتقارير',
  support: 'الدعم وبياناتك'
};

interface Row {
  key: string;
  group: GroupKey;
  label: string;
  hint?: string;
  /** صفٌّ رقميّ (حدود) — لا يدخل في «ما الجديد في هذه الخطة» */
  metric?: boolean;
  value: (p: PublicPlan) => Cell;
}

const ROWS: Row[] = [
  // الأساسيات والحدود
  { key: 'items', group: 'limits', label: 'الأصناف أو المنتجات', hint: 'أصناف القائمة للمطعم، أو منتجات المتجر', metric: true, value: (p) => limit(items(p)) },
  { key: 'orders', group: 'limits', label: 'الطلبات شهرياً', metric: true, value: (p) => limit(p.maxOrders) },
  { key: 'users', group: 'limits', label: 'حسابات اللوحة', hint: 'المالك والموظفون', metric: true, value: (p) => limit(p.maxUsers) },
  { key: 'branches', group: 'limits', label: 'الفروع', hint: 'مطاعم أو متاجر إضافية تحت حسابك', metric: true, value: (p) => (branches(p) === 1 ? 'فرع واحد' : branches(p) >= UNLIMITED ? 'غير محدود' : `${limit(branches(p))} فروع`) },
  { key: 'kind', group: 'limits', label: 'مطعم أو متجر إلكتروني', hint: 'تختار نوع نشاطك عند التسجيل', value: () => true },
  { key: 'dashboard', group: 'limits', label: 'لوحة تحكم من الجوال والحاسوب', value: () => true },

  // الواجهة والهوية
  { key: 'templates', group: 'identity', label: 'قوالب واجهة بألوانك وشعارك', hint: 'خمسة أنماط للقائمة وأربعة قوالب للمتجر، مع معاينة قبل النشر', value: () => true },
  { key: 'subdomain', group: 'identity', label: 'رابط فرعيّ باسمك', hint: 'name.shamstores.com — فوراً', value: () => true },
  { key: 'seo', group: 'identity', label: 'عنوان ووصف وصورة مشاركة', hint: 'لمحركات البحث وروابط التواصل', value: () => true },
  { key: 'badge', group: 'identity', label: 'إخفاء «مدعوم من شام ستورز»', value: (p) => orAddon(!!p.hasBrandingRemoval || hasCode(p, 'branding_removal')) },
  { key: 'lang', group: 'identity', label: 'واجهة بالعربية والإنجليزية', value: (p) => orAddon(!!p.hasMultiLanguage || hasCode(p, 'multi_language')) },
  { key: 'domain', group: 'identity', label: 'نطاقك الخاص مع SSL تلقائية', hint: 'مثل mystore.com بسجلّ CNAME واحد', value: (p) => orAddon(!!p.hasCustomDomain || hasCode(p, 'custom_domain')) },
  { key: 'pwa', group: 'identity', label: 'تطبيق باسم متجرك (PWA)', hint: 'يُثبَّت على شاشة هاتف الزبون باسمك وشعارك', value: (p) => orAddon(hasCode(p, 'pwa')) },

  // الطلبات والبيع
  { key: 'online', group: 'sales', label: 'طلبات أونلاين وتتبّع للزبون', hint: 'توصيل أو استلام أو داخل المطعم أو شحن', value: (p) => !!p.hasOnlineOrders },
  { key: 'alerts', group: 'sales', label: 'تنبيه صوتيّ وإشعار متصفّح وتيليغرام', value: (p) => !!p.hasOnlineOrders },
  { key: 'qr', group: 'sales', label: 'طاولات ورموز QR', hint: 'رمز لكل طاولة والطلب يصل برقمها', value: (p) => !!p.hasTableQr },
  { key: 'whatsapp', group: 'sales', label: 'تواصل الزبون عبر واتساب', value: (p) => !!p.hasWhatsapp },
  { key: 'payments', group: 'sales', label: 'الدفع نقداً أو عبر شام كاش', hint: 'التحويل يصل محفظتك مباشرة بلا اقتطاع', value: () => true },
  { key: 'shipping', group: 'sales', label: 'مناطق توصيل وأجرة شحن لكل محافظة', value: () => true },
  { key: 'drivers', group: 'sales', label: 'السائقون وطلبات التوصيل', hint: 'تسليم الطلب لسائق ومتابعته', value: (p) => !!p.hasOnlineOrders },
  { key: 'options', group: 'sales', label: 'خيارات المنتج: مقاسات وألوان وإضافات', value: () => true },
  { key: 'catalog', group: 'sales', label: 'تصنيفات فرعية ووسوم وصور متعددة', value: () => true },
  { key: 'reviews', group: 'sales', label: 'تقييمات المنتجات من المشترين', value: () => true },
  { key: 'csv', group: 'sales', label: 'استيراد وتصدير بملفّات CSV', hint: 'المنتجات والطلبات والزبائن', value: () => true },
  { key: 'inventory', group: 'sales', label: 'المخزون وتنبيه قرب النفاد', hint: 'للمتاجر', value: (p) => !isFree(p) || hasCode(p, 'inventory') },
  { key: 'pos', group: 'sales', label: 'الكاشير POS', hint: 'بيع من المحلّ بمسح الباركود وإيصال وملخّص وردية', value: (p) => orAddon(hasCode(p, 'pos')) },

  // التسويق والنمو
  { key: 'customers', group: 'growth', label: 'الزبائن وسجلّ طلبات كلّ زبون', value: () => true },
  { key: 'campaigns', group: 'growth', label: 'حملات للزبائن', hint: 'لمن وافق على استلامها فقط', value: () => true },
  { key: 'automations', group: 'growth', label: 'رسائل تلقائية', hint: 'تذكير بالسلّة المتروكة واسترجاع من انقطع', value: () => true },
  { key: 'coupons', group: 'growth', label: 'كوبونات الخصم', hint: 'نسبة أو مبلغ، بحدّ أدنى وتاريخ انتهاء وعدد استخدامات', value: (p) => orAddon(!!p.hasCoupons) },
  { key: 'promotions', group: 'growth', label: 'العروض والأقسام التسويقية', hint: 'شرائح إعلانية وأقسام مميّزة في واجهتك', value: (p) => orAddon(!!p.hasPromotions) },
  { key: 'affiliate', group: 'growth', label: 'المسوّقون بالعمولة', hint: 'رابط لكل مسوّق وعمولة تُحسب تلقائياً', value: (p) => orAddon(hasCode(p, 'affiliate')) },

  // الإدارة والتقارير
  { key: 'staff', group: 'admin', label: 'موظفون بصلاحيات لكل شاشة', value: (p) => !isFree(p) },
  { key: 'analytics', group: 'admin', label: 'لوحة التحليلات', hint: 'رحلة الزائر ومصادر الزيارات وأكثر المنتجات طلباً', value: (p) => orAddon(!!p.hasAnalytics) },
  { key: 'finance', group: 'admin', label: 'القسم المالي', hint: 'التكلفة والربح الفعليّ لكل طلب — للمالك وحده', value: () => true },

  // الدعم
  { key: 'support', group: 'support', label: 'دعم بالعربية', value: () => true },
  { key: 'export', group: 'support', label: 'بياناتك ملكك: تصدير ومغادرة بلا رسوم', value: () => true },
  { key: 'addons', group: 'support', label: 'إضافات منفردة من لوحتك', hint: 'اشترِ ميزة واحدة دون تغيير خطتك', value: () => true }
];

const GROUPS = Object.keys(GROUP_LABEL) as GroupKey[];
const ROW_BY_KEY = Object.fromEntries(ROWS.map((r) => [r.key, r])) as Record<string, Row>;

// ===== أقسام المنتج =====

interface Module {
  icon: IconType;
  name: string;
  desc: string;
  row: string;
}

const MODULE_GROUPS: Array<{ title: string; modules: Module[] }> = [
  {
    title: 'البيع',
    modules: [
      { icon: PiReceiptDuotone, name: 'الطلبات', row: 'online', desc: 'كلّ طلب يصل لحظياً بتنبيه، تغيّر حالته من «جديد» حتى «تم التسليم»، والزبون يتابعه من رابطه.' },
      { icon: PiBarcodeDuotone, name: 'الكاشير', row: 'pos', desc: 'بيع داخل المحلّ من الهاتف: مسح الباركود أو البحث بالاسم، حساب الباقي، إيصال، وملخّص الوردية.' },
      { icon: PiQrCodeDuotone, name: 'الطاولات ورموز QR', row: 'qr', desc: 'أنشئ طاولاتك واطبع رمزاً لكل منها؛ الطلب يصل المطبخ برقم الطاولة.' },
      { icon: PiMopedDuotone, name: 'طلبات التوصيل والسائقون', row: 'drivers', desc: 'أضف سائقيك، وأسند لهم الطلبات، وتابع التسليم خطوة بخطوة.' },
      { icon: PiMapPinDuotone, name: 'مناطق التوصيل', row: 'shipping', desc: 'حدّد أين توصل وبكم: أجرة لكل منطقة أو لكل محافظة من المحافظات الأربع عشرة.' }
    ]
  },
  {
    title: 'الكتالوج',
    modules: [
      { icon: PiForkKnifeDuotone, name: 'القائمة / المنتجات', row: 'options', desc: 'أصناف ومنتجات بالصور والأسعار، تصنيفات فرعية ووسوم، ومقاسات وألوان وإضافات لكل صنف.' },
      { icon: PiPackageDuotone, name: 'المخزون', row: 'inventory', desc: 'الكمية لكل منتج ولكل خيار، وتنبيه قبل النفاد، والكمية تنقص تلقائياً مع كل بيع.' }
    ]
  },
  {
    title: 'الزبائن والتسويق',
    modules: [
      { icon: PiUsersThreeDuotone, name: 'الزبائن', row: 'customers', desc: 'كلّ من طلب منك: كم مرّة، وبكم، ومتى آخر مرّة — مع تصدير CSV.' },
      { icon: PiTicketDuotone, name: 'الكوبونات', row: 'coupons', desc: 'أكواد خصم بنسبة أو مبلغ، بحدّ أدنى وتاريخ انتهاء وسقف استخدام، ومتابعة استعمال كلّ كود.' },
      { icon: PiMegaphoneDuotone, name: 'حملات الزبائن', row: 'campaigns', desc: 'رسالة لمجموعة من زبائنك ممّن وافقوا على الاستلام، مع رابط إلغاء اشتراك لكل رسالة.' },
      { icon: PiLightningDuotone, name: 'رسائل تلقائية', row: 'automations', desc: 'قواعد تعمل وحدها: تذكير بالسلّة المتروكة، ورسالة لمن انقطع عن الطلب.' },
      { icon: PiHandshakeDuotone, name: 'المسوّقون', row: 'affiliate', desc: 'رابط خاص لكل مسوّق، وزياراته ومبيعاته وعمولته — تُستحقّ باكتمال الطلب وتسقط بإلغائه.' },
      { icon: PiSparkleDuotone, name: 'التسويق', row: 'promotions', desc: 'شرائح إعلانية وأقسام عروض مميّزة في واجهتك، بالترتيب الذي تختاره.' }
    ]
  },
  {
    title: 'التقارير',
    modules: [
      { icon: PiHouseDuotone, name: 'الرئيسية', row: 'dashboard', desc: 'ملخّص يومك: المبيعات والطلبات الجديدة وما ينتظر قرارك، من الجوال أو الحاسوب.' },
      { icon: PiChartLineUpDuotone, name: 'الإحصائيات', row: 'analytics', desc: 'المبيعات عبر الوقت، ساعات الذروة، أكثر المنتجات طلباً، ومن أين يأتي زوّارك وأين يتوقّفون.' },
      { icon: PiWalletDuotone, name: 'القسم المالي', row: 'finance', desc: 'الإيراد والتكلفة والربح الفعليّ لكل طلب، أونلاين ومن الكاشير معاً — للمالك وحده.' }
    ]
  },
  {
    title: 'الإعداد والهوية',
    modules: [
      { icon: PiPaletteDuotone, name: 'الإعدادات والقوالب', row: 'templates', desc: 'القالب والألوان والشعار والخط، طرق الدفع وشام كاش، ساعات العمل، وبيانات SEO.' },
      { icon: PiUserGearDuotone, name: 'الموظفون', row: 'staff', desc: 'حساب لكل موظف، وتحدّد بنفسك الشاشات التي يراها وما يستطيع تعديله.' },
      { icon: PiGlobeHemisphereEastDuotone, name: 'النطاق الخاص', row: 'domain', desc: 'اربط نطاقك بسجلّ CNAME واحد، وشهادة الأمان تُصدر وتُجدّد تلقائياً.' },
      { icon: PiTranslateDuotone, name: 'اللغات', row: 'lang', desc: 'الإنجليزية إلى جانب العربية، واختر أيّهما يراها الزائر أولاً.' },
      { icon: PiDeviceMobileDuotone, name: 'تطبيق باسمك', row: 'pwa', desc: 'يثبّت زبونك واجهتك على شاشة هاتفه كتطبيق باسمك وشعارك، وتصله إشعاراتك.' },
      { icon: PiCrownSimpleDuotone, name: 'الميزات والخطط', row: 'addons', desc: 'رقِّ خطتك، أو اشترِ ميزة واحدة منفردة شهرياً دون تغيير الخطة.' }
    ]
  }
];

// ===== عرض الخلايا والأسعار =====

const CellView: React.FC<{ cell: Cell }> = ({ cell }) => {
  if (cell === true) return <span className="ss-cmp-yes" role="img" aria-label="متاح"><PiCheckBold /></span>;
  if (cell === false) return <span className="ss-cmp-no" role="img" aria-label="غير متاح"><PiMinusBold /></span>;
  if (cell === 'addon') return <span className="ss-cmp-addon">كإضافة</span>;
  return <span className="ss-cmp-text">{cell}</span>;
};

const PriceView: React.FC<{ p: PublicPlan; compact?: boolean }> = ({ p, compact }) => {
  const syp = p.pricing?.amountSyp;
  if (isFree(p)) return <span className="ss-pl-price"><b>مجاناً</b></span>;
  if (syp) {
    return (
      <span className="ss-pl-price">
        <b className="latin">{syp.toLocaleString('en-US')}</b>
        <span>ل.س{compact ? '' : ' / شهرياً'}</span>
      </span>
    );
  }
  return (
    <span className="ss-pl-price">
      <b className="latin">${p.pricing?.amountUsd ?? p.price}</b>
      <span>{compact ? '/ شهر' : 'شهرياً'}</span>
    </span>
  );
};

// ===== المكوّن =====

interface Props {
  plans: PublicPlan[] | null;
  failed: boolean;
}

const PricingSection: React.FC<Props> = ({ plans, failed }) => {
  const sorted = useMemo(
    () => (plans || []).slice().sort((a, b) => (a.pricing?.amountUsd ?? a.price ?? 0) - (b.pricing?.amountUsd ?? b.price ?? 0)),
    [plans]
  );
  const popularIdx = Math.max(0, sorted.findIndex((p) => p.isPopular));
  const [focus, setFocus] = useState<number | null>(null);
  const focused = focus ?? popularIdx;
  const [modTab, setModTab] = useState(0);

  // «ما الجديد» في كل خطة — مقارنةً بأغلى خطةٍ قبلها تحتويها كاملة. خطة
  // «الكاشير» مثلاً ليست جزءاً من «النموّ» (لا كاشير فيه)، فلا نقول
  // «كل ما في الكاشير» حيث لا يصحّ؛ نقارن بالتي قبلها فعلاً.
  const perks = useMemo(
    () =>
      sorted.map((p, i) => {
        const on = ROWS.filter((r) => !r.metric && r.value(p) === true);
        const onKeys = new Set(on.map((r) => r.key));
        let base: PublicPlan | undefined;
        for (let j = i - 1; j >= 0; j--) {
          const prevOn = ROWS.filter((r) => !r.metric && r.value(sorted[j]) === true);
          if (prevOn.every((r) => onKeys.has(r.key))) {
            base = sorted[j];
            break;
          }
        }
        const list = base
          ? on.filter((r) => r.value(base as PublicPlan) !== true)
          : on.filter((r) => ['online', 'qr', 'payments', 'shipping', 'templates', 'customers'].includes(r.key));
        return { prev: base, list };
      }),
    [sorted]
  );

  /** أين يتوفّر القسم: كل الخطط، أو من خطة كذا، أو كإضافة */
  const availability = (rowKey: string): string | null => {
    const row = ROW_BY_KEY[rowKey];
    if (!row || !sorted.length) return null;
    const cells = sorted.map((p) => row.value(p));
    const firstOn = cells.findIndex((c) => c === true);
    const addon = cells.some((c) => c === 'addon');
    if (firstOn === 0) return 'في كل الخطط';
    if (firstOn < 0) return addon ? 'كإضافة منفردة' : null;
    return `من «${planLabel(sorted[firstOn])}»${addon ? ' · أو كإضافة' : ''}`;
  };

  const hasSyp = sorted.some((p) => p.pricing?.amountSyp);

  return (
    <section id="pricing" className="ss-section ss-pl" aria-labelledby="pricing-title">
      <div className="ss-container">
        <div className="ss-section-head ss-reveal">
          <span className="ss-eyebrow"><PiWalletDuotone /> أسعار واضحة بالليرة</span>
          <h2 id="pricing-title" className="ss-h2">ابدأ مجاناً، وادفع حين تكبر</h2>
          <p className="ss-lead">
            {hasSyp
              ? 'الأسعار شهرية بالليرة السورية وفق سعر الصرف الموحّد على المنصّة. تدفع عبر شام كاش أو بالتواصل معنا.'
              : 'الأسعار شهرية. تدفع عبر شام كاش أو بالتواصل معنا، ولا تحتاج بطاقة ائتمان للبدء.'}
          </p>
        </div>

        {/* ===== البطاقات ===== */}
        {failed ? (
          <p className="ss-pl-note">
            تعذّر تحميل الخطط الآن — <Link to="/contact">تواصل معنا</Link> لمعرفة الأسعار.
          </p>
        ) : !plans ? (
          <div className="ss-pl-cards" aria-busy="true" data-count={4}>
            {[0, 1, 2, 3].map((i) => <div key={i} className="ss-pl-card is-skeleton" />)}
          </div>
        ) : (
          <div className="ss-pl-cards" data-count={sorted.length}>
            {sorted.map((p, i) => {
              const free = isFree(p);
              const { prev, list } = perks[i];
              return (
                <article
                  key={p.id}
                  className={`ss-pl-card ss-reveal ${p.isPopular ? 'is-popular' : ''}`}
                  style={{ transitionDelay: `${(i % 3) * 80}ms` }}
                  aria-label={`خطة ${planLabel(p)}`}
                >
                  {p.isPopular && <span className="ss-pl-flag">الأكثر اختياراً</span>}
                  <header>
                    <h3>{planLabel(p)}</h3>
                    {p.description && <p>{p.description}</p>}
                  </header>
                  <PriceView p={p} />
                  <dl className="ss-pl-limits">
                    <div><dt>الأصناف</dt><dd className="latin">{limit(items(p))}</dd></div>
                    <div><dt>طلب / شهر</dt><dd className="latin">{limit(p.maxOrders)}</dd></div>
                    <div><dt>حسابات</dt><dd className="latin">{limit(p.maxUsers)}</dd></div>
                    <div><dt>فروع</dt><dd className="latin">{limit(branches(p))}</dd></div>
                  </dl>
                  <div className="ss-pl-perks">
                    <small>{prev ? `كل ما في «${planLabel(prev)}»، و:` : 'تشمل:'}</small>
                    <ul>
                      {list.slice(0, 6).map((r) => (
                        <li key={r.key}><PiCheckBold />{r.label}</li>
                      ))}
                      {list.length > 6 && <li className="is-more">و{list.length - 6} ميزات أخرى في الجدول</li>}
                      {!list.length && <li className="is-more">حدود أعلى للأصناف والطلبات</li>}
                    </ul>
                  </div>
                  <Link to="/register" className={`ss-btn ${p.isPopular ? 'ss-btn-primary' : 'ss-btn-forest'}`}>
                    {free ? 'ابدأ مجاناً' : 'اختر الخطة'}
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        {/* ===== ماذا يشمل كل قسم ===== */}
        <div className="ss-mod ss-reveal" aria-labelledby="modules-title">
          <div className="ss-mod-head">
            <h3 id="modules-title">ماذا يشمل كل قسم؟</h3>
            <p>أقسام لوحتك كما تراها بعد التسجيل — وما يفعله كلٌّ منها، وفي أيّ خطة يتوفّر.</p>
          </div>
          <div className="ss-mod-tabs" role="tablist" aria-label="أقسام اللوحة">
            {MODULE_GROUPS.map((g, i) => (
              <button
                key={g.title}
                role="tab"
                id={`mod-tab-${i}`}
                aria-selected={modTab === i}
                aria-controls="mod-panel"
                className="ss-mod-tab"
                onClick={() => setModTab(i)}
              >
                {g.title}
                <span className="latin">{g.modules.length}</span>
              </button>
            ))}
          </div>
          <div id="mod-panel" role="tabpanel" aria-labelledby={`mod-tab-${modTab}`} className="ss-mod-grid" key={modTab}>
            {MODULE_GROUPS[modTab].modules.map((m, i) => {
              const where = availability(m.row);
              return (
                <article key={m.name} className="ss-mod-card" style={{ ['--i' as any]: i }}>
                  <span className="ss-mod-icon"><m.icon /></span>
                  <div>
                    <h4>{m.name}</h4>
                    <p>{m.desc}</p>
                    {where && <span className={`ss-mod-where ${where === 'في كل الخطط' ? 'is-all' : ''}`}>{where}</span>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* ===== جدول المقارنة ===== */}
        {sorted.length > 0 && (
          <div className="ss-cmp ss-reveal" aria-labelledby="compare-title">
            <div className="ss-mod-head">
              <h3 id="compare-title">قارن الخطط ميزةً بميزة</h3>
              <p>
                كلّ ما في المنصّة، لكل خطة.
                <span className="ss-cmp-legend">
                  <span><CellView cell={true} /> ضمن الخطة</span>
                  <span><CellView cell="addon" /> تشتريها منفردة من لوحتك</span>
                  <span><CellView cell={false} /> غير متاحة</span>
                </span>
              </p>
            </div>

            {/* على الجوال: خطة واحدة في وجه الميزات، تختارها من هنا */}
            <div className="ss-cmp-switch" role="radiogroup" aria-label="اختر خطة للمقارنة">
              {sorted.map((p, i) => (
                <button key={p.id} role="radio" aria-checked={focused === i} onClick={() => setFocus(i)}>
                  {planLabel(p)}
                </button>
              ))}
            </div>

            <div className="ss-cmp-scroll" data-count={sorted.length}>
              <table>
                <caption className="ss-sr">مقارنة ميزات خطط شام ستورز</caption>
                <thead>
                  <tr>
                    <th scope="col" className="ss-cmp-feat">الميزة</th>
                    {sorted.map((p, i) => (
                      <th key={p.id} scope="col" className={`ss-cmp-plan ${focused === i ? 'is-sel' : ''} ${p.isPopular ? 'is-popular' : ''}`}>
                        <span className="ss-cmp-pname">{planLabel(p)}</span>
                        <PriceView p={p} compact />
                      </th>
                    ))}
                  </tr>
                </thead>
                {GROUPS.map((g) => (
                  <tbody key={g}>
                    <tr className="ss-cmp-group">
                      <th scope="colgroup" colSpan={sorted.length + 1}>{GROUP_LABEL[g]}</th>
                    </tr>
                    {ROWS.filter((r) => r.group === g).map((r) => (
                      <tr key={r.key}>
                        <th scope="row" className="ss-cmp-feat">
                          {r.label}
                          {r.hint && <small>{r.hint}</small>}
                        </th>
                        {sorted.map((p, i) => (
                          <td key={p.id} className={`ss-cmp-plan ${focused === i ? 'is-sel' : ''} ${p.isPopular ? 'is-popular' : ''}`}>
                            <CellView cell={r.value(p)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                ))}
                <tfoot>
                  <tr>
                    <th scope="row" className="ss-cmp-feat" />
                    {sorted.map((p, i) => (
                      <td key={p.id} className={`ss-cmp-plan ${focused === i ? 'is-sel' : ''} ${p.isPopular ? 'is-popular' : ''}`}>
                        <Link to="/register" className={`ss-btn ss-btn-sm ${p.isPopular ? 'ss-btn-primary' : 'ss-btn-forest'}`}>
                          {isFree(p) ? 'ابدأ مجاناً' : 'اختر'}
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="ss-pl-note">
              <PiInfoDuotone /> «كإضافة»: تشتري الميزة وحدها باشتراك شهريّ من صفحة «الميزات» في لوحتك، على أيّ خطة.
              الحدود تُحتسب لكل نشاط، والطلبات تُعدّ شهرياً.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;
