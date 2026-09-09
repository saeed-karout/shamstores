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
  IoCheckmarkCircle
} from 'react-icons/io5';
import BottomSheet from './BottomSheet';
import LocationPickerMap, { PickedLocation } from './LocationPickerMap';

export interface ShippingZone {
  governorate: string;
  name: string;
  fee: number;
  freeOverAmount: number | null;
  estimatedDays: number | null;
  deliveryMode: 'driver' | 'shipping';
}
import QuantityStepper from './QuantityStepper';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { formatPrice } from '@/utils/currency';
import type { CurrencyInput } from '@/utils/currency';
import { getImageUrl } from '@/utils/imageHelpers';
import type { CartItem } from '@/services/types';
import { useT } from '@/i18n/storefront';

export type StorefrontOrderType = 'dine_in' | 'takeaway' | 'delivery';

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

  discount?: number;
  couponCode?: string;
  onCouponApply?: (code: string) => Promise<void> | void;
  onCouponRemove?: () => void;

  submitting?: boolean;
  onSubmit: () => void;
}

const REQUIRED_MARK = <span style={{ color: '#FF6B6B' }}>*</span>;

const ORDER_TYPE_META: Record<StorefrontOrderType, { label: string; icon: React.ReactNode }> = {
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
  discount = 0,
  couponCode,
  onCouponApply,
  onCouponRemove,
  submitting = false,
  onSubmit
}) => {
  const { t } = useT();
  const [couponInput, setCouponInput] = useState('');
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
  if (nameRequired && !customerName.trim()) missing.push('الاسم');
  if (phoneRequired && !customerPhone.trim()) missing.push('رقم الهاتف');
  if (addressRequired && !address.trim()) missing.push('عنوان التوصيل');
  // تُطلب فقط حين يضبط المتجر مناطقه — وإلا منعنا الطلب في متاجر لم تُهيّأ
  if (addressRequired && shippingZones.length > 0 && !governorate) missing.push('المحافظة');

  const canSubmit = missing.length === 0 && !submitting;

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
          السلة
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
      footer={
        <>
          {missing.length > 0 && items.length > 0 && (
            <div style={{ color: '#FBBF24', fontSize: 11.5, marginBottom: 9, textAlign: 'center' }}>
              أكمل: {missing.join('، ')}
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
            <span>{submitting ? 'جاري إرسال الطلب...' : 'تأكيد الطلب'}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatPrice(total, currency)}</span>
          </button>
        </>
      }
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
              <IoRestaurantOutline size={17} /> طلب من الطاولة رقم {tableNumber}
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
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            )
          )}

          {/* بيانات الزبون — الطلب كضيف، بلا تسجيل دخول */}
          <section style={{ marginBottom: 18 }}>
            <h4 style={sectionTitle}>{t('بياناتك')}</h4>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={fieldLabel} htmlFor="sf-cart-name">
                  الاسم {nameRequired && REQUIRED_MARK}
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

              <div>
                <label style={fieldLabel} htmlFor="sf-cart-phone">
                  رقم الهاتف {phoneRequired && REQUIRED_MARK}
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

              {orderType === 'delivery' && shippingZones.length > 0 && onGovernorateChange && (
                <div>
                  <label style={fieldLabel} htmlFor="sf-cart-governorate">
                    المحافظة {REQUIRED_MARK}
                  </label>
                  <select
                    id="sf-cart-governorate"
                    value={governorate}
                    onChange={(e) => onGovernorateChange(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">اختر المحافظة…</option>
                    {shippingZones.map((zone) => (
                      <option key={zone.governorate} value={zone.governorate}>
                        {zone.name}
                      </option>
                    ))}
                  </select>
                  {/* الأجرة والمدّة تُعرضان فور الاختيار: زبونٌ يكتشف أجرة
                      التوصيل في آخر سطر يتراجع عن الطلب */}
                  {selectedZone && (
                    <p style={{ color: sf.muted, fontSize: 12, margin: '7px 0 0', lineHeight: 1.8 }}>
                      {selectedZone.deliveryMode === 'shipping' ? 'شحن' : 'توصيل'}
                      {' · '}
                      {effectiveDeliveryFee > 0 ? formatPrice(effectiveDeliveryFee) : 'مجاني'}
                      {selectedZone.estimatedDays ? ` · خلال ${selectedZone.estimatedDays} يوم` : ''}
                      {selectedZone.freeOverAmount && effectiveDeliveryFee > 0
                        ? ` · مجاني فوق ${formatPrice(selectedZone.freeOverAmount)}`
                        : ''}
                    </p>
                  )}
                </div>
              )}

              {orderType === 'delivery' && onAddressChange && (
                <div>
                  <label style={fieldLabel} htmlFor="sf-cart-address">
                    عنوان التوصيل {REQUIRED_MARK}
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

          {/* كوبون الخصم */}
          {onCouponApply && (
            <section style={{ marginBottom: 18 }}>
              <h4 style={sectionTitle}>{t('كوبون خصم')}</h4>
              {couponCode ? (
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
                    {applyingCoupon ? '...' : 'تطبيق'}
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
                value={effectiveDeliveryFee > 0 ? formatPrice(effectiveDeliveryFee, currency) : 'مجاني'}
              />
            )}
            <div style={{ height: 1, background: sf.border, margin: '3px 0' }} />
            <SummaryRow label={t('الإجمالي')} value={formatPrice(total, currency)} bold />
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
