// frontend/src/components/storefront/StorefrontLayout.tsx
// هيكل صفحة المتجر: غلاف، بطاقة الهوية، رأس مصغّر يظهر عند التمرير، وفتحات للمحتوى.

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IoCallOutline,
  IoLogoWhatsapp,
  IoLocationOutline,
  IoBagHandleOutline,
  IoChevronDown,
  IoArrowUp
} from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
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

  /** يُعرض أعلى الصفحة تحت بطاقة الهوية (شريط تسويقي رفيع) */
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

const MINI_HEADER_HEIGHT = 56;

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
        setShowMiniHeader(y > 190);
        setShowScrollTop(y > 700);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const otherBranches = branches.filter((b) => !b.isCurrent);

  return (
    <div style={{ background: sf.bg, minHeight: '100vh', fontFamily: sf.font, color: sf.text }} dir="rtl">
      {/* ==================== الرأس المصغّر ==================== */}
      <AnimatePresence>
        {showMiniHeader && (
          <motion.header
            initial={{ y: -MINI_HEADER_HEIGHT, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -MINI_HEADER_HEIGHT, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              insetInline: 0,
              top: 0,
              zIndex: 50,
              height: MINI_HEADER_HEIGHT,
              background: sf.card,
              borderBottom: `1px solid ${sf.border}`,
              backdropFilter: 'blur(10px)'
            }}
          >
            <div
              style={{
                maxWidth: 640,
                margin: '0 auto',
                height: '100%',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              {logo && (
                <img
                  src={getImageUrl(sizedImage(logo, 'sm'))}
                  alt=""
                  width={34}
                  height={34}
                  style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              {/* <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 14.5,
                  fontWeight: 800,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {name}
              </span> */}

              {headerActions}

              {onCartClick && (
                <button
                  type="button"
                  onClick={onCartClick}
                  aria-label={`السلة (${cartCount})`}
                  style={{
                    position: 'relative',
                    width: 40,
                    height: 40,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 12,
                    border: `1px solid ${sf.border}`,
                    background: sf.surface,
                    color: sf.text,
                    cursor: 'pointer',
                    flexShrink: 0,
                    padding: 0
                  }}
                >
                  <IoBagHandleOutline size={19} />
                  {cartCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -5,
                        insetInlineEnd: -5,
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
                      }}
                    >
                      {cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ==================== الغلاف ==================== */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 7', maxHeight: 260, overflow: 'hidden', background: sf.surface }}>
        {coverImage ? (
          <img
            src={getImageUrl(coverImage)}
            alt=""
            // @ts-expect-error — سمة قياسية لم تُضَف بعد إلى تعريفات React
            fetchpriority="high"
            decoding="async"
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
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, transparent 40%, ${sf.bg} 100%)`
          }}
        />
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 14px' }}>
        {/* ==================== بطاقة الهوية ==================== */}
        <section
          style={{
            position: 'relative',
            marginTop: -46,
            background: sf.card,
            border: `1px solid ${sf.border}`,
            borderRadius: 18,
            padding: 16,
            boxShadow: `0 12px 32px ${sf.shadow}`
          }}
        >
          <div style={{ display: 'flex', gap: 13 }}>
            {logo ? (
              <img
                src={getImageUrl(sizedImage(logo, 'sm'))}
                alt={name}
                width={72}
                height={72}
                decoding="async"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: `2px solid ${sf.border}`,
                  background: sf.surface
                }}
              />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  background: sf.surface,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 30,
                  flexShrink: 0
                }}
                aria-hidden="true"
              >
                🍽️
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, lineHeight: 1.4 }}>{name}</h1>

              {branchLabel && (
                <div style={{ marginTop: 5, position: 'relative', display: 'inline-block' }}>
                  <button
                    type="button"
                    onClick={() => otherBranches.length > 0 && setBranchOpen((v) => !v)}
                    disabled={otherBranches.length === 0}
                    aria-expanded={branchOpen}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: sf.accentSoft,
                      border: `1px solid ${sf.border}`,
                      borderRadius: 999,
                      padding: '4px 11px',
                      color: sf.accent,
                      fontSize: 11.5,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      cursor: otherBranches.length > 0 ? 'pointer' : 'default'
                    }}
                  >
                    <IoLocationOutline size={12} />
                    {branchLabel}
                    {otherBranches.length > 0 && <IoChevronDown size={11} />}
                  </button>

                  <AnimatePresence>
                    {branchOpen && otherBranches.length > 0 && (
                      <motion.ul
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          position: 'absolute',
                          insetInlineStart: 0,
                          top: 'calc(100% + 6px)',
                          zIndex: 30,
                          listStyle: 'none',
                          margin: 0,
                          padding: 6,
                          minWidth: 190,
                          background: sf.surface,
                          border: `1px solid ${sf.border}`,
                          borderRadius: 12,
                          boxShadow: `0 10px 26px ${sf.shadow}`
                        }}
                      >
                        {otherBranches.map((branch) => (
                          <li key={branch.id}>
                            <a
                              href={branch.url || '#'}
                              style={{
                                display: 'block',
                                padding: '9px 11px',
                                borderRadius: 9,
                                color: sf.text,
                                fontSize: 12.5,
                                textDecoration: 'none'
                              }}
                            >
                              {branch.name}
                              {branch.label && (
                                <span style={{ color: sf.muted, fontSize: 11, display: 'block', marginTop: 2 }}>
                                  {branch.label}
                                </span>
                              )}
                            </a>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {description && (
                <p
                  style={{
                    margin: '8px 0 0',
                    fontSize: 12.5,
                    color: sf.muted,
                    lineHeight: 1.75,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {description}
                </p>
              )}

              {address && (
                <div
                  style={{
                    marginTop: 7,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    color: sf.muted,
                    fontSize: 11.5
                  }}
                >
                  <IoLocationOutline size={13} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</span>
                </div>
              )}
            </div>
          </div>

          {(phone || whatsapp) && (
            <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
              {phone && (
                <a href={`tel:${phone}`} style={contactButton} aria-label={t('اتصال')}>
                  <IoCallOutline size={17} />{t('اتصال')}</a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${String(whatsapp).replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...contactButton, color: '#25D366', borderColor: 'rgba(37,211,102,0.3)' }}
                  aria-label={t('واتساب')}
                >
                  <IoLogoWhatsapp size={17} />{t('واتساب')}</a>
              )}
            </div>
          )}
        </section>

        {marketingStrip && <div style={{ marginTop: 14 }}>{marketingStrip}</div>}

        {stickyNav && <div style={{ marginTop: 14 }}>{stickyNav}</div>}

        <main style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>{children}</main>
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
              position: 'fixed',
              insetInlineStart: 14,
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
              zIndex: 55,
              width: 44,
              height: 44,
              borderRadius: 14,
              border: `1px solid ${sf.border}`,
              background: sf.card,
              color: sf.text,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              boxShadow: `0 6px 20px ${sf.shadow}`,
              padding: 0
            }}
          >
            <IoArrowUp size={19} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

const contactButton: React.CSSProperties = {
  flex: 1,
  minHeight: 44,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  borderRadius: 12,
  border: `1px solid ${sf.border}`,
  background: sf.surface,
  color: sf.text,
  fontSize: 13,
  fontWeight: 700,
  textDecoration: 'none'
};

export { MINI_HEADER_HEIGHT };
export default StorefrontLayout;
