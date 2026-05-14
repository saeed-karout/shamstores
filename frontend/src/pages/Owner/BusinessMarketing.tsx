// frontend/src/pages/Owner/BusinessMarketing.tsx

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import {
  IoAdd,
  IoCreate,
  IoTrash,
  IoEye,
  IoEyeOff,
  IoImage,
  IoPricetag,
  IoWarning,
  IoArrowBack,
  IoStorefront,
} from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { marketingService } from '../../services/api/index';
import { MarketingSection, MarketingSectionType } from '../../types/marketing';
import MarketingSectionCard from '../../components/marketing/MarketingSectionCard';
import MarketingSectionForm from '../../components/marketing/MarketingSectionForm';
import api from '../../services/api';

// الأقسام المسموح للمالكين بإضافتها (بدون الإعلانات)
const ALLOWED_SECTIONS: { type: MarketingSectionType; title: string; icon: JSX.Element; description: string }[] = [
  {
    type: 'banner',
    title: 'البانرات',
    icon: <IoImage className="w-5 h-5" />,
    description: 'بانرات ترويجية تظهر في أعلى الصفحة'
  },
  {
    type: 'offer',
    title: 'العروض',
    icon: <IoPricetag className="w-5 h-5" />,
    description: 'عروض خاصة وخصومات لجذب العملاء'
  }
];

const BusinessMarketing: React.FC = () => {
  const { user, isRestaurantOwner, isStoreOwner, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<MarketingSection[]>([]);
  const [editingSection, setEditingSection] = useState<MarketingSection | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<MarketingSectionType>('banner');
  const [businessInfo, setBusinessInfo] = useState<{ type: 'restaurant' | 'store'; id: string; name: string } | null>(null);
  const [fetchingBusiness, setFetchingBusiness] = useState(true);

  // جلب بيانات النشاط التجاري من الـ API
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (authLoading) return;
      
      setFetchingBusiness(true);
      try {
        let businessType: 'restaurant' | 'store' = 'store';
        let businessData = null;
        
        // محاولة جلب بيانات المتجر أولاً
        try {
          const storeResponse = await api.get('/store/profile');
          console.log('Store profile:', storeResponse);
          
          let storeData = storeResponse;
          if (storeResponse?.data?.data) {
            storeData = storeResponse.data.data;
          } else if (storeResponse?.data) {
            storeData = storeResponse.data;
          }
          
          if (storeData && storeData.id) {
            businessType = 'store';
            businessData = storeData;
          }
        } catch (storeError) {
          console.log('Not a store or store fetch failed');
        }
        
        // إذا لم يتم العثور على متجر، جرب المطعم
        if (!businessData) {
          try {
            const restaurantResponse = await api.get('/restaurants/profile');
            console.log('Restaurant profile:', restaurantResponse);
            
            let restaurantData = restaurantResponse;
            if (restaurantResponse?.data?.data) {
              restaurantData = restaurantResponse.data.data;
            } else if (restaurantResponse?.data) {
              restaurantData = restaurantResponse.data;
            }
            
            if (restaurantData && restaurantData.id) {
              businessType = 'restaurant';
              businessData = restaurantData;
            }
          } catch (restaurantError) {
            console.log('Not a restaurant or restaurant fetch failed');
          }
        }
        
        if (businessData && businessData.id) {
          setBusinessInfo({
            type: businessType,
            id: businessData.id,
            name: businessData.name
          });
        } else {
          // محاولة الحصول من user object
          if (user?.storeId) {
            setBusinessInfo({
              type: 'store',
              id: user.storeId,
              name: user.name || 'المتجر'
            });
          } else if (user?.restaurantId) {
            setBusinessInfo({
              type: 'restaurant',
              id: user.restaurantId,
              name: user.name || 'المطعم'
            });
          } else {
            toast.error('لم يتم العثور على نشاطك التجاري');
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error fetching business data:', error);
        toast.error('حدث خطأ في جلب بيانات النشاط التجاري');
        navigate('/dashboard');
      } finally {
        setFetchingBusiness(false);
      }
    };
    
    fetchBusinessData();
  }, [user, authLoading, navigate]);

  // جلب بيانات التسويق بعد الحصول على businessInfo
  useEffect(() => {
    if (businessInfo?.id) {
      fetchMarketingData();
    }
  }, [businessInfo]);

  const fetchMarketingData = async () => {
    if (!businessInfo) return;
    
    try {
      setLoading(true);
      const data = await marketingService.getSettings(businessInfo.type, businessInfo.id);
      console.log('Marketing data:', data);
      setSections(data.sections || []);
    } catch (error) {
      console.error('Error fetching marketing data:', error);
      toast.error('حدث خطأ في جلب بيانات التسويق');
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = async (data: any) => {
    if (!businessInfo) return;
    
    try {
      await marketingService.createSection(businessInfo.type, businessInfo.id, data);
      toast.success('تم إنشاء العنصر التسويقي بنجاح');
      await fetchMarketingData();
      setShowForm(false);
      setSelectedType('banner');
    } catch (error: any) {
      console.error('Error creating section:', error);
      toast.error(error?.response?.data?.error || 'حدث خطأ في إنشاء العنصر');
      throw error;
    }
  };

  const handleUpdateSection = async (data: any) => {
    if (!editingSection || !businessInfo) return;
    
    try {
      await marketingService.updateSection(
        editingSection.id,
        businessInfo.type,
        businessInfo.id,
        data
      );
      toast.success('تم تحديث العنصر التسويقي بنجاح');
      await fetchMarketingData();
      setShowForm(false);
      setEditingSection(null);
    } catch (error: any) {
      console.error('Error updating section:', error);
      toast.error(error?.response?.data?.error || 'حدث خطأ في تحديث العنصر');
      throw error;
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!businessInfo) return;
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;

    try {
      await marketingService.deleteSection(sectionId, businessInfo.type, businessInfo.id);
      toast.success('تم حذف العنصر التسويقي بنجاح');
      await fetchMarketingData();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('حدث خطأ في حذف العنصر');
    }
  };

  const handleToggleActive = async (sectionId: string, currentStatus: boolean) => {
    if (!businessInfo) return;
    
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    try {
      await marketingService.updateSection(
        sectionId,
        businessInfo.type,
        businessInfo.id,
        { isActive: !currentStatus }
      );
      toast.success(`تم ${!currentStatus ? 'تفعيل' : 'تعطيل'} العنصر بنجاح`);
      await fetchMarketingData();
    } catch (error) {
      console.error('Error toggling section:', error);
      toast.error('حدث خطأ في تغيير حالة العنصر');
    }
  };

  const getSectionsByType = (type: MarketingSectionType) => {
    return sections.filter(s => s.sectionType === type);
  };

  // حالات التحميل
  if (authLoading || fetchingBusiness) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات المتجر...</p>
        </div>
      </div>
    );
  }

  if (!businessInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <IoWarning className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">لم يتم العثور على نشاط تجاري</h2>
          <p className="text-gray-600 mb-6">
            يبدو أنه لا يوجد لديك متجر أو مطعم. يرجى إنشاء نشاط تجاري أولاً.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            العودة للوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات التسويق...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <IoStorefront className="text-green-500 text-3xl" />
                <h1 className="text-2xl font-bold text-gray-900">إدارة التسويق</h1>
              </div>
              <p className="text-gray-600">
                {businessInfo.name} • أضف بانرات وعروض للترويج لمتجرك وجذب المزيد من العملاء
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IoArrowBack className="w-4 h-4" />
              العودة للوحة التحكم
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <IoWarning className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">📢 ملاحظة مهمة</p>
            <p className="text-blue-700">
              الإعلانات العامة يتم إضافتها بواسطة إدارة المنصة فقط. يمكنك إضافة البانرات والعروض الخاصة بمتجرك.
              البانرات والعروض تظهر للعملاء عند تصفح صفحة متجرك.
            </p>
          </div>
        </div>

        {/* Marketing Sections */}
        <div className="space-y-8">
          {ALLOWED_SECTIONS.map(({ type, title, icon, description }) => {
            const filteredSections = getSectionsByType(type);
            
            return (
              <div key={type} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {icon}
                      <h2 className="text-lg font-bold text-white">{title}</h2>
                      <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                        {filteredSections.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedType(type);
                        setEditingSection(null);
                        setShowForm(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                    >
                      <IoAdd className="w-4 h-4" />
                      <span>إضافة جديد</span>
                    </button>
                  </div>
                  <p className="text-white/80 text-sm mt-1 mr-7">{description}</p>
                </div>

                <div className="p-4">
                  {filteredSections.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-2xl block mb-2">{icon}</span>
                      <p>لا توجد {title} حالياً</p>
                      <button
                        onClick={() => {
                          setSelectedType(type);
                          setEditingSection(null);
                          setShowForm(true);
                        }}
                        className="mt-3 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        أضف أول {title}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredSections.map((section) => (
                        <MarketingSectionCard
                          key={section.id}
                          section={section}
                          onEdit={(section) => {
                            setEditingSection(section);
                            setSelectedType(section.sectionType);
                            setShowForm(true);
                          }}
                          onDelete={handleDeleteSection}
                          onToggleActive={handleToggleActive}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Modal */}
      <MarketingSectionForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingSection(null);
        }}
        onSubmit={editingSection ? handleUpdateSection : handleCreateSection}
        initialData={editingSection || undefined}
        businessType={businessInfo.type}
        businessId={businessInfo.id}
        allowedSectionType={selectedType}
      />
    </div>
  );
};

export default BusinessMarketing;