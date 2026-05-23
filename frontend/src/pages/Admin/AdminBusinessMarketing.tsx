// frontend/src/pages/Admin/AdminBusinessMarketing.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  IoArrowBack,
  IoSwapVertical,
  IoAdd,
  IoCreate,
  IoTrash,
  IoEye,
  IoEyeOff,
  IoCalendar,
  IoLink,
  IoImage,
  IoClose,
  IoMegaphone,
  IoRocket,
  IoPricetag,
  IoGrid,
  IoWarning,
} from 'react-icons/io5';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd';

import { marketingService } from '../../services/api/index';
import {
  MarketingSection,
  MarketingSectionType,
  MarketingSettings,
  ADMIN_ONLY_SECTIONS,
  BUSINESS_SECTIONS
} from '../../types/marketing';
import MarketingSectionList from '../../components/marketing/MarketingSectionList';
import MarketingSectionForm from '../../components/marketing/MarketingSectionForm';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

const sectionTypeNames: Record<MarketingSectionType, { title: string; icon: JSX.Element; description: string }> = {
  announcement: {
    title: 'الإعلانات',
    icon: <IoMegaphone style={{ width: 20, height: 20 }} />,
    description: 'إعلانات عامة من المنصة - يضيفها المدير فقط'
  },
  banner: {
    title: 'البانرات',
    icon: <IoImage style={{ width: 20, height: 20 }} />,
    description: 'بانرات ترويجية للمتجر/المطعم'
  },
  offer: {
    title: 'العروض',
    icon: <IoPricetag style={{ width: 20, height: 20 }} />,
    description: 'عروض خاصة وخصومات'
  }
};

const AdminBusinessMarketing: React.FC = () => {
  const { type, id } = useParams<{ type: 'restaurant' | 'store'; id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<MarketingSettings | null>(null);
  const [sectionOrder, setSectionOrder] = useState<MarketingSectionType[]>(['announcement', 'banner', 'offer']);
  const [editingSection, setEditingSection] = useState<MarketingSection | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<MarketingSectionType | null>(null);

  useEffect(() => {
    if (!type || !id) {
      navigate('/admin');
      return;
    }
    fetchData();
  }, [type, id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await marketingService.getSettings(type!, id!);
      console.log('Fetched marketing data:', data);

      setSettings(data);
      if (data?.sectionOrder && Array.isArray(data.sectionOrder) && data.sectionOrder.length > 0) {
        setSectionOrder(data.sectionOrder);
      } else {
        setSectionOrder(['announcement', 'banner', 'offer']);
      }
    } catch (error) {
      console.error('Error fetching marketing data:', error);
      toast.error('حدث خطأ في جلب بيانات التسويق');
      setSettings({
        sectionOrder: ['announcement', 'banner', 'offer'],
        sections: []
      });
      setSectionOrder(['announcement', 'banner', 'offer']);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSectionOrder = async (newOrder: MarketingSectionType[]) => {
    try {
      await marketingService.updateSectionOrder(type!, id!, newOrder);
      setSectionOrder(newOrder);
      toast.success('تم تحديث ترتيب الأقسام بنجاح');
    } catch (error) {
      console.error('Error updating section order:', error);
      toast.error('حدث خطأ في تحديث ترتيب الأقسام');
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(sectionOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    handleUpdateSectionOrder(items);
  };

  const handleCreateSection = async (data: any) => {
    try {
      await marketingService.createSection(type!, id!, data);
      toast.success('تم إنشاء العنصر التسويقي بنجاح');
      await fetchData();
      setShowForm(false);
      setFormType(null);
    } catch (error: any) {
      console.error('Error creating section:', error);
      toast.error(error?.response?.data?.error || 'حدث خطأ في إنشاء العنصر');
      throw error;
    }
  };

  const handleUpdateSection = async (data: any) => {
    if (!editingSection) return;
    try {
      await marketingService.updateSection(
        editingSection.id,
        type!,
        id!,
        data
      );
      toast.success('تم تحديث العنصر التسويقي بنجاح');
      await fetchData();
      setShowForm(false);
      setEditingSection(null);
    } catch (error: any) {
      console.error('Error updating section:', error);
      toast.error(error?.response?.data?.error || 'حدث خطأ في تحديث العنصر');
      throw error;
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;

    try {
      await marketingService.deleteSection(sectionId, type!, id!);
      toast.success('تم حذف العنصر التسويقي بنجاح');
      await fetchData();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('حدث خطأ في حذف العنصر');
    }
  };

  const handleToggleActive = async (sectionId: string, currentStatus: boolean) => {
    const section = settings?.sections?.find(s => s.id === sectionId);
    if (!section) return;

    try {
      await marketingService.updateSection(
        sectionId,
        type!,
        id!,
        { isActive: !currentStatus }
      );
      toast.success(`تم ${!currentStatus ? 'تفعيل' : 'تعطيل'} العنصر بنجاح`);
      await fetchData();
    } catch (error) {
      console.error('Error toggling section:', error);
      toast.error('حدث خطأ في تغيير حالة العنصر');
    }
  };

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }}>
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

  const sections = settings?.sections || [];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ color: C.text, fontWeight: 700, fontSize: 22, margin: 0 }}>
                إدارة التسويق | {type === 'restaurant' ? 'مطعم' : 'متجر'} #{id?.slice(0, 8)}
              </h1>
              <p style={{ color: C.muted, marginTop: 4, fontSize: 14 }}>
                أضف بانرات وعروض للترويج لنشاطك التجاري
              </p>
            </div>
            <button
              onClick={() => navigate(`/admin/${type}s/${id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', color: C.muted,
                background: C.surf, border: '1px solid ' + C.border,
                borderRadius: 10, cursor: 'pointer', fontFamily: 'Cairo, sans-serif'
              }}
            >
              <IoArrowBack style={{ width: 16, height: 16 }} />
              العودة للتفاصيل
            </button>
          </div>
        </div>

        {/* Admin Info Banner */}
        <div style={{
          marginBottom: 24, padding: 16,
          background: 'rgba(96,165,250,0.08)',
          border: '1px solid rgba(96,165,250,0.2)',
          borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12
        }}>
          <IoMegaphone style={{ width: 20, height: 20, color: C.blue, flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: C.blue }}>
            <p style={{ fontWeight: 700, marginBottom: 4, marginTop: 0 }}>📢 الإعلانات - حصرية للمدير العام</p>
            <p style={{ color: C.muted, margin: 0 }}>
              الإعلانات يتم إضافتها بواسطة المدير العام فقط وتظهر لجميع العملاء.
              البانرات والعروض يمكنك إضافتها بنفسك لترويج متجرك/مطعمك.
            </p>
          </div>
        </div>

        {/* Section Order Drag and Drop */}
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid ' + C.border }}>
            <IoSwapVertical style={{ width: 20, height: 20, color: C.muted }} />
            <h2 style={{ color: C.text, fontWeight: 700, fontSize: 16, margin: 0 }}>ترتيب الأقسام</h2>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>اسحب الأقسام لإعادة ترتيب ظهورها للعملاء</p>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}
                >
                  {sectionOrder.map((sectionType, index) => {
                    const info = sectionTypeNames[sectionType];
                    const isAdminOnly = ADMIN_ONLY_SECTIONS.includes(sectionType);
                    return (
                      <Draggable key={sectionType} draggableId={sectionType} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 16px', borderRadius: 10, cursor: 'move',
                              border: `2px solid ${snapshot.isDragging ? C.accent : (isAdminOnly ? C.purple : C.border)}`,
                              background: snapshot.isDragging
                                ? 'rgba(200,226,53,0.08)'
                                : isAdminOnly
                                ? 'rgba(167,139,250,0.08)'
                                : C.surf,
                              color: C.text,
                              ...provided.draggableProps.style,
                            }}
                          >
                            {info.icon}
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{info.title}</span>
                            {isAdminOnly && (
                              <span style={{
                                fontSize: 11, background: 'rgba(167,139,250,0.2)',
                                color: C.purple, padding: '2px 8px', borderRadius: 999
                              }}>
                                للمدير فقط
                              </span>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Marketing Sections Lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {sectionOrder.map((sectionType) => {
            const info = sectionTypeNames[sectionType];
            const filteredSections = sections.filter(s => s.sectionType === sectionType);
            const isAdminOnly = ADMIN_ONLY_SECTIONS.includes(sectionType);

            return (
              <div key={sectionType}>
                <MarketingSectionList
                  sections={filteredSections}
                  type={sectionType}
                  title={info.title}
                  icon={info.icon}
                  description={info.description}
                  isAdminOnly={isAdminOnly}
                  onAdd={() => {
                    setFormType(sectionType);
                    setEditingSection(null);
                    setShowForm(true);
                  }}
                  onEdit={(section) => {
                    setEditingSection(section);
                    setFormType(null);
                    setShowForm(true);
                  }}
                  onDelete={handleDeleteSection}
                  onToggleActive={handleToggleActive}
                />
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
          setFormType(null);
        }}
        onSubmit={editingSection ? handleUpdateSection : handleCreateSection}
        initialData={editingSection || undefined}
        businessType={type!}
        businessId={id!}
        isAdminOnly={formType ? ADMIN_ONLY_SECTIONS.includes(formType) : false}
      />
    </div>
  );
};

export default AdminBusinessMarketing;
