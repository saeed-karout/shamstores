// frontend/src/components/storefront/LocaleSwitcher.tsx
//
// اللغة والعملة في زرٍّ واحد — بدل كبسولتين متلاصقتين في رأس كل قالب.
//
// **ما كان:** زرّا «ل.س | $» و«ع | EN» بجانب بعضهما، يأخذان من الرأس عرض
// ثلاثة أزرار، ويختلف مكانهما من قالبٍ لآخر: في الشريط هنا، وتحت الشعار
// هناك، وفي صفٍّ ثانٍ على الجوال. والزبون الذي يبحث عنهما لا يعرف أين.
//
// **ما صار:** زرٌّ بحجم أيقونات الرأس (الحساب والمفضلة والسلّة) وفي
// مجموعتها دائماً، عليه كرة أرضية واختصار الحالي «ع · ل.س». ينقر فتنفتح
// بطاقة صغيرة فيها قسمان: اللغة بأسمائها الأصلية، والعملة برمزها واسمها.
//
// **ولا يظهر ما لا يُختار:** قسمٌ بخيارٍ واحد لا يُعرض، والزرّ كلّه يغيب إن
// لم يبقَ ما يُبدَّل — زرٌّ لا يغيّر شيئاً يوحي بإمكانٍ غير موجود.
//
// **والبطاقة في `body` بموضعٍ ثابت:** بعض القوالب ترسم الرأس فوق غلافٍ
// بـ`overflow: hidden`، فبطاقةٌ داخله تُقصّ عند حافّة الصورة.

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IoGlobeOutline, IoCheckmark, IoChevronDown } from 'react-icons/io5';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import type { CurrencyOption } from '@/hooks/useDisplayCurrency';
import type { LangCode } from '@/hooks/useStorefrontLanguage';
import { makeT } from '@/i18n/storefront';

const NATIVE: Record<LangCode, { short: string; name: string; hint: string }> = {
  ar: { short: 'ع', name: 'العربية', hint: 'Arabic' },
  en: { short: 'EN', name: 'English', hint: 'الإنجليزية' }
};

export interface LocaleSwitcherProps {
  languages?: LangCode[];
  lang?: LangCode;
  onLangChange?: (lang: LangCode) => void;
  currencies?: CurrencyOption[];
  currency?: string;
  onCurrencyChange?: (code: string) => void;
  /** فوق صورة غلاف: زجاجيّ داكن بدل سطح المتجر */
  floating?: boolean;
}

const PANEL_WIDTH = 272;

const LocaleSwitcher: React.FC<LocaleSwitcherProps> = ({
  languages = [],
  lang = 'ar',
  onLangChange,
  currencies = [],
  currency,
  onCurrencyChange,
  floating
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // المكوّن قد يُرسم خارج مزوّد اللغة (رأس صفحة المنتج) — فيبني دالّته
  const t = makeT(lang);

  const showLanguages = languages.length > 1 && !!onLangChange;
  const showCurrencies = currencies.length > 1 && !!onCurrencyChange;

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vw = window.innerWidth;
    const width = Math.min(PANEL_WIDTH, vw - 16);
    // تحت الزرّ ومتمركزٌ عليه، ثمّ يُحصر داخل الشاشة — يعمل في الاتجاهين
    // بلا حساب «بداية» و«نهاية» تختلفان بين العربية والإنجليزية
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), vw - width - 8);
    setPos({ top: rect.bottom + 8, left, width });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    // التمرير يُغلق ولا يُلاحق: بطاقةٌ تطفو منفصلةً عن زرّها بعد التمرير
    // تبدو عطلاً
    const onScroll = () => setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll);
    };
  }, [open, place]);

  if (!showLanguages && !showCurrencies) return null;

  const activeCurrency = currencies.find((c) => c.code === currency);
  const summary = [showLanguages ? NATIVE[lang]?.short : null, showCurrencies ? activeCurrency?.symbol : null]
    .filter(Boolean)
    .join(' · ');

  const ariaLabel =
    showLanguages && showCurrencies
      ? t('اللغة والعملة')
      : showLanguages
        ? t('لغة العرض')
        : t('عملة العرض');

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${summary}`}
        title={ariaLabel}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: floating ? 38 : 40,
          padding: floating ? '0 11px' : '0 10px 0 11px',
          borderRadius: floating ? 999 : sd.rButton,
          border: floating ? '1px solid rgba(255,255,255,0.3)' : `${sd.borderW} solid ${open ? sf.accent : sf.border}`,
          background: floating ? 'rgba(0,0,0,0.38)' : sf.surface,
          color: floating ? '#fff' : sf.text,
          backdropFilter: floating ? 'blur(8px)' : undefined,
          WebkitBackdropFilter: floating ? 'blur(8px)' : undefined,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12.5,
          fontWeight: 800,
          flexShrink: 0,
          transition: 'border-color .15s ease'
        }}
      >
        <IoGlobeOutline size={17} aria-hidden="true" />
        <span dir="auto" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {summary}
        </span>
        <IoChevronDown
          size={12}
          aria-hidden="true"
          className="shop-only-wide"
          style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }}
        />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={panelRef}
                role="dialog"
                aria-label={ariaLabel}
                dir="rtl"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: pos.top,
                  left: pos.left,
                  width: pos.width,
                  zIndex: 1300,
                  background: sf.card,
                  color: sf.text,
                  border: `${sd.borderW} solid ${sf.border}`,
                  borderRadius: sd.rCard,
                  boxShadow: '0 18px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
                  padding: 8,
                  fontFamily: sf.font,
                  transformOrigin: 'top center'
                }}
              >
                {showLanguages && (
                  <Section title={t('اللغة')}>
                    {languages.map((code) => (
                      <OptionRow
                        key={code}
                        active={code === lang}
                        lead={<span lang={code} style={{ fontWeight: 900, fontSize: 12 }}>{NATIVE[code].short}</span>}
                        label={<span lang={code}>{NATIVE[code].name}</span>}
                        hint={NATIVE[code].hint}
                        onPick={() => {
                          onLangChange?.(code);
                          setOpen(false);
                        }}
                      />
                    ))}
                  </Section>
                )}

                {showLanguages && showCurrencies && (
                  <div style={{ height: 1, background: sf.border, margin: '6px 8px' }} />
                )}

                {showCurrencies && (
                  <Section title={t('عرض الأسعار بـ')}>
                    {currencies.map((option) => (
                      <OptionRow
                        key={option.code}
                        active={option.code === currency}
                        lead={<span style={{ fontWeight: 900, fontSize: 12.5 }}>{option.symbol}</span>}
                        label={t(option.label)}
                        hint={option.code}
                        onPick={() => {
                          onCurrencyChange?.(option.code);
                          setOpen(false);
                        }}
                      />
                    ))}
                  </Section>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div role="group" aria-label={title} style={{ display: 'grid', gap: 2 }}>
    <div
      style={{
        padding: '6px 10px 4px',
        fontSize: 11,
        fontWeight: 800,
        color: sf.muted,
        letterSpacing: '0.02em'
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

const OptionRow: React.FC<{
  active: boolean;
  lead: React.ReactNode;
  label: React.ReactNode;
  hint?: string;
  onPick: () => void;
}> = ({ active, lead, label, hint, onPick }) => (
  <button
    type="button"
    role="menuitemradio"
    aria-checked={active}
    onClick={onPick}
    className="sf-locale-row"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      minHeight: 44,
      padding: '6px 10px',
      borderRadius: `calc(${sd.rCard} - 6px)`,
      border: 'none',
      background: active ? sf.accentSoft : 'transparent',
      color: sf.text,
      cursor: 'pointer',
      fontFamily: 'inherit',
      textAlign: 'start'
    }}
  >
    <span
      aria-hidden="true"
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        background: active ? sf.accent : sf.surface,
        color: active ? sf.onAccent : sf.text
      }}
    >
      {lead}
    </span>
    <span style={{ flex: 1, minWidth: 0, display: 'grid' }}>
      <span style={{ fontSize: 13.5, fontWeight: active ? 800 : 600 }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: sf.muted }}>{hint}</span>}
    </span>
    {active && <IoCheckmark size={17} style={{ color: sf.accent, flexShrink: 0 }} />}
  </button>
);

export default LocaleSwitcher;
