// frontend/src/components/storefront/shells/BoutiqueShell.tsx
//
// قالب «بوتيك» — **بلا شريط علوي**.
//
// **الفكرة:** المتجر الصغير هويةٌ قبل أن يكون كتالوجاً. فبدل شريطٍ
// وظيفيّ يتصدّر الصفحة، تبدأ بالشعار في الوسط ثمّ الاسم ثمّ سطرٍ يقول ما
// هذا المتجر، ثمّ طرق التواصل. الزائر يعرف أين هو قبل أن يرى منتجاً —
// وهو ما يحتاجه من يصل من رابطٍ في إنستغرام لا من بحثٍ عن منتجٍ بعينه.
//
// **وما لا يُضحّى به:** السلّة والبحث. الحلّ أن يظهرا حين يُحتاجان: صفّ
// الأقسام يلتصق بأعلى الشاشة عند التمرير، وتنضمّ إليه أيقونات السلّة
// والمفضلة والحساب حين يغيب قسم الهوية عن الشاشة. فلا شريط في البداية،
// ولا فقدانَ للسلّة بعد ذلك.
//
// **ومتجاوب:** كل شيء في عمودٍ واحد على الجوال بعرضٍ محدود على اللابتوب —
// هوية ممتدّة إلى ١٤٠٠ بكسل تبدو لافتةً لا متجراً.

import React from 'react';
import { IoSearchOutline, IoBagHandleOutline, IoHeartOutline, IoPersonOutline } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import { useT } from '@/i18n/storefront';
import {
  IconAction,
  ContactChips,
  BranchChips,
  CategoryChips,
  ScrollTopButton,
  useScrolledPast
} from '../ShopShellParts';
import type { ShopLayoutProps } from '../ShopLayout';

const BoutiqueShell: React.FC<ShopLayoutProps> = ({
  name,
  description,
  logo,
  coverImage,
  phone,
  whatsapp,
  address,
  branches = [],
  categories = [],
  activeCategory,
  onCategorySelect,
  cartCount = 0,
  onCartClick,
  favoritesCount = 0,
  onFavoritesClick,
  onAccountClick,
  accountLabel = 'حسابي',
  headerExtra,
  searchValue = '',
  onSearchChange,
  onSearchOpen,
  children,
  footer
}) => {
  const { t } = useT();
  // ٢٤٠ بكسلاً ≈ ارتفاع كتلة الهوية: عندها تكون قد غادرت الشاشة فتحلّ
  // الأيقونات محلّها في الصفّ الملتصق
  const scrolled = useScrolledPast(240);
  const showTop = useScrolledPast(700);

  return (
    <div style={{ background: sf.bg, minHeight: '100vh', fontFamily: sf.font, color: sf.text }} dir="rtl">
      {/* ===== الغلاف =====
          كان القالب لا يستقبل صورة الغلاف أصلاً: يرفعها التاجر من إعداداته
          فتظهر في كل القوالب إلا هذا. هنا تتصدّر الصفحة بإطارٍ مستدير،
          ويجلس الشعار على حافّتها السفلى — هويةٌ فوق صورة لا بدلها. */}
      {coverImage && (
        <div className="shop-shell" style={{ paddingTop: 12 }}>
          <div
            style={{
              position: 'relative',
              height: 'clamp(160px, 30vw, 320px)',
              borderRadius: sd.rCard,
              overflow: 'hidden',
              background: sf.surface,
              boxShadow: sd.shadowCard
            }}
          >
            <img
              src={getImageUrl(coverImage)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.28), transparent 55%)'
              }}
            />
          </div>
        </div>
      )}

      {/* ===== الهوية — في الوسط، بلا شريط ===== */}
      <header style={{ padding: coverImage ? '0 16px 4px' : '26px 16px 4px' }}>
        <div
          style={{
            maxWidth: 620,
            margin: '0 auto',
            textAlign: 'center',
            // الشعار يعلو حافّة الغلاف بنصفه
            marginTop: coverImage ? -52 : 0,
            position: 'relative'
          }}
        >
          {logo ? (
            <img
              src={getImageUrl(sizedImage(logo, 'sm'))}
              alt=""
              width={96}
              height={96}
              style={{
                width: 96,
                height: 96,
                objectFit: 'cover',
                // الشعار دائرةٌ هنا مهما كان القالب: كتلة هويةٍ في الوسط
                // بشعارٍ مربّع تقرأ كبطاقةٍ لا كعلامة
                borderRadius: '50%',
                border: `3px solid ${coverImage ? sf.bg : sf.accent}`,
                boxShadow: coverImage ? `0 0 0 2px ${sf.accent}, 0 8px 24px rgba(0,0,0,0.18)` : undefined,
                background: sf.surface,
                display: 'block',
                margin: '0 auto'
              }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                margin: '0 auto',
                background: sf.accent,
                color: sf.onAccent,
                display: 'grid',
                placeItems: 'center',
                fontSize: 38,
                fontWeight: 900,
                border: coverImage ? `4px solid ${sf.bg}` : undefined
              }}
            >
              {name?.[0] || 'م'}
            </div>
          )}

          <h1
            style={{
              margin: '14px 0 0',
              fontSize: 'clamp(21px, 4vw, 28px)',
              fontWeight: 900,
              color: sf.text,
              letterSpacing: '-0.01em'
            }}
          >
            {name}
          </h1>

          {description && (
            <p
              style={{
                margin: '8px auto 0',
                maxWidth: 480,
                fontSize: 13.5,
                lineHeight: 1.9,
                color: sf.muted
              }}
            >
              {description}
            </p>
          )}

          <div style={{ marginTop: 16 }}>
            <ContactChips phone={phone} whatsapp={whatsapp} address={address} tone="onSurface" round />
          </div>

          {address && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: sf.muted, opacity: 0.85 }}>{address}</p>
          )}

        </div>
      </header>

      <BranchChips branches={branches} />

      {/* ===== الصفّ الملتصق: بحث + أقسام + (أيقونات عند التمرير) ===== */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: sf.bg,
          borderBottom: scrolled ? `${sd.borderW} solid ${sf.border}` : 'none',
          backdropFilter: 'blur(10px)',
          paddingTop: 12,
          transition: 'border-color .2s'
        }}
      >
        <div className="shop-shell" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* حقل البحث هو بطل هذا الصفّ: من يصل من رابطٍ اجتماعيّ يبحث
                عن منتجٍ رآه في منشور، لا يتصفّح الأقسام */}
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <IoSearchOutline
                size={17}
                style={{
                  position: 'absolute',
                  insetInlineStart: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: sf.muted,
                  pointerEvents: 'none'
                }}
              />
              <input
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onFocus={() => {
                  // على الجوال يفتح لوح البحث بملء الشاشة — الكتابة في
                  // حقلٍ يعلوه المحتوى تُخفي النتائج تحت لوحة المفاتيح
                  if (!onSearchChange) onSearchOpen?.();
                }}
                placeholder={t('ابحث في المنتجات…')}
                aria-label={t('ابحث في المنتجات')}
                style={{
                  width: '100%',
                  minHeight: 44,
                  padding: '0 42px',
                  borderRadius: sd.rChip,
                  border: `${sd.borderW} solid ${sf.border}`,
                  background: sf.surface,
                  color: sf.text,
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* الأيقونات ظاهرةٌ دائماً.
                كانت تدخل عند التمرير وحده، لكن ذلك يعني سلّةً لا تُرى في
                أوّل شاشة — وهي ما يعود إليه الزبون. والعرض بلا نقرٍ أسوأ
                من الاثنين: `pointerEvents` كان يبقى مقيّداً بعد فتح
                الظهور، فتظهر أزرارٌ لا تستجيب. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0
              }}
            >
              {/* اللغة والعملة مع أيقونات الصفّ الملتصق — كانتا تحت الهوية
                  فتغيبان عن الشاشة بعد أوّل تمرير */}
              {headerExtra}
              <IconAction icon={<IoPersonOutline size={19} />} label={accountLabel} onClick={onAccountClick} />
              <IconAction
                icon={<IoHeartOutline size={19} />}
                label={t('المفضلة')}
                badge={favoritesCount}
                onClick={onFavoritesClick}
              />
              <IconAction
                icon={<IoBagHandleOutline size={19} />}
                label={t('السلة')}
                badge={cartCount}
                onClick={onCartClick}
                emphasis
              />
            </div>
          </div>

          <CategoryChips
            categories={categories}
            activeCategory={activeCategory}
            onSelect={onCategorySelect}
          />
        </div>
      </div>

      <main className="shop-shell" style={{ paddingBlock: '14px 110px' }}>
        {children}
      </main>

      {footer}
      <ScrollTopButton show={showTop} />
    </div>
  );
};

export default BoutiqueShell;
