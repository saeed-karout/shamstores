// frontend/src/components/settings/SouqListingPanel.tsx
//
// «اظهر متجري في سوق شام ستورز» — مع المحافظة والتصنيف.
//
// **مفعّلٌ افتراضياً ويُطفأ بضغطة:** السوق يجلب زبائن، ومن لا يعرف بالخيار
// لا يستفيد منه. والإطفاء متاحٌ لكل خطة بلا شرط — تاجرٌ لا يريد الظهور
// (متجر خاصّ بزبائنه، أو تجهيزٌ لم يكتمل) لا يُجبَر عليه.
//
// **ولماذا يُقال للتاجر إن كان ظاهراً فعلاً:** التفعيل وحده لا يكفي — متجرٌ
// بلا منتجات متاحة لا يُدرَج. فالبطاقة تقول «ظاهر الآن في المرتبة كذا» أو
// «مفعّل لكن لن يظهر حتى تضيف منتجاً»، لا مفتاحاً صامتاً يظنّه التاجر معطّلاً.
//
// المنفذ مستقلّ (`/api/souq/my-listing`) لا ضمن حفظ الإعدادات العامّ — كي
// لا يتوقّف الظهور على نموذجٍ طويل بحقولٍ أخرى.

import React, { useEffect, useState } from 'react';
import { IoStorefrontOutline, IoOpenOutline, IoSaveOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';

interface Listing {
  listed: boolean;
  governorate: string | null;
  category: string;
  paid: boolean;
  isActive: boolean;
  visible: boolean;
  rank: number | null;
  type: 'store' | 'restaurant';
  governorates?: Array<{ code: string; name: string }>;
  categories?: Array<{ code: string; name: string; kinds: Array<'store' | 'restaurant'> }>;
}

interface Props {
  canEdit?: boolean;
  colors: {
    card: string;
    surf: string;
    accent: string;
    text: string;
    muted: string;
    border: string;
    red: string;
  };
}

const SouqListingPanel: React.FC<Props> = ({ canEdit = true, colors: C }) => {
  const [data, setData] = useState<Listing | null>(null);
  const [form, setForm] = useState({ listed: true, governorate: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<Listing>('/souq/my-listing')
      .then((d) => {
        setData(d);
        setForm({ listed: d.listed, governorate: d.governorate || '', category: d.category || '' });
      })
      .catch(() => setError(true));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const d = await api.put<Listing>('/souq/my-listing', {
        listed: form.listed,
        governorate: form.governorate || null,
        category: form.category || null
      });
      setData((prev) => ({ ...(prev as Listing), ...d }));
      toast.success(form.listed ? 'حُفظ — يظهر أثره في السوق خلال دقائق' : 'أُخفي نشاطك من السوق');
    } catch {
      /* رسالة الخادم يعرضها المعترض العامّ */
    } finally {
      setSaving(false);
    }
  };

  const card: React.CSSProperties = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16
  };
  const label: React.CSSProperties = { display: 'block', color: C.text, fontSize: 13.5, fontWeight: 700, marginBottom: 6 };
  const input: React.CSSProperties = {
    width: '100%',
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    color: C.text,
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  };

  if (error) return null;

  const kindWord = data?.type === 'restaurant' ? 'مطعمي' : 'متجري';
  const categories = (data?.categories || []).filter((c) => !data || c.kinds.includes(data.type));

  let status: { text: string; tone: string };
  if (!data) status = { text: 'جارٍ التحميل…', tone: C.muted };
  else if (!data.listed) status = { text: 'مخفيّ من السوق بطلبك.', tone: C.muted };
  else if (!data.isActive) status = { text: 'النشاط موقوف، فلا يظهر في السوق حتى يُعاد تفعيله.', tone: C.red };
  else if (data.visible) status = { text: `ظاهرٌ الآن في السوق${data.rank ? ` — ترتيبك العامّ ${data.rank}` : ''}.`, tone: C.accent };
  else status = { text: 'مفعّل، لكنه لن يظهر قبل أن يكون عندك منتج متاح واحد على الأقل.', tone: C.muted };

  return (
    <div style={card}>
      <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <IoStorefrontOutline style={{ color: C.accent }} /> سوق شام ستورز
      </h2>
      <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.9, margin: '0 0 14px' }}>
        دليلٌ عامّ يبحث فيه الزبائن عن المنتجات والمتاجر حسب المحافظة، ثمّ ينتقلون إلى واجهتك ليطلبوا منك مباشرةً.
        {data && !data.paid && ' الخطط المدفوعة تحصل على أولوية في الترتيب.'}
      </p>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: canEdit ? 'pointer' : 'default', marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={form.listed}
          disabled={!canEdit || !data}
          onChange={(e) => setForm((f) => ({ ...f, listed: e.target.checked }))}
          style={{ width: 18, height: 18, accentColor: C.accent }}
        />
        <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>اظهر {kindWord} في سوق شام ستورز</span>
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, opacity: form.listed ? 1 : 0.55 }}>
        <div>
          <label style={label} htmlFor="souq-gov">المحافظة</label>
          <select
            id="souq-gov"
            style={input}
            value={form.governorate}
            disabled={!canEdit || !form.listed}
            onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value }))}
          >
            <option value="">— اختر محافظتك —</option>
            {data?.governorates?.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
          </select>
          <small style={{ color: C.muted, fontSize: 12 }}>بلا محافظة تظهر فقط في «كل المحافظات».</small>
        </div>
        <div>
          <label style={label} htmlFor="souq-cat">التصنيف</label>
          <select
            id="souq-cat"
            style={input}
            value={form.category}
            disabled={!canEdit || !form.listed}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <p style={{ color: status.tone, fontSize: 13, fontWeight: 700, margin: '14px 0 0' }}>{status.text}</p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        {canEdit && (
          <button
            onClick={save}
            disabled={saving || !data}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10,
              border: 'none', background: C.accent, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            <IoSaveOutline /> {saving ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
        )}
        <a
          href={`/souq${form.governorate ? `/${form.governorate}` : ''}?tab=stores`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10,
            border: `1px solid ${C.border}`, color: C.text, textDecoration: 'none', fontWeight: 700
          }}
        >
          <IoOpenOutline /> افتح السوق
        </a>
      </div>
    </div>
  );
};

export default SouqListingPanel;
