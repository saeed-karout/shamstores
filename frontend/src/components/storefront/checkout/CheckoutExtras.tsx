// frontend/src/components/storefront/checkout/CheckoutExtras.tsx
//
// إضافات إتمام الطلب في السلّة — «هدية لأهلك»، «معاينة قبل الدفع»، والعربون.
//
// **خطّافٌ واحد يعيد أجزاءً جاهزة** تُمرَّر إلى `CartSheet` من خلال نقاط تركيبٍ
// صغيرة (`extraSection` و`summaryExtra` و`extraMissing`)، وحمولةً تُدمج في
// جسم الطلب. هكذا لا يعرف `CartSheet` شيئاً عن الهدايا والعربون، ولا تتغيّر
// صفحتا المتجر والمطعم إلا ببضعة أسطر.
//
// **العنوان ليس هنا:** عنوان المستلم في طلب الهدية هو حقول التوصيل نفسها في
// السلّة — يملكها قسم التوصيل ويبقى مصدراً واحداً لها.
//
// **المبالغ هنا تقدير للمعاينة.** العربون الفعليّ يحسبه الخادم
// (services/checkoutExtras.service.ts) ويعود في ردّ الطلب.

import React, { useEffect, useMemo, useState } from 'react';
import { IoGiftOutline, IoEyeOutline, IoWalletOutline } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { formatPrice } from '@/utils/currency';
import type { CurrencyInput } from '@/utils/currency';
import type { CartItem } from '@/services/types';
import { useT } from '@/i18n/storefront';
import { isSyrianMobile } from '@/utils/whatsapp';

// ==================== الأنواع ====================

export type WhatsappStep = 'off' | 'optional' | 'prominent';

/** ما يرسله الخادم في `checkoutOptions` — المدفوع منه `null` لمن لا يملكه */
export interface CheckoutOptions {
  whatsappStep: WhatsappStep;
  inspection: boolean;
  gift: { enabled: boolean; paymentInstructions: string } | null;
  deposits: { enabled: boolean; instructions: string } | null;
}

export const readCheckoutOptions = (business: any): CheckoutOptions => {
  const raw = business?.checkoutOptions;
  return {
    // خادمٌ أقدم لا يرسل الحقل: الزرّ الثانويّ هو ما كان يُتوقَّع دائماً
    whatsappStep: raw?.whatsappStep || 'optional',
    inspection: raw?.inspection === true,
    gift: raw?.gift?.enabled ? raw.gift : null,
    deposits: raw?.deposits?.enabled ? raw.deposits : null
  };
};

export interface GiftDraft {
  enabled: boolean;
  payerName: string;
  payerPhone: string;
  payerEmail: string;
  message: string;
  hidePrices: boolean;
}

const EMPTY_GIFT: GiftDraft = { enabled: false, payerName: '', payerPhone: '', payerEmail: '', message: '', hidePrices: false };

/** منتجٌ كما في حمولة الواجهة — حقلا العربون فقط يهمّاننا */
interface DepositProduct {
  id: string;
  depositType?: string | null;
  depositValue?: number | null;
}

/** نفس معادلة الخادم (`lineDeposit`) — للمعاينة فقط */
export const estimateLineDeposit = (p: DepositProduct | undefined, unitPrice: number, qty: number) => {
  const v = Number(p?.depositValue) || 0;
  if (!p?.depositType || v <= 0) return 0;
  const line = unitPrice * qty;
  const raw = p.depositType === 'percent' ? (line * v) / 100 : v * qty;
  return Math.min(Math.max(raw, 0), line);
};

const intlPhoneOk = (v: string) => {
  const digits = v.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
};

// ==================== الخطّاف ====================

interface UseCheckoutExtrasArgs {
  options: CheckoutOptions;
  items: CartItem[];
  products?: DepositProduct[];
  currency?: CurrencyInput;
  total: number;
  customerPhone: string;
  availableOrderTypes: string[];
  orderType: string;
  onOrderTypeChange: (type: any) => void;
}

export const useCheckoutExtras = ({
  options,
  items,
  products = [],
  currency,
  total,
  customerPhone,
  availableOrderTypes,
  orderType,
  onOrderTypeChange
}: UseCheckoutExtrasArgs) => {
  const [gift, setGift] = useState<GiftDraft>(EMPTY_GIFT);
  const giftAvailable = !!options.gift && availableOrderTypes.includes('delivery');
  const giftOn = giftAvailable && gift.enabled;

  // الهدية تُوصَّل دائماً — نوع الطلب يتبع الخيار بدل أن يُترك لزبونٍ ينسى
  useEffect(() => {
    if (giftOn && orderType !== 'delivery') onOrderTypeChange('delivery');
  }, [giftOn, orderType, onOrderTypeChange]);

  const byId = useMemo(() => new Map(products.map((p) => [String(p.id), p])), [products]);
  const deposit = useMemo(() => {
    if (!options.deposits || giftOn) return 0;
    const sum = items.reduce(
      (s, item) => s + estimateLineDeposit(byId.get(String(item.id)), Number(item.price) || 0, Number(item.quantity) || 0),
      0
    );
    return Math.min(Math.round(sum * 100) / 100, total);
  }, [options.deposits, giftOn, items, byId, total]);

  const missing: string[] = [];
  if (giftOn) {
    if (gift.payerName.trim().length < 2) missing.push('اسم الدافع');
    if (!intlPhoneOk(gift.payerPhone)) missing.push('رقم الدافع مع رمز الدولة');
    if (customerPhone.trim() && !isSyrianMobile(customerPhone)) missing.push('رقم مستلم سوري');
  }

  const payload = giftOn
    ? {
        gift: {
          payerName: gift.payerName.trim(),
          payerPhone: gift.payerPhone.trim(),
          payerEmail: gift.payerEmail.trim() || undefined,
          message: gift.message.trim() || undefined,
          hidePrices: gift.hidePrices
        }
      }
    : {};

  return {
    gift,
    setGift,
    giftAvailable,
    giftOn,
    deposit,
    missing,
    payload,
    /** عنوان قسم «بياناتك» — في الهدية هي بيانات المستلم لا الدافع */
    customerTitle: giftOn ? 'بيانات المستلم في سوريا' : undefined,
    reset: () => setGift(EMPTY_GIFT),
    section: (
      <CheckoutExtrasSection
        options={options}
        gift={gift}
        onGiftChange={setGift}
        giftAvailable={giftAvailable}
        deposit={deposit}
        currency={currency}
      />
    ),
    summary: deposit > 0 ? <DepositSummary deposit={deposit} total={total} currency={currency} /> : null
  };
};

// ==================== القسم في السلّة ====================

const CheckoutExtrasSection: React.FC<{
  options: CheckoutOptions;
  gift: GiftDraft;
  onGiftChange: (next: GiftDraft) => void;
  giftAvailable: boolean;
  deposit: number;
  currency?: CurrencyInput;
}> = ({ options, gift, onGiftChange, giftAvailable, deposit, currency }) => {
  const { t } = useT();
  const set = (patch: Partial<GiftDraft>) => onGiftChange({ ...gift, ...patch });
  const giftOn = giftAvailable && gift.enabled;

  if (!giftAvailable && !options.inspection && !(deposit > 0)) return null;

  return (
    <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
      {giftAvailable && (
        <section
          style={{
            border: `1.5px solid ${giftOn ? sf.accent : sf.border}`,
            background: giftOn ? sf.accentSoft : sf.surface,
            borderRadius: sd.rCard,
            padding: '12px 14px'
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={gift.enabled}
              onChange={(e) => set({ enabled: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: 'var(--sf-accent)' as any }}
            />
            <IoGiftOutline size={19} style={{ color: sf.accent, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: sf.text }}>
                {t('هذا الطلب هدية — أنا خارج سوريا')}
              </span>
              <span style={{ display: 'block', fontSize: 11.5, color: sf.muted, lineHeight: 1.7 }}>
                {t('تدفع أنت من الخارج، ونوصله لأهلك في سوريا.')}
              </span>
            </span>
          </label>

          {giftOn && (
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: sf.text }}>{t('بياناتك (الدافع)')}</div>
              <input
                type="text"
                value={gift.payerName}
                onChange={(e) => set({ payerName: e.target.value.slice(0, 120) })}
                placeholder={t('اسمك')}
                autoComplete="name"
                style={inputStyle}
                aria-label={t('اسم الدافع')}
              />
              <input
                type="tel"
                inputMode="tel"
                value={gift.payerPhone}
                onChange={(e) => set({ payerPhone: e.target.value.slice(0, 24) })}
                placeholder="+49 170 1234567"
                autoComplete="tel"
                style={{ ...inputStyle, direction: 'ltr', textAlign: 'start' }}
                aria-label={t('رقم الدافع مع رمز الدولة')}
              />
              <input
                type="email"
                value={gift.payerEmail}
                onChange={(e) => set({ payerEmail: e.target.value.slice(0, 160) })}
                placeholder={t('بريدك الإلكتروني (اختياري) — نرسل لك تأكيد الدفع')}
                autoComplete="email"
                style={{ ...inputStyle, direction: 'ltr', textAlign: 'start' }}
              />
              <textarea
                value={gift.message}
                onChange={(e) => set({ message: e.target.value.slice(0, 500) })}
                placeholder={t('رسالة تُرفق بالهدية (اختياري)')}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: sf.text, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={gift.hidePrices}
                  onChange={(e) => set({ hidePrices: e.target.checked })}
                  style={{ width: 16, height: 16 }}
                />
                {t('أخفِ الأسعار عن المستلم')}
              </label>
              <p style={{ margin: 0, fontSize: 11.5, color: sf.muted, lineHeight: 1.8 }}>
                {t('اكتب بيانات المستلم وعنوانه في سوريا أدناه. بعد الطلب تظهر لك تعليمات الدفع، ولا يُجهَّز الطلب قبل أن يؤكّد المتجر وصول دفعتك.')}
              </p>
            </div>
          )}
        </section>
      )}

      {options.inspection && (
        <div style={noteStyle}>
          <IoEyeOutline size={17} style={{ color: sf.accent, flexShrink: 0, marginTop: 2 }} />
          <span>{t('معاينة قبل الدفع: افحص طلبك عند الاستلام، وادفع فقط إن كان كما طلبت.')}</span>
        </div>
      )}

      {deposit > 0 && (
        <div style={noteStyle}>
          <IoWalletOutline size={17} style={{ color: sf.accent, flexShrink: 0, marginTop: 2 }} />
          <span>
            {t('بعض المنتجات تتطلّب عربوناً')}: <strong style={{ color: sf.text }}>{formatPrice(deposit, currency)}</strong>{' '}
            {t('يُدفع مسبقاً، والباقي عند الاستلام. تظهر طريقة الدفع بعد تأكيد الطلب.')}
          </span>
        </div>
      )}
    </div>
  );
};

const DepositSummary: React.FC<{ deposit: number; total: number; currency?: CurrencyInput }> = ({ deposit, total, currency }) => {
  const { t } = useT();
  return (
    <>
      <Row label={t('العربون المطلوب الآن')} value={formatPrice(deposit, currency)} accent />
      <Row label={t('المتبقّي عند الاستلام')} value={formatPrice(Math.max(0, total - deposit), currency)} />
    </>
  );
};

const Row: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <span style={{ fontSize: 12.5, color: accent ? sf.text : sf.muted, fontWeight: accent ? 800 : 600 }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 800, color: accent ? sf.accent : sf.text, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

// ==================== الشارات ====================

/** شارة «معاينة قبل الدفع» لصفحة المنتج */
export const InspectionBadge: React.FC<{ style?: React.CSSProperties; translate?: (ar: string) => string }> = ({
  style,
  translate
}) => {
  // صفحة المنتج تترجم بـ`makeT` لا بالمزوّد — فتمرّر دالّتها
  const ctx = useT();
  const t = translate || ctx.t;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: sf.accentSoft,
        color: sf.accent,
        border: `1px solid ${sf.border}`,
        borderRadius: sd.rChip,
        padding: '6px 12px',
        fontSize: 12.5,
        fontWeight: 800,
        ...style
      }}
      title={t('افحص طلبك عند الاستلام، وادفع فقط إن كان كما طلبت.')}
    >
      <IoEyeOutline size={16} /> {t('معاينة قبل الدفع')}
    </div>
  );
};

/** شارة العربون لصفحة المنتج */
export const DepositBadge: React.FC<{
  product: DepositProduct & { price?: number };
  currency?: CurrencyInput;
  translate?: (ar: string) => string;
}> = ({ product, currency, translate }) => {
  const ctx = useT();
  const t = translate || ctx.t;
  if (!product?.depositType || !(Number(product.depositValue) > 0)) return null;
  const label =
    product.depositType === 'percent'
      ? `${Number(product.depositValue)}%`
      : formatPrice(Number(product.depositValue), currency);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: sf.surface,
        color: sf.text,
        border: `1px solid ${sf.border}`,
        borderRadius: sd.rChip,
        padding: '6px 12px',
        fontSize: 12.5,
        fontWeight: 700
      }}
    >
      <IoWalletOutline size={16} style={{ color: sf.accent }} /> {t('عربون')} {label} — {t('والباقي عند الاستلام')}
    </div>
  );
};

/**
 * لافتة «اشترِ لأهلك في سوريا» في الواجهة — تظهر حين يفعّل التاجر الهدايا.
 * تفعّل خيار الهدية وتفتح السلّة؛ فمن يضغطها لا يبحث عن الخيار بين الحقول.
 */
export const GiftBanner: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={onStart}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'start',
        background: sf.accentSoft,
        border: `1px solid ${sf.border}`,
        borderRadius: sd.rCard,
        padding: '12px 14px',
        color: sf.text,
        fontFamily: 'inherit',
        cursor: 'pointer',
        margin: '12px 0'
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 40, height: 40, borderRadius: sd.rButton, background: sf.accent, color: sf.onAccent, display: 'grid', placeItems: 'center', flexShrink: 0 }}
      >
        <IoGiftOutline size={21} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>{t('اشترِ لأهلك في سوريا')}</span>
        <span style={{ display: 'block', fontSize: 12, color: sf.muted, lineHeight: 1.7 }}>
          {t('أنت في الخارج؟ اطلب لهم من هنا وادفع أنت — ونوصل الهدية إلى بابهم.')}
        </span>
      </span>
    </button>
  );
};

// ==================== الأنماط ====================

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  background: sf.card,
  border: `1px solid ${sf.border}`,
  borderRadius: sd.rButton,
  padding: '10px 12px',
  color: sf.text,
  fontSize: 13.5,
  fontFamily: 'inherit',
  outline: 'none'
};

const noteStyle: React.CSSProperties = {
  display: 'flex',
  gap: 9,
  background: sf.surface,
  border: `1px solid ${sf.border}`,
  borderRadius: sd.rCard,
  padding: '11px 13px',
  fontSize: 12.5,
  color: sf.muted,
  lineHeight: 1.8
};

