// frontend/src/components/storefront/MenuItemListCard.tsx
// بطاقة صنف أفقية مُحسّنة للجوال أولاً.

import React from 'react';
import {
  IoAdd,
  IoHeart,
  IoHeartOutline,
  IoTimeOutline,
  IoFlameOutline,
  IoOptionsOutline
} from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { formatPrice } from '@/utils/currency';
import { getImageUrl } from '@/utils/imageHelpers';
import QuantityStepper from './QuantityStepper';

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
  currency?: string;
  /** الكمية الحالية في السلة (0 = غير مضاف) */
  quantityInCart?: number;
  onAdd: (item: StorefrontMenuItem) => void;
  onQuantityChange?: (item: StorefrontMenuItem, next: number) => void;
  onOpenDetails?: (item: StorefrontMenuItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (item: StorefrontMenuItem) => void;
}

const DISCOUNT_RED = '#FF6B6B';

const hasOptions = (item: StorefrontMenuItem): boolean =>
  (item.sizes?.length || 0) > 0 || (item.addons?.length || 0) > 0;

const MenuItemListCard: React.FC<MenuItemListCardProps> = ({
  item,
  currency = 'SYP',
  quantityInCart = 0,
  onAdd,
  onQuantityChange,
  onOpenDetails,
  isFavorite = false,
  onToggleFavorite
}) => {
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
      style={{
        position: 'relative',
        display: 'flex',
        gap: 12,
        background: sf.card,
        border: `1px solid ${sf.border}`,
        borderRadius: 16,
        padding: 10,
        cursor: unavailable ? 'default' : onOpenDetails ? 'pointer' : 'default',
        opacity: unavailable ? 0.62 : 1,
        overflow: 'hidden'
      }}
    >
      {/* الصورة */}
      <div
        style={{
          position: 'relative',
          width: 104,
          height: 104,
          flexShrink: 0,
          borderRadius: 12,
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
            width={104}
            height={104}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              color: sf.muted,
              fontSize: 26
            }}
            aria-hidden="true"
          >
            🍽️
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
          >
            غير متوفر
          </div>
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
              borderRadius: 999
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
              fontSize: 14.5,
              fontWeight: 800,
              color: sf.text,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {item.name}
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
                borderRadius: 10,
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
                <IoFlameOutline size={11} /> الأكثر طلباً
              </span>
            )}
            {item.isNew && <span style={badgeStyle}>جديد</span>}
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: sf.accent, fontVariantNumeric: 'tabular-nums' }}>
              {formatPrice(finalPrice, currency)}
            </span>
            {hasDiscount && (
              <span
                style={{
                  fontSize: 11.5,
                  color: sf.muted,
                  textDecoration: 'line-through',
                  fontVariantNumeric: 'tabular-nums'
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
                    minWidth: 44,
                    height: 40,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    padding: withOptions ? '0 12px' : 0,
                    borderRadius: 12,
                    border: 'none',
                    background: sf.accent,
                    color: sf.onAccent,
                    fontSize: 12.5,
                    fontWeight: 800,
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  {withOptions ? (
                    <>
                      <IoOptionsOutline size={15} /> خيارات
                    </>
                  ) : (
                    <IoAdd size={20} />
                  )}
                  {quantityInCart > 0 && withOptions && (
                    <span
                      style={{
                        background: 'rgba(0,0,0,0.18)',
                        borderRadius: 999,
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
  border: `1px solid ${sf.border}`,
  color: sf.muted,
  borderRadius: 999,
  padding: '2px 8px',
  fontSize: 10.5,
  fontWeight: 700
};

export default React.memo(MenuItemListCard);
