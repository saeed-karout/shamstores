// frontend/src/components/storefront/ShopLayout.tsx
//
// هيكل واجهة **المتجر** — مختلف عمداً عن هيكل واجهة المطعم.
//
// القائمة الرقمية والمتجر منتجان مختلفان، ومن يفتح الاثنين يجب أن يرى
// الفرق قبل أن يقرأ كلمة. الاختلاف ليس زخرفة: كل شكل يخدم سلوكاً مختلفاً.
//
//   • المطعم: غلاف كبير وبطاقة هوية عائمة تحته. الزبون جالس على طاولة
//     ويريد أن يطمئن أنه في المكان الصحيح ثم يقرأ الأسماء.
//
//   • المتجر: شريط علوي **دائم** فيه البحث والسلة، ثم بانر عريض، ثم
//     بلاطات الأقسام. المتسوّق يبحث ويقفز بين الأقسام مراراً — فإخفاء
//     البحث خلف تمرير يكلّفه حركة في كل مرة.
//
// ولوحة الألوان تختلف بدورها (SF_STORE_FALLBACK): ليل أزرق وكهرماني
// مقابل أخضر المطعم.

import React, { useEffect, useState } from 'react';
import {
  IoSearchOutline,
  IoBagHandleOutline,
  IoCallOutline,
  IoLogoWhatsapp,
  IoLocationOutline,
  IoArrowUp
} from 'react-icons/io5';
import { AnimatePresence, motion } from 'framer-motion';
import { sf } from '@/utils/storefrontTheme';
import { getImageUrl } from '@/utils/imageHelpers';

export interface ShopCategoryTile {
  id: string;
  name: string;
  image?: string | null;
  count?: number;
}

export interface ShopBranchLink {
  id: string;
  name: string;
  url?: string;
  isCurrent?: boolean;
}

export interface ShopLayoutProps {
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;

  /** فروع التاجر — إخفاؤها يقطع الطريق بين فرعين لنفس المتجر */
  branches?: ShopBranchLink[];

  categories?: ShopCategoryTile[];
  activeCategory?: string;
  onCategorySelect?: (id: string) => void;

  cartCount?: number;
  onCartClick?: () => void;
  onSearchClick?: () => void;
  searchLabel?: string;

  children: React.ReactNode;
  footer?: React.ReactNode;
}

const TOP_BAR_HEIGHT = 58;

const ShopLayout: React.FC<ShopLayoutProps> = ({
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
  onSearchClick,
  searchLabel = 'ابحث في المنتجات…',
  children,
  footer
}) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setShowScrollTop(window.scrollY > 700);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const contacts = [
    phone ? { key: 'phone', icon: <IoCallOutline size={14} />, label: 'اتصال', href: `tel:${phone}` } : null,
    whatsapp
      ? {
          key: 'whatsapp',
          icon: <IoLogoWhatsapp size={14} />,
          label: 'واتساب',
          href: `https://wa.me/${whatsapp.replace(/\D/g, '')}`
        }
      : null
  ].filter(Boolean) as Array<{ key: string; icon: React.ReactNode; label: string; href: string }>;

  return (
    <div style={{ background: sf.bg, minHeight: '100vh', fontFamily: sf.font, color: sf.text }} dir="rtl">
      {/* ===== شريط علوي دائم: البحث والسلة في متناول اليد دائماً ===== */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          height: TOP_BAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          background: sf.bg,
          borderBottom: `1px solid ${sf.border}`,
          backdropFilter: 'blur(8px)'
        }}
      >
        {logo ? (
          <img
            src={getImageUrl(logo)}
            alt=""
            width={34}
            height={34}
            style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: sf.surface }}
          />
        ) : (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: sf.accent,
              color: sf.onAccent,
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              flexShrink: 0
            }}
          >
            {name?.[0] || 'م'}
          </div>
        )}

        <span
          style={{
            fontWeight: 800,
            fontSize: 14.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 130
          }}
        >
          {name}
        </span>

        <button
          type="button"
          onClick={onSearchClick}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 38,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '0 12px',
            borderRadius: 999,
            border: `1px solid ${sf.border}`,
            background: sf.surface,
            color: sf.muted,
            fontSize: 12.5,
            fontFamily: 'inherit',
            cursor: 'pointer',
            textAlign: 'start',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis'
          }}
        >
          <IoSearchOutline size={16} style={{ flexShrink: 0 }} />
          {searchLabel}
        </button>

        <button
          type="button"
          onClick={onCartClick}
          aria-label={cartCount > 0 ? `السلة — ${cartCount} منتج` : 'السلة'}
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            borderRadius: 12,
            border: `1px solid ${sf.border}`,
            background: sf.surface,
            color: sf.text,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <IoBagHandleOutline size={19} />
          {cartCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -5,
                insetInlineEnd: -5,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 999,
                background: sf.accent,
                color: sf.onAccent,
                fontSize: 10.5,
                fontWeight: 800,
                display: 'grid',
                placeItems: 'center'
              }}
            >
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      </header>

      {/* ===== بانر عريض مسطّح — لا بطاقة هوية عائمة كواجهة المطعم ===== */}
      <section
        style={{
          position: 'relative',
          // نسبة عريضة تشبه بانرات المتاجر لا غلاف مطعم
          aspectRatio: '21 / 9',
          maxHeight: 260,
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

        {/* حجاب متدرّج: النص فوق صورة تاجر مجهولة الألوان يحتاج أرضية */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to top, ${sf.bg} 4%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.12) 100%)`
          }}
        />

        <div style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: '0 16px 14px' }}>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 900, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            {name}
          </h1>
          {description && (
            <p
              style={{
                margin: '5px 0 0',
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.86)',
                lineHeight: 1.75,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {description}
            </p>
          )}

          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 10 }}>
            {contacts.map((contact) => (
              <a
                key={contact.key}
                href={contact.href}
                target={contact.key === 'whatsapp' ? '_blank' : undefined}
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  minHeight: 32,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.16)',
                  border: '1px solid rgba(255,255,255,0.24)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: 'none',
                  backdropFilter: 'blur(6px)'
                }}
              >
                {contact.icon}
                {contact.label}
              </a>
            ))}
            {address && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  minHeight: 32,
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.32)',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: 12,
                  maxWidth: 220,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                <IoLocationOutline size={13} style={{ flexShrink: 0 }} />
                {address}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* الفروع — صفّ رفيع تحت البانر */}
      {branches.length > 1 && (
        <div
          className="no-scrollbar"
          style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '12px 14px 0' }}
        >
          {branches.map((branch) => (
            <a
              key={branch.id}
              href={branch.url || '#'}
              aria-current={branch.isCurrent ? 'page' : undefined}
              style={{
                flex: '0 0 auto',
                padding: '6px 13px',
                minHeight: 32,
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 999,
                border: `1px solid ${branch.isCurrent ? sf.accent : sf.border}`,
                background: branch.isCurrent ? sf.accent : sf.card,
                color: branch.isCurrent ? sf.onAccent : sf.muted,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {branch.name}
            </a>
          ))}
        </div>
      )}

      {/* ===== بلاطات الأقسام — نمط المتاجر، لا شريط فئات نصّي ===== */}
      {categories.length > 0 && (
        <nav
          aria-label="أقسام المتجر"
          className="no-scrollbar"
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            padding: '16px 14px 6px',
            scrollbarWidth: 'none'
          }}
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
                  width: 74,
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 18,
                    background: sf.card,
                    border: `2px solid ${active ? sf.accent : sf.border}`,
                    display: 'grid',
                    placeItems: 'center',
                    overflow: 'hidden',
                    color: active ? sf.accent : sf.muted,
                    fontWeight: 900,
                    fontSize: 20
                  }}
                >
                  {category.image ? (
                    <img
                      src={getImageUrl(category.image)}
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
                    fontSize: 11.5,
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
        </nav>
      )}

      <main style={{ padding: '8px 14px 110px', maxWidth: 1180, margin: '0 auto' }}>{children}</main>

      {footer}

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="العودة إلى الأعلى"
            style={{
              position: 'fixed',
              insetInlineEnd: 14,
              bottom: 92,
              width: 42,
              height: 42,
              borderRadius: '50%',
              border: `1px solid ${sf.border}`,
              background: sf.card,
              color: sf.text,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              zIndex: 45
            }}
          >
            <IoArrowUp size={19} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShopLayout;
