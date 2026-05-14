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

const sectionTypeNames: Record<MarketingSectionType, { title: string; icon: JSX.Element; description: string }> = {
  announcement: { 
    title: 'الإعلانات', 
    icon: <IoMegaphone className="w-5 h-5" />,
    description: 'إعلانات عامة من المنصة - يضيفها المدير فقط'
  },
  banner: { 
    title: 'البانرات', 
    icon: <IoImage className="w-5 h-5" />,
    description: 'بانرات ترويجية للمتجر/المطعم'
  },
  offer: { 
    title: 'العروض', 
    icon: <IoPricetag className="w-5 h-5" />,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات التسويق...</p>
        </div>
      </div>
    );
  }

  const sections = settings?.sections || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                إدارة التسويق | {type === 'restaurant' ? 'مطعم' : 'متجر'} #{id?.slice(0, 8)}
              </h1>
              <p className="text-gray-600 mt-1">
                أضف بانرات وعروض للترويج لنشاطك التجاري
              </p>
            </div>
            <button
              onClick={() => navigate(`/admin/${type}s/${id}`)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IoArrowBack className="w-4 h-4" />
              العودة للتفاصيل
            </button>
          </div>
        </div>

        {/* Admin Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <IoMegaphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">📢 الإعلانات - حصرية للمدير العام</p>
            <p className="text-blue-700">
              الإعلانات يتم إضافتها بواسطة المدير العام فقط وتظهر لجميع العملاء.
              البانرات والعروض يمكنك إضافتها بنفسك لترويج متجرك/مطعمك.
            </p>
          </div>
        </div>

        {/* Section Order Drag and Drop */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <IoSwapVertical className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-800">ترتيب الأقسام</h2>
            <p className="text-sm text-gray-500">اسحب الأقسام لإعادة ترتيب ظهورها للعملاء</p>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex flex-wrap gap-3"
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-move transition-all ${
                              snapshot.isDragging
                                ? 'bg-blue-50 border-blue-400 shadow-lg'
                                : isAdminOnly
                                ? 'bg-purple-50 border-purple-200'
                                : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            {info.icon}
                            <span className="font-medium">{info.title}</span>
                            {isAdminOnly && (
                              <span className="text-xs bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full">
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
        <div className="space-y-8">
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