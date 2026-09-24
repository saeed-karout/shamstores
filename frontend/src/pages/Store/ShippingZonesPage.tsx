// frontend/src/pages/Store/ShippingZonesPage.tsx
//
// أجور التوصيل والشحن لكل محافظة.
//
// **ما تحلّه:** كانت أجرة التوصيل رقماً واحداً للمتجر كلّه. فتاجرٌ في دمشق
// يبيع إلى حلب لا يستطيع تسعير الفرق — يضع رقماً وسطاً يخسر به في البعيد
// ويخسر الزبون في القريب. وهذا يمنع تجّاراً من الاشتراك أصلاً.
//
// **والقرار الأهمّ في الشاشة ليس الرقم بل «من يوصّل».** المنطقة المضبوطة
// «شحن» لا تُسنَد إلى سائق المتجر — وإلا ذهب طلبُ حلبَ إلى سائقٍ في دمشق
// فيرفضه ويتعطّل الطلب بلا سببٍ يظهر لأحد.

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  IoLocationOutline,
  IoCarOutline,
  IoCubeOutline,
  IoInformationCircleOutline,
  IoSaveOutline
} from 'react-icons/io5';
import api from '@/services/api';

type DeliveryMode = 'driver' | 'shipping';

interface Zone {
  governorate: string;
  name: string;
  fee: number;
  freeOverAmount: number | null;
  estimatedDays: number | null;
  deliveryMode: DeliveryMode;
  isActive: boolean;
  configured: boolean;
}

const ShippingZonesPage: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await api.get('/shipping/zones')) as Zone[];
      setZones(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر جلب المناطق');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (code: string, changes: Partial<Zone>) => {
    setZones((prev) => prev.map((z) => (z.governorate === code ? { ...z, ...changes } : z)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = (await api.put('/shipping/zones', { zones })) as Zone[];
      if (Array.isArray(data)) setZones(data);
      toast.success('حُفظت مناطق التوصيل');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = zones.filter((z) => z.isActive).length;

  if (loading) return <div style={s.center}>جارٍ التحميل…</div>;

  return (
    <div style={s.page}>
      <header>
        <h1 style={s.h1}>
          <IoLocationOutline size={20} style={{ verticalAlign: -3, marginLeft: 6 }} />
          مناطق التوصيل والشحن
        </h1>
        <p style={s.lede}>
          فعّل المحافظات التي تخدمها، وحدّد أجرة كلٍّ منها ومن يُسلّم فيها.
        </p>
      </header>

      {/* التحذير أوّلاً: متجرٌ بلا محافظةٍ مفعّلة لا يستقبل طلب توصيلٍ واحداً */}
      <div style={{ ...s.note, ...(activeCount === 0 ? s.warn : {}) }}>
        <IoInformationCircleOutline size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          {activeCount === 0
            ? 'لا محافظة مفعّلة — لن يتمكّن أي زبون من طلب التوصيل. فعّل محافظتك على الأقلّ.'
            : `${activeCount} محافظة مفعّلة. المحافظة غير المفعّلة لا تظهر للزبون عند الدفع.`}
        </div>
      </div>

      <div style={s.list}>
        {zones.map((zone) => (
          <div
            key={zone.governorate}
            style={{ ...s.row, opacity: zone.isActive ? 1 : 0.62 }}
          >
            <label style={s.head}>
              <input
                type="checkbox"
                checked={zone.isActive}
                onChange={(e) => patch(zone.governorate, { isActive: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: '#084835', cursor: 'pointer' }}
              />
              <span style={s.name}>{zone.name}</span>
              {zone.isActive && (
                <span style={s.badge}>
                  {zone.deliveryMode === 'driver' ? (
                    <>
                      <IoCarOutline size={12} /> سائق المتجر
                    </>
                  ) : (
                    <>
                      <IoCubeOutline size={12} /> شركة شحن
                    </>
                  )}
                </span>
              )}
            </label>

            {zone.isActive && (
              <div style={s.fields}>
                <Field label="الأجرة (ل.س)">
                  <input
                    type="number"
                    min={0}
                    value={zone.fee}
                    onChange={(e) => patch(zone.governorate, { fee: Number(e.target.value) })}
                    style={s.input}
                  />
                </Field>

                <Field label="شحن مجاني فوق" hint="اتركه فارغاً إن لا يوجد">
                  <input
                    type="number"
                    min={0}
                    value={zone.freeOverAmount ?? ''}
                    placeholder="—"
                    onChange={(e) =>
                      patch(zone.governorate, {
                        freeOverAmount: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                    style={s.input}
                  />
                </Field>

                <Field label="مدّة التسليم (يوم)">
                  <input
                    type="number"
                    min={1}
                    value={zone.estimatedDays ?? ''}
                    placeholder="—"
                    onChange={(e) =>
                      patch(zone.governorate, {
                        estimatedDays: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                    style={s.input}
                  />
                </Field>

                <Field label="من يُسلّم؟">
                  <select
                    value={zone.deliveryMode}
                    onChange={(e) =>
                      patch(zone.governorate, { deliveryMode: e.target.value as DeliveryMode })
                    }
                    style={s.input}
                  >
                    <option value="driver">سائق المتجر</option>
                    <option value="shipping">شركة شحن</option>
                  </select>
                </Field>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={s.note}>
        <IoInformationCircleOutline size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>«شركة شحن» ليست تسميةً فقط:</strong> طلبُ محافظةٍ مضبوطة عليها
          لا يُسنَد إلى سائقيك ولا يصلهم إشعاره — يبقى عندك لتسلّمه لشركة الشحن.
          أمّا «سائق المتجر» فيدخل التوزيع التلقائي كالمعتاد.
        </div>
      </div>

      <button type="button" onClick={save} disabled={saving} style={s.saveBtn}>
        <IoSaveOutline size={16} style={{ verticalAlign: -3, marginLeft: 6 }} />
        {saving ? 'جارٍ الحفظ…' : 'حفظ المناطق'}
      </button>
    </div>
  );
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
    <label style={s.label}>{label}</label>
    {children}
    {hint && <span style={s.hint}>{hint}</span>}
  </div>
);

const s: Record<string, React.CSSProperties> = {
  page: { padding: 16, maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 },
  center: { padding: 48, textAlign: 'center', color: '#5F736A' },
  h1: { fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text, #10231B)' },
  lede: { fontSize: 13.5, color: '#5F736A', margin: '6px 0 0', lineHeight: 1.7 },
  list: { display: 'flex', flexDirection: 'column', gap: 9 },
  row: {
    background: 'var(--card, #FFFFFF)',
    border: '1px solid rgba(8,72,53,0.16)',
    borderRadius: 14,
    padding: 13
  },
  head: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  name: { color: 'var(--text, #10231B)', fontSize: 14.5, fontWeight: 700, flex: 1 },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'rgba(8,72,53,0.14)', color: '#084835',
    borderRadius: 999, padding: '4px 10px', fontSize: 11.5, fontWeight: 700
  },
  fields: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 11,
    marginTop: 13,
    paddingTop: 13,
    borderTop: '1px solid rgba(8,72,53,0.12)'
  },
  label: { fontSize: 12, color: '#5F736A' },
  hint: { fontSize: 11, color: '#5F736A', opacity: 0.8 },
  input: {
    background: 'var(--surface, #F1F5F2)',
    border: '1px solid rgba(8,72,53,0.16)',
    borderRadius: 10,
    padding: '10px 12px',
    color: 'var(--text, #10231B)',
    fontSize: 14,
    fontFamily: 'inherit',
    width: '100%'
  },
  note: {
    display: 'flex', gap: 9, fontSize: 12.5, color: '#5F736A', lineHeight: 1.9,
    padding: '12px 14px', background: 'rgba(37,99,235,0.08)',
    border: '1px solid rgba(37,99,235,0.22)', borderRadius: 14
  },
  warn: { background: 'rgba(194,65,12,0.1)', borderColor: 'rgba(194,65,12,0.35)', color: '#C2410C' },
  saveBtn: {
    background: '#084835', color: '#FFFFFF', border: 'none', borderRadius: 13,
    padding: '14px 20px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit'
  }
};

export default ShippingZonesPage;
