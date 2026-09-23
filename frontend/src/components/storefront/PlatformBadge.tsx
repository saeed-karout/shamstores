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
  // التسمية تُرى أوّل الزيارة ثم تنطوي — الدائرة وحدها تكفي بعدها
  const [showLabel, setShowLabel] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowLabel(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);
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
      {/* الغلاف بلا التقاط للنقر كي لا يحجب محتوى التاجر خلفه.
          دائرةٌ صغيرة بعلامة S؛ والتسمية تظهر ثوانيَ ثم تنطوي — كانت شارةً
          ثابتة بحجم ٥٢ وتسمية دائمة تغطّي سعر المنتج في زاوية الشبكة. */}
      <div
        style={{
          position: 'fixed', insetInlineStart: 12, bottom: 12, zIndex: 60,
          pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 8
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="انضم إلى شام ستورز — تعرّف على المنصة"
          style={{
            pointerEvents: 'auto', width: 42, height: 42, borderRadius: '50%',
            border: '1px solid rgba(205,239,124,0.35)', background: '#084835', cursor: 'pointer',
            padding: 0, display: 'grid', placeItems: 'center',
            boxShadow: '0 8px 22px rgba(4,42,30,0.35)'
          }}
        >
          <svg viewBox="330 180 380 670" width={18} height={32} aria-hidden="true" fill="#CDEF7C">
            <path d="M533.32,835.34c-25.23-138.24-87.03-228.67-182.84-274.34-2.74-1.3-4.67-4.23-5-7.68h0c-.36-3.67,1.16-7.22,3.87-9.05,25.45-17.26,51.75-35.1,79.7-54.05,3.53-2.39,8.02-1.17,10.29,2.81,4.25,7.46,9.21,16.17,14.63,25.69,2.33,4.08,1.49,9.61-1.9,12.48-4.37,3.7-9.24,7.83-14.57,12.35-2.99,2.54-2.93,6.57.14,8.99,43.03,33.87,76.13,81.45,99.09,145.43,2.83,7.9,7.8,8.12,11.08.47,7.44-17.37,14.68-34.25,22.13-51.64,1.38-3.21,1.03-7.07-.9-9.86-37.68-54.65-75.99-110.2-114.97-166.72-2.36-3.43-2.31-8.37.14-11.7,40.8-55.51,61.2-144.91,74.07-217.77,1.7-9.61,13.39-9.65,15.14-.06,26.63,145.78,96.57,262.08,193.99,301.95,6.42,2.63,6.99,13.07.93,16.7-27.22,16.31-56.27,33.72-86.9,52.08-3.39,2.03-7.53.87-9.77-2.74-4.03-6.52-9.1-14.69-14.8-23.91-2.53-4.09-1.75-9.82,1.74-12.76,4.95-4.18,10.14-8.56,15.69-13.24,2.66-2.25,2.58-5.79-.18-7.86-44.66-33.43-78.43-81.93-101.94-146.55-2.1-5.77-6.92-4.6-9.33,1-7.7,17.97-15.25,35.57-23.1,53.87-1.37,3.2.05,5.79,1.97,8.57,37.63,54.7,75.52,109.77,114.49,166.41,2.36,3.43,2.3,8.36-.14,11.7-39.27,53.57-64.66,116.74-77.61,189.39-1.71,9.59-13.39,9.64-15.14.06Z" />
          </svg>
        </button>
        <span
          aria-hidden="true"
          style={{
            pointerEvents: 'none', background: '#084835', color: '#CDEF7C',
            borderRadius: 999, padding: '5px 12px', fontSize: 11.5, fontWeight: 800,
            boxShadow: '0 6px 18px rgba(4,42,30,0.3)', whiteSpace: 'nowrap',
            opacity: showLabel ? 1 : 0,
            transform: showLabel ? 'none' : 'translateX(8px)',
            transition: 'opacity .4s ease, transform .4s ease'
          }}
        >
          صُنع بشام ستورز — انضم لنا
        </span>
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
