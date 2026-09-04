// frontend/src/components/common/ImageUploadField.tsx
//
// حقل صورة يرفع الملف فعلاً بدل مطالبة المستخدم بلصق رابط.
//
// طلب «رابط الصورة» من مسؤول يفتح صورة على جهازه يعني أن يرفعها أولاً إلى
// خدمة أخرى ثم ينسخ الرابط — خطوتان خارج المنتج، ورابط قد ينكسر لاحقاً لأن
// مصدره ليس تحت سيطرتنا. الرفع هنا يذهب إلى R2 ويعيد رابطاً دائماً.
//
// لصق الرابط يبقى متاحاً لمن لديه صورة مستضافة أصلاً — لكنه لم يعد الطريق
// الوحيد ولا الافتراضي.

import { useCallback, useRef, useState } from 'react';
import { IoCloudUploadOutline, IoTrashOutline, IoLinkOutline, IoImageOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import uploadService from '@/services/api/upload.service';
import { getImageUrl } from '@/utils/imageHelpers';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
  /** وجهة التخزين — تحدّد مجلد الصورة في R2 */
  uploadType?: string;
  entityId?: string;
  subType?: string;
  /** نسبة العرض إلى الارتفاع في المعاينة */
  previewAspect?: string;
  hint?: string;
}

/** نفس ما يقبله الخادم في middleware/upload.ts — نمنع الرفض قبل الشبكة */
const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,image/avif';
const MAX_BYTES = 8 * 1024 * 1024;

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value,
  onChange,
  label = 'الصورة',
  required = false,
  uploadType = 'misc',
  entityId,
  subType = 'gallery',
  previewAspect = '16 / 9',
  hint
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      // الفحص محلياً قبل الشبكة: رفع 20 ميغابايت ثم رفضها إهدار لوقت المستخدم
      if (!ACCEPTED.split(',').includes(file.type)) {
        toast.error('صيغة غير مدعومة. المسموح: JPG أو PNG أو GIF أو WEBP أو AVIF.');
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`حجم الصورة ${(file.size / 1024 / 1024).toFixed(1)} ميغابايت — الحد الأقصى 8.`);
        return;
      }

      setUploading(true);
      try {
        const result = await uploadService.uploadImage(file, {
          type: uploadType,
          id: entityId,
          subType
        });
        if (!result?.imageUrl) throw new Error('استجابة بلا رابط');
        onChange(result.imageUrl);
        toast.success('تم رفع الصورة');
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('تعذّر رفع الصورة. تحقّق من اتصالك وحاول مجدداً.');
      } finally {
        setUploading(false);
        // تفريغ الحقل حتى يعمل اختيار نفس الملف مرة أخرى بعد الحذف
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onChange, uploadType, entityId, subType]
  );

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div>
      {label && (
        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />

      {value ? (
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(200,226,53,0.2)' }}>
          <img
            src={getImageUrl(value)}
            alt="معاينة الصورة المرفوعة"
            style={{ width: '100%', aspectRatio: previewAspect, objectFit: 'cover', display: 'block' }}
          />
          <div style={{ display: 'flex', gap: 8, padding: 8, background: 'rgba(0,0,0,0.35)' }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ ...smallBtn, background: 'rgba(255,255,255,0.16)', color: '#fff' }}
            >
              <IoCloudUploadOutline size={15} />
              {uploading ? 'جارٍ الرفع…' : 'استبدال'}
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="حذف الصورة"
              style={{ ...smallBtn, background: 'rgba(239,68,68,0.85)', color: '#fff' }}
            >
              <IoTrashOutline size={15} />
              حذف
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          aria-label="اختر صورة للرفع"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '30px 16px',
            borderRadius: 12,
            border: `2px dashed ${dragging ? '#C8E235' : 'rgba(200,226,53,0.3)'}`,
            background: dragging ? 'rgba(200,226,53,0.08)' : 'transparent',
            cursor: uploading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          {uploading ? (
            <>
              <IoImageOutline size={26} style={{ color: '#C8E235' }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>جارٍ الرفع…</div>
            </>
          ) : (
            <>
              <IoCloudUploadOutline size={26} style={{ color: '#C8E235' }} />
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>اسحب الصورة هنا أو اضغط للاختيار</div>
              <div style={{ fontSize: 11.5, opacity: 0.7 }}>
                {hint || 'JPG أو PNG أو WEBP — حتى 8 ميغابايت'}
              </div>
            </>
          )}
        </div>
      )}

      {/* لصق رابط: يبقى متاحاً لمن لديه صورة مستضافة، لكنه لم يعد الطريق الوحيد */}
      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={() => setShowUrlInput((open) => !open)}
          aria-expanded={showUrlInput}
          className="btn-inline"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, opacity: 0.75, fontFamily: 'inherit', color: 'inherit'
          }}
        >
          <IoLinkOutline size={14} />
          {showUrlInput ? 'إخفاء إدخال الرابط' : 'أو الصق رابط صورة'}
        </button>

        {showUrlInput && (
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            dir="ltr"
            style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8, fontSize: 13 }}
          />
        )}
      </div>
    </div>
  );
};

const smallBtn: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  padding: '8px 10px',
  minHeight: 36,
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: 'inherit'
};

export default ImageUploadField;
