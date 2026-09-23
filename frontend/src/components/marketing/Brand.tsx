// frontend/src/components/marketing/Brand.tsx
//
// شعار شام ستورز — علامة S من `public/logo.svg` نفسها، مقصوصةً إلى حدودها
// كي تُرسم بأيّ لون وحجم بلا خلفية الشعار المربّعة.

import React from 'react';

interface MarkProps {
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const BrandMark: React.FC<MarkProps> = ({ size = 32, color = 'currentColor', className, style, title }) => (
  <svg
    viewBox="330 180 380 670"
    width={size}
    height={typeof size === 'number' ? (size * 670) / 380 : undefined}
    className={className}
    style={style}
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
    aria-label={title}
    fill={color}
  >
    <path d="M533.32,835.34c-25.23-138.24-87.03-228.67-182.84-274.34-2.74-1.3-4.67-4.23-5-7.68h0c-.36-3.67,1.16-7.22,3.87-9.05,25.45-17.26,51.75-35.1,79.7-54.05,3.53-2.39,8.02-1.17,10.29,2.81,4.25,7.46,9.21,16.17,14.63,25.69,2.33,4.08,1.49,9.61-1.9,12.48-4.37,3.7-9.24,7.83-14.57,12.35-2.99,2.54-2.93,6.57.14,8.99,43.03,33.87,76.13,81.45,99.09,145.43,2.83,7.9,7.8,8.12,11.08.47,7.44-17.37,14.68-34.25,22.13-51.64,1.38-3.21,1.03-7.07-.9-9.86-37.68-54.65-75.99-110.2-114.97-166.72-2.36-3.43-2.31-8.37.14-11.7,40.8-55.51,61.2-144.91,74.07-217.77,1.7-9.61,13.39-9.65,15.14-.06,26.63,145.78,96.57,262.08,193.99,301.95,6.42,2.63,6.99,13.07.93,16.7-27.22,16.31-56.27,33.72-86.9,52.08-3.39,2.03-7.53.87-9.77-2.74-4.03-6.52-9.1-14.69-14.8-23.91-2.53-4.09-1.75-9.82,1.74-12.76,4.95-4.18,10.14-8.56,15.69-13.24,2.66-2.25,2.58-5.79-.18-7.86-44.66-33.43-78.43-81.93-101.94-146.55-2.1-5.77-6.92-4.6-9.33,1-7.7,17.97-15.25,35.57-23.1,53.87-1.37,3.2.05,5.79,1.97,8.57,37.63,54.7,75.52,109.77,114.49,166.41,2.36,3.43,2.3,8.36-.14,11.7-39.27,53.57-64.66,116.74-77.61,189.39-1.71,9.59-13.39,9.64-15.14.06Z" />
    <path d="M599.15,383.89h0c1.24,5.11,6.63,7.96,11.59,6.2,19.56-6.98,45-2.71,55.62,14.37,10.43,16.77,5.92,39.21-7.68,53.23-4.14,4.27-4.02,11.08.27,15.2h0c25.38-15.78,33.18-49.27,17.4-74.64-15.78-25.38-51.82-30.13-77.2-14.35Z" />
  </svg>
);

interface LogoProps {
  /** لون النصّ — الافتراضيّ يرث من الأب */
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

/** الشعار الكامل: العلامة ثم «شام ستورز / SHAM STORES» كما في دليل الهوية. */
export const BrandLogo: React.FC<LogoProps> = ({ tone = 'light', size = 'md' }) => {
  const dims = { sm: [22, 17, 8.5], md: [28, 20, 9.5], lg: [40, 28, 12] }[size];
  const [mark, ar, en] = dims;
  const markColor = tone === 'light' ? 'var(--ss-lime, #cdef7c)' : 'var(--ss-forest-700, #084835)';
  const textColor = tone === 'light' ? '#ffffff' : 'var(--ss-forest-700, #084835)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: textColor }}>
      <BrandMark size={mark} color={markColor} />
      <span style={{ display: 'grid', lineHeight: 1.05 }}>
        <span style={{ fontSize: ar, fontWeight: 900, letterSpacing: '-0.01em' }}>شام ستورز</span>
        <span
          className="latin"
          style={{ fontSize: en, fontWeight: 700, letterSpacing: '0.28em', opacity: 0.8, marginTop: 3 }}
        >
          SHAM STORES
        </span>
      </span>
    </span>
  );
};
