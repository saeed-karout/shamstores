// backend/src/services/ai.service.ts
//
// مساعد الذكاء الاصطناعي للتاجر — استدعاءات Claude وحدها، بلا Express ولا حصص.
//
// **لماذا لا نسحب من إنستغرام وفيسبوك مباشرة:** شروط الخدمة تمنع السحب،
// والمحتوى خلف تسجيل الدخول أصلاً. والتاجر يملك منشوراته على هاتفه: لقطة
// شاشة ونسخ النصّ أسرع له من ربط حساب — ولا تُسقطها سياسة منصّةٍ أخرى غداً.
//
// **والنموذج يقترح ولا يكتب:** كل ما يعود من هنا مسوّدة تُعرض على التاجر
// ليصحّحها. الذكاء الاصطناعي يخطئ في سعرٍ مكتوب بخطّ اليد أو في «ألف»
// ملتصقة بالرقم، والخطأ في السعر مالٌ يخسره التاجر أو زبونٌ يُخدع.
//
// المفتاح من `ANTHROPIC_API_KEY`. غيابه ليس عطلاً: الميزة تختفي من الواجهة
// (`isAiConfigured`) بدل أن تظهر زرّاً يفشل عند أوّل ضغطة.

import Anthropic from '@anthropic-ai/sdk';

/** النموذج — Sonnet يكفي للقراءة والكتابة القصيرة بكلفةٍ تحتملها حصّة مجانية */
export const AI_MODEL = 'claude-sonnet-5';

/**
 * مهلة الاستدعاء. هيروكو يقطع أيّ طلبٍ لا يردّ خلال ثلاثين ثانية، فمهلةٌ
 * أطول تعني أن التاجر يرى «خطأ في الخادم» بدل رسالتنا الواضحة.
 */
const REQUEST_TIMEOUT_MS = 26_000;

let client: Anthropic | null = null;

export const isAiConfigured = (): boolean => !!process.env.ANTHROPIC_API_KEY?.trim();

const getClient = (): Anthropic => {
  if (!isAiConfigured()) throw new AiUnavailableError();
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!.trim(),
      timeout: REQUEST_TIMEOUT_MS,
      // بلا إعادةٍ هنا: محاولتان بمهلةٍ كاملة تتجاوزان الثلاثين ثانية حتماً،
      // والفاشلة لا تُحتسب من الحصّة فيعيد التاجر رفعها وحدها
      maxRetries: 0
    });
  }
  return client;
};

/** المفتاح غير مضبوط — الردّ 503 لا 500 */
export class AiUnavailableError extends Error {
  constructor() {
    super('المساعد الذكي غير مفعّل على المنصّة حالياً');
    this.name = 'AiUnavailableError';
  }
}

/** فشلٌ يُعرض للتاجر كما هو — رسالته عربية جاهزة */
export class AiRequestError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
    this.name = 'AiRequestError';
  }
}

export type AiBusinessKind = 'restaurant' | 'store';

export interface AiImage {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** base64 بلا بادئة data: */
  data: string;
}

export interface AiUsageTokens {
  inputTokens: number;
  outputTokens: number;
}

// ==================== الأسعار ====================

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** أرقامٌ هندية وفارسية وفواصل عربية ← أرقام لاتينية ونقطة عشرية */
export const toLatinDigits = (value: string): string =>
  value
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/[٬،]/g, ',');

export type PriceCurrency = 'SYP' | 'USD' | 'unknown';

/**
 * يقرأ سعراً كما يكتبه التاجر السوري في منشوره.
 *
 * «٧٥ ألف» و«75k» و«150,000 ل.س» و«$12.5» و«١٢ دولار» — كلّها صيغٌ حقيقية.
 * يُحسب هنا لا في النموذج وحده: النموذج يقرأ النصّ جيّداً ويحسب «ألف»
 * أحياناً مرّتين. فنقرأ النصّ الحرفيّ الذي نقله بأنفسنا، ونرجع إلى رقمه
 * هو فقط حين لا نفهم الصيغة.
 */
export const parsePriceText = (raw: string): { amount: number | null; currency: PriceCurrency } => {
  const text = toLatinDigits(String(raw || '')).toLowerCase().trim();
  if (!text) return { amount: null, currency: 'unknown' };

  let currency: PriceCurrency = 'unknown';
  if (/\$|usd|دولار|دولارات|﹩|＄/.test(text)) currency = 'USD';
  // «ل.س» بفاصلٍ إلزامي وخارج الكلمات: «السعر» نفسها فيها «لس» متلاصقتين
  else if (/(?<![؀-ۿ])ل\s*[.\s]\s*س(?![؀-ۿ])|ليرة|ليرات|syp|\bs\.?p\b/.test(text)) currency = 'SYP';

  // أوّل رقمٍ في النصّ — «بدل 90 صار 75» يُقرأ أوّله، والنموذج يفصل
  // السعر القديم في حقله الخاص فلا يصل هنا إلا السعر الحالي عادةً
  const match = text.match(/\d+(?:[.,]\d+)*/);
  if (!match) return { amount: null, currency };

  let token = match[0];
  // الفاصلة ألفية إن تبعتها ثلاث خانات بالضبط (150,000)، وإلا فهي عشرية (12,5)
  if (/,\d{3}(?!\d)/.test(token)) token = token.replace(/,/g, '');
  else token = token.replace(/,/g, '.');
  // نقاطٌ ألفية على الطريقة الأوروبية (150.000.000)
  if ((token.match(/\./g) || []).length > 1) token = token.replace(/\./g, '');

  let amount = Number(token);
  if (!Number.isFinite(amount) || amount <= 0) return { amount: null, currency };

  const after = text.slice((match.index || 0) + match[0].length);
  if (/^\s*(مليون|m\b)/.test(after)) amount *= 1_000_000;
  else if (/^\s*(ألف|الف|آلاف|الاف|k\b)/.test(after)) amount *= 1_000;

  return { amount: Math.round(amount * 100) / 100, currency };
};

// ==================== المخطّطات ====================

/**
 * شكل ما يعيده النموذج من صورة منشور.
 *
 * لا حقول null: «صفر» للسعر المجهول و«عرضٌ صفر» للإطار الغائب. المخطّط
 * الأبسط يُترجَم مرّةً ويُخزَّن، والفراغ هنا يعني الشيء نفسه.
 */
const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          nameEn: { type: 'string' },
          description: { type: 'string' },
          descriptionEn: { type: 'string' },
          priceText: { type: 'string' },
          price: { type: 'number' },
          currency: { type: 'string', enum: ['SYP', 'USD', 'unknown'] },
          originalPriceText: { type: 'string' },
          category: { type: 'string' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                values: { type: 'array', items: { type: 'string' } }
              },
              required: ['name', 'values'],
              additionalProperties: false
            }
          },
          box: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              w: { type: 'number' },
              h: { type: 'number' }
            },
            required: ['x', 'y', 'w', 'h'],
            additionalProperties: false
          },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          note: { type: 'string' }
        },
        required: [
          'name',
          'nameEn',
          'description',
          'descriptionEn',
          'priceText',
          'price',
          'currency',
          'originalPriceText',
          'category',
          'options',
          'box',
          'confidence',
          'note'
        ],
        additionalProperties: false
      }
    }
  },
  required: ['products'],
  additionalProperties: false
} as const;

const COPY_SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string' },
    descriptionEn: { type: 'string' },
    seoTitle: { type: 'string' },
    nameEn: { type: 'string' }
  },
  required: ['description', 'descriptionEn', 'seoTitle', 'nameEn'],
  additionalProperties: false
} as const;

// ==================== التعليمات ====================

const EXTRACT_SYSTEM = `You read screenshots of Instagram/Facebook posts and product photos sent by a small Syrian merchant, and extract the products they sell so the merchant can review them before adding them to their online store.

Rules:
- One entry per distinct product offered for sale. A post showing one item in several photos or colours is ONE product with a colour option. Return an empty list if nothing is for sale.
- Ignore app chrome: usernames, likes, comment counts, buttons, follower counts, timestamps. A comment reply from the merchant stating a price counts as the price.
- name: short product name in Arabic as a Syrian shopper would search for it (keep brand/model names in Latin letters). nameEn: natural English name.
- priceText: copy the price exactly as written in the image or caption (e.g. "٧٥ ألف", "150,000 ل.س", "$12"). Empty string if no price is visible — never guess a price.
- price: the numeric value of priceText with "ألف"/"k" = ×1000 and "مليون" = ×1,000,000, Arabic-Indic digits converted. 0 if no price.
- currency: "USD" for $/دولار, "SYP" for ل.س/ليرة or bare numbers in the thousands, otherwise "unknown".
- originalPriceText: an old/crossed-out price ("بدل", "كان", strike-through) copied as written, else "".
- description / descriptionEn: 1–2 plain sentences using ONLY what is visible or stated (material, size, flavour, contents). No invented claims, no emojis, no hashtags, no phone numbers.
- category: a short Arabic category name. Reuse one of the merchant's existing categories when it fits.
- options: only choices explicitly shown or written (sizes, colours, flavours, weights). Option names in Arabic (المقاس، اللون…); values as written.
- box: the tight rectangle around this product's photo inside the image, in coordinates normalised to 0–1000 (x,y = top-left corner, w,h = size). Exclude UI and text overlays where possible. Use w=0,h=0 if the product is not pictured.
- confidence: "low" when the price or name is unclear; say why in note (Arabic, short). note is "" otherwise.
- At most 10 products per image.`;

const COPY_SYSTEM = `You write short product copy for a small Syrian merchant's online store.

Write:
- description: Arabic (natural Levantine-friendly Modern Standard Arabic), 2–3 short sentences, warm and concrete, that help a shopper decide. Use only facts from the name, category, price and photo — do not invent materials, origin, sizes, health claims or guarantees. No emojis, hashtags, prices or phone numbers.
- descriptionEn: the same content in natural English.
- seoTitle: an Arabic page title under 60 characters: product name plus the most useful descriptive word(s), then " | " and the business name if given.
- nameEn: a natural English product name (keep brand names as-is).`;

// ==================== الاستدعاء ====================

const readJson = <T>(response: Anthropic.Message): T => {
  if (response.stop_reason === 'refusal') {
    throw new AiRequestError('تعذّر على المساعد قراءة هذا المحتوى. جرّب صورةً أخرى.', 422);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AiRequestError('الصورة تحوي منتجاتٍ كثيرة — قصّها إلى أجزاء وأعد المحاولة.', 422);
  }
  const block = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!block) throw new AiRequestError('لم يُرجع المساعد نتيجة. أعد المحاولة.');
  try {
    return JSON.parse(block.text) as T;
  } catch {
    throw new AiRequestError('نتيجة المساعد غير مفهومة. أعد المحاولة.');
  }
};

/** يحوّل أخطاء الحزمة إلى رسالةٍ يفهمها التاجر، ويسجّل التفاصيل للمطوّر */
const translateError = (error: unknown): never => {
  if (error instanceof AiRequestError || error instanceof AiUnavailableError) throw error;
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    throw new AiRequestError('استغرق المساعد وقتاً أطول من المعتاد. أعد المحاولة بصورةٍ أصغر.', 504);
  }
  if (error instanceof Anthropic.RateLimitError) {
    throw new AiRequestError('المساعد مشغول الآن. انتظر دقيقة وأعد المحاولة.', 429);
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error('[ai] مفتاح ANTHROPIC_API_KEY مرفوض:', (error as Error).message);
    throw new AiUnavailableError();
  }
  if (error instanceof Anthropic.BadRequestError) {
    console.error('[ai] طلبٌ مرفوض:', error.message);
    throw new AiRequestError('تعذّر قراءة الصورة. جرّب صورةً أوضح بصيغة JPG أو PNG.', 422);
  }
  if (error instanceof Anthropic.APIError) {
    console.error('[ai] خطأ من الخدمة:', error.status, error.message);
    throw new AiRequestError('خدمة المساعد لا تستجيب الآن. أعد المحاولة بعد قليل.');
  }
  console.error('[ai] خطأ غير متوقّع:', error);
  throw new AiRequestError('حدث خطأ غير متوقّع في المساعد.', 500);
};

const usageOf = (response: Anthropic.Message): AiUsageTokens => ({
  inputTokens: response.usage?.input_tokens ?? 0,
  outputTokens: response.usage?.output_tokens ?? 0
});

// ==================== استخراج المنتجات ====================

export interface ExtractedOption {
  name: string;
  values: string[];
}

export interface ExtractedProduct {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  priceText: string;
  price: number;
  currency: PriceCurrency;
  originalPriceText: string;
  category: string;
  options: ExtractedOption[];
  box: { x: number; y: number; w: number; h: number };
  confidence: 'high' | 'medium' | 'low';
  note: string;
}

export const extractProductsFromImage = async (input: {
  image: AiImage;
  caption?: string;
  kind: AiBusinessKind;
  categories: string[];
}): Promise<{ products: ExtractedProduct[]; usage: AiUsageTokens }> => {
  const anthropic = getClient();

  const context = [
    input.kind === 'restaurant'
      ? 'The business is a restaurant/café: products are dishes and drinks on its menu.'
      : 'The business is a shop: products are goods for sale.',
    input.categories.length
      ? `Existing categories: ${input.categories.slice(0, 60).join('، ')}`
      : 'The merchant has no categories yet.',
    input.caption?.trim()
      ? `Caption pasted by the merchant for this post:\n"""\n${input.caption.trim().slice(0, 4000)}\n"""`
      : 'No caption was pasted; read any text in the image itself.'
  ].join('\n\n');

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 8000,
      system: EXTRACT_SYSTEM,
      // جهدٌ منخفض: القراءة لا تحتاج تفكيراً طويلاً، ومهلة هيروكو لا تنتظر
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: EXTRACT_SCHEMA as any }
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: input.image.mediaType, data: input.image.data } },
            { type: 'text', text: context }
          ]
        }
      ]
    });

    const parsed = readJson<{ products: ExtractedProduct[] }>(response);
    return { products: Array.isArray(parsed.products) ? parsed.products.slice(0, 10) : [], usage: usageOf(response) };
  } catch (error) {
    return translateError(error);
  }
};

// ==================== كتابة الوصف ====================

export interface ProductCopy {
  description: string;
  descriptionEn: string;
  seoTitle: string;
  nameEn: string;
}

export const writeProductCopy = async (input: {
  name: string;
  price?: number | null;
  category?: string | null;
  businessName?: string | null;
  kind: AiBusinessKind;
  notes?: string | null;
  image?: AiImage | null;
}): Promise<{ copy: ProductCopy; usage: AiUsageTokens }> => {
  const anthropic = getClient();

  const facts = [
    `Business type: ${input.kind === 'restaurant' ? 'restaurant/café (menu item)' : 'shop (product)'}`,
    input.businessName ? `Business name: ${input.businessName}` : null,
    `Product name: ${input.name}`,
    input.category ? `Category: ${input.category}` : null,
    input.price ? `Price: ${input.price} SYP (do not mention it)` : null,
    input.notes?.trim() ? `Merchant's notes / current description: ${input.notes.trim().slice(0, 1500)}` : null,
    input.image ? 'A photo of the product is attached.' : 'No photo is attached.'
  ]
    .filter(Boolean)
    .join('\n');

  const content: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: input.image.mediaType, data: input.image.data }
    });
  }
  content.push({ type: 'text', text: facts });

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      system: COPY_SYSTEM,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: COPY_SCHEMA as any }
      },
      messages: [{ role: 'user', content }]
    });

    const copy = readJson<ProductCopy>(response);
    const clean = (v: unknown, max: number) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);
    return {
      copy: {
        description: clean(copy.description, 1200),
        descriptionEn: clean(copy.descriptionEn, 1200),
        seoTitle: clean(copy.seoTitle, 90),
        nameEn: clean(copy.nameEn, 120)
      },
      usage: usageOf(response)
    };
  } catch (error) {
    return translateError(error);
  }
};

/** يفكّ `data:image/...;base64,...` ويتحقّق من نوعه وحجمه */
export const parseDataUrl = (value: unknown, maxBytes: number): AiImage | null => {
  if (typeof value !== 'string') return null;
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const data = match[2];
  // طول base64 × ¾ ≈ حجم الملفّ — يكفي حارساً بلا فكّ الترميز
  if (Math.floor((data.length * 3) / 4) > maxBytes) return null;
  const mediaType = (match[1] === 'image/jpg' ? 'image/jpeg' : match[1]) as AiImage['mediaType'];
  return { mediaType, data };
};

export default {
  AI_MODEL,
  isAiConfigured,
  parsePriceText,
  toLatinDigits,
  extractProductsFromImage,
  writeProductCopy,
  parseDataUrl
};
