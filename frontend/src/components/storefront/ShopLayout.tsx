// frontend/src/components/storefront/ShopLayout.tsx
//
// هيكل واجهة **المتجر** — مختلف عمداً عن هيكل واجهة المطعم، ومتجاوب من
// الجوال إلى اللابتوب.
//
// القائمة الرقمية والمتجر منتجان مختلفان، ومن يفتح الاثنين يجب أن يرى
// الفرق قبل أن يقرأ كلمة. الاختلاف ليس زخرفة: كل شكل يخدم سلوكاً مختلفاً.
//
//   • المطعم: غلاف كبير وبطاقة هوية عائمة تحته. الزبون جالس على طاولة
//     ويريد أن يطمئن أنه في المكان الصحيح ثم يقرأ الأسماء.
//
//   • المتجر: شريط علوي **دائم** فيه البحث والحساب والمفضلة والسلة، ثم
//     بانر، ثم الأقسام. المتسوّق يبحث ويقفز بين الأقسام مراراً، ويعود
//     إلى ما أعجبه — فإخفاء أيٍّ من هذه خلف تمرير يكلّفه حركة كل مرة.
//
// والتجاوب هنا **تصاعدي**: ما يظهر على الجوال هو الحدّ الأدنى، وتُضاف
// على اللابتوب عناصر لا تتّسع للجوال — حقل بحث كامل، وشريط أقسام نصّي،
// وأسماء مع الأيقونات. لا العكس: تصميم لابتوب يُقلَّص ينتهي بأزرار
// متلاصقة لا تُنقر بإبهام.

import React, { useEffect, useState } from 'react';
import {
  IoSearchOutline,
  IoBagHandleOutline,
  IoHeartOutline,
  IoPersonOutline,
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

  favoritesCount?: number;
  onFavoritesClick?: () => void;

  onAccountClick?: () => void;
  accountLabel?: string;

  /**
   * عنصر يُعرض في الرأس قبل أيقونات الحساب — مبدّل العملة اليوم.
   *
   * منفذٌ لا خاصّية مخصّصة: الرأس ملك الصفحة، وحقنُ كل إضافة جديدة كخاصّية
   * مستقلّة يجعل توقيع المكوّن يتضخّم بلا داعٍ.
   */
  headerExtra?: React.ReactNode;

  /** البحث: نص الحقل يُدار من الصفحة كي يبقى مصدر واحد للحقيقة */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchOpen?: () => void;

  children: React.ReactNode;
  footer?: React.ReactNode;
}

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
      {/* ===== شريط علوي دائم ===== */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: sf.bg,
          borderBottom: `1px solid ${sf.border}`,
          backdropFilter: 'blur(8px)'
        }}
      >
        <div
          className="shop-shell"
          style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 60, paddingBlock: 8 }}
        >
          {logo ? (
            <img
              src={getImageUrl(logo)}
              alt=""
              width={36}
              height={36}
              style={{ borderRadius: 11, objectFit: 'cover', flexShrink: 0, background: sf.surface }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
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

        
          {/* حقل بحث كامل — لابتوب. الكتابة مباشرةً بلا لوح وسيط. */}
          <div className="shop-search-full" style={{ flex: 1, minWidth: 0, position: 'relative' }}>
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
              placeholder="ابحث في المنتجات…"
              aria-label="ابحث في المنتجات"
              style={{
                width: '100%',
                minHeight: 42,
                padding: '0 40px',
                borderRadius: 999,
                border: `1px solid ${sf.border}`,
                background: sf.surface,
                color: sf.text,
                fontSize: 13.5,
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* زرّ مختصر — جوال. لوح بحث بملء الشاشة أنسب لإبهام واحد. */}
          <button
            type="button"
            className="shop-search-compact"
            onClick={onSearchOpen}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 38,
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
            {searchValue || 'ابحث في المنتجات…'}
          </button>

          {/* الحساب · المفضلة · السلة */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            {headerExtra}
            <IconAction icon={<IoPersonOutline size={19} />} label={accountLabel} onClick={onAccountClick} />
            <IconAction
              icon={<IoHeartOutline size={19} />}
              label="المفضلة"
              badge={favoritesCount}
              onClick={onFavoritesClick}
            />
            <IconAction
              icon={<IoBagHandleOutline size={19} />}
              label="السلة"
              badge={cartCount}
              onClick={onCartClick}
              emphasis
            />
          </div>
        </div>

        {/* شريط الأقسام النصّي — لابتوب فقط */}
        {categories.length > 0 && (
          <nav
            className="shop-navbar"
            aria-label="أقسام المتجر"
            style={{ borderTop: `1px solid ${sf.border}` }}
          >
            <div
              className="shop-shell no-scrollbar"
              style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBlock: 4 }}
            >
              {categories.map((category) => {
                const active = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onCategorySelect?.(category.id)}
                    aria-current={active ? 'true' : undefined}
                    style={{
                      flex: '0 0 auto',
                      padding: '9px 14px',
                      background: 'none',
                      border: 'none',
                      borderBottom: `2px solid ${active ? sf.accent : 'transparent'}`,
                      color: active ? sf.accent : sf.muted,
                      fontSize: 13,
                      fontWeight: active ? 800 : 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {category.name}
                    {typeof category.count === 'number' && (
                      <span style={{ color: sf.muted, fontWeight: 500, marginInlineStart: 5, fontSize: 11.5 }}>
                        {category.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* ===== البانر ===== */}
      {/* ملء العرض على الجوال، ومحتوًى مستدير على اللابتوب — الحشوة تُدار
          بالفئة لا بنمط ثابت، وإلا بقي البانر ملتصقاً بالحافتين هناك */}
      <div className="shop-shell shop-banner-wrap">
        <div
          className="shop-banner"
          style={{
            background: coverImage ? sf.surface : `linear-gradient(135deg, ${sf.primary}, ${sf.accent})`
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
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 4%, rgba(0,0,0,0.42) 48%, rgba(0,0,0,0.08) 100%)'
            }}
          />

          <div style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: '0 18px 16px' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(19px, 3.2vw, 28px)', fontWeight: 900, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
              {name}
            </h1>
            {description && (
              <p
                style={{
                  margin: '5px 0 0',
                  fontSize: 'clamp(12px, 1.4vw, 14px)',
                  color: 'rgba(255,255,255,0.87)',
                  lineHeight: 1.75,
                  maxWidth: 640,
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
                    background: 'rgba(0,0,0,0.34)',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 12,
                    maxWidth: 280,
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
        </div>
      </div>

      {/* الفروع */}
      {branches.length > 1 && (
        <div
          className="shop-shell no-scrollbar"
          style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingTop: 12 }}
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

      {/* بلاطات الأقسام — جوال ولوح، تُستبدل بالشريط النصّي على اللابتوب */}
      {categories.length > 0 && (
        <nav
          className="shop-shell shop-tiles no-scrollbar"
          aria-label="أقسام المتجر"
          style={{ gap: 12, overflowX: 'auto', paddingTop: 16, paddingBottom: 4 }}
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

      <main className="shop-shell" style={{ paddingBlock: '10px 110px' }}>
        {children}
      </main>

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

/** زرّ أيقونة بعدّاد — يكتسب اسماً مكتوباً على اللابتوب حيث تتّسع المساحة */
const IconAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick?: () => void;
  emphasis?: boolean;
}> = ({ icon, label, badge = 0, onClick, emphasis }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={badge > 0 ? `${label} — ${badge}` : label}
    style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      minHeight: 40,
      padding: '0 11px',
      borderRadius: 12,
      border: `1px solid ${emphasis ? 'transparent' : sf.border}`,
      background: emphasis ? sf.accent : sf.surface,
      color: emphasis ? sf.onAccent : sf.text,
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: 12.5,
      fontWeight: 700,
      flexShrink: 0
    }}
  >
    {icon}
    <span className="shop-only-wide">{label}</span>
    {badge > 0 && (
      <span
        style={{
          position: 'absolute',
          top: -5,
          insetInlineEnd: -5,
          minWidth: 18,
          height: 18,
          padding: '0 5px',
          borderRadius: 999,
          background: emphasis ? sf.bg : sf.accent,
          color: emphasis ? sf.accent : sf.onAccent,
          fontSize: 10.5,
          fontWeight: 800,
          display: 'grid',
          placeItems: 'center',
          border: `1px solid ${sf.bg}`
        }}
      >
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
);

export default ShopLayout;
