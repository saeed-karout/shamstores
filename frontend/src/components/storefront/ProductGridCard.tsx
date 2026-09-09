// frontend/src/components/storefront/ProductGridCard.tsx
//
// بطاقة منتج في شبكة المتجر — بثلاثة نماذج يختارها التاجر.
//
// لماذا شبكة لا قائمة كواجهة المطعم: الزبون في المطعم يعرف ما يريد تقريباً
// ويقرأ الأسماء بحثاً عن صنف؛ وفي المتجر **يتصفّح بعينه**. القائمة الأفقية
// تعطي الصورة ثُمن المساحة، وهي أهمّ ما في المنتج. الشبكة تعطيها الصدارة.
//
// عمودان على الجوال لا واحد ولا ثلاثة: عمود واحد يُخفي المقارنة بين
// منتجين (والمقارنة هي فعل التسوّق نفسه)، وثلاثة تُصغّر الصورة حتى تصير
// بلا فائدة على شاشة ٣٧٥ بكسل.
//
// **النماذج الثلاثة اختلافُ هيكل لا اختلاف قياس:**
//   • `standard` — صورة مربّعة ثمّ نصّ تحتها. الأوضح للأسماء الطويلة.
//   • `overlay`  — النصّ فوق الصورة بتدرّج. أجمل للصور القوية، وأخطر على
//                  النصّ الطويل؛ ولذلك يُقصّ إلى سطرٍ واحد فيه.
//   • `compact`  — صورة بنسبة ٤:٣ ونصّ مضغوط، لعرض منتجاتٍ أكثر في الشاشة.
//
// أمّا الاستدارات والظلال والحشوات فمن رموز `sd` — يبدّلها التاجر من
// لوحته فتتبدّل هنا بلا سطرٍ يُكتب.

import React from 'react';
import { IoHeart, IoHeartOutline, IoAddOutline, IoImageOutline } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { useDesign } from '@/utils/storefrontDesignContext';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import { formatPrice } from '@/utils/currency';
import type { CurrencyInput } from '@/utils/currency';
import { getVisualBadges } from '@/utils/catalogBadges';
import QuantityStepper from './QuantityStepper';
import { useT } from '@/i18n/storefront';

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
  currency?: CurrencyInput;
  quantityInCart?: number;
  onAdd: (product: StorefrontProduct) => void;
  onQuantityChange: (product: StorefrontProduct, next: number) => void;
  onOpen?: (product: StorefrontProduct) => void;
  /**
   * رابط صفحة المنتج.
   *
   * **لماذا رابطٌ حقيقيّ لا `onClick` وحده:** زاحف جوجل يتبع `<a href>` ولا
   * يضغط `div`. فكانت صفحات المنتجات موجودة في التطبيق وغير مفهرسة —
   * ونبّه تقرير Lighthouse: «لا يمكن الزحف إلى الروابط».
   *
   * ويكسب الزبون معه ما يتوقّعه من أي متجر: فتحٌ في لسانٍ جديد، ونسخُ
   * الرابط، وزرُّ الرجوع.
   */
  href?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (product: StorefrontProduct) => void;
}

/**
 * نقرةٌ تفتح النافذة السريعة — إلا حين يقصد الزبون لساناً جديداً.
 *
 * `preventDefault` بلا شرطٍ يكسر Ctrl+نقر والنقر الأوسط، وهما ما يفعله من
 * يقارن منتجين. فالمفاتيح تُفحص أوّلاً ويُترك المتصفّح يتصرّف.
 */
const openInPlace = (event: React.MouseEvent, handler?: () => void): void => {
  if (!handler) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (event.button !== 0) return;
  event.preventDefault();
  handler();
};

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
  href,
  isFavorite,
  onToggleFavorite
}) => {
  const { t } = useT();
  const { card: variant } = useDesign();
  const badges = getVisualBadges(product).slice(0, 2);
  const cover = coverImage(product);
  // النسخة الصغيرة تكفي بطاقةً عرضها مئتا بكسل — الكبيرة تُنزَّل بلا أن
  // يظهر منها شيء إضافي
  const src = cover ? getImageUrl(sizedImage(cover, 'sm')) : null;

  // النفاد يُعرض ولا يُخفى: منتج يختفي فجأة يجعل الزبون يظنّ الخطأ في عينه
  const tracked = product.trackStock === true;
  const outOfStock = tracked && (product.stock ?? 0) <= 0;
  const hasDiscount = badges.some((b) => b.key === 'discount');
  const original = Number(product.originalPrice || 0);

  const isOverlay = variant === 'overlay';
  const isCompact = variant === 'compact';

  // نسبة الصورة: مربّع للقياسي وللغطاء، و٤:٣ للمضغوط ليدخل صفٌّ أطول
  const aspect = isCompact ? '75%' : '100%';

  const title = (
    <a
      href={href || undefined}
      onClick={(e) => openInPlace(e, onOpen ? () => onOpen(product) : undefined)}
      style={{ color: 'inherit', textDecoration: 'none', cursor: onOpen || href ? 'pointer' : 'default' }}
    >
      {product.name}
    </a>
  );

  const price = (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          color: isOverlay ? '#fff' : sf.accent,
          fontWeight: 800,
          fontSize: isCompact ? 13 : 14,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {formatPrice(product.price, currency)}
      </div>
      {hasDiscount && original > product.price && (
        <div
          style={{
            color: isOverlay ? 'rgba(255,255,255,0.72)' : sf.muted,
            fontSize: 11.5,
            textDecoration: 'line-through',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {formatPrice(original, currency)}
        </div>
      )}
    </div>
  );

  const addControl = outOfStock ? null : quantityInCart > 0 ? (
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
        // الاستدارة من رمز الأزرار: القالب «الجريء» يجعلها دائرة كاملة
        // والقالب «البسيط» مربّعاً مستدير الأركان قليلاً
        borderRadius: sd.rButton,
        border: 'none',
        background: sf.accent,
        color: sf.onAccent,
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        boxShadow: isOverlay ? sd.shadowPop : undefined
      }}
    >
      <IoAddOutline size={19} />
    </button>
  );

  return (
    <article
      style={{
        background: isOverlay ? sf.surface : sf.card,
        border: `${sd.borderW} solid ${sf.border}`,
        borderRadius: sd.rCard,
        boxShadow: sd.shadowCard,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
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
          // نسبةٌ ثابتة لا ارتفاع تابع للصورة.
          //
          // صور التجّار مختلفة الأبعاد، وبلا قالب موحّد تتفاوت ارتفاعات
          // البطاقات فتتكسّر الشبكة. و`padding-top` لا `aspect-ratio`
          // وحدها: المتصفحات القديمة تتجاهل الأخيرة فينهار الصندوق إلى
          // ارتفاع الصورة الطبيعي — وهو بالضبط ما نتجنّبه.
          position: 'relative',
          width: '100%',
          paddingTop: isOverlay ? '128%' : aspect,
          height: 0,
          overflow: 'hidden',
          // الصورة تأخذ استدارتها الخاصّة في النموذج القياسي والمضغوط،
          // وفي نموذج الغطاء تملأ البطاقة فترث استدارتها منها
          borderRadius: isOverlay ? 0 : `calc(${sd.rCard} - ${sd.borderW}) calc(${sd.rCard} - ${sd.borderW}) 0 0`,
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
        <div
          style={{
            position: 'absolute',
            top: 8,
            insetInlineStart: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            alignItems: 'flex-start'
          }}
        >
          {badges.map((badge) => {
            const tone = BADGE_TONE[badge.tone] || BADGE_TONE.new;
            return (
              <span
                key={badge.key}
                style={{
                  background: tone.bg,
                  color: tone.color,
                  borderRadius: sd.rChip,
                  padding: '2px 8px',
                  fontSize: 10.5,
                  fontWeight: 800,
                  backdropFilter: 'blur(4px)'
                }}
              >
                {t(badge.label)}
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
              // القلب يبقى دائرةً في كل القوالب: زرٌّ أيقونيّ مربّع في
              // زاوية صورة يقرأ كأنه جزءٌ منها لا عنصر تحكّم
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
            {t('نفدت الكمية')}
          </div>
        )}

        {/* نموذج الغطاء: النصّ داخل الصورة على تدرّج.
            التدرّج ليس زينة — نصٌّ أبيض على صورةٍ فاتحة لا يُقرأ، وهو
            يضمن التباين أيّاً كانت صورة التاجر. */}
        {isOverlay && (
          <div
            style={{
              position: 'absolute',
              insetInline: 0,
              bottom: 0,
              padding: `26px ${sd.padCard} ${sd.padCard}`,
              background: 'linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.55) 52%, transparent 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 7
            }}
          >
            <h3
              style={{
                color: '#fff',
                fontSize: 13.5,
                fontWeight: 700,
                margin: 0,
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
              title={product.name}
            >
              {title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
              {price}
              {addControl}
            </div>
          </div>
        )}
      </div>

      {/* النصّ تحت الصورة — للنموذجين الآخرين */}
      {!isOverlay && (
        <div
          style={{
            padding: `calc(${sd.padCard} - 2px) ${sd.padCard} ${sd.padCard}`,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: 6
          }}
        >
          {/* **العنوان رابطٌ حقيقيّ لا الصورة.** زرّ المفضّلة داخل كتلة
              الصورة، وتعشيق `button` في `a` غير صالح ويكسر قارئات الشاشة.
              ورابطٌ واحد في البطاقة يكفي الزاحف. */}
          <h3
            style={{
              color: sf.text,
              fontSize: isCompact ? 12.5 : 13.5,
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.55,
              // سطران بالضبط: سطر واحد يبتر أسماء المنتجات الطويلة الشائعة،
              // وبلا حدّ تتفاوت ارتفاعات البطاقات
              display: '-webkit-box',
              WebkitLineClamp: isCompact ? 1 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
            title={product.name}
          >
            {title}
          </h3>

          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            {price}
            {addControl}
          </div>
        </div>
      )}
    </article>
  );
};

export default ProductGridCard;
