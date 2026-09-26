// frontend/src/components/storefront/ProductGallery.tsx
//
// معرض صور المنتج: سحبٌ بالإصبع، أسهمٌ على الشاشة الكبيرة، لوحة المفاتيح،
// مصغّرات، وعرضٌ مكبَّر بملء الشاشة.
//
// **الفهرس يملكه الأب لا المعرض.** اختيار «الأزرق» في خيارات المنتج يجب أن
// يقلب الصورة، والمعرض لا يعرف شيئاً عن الخيارات — فالأب يمرّر الفهرس
// ويستقبل تغييره، والمعرض يعرض ويُبلغ فقط.
//
// **التمرير أصليّ (scroll-snap) لا محاكاة** — كما في BannerCarousel: السحب
// بالإصبع أنعم من أي حساب جافاسكربت، ويعمل على كل هاتف بلا مكتبة.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IoChevronBack, IoChevronForward, IoClose, IoExpandOutline } from 'react-icons/io5';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import { sd } from '@/utils/storefrontDesign';
import { useT } from '@/i18n/storefront';

interface ProductGalleryProps {
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  alt: string;
  /** ارتفاع الصورة الرئيسية — رقمٌ بالبكسل أو قيمة CSS */
  height?: number | string;
  radius?: number | string;
  /** مرشّح CSS للصور — «نفد» يُطفئ الألوان */
  imageFilter?: string;
  /** لون حدّ المصغّرة المختارة */
  accent?: string;
  /** شاراتٌ فوق الصورة (خصم، نفد…) — يرسمها الأب */
  children?: React.ReactNode;
}

const clampIndex = (value: number, count: number) => (count === 0 ? 0 : ((value % count) + count) % count);

const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  index,
  onIndexChange,
  alt,
  height = 384,
  radius = sd.rImage,
  imageFilter,
  accent = 'var(--sf-accent)',
  children
}) => {
  const { t } = useT();
  const count = images.length;
  const current = clampIndex(index, count);
  const trackRef = useRef<HTMLDivElement>(null);
  // أثناء تمريرٍ برمجيّ تمرّ الشرائح الوسيطة أمام المراقب — لو أبلغنا عنها
  // لقفز الفهرس إلى الوسط وعاد، وهو ارتجافٌ ظاهر عند القفز من الأولى إلى الرابعة
  const programmatic = useRef(false);
  const settleTimer = useRef<number | undefined>(undefined);
  const [lightbox, setLightbox] = useState(false);

  const scrollToIndex = useCallback((target: number, smooth = true) => {
    const track = trackRef.current;
    const slide = track?.children[target] as HTMLElement | undefined;
    if (!track || !slide) return;
    const left = slide.offsetLeft - track.offsetLeft;
    if (Math.abs(track.scrollLeft - left) < 2) return;
    programmatic.current = true;
    window.clearTimeout(settleTimer.current);
    // يُحرَّر عند `scrollend`، والمهلة احتياطٌ لمتصفّحٍ لا يعرفه (Safari)
    settleTimer.current = window.setTimeout(() => {
      programmatic.current = false;
    }, 1000);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left, behavior: smooth && !reduced ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const release = () => {
      programmatic.current = false;
      window.clearTimeout(settleTimer.current);
    };
    track.addEventListener('scrollend', release);
    return () => track.removeEventListener('scrollend', release);
  }, []);

  // الفهرس تغيّر من الخارج (مصغّرة، خيار لون) — يلحقه التمرير
  useEffect(() => {
    scrollToIndex(current);
  }, [current, scrollToIndex]);

  // السحب بالإصبع يُبلغ الأب بالشريحة الظاهرة فعلاً
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (programmatic.current) return;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const next = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(next)) onIndexChange(next);
        });
      },
      { root: track, threshold: 0.6 }
    );
    Array.from(track.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [count, onIndexChange]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const go = (delta: number) => onIndexChange(clampIndex(current + delta, count));

  // الواجهة RTL: السهم الأيسر يتقدّم والأيمن يرجع — كما في BannerCarousel
  const onKeyDown = (event: React.KeyboardEvent) => {
    // العرض المكبَّر يستمع للوحة المفاتيح بنفسه — ولو أجبنا هنا أيضاً لقفز صورتين
    if (lightbox) return;
    if (count < 2 && event.key !== 'Enter') return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); go(-1); }
    // Enter على الأزرار الداخلية يخصّها هي — المعرض يفتح التكبير فقط حين يُركَّز هو
    if (event.key === 'Enter' && event.target === event.currentTarget) { event.preventDefault(); setLightbox(true); }
  };

  const heightCss = typeof height === 'number' ? `${height}px` : height;

  if (count === 0) return null;

  return (
    <div>
      <style>{`
        .pg-arrow { display: none; }
        @media (hover: hover) and (pointer: fine) { .pg-arrow { display: flex; } }
        .pg-track { -webkit-overflow-scrolling: touch; }
        .pg-track::-webkit-scrollbar { display: none; }
      `}</style>

      <section
        aria-roledescription="carousel"
        aria-label={alt}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{ position: 'relative', borderRadius: radius, overflow: 'hidden', outlineOffset: 3 }}
      >
        <div
          ref={trackRef}
          className="pg-track"
          style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
        >
          {images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              data-index={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              style={{ flex: '0 0 100%', scrollSnapAlign: 'start' }}
            >
              <img
                src={getImageUrl(sizedImage(src, 'md'))}
                alt={i === 0 ? alt : ''}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onClick={() => setLightbox(true)}
                style={{
                  width: '100%',
                  height: heightCss,
                  objectFit: 'cover',
                  display: 'block',
                  cursor: 'zoom-in',
                  filter: imageFilter
                }}
              />
            </div>
          ))}
        </div>

        {children}

        {/* تكبير — زرٌّ صريح لمن لا يعرف أن الصورة تُنقر */}
        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label={t('تكبير الصورة')}
          style={{ ...roundBtn, bottom: 12, insetInlineStart: 12, top: 'auto', transform: 'none' }}
        >
          <IoExpandOutline size={17} />
        </button>

        {count > 1 && (
          <>
            <button type="button" className="pg-arrow" onClick={() => go(-1)} aria-label={t('الصورة السابقة')} style={{ ...roundBtn, display: undefined, insetInlineStart: 12 }}>
              <IoChevronForward size={18} />
            </button>
            <button type="button" className="pg-arrow" onClick={() => go(1)} aria-label={t('الصورة التالية')} style={{ ...roundBtn, display: undefined, insetInlineEnd: 12 }}>
              <IoChevronBack size={18} />
            </button>
            <span
              aria-live="polite"
              style={{
                position: 'absolute',
                bottom: 12,
                insetInlineEnd: 12,
                padding: '3px 10px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                direction: 'ltr'
              }}
            >
              {current + 1} / {count}
            </span>
          </>
        )}
      </section>

      {count > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', paddingBottom: 6 }}>
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`${t('الصورة')} ${i + 1}`}
              aria-current={i === current}
              style={{
                width: 72,
                height: 72,
                minWidth: 72,
                borderRadius: 10,
                overflow: 'hidden',
                border: i === current ? `2px solid ${accent}` : '2px solid transparent',
                opacity: i === current ? 1 : 0.72,
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                background: 'none',
                transition: 'opacity 0.2s, border-color 0.2s'
              }}
            >
              <img src={getImageUrl(sizedImage(src, 'sm'))} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <GalleryLightbox images={images} index={current} alt={alt} onIndexChange={onIndexChange} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
};

/**
 * العرض المكبَّر — صورةٌ كاملة بلا قصّ، ونقرةٌ تكبّرها ضعفين حول موضع النقر.
 *
 * التكبير حول الإصبع لا حول المركز: الزبون ينقر على الدرزة أو الشعار الذي
 * يريد رؤيته، وتكبير المركز يُخرج ما نقر عليه من الشاشة.
 */
const GalleryLightbox: React.FC<{
  images: string[];
  index: number;
  alt: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}> = ({ images, index, alt, onIndexChange, onClose }) => {
  const { t } = useT();
  const count = images.length;
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const touchStart = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      setZoom(null);
      onIndexChange(clampIndex(index + delta, count));
    },
    [index, count, onIndexChange]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') go(1);
      if (event.key === 'ArrowRight') go(-1);
    };
    window.addEventListener('keydown', onKey);
    // الصفحة تحت العرض المكبَّر لا تتمرّر مع الإصبع
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  const toggleZoom = (event: React.MouseEvent<HTMLImageElement>) => {
    if (zoom) {
      setZoom(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      dir="rtl"
      onClick={onClose}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (start === null || zoom) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        // RTL: السحب نحو اليمين يكشف ما على اليسار — أي التالي
        if (Math.abs(dx) > 45) go(dx > 0 ? 1 : -1);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <img
        src={getImageUrl(sizedImage(images[index], 'orig'))}
        alt={alt}
        onClick={(e) => {
          e.stopPropagation();
          toggleZoom(e);
        }}
        style={{
          maxWidth: '100vw',
          maxHeight: '100vh',
          objectFit: 'contain',
          cursor: zoom ? 'zoom-out' : 'zoom-in',
          transform: zoom ? 'scale(2)' : 'none',
          transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : 'center',
          transition: 'transform 0.25s ease',
          userSelect: 'none'
        }}
      />

      <button type="button" onClick={onClose} aria-label={t('إغلاق العرض المكبّر')} style={{ ...roundBtn, top: 16, insetInlineStart: 16, transform: 'none' }}>
        <IoClose size={20} />
      </button>

      {count > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label={t('الصورة السابقة')} style={{ ...roundBtn, insetInlineStart: 16 }}>
            <IoChevronForward size={20} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label={t('الصورة التالية')} style={{ ...roundBtn, insetInlineEnd: 16 }}>
            <IoChevronBack size={20} />
          </button>
          <span style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 13, fontWeight: 700, direction: 'ltr' }}>
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>,
    document.body
  );
};

const roundBtn: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 38,
  height: 38,
  minWidth: 38,
  minHeight: 38,
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.45)',
  color: '#fff',
  backdropFilter: 'blur(6px)',
  zIndex: 2
};

export default ProductGallery;
