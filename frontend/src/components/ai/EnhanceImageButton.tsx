// frontend/src/components/ai/EnhanceImageButton.tsx
//
// «حسّن الصورة» — قصٌّ مربّع وسطوعٌ وتباينٌ وتوازن أبيض، في المتصفّح.
//
// صور المتاجر الصغيرة تُلتقط بالهاتف تحت إنارة المحلّ: صفراء ومعتمة وغير
// مربّعة، فتُقصّ في بطاقة المتجر ويضيع نصف المنتج. التحسين هنا مأمون ولا
// يحتاج خادماً ولا حصّة — ويُعرض قبل/بعد فلا يُستبدل شيءٌ بلا موافقة.

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { IoColorWandOutline, IoCloseOutline } from 'react-icons/io5';
import { enhanceImage, loadBitmap, loadBitmapFromUrl, blobToFile, type EnhanceResult } from '@/utils/imageTools';
import { getImageUrl } from '@/utils/imageHelpers';

interface Props {
  /** الصورة الحالية (الغلاف) — إن غابت أو منعها CORS يُطلب ملفٌّ من الجهاز */
  imageUrl?: string | null;
  /** يرفع الملفّ المحسَّن ويضعه مكان الأصل — مسؤولية الصفحة */
  onEnhanced: (file: File) => Promise<void>;
  colors: { text: string; muted: string; accent: string; border: string; card: string; bg: string };
}

const EnhanceImageButton: React.FC<Props> = ({ imageUrl, onEnhanced, colors }) => {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ before: string; after: EnhanceResult; revokeBefore: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const closePreview = () => {
    if (preview) {
      URL.revokeObjectURL(preview.after.previewUrl);
      if (preview.revokeBefore) URL.revokeObjectURL(preview.before);
    }
    setPreview(null);
  };

  const fromFile = async (file: File) => {
    setBusy(true);
    try {
      const bitmap = await loadBitmap(file);
      const after = await enhanceImage(bitmap);
      setPreview({ before: URL.createObjectURL(file), after, revokeBefore: true });
    } catch {
      toast.error('تعذّرت معالجة هذه الصورة');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const start = async () => {
    if (!imageUrl) {
      fileRef.current?.click();
      return;
    }
    setBusy(true);
    try {
      const url = getImageUrl(imageUrl);
      const bitmap = await loadBitmapFromUrl(url);
      const after = await enhanceImage(bitmap);
      setPreview({ before: url, after, revokeBefore: false });
    } catch {
      // مخزن الصور لا يسمح بقراءتها من المتصفّح — الملف الأصلي على الهاتف يكفي
      toast('اختر الصورة من جهازك لتحسينها');
      fileRef.current?.click();
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await onEnhanced(blobToFile(preview.after.blob, 'enhanced'));
      toast.success('استُبدلت الصورة بالمحسّنة');
      closePreview();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر رفع الصورة المحسّنة');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 32,
          padding: '0 11px',
          borderRadius: 9,
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: colors.text,
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'pointer',
          opacity: busy ? 0.6 : 1
        }}
        title="قصٌّ مربّع وتصحيح السطوع والألوان"
      >
        <IoColorWandOutline size={15} />
        {busy && !preview ? 'يعالج…' : 'حسّن الصورة'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) fromFile(file);
        }}
      />

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="معاينة الصورة المحسّنة"
          style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.62)', display: 'grid', placeItems: 'center', padding: 12 }}
          onClick={(e) => e.target === e.currentTarget && !busy && closePreview()}
        >
          <div dir="rtl" style={{ background: colors.card, borderRadius: 16, padding: 16, width: '100%', maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <b style={{ flex: 1, color: colors.text, fontSize: 15 }}>قبل وبعد</b>
              <button
                type="button"
                onClick={closePreview}
                disabled={busy}
                aria-label="إغلاق"
                style={{ background: 'transparent', border: 'none', color: colors.muted, cursor: 'pointer' }}
              >
                <IoCloseOutline size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { src: preview.before, label: 'الأصلية', fit: 'contain' as const },
                { src: preview.after.previewUrl, label: 'المحسّنة', fit: 'cover' as const }
              ].map((p) => (
                <figure key={p.label} style={{ margin: 0 }}>
                  <img
                    src={p.src}
                    alt={p.label}
                    style={{ width: '100%', aspectRatio: '1', objectFit: p.fit, borderRadius: 10, background: '#eee' }}
                  />
                  <figcaption style={{ textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 5 }}>{p.label}</figcaption>
                </figure>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
              <button
                type="button"
                onClick={apply}
                disabled={busy}
                style={{
                  flex: 1,
                  minHeight: 40,
                  borderRadius: 10,
                  border: 'none',
                  background: colors.accent,
                  color: colors.bg,
                  fontWeight: 800,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  opacity: busy ? 0.6 : 1
                }}
              >
                {busy ? 'يرفع…' : 'استعمل المحسّنة'}
              </button>
              <button
                type="button"
                onClick={closePreview}
                disabled={busy}
                style={{ minHeight: 40, padding: '0 16px', borderRadius: 10, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.muted, fontFamily: 'inherit', cursor: 'pointer' }}
              >
                أبقِ الأصلية
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnhanceImageButton;
