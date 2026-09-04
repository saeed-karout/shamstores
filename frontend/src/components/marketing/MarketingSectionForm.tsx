// frontend/src/components/marketing/MarketingSectionForm.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  IoClose,
  IoImage,
  IoLink,
  IoCalendar,
  IoSave,
  IoMegaphone,
  IoImageOutline,
  IoPricetagOutline,
  IoCloudUpload,
  IoTrash,
  IoCloudDone,
  IoWarning,
} from 'react-icons/io5';
import { MarketingSection, MarketingSectionType } from '../../types/marketing';
import { uploadService } from '../../services/api/upload.service';
import { useTheme } from '@/context/ThemeContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: MarketingSection;
  businessType: 'restaurant' | 'store';
  businessId: string;
  isAdminOnly?: boolean;
  allowedSectionType?: MarketingSectionType;
}

const sectionTypes: { value: MarketingSectionType; label: string; icon: JSX.Element }[] = [
  { value: 'announcement', label: '📢 إعلان', icon: <IoMegaphone className="w-4 h-4" /> },
  { value: 'banner', label: '🎨 بانر', icon: <IoImageOutline className="w-4 h-4" /> },
  { value: 'offer', label: '🏷️ عرض', icon: <IoPricetagOutline className="w-4 h-4" /> }
];

const MarketingSectionForm: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  businessType,
  businessId,
  allowedSectionType
}) => {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  
  // ✅ ألوان المودال باستخدام ThemeContext
  const colors = {
    bg: theme.backgroundColor || '#082E24',
    card: theme.cardBgColor || '#112E23',
    surf: theme.surfaceColor || '#0F3D31',
    accent: theme.primaryColor || '#3B82F6',
    text: theme.textColor || '#E8F5E9',
    muted: theme.mutedColor || '#9DC4AC',
    border: `rgba(200,226,53,0.15)`,
    red: '#FF6B6B',
    blue: '#60A5FA',
  };
  
  const [formData, setFormData] = useState({
    sectionType: (allowedSectionType || 'announcement') as MarketingSectionType,
    title: '',
    titleEn: '',
    description: '',
    descriptionEn: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
    sortOrder: 0,
    startAt: '',
    endAt: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        sectionType: initialData.sectionType,
        title: initialData.title || '',
        titleEn: initialData.titleEn || '',
        description: initialData.description || '',
        descriptionEn: initialData.descriptionEn || '',
        imageUrl: initialData.imageUrl || '',
        linkUrl: initialData.linkUrl || '',
        isActive: initialData.isActive,
        sortOrder: initialData.sortOrder,
        startAt: initialData.startAt ? initialData.startAt.split('T')[0] : '',
        endAt: initialData.endAt ? initialData.endAt.split('T')[0] : ''
      });
      setImagePreview(initialData.imageUrl);
    } else {
      setFormData({
        sectionType: allowedSectionType || 'announcement',
        title: '',
        titleEn: '',
        description: '',
        descriptionEn: '',
        imageUrl: '',
        linkUrl: '',
        isActive: true,
        sortOrder: 0,
        startAt: '',
        endAt: ''
      });
      setImagePreview(null);
    }
    setImageError(null);
  }, [initialData, allowedSectionType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setImageError('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('نوع الملف غير مدعوم. يرجى رفع صورة من نوع JPG, PNG, أو WEBP');
      return;
    }

    setUploadingImage(true);
    setImageError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const uploadType = businessType === 'restaurant' ? 'restaurant' : 'store';
      const response = await uploadService.uploadImage(file, `marketing_${uploadType}`);
      
      if (response && response.imageUrl) {
        setFormData(prev => ({ ...prev, imageUrl: response.imageUrl }));
        toast.success('تم رفع الصورة بنجاح');
      } else {
        throw new Error('فشل رفع الصورة');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setImageError('حدث خطأ في رفع الصورة. يرجى المحاولة مرة أخرى.');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.imageUrl && !initialData?.imageUrl) {
      toast.error('الرجاء رفع صورة للعنصر التسويقي');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        startAt: formData.startAt || null,
        endAt: formData.endAt || null,
        sortOrder: Number(formData.sortOrder)
      };
      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // ✅ Styles مخصصة باستخدام ألوان ThemeContext
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    overflowY: 'auto'
  };

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    transition: 'opacity 0.2s'
  };

  const modalStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '1rem',
    position: 'relative',
    zIndex: 51
  };

  const containerStyle: React.CSSProperties = {
    background: colors.card,
    borderRadius: '1rem',
    width: '100%',
    maxWidth: '50rem',
    maxHeight: '95vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    border: `1px solid ${colors.border}`
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: `1px solid ${colors.border}`
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.text,
    margin: 0
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: colors.muted,
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.5rem',
    transition: 'all 0.2s'
  };

  const bodyStyle: React.CSSProperties = {
    padding: '1.5rem',
    overflowY: 'auto',
    flex: 1
  };

  const footerStyle: React.CSSProperties = {
    padding: '1rem 1.5rem',
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    background: colors.surf
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.muted,
    marginBottom: '0.5rem'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    background: colors.surf,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.5rem',
    color: colors.text,
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.2s'
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: 'vertical'
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const uploadAreaStyle: React.CSSProperties = {
    marginTop: '0.25rem',
    display: 'flex',
    justifyContent: 'center',
    padding: '1.25rem 1.5rem',
    border: `2px dashed ${colors.border}`,
    borderRadius: '0.5rem',
    transition: 'all 0.2s',
    background: colors.surf
  };

  const uploadContentStyle: React.CSSProperties = {
    textAlign: 'center'
  };

  const uploadIconStyle: React.CSSProperties = {
    width: '3rem',
    height: '3rem',
    margin: '0 auto',
    color: colors.muted
  };

  const uploadTextStyle: React.CSSProperties = {
    color: colors.muted,
    fontSize: '0.875rem'
  };

  const uploadLinkStyle: React.CSSProperties = {
    color: colors.accent,
    cursor: 'pointer',
    fontWeight: 500,
    background: 'transparent',
    border: 'none',
    padding: 0,
    fontSize: '0.875rem'
  };

  const previewContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%'
  };

  const previewImageStyle: React.CSSProperties = {
    width: '100%',
    height: '12rem',
    objectFit: 'cover',
    borderRadius: '0.5rem'
  };

  const removeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    padding: '0.25rem',
    background: colors.red,
    color: '#fff',
    border: 'none',
    borderRadius: '9999px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  };

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const checkboxStyle: React.CSSProperties = {
    width: '1rem',
    height: '1rem',
    accentColor: colors.accent
  };

  const checkboxLabelStyle: React.CSSProperties = {
    color: colors.text,
    fontSize: '0.875rem'
  };

  const errorStyle: React.CSSProperties = {
    marginTop: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: colors.red,
    fontSize: '0.75rem'
  };

  const loadingSpinnerStyle: React.CSSProperties = {
    width: '1rem',
    height: '1rem',
    border: `2px solid ${colors.accent}`,
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  };

  const cancelBtnStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: colors.muted,
    border: `1px solid ${colors.border}`,
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const submitBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: colors.accent,
    color: colors.bg,
    border: 'none',
    borderRadius: '0.5rem',
    cursor: loading || uploadingImage ? 'not-allowed' : 'pointer',
    opacity: loading || uploadingImage ? 0.6 : 1,
    transition: 'all 0.2s'
  };

  return (
    <div style={overlayStyle}>
      <div style={backdropStyle} onClick={onClose} />
      <div style={modalStyle}>
        <div style={containerStyle}>
          <form onSubmit={handleSubmit}>
            <div style={headerStyle}>
              <h3 style={titleStyle}>
                {initialData ? 'تعديل العنصر التسويقي' : 'إضافة عنصر تسويقي جديد'}
              </h3>
              <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="إغلاق">
                <IoClose size={20} />
              </button>
            </div>

            <div style={bodyStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Section Type */}
                {!allowedSectionType && (
                  <div>
                    <label style={labelStyle}>نوع القسم *</label>
                    <select
                      name="sectionType"
                      value={formData.sectionType}
                      onChange={handleChange}
                      style={selectStyle}
                      required
                    >
                      {sectionTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Image Upload */}
                <div>
                  <label style={labelStyle}>
                    <IoImage style={{ display: 'inline', marginLeft: '0.25rem' }} size={14} />
                    الصورة *
                  </label>
                  
                  <div style={uploadAreaStyle}>
                    {imagePreview ? (
                      <div style={previewContainerStyle}>
                        <img src={imagePreview} alt="Preview" style={previewImageStyle} />
                        <button type="button" onClick={handleRemoveImage} style={removeBtnStyle} aria-label="حذف الصورة">
                          <IoTrash size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={uploadContentStyle}>
                        <IoCloudUpload style={uploadIconStyle} />
                        <div style={uploadTextStyle}>
                          <label htmlFor="image-upload" style={{ cursor: 'pointer' }}>
                            <span style={uploadLinkStyle}>رفع صورة</span>
                            <input
                              id="image-upload"
                              name="image-upload"
                              type="file"
                              ref={fileInputRef}
                              style={{ display: 'none' }}
                              accept="image/jpeg,image/png,image/webp,image/jpg"
                              onChange={handleImageUpload}
                              disabled={uploadingImage}
                            />
                          </label>
                          <span> أو اسحب وأفلت</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: colors.muted, marginTop: '0.5rem' }}>
                          PNG, JPG, WEBP حتى 5MB
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {uploadingImage && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: colors.accent }}>
                      <div style={loadingSpinnerStyle} />
                      <span style={{ fontSize: '0.75rem' }}>جاري رفع الصورة...</span>
                    </div>
                  )}
                  
                  {imageError && (
                    <div style={errorStyle}>
                      <IoWarning size={14} />
                      <span>{imageError}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>العنوان (عربي)</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      style={inputStyle}
                      placeholder="أدخل العنوان بالعربية"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>العنوان (English)</label>
                    <input
                      type="text"
                      name="titleEn"
                      value={formData.titleEn}
                      onChange={handleChange}
                      style={inputStyle}
                      placeholder="Enter title in English"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>الوصف (عربي)</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      style={textareaStyle}
                      placeholder="أدخل الوصف بالعربية"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>الوصف (English)</label>
                    <textarea
                      name="descriptionEn"
                      value={formData.descriptionEn}
                      onChange={handleChange}
                      rows={3}
                      style={textareaStyle}
                      placeholder="Enter description in English"
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    <IoLink style={{ display: 'inline', marginLeft: '0.25rem' }} size={14} />
                    رابط الوجهة
                  </label>
                  <input
                    type="url"
                    name="linkUrl"
                    value={formData.linkUrl}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="https://example.com/product"
                  />
                  <p style={{ fontSize: '0.75rem', color: colors.muted, marginTop: '0.25rem' }}>
                    الرابط الذي ينتقل إليه المستخدم عند النقر على البانر (اختياري)
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>ترتيب العرض</label>
                    <input
                      type="number"
                      name="sortOrder"
                      value={formData.sortOrder}
                      onChange={handleChange}
                      style={inputStyle}
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      <IoCalendar style={{ display: 'inline', marginLeft: '0.25rem' }} size={14} />
                      تاريخ البداية
                    </label>
                    <input
                      type="date"
                      name="startAt"
                      value={formData.startAt}
                      onChange={handleChange}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      <IoCalendar style={{ display: 'inline', marginLeft: '0.25rem' }} size={14} />
                      تاريخ النهاية
                    </label>
                    <input
                      type="date"
                      name="endAt"
                      value={formData.endAt}
                      onChange={handleChange}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={checkboxContainerStyle}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    style={checkboxStyle}
                  />
                  <label style={checkboxLabelStyle}>مفعل</label>
                </div>
              </div>
            </div>

            <div style={footerStyle}>
              <button type="button" onClick={onClose} style={cancelBtnStyle}>
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading || uploadingImage}
                style={submitBtnStyle}
              >
                {uploadingImage ? (
                  <>
                    <div style={loadingSpinnerStyle} />
                    جاري رفع الصورة...
                  </>
                ) : (
                  <>
                    <IoSave size={14} />
                    {loading ? 'جاري الحفظ...' : (initialData ? 'تحديث' : 'إضافة')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MarketingSectionForm;