// frontend/src/components/storefront/BannerCarousel.tsx
//
// بانر حقيقي بعرض كامل، لا بطاقات مكدّسة عمودياً.
//
// بلا مكتبة كاروسيل: التمرير الأصلي مع scroll-snap يعطي سحباً بإصبع أنعم من
// أي محاكاة بجافاسكربت، ويعمل بلا جافاسكربت أصلاً، ولا يضيف كيلوبايتاً واحداً
// إلى الحزمة. الجافاسكربت هنا للنقاط والتشغيل التلقائي فقط.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

export interface BannerSlide {
  id: string;
  imageUrl: string;
  title?: string | null;
  subtitle?: string | null;
  linkUrl?: string | null;
}

interface BannerCarouselProps {
  slides: BannerSlide[];
  /** مللي ثانية بين الشرائح. صفر يوقف التشغيل التلقائي. */
  autoPlayMs?: number;
  /** نسبة العرض إلى الارتفاع — تمنع قفزة التخطيط قبل تحميل الصورة */
  aspectRatio?: string;
  className?: string;
  ariaLabel?: string;
}

/** هل يفضّل المستخدم تقليل الحركة؟ يُقرأ عند التركيب ويُتابَع عند التغيير. */
const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
};

const BannerCarousel: React.FC<BannerCarouselProps> = ({
  slides,
  autoPlayMs = 5000,
  aspectRatio = '21 / 9',
  className = '',
  ariaLabel = 'عروض وإعلانات'
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const visible = useMemo(() => slides.filter((slide) => slide.imageUrl), [slides]);
  const count = visible.length;

  // التشغيل التلقائي يتوقف مع تفضيل تقليل الحركة: بانر يتحرّك وحده مصدر
  // إزعاج حقيقي لمن طلب سكوناً، وليس زينة اختيارية.
  const autoPlayActive = autoPlayMs > 0 && count > 1 && !paused && !reducedMotion;

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[index] as HTMLElement | undefined;
    if (!slide) return;
    track.scrollTo({
      left: slide.offsetLeft - track.offsetLeft,
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  }, [reducedMotion]);

  // الشريحة النشطة تُشتق من موضع التمرير الفعلي لا من عدّاد داخلي، فتبقى
  // النقاط صادقة حين يسحب المستخدم بإصبعه بدل الضغط على الأسهم.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(index)) setActive(index);
          }
        });
      },
      { root: track, threshold: 0.6 }
    );

    Array.from(track.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [count]);

  useEffect(() => {
    if (!autoPlayActive) return;
    const timer = window.setInterval(() => {
      goTo((active + 1) % count);
    }, autoPlayMs);
    return () => window.clearInterval(timer);
  }, [autoPlayActive, active, count, autoPlayMs, goTo]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    // في واجهة RTL يقدّم السهم الأيسر ويؤخّر الأيمن — عكس LTR
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo((active + 1) % count); }
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo((active - 1 + count) % count); }
  };

  if (count === 0) return null;

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    background: 'var(--sf-surface)'
  };

  return (
    <section
      className={className}
      style={wrapperStyle}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {visible.map((slide, index) => {
          const Wrapper = slide.linkUrl ? 'a' : 'div';
          const linkProps = slide.linkUrl
            ? { href: slide.linkUrl, target: '_blank', rel: 'noopener noreferrer' }
            : {};

          return (
            <div
              key={slide.id}
              data-index={index}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} من ${count}`}
              style={{ flex: '0 0 100%', scrollSnapAlign: 'start', position: 'relative' }}
            >
              <Wrapper {...(linkProps as any)} style={{ display: 'block', position: 'relative' }}>
                <img
                  src={slide.imageUrl}
                  alt={slide.title || ''}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{
                    width: '100%',
                    aspectRatio,
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />

                {(slide.title || slide.subtitle) && (
                  <div
                    style={{
                      position: 'absolute',
                      insetInlineStart: 0,
                      insetInlineEnd: 0,
                      bottom: 0,
                      padding: '28px 18px 20px',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0))',
                      color: '#fff'
                    }}
                  >
                    {slide.title && (
                      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{slide.title}</div>
                    )}
                    {slide.subtitle && (
                      <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.7 }}>{slide.subtitle}</div>
                    )}
                  </div>
                )}
              </Wrapper>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo((active - 1 + count) % count)}
            aria-label="الشريحة السابقة"
            style={{ ...arrowStyle, insetInlineEnd: 10 }}
          >
            <IoChevronForward size={18} />
          </button>

          <button
            type="button"
            onClick={() => goTo((active + 1) % count)}
            aria-label="الشريحة التالية"
            style={{ ...arrowStyle, insetInlineStart: 10 }}
          >
            <IoChevronBack size={18} />
          </button>

          <div
            style={{
              position: 'absolute',
              bottom: 10,
              insetInlineStart: 0,
              insetInlineEnd: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 6
            }}
          >
            {visible.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`انتقل إلى الشريحة ${index + 1}`}
                aria-current={index === active}
                className="btn-inline"
                style={{
                  width: index === active ? 22 : 7,
                  height: 7,
                  minHeight: 7,
                  minWidth: 7,
                  padding: 0,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background: index === active ? 'var(--sf-accent)' : 'rgba(255,255,255,0.55)',
                  transition: 'width 0.25s ease'
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

const arrowStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
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
  background: 'rgba(0,0,0,0.42)',
  color: '#fff',
  backdropFilter: 'blur(6px)'
};

export default BannerCarousel;
