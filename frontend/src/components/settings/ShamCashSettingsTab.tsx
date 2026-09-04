// frontend/src/components/settings/ShamCashSettingsTab.tsx
//
// إعدادات الدفع للتاجر.
//
// يستبدل PaymentSettingsTab القديم الذي كان مبنياً لـ Stripe وPayPal —
// ولا واحد منهما يعمل في سوريا، ولم يكن مربوطاً بأي صفحة أصلاً.
//
// القواعد هنا **تطابق** backend/src/services/payment.service.ts حرفياً:
// النقد لا يُطفأ، وشام كاش لا تُفعَّل بلا رقم محفظة، والرقم أرقام فقط.
// الواجهة تمنع الخطأ مبكراً، والخادم يرفضه على أي حال — فمن يرسل مباشرة
// إلى الـ API لا يلتفّ على شيء.

import { useEffect, useState } from 'react';
import {
  IoWalletOutline,
  IoCashOutline,
  IoCheckmarkCircle,
  IoWarningOutline,
  IoInformationCircleOutline
} from 'react-icons/io5';

export interface ShamCashSettings {
  enabled: boolean;
  accountNumber: string;
  accountName?: string;
  note?: string;
}

export interface PaymentSettingsValue {
  shamCash: ShamCashSettings;
}

interface Props {
  value?: PaymentSettingsValue | null;
  onSave: (value: PaymentSettingsValue) => Promise<void> | void;
  saving?: boolean;
  canEdit?: boolean;
  colors: {
    bg: string; card: string; surf: string; accent: string;
    text: string; muted: string; border: string; red: string;
  };
}

const EMPTY: PaymentSettingsValue = {
  shamCash: { enabled: false, accountNumber: '', accountName: '', note: '' }
};

/** نفس تعبير الخادم: يبدأ برقم، وخمسة محارف فأكثر، وتُقبل المسافات والشرطات. */
const ACCOUNT_PATTERN = /^[0-9][0-9\s-]{4,}$/;

const ShamCashSettingsTab: React.FC<Props> = ({ value, onSave, saving = false, canEdit = true, colors: C }) => {
  const [form, setForm] = useState<PaymentSettingsValue>(EMPTY);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (value?.shamCash) {
      setForm({
        shamCash: {
          enabled: Boolean(value.shamCash.enabled),
          accountNumber: value.shamCash.accountNumber || '',
          accountName: value.shamCash.accountName || '',
          note: value.shamCash.note || ''
        }
      });
    }
  }, [value]);

  const sham = form.shamCash;
  const trimmedNumber = sham.accountNumber.trim();

  // الرسالة تقول ما العمل، لا «قيمة غير صالحة»
  const numberError =
    sham.enabled && !trimmedNumber
      ? 'أدخل رقم محفظتك قبل التفعيل — الزبون سيحوّل إليه.'
      : trimmedNumber && !ACCOUNT_PATTERN.test(trimmedNumber)
      ? 'رقم المحفظة أرقام فقط (تُقبل المسافات والشرطات).'
      : '';

  const canSubmit = canEdit && !saving && !numberError;

  const update = (patch: Partial<ShamCashSettings>) => {
    setTouched(true);
    setForm((prev) => ({ shamCash: { ...prev.shamCash, ...patch } }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    await onSave({
      shamCash: {
        enabled: sham.enabled && trimmedNumber.length > 0,
        // نُزيل الفواصل قبل الإرسال كما يفعل الخادم، فيبقى المخزَّن موحّداً
        accountNumber: trimmedNumber.replace(/[\s-]/g, ''),
        accountName: (sham.accountName || '').trim() || undefined,
        note: (sham.note || '').trim() || undefined
      }
    });
    setTouched(false);
  };

  const label: React.CSSProperties = {
    display: 'block', color: C.muted, fontSize: 12.5, fontWeight: 600, marginBottom: 6
  };
  const input: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.surf, color: C.text,
    fontSize: 14, fontFamily: 'inherit', minHeight: 44
  };
  const card: React.CSSProperties = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, maxWidth: 640 }}>

      {/* النقد — حالة لا خيار */}
      <div style={{ ...card, display: 'flex', gap: 13, alignItems: 'flex-start' }}>
        <IoCashOutline size={22} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>
            الدفع نقداً — مفعّل دائماً
          </div>
          <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.8 }}>
            لا يمكن إطفاؤه. لو أُطفئت كل الطرق لبقي الزبون عاجزاً عن إتمام أي طلب.
          </div>
        </div>
      </div>

      {/* شام كاش */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', marginBottom: sham.enabled ? 18 : 0 }}>
          <IoWalletOutline size={22} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />

          <div style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: canEdit ? 'pointer' : 'default' }}>
              <input
                type="checkbox"
                checked={sham.enabled}
                disabled={!canEdit}
                onChange={(e) => update({ enabled: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: C.accent, cursor: 'inherit' }}
              />
              <span style={{ color: C.text, fontWeight: 700, fontSize: 14.5 }}>
                استقبال الدفع عبر شام كاش
              </span>
            </label>
            <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.8, marginTop: 6 }}>
              يحوّل الزبون إلى محفظتك مباشرة. المبلغ يصلك أنت — المنصة لا تمرّ
              عليه ولا تقتطع منه.
            </div>
          </div>
        </div>

        {sham.enabled && (
          <div style={{ display: 'grid', gap: 14, paddingInlineStart: 35 }}>
            <div>
              <label style={label} htmlFor="sham-number">رقم المحفظة *</label>
              <input
                id="sham-number"
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={sham.accountNumber}
                disabled={!canEdit}
                onChange={(e) => update({ accountNumber: e.target.value })}
                placeholder="0912345678"
                aria-invalid={Boolean(numberError)}
                aria-describedby={numberError ? 'sham-number-error' : undefined}
                style={{ ...input, borderColor: numberError ? C.red : C.border, textAlign: 'left' }}
              />
              {numberError && (
                <div
                  id="sham-number-error"
                  style={{ color: C.red, fontSize: 12, marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}
                >
                  <IoWarningOutline size={14} /> {numberError}
                </div>
              )}
            </div>

            <div>
              <label style={label} htmlFor="sham-name">اسم صاحب المحفظة</label>
              <input
                id="sham-name"
                type="text"
                value={sham.accountName || ''}
                disabled={!canEdit}
                onChange={(e) => update({ accountName: e.target.value })}
                placeholder="كما يظهر عند التحويل"
                maxLength={80}
                style={input}
              />
              <div style={{ color: C.muted, fontSize: 11.5, marginTop: 5 }}>
                يطمئن الزبون أنه يحوّل إلى الجهة الصحيحة.
              </div>
            </div>

            <div>
              <label style={label} htmlFor="sham-note">تعليمات للزبون</label>
              <textarea
                id="sham-note"
                value={sham.note || ''}
                disabled={!canEdit}
                onChange={(e) => update({ note: e.target.value })}
                placeholder="مثال: أرسل صورة إشعار التحويل على واتساب بعد الطلب"
                rows={3}
                maxLength={300}
                style={{ ...input, resize: 'vertical', lineHeight: 1.8 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* كيف يُحتسب الدفع فعلياً */}
      <div
        style={{
          display: 'flex', gap: 11, alignItems: 'flex-start',
          background: C.surf, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '13px 15px'
        }}
      >
        <IoInformationCircleOutline size={19} style={{ color: C.muted, flexShrink: 0, marginTop: 1 }} />
        <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.85 }}>
          طلبات شام كاش <strong style={{ color: C.text }}>لا تُحتسب مدفوعة تلقائياً</strong>.
          التحويل يدوي، فأنت من يؤكّد وصوله من صفحة الطلبات — وإلا ظهر الطلب
          مسدَّداً قبل أن يصلك قرش.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: '12px 26px', minHeight: 44, borderRadius: 11, border: 'none',
            background: canSubmit ? C.accent : C.surf,
            color: canSubmit ? C.bg : C.muted,
            fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
            cursor: canSubmit ? 'pointer' : 'not-allowed'
          }}
        >
          {saving ? 'جارٍ الحفظ…' : 'حفظ إعدادات الدفع'}
        </button>

        {!touched && sham.enabled && trimmedNumber && !saving && (
          <span style={{ color: C.muted, fontSize: 12.5, display: 'flex', gap: 5, alignItems: 'center' }}>
            <IoCheckmarkCircle size={15} style={{ color: C.accent }} /> شام كاش مفعّلة
          </span>
        )}
      </div>

      {!canEdit && (
        <div style={{ color: C.red, fontSize: 12.5 }}>
          ليس لديك صلاحية تعديل إعدادات الدفع.
        </div>
      )}
    </form>
  );
};

export default ShamCashSettingsTab;
