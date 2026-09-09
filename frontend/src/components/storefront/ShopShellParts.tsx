// frontend/src/components/storefront/ShopShellParts.tsx
//
// القطع المشتركة بين هياكل المتجر الثلاثة.
//
// **لماذا ملفٌّ مستقلّ:** الهياكل تختلف في **الترتيب** لا في القطع: زرّ
// السلّة بعدّاده، وأزرار التواصل، وشرائح الفروع، وزرّ العودة إلى الأعلى —
// كلّها نفسها في القوالب الثلاثة. وكتابتها ثلاث مرّات تعني أن إصلاح عدّاد
// السلّة يُنفَّذ في موضعٍ وينسى موضعين.
//
// وهي هنا لا في `ShopLayout` لأن الهياكل تستوردها والهيكل الرئيسي يستوردها
// أيضاً — فاستيرادها منه كان سينتج دائرةً بين الملفّات.

import React, { useEffect, useState } from 'react';
import {
  IoCallOutline,
  IoLogoWhatsapp,
  IoLocationOutline,
  IoArrowUp
} from 'react-icons/io5';
import { AnimatePresence, motion } from 'framer-motion';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { useT } from '@/i18n/storefront';

/** زرّ أيقونة بعدّاد — يكتسب اسماً مكتوباً على اللابتوب حيث تتّسع المساحة */
export const IconAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick?: () => void;
  emphasis?: boolean;
  /** دائريّ شفّاف — للأزرار الطافية فوق صورةٍ بلا شريط تحتها */
  floating?: boolean;
}> = ({ icon, label, badge = 0, onClick, emphasis, floating }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={badge > 0 ? `${label} — ${badge}` : label}
    style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: floating ? 38 : 40,
      minWidth: floating ? 38 : undefined,
      padding: floating ? 0 : '0 11px',
      borderRadius: floating ? '50%' : sd.rButton,
      border: floating
        ? '1px solid rgba(255,255,255,0.3)'
        : `${sd.borderW} solid ${emphasis ? 'transparent' : sf.border}`,
      background: floating
        ? 'rgba(0,0,0,0.38)'
        : emphasis
          ? sf.accent
          : sf.surface,
      color: floating ? '#fff' : emphasis ? sf.onAccent : sf.text,
      backdropFilter: floating ? 'blur(8px)' : undefined,
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: 12.5,
      fontWeight: 700,
      flexShrink: 0
    }}
  >
    {icon}
    {!floating && <span className="shop-only-wide">{label}</span>}
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
          background: emphasis && !floating ? sf.bg : sf.accent,
          color: emphasis && !floating ? sf.accent : sf.onAccent,
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

export interface ContactInfo {
  phone?: string;
  whatsapp?: string;
  address?: string;
}

/**
 * روابط التواصل.
 *
 * `tone` يفصل الحالتين: فوق صورةٍ داكنة تُرسم بالأبيض الشفّاف، وعلى خلفية
 * المتجر تُرسم بألوانه. ولونٌ واحد لهما كان يعني نصّاً أبيض على خلفيةٍ
 * فاتحة في نصف المتاجر.
 */
export const ContactChips: React.FC<
  ContactInfo & { tone?: 'onImage' | 'onSurface'; round?: boolean }
> = ({ phone, whatsapp, address, tone = 'onImage', round }) => {
  const { t } = useT();
  const onImage = tone === 'onImage';

  const items = [
    phone ? { key: 'phone', icon: <IoCallOutline size={round ? 18 : 14} />, label: 'اتصال', href: `tel:${phone}` } : null,
    whatsapp
      ? {
          key: 'whatsapp',
          icon: <IoLogoWhatsapp size={round ? 18 : 14} />,
          label: 'واتساب',
          href: `https://wa.me/${whatsapp.replace(/\D/g, '')}`
        }
      : null
  ].filter(Boolean) as Array<{ key: string; icon: React.ReactNode; label: string; href: string }>;

  if (!items.length && !address) return null;

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: round ? 0 : 5,
    minHeight: round ? 40 : 32,
    minWidth: round ? 40 : undefined,
    padding: round ? 0 : '6px 12px',
    borderRadius: round ? '50%' : 999,
    background: onImage ? 'rgba(255,255,255,0.16)' : sf.surface,
    border: `1px solid ${onImage ? 'rgba(255,255,255,0.24)' : sf.border}`,
    color: onImage ? '#fff' : sf.text,
    fontSize: 12,
    fontWeight: 700,
    textDecoration: 'none',
    backdropFilter: onImage ? 'blur(6px)' : undefined
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: round ? 10 : 7,
        flexWrap: 'wrap',
        justifyContent: round ? 'center' : 'flex-start'
      }}
    >
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target={item.key === 'whatsapp' ? '_blank' : undefined}
          rel="noreferrer"
          aria-label={t(item.label)}
          style={base}
        >
          {item.icon}
          {!round && t(item.label)}
        </a>
      ))}
      {address && !round && (
        <span
          style={{
            ...base,
            background: onImage ? 'rgba(0,0,0,0.34)' : sf.surface,
            color: onImage ? 'rgba(255,255,255,0.9)' : sf.muted,
            maxWidth: 280,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: 500
          }}
        >
          <IoLocationOutline size={13} style={{ flexShrink: 0 }} />
          {address}
        </span>
      )}
    </div>
  );
};

export interface BranchLink {
  id: string;
  name: string;
  url?: string;
  isCurrent?: boolean;
}

/** شرائح الفروع — إخفاؤها يقطع الطريق بين فرعين لنفس المتجر */
export const BranchChips: React.FC<{ branches: BranchLink[] }> = ({ branches }) => {
  if (branches.length <= 1) return null;
  return (
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
            borderRadius: sd.rChip,
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
  );
};

/**
 * هل تجاوز التمرير حدّاً؟
 *
 * **بلا `requestAnimationFrame` عمداً.** الخنق به يبدو أرخص، لكنه يحمل
 * مزلاقاً: الراية التي تمنع الجدولة المكرّرة تُرفع قبل الاستدعاء وتُخفض
 * داخله — وrAF **لا يعمل إطلاقاً وصفحةٌ محجوبة** (لسانٌ خلفي، أو نافذة
 * وراء أخرى). فتبقى الراية مرفوعة ويُهمَل كل تمريرٍ بعدها حتى تعود
 * الصفحة إلى الواجهة. رُصد فعلاً: `visibilityState: hidden` والشريط لا
 * يظهر مهما مُرِّر.
 *
 * والبديل ليس أغلى: المتصفّح يطلق حدث التمرير مرّةً لكل إطارٍ أصلاً،
 * وReact يتجاهل ضبط الحالة بنفس القيمة فلا يُعاد التصيير إلا عند العبور
 * الحقيقيّ للحدّ — مرّتان في الصفحة كلّها لا مرّتان في الثانية.
 */
export const useScrolledPast = (threshold: number): boolean => {
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const onScroll = () => setPassed(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return passed;
};

/** زرّ العودة إلى الأعلى — فوق شريط السلّة السفلي لا تحته */
export const ScrollTopButton: React.FC<{ show: boolean }> = ({ show }) => {
  const { t } = useT();
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={t('العودة إلى الأعلى')}
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
  );
};

export interface CategoryChip {
  id: string;
  name: string;
  image?: string | null;
  count?: number;
}

/**
 * شرائح الأقسام — صفٌّ أفقيّ ينزلق.
 *
 * البديل قائمةٌ تلتفّ على أسطر، وهي تدفع المنتجات تحت الطيّة في متجرٍ له
 * عشرون قسماً. والانزلاق الأفقيّ يبقيها في سطرٍ واحد مهما كثرت.
 */
export const CategoryChips: React.FC<{
  categories: CategoryChip[];
  activeCategory?: string;
  onSelect?: (id: string) => void;
  /** الشريحة المختارة مملوءة بلون التاجر، وغيرها مفرَّغة */
  size?: 'sm' | 'md';
}> = ({ categories, activeCategory, onSelect, size = 'md' }) => {
  const { t } = useT();
  if (!categories.length) return null;

  return (
    <nav
      className="no-scrollbar"
      aria-label={t('أقسام المتجر')}
      style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBlock: 2 }}
    >
      {categories.map((category) => {
        const active = activeCategory === category.id;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect?.(category.id)}
            aria-pressed={active}
            style={{
              flex: '0 0 auto',
              minHeight: size === 'sm' ? 34 : 40,
              padding: size === 'sm' ? '0 13px' : '0 17px',
              borderRadius: sd.rChip,
              border: `1px solid ${active ? sf.accent : sf.border}`,
              background: active ? sf.accent : sf.card,
              color: active ? sf.onAccent : sf.muted,
              fontSize: size === 'sm' ? 12.5 : 13.5,
              fontWeight: active ? 800 : 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {category.name}
            {typeof category.count === 'number' && (
              <span style={{ opacity: 0.65, fontWeight: 500, marginInlineStart: 6, fontSize: 11.5 }}>
                {category.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
