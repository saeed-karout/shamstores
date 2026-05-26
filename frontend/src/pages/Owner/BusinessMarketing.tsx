// frontend/src/pages/Owner/BusinessMarketing.tsx

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
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
  IoMegaphone,
  IoStatsChart,
  IoCheckmarkCircle,
} from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { marketingService } from '../../services/api/index';
import { MarketingSection, MarketingSectionType } from '../../types/marketing';
import MarketingSectionCard from '../../components/marketing/MarketingSectionCard';
import MarketingSectionForm from '../../components/marketing/MarketingSectionForm';
import api from '../../services/api';

// الأقسام المسموح للمالكين بإضافتها
const ALLOWED_SECTIONS = [
  {
    type: 'banner' as MarketingSectionType,
    title: 'البانرات',
    icon: <IoImage size={20} />,
    description: 'بانرات ترويجية تظهر في أعلى الصفحة لجذب انتباه العملاء',
    color: '#60A5FA'
  },
  {
    type: 'offer' as MarketingSectionType,
    title: 'العروض الخاصة',
    icon: <IoPricetag size={20} />,
    description: 'عروض وخصومات خاصة لجذب العملاء وزيادة المبيعات',
    color: '#C8E235'
  }
];

const BusinessMarketing: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  const dynamicColors = {
    bg: theme.backgroundColor || '#082E24',
    card: theme.cardBgColor || '#112E23',
    surf: theme.surfaceColor || '#0F3D31',
    accent: theme.primaryColor || '#C8E235',
    text: theme.textColor || '#E8F5E9',
    muted: theme.mutedColor || '#9DC4AC',
    border: `rgba(200,226,53,0.15)`,
    blue: '#60A5FA',
  };

  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<MarketingSection[]>([]);
  const [editingSection, setEditingSection] = useState<MarketingSection | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<MarketingSectionType>('banner');
  const [businessInfo, setBusinessInfo] = useState<{ type: 'restaurant' | 'store'; id: string; name: string } | null>(null);
  const [fetchingBusiness, setFetchingBusiness] = useState(true);
  const [stats, setStats] = useState({ totalViews: 0, activeCount: 0, totalCount: 0 });

  // جلب بيانات النشاط التجاري
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (authLoading) return;
      setFetchingBusiness(true);

      try {
        let businessType: 'restaurant' | 'store' = 'store';
        let businessData = null;

        // محاولة جلب بيانات المتجر
        try {
          const storeResponse = await api.get('/store/profile');
          let storeData = storeResponse;
          if (storeResponse?.data?.data) storeData = storeResponse.data.data;
          else if (storeResponse?.data) storeData = storeResponse.data;

          if (storeData && storeData.id) {
            businessType = 'store';
            businessData = storeData;
          }
        } catch (e) {}

        // إذا لم يتم العثور على متجر، جرب المطعم
        if (!businessData) {
          try {
            const restaurantResponse = await api.get('/restaurants/profile');
            let restaurantData = restaurantResponse;
            if (restaurantResponse?.data?.data) restaurantData = restaurantResponse.data.data;
            else if (restaurantResponse?.data) restaurantData = restaurantResponse.data;

            if (restaurantData && restaurantData.id) {
              businessType = 'restaurant';
              businessData = restaurantData;
            }
          } catch (e) {}
        }

        if (businessData?.id) {
          setBusinessInfo({
            type: businessType,
            id: businessData.id,
            name: businessData.name
          });
        } else if (user?.storeId) {
          setBusinessInfo({ type: 'store', id: user.storeId, name: user.name || 'المتجر' });
        } else if (user?.restaurantId) {
          setBusinessInfo({ type: 'restaurant', id: user.restaurantId, name: user.name || 'المطعم' });
        } else {
          toast.error('لم يتم العثور على نشاطك التجاري');
          navigate('/dashboard');
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

  // جلب بيانات التسويق
  useEffect(() => {
    if (businessInfo?.id) fetchMarketingData();
  }, [businessInfo]);

  // frontend/src/pages/Owner/BusinessMarketing.tsx

const fetchMarketingData = async () => {
  if (!businessInfo) return;
  try {
    setLoading(true);
    const response = await marketingService.getSettings(businessInfo.type, businessInfo.id);
    
    // ✅ تصحيح استخراج البيانات - أضف console.log للتحقق
    console.log('📦 Full API Response:', response);
    
    // ✅ استخراج sections بشكل صحيح
    let sectionsData = [];
    
    if (response?.data?.sections) {
      sectionsData = response.data.sections;
    } else if (response?.sections) {
      sectionsData = response.sections;
    } else if (Array.isArray(response)) {
      sectionsData = response;
    } else if (response?.data?.data?.sections) {
      sectionsData = response.data.data.sections;
    }
    
    console.log('✅ Extracted sections:', sectionsData);
    
    setSections(sectionsData);

    const activeCount = sectionsData.filter((s: MarketingSection) => s.isActive).length;
    setStats({
      totalViews: sectionsData.reduce((sum: number, s: MarketingSection) => sum + (s.viewsCount || 0), 0),
      activeCount,
      totalCount: sectionsData.length
    });
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
      await marketingService.updateSection(editingSection.id, businessInfo.type, businessInfo.id, data);
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
    try {
      await marketingService.updateSection(sectionId, businessInfo.type, businessInfo.id, { isActive: !currentStatus });
      toast.success(`تم ${!currentStatus ? 'تفعيل' : 'تعطيل'} العنصر بنجاح`);
      await fetchMarketingData();
    } catch (error) {
      console.error('Error toggling section:', error);
      toast.error('حدث خطأ في تغيير حالة العنصر');
    }
  };

  const getSectionsByType = (type: MarketingSectionType) => sections.filter(s => s.sectionType === type);

  if (authLoading || fetchingBusiness) {
    return (
      <div style={{ minHeight: '100vh', background: dynamicColors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, border: `4px solid ${dynamicColors.accent}`,
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: dynamicColors.muted }}>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!businessInfo) {
    return (
      <div style={{ minHeight: '100vh', background: dynamicColors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 20, padding: 32, maxWidth: 420, textAlign: 'center' }}>
          <IoWarning size={64} style={{ color: '#FBBF24', margin: '0 auto 16px' }} />
          <h2 style={{ color: dynamicColors.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>لم يتم العثور على نشاط تجاري</h2>
          <p style={{ color: dynamicColors.muted, marginBottom: 24 }}>يبدو أنه لا يوجد لديك متجر أو مطعم. يرجى إنشاء نشاط تجاري أولاً.</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ padding: '8px 24px', background: dynamicColors.accent, color: dynamicColors.bg, border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            العودة للوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: dynamicColors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, border: `4px solid ${dynamicColors.accent}`,
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: dynamicColors.muted }}>جاري تحميل بيانات التسويق...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: dynamicColors.bg, fontFamily: 'Cairo, sans-serif', padding: '32px 0' }} dir="rtl">
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <IoMegaphone size={28} style={{ color: dynamicColors.accent }} />
                <h1 style={{ color: dynamicColors.text, fontSize: 28, fontWeight: 800 }}>إدارة التسويق</h1>
              </div>
              <p style={{ color: dynamicColors.muted, fontSize: 14 }}>
                {businessInfo.type === 'store' ? '🛍️' : '🍽️'} {businessInfo.name} • أضف بانرات وعروض للترويج لمتجرك
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                background: dynamicColors.surf, border: `1px solid ${dynamicColors.border}`,
                borderRadius: 12, color: dynamicColors.muted, cursor: 'pointer'
              }}
            >
              <IoArrowBack size={18} /> العودة للوحة التحكم
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, background: `${dynamicColors.accent}20`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoStatsChart size={24} style={{ color: dynamicColors.accent }} />
              </div>
              <div>
                <p style={{ color: dynamicColors.muted, fontSize: 13 }}>إجمالي المشاهدات</p>
                <p style={{ color: dynamicColors.accent, fontSize: 28, fontWeight: 700 }}>{stats.totalViews.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, background: `${dynamicColors.accent}20`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoCheckmarkCircle size={24} style={{ color: dynamicColors.accent }} />
              </div>
              <div>
                <p style={{ color: dynamicColors.muted, fontSize: 13 }}>العروض النشطة</p>
                <p style={{ color: dynamicColors.accent, fontSize: 28, fontWeight: 700 }}>{stats.activeCount} / {stats.totalCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div style={{
          marginBottom: 32, padding: 18, background: `${dynamicColors.blue}10`,
          border: `1px solid ${dynamicColors.blue}30`, borderRadius: 16,
          display: 'flex', alignItems: 'flex-start', gap: 12
        }}>
          <IoWarning size={22} style={{ color: dynamicColors.blue, flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, marginBottom: 4, color: dynamicColors.blue }}>📢 ملاحظة مهمة</p>
            <p style={{ fontSize: 13, color: dynamicColors.muted }}>الإعلانات العامة يتم إضافتها بواسطة إدارة المنصة فقط. يمكنك إضافة البانرات والعروض الخاصة بمتجرك.</p>
          </div>
        </div>

        {/* Marketing Sections */}
        {ALLOWED_SECTIONS.map(({ type, title, icon, description, color }) => {
          const filteredSections = getSectionsByType(type);
          const sectionColor = color || dynamicColors.accent;

          return (
            <div key={type} style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 20, overflow: 'hidden', marginBottom: 32 }}>
              <div style={{ background: `linear-gradient(135deg, ${sectionColor}15, transparent)`, padding: '20px 24px', borderBottom: `1px solid ${dynamicColors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, background: `${sectionColor}20`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {icon}
                    </div>
                    <div>
                      <h2 style={{ color: dynamicColors.text, fontSize: 20, fontWeight: 700 }}>{title}</h2>
                      <p style={{ color: dynamicColors.muted, fontSize: 13 }}>{description}</p>
                    </div>
                    <span style={{ background: `${sectionColor}20`, color: sectionColor, fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>
                      {filteredSections.length} عنصر
                    </span>
                  </div>
                  <button
                    onClick={() => { setSelectedType(type); setEditingSection(null); setShowForm(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: sectionColor, color: dynamicColors.bg, border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <IoAdd size={18} /> إضافة {title.slice(0, -1)}
                  </button>
                </div>
              </div>

              <div style={{ padding: 20 }}>
                {filteredSections.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', background: dynamicColors.surf, borderRadius: 16 }}>
                    <div style={{ width: 64, height: 64, background: `${dynamicColors.accent}10`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      {icon}
                    </div>
                    <p style={{ color: dynamicColors.muted, marginBottom: 16 }}>لا توجد {title} حالياً</p>
                    <button
                      onClick={() => { setSelectedType(type); setEditingSection(null); setShowForm(true); }}
                      style={{ padding: '8px 20px', background: 'transparent', border: `1px solid ${dynamicColors.accent}`, borderRadius: 12, color: dynamicColors.accent, cursor: 'pointer', fontWeight: 500 }}
                    >
                      أضف أول {title.slice(0, -1)}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                    {filteredSections.map((section) => (
                      <MarketingSectionCard
                        key={section.id}
                        section={section}
                        onEdit={(section) => { setEditingSection(section); setSelectedType(section.sectionType); setShowForm(true); }}
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

        {/* Tips Section */}
        <div style={{ marginTop: 40, padding: 24, background: dynamicColors.surf, borderRadius: 20, border: `1px solid ${dynamicColors.border}` }}>
          <h3 style={{ color: dynamicColors.text, fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IoMegaphone size={22} style={{ color: dynamicColors.accent }} /> نصائح لتحسين فعالية عروضك
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{ padding: 12, background: `${dynamicColors.accent}08`, borderRadius: 12 }}>
              <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>🎯</span>
              <h4 style={{ color: dynamicColors.text, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>استهدف الجمهور المناسب</h4>
              <p style={{ color: dynamicColors.muted, fontSize: 12 }}>خصص عروضك لمنتجاتك الأكثر مبيعاً</p>
            </div>
            <div style={{ padding: 12, background: `${dynamicColors.accent}08`, borderRadius: 12 }}>
              <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>📸</span>
              <h4 style={{ color: dynamicColors.text, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>استخدم صوراً جذابة</h4>
              <p style={{ color: dynamicColors.muted, fontSize: 12 }}>الصور عالية الجودة تجذب انتباه العملاء</p>
            </div>
            <div style={{ padding: 12, background: `${dynamicColors.accent}08`, borderRadius: 12 }}>
              <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>⏰</span>
              <h4 style={{ color: dynamicColors.text, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>حدد فترة زمنية للعرض</h4>
              <p style={{ color: dynamicColors.muted, fontSize: 12 }}>العروض محدودة الوقت تخلق إلحاحاً</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <MarketingSectionForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingSection(null); }}
        onSubmit={editingSection ? handleUpdateSection : handleCreateSection}
        initialData={editingSection || undefined}
        businessType={businessInfo.type}
        businessId={businessInfo.id}
        allowedSectionType={selectedType}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BusinessMarketing;