// frontend/src/components/admin/CancelSubscriptionDialog.tsx
//
// حوار إلغاء اشتراك من لوحة السوبر أدمن.
//
// إلغاء اشتراك شخص آخر قرار لا رجعة عنه ويُغيّر خطته فوراً، فلا يصلح له زرّ
// يُنفَّذ بنقرة واحدة. الحوار يجبر على شيئين: قراءة ما سيحدث، وكتابة سبب
// يراه التاجر في إشعاره — والخادم يرفض الإلغاء بلا سبب على أي حال.

import { useEffect, useRef, useState } from 'react';
import { IoWarningOutline, IoClose } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';

export interface CancelTarget {
  id: string;
  planName: string;
  businessName?: string;
  endDate?: string;
}

interface Palette {
  card: string; surf: string; accent: string; bg: string;
  text: string; muted: string; border: string; red: string;
}

interface Props {
  target: CancelTarget | null;
  onClose: () => void;
  onCancelled: () => void;
  colors: Palette;
}

/** أقصر من هذا لا يشرح شيئاً للتاجر حين يقرأه في إشعاره */
const MIN_REASON = 5;

const CancelSubscriptionDialog: React.FC<Props> = ({ target, onClose, onCancelled, colors: C }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (target) {
      setReason('');
      // التركيز على الحقل مباشرة: الحوار له غرض واحد
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [target, submitting, onClose]);

  if (!target) return null;

  const trimmed = reason.trim();
  const canSubmit = trimmed.length >= MIN_REASON && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.post(`/subscriptions/admin/${target.id}/cancel`, { reason: trimmed });
      toast.success('أُلغي الاشتراك وأُبلغ التاجر');
      onCancelled();
      onClose();
    } catch (error: any) {
      // رسالة الخادم عربية جاهزة — «ملغى مسبقاً» أوضح من «فشل الإلغاء»
      toast.error(error?.response?.data?.error || 'تعذّر إلغاء الاشتراك');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-sub-title"
      onClick={() => !submitting && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)',
        display: 'grid', placeItems: 'center', padding: 18
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(460px, 100%)', background: C.card,
          border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '18px 18px 0' }}>
          <IoWarningOutline size={22} style={{ color: C.red, flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <h2 id="cancel-sub-title" style={{ color: C.text, fontSize: 16.5, fontWeight: 800, margin: '0 0 5px' }}>
              إلغاء الاشتراك
            </h2>
            <p style={{ color: C.muted, fontSize: 12.5, margin: 0, lineHeight: 1.85 }}>
              خطة <strong style={{ color: C.text }}>{target.planName}</strong>
              {target.businessName ? <> لـ <strong style={{ color: C.text }}>{target.businessName}</strong></> : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            disabled={submitting}
            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}
          >
            <IoClose size={19} />
          </button>
        </div>

        {/* ما سيحدث فعلاً — لا رسالة تأكيد عامة */}
        <div style={{ margin: '15px 18px', padding: '12px 14px', background: C.surf, borderRadius: 11 }}>
          <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.95 }}>
            <div>• يصير الاشتراك <strong style={{ color: C.text }}>ملغى</strong> فوراً.</div>
            <div>• يعود النشاط إلى <strong style={{ color: C.text }}>اشتراكه الآخر إن وُجد، وإلا الخطة المجانية</strong>.</div>
            <div>• تُغلق الميزات المدفوعة على التاجر في الحال.</div>
            <div>• يصله إشعار بالسبب الذي تكتبه أدناه.</div>
          </div>
        </div>

        <div style={{ padding: '0 18px' }}>
          <label htmlFor="cancel-reason" style={{ display: 'block', color: C.muted, fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
            سبب الإلغاء <span style={{ color: C.red }}>*</span>
          </label>
          <textarea
            id="cancel-reason"
            ref={inputRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="مثال: لم يصل التحويل، أو أُنشئ الاشتراك بالخطأ"
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.surf, color: C.text,
              fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.8
            }}
          />
          <div style={{ color: C.muted, fontSize: 11.5, marginTop: 5 }}>
            يظهر للتاجر كما تكتبه. «ملغى» بلا سبب يجعله يراسلك سائلاً.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 9, padding: 18, justifyContent: 'flex-start' }}>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            style={{
              padding: '11px 22px', minHeight: 44, borderRadius: 11, border: 'none',
              background: canSubmit ? C.red : C.surf,
              color: canSubmit ? '#fff' : C.muted,
              fontWeight: 800, fontSize: 13.5, fontFamily: 'inherit',
              cursor: canSubmit ? 'pointer' : 'not-allowed'
            }}
          >
            {submitting ? 'جارٍ الإلغاء…' : 'إلغاء الاشتراك'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '11px 22px', minHeight: 44, borderRadius: 11,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.text, fontWeight: 700, fontSize: 13.5,
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

export default CancelSubscriptionDialog;
