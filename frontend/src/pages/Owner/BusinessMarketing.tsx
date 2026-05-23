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

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', orange: '#FB923C',
};

// الأقسام المسموح للمالكين بإضافتها (بدون الإعلانات)
const ALLOWED_SECTIONS: { type: MarketingSectionType; title: string; icon: JSX.Element; description: string }[] = [
  {
    type: 'banner',
    title: 'البانرات',
    icon: <IoImage style={{ width: 20, height: 20 }} />,
    description: 'بانرات ترويجية تظهر في أعلى الصفحة'
  },
  {
    type: 'offer',
    title: 'العروض',
    icon: <IoPricetag style={{ width: 20, height: 20 }} />,
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
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, border: `4px solid ${C.accent}`,
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: C.muted }}>جاري تحميل بيانات المتجر...</p>
        </div>
      </div>
    );
  }

  if (!businessInfo) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, maxWidth: 420, textAlign: 'center' }}>
          <IoWarning style={{ width: 64, height: 64, color: '#FBBF24', display: 'block', margin: '0 auto 16px' }} />
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>لم يتم العثور على نشاط تجاري</h2>
          <p style={{ color: C.muted, marginBottom: 24 }}>
            يبدو أنه لا يوجد لديك متجر أو مطعم. يرجى إنشاء نشاط تجاري أولاً.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 24px', background: C.accent, color: C.bg,
              border: 'none', borderRadius: 12, fontWeight: 600,
              fontFamily: 'Cairo, sans-serif', cursor: 'pointer'
            }}
          >
            العودة للوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, border: `4px solid ${C.accent}`,
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: C.muted }}>جاري تحميل بيانات التسويق...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Cairo, sans-serif', padding: '32px 0' }} dir="rtl">
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <IoStorefront style={{ color: C.accent, fontSize: 28 }} />
                <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700 }}>إدارة التسويق</h1>
              </div>
              <p style={{ color: C.muted }}>
                {businessInfo.name} • أضف بانرات وعروض للترويج لمتجرك وجذب المزيد من العملاء
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', background: C.surf,
                border: `1px solid ${C.border}`, borderRadius: 12,
                color: C.muted, fontFamily: 'Cairo, sans-serif', cursor: 'pointer'
              }}
            >
              <IoArrowBack style={{ width: 16, height: 16 }} />
              العودة للوحة التحكم
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div style={{
          marginBottom: 24, padding: 16, background: 'rgba(96,165,250,0.08)',
          border: '1px solid rgba(96,165,250,0.2)', borderRadius: 12,
          display: 'flex', alignItems: 'flex-start', gap: 12
        }}>
          <IoWarning style={{ width: 20, height: 20, color: C.blue, flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 14, color: C.blue }}>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>📢 ملاحظة مهمة</p>
            <p style={{ color: C.muted }}>
              الإعلانات العامة يتم إضافتها بواسطة إدارة المنصة فقط. يمكنك إضافة البانرات والعروض الخاصة بمتجرك.
              البانرات والعروض تظهر للعملاء عند تصفح صفحة متجرك.
            </p>
          </div>
        </div>

        {/* Marketing Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {ALLOWED_SECTIONS.map(({ type, title, icon, description }) => {
            const filteredSections = getSectionsByType(type);

            return (
              <div key={type} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
                {/* Section header */}
                <div style={{ background: C.surf, padding: '16px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: C.accent }}>{icon}</span>
                      <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>{title}</h2>
                      <span style={{
                        background: 'rgba(200,226,53,0.15)', color: C.accent,
                        fontSize: 12, padding: '2px 8px', borderRadius: 20
                      }}>
                        {filteredSections.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedType(type);
                        setEditingSection(null);
                        setShowForm(true);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', background: C.accent, color: C.bg,
                        border: 'none', borderRadius: 10, fontFamily: 'Cairo, sans-serif',
                        fontWeight: 600, fontSize: 14, cursor: 'pointer'
                      }}
                    >
                      <IoAdd style={{ width: 16, height: 16 }} />
                      <span>إضافة جديد</span>
                    </button>
                  </div>
                  <p style={{ color: C.muted, fontSize: 14, marginTop: 4, marginRight: 28 }}>{description}</p>
                </div>

                <div style={{ padding: 16 }}>
                  {filteredSections.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted }}>
                      <span style={{ fontSize: 28, display: 'block', marginBottom: 8, color: C.accent }}>{icon}</span>
                      <p>لا توجد {title} حالياً</p>
                      <button
                        onClick={() => {
                          setSelectedType(type);
                          setEditingSection(null);
                          setShowForm(true);
                        }}
                        style={{
                          marginTop: 12, padding: '8px 16px', background: 'transparent',
                          border: `1px solid ${C.accent}`, borderRadius: 12, color: C.accent,
                          fontFamily: 'Cairo, sans-serif', cursor: 'pointer'
                        }}
                      >
                        أضف أول {title}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
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
