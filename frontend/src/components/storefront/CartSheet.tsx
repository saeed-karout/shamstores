// frontend/src/components/storefront/CartSheet.tsx
// سلة التسوق كلوح سفلي — يدعم الطلب كضيف بدون تسجيل دخول.

import React, { useMemo, useState } from 'react';
import {
  IoBagHandleOutline,
  IoTrashOutline,
  IoTicketOutline,
  IoRestaurantOutline,
  IoStorefrontOutline,
  IoBicycleOutline,
  IoCheckmarkCircle,
  IoCashOutline,
  IoWalletOutline,
  IoCopyOutline
} from 'react-icons/io5';
import BottomSheet from './BottomSheet';
import LocationPickerMap, { PickedLocation } from './LocationPickerMap';

export interface ShippingZone {
  governorate: string;
  name: string;
  /** الاسم الإنجليزي كما يرسله الخادم — قد يغيب في نسخةٍ أقدم منه */
  nameEn?: string;
  fee: number;
  freeOverAmount: number | null;
  estimatedDays: number | null;
  deliveryMode: 'driver' | 'shipping';
}
import QuantityStepper from './QuantityStepper';
import OldSypHint from './OldSypHint';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { formatPrice } from '@/utils/currency';
import type { CurrencyInput } from '@/utils/currency';
import { getImageUrl } from '@/utils/imageHelpers';
import type { CartItem } from '@/services/types';
import { useT } from '@/i18n/storefront';
import useOnlineStatus from '@/hooks/useOnlineStatus';

export type StorefrontOrderType = 'dine_in' | 'takeaway' | 'delivery';

export type StorefrontPaymentMethod = 'cash' | 'sham_cash';

/** ما يرسله الخادم في `paymentOptions` — النقد دائماً، وشام كاش إن فعّله التاجر. */
export interface StorefrontPaymentOptions {
  methods: string[];
  shamCash: { accountNumber: string; accountName?: string; note?: string } | null;
}

export interface CartSheetProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  currency?: CurrencyInput;

  onQuantityChange: (item: CartItem, next: number) => void;
  onRemove: (item: CartItem) => void;
  onClear: () => void;

  /** رقم الطاولة عند الدخول عبر QR طاولة */
  tableNumber?: string | null;
  /** أنواع الطلب المتاحة لهذا المتجر */
  availableOrderTypes?: StorefrontOrderType[];
  orderType: StorefrontOrderType;
  onOrderTypeChange: (type: StorefrontOrderType) => void;

  customerName: string;
  customerPhone: string;
  notes: string;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onNotesChange: (value: string) => void;

  /** حقول التوصيل — تُعرض فقط عند اختيار التوصيل */
  address?: string;
  onAddressChange?: (value: string) => void;
  /** محافظات يخدمها المتجر — فارغةٌ تعني أنه لم يضبط مناطقه بعد */
  shippingZones?: ShippingZone[];
  governorate?: string;
  onGovernorateChange?: (code: string) => void;
  /** إحداثيات التوصيل — العنوان النصّي وحده لا يكفي السائق */
  deliveryLocation?: PickedLocation | null;
  onDeliveryLocationChange?: (location: PickedLocation) => void;
  /** موقع النشاط، يُستخدم مركزاً للخريطة قبل أي اختيار */
  businessLocation?: { lat: number; lng: number };
  deliveryFee?: number;
  /** حقول العنوان المنظَّم (DeliveryAddressFields) — تحلّ محلّ المحافظة والعنوان النصّي */
  deliveryFields?: React.ReactNode;
  /** ما ينقص العنوان المنظَّم — يُضاف إلى «ينقص» ويعطّل الإرسال */
  deliveryMissing?: string[];

  discount?: number;
  couponCode?: string;
  onCouponApply?: (code: string) => Promise<void> | void;
  onCouponRemove?: () => void;

  /** طرق الدفع المتاحة — بدونها أو بطريقةٍ واحدة لا يُعرض قسم الدفع */
  paymentOptions?: StorefrontPaymentOptions | null;
  paymentMethod?: StorefrontPaymentMethod;
  onPaymentMethodChange?: (method: StorefrontPaymentMethod) => void;

  submitting?: boolean;
  onSubmit: () => void;

  /**
   * نقاط تركيبٍ لإضافات إتمام الطلب (هدية المغترب، المعاينة، العربون) —
   * راجع checkout/CheckoutExtras.tsx. السلّة لا تعرف ما بداخلها.
   */
  extraSection?: React.ReactNode;
  summaryExtra?: React.ReactNode;
  extraMissing?: string[];
  /** عنوان قسم «بياناتك» — في طلب الهدية هي بيانات المستلم */
  customerTitle?: string;
  /**
   * الزبون المسجَّل — اسمه وهاتفه من حسابه فلا يُسأل عنهما. تمرّره الصفحة
   * `null` في طلب الهدية: هناك البيانات للمستلم لا لصاحب الحساب.
   */
  account?: { name?: string | null; phone?: string | null } | null;
  /** الكوبون للمسجَّلين — يُعرض بدل حقله تنبيهٌ وزرّ دخول */
  couponLoginRequired?: boolean;
  onLoginRequest?: () => void;
}

const REQUIRED_MARK = <span style={{ color: '#FF6B6B' }}>*</span>;

const ORDER_TYPE_META: Record<StorefrontOrderType, { label: string; icon: React.ReactNode }> = {
  // النصّ عربيٌّ هنا لأنه **مفتاح** القاموس لا نصَّ عرض: القاموس مفهرَس
  // بالعربية، والترجمة تقع عند الاستعمال داخل المكوّن حيث يتوفّر `t`
  dine_in: { label: 'في المطعم', icon: <IoRestaurantOutline size={17} /> },
  takeaway: { label: 'استلام', icon: <IoStorefrontOutline size={17} /> },
  delivery: { label: 'توصيل', icon: <IoBicycleOutline size={17} /> }
};

/** مفتاح فريد للسطر: نفس الصنف بحجم/إضافات مختلفة هو سطر مستقل */
export const cartLineKey = (item: CartItem): string =>
  `${item.id}::${item.size || ''}::${(item.addons || []).join('|')}`;

const CartSheet: React.FC<CartSheetProps> = ({
  open,
  onClose,
  items,
  currency = 'SYP',
  onQuantityChange,
  onRemove,
  onClear,
  tableNumber,
  availableOrderTypes = ['takeaway'],
  orderType,
  onOrderTypeChange,
  customerName,
  customerPhone,
  notes,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onNotesChange,
  address = '',
  onAddressChange,
  shippingZones = [],
  governorate = '',
  onGovernorateChange,
  deliveryLocation = null,
  onDeliveryLocationChange,
  businessLocation,
  deliveryFee = 0,
  deliveryFields,
  deliveryMissing = [],
  discount = 0,
  couponCode,
  onCouponApply,
  onCouponRemove,
  account,
  couponLoginRequired,
  onLoginRequest,
  paymentOptions = null,
  paymentMethod = 'cash',
  onPaymentMethodChange,
  submitting = false,
  onSubmit,
  extraSection,
  summaryExtra,
  extraMissing,
  customerTitle
}) => {
  const { t, lang } = useT();
  const [couponInput, setCouponInput] = useState('');
  // «بيانات أخرى»: صاحب الحساب يطلب لغيره دون أن تكون هدية (زميلٌ يستلم عنه)
  const [useOtherContact, setUseOtherContact] = useState(false);
  const accountName = account?.name?.trim() || '';
  const accountPhone = account?.phone?.trim() || '';
  const fromAccount = !!account && !useOtherContact && !!(accountName || accountPhone);
  const showNameField = !fromAccount || !accountName;
  const showPhoneField = !fromAccount || !accountPhone;
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0),
    [items]
  );

  const selectedZone = shippingZones.find((z) => z.governorate === governorate) || null;
  const effectiveDeliveryFee = orderType === 'delivery' ? deliveryFee : 0;
  const total = Math.max(0, subtotal - discount + effectiveDeliveryFee);
  const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  // الاسم والهاتف مطلوبان إلا في الطلب من الطاولة حيث يعرف المطعم مكان الزبون
  const isDineInAtTable = orderType === 'dine_in' && !!tableNumber;
  const nameRequired = !isDineInAtTable;
  const phoneRequired = !isDineInAtTable;
  const addressRequired = orderType === 'delivery';

  const missing: string[] = [];
  if (items.length === 0) missing.push('السلة فارغة');
  if (nameRequired && showNameField && !customerName.trim()) missing.push('الاسم');
  if (phoneRequired && showPhoneField && !customerPhone.trim()) missing.push('رقم الهاتف');
  if (addressRequired && !deliveryFields && !address.trim()) missing.push('عنوان التوصيل');
  if (addressRequired && deliveryFields) missing.push(...deliveryMissing);
  // تُطلب فقط حين يضبط المتجر مناطقه — وإلا منعنا الطلب في متاجر لم تُهيّأ
  if (addressRequired && !deliveryFields && shippingZones.length > 0 && !governorate) missing.push('المحافظة');
  if (extraMissing?.length) missing.push(...extraMissing);

  // إتمام الطلب يحتاج اتصالاً — التصفّح دون اتصال مسموح، أمّا طلبٌ يُحفظ
  // ليُرسَل «لاحقاً» فقد يصل بعد نفاد الصنف أو تغيّر سعره، والزبون يظنّه
  // وصل. فالزرّ يتعطّل ويقول السبب بدل أن يفشل بعد الضغط
  const { online } = useOnlineStatus();
  const canSubmit = missing.length === 0 && !submitting && online;

  // شام كاش لا يُعرض إلا إن فعّله التاجر **وأرسل الخادم رقم محفظته**: خيارٌ
  // بلا رقمٍ يحوّل إليه الزبون أسوأ من غيابه.
  const shamCash = paymentOptions?.methods?.includes('sham_cash') ? paymentOptions.shamCash : null;
  const showPayment = !!shamCash && !!onPaymentMethodChange;
  const [copied, setCopied] = useState(false);
  const copyAccount = async () => {
    if (!shamCash) return;
    try {
      await navigator.clipboard.writeText(shamCash.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // الحافظة ممنوعة في بعض المتصفّحات — الرقم ظاهرٌ ويُنسخ يدوياً
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !onCouponApply) return;
    setApplyingCoupon(true);
    try {
      await onCouponApply(couponInput.trim());
      setCouponInput('');
    } finally {
      setApplyingCoupon(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      labelledBy="sf-cart-title"
      title={
        <span id="sf-cart-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <IoBagHandleOutline size={19} style={{ color: sf.accent }} />
          {t('السلة')}
          {itemCount > 0 && (
            <span
              style={{
                background: sf.accentSoft,
                color: sf.accent,
                borderRadius: sd.rChip,
                padding: '1px 9px',
                fontSize: 12,
                fontWeight: 800
              }}
            >
              {itemCount}
            </span>
          )}
        </span>
      }
      /**
       * لا تذييل لسلّةٍ فارغة.
       *
       * كان يُعرض «تأكيد الطلب — ٠ ل.س» على سلّةٍ لا شيء فيها: زرٌّ معطّل
       * يشغل ثمانين بكسلاً ويقول للزبون إن هناك ما يُؤكَّد. والرسالة
       * «سلّتك فارغة» وحدها أوضح.
       */
      footer={items.length === 0 ? null : (
        <>
          {!online && (
            <div role="alert" style={{ color: '#FBBF24', fontSize: 12, fontWeight: 700, marginBottom: 9, textAlign: 'center', lineHeight: 1.7 }}>
              {t('أنت غير متصل — إتمام الطلب يحتاج اتصالاً بالإنترنت. سلّتك محفوظة، أكمل حين يعود الاتصال.')}
            </div>
          )}
          {missing.length > 0 && (
            <div style={{ color: '#FBBF24', fontSize: 11.5, marginBottom: 9, textAlign: 'center' }}>
              {t('أكمل')}: {missing.map((m) => t(m)).join('، ')}
            </div>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%',
              minHeight: 54,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '0 18px',
              borderRadius: sd.rButton,
              border: 'none',
              background: canSubmit ? sf.accent : sf.surface,
              color: canSubmit ? sf.onAccent : sf.muted,
              fontSize: 15,
              fontWeight: 800,
              fontFamily: 'inherit',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.7
            }}
          >
            <span>{submitting ? t('جاري إرسال الطلب...') : t('تأكيد الطلب')}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(total, currency)}</span>
          </button>
        </>
      )}
    >
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: sf.muted }}>
          <IoBagHandleOutline size={46} style={{ opacity: 0.4, marginBottom: 14 }} />
          <div style={{ fontSize: 14.5, fontWeight: 700, color: sf.text, marginBottom: 6 }}>{t('سلتك فارغة')}</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>{t('تصفّح القائمة وأضف ما يعجبك')}</div>
        </div>
      ) : (
        <>
          {/* الأصناف */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {items.map((item) => (
              <div
                key={cartLineKey(item)}
                style={{
                  display: 'flex',
                  gap: 11,
                  background: sf.surface,
                  border: `1px solid ${sf.border}`,
                  borderRadius: sd.rCard,
                  padding: 10
                }}
              >
                {item.image ? (
                  <img
                    src={getImageUrl(item.image)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={62}
                    height={62}
                    style={{ width: 62, height: 62, borderRadius: sd.rImage, objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: sd.rImage,
                      background: sf.card,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      fontSize: 22
                    }}
                    aria-hidden="true"
                  >
                    🍽️
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: sf.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.name}
                      </div>
                      {(item.size || (item.addons && item.addons.length > 0)) && (
                        <div style={{ fontSize: 11, color: sf.muted, marginTop: 2, lineHeight: 1.6 }}>
                          {[item.size, ...(item.addons || [])].filter(Boolean).join(' • ')}
                        </div>
                      )}
                      {item.notes && (
                        <div style={{ fontSize: 11, color: sf.muted, marginTop: 2, fontStyle: 'italic' }}>
                          📝 {item.notes}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      aria-label={`إزالة ${item.name}`}
                      style={{
                        width: 30,
                        height: 30,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: sd.rButton,
                        border: 'none',
                        background: 'transparent',
                        color: '#FF6B6B',
                        cursor: 'pointer',
                        flexShrink: 0,
                        padding: 0
                      }}
                    >
                      <IoTrashOutline size={16} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginTop: 8
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: sf.accent, fontVariantNumeric: 'tabular-nums' }}>
                      {formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 0), currency)}
                    </span>
                    <QuantityStepper
                      value={item.quantity}
                      onChange={(next) => onQuantityChange(item, next)}
                      min={1}
                      removeAtMin
                      size="sm"
                      ariaLabel={`كمية ${item.name}`}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={onClear}
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: 'none',
                color: sf.muted,
                fontSize: 12,
                fontFamily: 'inherit',
                cursor: 'pointer',
                padding: '4px 0'
              }}
            >
              <IoTrashOutline size={14} />{t('إفراغ السلة')}</button>
          </div>

          {/* نوع الطلب */}
          {tableNumber ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                background: sf.accentSoft,
                border: `1px solid ${sf.border}`,
                borderRadius: sd.rCard,
                padding: '11px 14px',
                marginBottom: 18,
                color: sf.accent,
                fontSize: 13,
                fontWeight: 700
              }}
            >
              <IoRestaurantOutline size={17} /> {t('الطلب من الطاولة')}: {tableNumber}
            </div>
          ) : (
            availableOrderTypes.length > 1 && (
              <section style={{ marginBottom: 18 }}>
                <h4 style={sectionTitle}>{t('نوع الطلب')}</h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  {availableOrderTypes.map((type) => {
                    const active = orderType === type;
                    const meta = ORDER_TYPE_META[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => onOrderTypeChange(type)}
                        aria-pressed={active}
                        style={{
                          flex: 1,
                          minHeight: 46,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 7,
                          borderRadius: sd.rButton,
                          border: `1.5px solid ${active ? sf.accent : sf.border}`,
                          background: active ? sf.accentSoft : sf.surface,
                          color: active ? sf.accent : sf.muted,
                          fontSize: 12.5,
                          fontWeight: 800,
                          fontFamily: 'inherit',
                          cursor: 'pointer'
                        }}
                      >
                        {meta.icon}
                        {t(meta.label)}
                      </button>
                    );
                  })}
                </div>
              </section>
            )
          )}

          {extraSection}

          {/* بيانات الزبون — الطلب كضيف، بلا تسجيل دخول */}
          <section style={{ marginBottom: 18 }}>
            <h4 style={sectionTitle}>{t(customerTitle || 'بياناتك')}</h4>
            <div style={{ display: 'grid', gap: 10 }}>
              {fromAccount && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '11px 14px',
                    borderRadius: sd.rCard,
                    border: `1px solid ${sf.border}`,
                    background: sf.surface
                  }}
                >
                  <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                    <span style={{ color: sf.muted, fontSize: 12 }}>{t('يُرسَل الطلب باسم حسابك')}</span>
                    <span style={{ color: sf.text, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {accountName}
                      {accountPhone && (
                        <span style={{ color: sf.muted, fontWeight: 500, direction: 'ltr', unicodeBidi: 'isolate' }}> · {accountPhone}</span>
                      )}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setUseOtherContact(true)}
                    style={{ background: 'transparent', border: 'none', color: sf.accent, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    {t('بيانات أخرى')}
                  </button>
                </div>
              )}

              {showNameField && (
              <div>
                <label style={fieldLabel} htmlFor="sf-cart-name">
                  {t('الاسم')} {nameRequired && REQUIRED_MARK}
                </label>
                <input
                  id="sf-cart-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => onCustomerNameChange(e.target.value)}
                  placeholder={t('اسمك')}
                  autoComplete="name"
                  style={inputStyle}
                />
              </div>
              )}

              {showPhoneField && (
              <div>
                <label style={fieldLabel} htmlFor="sf-cart-phone">
                  {t('رقم الهاتف')} {phoneRequired && REQUIRED_MARK}
                </label>
                <input
                  id="sf-cart-phone"
                  type="tel"
                  inputMode="tel"
                  value={customerPhone}
                  onChange={(e) => onCustomerPhoneChange(e.target.value)}
                  placeholder="09xxxxxxxx"
                  autoComplete="tel"
                  style={{ ...inputStyle, direction: 'ltr', textAlign: 'start' }}
                />
              </div>
              )}

              {orderType === 'delivery' && deliveryFields}

              {orderType === 'delivery' && !deliveryFields && shippingZones.length > 0 && onGovernorateChange && (
                <div>
                  <label style={fieldLabel} htmlFor="sf-cart-governorate">
                    {t('المحافظة')} {REQUIRED_MARK}
                  </label>
                  <select
                    id="sf-cart-governorate"
                    value={governorate}
                    onChange={(e) => onGovernorateChange(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">{t('اختر المحافظة…')}</option>
                    {shippingZones.map((zone) => (
                      <option key={zone.governorate} value={zone.governorate}>
                        {/* الاسم الإنجليزي من الخادم لا من نسخةٍ في الواجهة:
                            أربع عشرة محافظة مكتوبة مرّتين تتفرّقان عند أوّل تعديل */}
                        {lang === 'en' && zone.nameEn ? zone.nameEn : zone.name}
                      </option>
                    ))}
                  </select>
                  {/* الأجرة والمدّة تُعرضان فور الاختيار: زبونٌ يكتشف أجرة
                      التوصيل في آخر سطر يتراجع عن الطلب */}
                  {selectedZone && (
                    <p style={{ color: sf.muted, fontSize: 12, margin: '7px 0 0', lineHeight: 1.8 }}>
                      {selectedZone.deliveryMode === 'shipping' ? t('شحن') : t('توصيل')}
                      {' · '}
                      {effectiveDeliveryFee > 0 ? formatPrice(effectiveDeliveryFee) : t('مجاني')}
                      {selectedZone.estimatedDays ? ` · خلال ${selectedZone.estimatedDays} يوم` : ''}
                      {selectedZone.freeOverAmount && effectiveDeliveryFee > 0
                        ? ` · مجاني فوق ${formatPrice(selectedZone.freeOverAmount)}`
                        : ''}
                    </p>
                  )}
                </div>
              )}

              {orderType === 'delivery' && !deliveryFields && onAddressChange && (
                <div>
                  <label style={fieldLabel} htmlFor="sf-cart-address">
                    {t('عنوان التوصيل')} {REQUIRED_MARK}
                  </label>
                  <textarea
                    id="sf-cart-address"
                    value={address}
                    onChange={(e) => onAddressChange(e.target.value)}
                    placeholder={t('الحي، الشارع، أقرب معلم...')}
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />

                  {onDeliveryLocationChange && (
                    <div style={{ marginTop: 10 }}>
                      <LocationPickerMap
                        value={deliveryLocation}
                        onChange={onDeliveryLocationChange}
                        fallbackCenter={businessLocation}
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={fieldLabel} htmlFor="sf-cart-notes">{t('ملاحظات على الطلب')}</label>
                <textarea
                  id="sf-cart-notes"
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value.slice(0, 300))}
                  placeholder={t('أي ملاحظة إضافية...')}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>
          </section>

          {/* طريقة الدفع — تظهر فقط حين يفعّل التاجر شام كاش */}
          {showPayment && shamCash && (
            <section style={{ marginBottom: 18 }}>
              <h4 style={sectionTitle}>{t('طريقة الدفع')}</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['cash', 'sham_cash'] as StorefrontPaymentMethod[]).map((method) => {
                  const active = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => onPaymentMethodChange?.(method)}
                      aria-pressed={active}
                      style={{
                        flex: 1,
                        minHeight: 46,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        borderRadius: sd.rButton,
                        border: `1.5px solid ${active ? sf.accent : sf.border}`,
                        background: active ? sf.accentSoft : sf.surface,
                        color: active ? sf.accent : sf.muted,
                        fontSize: 12.5,
                        fontWeight: 800,
                        fontFamily: 'inherit',
                        cursor: 'pointer'
                      }}
                    >
                      {method === 'cash' ? <IoCashOutline size={17} /> : <IoWalletOutline size={17} />}
                      {method === 'cash' ? t('نقداً عند الاستلام') : t('شام كاش')}
                    </button>
                  );
                })}
              </div>

              {paymentMethod === 'sham_cash' && (
                <div
                  style={{
                    marginTop: 10,
                    background: sf.surface,
                    border: `1px solid ${sf.border}`,
                    borderRadius: sd.rCard,
                    padding: '12px 14px',
                    display: 'grid',
                    gap: 7,
                    fontSize: 12.5,
                    color: sf.muted,
                    lineHeight: 1.8
                  }}
                >
                  <span>{t('حوّل الإجمالي إلى محفظة شام كاش التالية، وسيؤكّد المتجر الدفع عند استلامه:')}</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ color: sf.text, fontSize: 15, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                      {shamCash.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={copyAccount}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'transparent',
                        border: `1px solid ${sf.border}`,
                        borderRadius: sd.rButton,
                        color: copied ? '#4ADE80' : sf.text,
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        padding: '6px 11px',
                        cursor: 'pointer'
                      }}
                    >
                      {copied ? <IoCheckmarkCircle size={14} /> : <IoCopyOutline size={14} />}
                      {copied ? t('تم النسخ') : t('نسخ')}
                    </button>
                  </div>
                  {shamCash.accountName && (
                    <span>
                      {t('باسم')}: <strong style={{ color: sf.text }}>{shamCash.accountName}</strong>
                    </span>
                  )}
                  {shamCash.note && <span>{shamCash.note}</span>}
                </div>
              )}
            </section>
          )}

          {/* كوبون الخصم */}
          {onCouponApply && (
            <section style={{ marginBottom: 18 }}>
              <h4 style={sectionTitle}>{t('كوبون خصم')}</h4>
              {couponLoginRequired && !couponCode ? (
                <div
                  role="note"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '11px 14px',
                    borderRadius: sd.rCard,
                    border: `1px dashed ${sf.border}`,
                    background: sf.surface
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: sf.muted, fontSize: 13, lineHeight: 1.6 }}>
                    <IoTicketOutline size={16} style={{ flexShrink: 0 }} />
                    {t('الكوبونات للمسجّلين — سجّل الدخول لتستخدم كود الخصم')}
                  </span>
                  {onLoginRequest && (
                    <button
                      type="button"
                      onClick={onLoginRequest}
                      style={{
                        minHeight: 38,
                        padding: '0 14px',
                        borderRadius: sd.rButton,
                        border: 'none',
                        background: sf.accent,
                        color: sf.onAccent,
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {t('تسجيل الدخول')}
                    </button>
                  )}
                </div>
              ) : couponCode ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    background: 'rgba(74,222,128,0.1)',
                    border: '1px solid rgba(74,222,128,0.3)',
                    borderRadius: sd.rCard,
                    padding: '11px 14px'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#4ADE80', fontSize: 13, fontWeight: 700 }}>
                    <IoCheckmarkCircle size={17} /> {couponCode}
                  </span>
                  {onCouponRemove && (
                    <button
                      type="button"
                      onClick={onCouponRemove}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: sf.muted,
                        fontSize: 12,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >{t('إزالة')}</button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={t('أدخل الكود')}
                    style={{ ...inputStyle, flex: 1, direction: 'ltr', textAlign: 'start' }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={!couponInput.trim() || applyingCoupon}
                    aria-label={t('تطبيق الكوبون')}
                    style={{
                      minHeight: 46,
                      padding: '0 18px',
                      borderRadius: sd.rButton,
                      border: `1px solid ${sf.border}`,
                      background: sf.surface,
                      color: sf.text,
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      cursor: couponInput.trim() ? 'pointer' : 'not-allowed',
                      opacity: couponInput.trim() ? 1 : 0.6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      flexShrink: 0
                    }}
                  >
                    <IoTicketOutline size={15} />
                    {applyingCoupon ? '...' : t('تطبيق')}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* الملخّص */}
          <section
            style={{
              background: sf.surface,
              border: `1px solid ${sf.border}`,
              borderRadius: sd.rCard,
              padding: 14,
              display: 'grid',
              gap: 9
            }}
          >
            <SummaryRow label={t('المجموع الفرعي')} value={formatPrice(subtotal, currency)} />
            {discount > 0 && (
              <SummaryRow label={t('الخصم')} value={`- ${formatPrice(discount, currency)}`} accent="#4ADE80" />
            )}
            {orderType === 'delivery' && (
              <SummaryRow
                label={t('رسوم التوصيل')}
                value={effectiveDeliveryFee > 0 ? formatPrice(effectiveDeliveryFee, currency) : t('مجاني')}
              />
            )}
            <div style={{ height: 1, background: sf.border, margin: '3px 0' }} />
            <SummaryRow label={t('الإجمالي')} value={formatPrice(total, currency)} bold />
            {/* فترة الانتقال بعد حذف الصفرين — لا يرسم شيئاً خارجها */}
            <OldSypHint amount={total} currency={currency} style={{ textAlign: 'end', fontSize: 11.5 }} />
            {summaryExtra}
          </section>
        </>
      )}
    </BottomSheet>
  );
};

const SummaryRow: React.FC<{ label: string; value: string; bold?: boolean; accent?: string }> = ({
  label,
  value,
  bold,
  accent
}) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <span style={{ fontSize: bold ? 14 : 12.5, color: bold ? sf.text : sf.muted, fontWeight: bold ? 800 : 600 }}>
      {label}
    </span>
    <span
      style={{
        fontSize: bold ? 16 : 13,
        fontWeight: 800,
        color: accent || (bold ? sf.accent : sf.text),
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {value}
    </span>
  </div>
);

const sectionTitle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: 13.5,
  fontWeight: 800,
  color: sf.text
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 11.5,
  color: sf.muted,
  fontWeight: 600,
  marginBottom: 6
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 46,
  background: sf.surface,
  border: `1px solid ${sf.border}`,
  borderRadius: sd.rButton,
  padding: '11px 13px',
  color: sf.text,
  fontSize: 13.5,
  fontFamily: 'inherit',
  outline: 'none'
};

export default CartSheet;
