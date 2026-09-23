// frontend/src/components/storefront/MenuItemListCard.tsx
// بطاقة صنف أفقية مُحسّنة للجوال أولاً.

import React from 'react';
import {
  IoAdd,
  IoHeart,
  IoHeartOutline,
  IoTimeOutline,
  IoFlameOutline,
  IoOptionsOutline,
  IoRestaurantOutline
} from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { formatPrice } from '@/utils/currency';
import type { CurrencyInput } from '@/utils/currency';
import { getImageUrl } from '@/utils/imageHelpers';
import QuantityStepper from './QuantityStepper';
import { useT } from '@/i18n/storefront';

export interface StorefrontMenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  /** السعر قبل الخصم — الاسم المستخدم في المخطط */
  originalPrice?: number | null;
  /** اسم بديل قادم من واجهات أقدم */
  discountedPrice?: number | null;
  image?: string;
  isAvailable?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  preparationTime?: number;
  calories?: number;
  sizes?: Array<{ name: string; price: number }>;
  addons?: Array<{ name: string; price: number }>;
}

export interface MenuItemListCardProps {
  item: StorefrontMenuItem;
  currency?: CurrencyInput;
  /** الكمية الحالية في السلة (0 = غير مضاف) */
  quantityInCart?: number;
  onAdd: (item: StorefrontMenuItem) => void;
  onQuantityChange?: (item: StorefrontMenuItem, next: number) => void;
  onOpenDetails?: (item: StorefrontMenuItem) => void;
  /**
   * رابط صفحة الصنف.
   *
   * زاحف جوجل يتبع `<a href>` ولا يضغط `div`. فكانت صفحات الأصناف موجودة
   * في التطبيق وغير مفهرسة — ونبّه تقرير Lighthouse: «لا يمكن الزحف إلى
   * الروابط».
   */
  href?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (item: StorefrontMenuItem) => void;
}

const DISCOUNT_RED = '#E5484D';

const hasOptions = (item: StorefrontMenuItem): boolean =>
  (item.sizes?.length || 0) > 0 || (item.addons?.length || 0) > 0;

const MenuItemListCard: React.FC<MenuItemListCardProps> = ({
  item,
  currency = 'SYP',
  quantityInCart = 0,
  onAdd,
  onQuantityChange,
  onOpenDetails,
  href,
  isFavorite = false,
  onToggleFavorite
}) => {
  const { t } = useT();
  const unavailable = item.isAvailable === false;
  // المخطط يخزّن السعر الحالي في price والسعر قبل الخصم في originalPrice
  const finalPrice = item.discountedPrice && item.discountedPrice > 0 ? item.discountedPrice : item.price;
  const beforePrice =
    item.originalPrice && item.originalPrice > finalPrice ? item.originalPrice : item.price;
  const hasDiscount = beforePrice > finalPrice;
  const withOptions = hasOptions(item);

  // البطاقة تفتح التفاصيل، والأزرار داخلها توقف الانتشار
  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <article
      onClick={() => !unavailable && onOpenDetails?.(item)}
      className="sf-lift"
      style={{
        position: 'relative',
        display: 'flex',
        gap: 14,
        background: sf.card,
        border: `1px solid ${sf.border}`,
        borderRadius: sd.rCard,
        boxShadow: sd.shadowCard,
        padding: 12,
        cursor: unavailable ? 'default' : onOpenDetails ? 'pointer' : 'default',
        opacity: unavailable ? 0.62 : 1,
        overflow: 'hidden'
      }}
    >
      {/* الصورة */}
      <div
        style={{
          position: 'relative',
          width: 112,
          height: 112,
          flexShrink: 0,
          borderRadius: sd.rImage,
          overflow: 'hidden',
          background: sf.surface
        }}
      >
        {item.image ? (
          <img
            src={getImageUrl(item.image)}
            alt={item.name}
            loading="lazy"
            decoding="async"
            width={112}
            height={112}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          // بلا صورة: لون المطعم الخفيف وأيقونة — لا رمزاً تعبيرياً يختلف شكله بين الأجهزة
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              color: sf.accent,
              background: `radial-gradient(120% 90% at 30% 20%, ${sf.card}, transparent 60%), ${sf.accentSoft}`
            }}
            aria-hidden="true"
          >
            <IoRestaurantOutline size={34} style={{ opacity: 0.55 }} />
          </div>
        )}

        {unavailable && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800
            }}
          >{t('غير متوفر')}</div>
        )}

        {hasDiscount && !unavailable && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              insetInlineStart: 6,
              background: DISCOUNT_RED,
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: sd.rChip
            }}
          >
            -{Math.round(((beforePrice - finalPrice) / beforePrice) * 100)}%
          </span>
        )}
      </div>

      {/* المحتوى */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <h3
            style={{
              flex: 1,
              minWidth: 0,
              margin: 0,
              fontSize: 15.5,
              fontWeight: 800,
              color: sf.text,
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {/* الرابط داخل العنوان لا حول البطاقة: البطاقة تحوي أزرار
                الكمية والمفضّلة، وتعشيق `button` في `a` غير صالح */}
            <a
              href={href || undefined}
              onClick={(e) => {
                // المفاتيح تُفحص أوّلاً: `preventDefault` بلا شرطٍ يكسر
                // Ctrl+نقر والنقر الأوسط، وهما ما يفعله من يقارن صنفين
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                if (e.button !== 0) return;
                if (unavailable || !onOpenDetails) return;
                e.preventDefault();
                e.stopPropagation();
                onOpenDetails(item);
              }}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {item.name}
            </a>
          </h3>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onToggleFavorite(item);
              }}
              aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              aria-pressed={isFavorite}
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: sd.rButton,
                border: 'none',
                background: 'transparent',
                color: isFavorite ? DISCOUNT_RED : sf.muted,
                cursor: 'pointer',
                padding: 0
              }}
            >
              {isFavorite ? <IoHeart size={18} /> : <IoHeartOutline size={18} />}
            </button>
          )}
        </div>

        {item.description && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: sf.muted,
              lineHeight: 1.65,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {item.description}
          </p>
        )}

        {/* شارات */}
        {(item.isPopular || item.isNew || item.preparationTime) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {item.isPopular && (
              <span style={badgeStyle}>
                <IoFlameOutline size={11} />{t('الأكثر طلباً')}</span>
            )}
            {item.isNew && <span style={badgeStyle}>{t('جديد')}</span>}
            {!!item.preparationTime && (
              <span style={badgeStyle}>
                <IoTimeOutline size={11} /> {item.preparationTime} د
              </span>
            )}
          </div>
        )}

        {/* السعر والإجراء */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}
        >
          {/* السعر لا ينكسر: «١٥٬٠٠٠» في سطر و«ل.س» في آخر كان يحدث مع الخصم.
              السعر القديم يلتفّ تحته بدل أن يضغطه */}
          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 7, rowGap: 0, minWidth: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: sf.accent, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatPrice(finalPrice, currency)}
            </span>
            {hasDiscount && (
              <span
                style={{
                  fontSize: 11.5,
                  color: sf.muted,
                  textDecoration: 'line-through',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap'
                }}
              >
                {formatPrice(beforePrice, currency)}
              </span>
            )}
          </div>

          {!unavailable && (
            <div onClick={stop} style={{ flexShrink: 0 }}>
              {quantityInCart > 0 && !withOptions && onQuantityChange ? (
                <QuantityStepper
                  value={quantityInCart}
                  onChange={(next) => onQuantityChange(item, next)}
                  min={1}
                  removeAtMin
                  size="sm"
                  ariaLabel={`كمية ${item.name}`}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onAdd(item)}
                  aria-label={withOptions ? `اختيار خيارات ${item.name}` : `إضافة ${item.name} إلى السلة`}
                  style={{
                    minWidth: 42,
                    height: 42,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    padding: withOptions ? '0 14px' : 0,
                    borderRadius: withOptions ? sd.rButton : 999,
                    border: 'none',
                    background: sf.accent,
                    color: sf.onAccent,
                    boxShadow: `0 6px 16px ${sf.shadow}`,
                    fontSize: 12.5,
                    fontWeight: 800,
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  {withOptions ? (
                    <>
                      <IoOptionsOutline size={15} />{t('خيارات')}</>
                  ) : (
                    <IoAdd size={20} />
                  )}
                  {quantityInCart > 0 && withOptions && (
                    <span
                      style={{
                        background: 'rgba(0,0,0,0.18)',
                        borderRadius: sd.rChip,
                        padding: '0 6px',
                        fontSize: 11
                      }}
                    >
                      {quantityInCart}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  background: sf.surface,
  border: 'none',
  color: sf.muted,
  borderRadius: sd.rChip,
  padding: '2px 8px',
  fontSize: 10.5,
  fontWeight: 700
};

export default React.memo(MenuItemListCard);
