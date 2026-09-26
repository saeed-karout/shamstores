// frontend/src/components/ai/AiImportTool.tsx
//
// «متجرك جاهز من صفحتك» — من لقطات منشورات إنستغرام وفيسبوك إلى منتجات.
//
// **لماذا صور لا ربطُ حساب:** التاجر السوري يبيع من منشوراته، ولا يملك
// ملفّ منتجات ولا صبر إدخال خمسين منتجاً يدوياً. لقطة الشاشة شيءٌ يعرف
// فعله؛ وربط الحساب يحتاج صلاحياتٍ لا تمنحها المنصّات للسحب أصلاً.
//
// **ولا يُنشأ شيءٌ قبل المراجعة.** النموذج يقرأ «٧٥ ألف» ويخطئ أحياناً في
// صفرٍ أو عملة — والسعر الخطأ يُباع به. فالنتيجة جدول مسوّداتٍ قابلٌ للتعديل،
// مع تحذيرٍ ظاهر على كل سطرٍ مشكوكٍ فيه، والحفظ بضغطةٍ صريحة.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  IoSparklesOutline,
  IoCloseOutline,
  IoImagesOutline,
  IoWarningOutline,
  IoCheckmarkCircleOutline,
  IoTrashOutline,
  IoChatboxEllipsesOutline
} from 'react-icons/io5';
import type { CsvPalette } from '@/components/common/CsvTools';
import { apiClient } from '@/services/api/client';
import {
  useAiStatus,
  extractFromImage,
  commitImport,
  invalidateAiStatus,
  aiErrorMessage,
  quotaLabel,
  type ImportDraft,
  type AiQuota
} from '@/services/ai';
import { loadBitmap, toSizedDataUrl, cropToSquare, blobToFile } from '@/utils/imageTools';

/** يطابق حدّ الدفعة في الخادم تقريباً — عشرون منشوراً جلسةٌ واحدة معقولة */
const MAX_FILES = 20;
/** أطول ضلع يُرسَل للنموذج — يكفي لقراءة سعرٍ صغير في لقطة شاشة */
const SEND_MAX_DIM = 1400;
const SEND_MAX_BYTES = 650 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

interface Source {
  id: string;
  file: File;
  preview: string;
  caption: string;
  showCaption: boolean;
  status: 'waiting' | 'reading' | 'done' | 'failed';
  error?: string;
}

interface Row extends ImportDraft {
  id: string;
  sourceId: string;
  include: boolean;
  crop: Blob | null;
  cropUrl: string | null;
}

type Step = 'pick' | 'reading' | 'review' | 'saving' | 'done';

interface Props {
  kind: 'store' | 'restaurant';
  colors: CsvPalette;
  onDone: () => void;
  /** فرعٌ مختار — الإنشاء فيه إن كان للتاجر */
  branchId?: string;
  /** أسماء فئاتٍ قائمة — للاقتراح في خانة الفئة */
  categories?: string[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

/** العدد مع معدوده بصيغته العربية: 1 و2 و3–10 و11+ تختلف */
const counted = (n: number, kind: 'store' | 'restaurant') => {
  const [one, two, few, many] =
    kind === 'restaurant' ? ['صنفٌ واحد', 'صنفان', 'أصناف', 'صنفاً'] : ['منتجٌ واحد', 'منتجان', 'منتجات', 'منتجاً'];
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n} ${n >= 3 && n <= 10 ? few : many}`;
};
const postsLabel = (n: number) =>
  n === 1 ? 'المنشور' : n === 2 ? 'المنشورين' : n >= 3 && n <= 10 ? `${n} منشورات` : `${n} منشوراً`;

const btn = (colors: CsvPalette, tone: 'plain' | 'accent' = 'plain'): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  minHeight: 34,
  padding: '0 12px',
  borderRadius: 10,
  border: `1px solid ${tone === 'accent' ? colors.accent : colors.border}`,
  background: tone === 'accent' ? colors.accent : 'transparent',
  color: tone === 'accent' ? colors.bg : colors.muted,
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer'
});

const field = (colors: CsvPalette): React.CSSProperties => ({
  width: '100%',
  minWidth: 0,
  padding: '7px 10px',
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  color: colors.text,
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none'
});

const WARN = '#B7791F';

/** «المقاس: S، M، L» ← مجموعة خيار، والعكس — تحريرٌ نصّي أبسط من محرّرٍ كامل */
const optionsToText = (options: ImportDraft['options']) =>
  options.map((o) => `${o.name}: ${o.values.join('، ')}`).join('\n');
const textToOptions = (text: string): ImportDraft['options'] =>
  text
    .split('\n')
    .map((line) => {
      const [name, rest = ''] = line.split(/[:：]/);
      return {
        name: (name || '').trim(),
        values: rest
          .split(/[،,]/)
          .map((v) => v.trim())
          .filter(Boolean)
      };
    })
    .filter((o) => o.name && o.values.length);

const AiImportTool: React.FC<Props> = ({ kind, colors, onDone, branchId, categories = [] }) => {
  const { status, refresh } = useAiStatus();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('pick');
  const [sources, setSources] = useState<Source[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ created: number; errors: { name: string; message: string }[]; newCategories: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bitmaps = useRef(new Map<string, Awaited<ReturnType<typeof loadBitmap>>>());
  const cancelled = useRef(false);

  useEffect(() => {
    if (status) setQuota(status.import);
  }, [status]);

  // روابط المعاينة تُحرَّر عند الإغلاق — عشرون صورة بدقّة الهاتف ذاكرةٌ حقيقية
  const releaseAll = () => {
    sources.forEach((s) => URL.revokeObjectURL(s.preview));
    rows.forEach((r) => r.cropUrl && URL.revokeObjectURL(r.cropUrl));
    bitmaps.current.clear();
  };

  const noun = kind === 'restaurant' ? 'صنف' : 'منتج';
  const suggestions = useMemo(() => {
    const set = new Set(categories.filter(Boolean));
    rows.forEach((r) => r.category && set.add(r.category));
    return [...set];
  }, [categories, rows]);

  // بلا مفتاحٍ على الخادم لا زرّ أصلاً — زرٌّ يفشل عند أوّل ضغطة أسوأ من غيابه
  if (!status?.configured) return null;

  const reset = () => {
    releaseAll();
    setSources([]);
    setRows([]);
    setResult(null);
    setProgress({ done: 0, total: 0 });
    setStep('pick');
  };

  const close = () => {
    if (step === 'reading') cancelled.current = true;
    if (step === 'saving') return;
    reset();
    setOpen(false);
  };

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => ACCEPTED.includes(f.type));
    const skipped = Array.from(list).length - files.length;
    if (skipped) toast.error(`${skipped} ملفّ ليس صورة JPG أو PNG أو WEBP`);
    const room = Math.min(MAX_FILES - sources.length, quota?.remaining ?? MAX_FILES);
    if (files.length > room) toast(`ستُقرأ ${Math.max(0, room)} صورة فقط — ${room <= 0 ? 'لا رصيد باقٍ' : 'الحدّ'}`);
    const next = files.slice(0, Math.max(0, room)).map<Source>((file) => ({
      id: uid(),
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      showCaption: false,
      status: 'waiting'
    }));
    setSources((prev) => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const updateSource = (id: string, patch: Partial<Source>) =>
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const readAll = async () => {
    if (!sources.length) return;
    cancelled.current = false;
    setStep('reading');
    setProgress({ done: 0, total: sources.length });
    const collected: Row[] = [];
    let stopped = false;

    // صورةٌ صورة: طلبٌ واحد لكل منشور يُبقي ما نجح إن انقطع الاتصال،
    // ويعطي التاجر تقدّماً يراه بدل دقيقةٍ من الانتظار الأعمى
    for (const source of sources) {
      if (cancelled.current || stopped) break;
      updateSource(source.id, { status: 'reading' });
      try {
        const bitmap = await loadBitmap(source.file);
        bitmaps.current.set(source.id, bitmap);
        const dataUrl = toSizedDataUrl(bitmap, SEND_MAX_DIM, SEND_MAX_BYTES);
        const res = await extractFromImage(dataUrl, source.caption);
        setQuota(res.quota);
        for (const draft of res.drafts) {
          let crop: Blob | null = null;
          try {
            crop = await cropToSquare(bitmap, draft.box);
          } catch {
            crop = null;
          }
          collected.push({
            ...draft,
            id: uid(),
            sourceId: source.id,
            include: true,
            crop,
            cropUrl: crop ? URL.createObjectURL(crop) : null
          });
        }
        updateSource(source.id, {
          status: 'done',
          error: res.drafts.length ? undefined : 'لم يُعثر على منتجٍ للبيع'
        });
      } catch (error: any) {
        const code = error?.response?.data?.code;
        updateSource(source.id, { status: 'failed', error: aiErrorMessage(error, 'تعذّرت القراءة') });
        // الحصّة انتهت أو الخدمة معطّلة: الصور الباقية ستفشل للسبب نفسه
        if (code === 'ai_quota' || code === 'ai_unavailable') {
          toast.error(aiErrorMessage(error, 'توقّفت القراءة'));
          stopped = true;
        }
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    invalidateAiStatus();
    refresh();
    if (cancelled.current) {
      // أُغلقت النافذة أثناء القراءة: ما قُرئ يُرمى ولا يظهر عند فتحها ثانيةً
      collected.forEach((r) => r.cropUrl && URL.revokeObjectURL(r.cropUrl));
      return;
    }
    setRows(collected);
    if (!collected.length) {
      toast.error('لم نجد منتجاتٍ في هذه الصور');
      setStep('pick');
      return;
    }
    setStep('review');
  };

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const chosen = rows.filter((r) => r.include);
  const invalid = chosen.filter((r) => !r.name.trim() || !(Number(r.price) > 0));

  const save = async () => {
    if (!chosen.length) return;
    if (invalid.length) {
      toast.error(`أكمل الاسم والسعر أوّلاً (${counted(invalid.length, kind)})`);
      return;
    }
    setStep('saving');
    try {
      // الصور المقصوصة تُرفع أوّلاً بدفعاتٍ من عشر (حدّ مسار الرفع)
      const withCrop = chosen.filter((r) => r.crop);
      const urls = new Map<string, string>();
      for (let i = 0; i < withCrop.length; i += 10) {
        const batch = withCrop.slice(i, i + 10);
        const files = batch.map((r, j) => blobToFile(r.crop!, `ai-import-${i + j + 1}`));
        const uploaded = await apiClient.uploadMultipleImages(
          files,
          kind === 'restaurant' ? 'items' : 'products',
          branchId,
          'gallery'
        );
        (uploaded?.images || []).forEach((img, j) => img?.url && urls.set(batch[j].id, img.url));
      }

      const res = await commitImport(
        chosen.map((r) => ({
          name: r.name.trim(),
          nameEn: r.nameEn.trim(),
          description: r.description.trim(),
          descriptionEn: r.descriptionEn.trim(),
          price: Number(r.price) || null,
          priceUsd: r.priceUsd,
          originalPrice: r.originalPrice,
          category: r.category.trim(),
          options: r.options,
          imageUrl: urls.get(r.id) || null
        })),
        branchId
      );
      setResult({ created: res.created, errors: res.errors, newCategories: res.newCategories });
      setStep('done');
      toast.success(`أُضيف ${counted(res.created, kind)}`);
      onDone();
    } catch (error: any) {
      toast.error(aiErrorMessage(error, 'تعذّر الحفظ — مسوّداتك باقية، أعد المحاولة'));
      setStep('review');
    }
  };

  const importQuota = quota || status.import;
  const blocked = !importQuota.allowed;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ ...btn(colors), color: colors.accent, borderColor: colors.accent }}
        title={quotaLabel(importQuota)}
      >
        <IoSparklesOutline size={16} />
        {kind === 'restaurant' ? 'قائمتك من صور منشوراتك' : 'متجرك من صور منشوراتك'}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="الاستيراد من صور المنشورات"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0,0,0,0.62)',
            display: 'grid',
            placeItems: 'center',
            padding: 12
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && step === 'pick') close();
          }}
        >
          <div
            dir="rtl"
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: 18,
              width: '100%',
              maxWidth: step === 'review' ? 980 : 620,
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
              <IoSparklesOutline size={19} style={{ color: colors.accent }} />
              <h3 style={{ margin: 0, color: colors.text, fontSize: 16, fontWeight: 800, flex: 1 }}>
                {step === 'review'
                  ? `راجع ما قرأناه (${counted(rows.length, kind)}) قبل الإضافة`
                  : step === 'done'
                    ? 'تمّت الإضافة'
                    : kind === 'restaurant'
                      ? 'قائمتك جاهزة من صفحتك'
                      : 'متجرك جاهز من صفحتك'}
              </h3>
              <button
                type="button"
                onClick={close}
                disabled={step === 'saving'}
                aria-label="إغلاق"
                style={{ background: 'transparent', border: 'none', color: colors.muted, cursor: 'pointer', padding: 4 }}
              >
                <IoCloseOutline size={20} />
              </button>
            </div>

            {/* ===== الاختيار ===== */}
            {step === 'pick' && (
              <>
                <p style={{ color: colors.muted, fontSize: 13, lineHeight: 1.9, margin: '0 0 12px' }}>
                  خذ لقطات شاشة لمنشوراتك على إنستغرام أو فيسبوك (أو صور منتجاتك)، وارفع حتى {MAX_FILES} صورة.
                  نقرأ منها الأسماء والأسعار والمقاسات، ثم تراجعها وتعدّلها — <b style={{ color: colors.text }}>لا يُضاف شيءٌ قبل موافقتك.</b>
                </p>

                <div
                  style={{
                    fontSize: 12,
                    color: blocked ? WARN : colors.muted,
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 9,
                    padding: '7px 10px',
                    marginBottom: 12
                  }}
                >
                  {blocked
                    ? importQuota.period === 'lifetime'
                      ? `استهلكت صورك المجانية (${importQuota.limit}). الخطط المدفوعة تقرأ حتى ${status.limits?.importPaidDaily ?? 100} صورة يومياً.`
                      : 'بلغت حدّ اليوم — يتجدّد غداً.'
                    : quotaLabel(importQuota)}
                </div>

                {!blocked && (
                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      addFiles(e.dataTransfer.files);
                    }}
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      gap: 6,
                      padding: '22px 12px',
                      border: `1.5px dashed ${colors.accent}`,
                      borderRadius: 12,
                      background: colors.surface,
                      color: colors.text,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <IoImagesOutline size={28} style={{ color: colors.accent }} />
                    <b style={{ fontSize: 14 }}>اختر الصور أو اسحبها إلى هنا</b>
                    <span style={{ fontSize: 12, color: colors.muted }}>لقطات شاشة أو صور منتجات — JPG أو PNG</span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPTED.join(',')}
                      multiple
                      hidden
                      onChange={(e) => e.target.files && addFiles(e.target.files)}
                    />
                  </label>
                )}

                {!!sources.length && (
                  <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                    {sources.map((s, i) => (
                      <div
                        key={s.id}
                        style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 8, background: colors.card }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img src={s.preview} alt="" style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 7 }} />
                          <span style={{ flex: 1, color: colors.text, fontSize: 13, minWidth: 0 }}>
                            منشور {i + 1}
                            {s.error && <small style={{ display: 'block', color: WARN }}>{s.error}</small>}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateSource(s.id, { showCaption: !s.showCaption })}
                            style={{ ...btn(colors), minHeight: 30 }}
                          >
                            <IoChatboxEllipsesOutline size={15} />
                            {s.caption ? 'النصّ ✓' : 'ألصق النصّ'}
                          </button>
                          <button
                            type="button"
                            aria-label="إزالة"
                            onClick={() => {
                              URL.revokeObjectURL(s.preview);
                              setSources((prev) => prev.filter((x) => x.id !== s.id));
                            }}
                            style={{ ...btn(colors), minHeight: 30, padding: '0 8px' }}
                          >
                            <IoTrashOutline size={15} />
                          </button>
                        </div>
                        {s.showCaption && (
                          <textarea
                            value={s.caption}
                            onChange={(e) => updateSource(s.id, { caption: e.target.value })}
                            rows={3}
                            placeholder="انسخ نصّ المنشور من إنستغرام أو فيسبوك والصقه هنا — يساعد على قراءة الأسعار والمقاسات"
                            style={{ ...field(colors), marginTop: 8, resize: 'vertical', lineHeight: 1.7 }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 9, marginTop: 16, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={!sources.length || blocked}
                    onClick={readAll}
                    style={{
                      ...btn(colors, 'accent'),
                      minHeight: 42,
                      padding: '0 18px',
                      fontSize: 14,
                      opacity: !sources.length || blocked ? 0.55 : 1
                    }}
                  >
                    <IoSparklesOutline size={17} />
                    {sources.length ? `اقرأ ${postsLabel(sources.length)}` : 'اقرأ المنشورات'}
                  </button>
                  <button type="button" onClick={close} style={{ ...btn(colors), minHeight: 42, padding: '0 15px' }}>
                    إلغاء
                  </button>
                </div>
              </>
            )}

            {/* ===== القراءة ===== */}
            {step === 'reading' && (
              <div style={{ padding: '18px 0' }}>
                <p style={{ color: colors.text, fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>
                  نقرأ منشوراتك… {progress.done} من {progress.total}
                </p>
                <div style={{ height: 8, borderRadius: 99, background: colors.surface, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                      background: colors.accent,
                      transition: 'width .3s'
                    }}
                  />
                </div>
                <p style={{ color: colors.muted, fontSize: 12.5, margin: '10px 0 0', lineHeight: 1.8 }}>
                  كل صورة تأخذ بضع ثوانٍ. أبقِ هذه النافذة مفتوحة.
                </p>
              </div>
            )}

            {/* ===== المراجعة ===== */}
            {(step === 'review' || step === 'saving') && (
              <>
                <p style={{ color: colors.muted, fontSize: 12.5, lineHeight: 1.8, margin: '0 0 12px' }}>
                  صحّح ما يلزم وأزل علامة ما لا تريده. الأسعار بالليرة السورية. لم يُضف شيءٌ بعد.
                </p>
                <datalist id="ai-import-categories">
                  {suggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <div style={{ display: 'grid', gap: 10 }}>
                  {rows.map((r) => {
                    const missing = r.include && (!r.name.trim() || !(Number(r.price) > 0));
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto 84px minmax(0, 1fr)',
                          gap: 10,
                          alignItems: 'start',
                          border: `1px solid ${missing ? WARN : colors.border}`,
                          borderRadius: 12,
                          padding: 10,
                          background: r.include ? colors.card : colors.surface,
                          opacity: r.include ? 1 : 0.6
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={(e) => updateRow(r.id, { include: e.target.checked })}
                          aria-label={`إضافة ${r.name || noun}`}
                          style={{ width: 18, height: 18, accentColor: colors.accent, marginTop: 4 }}
                        />
                        <div style={{ display: 'grid', gap: 5 }}>
                          {r.cropUrl ? (
                            <img
                              src={r.cropUrl}
                              alt=""
                              style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 9, border: `1px solid ${colors.border}` }}
                            />
                          ) : (
                            <div style={{ width: 84, height: 84, borderRadius: 9, background: colors.surface, display: 'grid', placeItems: 'center', color: colors.muted, fontSize: 11 }}>
                              بلا صورة
                            </div>
                          )}
                          {r.cropUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                if (r.cropUrl) URL.revokeObjectURL(r.cropUrl);
                                updateRow(r.id, { crop: null, cropUrl: null });
                              }}
                              style={{ ...btn(colors), minHeight: 26, fontSize: 11, padding: '0 6px' }}
                            >
                              بلا صورة
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'grid', gap: 7, minWidth: 0 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 7 }}>
                            <input
                              value={r.name}
                              onChange={(e) => updateRow(r.id, { name: e.target.value })}
                              placeholder={`اسم ال${noun}`}
                              style={{ ...field(colors), fontWeight: 700 }}
                            />
                            <input
                              value={r.nameEn}
                              onChange={(e) => updateRow(r.id, { nameEn: e.target.value })}
                              placeholder="English name"
                              dir="ltr"
                              style={field(colors)}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                value={r.price ?? ''}
                                onChange={(e) => updateRow(r.id, { price: e.target.value === '' ? null : Number(e.target.value) })}
                                placeholder="السعر"
                                style={{ ...field(colors), borderColor: missing && !(Number(r.price) > 0) ? WARN : colors.border }}
                              />
                              <span style={{ color: colors.muted, fontSize: 12, flexShrink: 0 }}>ل.س</span>
                            </div>
                            <input
                              value={r.category}
                              onChange={(e) => updateRow(r.id, { category: e.target.value })}
                              list="ai-import-categories"
                              placeholder="الفئة"
                              style={field(colors)}
                            />
                          </div>
                          {(r.priceText || r.priceUsd) && (
                            <small style={{ color: colors.muted, fontSize: 11.5 }}>
                              في المنشور: «{r.priceText || `${r.priceUsd}$`}»
                              {r.priceUsd && r.price ? ' — حُوّل إلى الليرة بسعر الصرف الحالي' : ''}
                            </small>
                          )}
                          <textarea
                            value={r.description}
                            onChange={(e) => updateRow(r.id, { description: e.target.value })}
                            rows={2}
                            placeholder="الوصف"
                            style={{ ...field(colors), resize: 'vertical', lineHeight: 1.7 }}
                          />
                          {(r.options.length > 0 || kind === 'store') && (
                            <textarea
                              defaultValue={optionsToText(r.options)}
                              onBlur={(e) => updateRow(r.id, { options: textToOptions(e.target.value) })}
                              rows={Math.max(1, r.options.length)}
                              placeholder="الخيارات، سطرٌ لكل خيار — مثل: المقاس: S، M، L"
                              style={{ ...field(colors), resize: 'vertical', fontSize: 12.5 }}
                            />
                          )}
                          {r.warnings.map((w, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', color: WARN, fontSize: 12 }}>
                              <IoWarningOutline size={14} style={{ flexShrink: 0 }} />
                              <span style={{ flex: 1 }}>{w}</span>
                              {w.includes('الليرة القديمة') && r.price && r.price >= 100 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateRow(r.id, {
                                      price: Math.round((r.price || 0) / 100),
                                      originalPrice: r.originalPrice ? Math.round(r.originalPrice / 100) : null,
                                      warnings: r.warnings.filter((x) => x !== w)
                                    })
                                  }
                                  style={{ ...btn(colors), minHeight: 26, fontSize: 11.5, color: WARN, borderColor: WARN }}
                                >
                                  احذف صفرين
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {sources.some((s) => s.status === 'failed') && (
                  <p style={{ color: WARN, fontSize: 12, marginTop: 10 }}>
                    تعذّرت قراءة {sources.filter((s) => s.status === 'failed').length} صورة ولم تُحتسب من رصيدك.
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: 9,
                    marginTop: 16,
                    flexWrap: 'wrap',
                    position: 'sticky',
                    bottom: -18,
                    background: colors.card,
                    padding: '10px 0'
                  }}
                >
                  <button
                    type="button"
                    disabled={!chosen.length || step === 'saving'}
                    onClick={save}
                    style={{
                      ...btn(colors, 'accent'),
                      minHeight: 42,
                      padding: '0 18px',
                      fontSize: 14,
                      opacity: !chosen.length || step === 'saving' ? 0.55 : 1
                    }}
                  >
                    <IoCheckmarkCircleOutline size={17} />
                    {step === 'saving' ? 'جارٍ الإضافة…' : `أضف ${counted(chosen.length, kind)}`}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    disabled={step === 'saving'}
                    style={{ ...btn(colors), minHeight: 42, padding: '0 15px' }}
                  >
                    تجاهل الكل
                  </button>
                </div>
              </>
            )}

            {/* ===== النتيجة ===== */}
            {step === 'done' && result && (
              <div style={{ paddingTop: 8 }}>
                <p style={{ color: colors.text, fontSize: 14, lineHeight: 1.9 }}>
                  أُضيف {counted(result.created, kind)}
                  {result.newCategories.length ? ` وأُنشئت الفئات: ${result.newCategories.join('، ')}` : ''}.
                  {kind === 'store' && ' المخزون صفر — عدّله من صفحة كل منتج إن كنت تتابعه.'}
                </p>
                {!!result.errors.length && (
                  <div style={{ color: WARN, fontSize: 12.5, lineHeight: 1.8 }}>
                    {result.errors.map((e, i) => (
                      <div key={i}>
                        {e.name || `سطر ${i + 1}`}: {e.message}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={close}
                  style={{ ...btn(colors, 'accent'), minHeight: 42, padding: '0 18px', marginTop: 16 }}
                >
                  تمّ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AiImportTool;
