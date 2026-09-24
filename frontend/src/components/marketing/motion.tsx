// frontend/src/components/marketing/motion.tsx
//
// أدوات حركةٍ خفيفة للموقع التسويقي — بلا مكتبة: IntersectionObserver
// وrequestAnimationFrame فقط. كلّها تحترم «تقليل الحركة» في النظام:
// الأرقام تظهر بقيمتها النهائية فوراً، والعنصر يُعدّ «ظاهراً» من البداية.

import React, { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** يصبح `true` مرّةً واحدة حين يدخل العنصر الشاشة، ولا يعود. */
export function useInView<T extends Element>(
  threshold = 0.25
): [React.MutableRefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -60px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, threshold]);
  return [ref, inView];
}

interface CountUpProps {
  value: number;
  start: boolean;
  duration?: number;
  delay?: number;
  format?: (n: number) => string;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * رقمٌ يعدّ من الصفر إلى قيمته حين `start`.
 * القيمة النهائية مكتوبةٌ لقارئ الشاشة من البداية — العدّ زخرفةٌ بصرية فقط.
 */
export const CountUp: React.FC<CountUpProps> = ({ value, start, duration = 1400, delay = 0, format = defaultFormat }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (prefersReducedMotion()) {
      setN(value);
      return;
    }
    let raf = 0;
    let t0 = 0;
    const tick = (t: number) => {
      if (!t0) t0 = t + delay;
      const p = Math.min(1, Math.max(0, (t - t0) / duration));
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, value, duration, delay]);
  return (
    <>
      <span aria-hidden="true">{format(n)}</span>
      <span className="ss-sr">{format(value)}</span>
    </>
  );
};
