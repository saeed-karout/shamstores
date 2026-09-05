// frontend/src/components/storefront/PlatformBadge.tsx
//
// شارة «انضم لنا» — دائرة عائمة على واجهات الخطط الأدنى.
//
// هي حلقة نموّ: كل قائمة مجانية تعرّف زبائنها بالمنصة، وبعضهم تجّار. وهي
// في الوقت نفسه سبب ترقية — من يريد واجهة نظيفة يدفع لإخفائها.
//
// ولأنها تجلس على واجهة **تاجر آخر**، تلتزم بحدّين:
//   • لا تغطّي محتواه ولا تعترض النقر (`pointer-events` على الغلاف).
//   • لا تنافس هويته: صغيرة، في زاوية، بلا حركة تخطف الانتباه.
// شارة صاخبة تدفع التاجر إلى الترقية غيظاً لا اقتناعاً، وتُفسد واجهته
// على زبائنه — وهو ما يجعله يترك المنصة لا يدفع لها.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoClose, IoRocketOutline, IoCheckmarkCircle } from 'react-icons/io5';
import api from '@/services/api';

interface Props {
  /** يحسمه الخادم — الواجهة لا ترى الميزات المشتراة مفردةً */
  show?: boolean;
}

const C = {
  bg: '#082E24',
  card: '#0F1613',
  surf: '#14201B',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.18)',
  red: '#FF6B6B'
};

const BENEFITS = [
  'قائمة رقمية ورمز QR للطاولات — مجاناً',
  'أسعار بالليرة ودفع عبر شام كاش أو نقداً',
  'رابط ونطاق فرعي باسم متجرك',
  'طلبات أونلاين وتقارير في الخطط المدفوعة'
];

const PlatformBadge: React.FC<Props> = ({ show }) => {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', businessName: '' });
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) setOpen(false); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => firstFieldRef.current?.focus(), 80);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, submitting]);

  if (!show) return null;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const trimmedName = form.name.trim();
  const trimmedEmail = form.email.trim();
  const canSubmit = trimmedName.length >= 2 && /.+@.+\..+/.test(trimmedEmail) && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // يصل إلى «رسائل التواصل» في لوحة الإدارة — الموضوع يميّزه عن غيره
      await api.post('/public/contact-messages', {
        name: trimmedName,
        email: trimmedEmail,
        phone: form.phone.trim(),
        subject: 'طلب انضمام — شارة المنصة',
        message: `اسم النشاط: ${form.businessName.trim() || 'غير مذكور'}\nوصل الطلب من شارة «انضم لنا» على واجهة تاجر.`
      });
      setSent(true);
    } catch {
      // لا نُسقط النموذج على الزائر: الرسالة تحت الزر، والرابط المباشر باقٍ
      setSent(false);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  return (
    <>
      {/* الغلاف بلا التقاط للنقر كي لا يحجب محتوى التاجر خلفه */}
      <div
        style={{
          position: 'fixed', insetInlineStart: 14, bottom: 14, zIndex: 60,
          pointerEvents: 'none', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 6
        }}
      >
        <span
          style={{
            pointerEvents: 'none', background: C.bg, color: C.accent,
            border: `1px solid ${C.border}`, borderRadius: 999,
            padding: '3px 10px', fontSize: 11, fontWeight: 800,
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)', whiteSpace: 'nowrap'
          }}
        >
          انضم لنا
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="انضم إلى شام ستورز — تعرّف على المنصة"
          style={{
            pointerEvents: 'auto', width: 52, height: 52, borderRadius: '50%',
            border: `2px solid ${C.accent}`, background: C.bg, cursor: 'pointer',
            padding: 0, overflow: 'hidden', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)'
          }}
        >
          <img
            src="/logo.svg"
            alt=""
            width={52}
            height={52}
            style={{ display: 'block', objectFit: 'cover' }}
          />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="platform-badge-title"
          dir="rtl"
          onClick={() => !submitting && setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.78)',
            display: 'grid', placeItems: 'center', padding: 16, overflowY: 'auto'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(460px, 100%)', background: C.card,
              border: `1px solid ${C.border}`, borderRadius: 18,
              padding: 22, fontFamily: 'Cairo, system-ui, sans-serif'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <img
                src="/logo.svg"
                alt=""
                width={44}
                height={44}
                style={{ borderRadius: 12, flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <h2 id="platform-badge-title" style={{ color: C.text, fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>
                  شام ستورز
                </h2>
                <p style={{ color: C.muted, fontSize: 12.5, margin: 0, lineHeight: 1.85 }}>
                  منصة سورية تحوّل مطعمك أو متجرك إلى واجهة رقمية — بالعربية
                  وبالليرة.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                disabled={submitting}
                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}
              >
                <IoClose size={19} />
              </button>
            </div>

            <ul style={{ listStyle: 'none', margin: '0 0 18px', padding: 0, display: 'grid', gap: 7 }}>
              {BENEFITS.map((benefit) => (
                <li key={benefit} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: C.muted, fontSize: 12.5, lineHeight: 1.8 }}>
                  <IoCheckmarkCircle size={15} style={{ color: C.accent, flexShrink: 0, marginTop: 3 }} />
                  {benefit}
                </li>
              ))}
            </ul>

            {sent ? (
              <div
                style={{
                  background: 'rgba(200,226,53,0.1)', border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '14px 15px', color: C.muted,
                  fontSize: 12.5, lineHeight: 1.9
                }}
              >
                <strong style={{ color: C.text }}>وصلنا طلبك.</strong> سنتواصل معك قريباً.
                ولو أحببت البدء الآن بلا انتظار:
                <Link
                  to="/register"
                  style={{
                    display: 'block', marginTop: 10, textAlign: 'center', padding: '11px 0',
                    borderRadius: 11, background: C.accent, color: C.bg, fontWeight: 800,
                    fontSize: 13.5, textDecoration: 'none'
                  }}
                >
                  أنشئ حسابك مجاناً
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: 'grid', gap: 9 }}>
                <input
                  ref={firstFieldRef}
                  value={form.name}
                  onChange={set('name')}
                  placeholder="اسمك"
                  maxLength={80}
                  style={inputStyle}
                />
                <input
                  value={form.businessName}
                  onChange={set('businessName')}
                  placeholder="اسم مطعمك أو متجرك (اختياري)"
                  maxLength={80}
                  style={inputStyle}
                />
                <input
                  type="email"
                  dir="ltr"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="البريد الإلكتروني"
                  maxLength={120}
                  style={{ ...inputStyle, textAlign: 'start' }}
                />
                <input
                  type="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="رقم الهاتف (اختياري)"
                  maxLength={30}
                  style={{ ...inputStyle, textAlign: 'start' }}
                />

                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '12px 0', minHeight: 46, borderRadius: 12, border: 'none',
                    background: canSubmit ? C.accent : C.surf,
                    color: canSubmit ? C.bg : C.muted,
                    fontWeight: 800, fontSize: 13.5, fontFamily: 'inherit',
                    cursor: canSubmit ? 'pointer' : 'not-allowed'
                  }}
                >
                  <IoRocketOutline size={17} />
                  {submitting ? 'جارٍ الإرسال…' : 'أرسل طلب الانضمام'}
                </button>

                {/* الطريق المباشر يبقى مفتوحاً: من يريد الحساب الآن لا ينتظر ردّاً */}
                <Link
                  to="/register"
                  style={{
                    textAlign: 'center', padding: '10px 0', borderRadius: 12,
                    border: `1px solid ${C.border}`, color: C.accent,
                    fontWeight: 700, fontSize: 13, textDecoration: 'none'
                  }}
                >
                  أو أنشئ حسابك مباشرةً
                </Link>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', minHeight: 44, borderRadius: 11,
  border: `1px solid ${C.border}`, background: C.surf, color: C.text,
  fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box'
};

export default PlatformBadge;
