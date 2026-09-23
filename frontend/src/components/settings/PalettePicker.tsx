// frontend/src/components/settings/PalettePicker.tsx
//
// ثيمات الألوان الجاهزة في إعدادات التصميم — معاينة مصغّرة لكلّ ثيم (خلفية،
// بطاقة، زرّ، سعر) لا دوائر ألوانٍ منفصلة لا يتخيّل التاجر أثرها معاً.

import React from 'react';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { STOREFRONT_PALETTES, StorefrontPalette, matchPalette, paletteColors } from '@/utils/storefrontPalettes';

interface Props {
  value: Partial<Record<string, string>>;
  onPick: (colors: ReturnType<typeof paletteColors>) => void;
  disabled?: boolean;
  /** ألوان اللوحة نفسها — ليتّسق المكوّن مع صفحة الإعدادات */
  colors: { text: string; muted: string; border: string; accent: string; surf: string };
}

const PalettePicker: React.FC<Props> = ({ value, onPick, disabled, colors: C }) => {
  const current = matchPalette(value as any);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>ثيمات جاهزة</div>
      <p style={{ color: C.muted, fontSize: 12.5, margin: '0 0 12px' }}>
        اختر ثيماً بنقرة، ثم عدّل أيّ لونٍ تحته إن شئت. لا يُحفظ شيء حتى تضغط «حفظ».
      </p>
      <div
        role="radiogroup"
        aria-label="ثيمات الألوان"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}
      >
        {STOREFRONT_PALETTES.map((p) => (
          <PaletteCard
            key={p.key}
            palette={p}
            active={current?.key === p.key}
            disabled={disabled}
            onClick={() => onPick(paletteColors(p))}
            C={C}
          />
        ))}
      </div>
      {!current && (
        <p style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>ألوانك الحالية مخصّصة — لا تطابق ثيماً جاهزاً.</p>
      )}
    </div>
  );
};

const PaletteCard: React.FC<{
  palette: StorefrontPalette;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  C: Props['colors'];
}> = ({ palette: p, active, disabled, onClick, C }) => (
  <button
    type="button"
    role="radio"
    aria-checked={active}
    disabled={disabled}
    onClick={onClick}
    style={{
      padding: 0,
      borderRadius: 14,
      overflow: 'hidden',
      border: `2px solid ${active ? C.accent : C.border}`,
      background: C.surf,
      cursor: disabled ? 'not-allowed' : 'pointer',
      textAlign: 'start',
      fontFamily: 'inherit',
      opacity: disabled ? 0.6 : 1
    }}
  >
    {/* معاينة مصغّرة: خلفية، بطاقة بسعرٍ وزرّ */}
    <div style={{ background: p.backgroundColor, padding: 10, height: 74, position: 'relative' }}>
      <div
        style={{
          height: 8,
          width: '55%',
          borderRadius: 4,
          background: `linear-gradient(90deg, ${p.primaryColor}, ${p.secondaryColor})`,
          marginBottom: 8
        }}
      />
      <div
        style={{
          background: p.cardColor,
          borderRadius: 8,
          padding: '7px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}
      >
        <span style={{ display: 'grid', gap: 3 }}>
          <span style={{ width: 44, height: 5, borderRadius: 3, background: p.textColor, opacity: 0.85 }} />
          <span style={{ fontSize: 10, fontWeight: 900, color: p.accentColor, lineHeight: 1 }}>12,000</span>
        </span>
        <span style={{ width: 18, height: 18, borderRadius: 999, background: p.accentColor }} />
      </div>
      {active && (
        <IoCheckmarkCircle size={20} style={{ position: 'absolute', top: 6, insetInlineEnd: 6, color: C.accent, background: '#fff', borderRadius: 999 }} />
      )}
    </div>
    <div style={{ padding: '8px 10px', color: C.text, fontSize: 12.5, fontWeight: 700 }}>{p.name}</div>
  </button>
);

export default PalettePicker;
