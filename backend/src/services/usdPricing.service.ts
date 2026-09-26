// backend/src/services/usdPricing.service.ts
//
// «سعّر بالدولار، بِع بالليرة تلقائياً».
//
// **المشكلة:** التاجر السوري يشتري بضاعته بالدولار ويبيعها بالليرة. كلّما
// تحرّك سعر الصرف عليه أن يعيد تسعير كل منتج يدوياً — أو يبيع بخسارة.
//
// **لماذا `price` يبقى بالليرة ولا يُستبدل:** عشرات المواضع تقرأ `price`
// (الواجهة، السلّة، البحث، الكاشير، التقارير، إعادة التقويم). جعله مشتقّاً
// مخزَّناً من `priceUsd` يُبقيها كلّها صحيحة بلا سطر تعديل، والإعادة تُحسب
// مرّة عند تغيّر سعر الصرف لا عند كل قراءة.
//
// **ولماذا يُعاد الحساب عند الطلب أيضاً:** المخزَّن نسخة، والطلب مال. الخادم
// يحسب سعر كل صنف من `priceUsd` وسعر الصرف **لحظة الطلب** ويخزّن السعر
// المستعمل في الطلب — فلا يُحصَّل مبلغٌ من نسخةٍ تأخّر تحديثها.
//
// سعر الصرف نفسه وحدوده وعرض العملة: currency.service — لا نكرّرها هنا.

import prisma from './prisma';
import {
  getUsdRate,
  validateUsdRate,
  businessUsdRate,
  MIN_USD_RATE,
  MAX_USD_RATE
} from './currency.service';

export type PricingKind = 'store' | 'restaurant';
export const PRICING_CURRENCIES = ['SYP', 'USD'] as const;
export const RATE_SOURCES = ['platform', 'custom'] as const;

/** سقف خطوة التقريب — أبعد منه لا يعود «تجميلاً» بل تغييراً للسعر */
export const MAX_ROUNDING_STEP = 100_000;

export interface PricingConfig {
  kind: PricingKind;
  businessId: string;
  mode: 'SYP' | 'USD';
  rateSource: 'platform' | 'custom';
  customRate: number | null;
  customRateUpdatedAt: Date | null;
  roundingStep: number;
  platformRate: number | null;
  /** السعر الفعلي المستعمل — `null` حين لا سعر صالح (فيبقى المخزَّن كما هو) */
  effectiveRate: number | null;
}

const PRICING_SELECT = {
  id: true,
  pricingCurrency: true,
  usdRateSource: true,
  customUsdRate: true,
  customUsdRateUpdatedAt: true,
  priceRoundingStep: true
} as const;

const loadBusiness = (kind: PricingKind, id: string) =>
  kind === 'store'
    ? prisma.store.findUnique({ where: { id }, select: PRICING_SELECT })
    : prisma.restaurant.findUnique({ where: { id }, select: PRICING_SELECT });

const buildConfig = (
  kind: PricingKind,
  business: any,
  platformRate: number | null
): PricingConfig => ({
  kind,
  businessId: business.id,
  mode: business.pricingCurrency === 'USD' ? 'USD' : 'SYP',
  rateSource: business.usdRateSource === 'custom' ? 'custom' : 'platform',
  customRate: business.customUsdRate ?? null,
  customRateUpdatedAt: business.customUsdRateUpdatedAt ?? null,
  roundingStep: Number(business.priceRoundingStep) || 0,
  platformRate,
  effectiveRate: businessUsdRate(business, platformRate)
});

export const getPricingConfig = async (
  kind: PricingKind,
  businessId: string
): Promise<PricingConfig | null> => {
  const [business, platformRate] = await Promise.all([loadBusiness(kind, businessId), getUsdRate()]);
  if (!business) return null;
  return buildConfig(kind, business, platformRate);
};

/**
 * دولار ← ليرة بسعر الصرف ثم التقريب.
 *
 * التقريب لأقرب مضاعف لا للأعلى: «للأعلى» يرفع كل سعر بصمت ويظلم الزبون،
 * و«للأسفل» يأكل هامش التاجر. والنتيجة لا تنزل تحت الخطوة نفسها — منتجٌ
 * بعشرة سنتات لا يصير مجّانياً لأن التاجر اختار التقريب لأقرب ألف.
 */
export const usdToSyp = (usd: number, rate: number, step = 0): number => {
  const raw = usd * rate;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (step > 0) return Math.max(step, Math.round(raw / step) * step);
  return Math.round(raw);
};

const positive = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

/** سعر الوحدة بالليرة لصنفٍ بعينه وفق إعداد نشاطه */
export const priceForItem = (
  item: { price: unknown; priceUsd?: unknown },
  cfg: PricingConfig | null
): { price: number; priceUsd: number | null } => {
  const stored = Number(item.price) || 0;
  const usd = positive(item.priceUsd);
  if (!cfg || cfg.mode !== 'USD' || !usd || !cfg.effectiveRate) {
    return { price: stored, priceUsd: null };
  }
  return { price: usdToSyp(usd, cfg.effectiveRate, cfg.roundingStep), priceUsd: usd };
};

/**
 * مسعِّر لطلبٍ واحد: يحمّل إعداد كل نشاط مرّة ويتذكّر سعر الصرف المستعمل.
 *
 * `rateUsed` يُخزَّن في الطلب — فيعرف التاجر والمحاسب لاحقاً بأيّ سعرٍ بيع،
 * بدل أن يستنتجه من سعر اليوم.
 */
export const createOrderPricer = () => {
  const configs = new Map<string, Promise<PricingConfig | null>>();
  const pricer = {
    rateUsed: null as number | null,
    async line(
      kind: PricingKind,
      businessId: string | null | undefined,
      item: { price: unknown; priceUsd?: unknown }
    ): Promise<{ price: number; priceUsd: number | null }> {
      if (!businessId) return { price: Number(item.price) || 0, priceUsd: null };
      const key = `${kind}:${businessId}`;
      if (!configs.has(key)) configs.set(key, getPricingConfig(kind, businessId));
      const cfg = await configs.get(key)!;
      const priced = priceForItem(item, cfg);
      if (priced.priceUsd !== null && cfg?.effectiveRate) pricer.rateUsed = cfg.effectiveRate;
      return priced;
    }
  };
  return pricer;
};

/**
 * يطبّق مدخل السعر بالدولار على بيانات حفظ صنف — للمتحكّمات القائمة.
 *
 * - نشاطٌ يسعّر بالدولار ويُرسَل `priceUsd`: يُخزَّن، و`price` يُحسب هنا
 *   ويتجاهل ما أرسلته الواجهة (هي تعرض معاينة فقط).
 * - يُرسَل `price` وحده (وضع الليرة، أو شاشةٌ لا تعرف الدولار): يُمسح
 *   `priceUsd` — وإلا عاد سعرٌ دولاريّ قديم يكتب فوق سعر الليرة الجديد.
 */
export const applyUsdPriceInput = async (
  kind: PricingKind,
  businessId: string,
  body: any,
  data: Record<string, any>
): Promise<{ error?: string }> => {
  if (!body || (body.priceUsd === undefined && body.price === undefined)) return {};
  const cfg = await getPricingConfig(kind, businessId);
  if (!cfg) return {};

  // سعرٌ بالليرة بلا سعر دولاري = قرارٌ صريح بالليرة لهذا الصنف (في أيّ وضع).
  // لو بقي `priceUsd` القديم لكتب فوقه عند أوّل إعادة تسعير، ولحسب الطلب
  // مبلغاً غير الذي يراه الزبون الآن.
  if (cfg.mode !== 'USD' || body.priceUsd === undefined) {
    if (body.price !== undefined) {
      data.priceUsd = null;
      data.originalPriceUsd = null;
    }
    return {};
  }

  const usd = positive(body.priceUsd);
  if (!usd) {
    // فراغٌ صريح = هذا الصنف يُسعَّر بالليرة استثناءً (خدمة محلية مثلاً)
    data.priceUsd = null;
    data.originalPriceUsd = null;
    return {};
  }
  if (!cfg.effectiveRate) {
    return { error: 'لا سعر صرف مضبوط بعد — اضبط سعرك الخاص من إعدادات التسعير أو انتظر سعر المنصّة.' };
  }

  data.priceUsd = usd;
  data.price = usdToSyp(usd, cfg.effectiveRate, cfg.roundingStep);

  if (body.originalPriceUsd !== undefined) {
    const before = positive(body.originalPriceUsd);
    // نفس قاعدة `originalPrice`: «قبل الخصم» غير الأعلى يُمسح
    data.originalPriceUsd = before && before > usd ? before : null;
    data.originalPrice = data.originalPriceUsd
      ? usdToSyp(data.originalPriceUsd, cfg.effectiveRate, cfg.roundingStep)
      : null;
  }
  return {};
};

// ==================== إعادة التسعير ====================

export interface RepriceSample {
  id: string;
  name: string;
  priceUsd: number;
  before: number;
  after: number;
}

export interface RepricePlan {
  rate: number | null;
  /** أصناف مسعّرة بالدولار */
  total: number;
  /** منها ما سيتغيّر سعره فعلاً */
  changed: number;
  samples: RepriceSample[];
  updates: Array<{ id: string; price: number; originalPrice: number | null }>;
}

const loadUsdItems = async (kind: PricingKind, businessId: string) => {
  const select = { id: true, name: true, price: true, originalPrice: true, priceUsd: true, originalPriceUsd: true };
  const where: any = { priceUsd: { not: null } };
  return kind === 'store'
    ? prisma.product.findMany({ where: { ...where, storeId: businessId }, select })
    : prisma.menuItem.findMany({ where: { ...where, restaurantId: businessId }, select });
};

/** معاينة بلا كتابة: كم سعراً سيتغيّر لو طُبّق هذا الإعداد */
export const planReprice = async (cfg: PricingConfig): Promise<RepricePlan> => {
  const plan: RepricePlan = { rate: cfg.effectiveRate, total: 0, changed: 0, samples: [], updates: [] };
  if (cfg.mode !== 'USD' || !cfg.effectiveRate) return plan;

  const items = await loadUsdItems(cfg.kind, cfg.businessId);
  plan.total = items.length;

  for (const item of items) {
    const usd = Number(item.priceUsd);
    const after = usdToSyp(usd, cfg.effectiveRate, cfg.roundingStep);
    const origUsd = positive(item.originalPriceUsd);
    const originalAfter = origUsd && origUsd > usd
      ? usdToSyp(origUsd, cfg.effectiveRate, cfg.roundingStep)
      : null;
    const before = Number(item.price) || 0;
    const originalBefore = item.originalPrice === null ? null : Number(item.originalPrice);

    if (after !== before || originalAfter !== originalBefore) {
      plan.changed += 1;
      plan.updates.push({ id: item.id, price: after, originalPrice: originalAfter });
      if (plan.samples.length < 5) {
        plan.samples.push({ id: item.id, name: item.name, priceUsd: usd, before, after });
      }
    }
  }
  return plan;
};

/**
 * يكتب الأسعار المحسوبة. دفعاتٌ صغيرة متتالية لا معاملةٌ واحدة ضخمة ولا
 * نداءات متوازية: قاعدة الإنتاج بسقف عشرة اتصالات، ومتجرٌ بألفي منتج
 * بالتوازي يخنقها ويُسقط الموقع كلّه.
 */
export const applyReprice = async (cfg: PricingConfig): Promise<RepricePlan> => {
  const plan = await planReprice(cfg);
  const delegate: any = cfg.kind === 'store' ? prisma.product : prisma.menuItem;
  const BATCH = 50;
  for (let i = 0; i < plan.updates.length; i += BATCH) {
    const slice = plan.updates.slice(i, i + BATCH);
    await prisma.$transaction(
      slice.map((u) => delegate.update({ where: { id: u.id }, data: { price: u.price, originalPrice: u.originalPrice } }))
    );
  }
  return plan;
};

/**
 * بعد تغيير سعر المنصّة: يُعاد تسعير كل نشاطٍ يعتمد عليه.
 * بالتتابع عمداً — راجع `applyReprice`.
 */
export const repriceAllOnPlatformRate = async (): Promise<{ businesses: number; changed: number }> => {
  const platformRate = await getUsdRate();
  const where = { pricingCurrency: 'USD', usdRateSource: 'platform' };
  const [stores, restaurants] = await Promise.all([
    prisma.store.findMany({ where, select: PRICING_SELECT }),
    prisma.restaurant.findMany({ where, select: PRICING_SELECT })
  ]);

  let changed = 0;
  for (const s of stores) changed += (await applyReprice(buildConfig('store', s, platformRate))).changed;
  for (const r of restaurants) changed += (await applyReprice(buildConfig('restaurant', r, platformRate))).changed;
  return { businesses: stores.length + restaurants.length, changed };
};

// ==================== تعديل الإعداد ====================

export interface PricingUpdateInput {
  mode?: unknown;
  rateSource?: unknown;
  customRate?: unknown;
  roundingStep?: unknown;
}

/**
 * يتحقّق من تعديل التاجر ويبني الإعداد الناتج **بلا حفظ** — للمعاينة وللحفظ
 * معاً، فما يراه التاجر في المعاينة هو بالضبط ما سيُطبَّق.
 */
export const buildUpdatedConfig = (
  current: PricingConfig,
  input: PricingUpdateInput
): { ok: boolean; error?: string; cfg?: PricingConfig } => {
  const next: PricingConfig = { ...current };

  if (input.mode !== undefined) {
    const mode = String(input.mode).toUpperCase();
    if (!(PRICING_CURRENCIES as readonly string[]).includes(mode)) {
      return { ok: false, error: 'عملة التسعير غير مدعومة. المتاح: الليرة أو الدولار.' };
    }
    next.mode = mode as PricingConfig['mode'];
  }

  if (input.rateSource !== undefined) {
    const src = String(input.rateSource);
    if (!(RATE_SOURCES as readonly string[]).includes(src)) {
      return { ok: false, error: 'مصدر سعر الصرف غير معروف.' };
    }
    next.rateSource = src as PricingConfig['rateSource'];
  }

  if (input.customRate !== undefined && input.customRate !== null && input.customRate !== '') {
    // نفس حاجز الخطأ المطبعي الذي يحمي سعر المنصّة
    const check = validateUsdRate(input.customRate);
    if (!check.ok) return { ok: false, error: check.error };
    next.customRate = check.rate!;
    next.customRateUpdatedAt = new Date();
  }

  if (input.roundingStep !== undefined) {
    const step = Number(input.roundingStep);
    if (!Number.isFinite(step) || step < 0 || step > MAX_ROUNDING_STEP) {
      return { ok: false, error: 'خطوة التقريب غير صالحة.' };
    }
    next.roundingStep = step;
  }

  if (next.rateSource === 'custom' && !next.customRate) {
    return { ok: false, error: 'أدخل سعر الصرف الخاص بك أولاً، أو اعتمد سعر المنصّة.' };
  }

  next.effectiveRate = businessUsdRate(
    { pricingCurrency: next.mode, usdRateSource: next.rateSource, customUsdRate: next.customRate },
    next.platformRate
  );

  if (next.mode === 'USD' && !next.effectiveRate) {
    return {
      ok: false,
      error: 'سعر المنصّة غير مضبوط بعد — أدخل سعرك الخاص لتسعّر بالدولار.'
    };
  }

  return { ok: true, cfg: next };
};

/** أصناف ما زالت بالليرة وحدها — تُعرض للتاجر قبل أن يحوّلها */
export const countSypOnlyItems = (kind: PricingKind, businessId: string): Promise<number> =>
  kind === 'store'
    ? prisma.product.count({ where: { storeId: businessId, priceUsd: null } })
    : prisma.menuItem.count({ where: { restaurantId: businessId, priceUsd: null } });

/**
 * «حوّل أسعاري الحالية»: يشتقّ `priceUsd` من سعر الليرة القائم بسعر الصرف.
 *
 * بلا هذا يفعّل التاجر الدولار ثم يكتشف أن عليه إدخال مئتي سعر يدوياً —
 * أي بالضبط العمل الذي جاء يتخلّص منه. الأصناف التي لها سعر دولاري لا تُمَسّ.
 */
export const seedUsdFromSyp = async (cfg: PricingConfig): Promise<number> => {
  if (!cfg.effectiveRate) return 0;
  const rate = cfg.effectiveRate;
  const where: any = cfg.kind === 'store'
    ? { storeId: cfg.businessId, priceUsd: null }
    : { restaurantId: cfg.businessId, priceUsd: null };
  const delegate: any = cfg.kind === 'store' ? prisma.product : prisma.menuItem;
  const rows: Array<{ id: string; price: number; originalPrice: number | null }> = await delegate.findMany({
    where,
    select: { id: true, price: true, originalPrice: true }
  });
  const toUsd = (syp: number) => Math.round((syp / rate) * 100) / 100;
  const updates = rows
    .filter((r) => Number(r.price) > 0)
    .map((r) => ({
      id: r.id,
      priceUsd: toUsd(Number(r.price)),
      originalPriceUsd: r.originalPrice && Number(r.originalPrice) > Number(r.price) ? toUsd(Number(r.originalPrice)) : null
    }));
  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    await prisma.$transaction(
      updates.slice(i, i + BATCH).map((u) =>
        delegate.update({ where: { id: u.id }, data: { priceUsd: u.priceUsd, originalPriceUsd: u.originalPriceUsd } })
      )
    );
  }
  return updates.length;
};

export const savePricingConfig = async (cfg: PricingConfig, options: { seedFromSyp?: boolean } = {}) => {
  const data: any = {
    pricingCurrency: cfg.mode,
    usdRateSource: cfg.rateSource,
    customUsdRate: cfg.customRate,
    priceRoundingStep: cfg.roundingStep
  };
  // «آخر تحديث» يتحرّك حين يُدخل التاجر سعراً — ولو كان نفسه، فالتأكيد
  // اليومي على السعر معلومةٌ بحدّ ذاتها للزبون وللتاجر
  if (cfg.customRateUpdatedAt) data.customUsdRateUpdatedAt = cfg.customRateUpdatedAt;

  if (cfg.kind === 'store') await prisma.store.update({ where: { id: cfg.businessId }, data });
  else await prisma.restaurant.update({ where: { id: cfg.businessId }, data });

  const seeded = options.seedFromSyp && cfg.mode === 'USD' ? await seedUsdFromSyp(cfg) : 0;
  const plan = await applyReprice(cfg);
  return { ...plan, seeded };
};

/** ما يُرسَل للوحة التاجر */
export const serializeConfig = (cfg: PricingConfig) => ({
  mode: cfg.mode,
  rateSource: cfg.rateSource,
  customRate: cfg.customRate,
  customRateUpdatedAt: cfg.customRateUpdatedAt,
  roundingStep: cfg.roundingStep,
  platformRate: cfg.platformRate,
  effectiveRate: cfg.effectiveRate,
  minRate: MIN_USD_RATE,
  maxRate: MAX_USD_RATE
});

export default {
  usdToSyp,
  priceForItem,
  getPricingConfig,
  createOrderPricer,
  applyUsdPriceInput,
  planReprice,
  applyReprice,
  repriceAllOnPlatformRate,
  buildUpdatedConfig,
  savePricingConfig,
  serializeConfig
};
