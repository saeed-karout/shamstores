// frontend/src/components/auth/AccountTypeDialog.tsx
//
// سؤال نوع الحساب بعد تسجيل غوغل — قبل إنشاء أي شيء.
//
// غوغل يثبت البريد لا نيّة صاحبه. التخمين كان يُنشئ حساب زبون لكل من يضغط
// الزر، فيجد صاحب المتجر نفسه بدور `user` بلا متجر — ولا سبيل لتصحيحه من
// الواجهة لأن الحساب صار موجوداً، فيلزم تدخّل يدوي في قاعدة البيانات.
//
// الخادم لا يُنشئ شيئاً حتى يصله الجواب، فهذا الحوار ليس تجميلاً: هو
// الخطوة التي تجعل الحساب صحيحاً من أول مرة.

import { useEffect, useRef, useState } from 'react';
import { IoStorefrontOutline, IoRestaurantOutline, IoPersonOutline } from 'react-icons/io5';

export type ChosenAccount =
  | { accountType: 'customer' }
  | { accountType: 'restaurant' | 'store'; businessName: string };

interface Props {
  open: boolean;
  email: string | null;
  /** الاسم القادم من غوغل — اقتراح أولي لاسم النشاط */
  suggestedName: string | null;
  submitting: boolean;
  onCancel: () => void;
  onChoose: (choice: ChosenAccount) => void;
}

const C = {
  bg: '#0A0F0D',
  card: '#0F1613',
  surf: '#141C18',
  border: 'rgba(200,226,53,0.16)',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#8FA396'
};

type Choice = 'customer' | 'restaurant' | 'store';

const OPTIONS: Array<{ key: Choice; label: string; hint: string; Icon: typeof IoPersonOutline }> = [
  { key: 'store', label: 'متجر', hint: 'أبيع منتجات', Icon: IoStorefrontOutline },
  { key: 'restaurant', label: 'مطعم', hint: 'أقدّم وجبات', Icon: IoRestaurantOutline },
  { key: 'customer', label: 'زبون', hint: 'أتصفّح وأطلب', Icon: IoPersonOutline }
];

const AccountTypeDialog: React.FC<Props> = ({
  open, email, suggestedName, submitting, onCancel, onChoose
}) => {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [businessName, setBusinessName] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setChoice(null);
    setBusinessName(suggestedName || '');
  }, [open, suggestedName]);

  // حقل الاسم يظهر بعد الاختيار — التركيز عليه يوفّر نقرة
  useEffect(() => {
    if (choice && choice !== 'customer') {
      window.setTimeout(() => nameRef.current?.focus(), 60);
    }
  }, [choice]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onCancel(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, submitting, onCancel]);

  if (!open) return null;

  const needsName = choice === 'restaurant' || choice === 'store';
  const trimmed = businessName.trim();
  const canSubmit = !submitting && (choice === 'customer' || (needsName && trimmed.length >= 2));

  const submit = () => {
    if (!canSubmit || !choice) return;
    onChoose(
      choice === 'customer'
        ? { accountType: 'customer' }
        : { accountType: choice, businessName: trimmed }
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-type-title"
      dir="rtl"
      style={{
        position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.78)',
        display: 'grid', placeItems: 'center', padding: 18
      }}
    >
      <div
        style={{
          width: 'min(430px, 100%)', background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 18, padding: 22
        }}
      >
        <h2 id="account-type-title" style={{ color: C.text, fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>
          ما نوع حسابك؟
        </h2>
        <p style={{ color: C.muted, fontSize: 12.5, margin: '0 0 18px', lineHeight: 1.9 }}>
          {email ? <>سجّلت بـ <span dir="ltr" style={{ color: C.text }}>{email}</span>. </> : null}
          لم يُنشأ الحساب بعد — اختيارك الآن يحدّد شكله، وتغييره لاحقاً يحتاج
          تدخّلاً من الإدارة.
        </p>

        <div style={{ display: 'grid', gap: 9, marginBottom: needsName ? 16 : 20 }}>
          {OPTIONS.map(({ key, label, hint, Icon }) => {
            const active = choice === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setChoice(key)}
                aria-pressed={active}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '13px 15px', minHeight: 56, borderRadius: 13, cursor: 'pointer',
                  border: `2px solid ${active ? C.accent : C.border}`,
                  background: active ? 'rgba(200,226,53,0.1)' : C.surf,
                  color: active ? C.accent : C.text,
                  fontFamily: 'inherit', textAlign: 'start'
                }}
              >
                <Icon size={22} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700 }}>{label}</span>
                  <span style={{ display: 'block', fontSize: 12, color: C.muted, marginTop: 2 }}>{hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {needsName && (
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="business-name"
              style={{ display: 'block', color: C.muted, fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}
            >
              {choice === 'restaurant' ? 'اسم المطعم' : 'اسم المتجر'}
            </label>
            <input
              id="business-name"
              ref={nameRef}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              maxLength={80}
              placeholder={choice === 'restaurant' ? 'مطعمي المفضل' : 'متجري الإلكتروني'}
              style={{
                width: '100%', padding: '12px 14px', minHeight: 46, borderRadius: 11,
                border: `1px solid ${C.border}`, background: C.surf, color: C.text,
                fontSize: 14.5, fontFamily: 'inherit'
              }}
            />
            <div style={{ color: C.muted, fontSize: 11.5, marginTop: 6, lineHeight: 1.8 }}>
              يظهر للزبائن، ومنه يُشتقّ نطاقك الفرعي.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 9 }}>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            style={{
              flex: 1, padding: '12px 20px', minHeight: 46, borderRadius: 12, border: 'none',
              background: canSubmit ? C.accent : C.surf,
              color: canSubmit ? C.bg : C.muted,
              fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
              cursor: canSubmit ? 'pointer' : 'not-allowed'
            }}
          >
            {submitting ? 'جارٍ الإنشاء…' : 'متابعة'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              padding: '12px 20px', minHeight: 46, borderRadius: 12,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.text, fontWeight: 700, fontSize: 14,
              fontFamily: 'inherit', cursor: 'pointer'
            }}
          >
            تراجع
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountTypeDialog;
