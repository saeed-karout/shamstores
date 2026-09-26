// frontend/src/components/admin/SupportSettingsCard.tsx
//
// الدعم البشري للتجّار — رقم واتساب الدعم ومقاطع الشرح في «مركز المساعدة».
//
// **بطاقةٌ مستقلة لا حقلان في القائمة العامّة:** المقاطع قائمةٌ من
// {عنوان، رابط، مدّة}، وتحريرها كنصّ JSON في صندوقٍ واحد وصفةُ فاصلةٍ ناقصة
// تُطفئ مركز المساعدة كلّه. هنا صفٌّ لكلّ مقطع، والخادم يرفض أيّ رابطٍ ليس
// من يوتيوب قبل أن يصل إلى إطار في لوحة التاجر.
//
// الرقم الفارغ يُخفي زرّ «الدعم عبر واتساب» من لوحات التجّار كلّها.

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { IoAdd, IoLogoWhatsapp, IoTrashOutline, IoLogoYoutube } from 'react-icons/io5';
import api from '@/services/api';

interface Palette {
  card: string; surf: string; accent: string; bg: string;
  text: string; muted: string; border: string; red: string;
}

interface VideoRow {
  title: string;
  url: string;
  duration?: string;
}

const inputStyle = (C: Palette): React.CSSProperties => ({
  width: '100%',
  minHeight: 40,
  padding: '8px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: '#fff',
  color: C.text,
  fontFamily: 'inherit',
  fontSize: 14
});

const SupportSettingsCard: React.FC<{ colors: Palette; onSaved?: () => void }> = ({ colors: C, onSaved }) => {
  const [whatsapp, setWhatsapp] = useState('');
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ whatsapp: string; videos: VideoRow[] }>('/support/admin/settings');
        setWhatsapp(data?.whatsapp || '');
        setVideos((data?.videos || []).map(({ title, url, duration }) => ({ title, url, duration: duration || '' })));
      } catch {
        /* رسالة الخادم يعرضها العميل */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (i: number, patch: Partial<VideoRow>) =>
    setVideos((list) => list.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const save = async () => {
    setSaving(true);
    try {
      const data = await api.put<{ whatsapp: string }>('/support/admin/settings', {
        whatsapp,
        videos: videos.filter((v) => v.title.trim() || v.url.trim())
      });
      setWhatsapp(data?.whatsapp || '');
      toast.success('حُفظت إعدادات الدعم');
      // القائمة العامّة أسفل الصفحة تحمل القيمتين أيضاً — تُحدَّث كي لا
      // يُعيد زرّ «حفظ الإعدادات» القيم القديمة فوق ما حُفظ للتوّ
      onSaved?.();
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 24, display: 'grid', gap: 14 }}
      aria-busy={loading}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IoLogoWhatsapp color="#1faa53" size={22} /> الدعم البشري للتجّار
        </h2>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13, lineHeight: 1.8 }}>
          رقم واتساب يظهر كزرّ عائم في لوحات التجّار (لا في واجهات المتاجر)، ومقاطع شرح قصيرة في «مركز المساعدة». اترك
          الرقم فارغاً لإخفاء الزرّ.
        </p>
      </div>

      <label style={{ display: 'grid', gap: 6, maxWidth: 360 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>رقم واتساب الدعم</span>
        <input
          style={inputStyle(C)}
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          dir="ltr"
          inputMode="tel"
          placeholder="963912345678"
          disabled={loading}
        />
        <small style={{ color: C.muted, fontSize: 12 }}>بالصيغة الدولية — ويُقبل 09xxxxxxxx ويُحوَّل تلقائياً.</small>
      </label>

      <div style={{ display: 'grid', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IoLogoYoutube color="#e62117" size={18} /> مقاطع الشرح (يوتيوب)
        </span>
        {videos.length === 0 && !loading && (
          <small style={{ color: C.muted }}>لا مقاطع بعد — ستختفي فقرة «شروحات قصيرة» من مركز المساعدة.</small>
        )}
        {videos.map((v, i) => (
          <div key={i} style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', alignItems: 'center' }}>
            <input style={inputStyle(C)} value={v.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="العنوان: كيف تضيف منتجاً" maxLength={120} aria-label={`عنوان المقطع ${i + 1}`} />
            <input style={inputStyle(C)} value={v.url} onChange={(e) => update(i, { url: e.target.value })} placeholder="https://youtu.be/…" dir="ltr" aria-label={`رابط المقطع ${i + 1}`} />
            <input style={{ ...inputStyle(C), maxWidth: 110 }} value={v.duration || ''} onChange={(e) => update(i, { duration: e.target.value })} placeholder="3:20" dir="ltr" maxLength={12} aria-label={`مدّة المقطع ${i + 1}`} />
            <button
              type="button"
              onClick={() => setVideos((list) => list.filter((_, j) => j !== i))}
              aria-label={`حذف المقطع ${i + 1}`}
              style={{ justifySelf: 'start', background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, color: C.red, cursor: 'pointer' }}
            >
              <IoTrashOutline size={18} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setVideos((list) => [...list, { title: '', url: '', duration: '' }])}
          disabled={loading || videos.length >= 30}
          style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surf, border: `1px dashed ${C.border}`, borderRadius: 10, padding: '8px 14px', color: C.accent, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <IoAdd size={18} /> إضافة مقطع
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          style={{ background: C.accent, color: '#fff', border: 0, borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'جارٍ الحفظ…' : 'حفظ إعدادات الدعم'}
        </button>
      </div>
    </section>
  );
};

export default SupportSettingsCard;
