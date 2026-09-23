// frontend/src/components/storefront/StorefrontLayout.tsx
//
// هيكل واجهة المطعم: غلافٌ بعرض الشاشة عليه الهوية، ثمّ التواصل والأقسام
// والمحتوى، ورأسٌ زجاجيّ مصغّر يظهر عند التمرير.
//
// **الاسم فوق الغلاف لا تحته في بطاقة:** الصورة هي أوّل ما يبيع الطعام، وبطاقة
// الهوية المعلّقة تحتها كانت تقطعها وتكرّر ما يقوله الغلاف. والحاوية تتّسع
// على الحاسوب (١١٢٠) بعد أن كانت عموداً بعرض الجوال (٦٤٠) وسط شاشةٍ فارغة.

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IoCallOutline,
  IoLogoWhatsapp,
  IoLocationOutline,
  IoBagHandleOutline,
  IoChevronDown,
  IoArrowUp,
  IoRestaurantOutline
} from 'react-icons/io5';
import { sf, sfBrandGradient, sfBrandPattern } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import { useT } from '@/i18n/storefront';

export interface StorefrontBranch {
  id: string;
  name: string;
  url?: string;
  label?: string;
  isCurrent?: boolean;
}

export interface StorefrontLayoutProps {
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  branchLabel?: string;
  branches?: StorefrontBranch[];

  /** يُعرض تحت التواصل (شريط تسويقي رفيع) */
  marketingStrip?: React.ReactNode;
  /** شريط الفئات الملتصق */
  stickyNav?: React.ReactNode;
  /** إجراءات إضافية في الرأس المصغّر (بحث، ترتيب...) */
  headerActions?: React.ReactNode;

  cartCount?: number;
  onCartClick?: () => void;

  children: React.ReactNode;
  footer?: React.ReactNode;
}

const MINI_HEADER_HEIGHT = 60;
/** عرض المحتوى — تستعمله الصفحة ليتطابق شريط الأدوات مع الحاوية */
export const STOREFRONT_MAX_WIDTH = 1120;
export const STOREFRONT_GUTTER = 16;

const StorefrontLayout: React.FC<StorefrontLayoutProps> = ({
  name,
  description,
  logo,
  coverImage,
  phone,
  whatsapp,
  address,
  branchLabel,
  branches = [],
  marketingStrip,
  stickyNav,
  headerActions,
  cartCount = 0,
  onCartClick,
  children,
  footer
}) => {
  const { t } = useT();
  const [showMiniHeader, setShowMiniHeader] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        setShowMiniHeader(y > 260);
        setShowScrollTop(y > 900);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const otherBranches = branches.filter((b) => !b.isCurrent);
  const waNumber = whatsapp ? String(whatsapp).replace(/[^0-9]/g, '') : '';

  return (
    <div style={{ background: sf.bg, minHeight: '100vh', fontFamily: sf.font, color: sf.text }} dir="rtl">
      {/* ==================== الرأس المصغّر ==================== */}
      <AnimatePresence>
        {showMiniHeader && (
          <motion.header
            initial={{ y: -MINI_HEADER_HEIGHT, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -MINI_HEADER_HEIGHT, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              insetInline: 0,
              top: 0,
              zIndex: 50,
              height: MINI_HEADER_HEIGHT,
              background: sf.overlay,
              borderBottom: `1px solid ${sf.border}`,
              backdropFilter: 'saturate(170%) blur(18px)',
              WebkitBackdropFilter: 'saturate(170%) blur(18px)'
            }}
          >
            <div
              style={{
                maxWidth: STOREFRONT_MAX_WIDTH,
                margin: '0 auto',
                height: '100%',
                padding: `0 ${STOREFRONT_GUTTER}px`,
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <LogoMark logo={logo} name={name} size={36} />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '38%'
                }}
              >
                {name}
              </span>

              <div style={{ flex: 1 }} />
              {headerActions}

              {onCartClick && (
                <button type="button" onClick={onCartClick} aria-label={`${t('السلة')} (${cartCount})`} style={roundButton}>
                  <IoBagHandleOutline size={19} />
                  {cartCount > 0 && <span style={countBadge}>{cartCount}</span>}
                </button>
              )}
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ==================== الغلاف ==================== */}
      <header
        style={{
          position: 'relative',
          width: '100%',
          // الصورة تستحقّ المساحة؛ بلا صورة يكفي شريطٌ أقصر لا كتلةٌ صمّاء
          height: coverImage ? 'clamp(280px, 62vw, 440px)' : 'clamp(230px, 46vw, 300px)',
          overflow: 'hidden',
          background: sfBrandGradient,
          color: '#fff'
        }}
      >
        {coverImage ? (
          <img
            src={getImageUrl(coverImage)}
            alt=""
            // @ts-expect-error — سمة قياسية لم تُضَف بعد إلى تعريفات React
            fetchpriority="high"
            decoding="async"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          // بلا غلاف: نقشٌ خفيف فوق تدرّج لون المطعم بدل مساحةٍ صمّاء
          <div aria-hidden="true" style={sfBrandPattern as React.CSSProperties} />
        )}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            // الصورة تحتاج تعتيماً ليُقرأ الاسم فوقها؛ التدرّج اللونيّ يكفيه ظلٌّ خفيف
            background: coverImage
              ? 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.08) 100%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 60%)'
          }}
        />

        <div
          style={{
            position: 'absolute',
            insetInline: 0,
            bottom: 0,
            maxWidth: STOREFRONT_MAX_WIDTH,
            margin: '0 auto',
            padding: `0 ${STOREFRONT_GUTTER}px 26px`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <LogoMark logo={logo} name={name} size={72} ring />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(24px, 5.4vw, 40px)',
                  fontWeight: 900,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                  textShadow: '0 2px 18px rgba(0,0,0,0.25)'
                }}
              >
                {name}
              </h1>
              {description && (
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 'clamp(13px, 1.6vw, 15.5px)',
                    lineHeight: 1.7,
                    color: 'rgba(255,255,255,0.86)',
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
            </div>
          </div>

          {(address || branchLabel) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {address && (
                <span style={glassChip}>
                  <IoLocationOutline size={14} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{address}</span>
                </span>
              )}
              {branchLabel && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => otherBranches.length > 0 && setBranchOpen((v) => !v)}
                    disabled={otherBranches.length === 0}
                    aria-expanded={branchOpen}
                    style={{ ...glassChip, cursor: otherBranches.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit' }}
                  >
                    <IoRestaurantOutline size={14} />
                    {branchLabel}
                    {otherBranches.length > 0 && <IoChevronDown size={12} />}
                  </button>

                  <AnimatePresence>
                    {branchOpen && otherBranches.length > 0 && (
                      <motion.ul
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          position: 'absolute',
                          insetInlineStart: 0,
                          bottom: 'calc(100% + 8px)',
                          zIndex: 30,
                          listStyle: 'none',
                          margin: 0,
                          padding: 6,
                          minWidth: 210,
                          background: sf.card,
                          color: sf.text,
                          border: `1px solid ${sf.border}`,
                          borderRadius: sd.rCard,
                          boxShadow: sd.shadowPop
                        }}
                      >
                        {otherBranches.map((branch) => (
                          <li key={branch.id}>
                            <a
                              href={branch.url || '#'}
                              style={{ display: 'block', padding: '10px 12px', borderRadius: sd.rButton, color: sf.text, fontSize: 13, textDecoration: 'none' }}
                            >
                              {branch.name}
                              {branch.label && (
                                <span style={{ color: sf.muted, fontSize: 11.5, display: 'block', marginTop: 2 }}>{branch.label}</span>
                              )}
                            </a>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div style={{ maxWidth: STOREFRONT_MAX_WIDTH, margin: '0 auto', padding: `0 ${STOREFRONT_GUTTER}px` }}>
        {/* ==================== التواصل ==================== */}
        {(phone || waNumber) && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16, maxWidth: 520 }}>
            {phone && (
              <a href={`tel:${phone}`} style={contactButton}>
                <IoCallOutline size={18} />
                {t('اتصال')}
              </a>
            )}
            {waNumber && (
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" style={{ ...contactButton, color: '#128C4B' }}>
                <IoLogoWhatsapp size={18} />
                {t('واتساب')}
              </a>
            )}
          </div>
        )}

        {marketingStrip && <div style={{ marginTop: 16 }}>{marketingStrip}</div>}

        {stickyNav && <div style={{ marginTop: 12 }}>{stickyNav}</div>}

        <main style={{ paddingBottom: 'calc(110px + env(safe-area-inset-bottom, 0px))' }}>{children}</main>
      </div>

      {footer}

      {/* زر العودة للأعلى */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label={t('العودة إلى الأعلى')}
            style={{
              ...roundButton,
              position: 'fixed',
              insetInlineStart: 16,
              bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
              zIndex: 55,
              width: 46,
              height: 46,
              background: sf.card,
              boxShadow: sd.shadowPop
            }}
          >
            <IoArrowUp size={19} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

/** شعار المطعم، أو أوّل حرفٍ من اسمه على لونه حين لا شعار — لا رمزاً تعبيرياً */
const LogoMark: React.FC<{ logo?: string; name: string; size: number; ring?: boolean }> = ({ logo, name, size, ring }) => {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: size >= 60 ? 22 : 12,
    objectFit: 'cover',
    flexShrink: 0,
    background: sf.card,
    boxShadow: ring ? '0 0 0 3px rgba(255,255,255,0.9), 0 12px 30px rgba(0,0,0,0.3)' : 'none'
  };
  if (logo) {
    return <img src={getImageUrl(sizedImage(logo, 'sm'))} alt="" width={size} height={size} decoding="async" style={style} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{
        ...style,
        display: 'grid',
        placeItems: 'center',
        background: sf.accent,
        color: sf.onAccent,
        fontWeight: 900,
        fontSize: size * 0.42
      }}
    >
      {name.trim().charAt(0) || '•'}
    </span>
  );
};

const glassChip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 32,
  padding: '0 12px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.22)',
  background: 'rgba(255,255,255,0.14)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  color: '#fff',
  fontSize: 12.5,
  fontWeight: 700
};

const roundButton: React.CSSProperties = {
  position: 'relative',
  width: 42,
  height: 42,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 999,
  border: `1px solid ${sf.border}`,
  background: sf.card,
  color: sf.text,
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0
};

const countBadge: React.CSSProperties = {
  position: 'absolute',
  top: -4,
  insetInlineEnd: -4,
  minWidth: 19,
  height: 19,
  borderRadius: 999,
  background: sf.accent,
  color: sf.onAccent,
  fontSize: 10.5,
  fontWeight: 800,
  display: 'grid',
  placeItems: 'center',
  padding: '0 4px'
};

const contactButton: React.CSSProperties = {
  flex: 1,
  minHeight: 48,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  borderRadius: sd.rButton,
  border: `1px solid ${sf.border}`,
  background: sf.card,
  color: sf.text,
  fontSize: 14,
  fontWeight: 800,
  textDecoration: 'none',
  boxShadow: sd.shadowCard
};

export { MINI_HEADER_HEIGHT };
export default StorefrontLayout;
