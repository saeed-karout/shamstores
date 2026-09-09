// frontend/src/components/storefront/StorefrontSkeleton.tsx
// هيكل انتظار بدل شاشة تحميل فارغة — يقلّل الإحساس بالبطء ويمنع قفزة التخطيط.

import React from 'react';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';

const shimmerCss = `
@keyframes sf-shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
.sf-skel {
  background: linear-gradient(
    90deg,
    var(--sf-surface, #0F3D31) 25%,
    var(--sf-card, #112E23) 50%,
    var(--sf-surface, #0F3D31) 75%
  );
  background-size: 200% 100%;
  animation: sf-shimmer 1.4s ease-in-out infinite;
  border-radius: 10px;
}
@media (prefers-reduced-motion: reduce) {
  .sf-skel { animation: none; }
}
`;

const Line: React.FC<{ w?: string | number; h?: number; style?: React.CSSProperties }> = ({
  w = '100%',
  h = 12,
  style
}) => <div className="sf-skel" style={{ width: w, height: h, ...style }} />;

const StorefrontSkeleton: React.FC<{ cards?: number }> = ({ cards = 6 }) => (
  <div style={{ minHeight: '100vh', background: sf.bg, fontFamily: sf.font }}>
    <style>{shimmerCss}</style>

    {/* الغلاف */}
    <div className="sf-skel" style={{ width: '100%', aspectRatio: '16 / 7', borderRadius: 0 }} />

    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 14px' }}>
      {/* بطاقة المتجر */}
      <div
        style={{
          background: sf.card,
          border: `1px solid ${sf.border}`,
          borderRadius: sd.rCard,
          padding: 16,
          marginTop: -42,
          position: 'relative',
          display: 'flex',
          gap: 14
        }}
      >
        <div className="sf-skel" style={{ width: 72, height: 72, borderRadius: sd.rImage, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 4 }}>
          <Line w="60%" h={16} />
          <Line w="85%" h={11} />
          <Line w="45%" h={11} />
        </div>
      </div>

      {/* شريط الفئات */}
      <div style={{ display: 'flex', gap: 8, marginTop: 18, overflow: 'hidden' }}>
        {[76, 92, 68, 104, 80].map((w, i) => (
          <Line key={i} w={w} h={36} style={{ borderRadius: sd.rChip, flexShrink: 0 }} />
        ))}
      </div>

      {/* بطاقات الأصناف */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18, paddingBottom: 40 }}>
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 12,
              background: sf.card,
              border: `1px solid ${sf.border}`,
              borderRadius: sd.rCard,
              padding: 12
            }}
          >
            <div className="sf-skel" style={{ width: 96, height: 96, borderRadius: sd.rImage, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 6 }}>
              <Line w="55%" h={14} />
              <Line w="90%" h={10} />
              <Line w="70%" h={10} />
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
                <Line w={70} h={14} />
                <Line w={40} h={30} style={{ borderRadius: sd.rButton }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default StorefrontSkeleton;
