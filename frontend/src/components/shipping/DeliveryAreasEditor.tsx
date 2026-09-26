// frontend/src/components/shipping/DeliveryAreasEditor.tsx
//
// أحياء المحافظة وأجورها — تحت صفّ المحافظة في شاشة مناطق التوصيل.
//
// **لماذا الأحياء:** مطعمٌ في المزة يوصّل إلى كفرسوسة بأجرة وإلى جرمانا
// بثلاثة أضعافها. أجرةٌ واحدة للمحافظة تُخسره في البعيد أو تُبعد القريب.
//
// **ولماذا تُحفظ وحدها لا مع زرّ «حفظ المناطق»:** قائمة أحياءٍ طويلة تُكتب
// على مهل، وربطُها بحفظ الأربع عشرة محافظة يعني أن خطأً في رقمٍ هناك يُضيع
// عشرين حيّاً كُتبت هنا.

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  IoAddOutline,
  IoTrashOutline,
  IoChevronDown,
  IoChevronUp,
  IoSparklesOutline,
  IoSaveOutline
} from 'react-icons/io5';
import api from '@/services/api';

interface Area {
  id?: string;
  name: string;
  fee: number;
  freeOverAmount: number | null;
  etaText: string | null;
  isActive: boolean;
}

interface Props {
  governorate: string;
  governorateName: string;
  /** أجرة المحافظة — قيمةٌ ابتدائية للأحياء المضافة */
  zoneFee: number;
}

const DeliveryAreasEditor: React.FC<Props> = ({ governorate, governorateName, zoneFee }) => {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [presets, setPresets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const data: any = await api.get(`/shipping/zones/${encodeURIComponent(governorate)}/areas`);
      setAreas(Array.isArray(data?.areas) ? data.areas : []);
      setPresets(Array.isArray(data?.presets) ? data.presets : []);
      setLoaded(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر جلب المناطق');
    }
  }, [governorate]);

  // تُجلب عند الفتح لا عند رسم الشاشة: أربع عشرة محافظة مفعّلة تعني أربعة
  // عشر طلباً لم يطلبها التاجر، وقاعدة الإنتاج محدودة الاتصالات
  useEffect(() => {
    if (open && !loaded) load();
  }, [open, loaded, load]);

  const update = (index: number, changes: Partial<Area>) => {
    setAreas((prev) => prev.map((a, i) => (i === index ? { ...a, ...changes } : a)));
    setDirty(true);
  };

  const add = (name = '') => {
    setAreas((prev) => [...prev, { name, fee: zoneFee, freeOverAmount: null, etaText: null, isActive: true }]);
    setDirty(true);
  };

  const remove = (index: number) => {
    setAreas((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const addPresets = () => {
    const have = new Set(areas.map((a) => a.name.trim()));
    const fresh = presets.filter((p) => !have.has(p));
    if (fresh.length === 0) {
      toast('الأحياء الشائعة مضافة كلّها');
      return;
    }
    setAreas((prev) => [
      ...prev,
      ...fresh.map((name) => ({ name, fee: zoneFee, freeOverAmount: null, etaText: null, isActive: true }))
    ]);
    setDirty(true);
    toast.success(`أُضيف ${fresh.length} حيّاً بأجرة المحافظة — عدّل أجرة كلٍّ منها ثمّ احفظ`);
  };

  const save = async () => {
    const empty = areas.findIndex((a) => !a.name.trim());
    if (empty >= 0) {
      toast.error('اكتب اسم كلّ منطقة أو احذف السطر الفارغ');
      return;
    }
    setSaving(true);
    try {
      const data: any = await api.put(`/shipping/zones/${encodeURIComponent(governorate)}/areas`, { areas });
      if (Array.isArray(data)) setAreas(data);
      setDirty(false);
      toast.success(`حُفظت مناطق ${governorateName}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = areas.filter((a) => a.isActive).length;

  return (
    <div style={s.wrap}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={s.toggle} aria-expanded={open}>
        {open ? <IoChevronUp size={15} /> : <IoChevronDown size={15} />}
        المناطق والأحياء
        <span style={s.count}>{loaded ? (activeCount ? `${activeCount} مفعّلة` : 'بأجرة المحافظة') : 'اضغط للعرض'}</span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 10 }}>
          <p style={s.note}>
            حين تضيف مناطق يختار الزبون منطقته وتُحسب الأجرة منها. وبلا مناطق تُطبَّق أجرة المحافظة كما هي.
            «مجاني فوق» الفارغ يتبع حدّ المحافظة.
          </p>

          {areas.map((area, i) => (
            <div key={area.id || `new-${i}`} style={{ ...s.row, opacity: area.isActive ? 1 : 0.6 }}>
              <input
                type="checkbox"
                checked={area.isActive}
                onChange={(e) => update(i, { isActive: e.target.checked })}
                title="مفعّلة"
                aria-label="مفعّلة"
                style={{ width: 17, height: 17, accentColor: '#084835', flexShrink: 0 }}
              />
              <input
                value={area.name}
                maxLength={80}
                placeholder="اسم المنطقة أو الحيّ"
                onChange={(e) => update(i, { name: e.target.value })}
                style={{ ...s.input, flex: '2 1 140px' }}
              />
              <label style={s.cell}>
                <span style={s.label}>الأجرة</span>
                <input
                  type="number"
                  min={0}
                  value={area.fee}
                  onChange={(e) => update(i, { fee: Number(e.target.value) })}
                  style={s.input}
                />
              </label>
              <label style={s.cell}>
                <span style={s.label}>مجاني فوق</span>
                <input
                  type="number"
                  min={0}
                  value={area.freeOverAmount ?? ''}
                  placeholder="—"
                  onChange={(e) =>
                    update(i, { freeOverAmount: e.target.value === '' ? null : Number(e.target.value) })
                  }
                  style={s.input}
                />
              </label>
              <label style={s.cell}>
                <span style={s.label}>مدّة التوصيل</span>
                <input
                  value={area.etaText ?? ''}
                  maxLength={60}
                  placeholder="مثال: خلال ساعة"
                  onChange={(e) => update(i, { etaText: e.target.value || null })}
                  style={s.input}
                />
              </label>
              <button type="button" onClick={() => remove(i)} style={s.iconBtn} aria-label="حذف المنطقة">
                <IoTrashOutline size={16} />
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => add()} style={s.ghost}>
              <IoAddOutline size={15} /> منطقة
            </button>
            {presets.length > 0 && (
              <button type="button" onClick={addPresets} style={s.ghost}>
                <IoSparklesOutline size={15} /> أضف الأحياء الشائعة ({presets.length})
              </button>
            )}
            <button type="button" onClick={save} disabled={saving || !dirty} style={{ ...s.primary, opacity: saving || !dirty ? 0.55 : 1 }}>
              <IoSaveOutline size={15} /> {saving ? 'جارٍ الحفظ…' : `حفظ أحياء ${governorateName}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 12, paddingTop: 11, borderTop: '1px dashed rgba(8,72,53,0.18)' },
  toggle: {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0,
    color: '#084835', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
  },
  count: {
    background: 'rgba(8,72,53,0.1)', color: '#084835', borderRadius: 999, padding: '2px 9px',
    fontSize: 11, fontWeight: 700
  },
  note: { fontSize: 12, color: '#5F736A', margin: 0, lineHeight: 1.8 },
  row: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8, padding: 9,
    background: 'var(--surface, #F1F5F2)', borderRadius: 11
  },
  cell: { display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 100px', minWidth: 0 },
  label: { fontSize: 11, color: '#5F736A' },
  input: {
    background: 'var(--card, #FFFFFF)', border: '1px solid rgba(8,72,53,0.16)', borderRadius: 9,
    padding: '8px 10px', color: 'var(--text, #10231B)', fontSize: 13.5, fontFamily: 'inherit', width: '100%', minWidth: 0
  },
  iconBtn: {
    background: 'none', border: '1px solid rgba(194,65,12,0.3)', color: '#C2410C', borderRadius: 9,
    width: 36, height: 36, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0
  },
  ghost: {
    display: 'inline-flex', alignItems: 'center', gap: 5, background: '#FFFFFF', color: '#084835',
    border: '1px solid rgba(8,72,53,0.2)', borderRadius: 10, padding: '8px 12px', fontSize: 12.5,
    fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit'
  },
  primary: {
    display: 'inline-flex', alignItems: 'center', gap: 5, background: '#084835', color: '#FFFFFF',
    border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12.5, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit', marginInlineStart: 'auto'
  }
};

export default DeliveryAreasEditor;
