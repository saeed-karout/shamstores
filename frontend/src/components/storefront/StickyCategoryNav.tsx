// frontend/src/components/storefront/StickyCategoryNav.tsx
// شريط فئات ملتصق مع تتبّع القسم المرئي (scroll-spy) بدل الفلترة.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sf } from '@/utils/storefrontTheme';

export interface CategoryNavItem {
  id: string;
  name: string;
  count?: number;
}

export interface StickyCategoryNavProps {
  categories: CategoryNavItem[];
  /** المعرّف النشط عند التحكم من الخارج (وضع الفلترة) */
  activeId?: string | null;
  onSelect?: (id: string) => void;
  /** تفعيل تتبّع التمرير والانتقال السلس إلى الأقسام */
  scrollSpy?: boolean;
  /** بادئة معرّفات الأقسام في الصفحة */
  sectionIdPrefix?: string;
  /** ارتفاع الرأس الملتصق فوق الشريط */
  offsetTop?: number;
  /** إظهار خيار "الكل" */
  showAll?: boolean;
  allLabel?: string;
}

const StickyCategoryNav: React.FC<StickyCategoryNavProps> = ({
  categories,
  activeId,
  onSelect,
  scrollSpy = true,
  sectionIdPrefix = 'cat-',
  offsetTop = 0,
  showAll = true,
  allLabel = 'الكل'
}) => {
  const [spyActive, setSpyActive] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  const items = useMemo(
    () => (showAll ? [{ id: '__all__', name: allLabel }, ...categories] : categories),
    [categories, showAll, allLabel]
  );

  const current = activeId ?? spyActive ?? (showAll ? '__all__' : categories[0]?.id ?? null);

  // ---------- تتبّع القسم المرئي ----------
  useEffect(() => {
    if (!scrollSpy || categories.length === 0) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const sections = categories
      .map((c) => document.getElementById(`${sectionIdPrefix}${c.id}`))
      .filter((el): el is HTMLElement => !!el);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;

        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) {
          setSpyActive(visible[0].target.id.replace(sectionIdPrefix, ''));
        }
      },
      {
        // نعتبر القسم نشطاً عندما يعبر الثلث العلوي من الشاشة
        rootMargin: `-${offsetTop + 90}px 0px -60% 0px`,
        threshold: 0
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories, scrollSpy, sectionIdPrefix, offsetTop]);

  // ---------- إبقاء العنصر النشط داخل مجال الرؤية ----------
  useEffect(() => {
    if (!current || !listRef.current) return;
    const button = listRef.current.querySelector<HTMLElement>(`[data-cat="${current}"]`);
    button?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [current]);

  const handleClick = (id: string) => {
    onSelect?.(id);

    if (!scrollSpy) return;

    if (id === '__all__') {
      isProgrammaticScroll.current = true;
      setSpyActive(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 650);
      return;
    }

    const target = document.getElementById(`${sectionIdPrefix}${id}`);
    if (!target) return;

    isProgrammaticScroll.current = true;
    setSpyActive(id);

    const top = target.getBoundingClientRect().top + window.scrollY - offsetTop - 66;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

    window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 650);
  };

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="أقسام القائمة"
      style={{
        position: 'sticky',
        top: offsetTop,
        zIndex: 40,
        background: sf.bg,
        borderBottom: `1px solid ${sf.border}`,
        // يمتد بعرض الشاشة كاملاً حتى داخل حاوية محدودة العرض
        marginInline: -14,
        paddingInline: 14
      }}
    >
      <style>{'.sf-cat-scroll::-webkit-scrollbar{display:none}'}</style>
      <div
        ref={listRef}
        className="sf-cat-scroll"
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          padding: '10px 0',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {items.map((item) => {
          const isActive = current === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-cat={item.id}
              onClick={() => handleClick(item.id)}
              aria-current={isActive ? 'true' : undefined}
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 38,
                padding: '0 16px',
                borderRadius: 999,
                border: `1px solid ${isActive ? 'transparent' : sf.border}`,
                background: isActive ? sf.accent : sf.card,
                color: isActive ? sf.onAccent : sf.muted,
                fontSize: 13,
                fontWeight: isActive ? 800 : 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background .18s ease, color .18s ease'
              }}
            >
              {item.name}
              {typeof item.count === 'number' && item.count > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: isActive ? 0.75 : 0.6
                  }}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default StickyCategoryNav;
