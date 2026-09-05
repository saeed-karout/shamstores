// frontend/src/components/settings/ProductOptionsEditor.tsx
//
// محرّر خيارات المنتج للتاجر: لون، مقاس، إضافات…
//
// بلا هذه الشاشة تبقى الخيارات ميزةً في قاعدة البيانات لا يستطيع أحد
// إدخالها — والزبون يطلب قميصاً بلا مقاس فيتصل به التاجر ليسأل.
//
// نوعان لا أكثر: **اختيار واحد** (مقاس، لون) و**عدة اختيارات** (إضافات).
// كل تعقيد فوق ذلك — شروط، مخزون لكل تركيبة، صور لكل لون — يضاعف شاشة
// الإدخال ويؤجّل أبسط حالة: تاجر يريد ثلاثة مقاسات.

import { useState } from 'react';
import {
  IoAddOutline,
  IoTrashOutline,
  IoCloseOutline,
  IoOptionsOutline
} from 'react-icons/io5';

export interface OptionValue {
  label: string;
  priceDelta: number;
}

export interface OptionGroup {
  name: string;
  type: 'single' | 'multi';
  required: boolean;
  values: OptionValue[];
}

interface Palette {
  card: string;
  surf: string;
  accent: string;
  bg: string;
  text: string;
  muted: string;
  border: string;
  red: string;
}

interface Props {
  value: OptionGroup[];
  onChange: (groups: OptionGroup[]) => void;
  colors: Palette;
  currencyLabel?: string;
}

/** يطابق حدّ الخادم — قائمة أطول لا تُقرأ على شاشة هاتف */
const MAX_GROUPS = 6;
const MAX_VALUES = 30;

/** اقتراحات تُوفّر على التاجر كتابة الشائع */
const PRESETS: Array<{ name: string; values: string[] }> = [
  { name: 'المقاس', values: ['S', 'M', 'L', 'XL'] },
  { name: 'اللون', values: ['أسود', 'أبيض', 'أحمر', 'أزرق'] }
];

const ProductOptionsEditor: React.FC<Props> = ({ value, onChange, colors: C, currencyLabel = 'ل.س' }) => {
  const [newValue, setNewValue] = useState<Record<number, string>>({});

  const groups = Array.isArray(value) ? value : [];

  const update = (index: number, patch: Partial<OptionGroup>) => {
    onChange(groups.map((group, i) => (i === index ? { ...group, ...patch } : group)));
  };

  const addGroup = (preset?: { name: string; values: string[] }) => {
    if (groups.length >= MAX_GROUPS) return;
    onChange([
      ...groups,
      {
        name: preset?.name || '',
        type: 'single',
        required: true,
        values: (preset?.values || []).map((label) => ({ label, priceDelta: 0 }))
      }
    ]);
  };

  const addValue = (index: number) => {
    const label = (newValue[index] || '').trim();
    const group = groups[index];
    if (!label || !group || group.values.length >= MAX_VALUES) return;
    // التكرار يجعل اختيار الزبون غامضاً عند وصول الطلب
    if (group.values.some((v) => v.label === label)) {
      setNewValue({ ...newValue, [index]: '' });
      return;
    }
    update(index, { values: [...group.values, { label, priceDelta: 0 }] });
    setNewValue({ ...newValue, [index]: '' });
  };

  return (
    <div>
      <label style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 6 }}>
        خيارات المنتج
      </label>
      <p style={{ color: C.muted, fontSize: 11.5, margin: '0 0 12px', lineHeight: 1.85 }}>
        ما يختاره الزبون قبل الطلب. بلا خيارات يُضاف المنتج إلى السلة مباشرةً.
      </p>

      {groups.map((group, index) => (
        <div
          key={index}
          style={{
            background: C.surf,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 10
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <input
              value={group.name}
              onChange={(e) => update(index, { name: e.target.value })}
              placeholder="اسم المجموعة (اللون، المقاس…)"
              maxLength={40}
              style={{
                flex: '1 1 160px',
                minWidth: 0,
                minHeight: 40,
                padding: '0 12px',
                borderRadius: 9,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.text,
                fontSize: 13.5,
                fontFamily: 'inherit'
              }}
            />

            <select
              value={group.type}
              onChange={(e) => update(index, { type: e.target.value as 'single' | 'multi' })}
              style={{
                minHeight: 40,
                padding: '0 10px',
                borderRadius: 9,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.text,
                fontSize: 13,
                fontFamily: 'inherit'
              }}
            >
              <option value="single">اختيار واحد</option>
              <option value="multi">عدة اختيارات</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 12.5, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={group.required}
                onChange={(e) => update(index, { required: e.target.checked })}
                style={{ width: 15, height: 15, accentColor: C.accent }}
              />
              مطلوب
            </label>

            <button
              type="button"
              onClick={() => onChange(groups.filter((_, i) => i !== index))}
              aria-label={`حذف مجموعة ${group.name || index + 1}`}
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                border: 'none',
                background: 'rgba(255,107,107,0.12)',
                color: C.red,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <IoTrashOutline size={16} />
            </button>
          </div>

          {/* القيم */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 9 }}>
            {group.values.map((item, valueIndex) => (
              <span
                key={item.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 9,
                  padding: '5px 9px',
                  fontSize: 12.5,
                  color: C.text
                }}
              >
                {item.label}
                {/* فرق السعر اختياري: أكثر الخيارات بلا فرق، وحقلٌ إلزامي
                    لكل قيمة يُبطئ إدخال أربعة مقاسات بلا سبب */}
                <input
                  type="number"
                  value={item.priceDelta || ''}
                  onChange={(e) =>
                    update(index, {
                      values: group.values.map((v, i) =>
                        i === valueIndex ? { ...v, priceDelta: Math.max(0, Number(e.target.value) || 0) } : v
                      )
                    })
                  }
                  placeholder="+0"
                  title={`فرق السعر بالـ${currencyLabel}`}
                  style={{
                    width: 66,
                    minHeight: 26,
                    padding: '0 6px',
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    background: C.surf,
                    color: C.muted,
                    fontSize: 11.5,
                    fontFamily: 'inherit',
                    textAlign: 'center'
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    update(index, { values: group.values.filter((_, i) => i !== valueIndex) })
                  }
                  aria-label={`حذف ${item.label}`}
                  className="btn-inline"
                  style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <IoCloseOutline size={15} />
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 7 }}>
            <input
              value={newValue[index] || ''}
              onChange={(e) => setNewValue({ ...newValue, [index]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addValue(index);
                }
              }}
              placeholder="أضف قيمة ثم Enter"
              maxLength={40}
              style={{
                flex: 1,
                minHeight: 38,
                padding: '0 11px',
                borderRadius: 9,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.text,
                fontSize: 13,
                fontFamily: 'inherit'
              }}
            />
            <button
              type="button"
              onClick={() => addValue(index)}
              style={{
                minHeight: 38,
                padding: '0 14px',
                borderRadius: 9,
                border: 'none',
                background: C.accent,
                color: C.bg,
                fontWeight: 700,
                fontSize: 12.5,
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            >
              إضافة
            </button>
          </div>
        </div>
      ))}

      {groups.length < MAX_GROUPS && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => addGroup()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 40,
              padding: '0 14px',
              borderRadius: 10,
              border: `1px dashed ${C.border}`,
              background: 'transparent',
              color: C.muted,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer'
            }}
          >
            <IoAddOutline size={16} /> مجموعة خيارات
          </button>

          {PRESETS.filter((preset) => !groups.some((g) => g.name === preset.name)).map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => addGroup(preset)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 40,
                padding: '0 13px',
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: C.surf,
                color: C.accent,
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            >
              <IoOptionsOutline size={15} /> {preset.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductOptionsEditor;
