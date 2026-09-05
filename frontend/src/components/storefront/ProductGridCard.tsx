// frontend/src/components/storefront/ProductGridCard.tsx
//
// بطاقة منتج في شبكة المتجر.
//
// لماذا شبكة لا قائمة كواجهة المطعم: الزبون في المطعم يعرف ما يريد تقريباً
// ويقرأ الأسماء بحثاً عن صنف؛ وفي المتجر **يتصفّح بعينه**. القائمة الأفقية
// تعطي الصورة ثُمن المساحة، وهي أهمّ ما في المنتج. الشبكة تعطيها الصدارة.
//
// عمودان على الجوال لا واحد ولا ثلاثة: عمود واحد يُخفي المقارنة بين
// منتجين (والمقارنة هي فعل التسوّق نفسه)، وثلاثة تُصغّر الصورة حتى تصير
// بلا فائدة على شاشة ٣٧٥ بكسل.

import React from 'react';
import { IoHeart, IoHeartOutline, IoAddOutline, IoImageOutline } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { getImageUrl } from '@/utils/imageHelpers';
import { formatPrice } from '@/utils/currency';
import { getVisualBadges } from '@/utils/catalogBadges';
import QuantityStepper from './QuantityStepper';

export interface StorefrontProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  image?: string;
  images?: string[] | string | null;
  stock?: number | null;
  trackStock?: boolean | null;
  isPopular?: boolean | null;
  ordersCount?: number | null;
  createdAt?: string;
  badges?: any;
}

interface Props {
  product: StorefrontProduct;
  currency?: string;
  quantityInCart?: number;
  onAdd: (product: StorefrontProduct) => void;
  onQuantityChange: (product: StorefrontProduct, next: number) => void;
  onOpen?: (product: StorefrontProduct) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (product: StorefrontProduct) => void;
}

const BADGE_TONE: Record<string, { bg: string; color: string }> = {
  discount: { bg: '#FF6B6B', color: '#fff' },
  trending: { bg: 'rgba(0,0,0,0.62)', color: '#FFD166' },
  new: { bg: 'rgba(0,0,0,0.62)', color: '#8AE6B0' }
};

/** أول صورة صالحة: المنتجات الجديدة تحفظ مصفوفة، والقديمة حقلاً مفرداً */
const coverImage = (product: StorefrontProduct): string | null => {
  const { images, image } = product;
  if (Array.isArray(images) && images.length > 0) return images[0];
  if (typeof images === 'string' && images.trim()) {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {
      return images;
    }
  }
  return image || null;
};

const ProductGridCard: React.FC<Props> = ({
  product,
  currency = 'SYP',
  quantityInCart = 0,
  onAdd,
  onQuantityChange,
  onOpen,
  isFavorite,
  onToggleFavorite
}) => {
  const badges = getVisualBadges(product).slice(0, 2);
  const cover = coverImage(product);
  const src = cover ? getImageUrl(cover) : null;

  // النفاد يُعرض ولا يُخفى: منتج يختفي فجأة يجعل الزبون يظنّ الخطأ في عينه
  const tracked = product.trackStock === true;
  const outOfStock = tracked && (product.stock ?? 0) <= 0;

  const hasDiscount = badges.some((b) => b.key === 'discount');
  const original = Number(product.originalPrice || 0);

  return (
    <article
      style={{
        background: sf.card,
        border: `1px solid ${sf.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: outOfStock ? 0.62 : 1
      }}
    >
      {/* الصورة */}
      <div
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onClick={() => onOpen?.(product)}
        onKeyDown={(e) => {
          if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onOpen(product);
          }
        }}
        style={{
          // مربّع ثابت لا ارتفاع تابع للصورة.
          //
          // صور التجّار مختلفة الأبعاد، وبلا قالب موحّد تتفاوت ارتفاعات
          // البطاقات فتتكسّر الشبكة. و`padding-top: 100%` لا `aspect-ratio`
          // وحدها: المتصفحات القديمة تتجاهل الأخيرة فينهار الصندوق إلى
          // ارتفاع الصورة الطبيعي — وهو بالضبط ما نتجنّبه.
          position: 'relative',
          width: '100%',
          paddingTop: '100%',
          height: 0,
          overflow: 'hidden',
          background: sf.surface,
          cursor: onOpen ? 'pointer' : 'default'
        }}
      >
        {src ? (
          <img
            src={src}
            alt={product.name}
            loading="lazy"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: sf.muted }}>
            <IoImageOutline size={30} />
          </div>
        )}

        {/* الشارات */}
        <div style={{ position: 'absolute', top: 8, insetInlineStart: 8, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
          {badges.map((badge) => {
            const tone = BADGE_TONE[badge.tone] || BADGE_TONE.new;
            return (
              <span
                key={badge.key}
                style={{
                  background: tone.bg,
                  color: tone.color,
                  borderRadius: 7,
                  padding: '2px 7px',
                  fontSize: 10.5,
                  fontWeight: 800,
                  backdropFilter: 'blur(4px)'
                }}
              >
                {badge.label}
              </span>
            );
          })}
        </div>

        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(product);
            }}
            aria-label={isFavorite ? `إزالة ${product.name} من المفضلة` : `إضافة ${product.name} إلى المفضلة`}
            aria-pressed={!!isFavorite}
            style={{
              position: 'absolute',
              top: 6,
              insetInlineEnd: 6,
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.42)',
              color: isFavorite ? '#FF6B6B' : '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)'
            }}
          >
            {isFavorite ? <IoHeart size={16} /> : <IoHeartOutline size={16} />}
          </button>
        )}

        {outOfStock && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 13
            }}
          >
            نفدت الكمية
          </div>
        )}
      </div>

      {/* النص */}
      <div style={{ padding: '10px 11px 12px', display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
        <h3
          onClick={() => onOpen?.(product)}
          style={{
            cursor: onOpen ? 'pointer' : 'default',
            color: sf.text,
            fontSize: 13.5,
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.55,
            // سطران بالضبط: سطر واحد يبتر أسماء المنتجات الطويلة الشائعة،
            // وبلا حدّ تتفاوت ارتفاعات البطاقات
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
          title={product.name}
        >
          {product.name}
        </h3>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: sf.accent, fontWeight: 800, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
              {formatPrice(product.price, currency)}
            </div>
            {hasDiscount && original > product.price && (
              <div
                style={{
                  color: sf.muted,
                  fontSize: 11.5,
                  textDecoration: 'line-through',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {formatPrice(original, currency)}
              </div>
            )}
          </div>

          {outOfStock ? null : quantityInCart > 0 ? (
            <QuantityStepper
              value={quantityInCart}
              onChange={(next) => onQuantityChange(product, next)}
              size="sm"
              removeAtMin
              ariaLabel={`كمية ${product.name}`}
            />
          ) : (
            <button
              type="button"
              onClick={() => onAdd(product)}
              aria-label={`أضف ${product.name} إلى السلة`}
              style={{
                width: 34,
                height: 34,
                minWidth: 34,
                borderRadius: 11,
                border: 'none',
                background: sf.accent,
                color: sf.onAccent,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <IoAddOutline size={19} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductGridCard;
