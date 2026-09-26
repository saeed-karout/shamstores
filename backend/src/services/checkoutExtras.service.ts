// backend/src/services/checkoutExtras.service.ts
//
// إضافات إتمام الطلب — أربع ميزات تشترك في أنها **حول** الطلب لا في صلبه:
//
//   1. خطوة واتساب بعد الطلب (مجانية): روابط `wa.me` فقط — لا API مدفوع. الخادم
//      لا يرسل شيئاً؛ يحفظ إعداد التاجر ويكشفه للواجهة.
//   2. «معاينة قبل الدفع» (مجانية): لقطةٌ على الطلب يقرؤها السائق والتاجر.
//   3. «اشترِ لأهلك» (مدفوعة): الدافع خارج سوريا والمستلم داخلها. **لا بوابة دفع**
//      — المالك أجّل طرق الدفع. الطلب يُنشأ «بانتظار التحويل»، ويرى الدافع
//      تعليمات التاجر الحرّة، ثم يؤكّد التاجر الاستلام يدوياً.
//   4. العربون والأقساط (مدفوعة): عربونٌ لكل منتج يحسبه الخادم، وجدول أقساط
//      يضعه التاجر للطلب ويعلّم كل قسطٍ مدفوعاً.
//
// **لماذا ملفٌّ واحد مستقلّ:** `createOrder` ملفٌّ يعدّله أكثر من فريق في آنٍ
// واحد. كل هذا المنطق يدخله من نقطتين صغيرتين (قبل الإنشاء وبعده) بدل أن
// يتناثر بين أسطره.
//
// **المبالغ على الخادم دائماً.** العربون والمتبقّي والأقساط تمسّ ما يدفعه
// الزبون؛ الواجهة تعرض تقديراً للمعاينة فقط، وما يُحفظ هو ما يحسبه هذا الملف.

import prisma from './prisma';
import emailService from './emailService';
import { businessHasEntitlement, BusinessType } from './entitlement.service';
import { env } from '../config/env';

// ==================== الإعدادات ====================

/**
 * خطوة واتساب بعد الطلب:
 * - `off`: لا زرّ — التاجر يتابع من اللوحة وحدها.
 * - `optional`: زرٌّ ثانويّ «أرسل نسخةً للتاجر».
 * - `prominent`: الزرّ هو الخطوة الأخيرة البارزة — لتاجرٍ يعيش على واتساب
 *   ولا يفتح اللوحة كثيراً. «مطلوب شكلاً» لا فعلاً: الطلب مسجَّلٌ قبل الضغط.
 */
export type WhatsappStep = 'off' | 'optional' | 'prominent';

export interface CheckoutSettings {
  whatsappStep: WhatsappStep;
  inspection: boolean;
  giftEnabled: boolean;
  giftPaymentInstructions: string;
  depositInstructions: string;
}

export const DEFAULT_CHECKOUT_SETTINGS: CheckoutSettings = {
  whatsappStep: 'optional',
  inspection: false,
  giftEnabled: false,
  giftPaymentInstructions: '',
  depositInstructions: ''
};

/** ميزتا الخطط المدفوعة — تُفتحان برمزهما (إضافة) أو بما يفتح التحليلات (pro+) */
export const GIFT_FEATURE = 'gift_orders';
export const DEPOSIT_FEATURE = 'deposits';
/**
 * «pro فما فوق» بلا عمودٍ جديد في جدول الخطط: `analytics` هي البوابة التي
 * تفصل pro وما فوقه عن المجانية والانطلاقة — والبكسلات تستعملها للغرض نفسه.
 * وإسناد الرمز منفرداً (`gift_orders` / `deposits`) يبقى ممكناً كإضافة.
 */
const PRO_TIER_FEATURE = 'analytics';

export const hasCheckoutEntitlement = async (
  businessId: string,
  businessType: BusinessType,
  feature: typeof GIFT_FEATURE | typeof DEPOSIT_FEATURE
): Promise<boolean> => {
  try {
    if (await businessHasEntitlement(businessId, businessType, feature)) return true;
    return await businessHasEntitlement(businessId, businessType, PRO_TIER_FEATURE);
  } catch {
    return false;
  }
};

const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

export const readCheckoutSettings = (raw: unknown): CheckoutSettings => {
  let value: any = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      value = null;
    }
  }
  if (!value || typeof value !== 'object') return { ...DEFAULT_CHECKOUT_SETTINGS };
  const step = ['off', 'optional', 'prominent'].includes(value.whatsappStep)
    ? (value.whatsappStep as WhatsappStep)
    : DEFAULT_CHECKOUT_SETTINGS.whatsappStep;
  return {
    whatsappStep: step,
    inspection: value.inspection === true,
    giftEnabled: value.giftEnabled === true,
    giftPaymentInstructions: text(value.giftPaymentInstructions, 1000),
    depositInstructions: text(value.depositInstructions, 1000)
  };
};

/**
 * ما يُحفظ من طلب التاجر — الحقول المعروفة فقط، بقصٍّ للأطوال.
 *
 * تفعيل الهدايا بلا تعليمات دفع يُرفض: دافعٌ في ألمانيا يطلب ثم لا يعرف كيف
 * يدفع، فيبقى الطلب معلّقاً للأبد والتاجر ينتظر تحويلاً لن يأتي.
 */
export const sanitizeCheckoutSettings = (
  input: unknown
): { ok: true; value: CheckoutSettings } | { ok: false; error: string } => {
  if (!input || typeof input !== 'object') return { ok: false, error: 'إعدادات غير صالحة' };
  const value = readCheckoutSettings(input);
  if (value.giftEnabled && value.giftPaymentInstructions.length < 10) {
    return { ok: false, error: 'اكتب تعليمات الدفع للمغترب قبل تفعيل طلبات الهدايا — كيف يحوّل إليك ولمن.' };
  }
  return { ok: true, value };
};

/**
 * بلا try/catch عمداً: فشل القراءة يُسقط الطلب بخطأٍ ظاهر. ابتلاعه كان
 * سيُسقط المعاينة بصمت ويرفض هدية المغترب بـ«غير متاحة» — كذبةٌ للزبون.
 */
const loadBusinessSettings = async (type: BusinessType, id: string) => {
  const row =
    type === 'restaurant'
      ? await prisma.restaurant.findUnique({ where: { id }, select: { checkoutSettings: true } })
      : await prisma.store.findUnique({ where: { id }, select: { checkoutSettings: true } });
  return row ? readCheckoutSettings(row.checkoutSettings) : null;
};

/**
 * ما تراه واجهة الزبون. الميزة المدفوعة تظهر فقط لمن يملك استحقاقها **الآن**:
 * تاجرٌ نزلت خطته يبقى إعداده محفوظاً ويعود حين يجدّد، لكن زبائنه لا يرون
 * خياراً سيرفضه الخادم عند الطلب.
 */
export const publicCheckoutOptions = async (
  businessId: string,
  businessType: BusinessType,
  raw: unknown,
  /** هل في المتجر منتجٌ بعربون؟ `false` يوفّر استعلامَي الاستحقاق على كل زيارة */
  hasDepositProducts = true
) => {
  const settings = readCheckoutSettings(raw);
  const [giftAllowed, depositAllowed] = await Promise.all([
    settings.giftEnabled ? hasCheckoutEntitlement(businessId, businessType, GIFT_FEATURE) : Promise.resolve(false),
    businessType === 'store' && hasDepositProducts
      ? hasCheckoutEntitlement(businessId, businessType, DEPOSIT_FEATURE)
      : Promise.resolve(false)
  ]);
  return {
    whatsappStep: settings.whatsappStep,
    inspection: settings.inspection,
    gift: giftAllowed ? { enabled: true, paymentInstructions: settings.giftPaymentInstructions } : null,
    deposits: depositAllowed ? { enabled: true, instructions: settings.depositInstructions } : null
  };
};

// ==================== الهاتف ====================

/**
 * رقمٌ سوريّ بصيغة واتساب: `09xxxxxxxx` → `9639xxxxxxxx`.
 * `null` لرقمٍ ليس جوالاً سورياً — المستلم في سوريا حكماً.
 */
export const normalizeSyrianMobile = (raw: unknown): string | null => {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = `963${d.slice(1)}`;
  else if (d.length === 9 && d.startsWith('9')) d = `963${d}`;
  return /^9639\d{8}$/.test(d) ? d : null;
};

/** رقمٌ دوليّ بأيّ رمز دولة — ٨ إلى ١٥ رقماً (E.164) */
export const normalizeIntlPhone = (raw: unknown): string | null => {
  let d = String(raw ?? '').replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = `+${d.slice(2)}`;
  const digits = d.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const round2 = (n: number) => Math.round(n * 100) / 100;

// ==================== العربون ====================

export type DepositType = 'percent' | 'fixed';

/**
 * حقلا العربون من نموذج المنتج إلى بيانات Prisma — للإنشاء والتعديل معاً.
 * يكتب في `target` ويعيد خطأً نصّياً إن كان الإدخال فاسداً.
 */
export const applyDepositInput = (body: any, target: Record<string, any>): string | null => {
  if (!body || (body.depositType === undefined && body.depositValue === undefined)) return null;
  const type = body.depositType;
  if (!type || type === 'none') {
    target.depositType = null;
    target.depositValue = null;
    return null;
  }
  if (type !== 'percent' && type !== 'fixed') return 'نوع العربون غير معروف';
  const value = Number(body.depositValue);
  if (!Number.isFinite(value) || value <= 0) return 'قيمة العربون يجب أن تكون أكبر من صفر';
  if (type === 'percent' && value > 100) return 'نسبة العربون لا تتجاوز 100%';
  target.depositType = type;
  target.depositValue = round2(value);
  return null;
};

/** عربون سطرٍ واحد — لا يتجاوز قيمة السطر نفسه */
export const lineDeposit = (
  product: { depositType?: string | null; depositValue?: number | null },
  unitPrice: number,
  quantity: number
): number => {
  const v = Number(product.depositValue) || 0;
  if (!product.depositType || v <= 0) return 0;
  const lineTotal = unitPrice * quantity;
  const raw = product.depositType === 'percent' ? (lineTotal * v) / 100 : v * quantity;
  return Math.min(Math.max(raw, 0), lineTotal);
};

// ==================== نقطة الدخول في createOrder ====================

interface ResolveInput {
  body: any;
  storeId?: string;
  restaurantId?: string;
  orderType: string;
  customerPhone?: string | null;
  items: Array<{ productId: string | null; quantity: number; price: number }>;
  /** الإجمالي النهائي كما حسبه createOrder (بعد الخصم والتوصيل) */
  total: number;
}

type ResolveResult =
  | { ok: true; data: Record<string, any>; holdDispatch: boolean }
  | { ok: false; status: number; error: string };

/**
 * يُستدعى من `createOrder` بعد حساب المجاميع وقبل الإنشاء. يعيد حقولاً تُدمج
 * في بيانات الطلب، و`holdDispatch` حين لا يجوز إسناد الطلب لسائق بعد (هديةٌ لم
 * يصل تحويلها، أو عربونٌ لم يُدفع).
 */
export const resolveCheckoutExtras = async (input: ResolveInput): Promise<ResolveResult> => {
  const businessType: BusinessType = input.storeId ? 'store' : 'restaurant';
  const businessId = (input.storeId || input.restaurantId)!;
  const settings = (await loadBusinessSettings(businessType, businessId)) || DEFAULT_CHECKOUT_SETTINGS;

  const data: Record<string, any> = {};
  let holdDispatch = false;

  // ---- المعاينة: لقطة من الإعداد، للطلبات التي تُسلَّم فقط ----
  const handedOver = ['delivery', 'shipping', 'takeaway'].includes(input.orderType);
  if (settings.inspection && handedOver) data.inspectionAllowed = true;

  // ---- الهدية ----
  const gift = input.body?.gift;
  if (gift && typeof gift === 'object' && gift.enabled !== false) {
    if (!settings.giftEnabled || !(await hasCheckoutEntitlement(businessId, businessType, GIFT_FEATURE))) {
      return { ok: false, status: 400, error: 'طلبات الهدايا غير متاحة في هذا المتجر.' };
    }
    if (input.orderType !== 'delivery' && input.orderType !== 'shipping') {
      return { ok: false, status: 400, error: 'طلب الهدية يُوصَّل إلى المستلم — اختر التوصيل.' };
    }
    const payerName = text(gift.payerName, 120);
    const payerPhone = normalizeIntlPhone(gift.payerPhone);
    const payerEmail = text(gift.payerEmail, 160);
    if (payerName.length < 2) return { ok: false, status: 400, error: 'اكتب اسمك (الدافع).' };
    if (!payerPhone) return { ok: false, status: 400, error: 'رقم هاتفك غير صالح — اكتبه مع رمز الدولة، مثل +49…' };
    if (payerEmail && !EMAIL_RE.test(payerEmail)) return { ok: false, status: 400, error: 'البريد الإلكتروني غير صالح.' };
    if (!normalizeSyrianMobile(input.customerPhone)) {
      return { ok: false, status: 400, error: 'رقم المستلم يجب أن يكون جوالاً سورياً، مثل 09xxxxxxxx.' };
    }

    Object.assign(data, {
      isGift: true,
      giftPayerName: payerName,
      giftPayerPhone: payerPhone,
      giftPayerEmail: payerEmail || null,
      giftMessage: text(gift.message, 500) || null,
      giftHidePrices: gift.hidePrices === true,
      // لا يُجهَّز ولا يُسنَد لسائق قبل أن يؤكّد التاجر وصول التحويل
      paymentStatus: 'awaiting_transfer'
    });
    holdDispatch = true;
    // الهدية مدفوعةٌ كاملةً مسبقاً — العربون لا معنى له فيها
    return { ok: true, data, holdDispatch };
  }

  // ---- العربون (للمتاجر) ----
  if (businessType === 'store') {
    const productIds = input.items.map((i) => i.productId).filter((id): id is string => !!id);
    if (productIds.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, depositType: { not: null } },
        select: { id: true, depositType: true, depositValue: true }
      });
      if (products.length > 0 && (await hasCheckoutEntitlement(businessId, businessType, DEPOSIT_FEATURE))) {
        const byId = new Map(products.map((p) => [p.id, p]));
        let deposit = 0;
        for (const item of input.items) {
          const p = item.productId ? byId.get(item.productId) : null;
          if (p) deposit += lineDeposit(p, Number(item.price) || 0, item.quantity);
        }
        deposit = Math.min(round2(deposit), input.total);
        if (deposit > 0) {
          data.depositAmount = deposit;
          data.remainingAmount = round2(input.total - deposit);
          data.paymentStatus = 'awaiting_deposit';
          holdDispatch = true;
        }
      }
    }
  }

  return { ok: true, data, holdDispatch };
};

// ==================== المبالغ ====================

interface MoneyOrder {
  total: number;
  isPaid: boolean;
  paymentStatus?: string | null;
  depositAmount?: number | null;
  depositPaidAt?: Date | string | null;
  installments?: Array<{ amount: number; paidAt: Date | string | null }>;
}

/**
 * ما يُحصَّل عند التسليم — لملصق الشحن وتطبيق السائق وتسوية النقد.
 *
 * - مدفوع أو هديةٌ مؤكَّدة → صفر.
 * - جدول أقساط → القسط غير المدفوع الأوّل فقط (الباقي يُحصَّل في موعده).
 * - عربونٌ مدفوع → الإجمالي ناقص العربون.
 */
export const amountDueOnDelivery = (order: MoneyOrder): number => {
  if (order.isPaid) return 0;
  if (order.paymentStatus === 'awaiting_transfer' || order.paymentStatus === 'confirmed') return 0;
  const inst = order.installments || [];
  if (inst.length > 0) {
    const next = inst.find((i) => !i.paidAt);
    return next ? round2(Number(next.amount) || 0) : 0;
  }
  const deposit = order.depositPaidAt ? Number(order.depositAmount) || 0 : 0;
  return Math.max(0, round2(Number(order.total) - deposit));
};

// ==================== إشعار الدافع ====================

const trackUrlFor = (orderId: string, subdomain?: string | null) =>
  subdomain ? `https://${subdomain}.${env.APP_DOMAIN}/track/${orderId}` : `https://${env.APP_DOMAIN}/track/${orderId}`;

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const money = (n: number, currency?: string | null) =>
  `${Math.round(Number(n) || 0).toLocaleString('en-US')} ${currency === 'USD' ? '$' : 'ل.س'}`;

const businessOf = async (order: { storeId: string | null; restaurantId: string | null }) =>
  order.storeId
    ? prisma.store.findUnique({ where: { id: order.storeId }, select: { name: true, subdomain: true, currency: true } })
    : order.restaurantId
      ? prisma.restaurant.findUnique({ where: { id: order.restaurantId }, select: { name: true, subdomain: true, currency: true } })
      : null;

/**
 * بريدٌ للدافع — بعد الطلب بتعليمات الدفع، وبعد تأكيد الاستلام.
 * لا يرمي أبداً: البريد أثرٌ جانبي، والبريد غير المهيّأ يعيد `false` بصمت.
 */
export const emailGiftPayer = async (
  orderId: string,
  kind: 'placed' | 'confirmed'
): Promise<boolean> => {
  try {
    const order: any = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order?.isGift || !order.giftPayerEmail) return false;
    const business = await businessOf(order);
    const name = business?.name || 'المتجر';
    const url = trackUrlFor(order.id, business?.subdomain);
    const settings =
      kind === 'placed'
        ? await loadBusinessSettings(order.storeId ? 'store' : 'restaurant', (order.storeId || order.restaurantId)!)
        : null;

    const subject =
      kind === 'placed'
        ? `طلب هديتك #${order.orderNumber} — تعليمات الدفع`
        : `وصلت دفعتك — طلب هديتك #${order.orderNumber} قيد التجهيز`;
    const body =
      kind === 'placed'
        ? `<p>مرحباً ${esc(order.giftPayerName)}،</p>
           <p>سجّل <b>${esc(name)}</b> طلب هديتك إلى <b>${esc(order.customerName)}</b> بمبلغ <b>${esc(money(order.total, business?.currency))}</b>.</p>
           <p>الطلب لا يُجهَّز حتى يصل تحويلك. تعليمات الدفع من المتجر:</p>
           <div style="white-space:pre-wrap;background:#f4f7f4;border-radius:10px;padding:12px">${esc(settings?.giftPaymentInstructions || '')}</div>`
        : `<p>مرحباً ${esc(order.giftPayerName)}،</p>
           <p>أكّد <b>${esc(name)}</b> استلام دفعتك. طلب هديتك إلى <b>${esc(order.customerName)}</b> دخل التجهيز الآن.</p>`;

    return await emailService.sendEmail({
      to: order.giftPayerEmail,
      subject,
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.9;color:#111">${body}
        <p><a href="${esc(url)}">تابع الطلب من هنا</a></p></div>`
    });
  } catch (error) {
    console.error('emailGiftPayer failed:', error);
    return false;
  }
};

/** أقساط الطلب مرتّبة */
export const loadInstallments = (orderId: string) =>
  prisma.orderInstallment.findMany({ where: { orderId }, orderBy: { seq: 'asc' } });

// ==================== عرض التتبّع العامّ ====================

/**
 * ما تراه صفحة `/track/:orderId` — بلا مصادقة، فبلا ما لا يخصّ حامل الرابط:
 * لا بريد الدافع ولا هاتفه، ولا تكلفة. ومعرّف الطلب (cuid) هو السرّ هنا —
 * لا رقم الطلب القصير الذي يُطبع على الفاتورة.
 *
 * وحين يطلب الدافع إخفاء الأسعار: لا أسعار إطلاقاً. رابط التتبّع يصل المستلم.
 */
export const publicTrackingView = async (orderId: string) => {
  const order: any = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
          menuItem: { select: { id: true, name: true, image: true } }
        }
      },
      store: { select: { name: true, whatsapp: true, phone: true, currency: true, slug: true, subdomain: true } },
      restaurant: { select: { name: true, whatsapp: true, phone: true, currency: true, slug: true, subdomain: true } },
      driver: { select: { name: true, phone: true } }
    } as any
  });
  if (!order) return null;
  order.installments = await loadInstallments(order.id);

  const hide = order.isGift && order.giftHidePrices;
  const price = (n: unknown) => (hide ? null : Number(n) || 0);
  const business = order.store || order.restaurant;

  // **أقلّ ما تحتاجه الصفحة.** الرابط يُمرَّر على واتساب ويُعاد توجيهه، فلا
  // اسمٌ كامل ولا عنوانٌ تفصيلي ولا إحداثيات: المحافظة والحيّ وأقرب نقطة دالّة
  // تكفي الزبون ليتأكّد أنه طلبه. والسائق باسمه الأوّل وهاتفه أثناء التوصيل
  // وحده — بعده لا سبب لبقاء رقمه على رابطٍ عامّ.
  let details: any = order.deliveryDetails;
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch {
      details = null;
    }
  }
  const area = details && typeof details === 'object'
    ? [[details.governorateName, details.areaName].filter(Boolean).join(' — '), details.landmark ? `قرب ${details.landmark}` : '']
        .filter(Boolean)
        .join('، ')
    : '';
  const firstName = (full: unknown) => String(full || '').trim().split(/\s+/)[0] || null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customerName: firstName(order.customerName),
    deliveryAddress: area || null,
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    paymentMethod: order.paymentMethod,
    isPaid: order.isPaid,
    pricesHidden: !!hide,
    total: price(order.total),
    subtotal: price(order.subtotal),
    deliveryFee: price(order.deliveryFee),
    discountAmount: price(order.discountAmount),
    inspectionAllowed: !!order.inspectionAllowed,
    isGift: !!order.isGift,
    giftMessage: order.isGift ? order.giftMessage : null,
    paymentStatus: order.paymentStatus,
    depositAmount: hide ? null : order.depositAmount,
    depositPaidAt: order.depositPaidAt,
    remainingAmount: hide ? null : order.remainingAmount,
    installments: hide
      ? []
      : (order.installments || []).map((i: any) => ({ id: i.id, seq: i.seq, dueDate: i.dueDate, amount: i.amount, paidAt: i.paidAt })),
    business: business
      ? { name: business.name, whatsapp: business.whatsapp || business.phone || null, currency: business.currency, slug: business.slug }
      : null,
    assignedDriver:
      order.driver && order.status === 'delivering'
        ? { name: firstName(order.driver.name), phone: order.driver.phone }
        : undefined,
    orderItems: (order.items || []).map((it: any) => ({
      id: it.id,
      quantity: it.quantity,
      price: price(it.price),
      size: it.size,
      product: it.product ? { id: it.product.id, name: it.product.name, image: it.product.imageUrl } : undefined,
      menuItem: it.menuItem ? { id: it.menuItem.id, name: it.menuItem.name, image: it.menuItem.image } : undefined
    }))
  };
};

export default {
  readCheckoutSettings,
  sanitizeCheckoutSettings,
  publicCheckoutOptions,
  resolveCheckoutExtras,
  applyDepositInput,
  amountDueOnDelivery,
  emailGiftPayer,
  publicTrackingView,
  normalizeSyrianMobile,
  normalizeIntlPhone
};
