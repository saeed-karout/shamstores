// frontend/src/components/auth/AuthKit.tsx
//
// عناصر نماذج الدخول والتسجيل — حقلٌ واحد وزرٌّ واحد ورسالةٌ واحدة لكلّ
// الصفحات، بأنماط `styles/auth.css`.

import React, { useId, useRef, useState } from 'react';
import {
  IoEyeOutline,
  IoEyeOffOutline,
  IoCheckmarkCircle,
  IoEllipseOutline,
  IoAlertCircle,
  IoInformationCircle
} from 'react-icons/io5';

// ===== الحقل =====

interface AuthFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  icon?: React.ReactNode;
  /** سطرٌ تحت الحقل */
  hint?: React.ReactNode;
  /** عنصرٌ بجانب التسمية (رابط «نسيت كلمة المرور؟» مثلاً) */
  labelAside?: React.ReactNode;
  /** للبريد والهاتف: يُكتب من اليسار ويبقى محاذياً للحقول العربية */
  ltr?: boolean;
  trailing?: React.ReactNode;
}

export const AuthField: React.FC<AuthFieldProps> = ({ label, icon, hint, labelAside, ltr, trailing, id, className, ...input }) => {
  const autoId = useId();
  const fieldId = id || autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  return (
    <div className="ss-field">
      <label className="ss-field-label" htmlFor={fieldId}>
        <span>{label}</span>
        {labelAside}
      </label>
      <div className="ss-field-box">
        {icon && <span className="ss-field-icon">{icon}</span>}
        <input
          id={fieldId}
          aria-describedby={hintId}
          className={`ss-input ${ltr ? 'ss-input-ltr' : ''} ${className || ''}`}
          // حشوةٌ فيزيائية لا منطقية: الصفحة يمين-يسار دائماً فالأيقونة يميناً،
          // لكن حقل البريد يسار-يمين فتنقلب «البداية» فيه ويلتصق النصّ بالأيقونة
          style={{ paddingRight: icon ? 46 : 16, paddingLeft: trailing ? 50 : 16 }}
          {...input}
        />
        {trailing}
      </div>
      {hint && (
        <div id={hintId} className="ss-field-hint">
          {hint}
        </div>
      )}
    </div>
  );
};

// ===== كلمة المرور =====

/**
 * قواعد الخادم نفسها (`backend/src/utils/validation.ts`): ثمانية أحرف،
 * وحرفٌ ورقم. كانت صفحة التسجيل تقول «٦ أحرف» فيُرفض ما بين ٦ و٧ بعد
 * أن يملأ التاجر النموذج كلّه.
 */
export const passwordRules = (value: string) => [
  { key: 'len', label: '8 أحرف على الأقل', ok: value.length >= 8 },
  { key: 'letter', label: 'حرف', ok: /[a-zA-Z؀-ۿ]/.test(value) },
  { key: 'digit', label: 'رقم', ok: /[0-9]/.test(value) }
];

export const isPasswordValid = (value: string) => passwordRules(value).every((r) => r.ok);

interface PasswordFieldProps extends Omit<AuthFieldProps, 'type' | 'trailing'> {
  /** عرض القواعد تحت الحقل — عند التسجيل وتعيين كلمة مرور جديدة */
  showRules?: boolean;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({ showRules, value, hint, ...rest }) => {
  const [visible, setVisible] = useState(false);
  const text = String(value ?? '');
  return (
    <AuthField
      {...rest}
      value={value}
      type={visible ? 'text' : 'password'}
      ltr
      hint={
        showRules ? (
          <ul className="ss-rules" aria-label="شروط كلمة المرور">
            {passwordRules(text).map((r) => (
              <li key={r.key} className={r.ok ? 'is-ok' : ''}>
                {r.ok ? <IoCheckmarkCircle size={15} /> : <IoEllipseOutline size={15} />}
                {r.label}
              </li>
            ))}
          </ul>
        ) : (
          hint
        )
      }
      trailing={
        <button
          type="button"
          className="ss-field-action"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          aria-pressed={visible}
        >
          {visible ? <IoEyeOffOutline size={19} /> : <IoEyeOutline size={19} />}
        </button>
      }
    />
  );
};

// ===== الأزرار =====

export const SubmitButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText?: string }
> = ({ loading, loadingText = 'جارٍ التنفيذ…', children, disabled, ...rest }) => (
  <button type="submit" className="ss-auth-submit" disabled={disabled || loading} aria-busy={loading} {...rest}>
    {loading ? (
      <>
        <span className="ss-spinner" aria-hidden="true" />
        {loadingText}
      </>
    ) : (
      children
    )}
  </button>
);

export const AuthDivider: React.FC<{ children?: React.ReactNode }> = ({ children = 'أو' }) => (
  <div className="ss-divider" role="separator">
    {children}
  </div>
);

// ===== الرسائل =====

export const AuthAlert: React.FC<{ tone?: 'error' | 'info' | 'success'; children: React.ReactNode }> = ({
  tone = 'error',
  children
}) => (
  <div className={`ss-alert is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    {tone === 'error' ? <IoAlertCircle size={18} /> : tone === 'success' ? <IoCheckmarkCircle size={18} /> : <IoInformationCircle size={18} />}
    <span>{children}</span>
  </div>
);

// ===== رمز التحقّق =====

/**
 * ستّ خانات لرمز التحقّق — لصقُ الرمز كاملاً يوزّعه على الخانات، والحذف
 * يعود للخانة السابقة. و`autoComplete="one-time-code"` يتيح للجوال اقتراح
 * الرمز من الرسالة.
 */
export const OtpInput: React.FC<{ value: string; onChange: (v: string) => void; length?: number; autoFocus?: boolean }> = ({
  value,
  onChange,
  length = 6,
  autoFocus
}) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  const setAt = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit || ' ';
    onChange(next.join('').replace(/\s+$/g, '').replace(/\s/g, ''));
  };

  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  return (
    <div className="ss-otp" role="group" aria-label="رمز التحقّق">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && i === 0}
          // لا `maxLength={1}`: اقتراح الجوال يكتب الرمز كاملاً في خانةٍ واحدة
          // فيُقصّ إلى أوّل رقم. الفائض يُوزَّع في `onChange` أدناه
          maxLength={length}
          value={d.trim()}
          aria-label={`الخانة ${i + 1}`}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '');
            if (raw.length > 1) {
              // لصقٌ أو اقتراح الجوال: الرمز كاملاً في خانةٍ واحدة
              onChange(raw.slice(0, length));
              focus(raw.length);
              return;
            }
            setAt(i, raw);
            if (raw) focus(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d.trim()) focus(i - 1);
            // الخانات يسار-يمين (`.ss-otp { direction: ltr }`)
            if (e.key === 'ArrowRight') focus(i + 1);
            if (e.key === 'ArrowLeft') focus(i - 1);
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (pasted) {
              e.preventDefault();
              onChange(pasted);
              focus(pasted.length);
            }
          }}
        />
      ))}
    </div>
  );
};
