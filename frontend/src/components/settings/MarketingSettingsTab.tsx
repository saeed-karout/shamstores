import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IoAdd, IoChevronDown, IoChevronUp, IoImage, IoPencil, IoTrash } from 'react-icons/io5';
import api from '@/services/api';
import { getImageUrl } from '@/utils/imageHelpers';

type BusinessType = 'restaurant' | 'store';
type MarketingSectionType = 'announcement' | 'banner' | 'offer';

interface MarketingSection {
  id: string;
  sectionType: MarketingSectionType;
  title?: string | null;
  titleEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  startAt?: string | null;
  endAt?: string | null;
}

interface MarketingResponse {
  sectionOrder: MarketingSectionType[];
  sections: MarketingSection[];
}

interface MarketingSettingsTabProps {
  businessType?: BusinessType;
  businessId?: string;
}

const DEFAULT_SECTION_ORDER: MarketingSectionType[] = ['announcement', 'banner', 'offer'];

const SECTION_LABELS: Record<MarketingSectionType, string> = {
  announcement: 'شريط الإعلانات',
  banner: 'البنرات',
  offer: 'العروض'
};

const SECTION_COLOR: Record<MarketingSectionType, string> = {
  announcement: 'bg-amber-100 text-amber-700',
  banner: 'bg-blue-100 text-blue-700',
  offer: 'bg-emerald-100 text-emerald-700'
};

const toDatetimeLocal = (value?: string | null): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const fromDatetimeLocal = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const MarketingSettingsTab: React.FC<MarketingSettingsTabProps> = ({
  businessType,
  businessId
}) => {
  const canManage = Boolean(businessType && businessId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<MarketingSectionType[]>(DEFAULT_SECTION_ORDER);
  const [sections, setSections] = useState<MarketingSection[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    sectionType: 'announcement' as MarketingSectionType,
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

  const getQueryParams = (): Record<string, string> => {
    if (!businessType || !businessId) {
      return {};
    }
    return { businessType, businessId };
  };

  const resetForm = () => {
    setEditingSectionId(null);
    setFormData({
      sectionType: 'announcement',
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
  };

  const fetchMarketingData = async () => {
    if (!canManage) {
      setSections([]);
      setSectionOrder(DEFAULT_SECTION_ORDER);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = getQueryParams();
      const response = await api.get<MarketingResponse>('/marketing', params);
      setSectionOrder(response.sectionOrder?.length ? response.sectionOrder : DEFAULT_SECTION_ORDER);
      setSections(response.sections || []);
    } catch (error) {
      console.error('Error fetching marketing data:', error);
      toast.error('فشل تحميل أدوات التسويق');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketingData();
  }, [businessType, businessId, canManage]);

  const groupedSections = useMemo(() => {
    const grouped: Record<MarketingSectionType, MarketingSection[]> = {
      announcement: [],
      banner: [],
      offer: []
    };

    sections.forEach((section) => {
      grouped[section.sectionType].push(section);
    });

    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return grouped;
  }, [sections]);

  const updateSectionOrder = async (nextOrder: MarketingSectionType[]) => {
    setSectionOrder(nextOrder);
    setSaving(true);
    try {
      await api.put('/marketing/section-order', {
        sectionOrder: nextOrder,
        ...getQueryParams()
      });
      toast.success('تم حفظ ترتيب الأقسام');
    } catch (error) {
      console.error('Error updating section order:', error);
      toast.error('فشل حفظ ترتيب الأقسام');
      await fetchMarketingData();
    } finally {
      setSaving(false);
    }
  };

  const moveSectionOrder = (type: MarketingSectionType, direction: 'up' | 'down') => {
    const currentIndex = sectionOrder.indexOf(type);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sectionOrder.length) {
      return;
    }

    const nextOrder = [...sectionOrder];
    [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];
    updateSectionOrder(nextOrder);
  };

  const handleUploadImage = async (file?: File) => {
    if (!file) {
      return;
    }

    setSaving(true);
    try {
      const uploadType = formData.sectionType === 'offer' ? 'products' : 'general';
      const uploadResult = await api.upload<{ imageUrl: string }>('/upload', file, uploadType);
      setFormData((prev) => ({ ...prev, imageUrl: uploadResult.imageUrl }));
      toast.success('تم رفع الصورة');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('فشل رفع الصورة');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.title.trim() && !formData.titleEn.trim() && !formData.description.trim() && !formData.descriptionEn.trim()) {
      toast.error('أدخل عنواناً أو وصفاً على الأقل');
      return;
    }

    if (formData.startAt && formData.endAt && new Date(formData.startAt) > new Date(formData.endAt)) {
      toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }

    const payload = {
      sectionType: formData.sectionType,
      title: formData.title,
      titleEn: formData.titleEn,
      description: formData.description,
      descriptionEn: formData.descriptionEn,
      imageUrl: formData.imageUrl || null,
      linkUrl: formData.linkUrl || null,
      isActive: formData.isActive,
      sortOrder: Number(formData.sortOrder) || 0,
      startAt: fromDatetimeLocal(formData.startAt),
      endAt: fromDatetimeLocal(formData.endAt),
      ...getQueryParams()
    };

    setSaving(true);
    try {
      if (editingSectionId) {
        await api.put(`/marketing/sections/${editingSectionId}`, payload);
        toast.success('تم تحديث العنصر التسويقي');
      } else {
        await api.post('/marketing/sections', payload);
        toast.success('تم إضافة العنصر التسويقي');
      }
      resetForm();
      await fetchMarketingData();
    } catch (error) {
      console.error('Error saving marketing section:', error);
      toast.error('فشل حفظ العنصر التسويقي');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSection = (section: MarketingSection) => {
    setEditingSectionId(section.id);
    setFormData({
      sectionType: section.sectionType,
      title: section.title || '',
      titleEn: section.titleEn || '',
      description: section.description || '',
      descriptionEn: section.descriptionEn || '',
      imageUrl: section.imageUrl || '',
      linkUrl: section.linkUrl || '',
      isActive: section.isActive,
      sortOrder: section.sortOrder || 0,
      startAt: toDatetimeLocal(section.startAt),
      endAt: toDatetimeLocal(section.endAt)
    });
  };

  const handleToggleActive = async (section: MarketingSection) => {
    setSaving(true);
    try {
      await api.put(`/marketing/sections/${section.id}`, {
        isActive: !section.isActive,
        ...getQueryParams()
      });
      toast.success(section.isActive ? 'تم إيقاف العنصر' : 'تم تفعيل العنصر');
      await fetchMarketingData();
    } catch (error) {
      console.error('Error toggling section status:', error);
      toast.error('فشل تحديث حالة العنصر');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    setSaving(true);
    try {
      await api.delete(`/marketing/sections/${sectionId}${businessType && businessId ? `?businessType=${businessType}&businessId=${businessId}` : ''}`);
      toast.success('تم حذف العنصر');
      if (editingSectionId === sectionId) {
        resetForm();
      }
      await fetchMarketingData();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('فشل حذف العنصر');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">جاري تحميل أدوات التسويق...</div>;
  }

  if (!canManage) {
    return <div className="text-center py-8 text-red-600">يجب تحديد النشاط التجاري أولاً.</div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="p-4 rounded-xl border bg-gray-50">
        <h3 className="font-semibold text-lg mb-3">ترتيب الأقسام في الصفحة العامة</h3>
        <div className="space-y-2">
          {sectionOrder.map((type, index) => (
            <div key={type} className="flex items-center justify-between bg-white rounded-lg p-3 border">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{index + 1}.</span>
                <span className="font-medium">{SECTION_LABELS[type]}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveSectionOrder(type, 'up')}
                  disabled={index === 0 || saving}
                  className="p-2 rounded border hover:bg-gray-100 disabled:opacity-50"
                >
                  <IoChevronUp />
                </button>
                <button
                  type="button"
                  onClick={() => moveSectionOrder(type, 'down')}
                  disabled={index === sectionOrder.length - 1 || saving}
                  className="p-2 rounded border hover:bg-gray-100 disabled:opacity-50"
                >
                  <IoChevronDown />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 rounded-xl border space-y-4">
        <h3 className="font-semibold text-lg">
          {editingSectionId ? 'تعديل عنصر تسويقي' : 'إضافة عنصر تسويقي جديد'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">نوع القسم</label>
            <select
              value={formData.sectionType}
              onChange={(e) => setFormData((prev) => ({ ...prev, sectionType: e.target.value as MarketingSectionType }))}
              className="w-full p-2 border rounded-lg"
            >
              {DEFAULT_SECTION_ORDER.map((type) => (
                <option key={type} value={type}>
                  {SECTION_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الترتيب داخل القسم</label>
            <input
              type="number"
              min={0}
              value={formData.sortOrder}
              onChange={(e) => setFormData((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">العنوان (عربي)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">العنوان (English)</label>
            <input
              type="text"
              value={formData.titleEn}
              onChange={(e) => setFormData((prev) => ({ ...prev, titleEn: e.target.value }))}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الوصف (عربي)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border rounded-lg"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الوصف (English)</label>
            <textarea
              value={formData.descriptionEn}
              onChange={(e) => setFormData((prev) => ({ ...prev, descriptionEn: e.target.value }))}
              className="w-full p-2 border rounded-lg"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">رابط عند الضغط (اختياري)</label>
            <input
              type="url"
              value={formData.linkUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, linkUrl: e.target.value }))}
              className="w-full p-2 border rounded-lg"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رفع صورة (اختياري)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleUploadImage(e.target.files?.[0])}
              className="w-full p-2 border rounded-lg"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">بداية العرض (اختياري)</label>
            <input
              type="datetime-local"
              value={formData.startAt}
              onChange={(e) => setFormData((prev) => ({ ...prev, startAt: e.target.value }))}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">نهاية العرض (اختياري)</label>
            <input
              type="datetime-local"
              value={formData.endAt}
              onChange={(e) => setFormData((prev) => ({ ...prev, endAt: e.target.value }))}
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>

        {formData.imageUrl && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <img src={getImageUrl(formData.imageUrl)} alt="preview" className="w-full max-h-56 object-cover rounded-lg" />
          </div>
        )}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
          />
          <span>مفعل</span>
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {editingSectionId ? <IoPencil /> : <IoAdd />}
            {editingSectionId ? 'حفظ التعديلات' : 'إضافة العنصر'}
          </button>
          {editingSectionId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>

      <div className="space-y-4">
        {sectionOrder.map((type) => (
          <div key={type} className="border rounded-xl overflow-hidden">
            <div className={`px-4 py-3 font-semibold ${SECTION_COLOR[type]}`}>{SECTION_LABELS[type]}</div>
            <div className="p-4 space-y-3">
              {groupedSections[type].length === 0 ? (
                <p className="text-sm text-gray-500">لا يوجد عناصر في هذا القسم.</p>
              ) : (
                groupedSections[type].map((section) => (
                  <div key={section.id} className="border rounded-lg p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-medium">{section.title || section.titleEn || 'بدون عنوان'}</h4>
                        {(section.description || section.descriptionEn) && (
                          <p className="text-sm text-gray-600 mt-1">{section.description || section.descriptionEn}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">الترتيب: {section.sortOrder}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${section.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {section.isActive ? 'مفعل' : 'متوقف'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEditSection(section)}
                          className="p-2 border rounded hover:bg-gray-50"
                          title="تعديل"
                        >
                          <IoPencil />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(section)}
                          className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                        >
                          {section.isActive ? 'إيقاف' : 'تفعيل'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(section.id)}
                          className="p-2 border border-red-200 text-red-600 rounded hover:bg-red-50"
                          title="حذف"
                        >
                          <IoTrash />
                        </button>
                      </div>
                    </div>
                    {section.imageUrl && (
                      <div className="mt-3">
                        <img
                          src={getImageUrl(section.imageUrl)}
                          alt={section.title || 'section-image'}
                          className="w-full max-h-44 object-cover rounded"
                        />
                      </div>
                    )}
                    {(section.startAt || section.endAt) && (
                      <p className="text-xs text-gray-500 mt-2">
                        {section.startAt ? `من: ${new Date(section.startAt).toLocaleString('ar')}` : 'من: الآن'}{' '}
                        | {section.endAt ? `إلى: ${new Date(section.endAt).toLocaleString('ar')}` : 'إلى: غير محدد'}
                      </p>
                    )}
                    {section.linkUrl && (
                      <a
                        href={section.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                      >
                        <IoImage />
                        فتح الرابط
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketingSettingsTab;
