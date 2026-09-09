// frontend/src/components/storefront/shells/LandingShell.tsx
//
// قالب «صفحة أقسام» — الصفحة الأولى **معرضٌ منسَّق** لا قائمة منتجات.
//
// **الفرق عن بقيّة القوالب:** الثلاثة الأخرى تعرض كل المنتجات في شبكةٍ
// واحدة وتترك للزبون أن يفرز. وهذا يعرض عليه مختاراتٍ مرتّبة: شريطُ فئات
// أوّلاً، ثمّ صفوفٌ معنونة — «الجديد»، «الحسومات»، «الأكثر مبيعاً» — لكلٍّ
// «عرض الكل»، ثمّ تعريفٌ بالمتجر.
//
// **لماذا صفوفٌ أفقية لا شبكات:** الصفّ يُظهر أربعة منتجات ويلمّح إلى
// خامس، فيدعو إلى السحب. والشبكة تُنهي القسم بصريّاً فينزل الزبون عنه.
// ومتجرٌ بعشرين منتجاً يبدو في هذا القالب أغنى ممّا يبدو في شبكةٍ تنتهي
// بعد صفّين.
//
// **ومتى تختفي المختارات:** حين يبحث الزبون أو يختار فئة. عندها يريد
// قائمةً كاملة لا عرضاً — فتُعرض `children` كما هي. والصفحة هي من تقرّر
// ذلك بإرسال `homeSections` فارغة.

import React from 'react';
import {
  IoSearchOutline,
  IoBagHandleOutline,
  IoHeartOutline,
  IoPersonOutline,
  IoChevronBack,
  IoStorefrontOutline
} from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import { useT } from '@/i18n/storefront';
import {
  IconAction,
  ContactChips,
  BranchChips,
  ScrollTopButton,
  useScrolledPast
} from '../ShopShellParts';
import type { ShopLayoutProps } from '../ShopLayout';

const LandingShell: React.FC<ShopLayoutProps> = ({
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
  homeSections = [],
  renderProduct,
  children,
  footer
}) => {
  const { t } = useT();
  const showTop = useScrolledPast(700);
  const curated = homeSections.length > 0 && !!renderProduct;

  return (
    <div style={{ background: sf.bg, minHeight: '100vh', fontFamily: sf.font, color: sf.text }} dir="rtl">
      {/* ===== شريطٌ نحيل دائم =====
          هذا القالب طويل بطبعه (صفوف وأقسام وتعريف)، والسلّة يجب أن تبقى
          في المتناول طوال النزول. فالشريط ملتصقٌ من البداية — بخلاف
          «بوتيك» و«معرض» حيث الصفحة الأولى قصيرة. */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: sf.bg,
          borderBottom: `${sd.borderW} solid ${sf.border}`,
          backdropFilter: 'blur(10px)'
        }}
      >
        <div className="shop-shell" style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56 }}>
          {logo ? (
            <img
              src={getImageUrl(sizedImage(logo, 'sm'))}
              alt=""
              width={34}
              height={34}
              style={{ width: 34, height: 34, borderRadius: sd.rImage, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : null}
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontWeight: 800,
              fontSize: 14.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <IconAction icon={<IoSearchOutline size={19} />} label={t('ابحث في المنتجات')} onClick={onSearchOpen} />
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
      </header>

      {/* ===== شريط الهوية ===== */}
      <section
        style={{
          position: 'relative',
          textAlign: 'center',
          padding: '26px 16px 22px',
          overflow: 'hidden',
          background: coverImage ? undefined : `linear-gradient(160deg, ${sf.primarySoft}, transparent 70%)`
        }}
      >
        {coverImage && (
          <>
            <img
              src={getImageUrl(coverImage)}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* حجابٌ كثيف: هذا شريط هويةٍ لا صورة بطل — النصّ هو المقصود */}
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${sf.overlay}, ${sf.bg})` }} />
          </>
        )}

        <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto' }}>
          {logo && (
            <img
              src={getImageUrl(sizedImage(logo, 'sm'))}
              alt=""
              width={72}
              height={72}
              style={{
                width: 72,
                height: 72,
                objectFit: 'cover',
                borderRadius: sd.rImage,
                border: `2px solid ${sf.accent}`,
                background: sf.surface,
                display: 'block',
                margin: '0 auto 12px'
              }}
            />
          )}
          <h1 style={{ margin: 0, fontSize: 'clamp(20px, 3.6vw, 26px)', fontWeight: 900 }}>{name}</h1>
          {description && (
            <p style={{ margin: '7px auto 0', maxWidth: 480, fontSize: 13, lineHeight: 1.85, color: sf.muted }}>
              {description}
            </p>
          )}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            <ContactChips phone={phone} whatsapp={whatsapp} tone="onSurface" />
          </div>
          {headerExtra && (
            <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
              {headerExtra}
            </div>
          )}
        </div>
      </section>

      <BranchChips branches={branches} />

      {/* ===== تسوّق حسب الفئة ===== */}
      {categories.length > 0 && (
        <section className="shop-shell" style={{ paddingTop: 8 }}>
          <SectionHead title={t('تسوّق حسب الفئة')} />
          <div
            className="no-scrollbar"
            style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}
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
                    width: 96,
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 7
                  }}
                >
                  <span
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: sd.rImage,
                      background: sf.card,
                      border: `2px solid ${active ? sf.accent : sf.border}`,
                      display: 'grid',
                      placeItems: 'center',
                      overflow: 'hidden',
                      color: active ? sf.accent : sf.muted,
                      fontWeight: 900,
                      fontSize: 26,
                      boxShadow: sd.shadowCard
                    }}
                  >
                    {category.image ? (
                      <img
                        src={getImageUrl(sizedImage(category.image, 'sm'))}
                        alt=""
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      category.name?.[0] || '•'
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: active ? 800 : 600,
                      color: active ? sf.text : sf.muted,
                      textAlign: 'center',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== الصفوف المنسّقة ===== */}
      {curated &&
        homeSections.map((section) => (
          <section key={section.key} className="shop-shell" style={{ paddingTop: 18 }}>
            <SectionHead
              title={section.title}
              action={
                section.onViewAll && (
                  <button
                    type="button"
                    onClick={section.onViewAll}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      background: 'none',
                      border: 'none',
                      color: sf.accent,
                      fontFamily: 'inherit',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {t('عرض الكل')}
                    <IoChevronBack size={13} />
                  </button>
                )
              }
            />
            {/* صفٌّ ينزلق: العرض ٤٦٪ على الجوال يُظهر منتجين ويلمّح إلى
                ثالث — وهو ما يدعو إلى السحب. والعرض الثابت يمنع البطاقة
                من الانكماش داخل الصفّ المرن */}
            <div
              className="no-scrollbar"
              style={{ display: 'flex', gap: 'var(--sf-gap, 12px)', overflowX: 'auto', paddingBottom: 4 }}
            >
              {section.items.map((product: any) => (
                <div
                  key={product.id}
                  style={{ flex: '0 0 auto', width: 'clamp(150px, 46vw, 210px)' }}
                >
                  {renderProduct!(product)}
                </div>
              ))}
            </div>
          </section>
        ))}

      {/* ===== التعريف بالمتجر =====
          بعد المنتجات لا قبلها: الزبون يقرّر بالمنتج ويطمئنّ بالتعريف. */}
      {curated && description && (
        <section className="shop-shell" style={{ paddingTop: 24 }}>
          <div
            style={{
              background: sf.card,
              border: `${sd.borderW} solid ${sf.border}`,
              borderRadius: sd.rCard,
              padding: 'var(--sf-pad-section, 16px)',
              boxShadow: sd.shadowCard
            }}
          >
            <h2
              style={{
                margin: '0 0 8px',
                fontSize: 15,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 7
              }}
            >
              <IoStorefrontOutline size={17} style={{ color: sf.accent }} />
              {t('من نحن')}
            </h2>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.95, color: sf.muted }}>{description}</p>
            {address && (
              <p style={{ margin: '10px 0 0', fontSize: 12.5, color: sf.muted, opacity: 0.85 }}>{address}</p>
            )}
            <div style={{ marginTop: 13 }}>
              <ContactChips phone={phone} whatsapp={whatsapp} tone="onSurface" />
            </div>
          </div>
        </section>
      )}

      {/* الشبكة الكاملة — عند البحث أو اختيار فئة، وتحت المختارات دائماً */}
      <main className="shop-shell" style={{ paddingBlock: curated ? '20px 110px' : '10px 110px' }}>
        {children}
      </main>

      {footer}
      <ScrollTopButton show={showTop} />
    </div>
  );
};

/** عنوان قسمٍ مع إجراءٍ اختياري على طرفه */
const SectionHead: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 11
    }}
  >
    <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: sf.text }}>{title}</h2>
    {action}
  </div>
);

export default LandingShell;
