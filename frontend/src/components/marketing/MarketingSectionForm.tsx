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

    // التحقق من حجم الملف (حد أقصى 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
      return;
    }

    // التحقق من نوع الملف
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('نوع الملف غير مدعوم. يرجى رفع صورة من نوع JPG, PNG, أو WEBP');
      return;
    }

    setUploadingImage(true);
    setImageError(null);

    // عرض المعاينة
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // رفع الصورة إلى الخادم
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
    
    // التحقق من وجود صورة
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-2xl text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {initialData ? 'تعديل العنصر التسويقي' : 'إضافة عنصر تسويقي جديد'}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <IoClose className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Section Type - مخفي إذا كان هناك allowedSectionType */}
                {!allowedSectionType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نوع القسم *
                    </label>
                    <select
                      name="sectionType"
                      value={formData.sectionType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <IoImage className="w-4 h-4 inline ml-1" />
                    الصورة *
                  </label>
                  
                  {/* Preview and Upload Area */}
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors">
                    {imagePreview ? (
                      <div className="relative w-full">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <IoTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 text-center">
                        <IoCloudUpload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="image-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                          >
                            <span>رفع صورة</span>
                            <input
                              id="image-upload"
                              name="image-upload"
                              type="file"
                              ref={fileInputRef}
                              className="sr-only"
                              accept="image/jpeg,image/png,image/webp,image/jpg"
                              onChange={handleImageUpload}
                              disabled={uploadingImage}
                            />
                          </label>
                          <p className="pr-1">أو اسحب وأفلت</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, WEBP حتى 5MB
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {uploadingImage && (
                    <div className="mt-2 flex items-center gap-2 text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">جاري رفع الصورة...</span>
                    </div>
                  )}
                  
                  {imageError && (
                    <div className="mt-2 flex items-center gap-2 text-red-600">
                      <IoWarning className="w-4 h-4" />
                      <span className="text-sm">{imageError}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title Arabic */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      العنوان (عربي)
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أدخل العنوان بالعربية"
                    />
                  </div>

                  {/* Title English */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      العنوان (English)
                    </label>
                    <input
                      type="text"
                      name="titleEn"
                      value={formData.titleEn}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter title in English"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Description Arabic */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الوصف (عربي)
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أدخل الوصف بالعربية"
                    />
                  </div>

                  {/* Description English */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الوصف (English)
                    </label>
                    <textarea
                      name="descriptionEn"
                      value={formData.descriptionEn}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter description in English"
                    />
                  </div>
                </div>

                {/* Link URL - الوجهة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <IoLink className="w-4 h-4 inline ml-1" />
                    رابط الوجهة
                  </label>
                  <input
                    type="url"
                    name="linkUrl"
                    value={formData.linkUrl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/product"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    الرابط الذي ينتقل إليه المستخدم عند النقر على البانر (اختياري)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sort Order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ترتيب العرض
                    </label>
                    <input
                      type="number"
                      name="sortOrder"
                      value={formData.sortOrder}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <IoCalendar className="w-4 h-4 inline ml-1" />
                      تاريخ البداية
                    </label>
                    <input
                      type="date"
                      name="startAt"
                      value={formData.startAt}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <IoCalendar className="w-4 h-4 inline ml-1" />
                      تاريخ النهاية
                    </label>
                    <input
                      type="date"
                      name="endAt"
                      value={formData.endAt}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="mr-2 text-sm text-gray-700">
                    مفعل
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading || uploadingImage}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {uploadingImage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري رفع الصورة...
                  </>
                ) : (
                  <>
                    <IoSave className="w-4 h-4" />
                    {loading ? 'جاري الحفظ...' : (initialData ? 'تحديث' : 'إضافة')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MarketingSectionForm;