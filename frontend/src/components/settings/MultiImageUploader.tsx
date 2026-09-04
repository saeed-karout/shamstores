// frontend/src/components/settings/MultiImageUploader.tsx
//
// رافع صور متعددة للمنتج أو الصنف.
//
// يرفع عبر POST /api/upload/multiple القائم أصلاً (يقبل حتى عشرة ملفات
// ويردّ روابط R2)، ويضيف ما لم يكن موجوداً: اختيار متعدد، وسحب وإفلات،
// ومعاينة، وإعادة ترتيب، وتحديد الغلاف.
//
// **الصورة الأولى هي الغلاف** — لا حقل منفصل له. الخادم يشتق الغلاف من
// images[0]، فترتيب المصفوفة هنا هو القرار نفسه، ومربكٌ أن نطلب من التاجر
// ضبط الأمرين.

import { useCallback, useRef, useState } from 'react';
import {
  IoCloudUploadOutline,
  IoTrashOutline,
  IoArrowBack,
  IoArrowForward,
  IoStar,
  IoWarningOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { apiClient } from '@/services/api/client';

/** يطابق MAX_PRODUCT_IMAGES على الخادم */
const MAX_IMAGES = 8;

/** يطابق fileFilter في backend/src/middleware/upload.ts */
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
const MAX_FILE_MB = 8;

interface Props {
  value: string[];
  onChange: (images: string[]) => void;
  /** نوع الكيان — يحدّد مسار التخزين في R2 */
  entityType?: string;
  entityId?: string;
  disabled?: boolean;
  colors: { card: string; surf: string; accent: string; bg: string; text: string; muted: string; border: string; red: string };
}

const MultiImageUploader: React.FC<Props> = ({
  value = [],
  onChange,
  entityType = 'products',
  entityId,
  disabled = false,
  colors: C
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const remaining = MAX_IMAGES - value.length;

  /** يفحص الملفات قبل الشبكة: رفض محلي فوري أرحم من انتظار ردّ الخادم. */
  const validate = (files: File[]): { accepted: File[]; rejected: string[] } => {
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of files) {
      if (!ACCEPTED.includes(file.type)) {
        rejected.push(`${file.name}: صيغة غير مدعومة`);
      } else if (file.size > MAX_FILE_MB * 1024 * 1024) {
        rejected.push(`${file.name}: أكبر من ${MAX_FILE_MB} ميغابايت`);
      } else {
        accepted.push(file);
      }
    }

    return { accepted, rejected };
  };

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (disabled || uploading) return;

      const files = Array.from(fileList);
      if (files.length === 0) return;

      if (remaining <= 0) {
        toast.error(`بلغتَ الحد الأقصى: ${MAX_IMAGES} صور.`);
        return;
      }

      const { accepted, rejected } = validate(files);
      rejected.forEach((message) => toast.error(message));
      if (accepted.length === 0) return;

      // نقتطع الزائد بدل رفض الدفعة كلها — رفع خمس من ست أفضل من صفر
      const toUpload = accepted.slice(0, remaining);
      if (accepted.length > remaining) {
        toast(`سيُرفع ${toUpload.length} فقط — الحد ${MAX_IMAGES} صور.`);
      }

      setUploading(true);
      try {
        const result = await apiClient.uploadMultipleImages(toUpload, entityType, entityId, 'gallery');
        const urls = (result?.images || []).map((image: any) => image.url).filter(Boolean);

        if (urls.length === 0) {
          toast.error('لم يُرفع أي ملف. حاول مجدداً.');
          return;
        }

        onChange([...value, ...urls].slice(0, MAX_IMAGES));
        toast.success(`رُفعت ${urls.length} صورة`);
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'فشل رفع الصور');
      } finally {
        setUploading(false);
        // تفريغ الحقل حتى يمكن إعادة اختيار الملف نفسه بعد حذفه
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [disabled, uploading, remaining, value, onChange, entityType, entityId]
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const makeCover = (index: number) => {
    if (index === 0) return;
    move(index, 0);
    toast.success('صارت صورة الغلاف');
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* منطقة الإفلات */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        aria-label="أضف صوراً للمنتج"
        style={{
          border: `2px dashed ${dragging ? C.accent : C.border}`,
          borderRadius: 14,
          background: dragging ? `${C.accent}12` : C.surf,
          padding: '26px 18px',
          textAlign: 'center',
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          transition: 'border-color 0.15s ease, background 0.15s ease'
        }}
      >
        <IoCloudUploadOutline size={28} style={{ color: C.accent, marginBottom: 8 }} />
        <div style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          {uploading ? 'جارٍ الرفع…' : 'اسحب الصور هنا أو اضغط للاختيار'}
        </div>
        <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.8 }}>
          {value.length} من {MAX_IMAGES} · حتى {MAX_FILE_MB} ميغابايت للصورة · JPG أو PNG أو WEBP
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED.join(',')}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        style={{ display: 'none' }}
        tabIndex={-1}
      />

      {/* تحذير الصورة الواحدة — سبب وجود هذا المكوّن أصلاً */}
      {value.length === 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: C.muted, fontSize: 12.5, lineHeight: 1.8 }}>
          <IoWarningOutline size={15} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />
          <span>صورة واحدة تكفي للعرض، لكن الزبون الذي لا يلمس المنتج يتردّد. أضف زاويتين أو ثلاثاً.</span>
        </div>
      )}

      {/* المعاينات */}
      {value.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 10 }}>
          {value.map((url, index) => (
            <div
              key={url + index}
              style={{
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                background: C.surf,
                border: index === 0 ? `2px solid ${C.accent}` : `1px solid ${C.border}`
              }}
            >
              <img
                src={url}
                alt={index === 0 ? 'صورة الغلاف' : `صورة ${index + 1}`}
                loading="lazy"
                style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
              />

              {index === 0 && (
                <div style={{
                  position: 'absolute', top: 6, insetInlineStart: 6,
                  background: C.accent, color: C.bg, fontSize: 10, fontWeight: 800,
                  padding: '2px 7px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 3
                }}>
                  <IoStar size={10} /> الغلاف
                </div>
              )}

              {!disabled && (
                <div style={{
                  position: 'absolute', bottom: 0, insetInlineStart: 0, insetInlineEnd: 0,
                  display: 'flex', justifyContent: 'center', gap: 3, padding: 5,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)'
                }}>
                  <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0}
                    aria-label="حرّك لليمين" className="btn-inline" style={tinyBtn(index === 0)}>
                    <IoArrowForward size={13} />
                  </button>
                  <button type="button" onClick={() => makeCover(index)} disabled={index === 0}
                    aria-label="اجعلها الغلاف" className="btn-inline" style={tinyBtn(index === 0)}>
                    <IoStar size={13} />
                  </button>
                  <button type="button" onClick={() => move(index, index + 1)} disabled={index === value.length - 1}
                    aria-label="حرّك لليسار" className="btn-inline" style={tinyBtn(index === value.length - 1)}>
                    <IoArrowBack size={13} />
                  </button>
                  <button type="button" onClick={() => remove(index)}
                    aria-label="احذف الصورة" className="btn-inline"
                    style={{ ...tinyBtn(false), color: '#FF8A80' }}>
                    <IoTrashOutline size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const tinyBtn = (isDisabled: boolean): React.CSSProperties => ({
  width: 24,
  height: 24,
  minWidth: 24,
  minHeight: 24,
  padding: 0,
  borderRadius: 6,
  border: 'none',
  background: 'rgba(255,255,255,0.16)',
  color: '#fff',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  opacity: isDisabled ? 0.35 : 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
});

export default MultiImageUploader;
