// frontend/src/components/marketing/Devices.tsx
//
// إطارات أجهزة للعرض التسويقي. الشاشة داخلها تُصمَّم بمقاسها الحقيقي
// (٣٧٥ للجوال، ١٢٨٠ لسطح المكتب) ثم تُصغَّر بـ `transform` — فتبدو لقطةً
// من المنتج لا رسماً مصغّراً بخطوطٍ من ٦ بكسل.

import React from 'react';

const PHONE_BASE_W = 375;
const PHONE_BASE_H = 790;
const DESKTOP_BASE_W = 1280;
const DESKTOP_BASE_H = 800;

export const Scaled: React.FC<{ baseW: number; baseH: number; width: number; children: React.ReactNode }> = ({
  baseW,
  baseH,
  width,
  children
}) => {
  const scale = width / baseW;
  return (
    <div style={{ position: 'relative', width, height: baseH * scale, overflow: 'hidden' }}>
      <div
        dir="rtl"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: baseW,
          height: baseH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        {children}
      </div>
    </div>
  );
};

interface PhoneProps {
  width?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  label?: string;
}

export const PhoneFrame: React.FC<PhoneProps> = ({ width = 250, className = '', style, children, label }) => {
  const pad = width >= 230 ? 9 : 7;
  const screenW = width - pad * 2;
  return (
    <div
      className={`ss-phone ${width < 230 ? 'ss-phone-sm' : ''} ${className}`}
      style={{ width, aspectRatio: 'auto', padding: pad, ...style }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <div className="ss-phone-screen" style={{ height: 'auto' }}>
        <div className="ss-phone-notch" />
        <Scaled baseW={PHONE_BASE_W} baseH={PHONE_BASE_H} width={screenW}>
          {children}
        </Scaled>
      </div>
    </div>
  );
};

export const LaptopFrame: React.FC<{ width: number; children: React.ReactNode; label?: string }> = ({
  width,
  children,
  label
}) => (
  <div className="ss-laptop" style={{ maxWidth: width }} role={label ? 'img' : undefined} aria-label={label}>
    <div className="ss-laptop-lid">
      <div className="ss-laptop-screen" style={{ aspectRatio: 'auto' }}>
        <Scaled baseW={DESKTOP_BASE_W} baseH={DESKTOP_BASE_H} width={width - 24}>
          {children}
        </Scaled>
      </div>
    </div>
    <div className="ss-laptop-base" />
  </div>
);

/** عرض الإطار يتبع عرض الحاوية — للأجهزة داخل تخطيطٍ مرن. */
export const useElementWidth = <T extends HTMLElement>(fallback: number) => {
  const ref = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState(fallback);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
};
