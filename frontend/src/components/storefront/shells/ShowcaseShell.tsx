// frontend/src/components/storefront/shells/ShowcaseShell.tsx
//
// قالب «معرض» — الصفحة تبدأ بصورةٍ تملأ الشاشة، والتحكّم يطفو فوقها.
//
// **الفكرة:** لا شريط ولا بانر مقصوص. غلاف المتجر يأخذ أعلى الشاشة كاملاً
// (٦٢٪ من ارتفاعها)، واسمُه ووصفه في وسطه، والأزرار دوائر شفّافة تطفو في
// أعلاه. من يفتح الصفحة يرى صورةً لا واجهة إدارة.
//
// **ولماذا يظهر شريطٌ بعد ذلك:** الغلاف يغادر الشاشة بعد تمريرةٍ واحدة،
// ومعه السلّة والبحث. فينزل شريطٌ نحيل عند تجاوزه — لا قبله. وهذا الفرق
// هو القالب نفسه: البداية بلا واجهة، والاستمرار بواجهةٍ لا تُعيق.
//
// **والأقسام صورٌ عريضة لا دوائر صغيرة:** ٩:١٦ بعرض ١٩٠ بكسلاً واسمُ
// القسم فوقها. متجرٌ يبيع بالصورة يستحقّ أن تُعرض أقسامه بها.
//
// **متجاوب:** الغلاف يقصر على الجوال (٥٢vh) لئلّا يبتلع الشاشة كلّها،
// ويطول على اللابتوب. والأقسام تنزلق أفقياً في الحالين.

import React from 'react';
import { IoSearchOutline, IoBagHandleOutline, IoHeartOutline, IoPersonOutline } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import { useT } from '@/i18n/storefront';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import {
  IconAction,
  ContactChips,
  BranchChips,
  ScrollTopButton,
  useScrolledPast
} from '../ShopShellParts';
import type { ShopLayoutProps } from '../ShopLayout';

const ShowcaseShell: React.FC<ShopLayoutProps> = ({
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
  const isDesktop = useIsDesktop();
  // ٣٢٠ ≈ حين يبدأ الغلاف بالمغادرة — لا عند نهايته: الشريط الذي يظهر
  // متأخّراً يترك الزائر بلا سلّة لثانية
  const scrolled = useScrolledPast(320);
  const showTop = useScrolledPast(700);

  const actions = (floating: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: floating ? 8 : 6, flexShrink: 0 }}>
      <IconAction
        icon={<IoSearchOutline size={19} />}
        label={t('ابحث في المنتجات')}
        onClick={onSearchOpen}
        floating={floating}
      />
      <IconAction
        icon={<IoPersonOutline size={19} />}
        label={accountLabel}
        onClick={onAccountClick}
        floating={floating}
      />
      <IconAction
        icon={<IoHeartOutline size={19} />}
        label={t('المفضلة')}
        badge={favoritesCount}
        onClick={onFavoritesClick}
        floating={floating}
      />
      <IconAction
        icon={<IoBagHandleOutline size={19} />}
        label={t('السلة')}
        badge={cartCount}
        onClick={onCartClick}
        emphasis={!floating}
        floating={floating}
      />
    </div>
  );

  return (
    <div style={{ background: sf.bg, minHeight: '100vh', fontFamily: sf.font, color: sf.text }} dir="rtl">
      {/* ===== الشريط النحيل — بعد الغلاف فقط ===== */}
      <div
        style={{
          position: 'fixed',
          insetInline: 0,
          top: 0,
          zIndex: 45,
          background: `${sf.bg}`,
          borderBottom: `${sd.borderW} solid ${sf.border}`,
          backdropFilter: 'blur(10px)',
          transform: scrolled ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform .22s ease',
          // مخفيّ عن قارئ الشاشة وعن التنقّل بالمفاتيح ما دام خارج الشاشة
          visibility: scrolled ? 'visible' : 'hidden'
        }}
      >
        <div
          className="shop-shell"
          style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56 }}
        >
          {logo && (
            <img
              src={getImageUrl(sizedImage(logo, 'sm'))}
              alt=""
              width={32}
              height={32}
              style={{ width: 32, height: 32, borderRadius: sd.rImage, objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontWeight: 800,
              fontSize: 14,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {name}
          </span>
          {actions(false)}
        </div>
      </div>

      {/* ===== الغلاف ===== */}
      <header
        style={{
          position: 'relative',
          height: isDesktop ? 'min(62vh, 560px)' : 'min(52vh, 420px)',
          background: coverImage ? sf.surface : `linear-gradient(135deg, ${sf.primary}, ${sf.accent})`,
          overflow: 'hidden'
        }}
      >
        {coverImage && (
          <img
            src={getImageUrl(coverImage)}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        {/* حجابٌ متدرّج: النصّ فوق صورة تاجرٍ مجهولة الألوان يحتاج أرضية */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.88) 2%, rgba(0,0,0,0.5) 42%, rgba(0,0,0,0.24) 100%)'
          }}
        />

        {/* الأزرار الطافية — أعلى الغلاف، بلا شريطٍ تحتها */}
        <div
          style={{
            position: 'absolute',
            insetInline: 0,
            top: 0,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>{headerExtra}</div>
          {actions(true)}
        </div>

        {/* الهوية في أسفل الغلاف */}
        <div
          style={{
            position: 'absolute',
            insetInline: 0,
            bottom: 0,
            padding: '0 18px 22px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 14
          }}
        >
          {logo && (
            <img
              src={getImageUrl(sizedImage(logo, 'sm'))}
              alt=""
              width={64}
              height={64}
              style={{
                width: 64,
                height: 64,
                objectFit: 'cover',
                borderRadius: sd.rImage,
                border: `2px solid rgba(255,255,255,0.55)`,
                flexShrink: 0,
                background: sf.surface
              }}
            />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(22px, 4.2vw, 38px)',
                fontWeight: 900,
                color: '#fff',
                textShadow: '0 2px 16px rgba(0,0,0,0.6)',
                lineHeight: 1.25
              }}
            >
              {name}
            </h1>
            {description && (
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 'clamp(12.5px, 1.5vw, 15px)',
                  color: 'rgba(255,255,255,0.9)',
                  lineHeight: 1.75,
                  maxWidth: 620,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {description}
              </p>
            )}
            <div style={{ marginTop: 11 }}>
              <ContactChips phone={phone} whatsapp={whatsapp} address={address} tone="onImage" />
            </div>
          </div>
        </div>
      </header>

      <BranchChips branches={branches} />

      {/* ===== الأقسام: صورٌ عريضة تنزلق ===== */}
      {categories.length > 0 && (
        <nav
          className="shop-shell no-scrollbar"
          aria-label={t('أقسام المتجر')}
          style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBlock: 18 }}
        >
          {categories.map((category) => {
            const active = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategorySelect?.(category.id)}
                aria-pressed={active}
                style={{
                  flex: '0 0 auto',
                  width: 190,
                  aspectRatio: '16 / 9',
                  position: 'relative',
                  padding: 0,
                  border: `2px solid ${active ? sf.accent : 'transparent'}`,
                  borderRadius: sd.rCard,
                  overflow: 'hidden',
                  background: sf.card,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: sd.shadowCard
                }}
              >
                {category.image ? (
                  <img
                    src={getImageUrl(sizedImage(category.image, 'sm'))}
                    alt=""
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, ${sf.surface}, ${sf.card})`
                    }}
                  />
                )}
                <span
                  style={{
                    position: 'absolute',
                    insetInline: 0,
                    bottom: 0,
                    padding: '18px 10px 9px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                    textAlign: 'start',
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {category.name}
                  {typeof category.count === 'number' && (
                    <span style={{ opacity: 0.75, fontWeight: 500, marginInlineStart: 6, fontSize: 11.5 }}>
                      {category.count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      <main className="shop-shell" style={{ paddingBlock: '4px 110px' }}>
        {children}
      </main>

      {footer}
      <ScrollTopButton show={showTop} />
    </div>
  );
};

export default ShowcaseShell;
