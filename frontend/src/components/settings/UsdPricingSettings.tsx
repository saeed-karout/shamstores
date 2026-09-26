// frontend/src/components/settings/UsdPricingSettings.tsx
//
// «سعّر بالدولار، بِع بالليرة تلقائياً».
//
// **الفرق عن «عرض الأسعار» فوقه:** ذاك يختار ما **يراه** الزبون ولا يمسّ
// الأسعار. هذا يختار بأيّ عملة **يُدخل** التاجر أسعاره — وبالدولار تتحدّث
// أسعار الليرة وحدها كلّما تحرّك سعر الصرف، بدل أن يعيد تسعير متجره كل أسبوع.
//
// **ولماذا معاينةٌ قبل الحفظ:** تغيير سعر الصرف يغيّر كل أسعار الواجهة دفعةً
// واحدة. رؤية «سيتغيّر 184 سعراً، مثلاً: قميص 130,000 ← 145,000» قبل الضغط
// تكشف خانةً زائدة قبل أن يراها الزبائن.
//
// يحفظ نفسه بنفسه (كتنبيهات الطلبات أسفله) لا مع زرّ «حفظ التغييرات» العام:
// الحفظ هنا يعيد تسعير الأصناف فوراً، ولا يصحّ أن يُخلط بحفظ الاسم والهاتف.

import React, { useEffect, useMemo, useState } from 'react';
import { IoSwapHorizontal, IoRefresh, IoTimeOutline, IoWarningOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { formatPrice } from '@/utils/currency';
import useUsdPricing, { ROUNDING_STEPS, UsdPricingConfig } from '@/hooks/useUsdPricing';

interface Palette {
  card: string; surf: string; accent: string; text: string;
  muted: string; border: string; warn?: string;
}

interface Draft {
  mode: 'SYP' | 'USD';
  rateSource: 'platform' | 'custom';
  customRate: string;
  roundingStep: number;
}

interface PreviewResult {
  total: number;
  changed: number;
  samples: Array<{ id: string; name: string; priceUsd: number; before: number; after: number }>;
  config: UsdPricingConfig;
}

const toDraft = (c: UsdPricingConfig | null): Draft => ({
  mode: c?.mode || 'SYP',
  rateSource: c?.rateSource || 'platform',
  customRate: c?.customRate ? String(c.customRate) : '',
  roundingStep: c?.roundingStep || 0,
});

const sameDraft = (a: Draft, b: Draft) =>
  a.mode === b.mode && a.rateSource === b.rateSource &&
  (a.customRate || '') === (b.customRate || '') && a.roundingStep === b.roundingStep;

/** العدد بصيغته العربية: واحد، اثنان، 3–10، 11+ */
const arCount = (n: number, one: string, two: string, few: string, many: string) =>
  n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`;
const items = (n: number) => arCount(n, 'صنفٌ واحد', 'صنفان', 'أصناف', 'صنفاً');
const prices = (n: number) => arCount(n, 'سعرٌ واحد', 'سعران', 'أسعار', 'سعراً');

const timeAgo = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `قبل ${arCount(mins, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة')}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `قبل ${arCount(hours, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')}`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'أمس' : `قبل ${arCount(days, 'يوم', 'يومين', 'أيام', 'يوماً')}`;
};

const UsdPricingSettings: React.FC<{ colors: Palette; disabled?: boolean }> = ({ colors: C, disabled }) => {
  const { config, loading, setConfig } = useUsdPricing();
  const [draft, setDraft] = useState<Draft>(toDraft(null));
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [seed, setSeed] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) setDraft(toDraft(config));
  }, [config]);

  const saved = useMemo(() => toDraft(config), [config]);
  const dirty = !sameDraft(draft, saved);
  const warn = C.warn || '#D97706';

  // المعاينة تُحسب على الخادم بنفس دالة الحفظ — لا تقديرٌ في المتصفّح
  useEffect(() => {
    if (!config || !dirty || draft.mode !== 'USD') {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await api.post<PreviewResult>('/pricing/preview', {
          mode: draft.mode,
          rateSource: draft.rateSource,
          customRate: draft.rateSource === 'custom' ? draft.customRate : undefined,
          roundingStep: draft.roundingStep,
        });
        setPreview(data);
        setPreviewError(null);
      } catch (e: any) {
        setPreview(null);
        setPreviewError(e?.response?.data?.error || 'تعذّرت المعاينة');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [draft, dirty, config]);

  const save = async (override?: Partial<Draft>) => {
    const next = { ...draft, ...override };
    setSaving(true);
    try {
      const res = await api.client.put('/pricing', {
        mode: next.mode,
        rateSource: next.rateSource,
        customRate: next.rateSource === 'custom' ? next.customRate : undefined,
        roundingStep: next.roundingStep,
        seedFromSyp: next.mode === 'USD' && saved.mode !== 'USD' && seed,
      });
      const body = res.data || {};
      setConfig(body.data);
      const seeded = body.data?.seeded ? ` — وحُوِّل إلى الدولار: ${prices(body.data.seeded)}` : '';
      toast.success((body.message || 'تم الحفظ') + seeded);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) return null;
  if (!config) return null;

  const box: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 };
  const chip = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 12px', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
    border: `1.5px solid ${active ? C.accent : C.border}`, background: active ? C.surf : 'transparent',
    color: C.text, fontWeight: 700, fontSize: 13, textAlign: 'start',
  });
  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`,
    background: C.surf, color: C.text, fontSize: 14, boxSizing: 'border-box',
  };
  const updatedAgo = timeAgo(config.customRateUpdatedAt);
  const effective = preview?.config?.effectiveRate ?? config.effectiveRate;

  return (
    <div style={box}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: C.text, margin: '0 0 6px' }}>
        <IoSwapHorizontal size={17} color={C.accent} />
        سعّر بالدولار، بِع بالليرة
      </h2>
      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.8, margin: '0 0 14px' }}>
        أدخل أسعارك بالدولار مرّة واحدة، وتتحدّث أسعار الليرة التي يراها زبونك ويدفعها
        تلقائياً كلّما تغيّر سعر الصرف — في المتجر والسلّة والطلب والكاشير.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button type="button" disabled={disabled} style={chip(draft.mode === 'SYP')} onClick={() => setDraft({ ...draft, mode: 'SYP' })}>
          أسعّر بالليرة
          <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 500, marginTop: 2 }}>كما هو الآن</div>
        </button>
        <button type="button" disabled={disabled} style={chip(draft.mode === 'USD')} onClick={() => setDraft({ ...draft, mode: 'USD' })}>
          أسعّر بالدولار
          <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 500, marginTop: 2 }}>والليرة تُحسب تلقائياً</div>
        </button>
      </div>

      {draft.mode === 'USD' && (
        <div style={{ display: 'grid', gap: 14 }}>
          {/* ---- مصدر سعر الصرف ---- */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 8 }}>سعر الصرف</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" disabled={disabled} style={chip(draft.rateSource === 'platform')} onClick={() => setDraft({ ...draft, rateSource: 'platform' })}>
                سعر المنصّة الموحّد
                <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 500, marginTop: 2 }} dir="rtl">
                  {config.platformRate ? `${config.platformRate.toLocaleString('en-US')} ل.س للدولار` : 'غير مضبوط بعد'}
                </div>
              </button>
              <button type="button" disabled={disabled} style={chip(draft.rateSource === 'custom')} onClick={() => setDraft({ ...draft, rateSource: 'custom' })}>
                سعري اليومي الخاص
                <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 500, marginTop: 2 }}>تحدّثه أنت متى شئت</div>
              </button>
            </div>
          </div>

          {draft.rateSource === 'custom' && (
            <div>
              <label style={{ fontSize: 12.5, color: C.muted, display: 'block', marginBottom: 6 }}>كم ليرة للدولار اليوم؟</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number" min={config.minRate} max={config.maxRate} dir="ltr" disabled={disabled}
                  value={draft.customRate}
                  onChange={(e) => setDraft({ ...draft, customRate: e.target.value })}
                  style={input} placeholder={config.platformRate ? String(config.platformRate) : '0'}
                />
                {/* «أكّد سعر اليوم» بنقرة: السعر نفسه صالحٌ اليوم أيضاً — ويتحدّث «آخر تحديث» */}
                {saved.rateSource === 'custom' && !dirty && (
                  <button
                    type="button" disabled={disabled || saving}
                    onClick={() => save()}
                    style={{ ...chip(false), flex: 'none', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                  >
                    <IoRefresh size={14} /> أكّد سعر اليوم
                  </button>
                )}
              </div>
              {updatedAgo && saved.rateSource === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: C.muted, marginTop: 6 }}>
                  <IoTimeOutline size={13} /> آخر تحديث: {updatedAgo}
                </div>
              )}
            </div>
          )}

          {/* ---- التقريب ---- */}
          <div>
            <label style={{ fontSize: 12.5, color: C.muted, display: 'block', marginBottom: 6 }}>تقريب السعر بالليرة</label>
            <select
              disabled={disabled}
              value={draft.roundingStep}
              onChange={(e) => setDraft({ ...draft, roundingStep: Number(e.target.value) })}
              style={input}
            >
              {ROUNDING_STEPS.map((step) => (
                <option key={step} value={step}>
                  {step === 0 ? 'بلا تقريب' : `لأقرب ${step.toLocaleString('en-US')} ل.س`}
                </option>
              ))}
            </select>
            {effective ? (
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
                مثال: 9.99$ ← {formatPrice(
                  draft.roundingStep > 0
                    ? Math.max(draft.roundingStep, Math.round((9.99 * effective) / draft.roundingStep) * draft.roundingStep)
                    : Math.round(9.99 * effective),
                  'SYP'
                )}
              </div>
            ) : null}
          </div>

          {/* ---- ما سيحدث ---- */}
          {saved.mode === 'USD' && !dirty && (config.usdPricedItems ?? 0) > 0 && (
            <div style={{ fontSize: 12.5, color: C.text, background: C.surf, borderRadius: 12, padding: '10px 12px', lineHeight: 1.8 }}>
              المسعّر بالدولار: {items(config.usdPricedItems ?? 0)}.
              {(config.outOfSyncItems ?? 0) > 0 && (
                <> يحتاج تحديثاً لسعر الصرف الحالي: {items(config.outOfSyncItems ?? 0)}.{' '}
                  <button type="button" disabled={disabled || saving} onClick={() => save()}
                    style={{ border: 'none', background: 'none', color: C.accent, fontWeight: 800, cursor: 'pointer', padding: 0 }}>
                    حدّثها الآن
                  </button>
                </>
              )}
            </div>
          )}

          {saved.mode !== 'USD' && (config.sypOnlyItems ?? 0) > 0 && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: C.text, lineHeight: 1.7, cursor: 'pointer' }}>
              <input type="checkbox" checked={seed} onChange={(e) => setSeed(e.target.checked)} style={{ marginTop: 4, accentColor: C.accent }} />
              <span>
                حوّل أسعاري الحالية ({items(config.sypOnlyItems ?? 0)}) إلى الدولار بسعر الصرف الحالي، كي لا أدخلها واحداً واحداً.
                <span style={{ color: C.muted }}> قد يتغيّر بعضها بفروق صغيرة بسبب التقريب.</span>
              </span>
            </label>
          )}

          {previewError && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5, color: warn }}>
              <IoWarningOutline size={15} /> {previewError}
            </div>
          )}

          {preview && dirty && (
            <div style={{ fontSize: 12.5, color: C.text, background: C.surf, borderRadius: 12, padding: '10px 12px', lineHeight: 1.8 }}>
              <b>
                {preview.changed > 0
                  ? `سيتغيّر ${prices(preview.changed)} من ${preview.total}`
                  : preview.total > 0 ? 'لن يتغيّر أيّ سعر' : 'لا أصناف مسعّرة بالدولار بعد'}
              </b>
              {preview.samples.map((s) => (
                <div key={s.id} style={{ color: C.muted, fontSize: 12 }}>
                  {s.name} ({s.priceUsd}$): <span dir="ltr">{formatPrice(s.before, 'SYP')} ← {formatPrice(s.after, 'SYP')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {dirty && (
        <button
          type="button"
          disabled={disabled || saving || !!previewError}
          onClick={() => save()}
          style={{
            marginTop: 14, width: '100%', padding: '11px 14px', borderRadius: 12, border: 'none',
            background: C.accent, color: '#FFFFFF', fontWeight: 800, fontSize: 13.5,
            cursor: disabled || saving || previewError ? 'not-allowed' : 'pointer', opacity: saving || previewError ? 0.6 : 1,
          }}
        >
          {saving ? 'جارٍ الحفظ…' : draft.mode === 'USD' ? 'احفظ وحدّث الأسعار' : 'احفظ — التسعير بالليرة'}
        </button>
      )}
    </div>
  );
};

export default UsdPricingSettings;
