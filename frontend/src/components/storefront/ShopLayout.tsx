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
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import { sd } from '@/utils/storefrontDesign';
import { useDesign } from '@/utils/storefrontDesignContext';
import { useT } from '@/i18n/storefront';
import { IconAction, ScrollTopButton, useScrolledPast } from './ShopShellParts';
import BoutiqueShell from './shells/BoutiqueShell';
import ShowcaseShell from './shells/ShowcaseShell';

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

const ClassicShell: React.FC<ShopLayoutProps> = ({
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
  // الخطّاف المشترك بدل نسخةٍ محلّية: النسخة هنا كانت تخنق بـrAF، وهو
  // موقوفٌ في صفحةٍ محجوبة فتبقى رايته مرفوعة ويُهمَل كل تمريرٍ بعدها
  const showScrollTop = useScrolledPast(700);

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

  /**
   * نموذج الشريط — ثلاثة أشكال لسلوكٍ واحد.
   *
   * الالتصاق بأعلى الشاشة (`sticky`) لا يتغيّر في أيٍّ منها: زرّ السلّة
   * والبحث يجب أن يبقيا في المتناول مهما نزل الزبون. المتغيّر شكله فقط.
   */
  const { nav } = useDesign();
  const floating = nav === 'floating';
  const minimalNav = nav === 'minimal';

  return (
    <div style={{ background: sf.bg, minHeight: '100vh', fontFamily: sf.font, color: sf.text }} dir="rtl">
      {/* ===== شريط علوي دائم ===== */}
      <header
        style={{
          position: 'sticky',
          top: floating ? 10 : 0,
          zIndex: 40,
          // «عائم» يبتعد عن الحافّة ويحمل ظلّاً؛ و«بسيط» يتخلّى عن الحدّ
          // ويكتفي بالتمويه؛ و«صلب» هو الشريط الملتصق المعتاد
          background: sf.bg,
          borderBottom: minimalNav || floating ? 'none' : `${sd.borderW} solid ${sf.border}`,
          borderRadius: floating ? sd.rCard : 0,
          boxShadow: floating ? sd.shadowPop : 'none',
          margin: floating ? '10px 10px 0' : 0,
          border: floating ? `${sd.borderW} solid ${sf.border}` : undefined,
          backdropFilter: 'blur(8px)'
        }}
      >
        <div
          className="shop-shell"
          style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 60, paddingBlock: 8 }}
        >
          {logo ? (
            <img
              src={getImageUrl(sizedImage(logo, 'sm'))}
              alt=""
              width={36}
              height={36}
              style={{ borderRadius: sd.rImage, objectFit: 'cover', flexShrink: 0, background: sf.surface }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: sd.rImage,
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
              placeholder={t('ابحث في المنتجات…')}
              aria-label={t('ابحث في المنتجات')}
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

          {/* اسم المتجر يملأ الصفّ الأوّل على الجوال — حيث لا حقل بحث */}
          <div
            className="shop-only-narrow"
            style={{
              flex: 1,
              minWidth: 0,
              color: sf.text,
              fontSize: 14.5,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {name}
          </div>

          {/* الحساب · المفضلة · السلة */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <span className="shop-only-wide" style={{ alignItems: 'center', gap: 7 }}>{headerExtra}</span>
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

        {/* ===== صفٌّ ثانٍ — جوال فقط =====
            سبعة عناصر لا تدخل في ٣٧٥ بكسل: الشعار وحقل البحث ومبدّلا
            العملة واللغة وثلاثة أزرار. وكانت المجموعة تفيض فعلاً فتنزلق
            الصفحة أفقياً — وهو أسوأ ما يحدث لواجهةٍ على الجوال.
            الصفّ الثاني يُعطي البحث عرضاً حقيقياً بدل ست وعشرين بكسل. */}
        <div
          className="shop-shell shop-header-row2"
          style={{ alignItems: 'center', gap: 8, paddingBottom: 9 }}
        >
          <button
            type="button"
            onClick={onSearchOpen}
            style={{
              display: 'flex',
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
            {searchValue || t('ابحث في المنتجات…')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>{headerExtra}</div>
        </div>

        {/* شريط الأقسام النصّي — لابتوب فقط */}
        {categories.length > 0 && (
          <nav
            className="shop-navbar"
            aria-label={t('أقسام المتجر')}
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
                  {t(contact.label)}
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
          aria-label={t('أقسام المتجر')}
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

      <ScrollTopButton show={showScrollTop} />
    </div>
  );
};

/**
 * الموزّع — يختار الهيكل الذي ضبطه التاجر.
 *
 * **غلافٌ رقيق لا شرط داخل الهيكل:** الهياكل الثلاثة تستدعي خطّافات
 * (`useState` للتمرير)، ورميُ `return` مبكّر داخل مكوّنٍ واحد بينها كان
 * يخالف ترتيب الخطّافات ويُسقط الصفحة عند تبديل القالب.
 *
 * والقالب المجهول يقع على الكلاسيكي: متجرٌ ضُبط بقيمةٍ من إصدارٍ لاحق لا
 * يُعرض فارغاً.
 */
const ShopLayout: React.FC<ShopLayoutProps> = (props) => {
  const { shell } = useDesign();
  if (shell === 'boutique') return <BoutiqueShell {...props} />;
  if (shell === 'showcase') return <ShowcaseShell {...props} />;
  return <ClassicShell {...props} />;
};

export default ShopLayout;
