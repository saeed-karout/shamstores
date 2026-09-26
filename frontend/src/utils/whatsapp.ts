// frontend/src/utils/whatsapp.ts
//
// روابط واتساب ورسائله الجاهزة — `wa.me` فقط، بلا API مدفوع.
//
// **رابطٌ لا `window.open`:** الزبون يضغط زرّاً هو `<a href>` حقيقيّ. متصفّحات
// الجوال تحجب النوافذ التي تُفتح بعد انتظار شبكة، والرابط يفتح التطبيق مباشرةً
// على أندرويد وآيفون. (`openWhatsApp` في helpers.ts يبقى لمن يحتاجه.)
//
// **لماذا مُطبِّعٌ خاصّ بسوريا:** أرقام الزبائن تُكتب `09xxxxxxxx` كما تُحفظ في
// الهاتف، و`wa.me/09…` لا يصل أحداً. `openWhatsApp` يفترض أن الرقم بـ5 سعوديّ
// — افتراضٌ خاطئ هنا حيث الرقم الدوليّ لدافع الهدية قد يبدأ بأيّ شيء.

import { formatPrice } from './currency';
import type { CurrencyInput } from './currency';

/**
 * رقمٌ صالح لـ `wa.me` — أرقامٌ فقط برمز الدولة.
 * `09xxxxxxxx` → `9639xxxxxxxx`، و`+49…`/`0049…` → `49…`. `null` إن كان فارغاً.
 */
export const toWaNumber = (raw?: string | null): string | null => {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  let d = trimmed.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `963${d.slice(1)}`;
  // رقمٌ سوريّ بلا صفر أوّل: 9xxxxxxxx (تسعة أرقام)
  else if (d.length === 9 && d.startsWith('9') && !trimmed.startsWith('+')) d = `963${d}`;
  return d.length >= 8 ? d : null;
};

/** جوّال سوريّ صالح؟ (للمستلم في طلب الهدية) */
export const isSyrianMobile = (raw?: string | null) => /^9639\d{8}$/.test(toWaNumber(raw) || '');

/** رابط `wa.me` — بلا رقم يفتح «اختر محادثة» لمشاركة النصّ */
export const waLink = (phone: string | null | undefined, text: string): string => {
  const n = toWaNumber(phone);
  return `https://wa.me/${n || ''}?text=${encodeURIComponent(text)}`;
};

// ==================== الرسائل ====================

export interface WaOrderLine {
  name: string;
  quantity: number;
  /** سعر الوحدة بالعملة الأساس — يُحوَّل بعملة العرض */
  price?: number | null;
  extras?: string | null;
}

export interface WaOrderSummary {
  orderNumber: string;
  items: WaOrderLine[];
  total?: number | null;
  orderType?: string | null;
  address?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  trackUrl?: string | null;
  notes?: string | null;
  depositAmount?: number | null;
  isGift?: boolean;
  giftPayerName?: string | null;
  inspectionAllowed?: boolean;
}

const ORDER_TYPE_AR: Record<string, string> = {
  delivery: 'توصيل',
  shipping: 'شحن',
  takeaway: 'استلام من المحل',
  dine_in: 'في المطعم'
};

/**
 * رسالة الزبون إلى التاجر بعد الطلب.
 *
 * **بعملة العرض التي رآها الزبون:** زبونٌ دفع بالدولار على الشاشة ثمّ يرسل
 * رسالةً بالليرة يظنّ المبلغ تغيّر. والطلب نفسه محفوظٌ بالليرة على الخادم.
 */
export const customerToMerchantMessage = (o: WaOrderSummary, currency?: CurrencyInput): string => {
  const lines: string[] = [];
  lines.push(o.isGift ? `مرحباً، أرسلت طلب هدية رقم #${o.orderNumber}` : `مرحباً، أرسلت طلباً رقم #${o.orderNumber}`);
  lines.push('');
  for (const item of o.items) {
    const price = item.price != null ? ` — ${formatPrice(item.price * item.quantity, currency)}` : '';
    lines.push(`• ${item.name}${item.extras ? ` (${item.extras})` : ''} × ${item.quantity}${price}`);
  }
  if (o.total != null) {
    lines.push('');
    lines.push(`الإجمالي: ${formatPrice(o.total, currency)}`);
  }
  if (o.depositAmount) lines.push(`العربون المطلوب الآن: ${formatPrice(o.depositAmount, currency)}`);
  if (o.orderType) lines.push(`نوع الطلب: ${ORDER_TYPE_AR[o.orderType] || o.orderType}`);
  if (o.address) lines.push(`العنوان: ${o.address}`);
  if (o.isGift) {
    lines.push(`المستلم: ${o.customerName || ''}${o.customerPhone ? ` — ${o.customerPhone}` : ''}`);
    if (o.giftPayerName) lines.push(`الدافع: ${o.giftPayerName}`);
  } else if (o.customerName) {
    lines.push(`الاسم: ${o.customerName}`);
  }
  if (o.notes) lines.push(`ملاحظات: ${o.notes}`);
  if (o.trackUrl) {
    lines.push('');
    lines.push(`رابط التتبّع: ${o.trackUrl}`);
  }
  return lines.join('\n');
};

/** رسالة التاجر إلى الزبون: تأكيد الطلب مع رابط التتبّع */
export const merchantConfirmMessage = (
  o: WaOrderSummary & { businessName?: string | null },
  currency?: CurrencyInput,
  hidePrices = false
): string => {
  const lines: string[] = [];
  lines.push(`مرحباً ${o.customerName || ''}،`.trim());
  lines.push(
    o.isGift
      ? `هديةٌ في طريقها إليك${o.giftPayerName ? ` من ${o.giftPayerName}` : ''} 🎁 — طلب رقم #${o.orderNumber}${o.businessName ? ` من ${o.businessName}` : ''}.`
      : `تمّ تأكيد طلبك رقم #${o.orderNumber}${o.businessName ? ` من ${o.businessName}` : ''} ✅`
  );
  if (o.items.length) {
    lines.push('');
    for (const item of o.items) lines.push(`• ${item.name} × ${item.quantity}`);
  }
  if (!hidePrices && o.total != null) {
    lines.push('');
    lines.push(`الإجمالي: ${formatPrice(o.total, currency)}`);
  }
  if (o.inspectionAllowed) lines.push('يمكنك معاينة الطلب قبل الدفع عند الاستلام.');
  if (o.trackUrl) {
    lines.push('');
    lines.push(`تابع طلبك من هنا: ${o.trackUrl}`);
  }
  return lines.join('\n');
};

/** رسالة قصيرة: رابط التتبّع وحده */
export const merchantTrackMessage = (o: { orderNumber: string; customerName?: string | null; trackUrl: string }) =>
  `مرحباً ${o.customerName || ''}، يمكنك متابعة طلبك رقم #${o.orderNumber} من هنا:\n${o.trackUrl}`.replace('مرحباً ،', 'مرحباً،');

/** رابط التتبّع العامّ لطلب — على المضيف الحاليّ أو على رابط المتجر */
export const trackUrlFor = (orderId: string, base?: string | null): string => {
  let origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (base) {
    try {
      origin = new URL(base).origin;
    } catch {
      /* رابطٌ نسبيّ — نبقى على المضيف الحاليّ */
    }
  }
  return `${origin}/track/${orderId}`;
};
