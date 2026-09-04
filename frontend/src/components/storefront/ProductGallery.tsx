// frontend/src/components/storefront/ProductGallery.tsx
//
// معرض صور المنتج: صورة كبيرة مع مصغّرات، وتكبير عند النقر.
//
// المنتج كان يحمل صورة واحدة في المخطط، فلم يكن للمعرض ما يعرضه. بعد إضافة
// حقل `images` صارت الواجهة قادرة على عرض ما يكفي لاتخاذ قرار شراء — زبون
// يرى صورة واحدة لمنتج يشتريه بلا لمسه يتردّد.
//
// بلا مكتبة: التمرير الأصلي مع scroll-snap للمصغّرات، والتكبير بحوار أصلي.

import { useEffect, useRef, useState } from 'react';
import { IoChevronBack, IoChevronForward, IoExpandOutline, IoClose } from 'react-icons/io5';

interface Props {
  images: string[];
  alt: string;
  /** نسبة العرض إلى الارتفاع — تمنع قفزة التخطيط قبل تحميل الصورة */
  aspectRatio?: string;
}

const ProductGallery: React.FC<Props> = ({ images, alt, aspectRatio = '1 / 1' }) => {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const usable = images.filter(Boolean);
  const count = usable.length;

  // إغلاق التكبير بمفتاح Escape — سلوك متوقّع من أي حوار
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomed(false);
      if (event.key === 'ArrowLeft') setActive((i) => (i + 1) % count);
      if (event.key === 'ArrowRight') setActive((i) => (i - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    // منع تمرير الصفحة خلف الحوار
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [zoomed, count]);

  useEffect(() => {
    if (zoomed) dialogRef.current?.focus();
  }, [zoomed]);

  if (count === 0) {
    return (
      <div
        style={{
          aspectRatio,
          background: 'var(--sf-surface)',
          border: '1px solid var(--sf-border)',
          borderRadius: 16,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--sf-muted)',
          fontSize: 13
        }}
      >
        لا توجد صورة لهذا المنتج
      </div>
    );
  }

  const go = (next: number) => setActive(((next % count) + count) % count);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* الصورة الكبيرة */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: 'var(--sf-surface)' }}>
        <img
          src={usable[active]}
          alt={count > 1 ? `${alt} — صورة ${active + 1} من ${count}` : alt}
          loading="eager"
          decoding="async"
          style={{ width: '100%', aspectRatio, objectFit: 'cover', display: 'block' }}
        />

        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="تكبير الصورة"
          style={{ ...roundBtn, insetInlineEnd: 10, top: 10 }}
        >
          <IoExpandOutline size={17} />
        </button>

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(active - 1)} aria-label="الصورة السابقة"
              style={{ ...roundBtn, insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <IoChevronForward size={18} />
            </button>
            <button type="button" onClick={() => go(active + 1)} aria-label="الصورة التالية"
              style={{ ...roundBtn, insetInlineStart: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <IoChevronBack size={18} />
            </button>

            <div style={counterStyle}>{active + 1} / {count}</div>
          </>
        )}
      </div>

      {/* المصغّرات — تظهر فقط حين يكون هناك ما يُختار بينه */}
      {count > 1 && (
        <div
          className="no-scrollbar"
          style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x proximity', paddingBottom: 2 }}
        >
          {usable.map((src, index) => (
            <button
              key={src + index}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`عرض الصورة ${index + 1}`}
              aria-current={index === active}
              className="btn-inline"
              style={{
                flex: '0 0 auto',
                width: 62,
                height: 62,
                minWidth: 62,
                minHeight: 62,
                padding: 0,
                borderRadius: 11,
                overflow: 'hidden',
                cursor: 'pointer',
                scrollSnapAlign: 'start',
                background: 'var(--sf-surface)',
                border: index === active
                  ? '2px solid var(--sf-accent)'
                  : '1px solid var(--sf-border)',
                opacity: index === active ? 1 : 0.66,
                transition: 'opacity 0.15s ease'
              }}
            >
              <img src={src} alt="" loading="lazy" decoding="async"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}

      {/* التكبير */}
      {zoomed && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} — عرض مكبّر`}
          tabIndex={-1}
          onClick={() => setZoomed(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="إغلاق العرض المكبّر"
            style={{ ...roundBtn, position: 'fixed', top: 16, insetInlineEnd: 16, background: 'rgba(255,255,255,0.16)' }}
          >
            <IoClose size={20} />
          </button>

          <img
            src={usable[active]}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '86vh', objectFit: 'contain', borderRadius: 10 }}
          />

          {count > 1 && (
            <div style={{ position: 'fixed', bottom: 22, color: '#fff', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              {active + 1} / {count}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const roundBtn: React.CSSProperties = {
  position: 'absolute',
  width: 34,
  height: 34,
  minWidth: 34,
  minHeight: 34,
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.45)',
  color: '#fff',
  backdropFilter: 'blur(6px)'
};

const counterStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 10,
  insetInlineStart: 10,
  background: 'rgba(0,0,0,0.5)',
  color: '#fff',
  fontSize: 11.5,
  padding: '3px 9px',
  borderRadius: 999,
  fontVariantNumeric: 'tabular-nums'
};

export default ProductGallery;
