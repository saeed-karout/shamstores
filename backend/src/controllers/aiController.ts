// backend/src/controllers/aiController.ts
//
// «متجرك جاهز من صفحتك» ومساعد الوصف.
//
// **ثلاث خطوات لا خطوة:** تحليل كل صورة وحدها (`/import/extract`)، ثم مراجعة
// التاجر في الواجهة، ثم الإنشاء بضغطة (`/import/commit`). لا يُنشأ منتجٌ من
// ردّ النموذج مباشرةً أبداً: سعرٌ مقروءٌ خطأً يُباع به فعلاً.
//
// **وصورةٌ في كل طلب:** عشرون صورة في طلبٍ واحد تتجاوز مهلة هيروكو (٣٠ ثانية)
// وحدّ جسم JSON (١ ميغا) معاً، ويضيع كلّها بفشل واحدة. صورةٌ صورة تعطي
// التاجر تقدّماً يراه، وتُبقي ما نجح إن انقطع الاتصال في منتصفها.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import {
  isAiConfigured,
  extractProductsFromImage,
  writeProductCopy,
  parseDataUrl,
  parsePriceText,
  AiUnavailableError,
  AiRequestError,
  ExtractedProduct,
  PriceCurrency
} from '../services/ai.service';
import {
  AI_LIMITS,
  loadBusinessPlan,
  getImportQuota,
  getDescribeQuota,
  recordAiUsage,
  BusinessPlanInfo
} from '../services/aiQuota.service';
import { getPricingConfig, usdToSyp } from '../services/usdPricing.service';
import { getAppliedAt } from '../services/redenomination.service';
import { normalizeOptions } from '../services/productOptions.service';

/** حجم الصورة بعد فكّ base64 — الواجهة تصغّرها قبل الرفع إلى ~٤٠٠ ك.ب */
const MAX_IMPORT_IMAGE_BYTES = 750 * 1024;
const MAX_DESCRIBE_IMAGE_BYTES = 300 * 1024;
/** منتجاتٌ في دفعة إنشاءٍ واحدة — عشرون صورة × بضعة منتجات */
const MAX_COMMIT_ITEMS = 80;

// ==================== أدوات ====================

/** النشاط الأساسي للمستخدم — الحصّة تُحسب عليه لا على الفرع */
const resolveBusiness = async (req: AuthRequest, res: Response): Promise<BusinessPlanInfo | null> => {
  const user = req.user;
  const type = user?.restaurantId ? 'restaurant' : user?.storeId ? 'store' : null;
  const id = user?.restaurantId || user?.storeId;
  if (!type || !id) {
    res.status(403).json({ success: false, error: 'المساعد الذكي متاحٌ لأصحاب المطاعم والمتاجر' });
    return null;
  }
  const business = await loadBusinessPlan(type, id);
  if (!business) {
    res.status(404).json({ success: false, error: 'النشاط غير موجود' });
    return null;
  }
  return business;
};

const sendAiError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof AiUnavailableError) {
    res.status(503).json({ success: false, error: error.message, code: 'ai_unavailable' });
    return;
  }
  if (error instanceof AiRequestError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
};

const unavailable = (res: Response) =>
  res.status(503).json({
    success: false,
    error: 'المساعد الذكي غير مفعّل على المنصّة حالياً',
    code: 'ai_unavailable'
  });

const quotaMessage = (period: 'lifetime' | 'day', limit: number) =>
  period === 'lifetime'
    ? `استهلكت الصور المجانية (${limit} صورة). رقِّ خطتك لتستورد ${AI_LIMITS.importPaidDaily} صورة يومياً.`
    : `بلغت حدّ اليوم (${limit}). يتجدّد غداً.`;

const text = (value: unknown, max: number): string =>
  String(value ?? '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);

const clamp = (n: unknown, min: number, max: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;
};

// ==================== الحالة ====================

/**
 * GET /api/ai/status — هل تظهر أزرار المساعد، وكم بقي.
 *
 * يُرجع 200 دائماً ولو كان المفتاح غائباً: الواجهة تسأل لتقرّر ما تعرضه،
 * و503 هنا كانت ستُطلق رسالة خطأ في وجه كل تاجر يفتح صفحة منتجاته.
 */
export const getAiStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const configured = isAiConfigured();
    const business = await resolveBusiness(req, res);
    if (!business) return;

    const [importQuota, describeQuota] = await Promise.all([
      getImportQuota(business),
      getDescribeQuota(business)
    ]);

    res.json({
      success: true,
      data: {
        configured,
        businessType: business.type,
        isPaid: business.isPaid,
        import: importQuota,
        describe: describeQuota,
        limits: AI_LIMITS
      }
    });
  } catch (error) {
    console.error('getAiStatus failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر قراءة حالة المساعد' });
  }
};

// ==================== الاستيراد: التحليل ====================

export interface ImportDraft {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  /** بالليرة — محوَّلٌ من الدولار إن لزم ومتى وُجد سعر صرف */
  price: number | null;
  /** السعر الدولاري كما في المنشور، حين كُتب بالدولار */
  priceUsd: number | null;
  originalPrice: number | null;
  currency: PriceCurrency;
  priceText: string;
  category: string;
  options: { name: string; values: string[] }[];
  box: { x: number; y: number; w: number; h: number } | null;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

/**
 * يحوّل ما قرأه النموذج إلى مسوّدةٍ بأسعار المنصّة.
 *
 * التحذيرات تُكتب هنا لا في النموذج: هي قواعدنا نحن (الليرة الجديدة، سعر
 * الصرف) لا ما يراه في الصورة.
 */
const toDraft = (
  raw: ExtractedProduct,
  ctx: { rate: number | null; step: number; redenominated: boolean }
): ImportDraft => {
  const warnings: string[] = [];

  const ours = parsePriceText(raw.priceText);
  let amount = ours.amount ?? (Number(raw.price) > 0 ? Number(raw.price) : null);
  let currency: PriceCurrency = ours.currency !== 'unknown' ? ours.currency : raw.currency || 'unknown';
  if (ours.amount && raw.price && Math.abs(ours.amount - raw.price) > 0.01) {
    // قراءتنا للنصّ الحرفيّ أوثق من حساب النموذج — لكن التاجر يجب أن يعرف
    warnings.push(`تحقّق من السعر: المكتوب «${raw.priceText}»`);
  }

  // رقمٌ بلا عملة: دون المئة غالباً دولار، وما فوقه ليرة — وفي الحالتين يُنبَّه
  if (amount && currency === 'unknown') {
    currency = amount < 100 ? 'USD' : 'SYP';
    warnings.push(currency === 'USD' ? 'لم تُذكر العملة — افترضناها دولاراً' : 'لم تُذكر العملة — افترضناها ليرة');
  }

  let price: number | null = null;
  let priceUsd: number | null = null;
  if (amount && currency === 'USD') {
    priceUsd = amount;
    if (ctx.rate) price = usdToSyp(amount, ctx.rate, ctx.step);
    else warnings.push('السعر بالدولار ولا سعر صرف مضبوط — أدخل السعر بالليرة');
  } else if (amount) {
    price = Math.round(amount);
    // بعد حذف الصفرين: منشورٌ قديم بـ«٧٥٠ ألف» صار ٧٬٥٠٠ — لا نقسم بصمت،
    // بل ننبّه ويقرّر التاجر بضغطة
    const usdEquivalent = ctx.rate ? price / ctx.rate : null;
    if (ctx.redenominated && (usdEquivalent ? usdEquivalent > 3000 : price >= 1_000_000)) {
      warnings.push('السعر كبير — ربّما بالليرة القديمة (قبل حذف الصفرين)');
    }
  }
  if (!amount) warnings.push('لا سعر في المنشور — أدخله قبل الحفظ');

  const original = parsePriceText(raw.originalPriceText);
  let originalPrice: number | null = null;
  if (original.amount) {
    const origCurrency = original.currency !== 'unknown' ? original.currency : currency;
    originalPrice =
      origCurrency === 'USD' ? (ctx.rate ? usdToSyp(original.amount, ctx.rate, ctx.step) : null) : Math.round(original.amount);
    if (originalPrice && price && originalPrice <= price) originalPrice = null;
  }

  if (raw.confidence === 'low' && raw.note) warnings.push(text(raw.note, 160));

  const box = raw.box && raw.box.w > 20 && raw.box.h > 20
    ? {
        x: clamp(raw.box.x, 0, 1000),
        y: clamp(raw.box.y, 0, 1000),
        w: clamp(raw.box.w, 0, 1000),
        h: clamp(raw.box.h, 0, 1000)
      }
    : null;

  return {
    name: text(raw.name, 150),
    nameEn: text(raw.nameEn, 150),
    description: text(raw.description, 1000),
    descriptionEn: text(raw.descriptionEn, 1000),
    price,
    priceUsd,
    originalPrice,
    currency,
    priceText: text(raw.priceText, 80),
    category: text(raw.category, 60),
    options: (raw.options || [])
      .map((o) => ({ name: text(o.name, 40), values: (o.values || []).map((v) => text(v, 40)).filter(Boolean).slice(0, 30) }))
      .filter((o) => o.name && o.values.length)
      .slice(0, 6),
    box,
    confidence: raw.confidence || 'medium',
    warnings
  };
};

/** POST /api/ai/import/extract — { image: dataURL, caption? } */
export const extractImport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAiConfigured()) {
      unavailable(res);
      return;
    }
    const business = await resolveBusiness(req, res);
    if (!business) return;

    const image = parseDataUrl(req.body?.image, MAX_IMPORT_IMAGE_BYTES);
    if (!image) {
      res.status(400).json({ success: false, error: 'الصورة غير صالحة أو أكبر من المسموح' });
      return;
    }

    const quota = await getImportQuota(business);
    if (!quota.allowed) {
      res.status(429).json({
        success: false,
        error: quotaMessage(quota.period, quota.limit),
        code: 'ai_quota',
        data: { quota }
      });
      return;
    }

    const [categories, pricing, appliedAt] = await Promise.all([
      prisma.category.findMany({
        where: business.type === 'restaurant' ? { restaurantId: business.id } : { storeId: business.id },
        select: { name: true },
        take: 100
      }),
      getPricingConfig(business.type, business.id),
      getAppliedAt()
    ]);

    const { products, usage } = await extractProductsFromImage({
      image,
      caption: typeof req.body?.caption === 'string' ? req.body.caption : '',
      kind: business.type,
      categories: categories.map((c) => c.name)
    });

    await recordAiUsage(business, 'import', 1, { userId: req.user?.id, ...usage });

    const ctx = {
      rate: pricing?.effectiveRate ?? pricing?.platformRate ?? null,
      step: pricing?.roundingStep ?? 0,
      redenominated: !!appliedAt
    };
    const drafts = products.map((p) => toDraft(p, ctx)).filter((d) => d.name);

    res.json({
      success: true,
      data: {
        drafts,
        quota: { ...quota, used: quota.used + 1, remaining: Math.max(0, quota.remaining - 1) }
      }
    });
  } catch (error) {
    sendAiError(res, error, 'تعذّر تحليل الصورة');
  }
};

// ==================== الاستيراد: الإنشاء ====================

interface CommitItem {
  name?: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price?: number | string;
  priceUsd?: number | string | null;
  originalPrice?: number | string | null;
  category?: string;
  options?: { name: string; values: string[] }[];
  imageUrl?: string | null;
}

/** «خيارات» الاستيراد نصوصٌ بلا أسعار ← شكل productOptions المعتمد */
const toOptionGroups = (options: CommitItem['options']) =>
  normalizeOptions(
    (Array.isArray(options) ? options : []).map((o) => ({
      name: o?.name,
      type: 'single',
      // المقاس واللون يُختاران قبل الطلب؛ غيرهما اختياريّ حتى يقرّر التاجر
      required: /مقاس|قياس|لون|size|colou?r/i.test(String(o?.name || '')),
      values: (Array.isArray(o?.values) ? o.values : []).map((label) => ({ label, priceDelta: 0 }))
    }))
  );

const positive = (value: unknown): number | null => {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** رابط صورةٍ رفعناها نحن — لا يُقبل رابطٌ خارجيّ يُحقن في واجهة الزبون */
const safeImageUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url || url.length > 1000) return null;
  if (url.startsWith('/') || /^https:\/\//i.test(url)) return url;
  return null;
};

/** رمز SKU فريدٌ داخل المتجر — المنتج يحتاجه والمنشور لا يحمله */
const makeSku = (index: number) =>
  `AI-${Date.now().toString(36).toUpperCase()}-${index + 1}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/**
 * POST /api/ai/import/commit — { items: CommitItem[], branchId? }
 *
 * ما يصل هنا هو ما راجعه التاجر وعدّله، لا ردّ النموذج.
 */
export const commitImport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await resolveBusiness(req, res);
    if (!business) return;

    const items: CommitItem[] = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      res.status(400).json({ success: false, error: 'لا منتجات للإضافة' });
      return;
    }
    if (items.length > MAX_COMMIT_ITEMS) {
      res.status(400).json({ success: false, error: `الحدّ ${MAX_COMMIT_ITEMS} منتجاً في الدفعة الواحدة` });
      return;
    }

    // فرعٌ يملكه التاجر نفسه، وإلا فالنشاط الأساسي
    let targetId = business.id;
    const branchId = typeof req.body?.branchId === 'string' ? req.body.branchId : '';
    if (branchId && branchId !== business.id && req.user?.id) {
      const owned =
        business.type === 'restaurant'
          ? await prisma.restaurant.findFirst({ where: { id: branchId, userId: req.user.id }, select: { id: true } })
          : await prisma.store.findFirst({ where: { id: branchId, userId: req.user.id }, select: { id: true } });
      if (!owned) {
        res.status(403).json({ success: false, error: 'لا تملك هذا الفرع' });
        return;
      }
      targetId = owned.id;
    }

    // حدّ الخطة: ما يُضاف لا يتجاوز الباقي — ويُبلَّغ بما تُرك بدل رفض الدفعة كلّها
    const current =
      business.type === 'restaurant'
        ? await prisma.menuItem.count({ where: { restaurantId: targetId } })
        : await prisma.product.count({ where: { storeId: targetId } });
    const room = business.maxItems ? Math.max(0, business.maxItems - current) : Infinity;

    const pricing = await getPricingConfig(business.type, targetId);
    const rate = pricing?.effectiveRate ?? null;

    const errors: { index: number; name: string; message: string }[] = [];
    type Ready = { index: number; item: CommitItem; name: string; price: number; priceUsd: number | null; originalPrice: number | null };
    const ready: Ready[] = [];

    items.forEach((item, index) => {
      const name = text(item?.name, 150);
      if (!name) {
        errors.push({ index, name: '', message: 'بلا اسم' });
        return;
      }
      const priceUsd = positive(item.priceUsd);
      let price = positive(item.price);
      // نشاطٌ يسعّر بالدولار: الليرة تُشتقّ من سعر اليوم لا ممّا حُسب عند التحليل
      if (priceUsd && pricing?.mode === 'USD' && rate) price = usdToSyp(priceUsd, rate, pricing.roundingStep);
      if (!price) {
        errors.push({ index, name, message: 'بلا سعر' });
        return;
      }
      const original = positive(item.originalPrice);
      ready.push({
        index,
        item,
        name,
        price,
        priceUsd: priceUsd && pricing?.mode === 'USD' ? Math.round(priceUsd * 100) / 100 : null,
        originalPrice: original && original > price ? original : null
      });
    });

    const accepted = ready.slice(0, room === Infinity ? ready.length : room);
    ready.slice(accepted.length).forEach((r) =>
      errors.push({ index: r.index, name: r.name, message: `تجاوز حدّ خطتك (${business.maxItems})` })
    );

    // الفئات بالاسم: تُطابَق، والغائبة تُنشأ مرّة — الأصناف تحتاج فئة في المطعم
    const where = business.type === 'restaurant' ? { restaurantId: targetId } : { storeId: targetId };
    const existing = await prisma.category.findMany({ where, select: { id: true, name: true } });
    const byName = new Map(existing.map((c) => [c.name.trim().toLowerCase(), c.id]));
    const fallbackName = business.type === 'restaurant' ? 'أصناف جديدة' : '';
    const newCategories: string[] = [];

    const categoryIdFor = async (raw: string | undefined): Promise<string | null> => {
      const name = text(raw, 60) || fallbackName;
      if (!name) return null;
      const key = name.toLowerCase();
      const found = byName.get(key);
      if (found) return found;
      const created = await prisma.category.create({ data: { ...where, name } });
      byName.set(key, created.id);
      newCategories.push(name);
      return created.id;
    };

    const created: { id: string; name: string }[] = [];
    for (const r of accepted) {
      const { item } = r;
      try {
        const categoryId = await categoryIdFor(item.category);
        const image = safeImageUrl(item.imageUrl);
        const common = {
          name: r.name,
          nameEn: text(item.nameEn, 150) || null,
          description: text(item.description, 1500) || null,
          descriptionEn: text(item.descriptionEn, 1500) || null,
          price: r.price,
          originalPrice: r.originalPrice,
          priceUsd: r.priceUsd,
          options: toOptionGroups(item.options) as any,
          images: image ? [image] : [],
          categoryId
        };

        if (business.type === 'restaurant') {
          const row = await prisma.menuItem.create({
            data: { ...common, restaurantId: targetId, image, isAvailable: true },
            select: { id: true, name: true }
          });
          created.push(row);
        } else {
          const row = await prisma.product.create({
            data: { ...common, storeId: targetId, imageUrl: image, sku: makeSku(r.index), stock: 0, unit: 'piece', isAvailable: true },
            select: { id: true, name: true }
          });
          created.push(row);
        }
      } catch (error) {
        console.error('commitImport item failed:', error);
        errors.push({ index: r.index, name: r.name, message: 'تعذّر الحفظ' });
      }
    }

    res.status(created.length ? 201 : 400).json({
      success: created.length > 0,
      ...(created.length ? {} : { error: errors[0]?.message ? `لم يُضف شيء: ${errors[0].message}` : 'لم يُضف شيء' }),
      message: `أُضيف ${created.length}`,
      data: { created: created.length, items: created, newCategories, errors }
    });
  } catch (error) {
    console.error('commitImport failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر إضافة المنتجات' });
  }
};

// ==================== كاتب الوصف ====================

/** POST /api/ai/describe — { name, price?, category?, notes?, image?: dataURL } */
export const describeProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAiConfigured()) {
      unavailable(res);
      return;
    }
    const business = await resolveBusiness(req, res);
    if (!business) return;

    const name = text(req.body?.name, 150);
    if (!name) {
      res.status(400).json({ success: false, error: 'اكتب اسم المنتج أوّلاً' });
      return;
    }

    const quota = await getDescribeQuota(business);
    if (!quota.allowed) {
      const planBlocked = quota.reason === 'plan';
      res.status(planBlocked ? 403 : 429).json({
        success: false,
        error: planBlocked
          ? 'كتابة الوصف بالذكاء الاصطناعي ضمن الخطط المدفوعة'
          : quotaMessage('day', quota.limit),
        code: planBlocked ? 'ai_plan' : 'ai_quota',
        requiresUpgrade: planBlocked,
        data: { quota }
      });
      return;
    }

    // صورةٌ صغيرة اختيارية — تكفي لقراءة اللون والشكل، والكبيرة كلفةٌ بلا فائدة
    const image = req.body?.image ? parseDataUrl(req.body.image, MAX_DESCRIBE_IMAGE_BYTES) : null;

    const { copy, usage } = await writeProductCopy({
      name,
      price: positive(req.body?.price),
      category: text(req.body?.category, 60) || null,
      notes: text(req.body?.notes, 1500) || null,
      businessName: business.name,
      kind: business.type,
      image
    });

    await recordAiUsage(business, 'describe', 1, { userId: req.user?.id, ...usage });

    res.json({
      success: true,
      data: { ...copy, quota: { ...quota, used: quota.used + 1, remaining: Math.max(0, quota.remaining - 1) } }
    });
  } catch (error) {
    sendAiError(res, error, 'تعذّر كتابة الوصف');
  }
};

export default { getAiStatus, extractImport, commitImport, describeProduct };
