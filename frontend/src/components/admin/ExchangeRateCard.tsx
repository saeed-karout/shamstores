// frontend/src/components/admin/ExchangeRateCard.tsx
//
// سعر صرف الدولار — يضبطه السوبر أدمن ويسري على المنصة كلها.
//
// لماذا بطاقة مستقلة لا حقلاً بين أربعين إعداداً: هذه القيمة **تُضرب في كل
// سعر** على المنصة. خانة زائدة تجعل وجبة بخمسين ألف ليرة تظهر بخمسة دولارات
// بدل خمسين، وخانة ناقصة تعكس الخطأ. تستحق معاينة قبل الحفظ وتأكيداً عند
// القفزات الكبيرة، لا صندوق نصّ صامتاً.

import { useEffect, useState } from 'react';
import { IoSwapHorizontal, IoWarningOutline, IoCheckmarkCircle } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';

interface Palette {
  card: string; surf: string; accent: string; bg: string;
  text: string; muted: string; border: string; red: string; orange: string;
}

interface RateState {
  usdRate: number | null;
  minRate: number;
  maxRate: number;
  isConfigured: boolean;
}

/** قفزة تتجاوز هذه النسبة تستحق تأكيداً — غالباً خانة زائدة لا تحرّك سوق */
const CONFIRM_THRESHOLD = 0.5;

const ExchangeRateCard: React.FC<{ colors: Palette }> = ({ colors: C }) => {
  const [state, setState] = useState<RateState | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // api.get يُرجع الحمولة مفكوكة التغليف — لا تفكّها مجدداً
        const data: any = await api.get('/platform-settings/exchange-rate');
        setState(data);
        if (data?.usdRate) setInput(String(data.usdRate));
      } catch {
        toast.error('تعذّر قراءة سعر الصرف');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const parsed = parseFloat(input.trim());
  const valid = Number.isFinite(parsed) && state
    ? parsed >= state.minRate && parsed <= state.maxRate
    : false;

  const current = state?.usdRate ?? null;
  const changed = valid && parsed !== current;

  // نسبة التغيّر — الحارس ضد الخانة الزائدة
  const jump = current && valid ? Math.abs(parsed - current) / current : 0;
  const bigJump = changed && jump > CONFIRM_THRESHOLD;

  const save = async () => {
    if (!valid || !changed) return;

    if (bigJump) {
      const pct = Math.round(jump * 100);
      const ok = window.confirm(
        `سعر الصرف سيتغيّر بنسبة ${pct}% — من ${current!.toLocaleString('en-US')} إلى ` +
        `${parsed.toLocaleString('en-US')} ل.س للدولار.\n\n` +
        'هذا يغيّر الأسعار المعروضة لكل التجّار فوراً. متأكد؟'
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      await api.put('/platform-settings/exchange-rate', { usdRate: parsed });
      setState((prev) => (prev ? { ...prev, usdRate: parsed, isConfigured: true } : prev));
      toast.success('تم تحديث سعر الصرف — يسري فوراً');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر حفظ سعر الصرف');
    } finally {
      setSaving(false);
    }
  };

  const card: React.CSSProperties = {
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 16, padding: 22, marginBottom: 20
  };

  if (loading) {
    return <div style={{ ...card, color: C.muted, fontSize: 13.5 }}>جارٍ قراءة سعر الصرف…</div>;
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
        <IoSwapHorizontal size={22} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />
        <div>
          <h2 style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: '0 0 5px' }}>
            سعر صرف الدولار
          </h2>
          <p style={{ color: C.muted, fontSize: 12.5, margin: 0, lineHeight: 1.85 }}>
            كم ليرة سورية للدولار الواحد. يسري على <strong style={{ color: C.text }}>كل
            التجّار</strong> — لا يضبطه كل متجر لنفسه، فسعر مختلف لكل متجر يجعل
            المنتج الواحد بسعرين متباعدين.
          </p>
        </div>
      </div>

      {!state?.isConfigured && (
        <div
          style={{
            display: 'flex', gap: 9, alignItems: 'flex-start',
            background: 'rgba(251,146,60,0.1)', border: `1px solid ${C.orange}40`,
            borderRadius: 11, padding: '12px 14px', marginBottom: 16
          }}
        >
          <IoWarningOutline size={17} style={{ color: C.orange, flexShrink: 0, marginTop: 2 }} />
          <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.85 }}>
            <strong style={{ color: C.text }}>لم يُضبط سعر صرف بعد.</strong> حتى تضبطه،
            أي متجر يختار العرض بالدولار يعود تلقائياً إلى الليرة — والنظام لا
            يخترع سعراً بديلاً.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label
            htmlFor="usd-rate"
            style={{ display: 'block', color: C.muted, fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}
          >
            ليرة سورية للدولار الواحد
          </label>
          <input
            id="usd-rate"
            type="number"
            inputMode="decimal"
            dir="ltr"
            value={input}
            min={state?.minRate}
            max={state?.maxRate}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`${state?.minRate ?? 1} – ${(state?.maxRate ?? 0).toLocaleString('en-US')}`}
            aria-describedby="usd-rate-hint"
            style={{
              width: '100%', padding: '11px 13px', minHeight: 44, borderRadius: 10,
              border: `1px solid ${input && !valid ? C.red : C.border}`,
              background: C.surf, color: C.text, fontSize: 15,
              fontFamily: 'inherit', textAlign: 'left', fontVariantNumeric: 'tabular-nums'
            }}
          />
        </div>

        <button
          type="button"
          onClick={save}
          disabled={!changed || saving}
          style={{
            padding: '12px 24px', minHeight: 44, borderRadius: 11, border: 'none',
            background: changed && !saving ? C.accent : C.surf,
            color: changed && !saving ? C.bg : C.muted,
            fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
            cursor: changed && !saving ? 'pointer' : 'not-allowed'
          }}
        >
          {saving ? 'جارٍ الحفظ…' : 'حفظ السعر'}
        </button>
      </div>

      <div id="usd-rate-hint" style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.85 }}>
        {input && !valid ? (
          <span style={{ color: C.red, display: 'flex', gap: 6, alignItems: 'center' }}>
            <IoWarningOutline size={14} />
            القيمة خارج النطاق المقبول ({state?.minRate} – {state?.maxRate.toLocaleString('en-US')}).
          </span>
        ) : bigJump ? (
          <span style={{ color: C.orange, display: 'flex', gap: 6, alignItems: 'center' }}>
            <IoWarningOutline size={14} />
            تغيّر بنسبة {Math.round(jump * 100)}% عن السعر الحالي — سيُطلب تأكيدك.
          </span>
        ) : valid ? (
          // معاينة ملموسة: رقم مجرّد لا يكشف الخطأ، ووجبة بسعر مألوف تكشفه
          <span style={{ color: C.muted }}>
            {/* مبلغ المعاينة بالعملة بعد إعادة التقويم (حذف صفرين): وجبة
                بخمسة آلاف بالقديمة صارت خمسين بالجديدة. مثال بعملة قديمة
                لا يعني شيئاً للتاجر اليوم. */}
            بهذا السعر، وجبة بـ <strong style={{ color: C.text }}>500 ل.س</strong> تظهر
            للزبون بـ{' '}
            <strong style={{ color: C.accent, fontVariantNumeric: 'tabular-nums' }}>
              ${(500 / parsed).toFixed(2)}
            </strong>
            {current === parsed && (
              <span style={{ color: C.muted, marginInlineStart: 8 }}>
                <IoCheckmarkCircle size={13} style={{ color: C.accent, verticalAlign: -2 }} /> السعر المحفوظ
              </span>
            )}
          </span>
        ) : (
          <span style={{ color: C.muted }}>أدخل السعر لترى معاينة فورية لأثره.</span>
        )}
      </div>
    </div>
  );
};

export default ExchangeRateCard;
