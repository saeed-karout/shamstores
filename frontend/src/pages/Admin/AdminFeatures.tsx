// pages/Admin/AdminFeatures.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { 
  IoAdd, IoPencil, IoTrash, IoSearch, IoRefresh, 
  IoCheckmark, IoClose, IoWarning, IoInformation,
  IoRestaurant, IoStorefront, IoGlobe, IoCard,
  IoMegaphone, IoStatsChart, IoCar, IoCloud,
  IoShield, IoMail, IoChatbubble, IoQrCode,
  IoCart, IoCube, IoPricetag, IoRocket
} from 'react-icons/io5';
import toast from 'react-hot-toast';

interface Feature {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: 'restaurant' | 'store' | 'both';
  group: 'basic' | 'marketing' | 'advanced' | 'payment' | 'delivery' | 'analytics' | 'integration';
  isCore: boolean;
  isActive: boolean;
  price: number;
  isOneTime: boolean;
  defaultInPlans: string[];
  dependsOn: string[];
}

const AdminFeatures: React.FC = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    category: 'both' as const,
    group: 'basic' as const,
    isCore: false,
    isActive: true,
    price: '',
    isOneTime: false,
    defaultInPlans: [] as string[],
    dependsOn: [] as string[]
  });

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const data = await api.get('/features');
      setFeatures(data || []);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast.error('حدث خطأ في جلب الميزات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.code || !formData.name) {
        toast.error('الكود والاسم مطلوبان');
        return;
      }

      const data = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        defaultInPlans: formData.defaultInPlans,
        dependsOn: formData.dependsOn
      };

      if (editingFeature) {
        await api.put(`/features/${editingFeature.code}`, data);
        toast.success('تم تحديث الميزة بنجاح');
      } else {
        await api.post('/features', data);
        toast.success('تم إنشاء الميزة بنجاح');
      }
      setShowModal(false);
      resetForm();
      await fetchFeatures();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleDelete = async (feature: Feature) => {
    if (feature.isCore) {
      toast.error('لا يمكن حذف ميزة أساسية');
      return;
    }
    
    if (!window.confirm(`هل أنت متأكد من حذف ميزة "${feature.name}"؟`)) return;
    
    try {
      await api.delete(`/features/${feature.code}`);
      toast.success('تم حذف الميزة بنجاح');
      await fetchFeatures();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      nameEn: '',
      description: '',
      descriptionEn: '',
      category: 'both',
      group: 'basic',
      isCore: false,
      isActive: true,
      price: '',
      isOneTime: false,
      defaultInPlans: [],
      dependsOn: []
    });
    setEditingFeature(null);
  };

  const handleOpenModal = (feature?: Feature) => {
    if (feature) {
      setEditingFeature(feature);
      setFormData({
        code: feature.code,
        name: feature.name,
        nameEn: feature.nameEn || '',
        description: feature.description || '',
        descriptionEn: feature.descriptionEn || '',
        category: feature.category,
        group: feature.group,
        isCore: feature.isCore,
        isActive: feature.isActive,
        price: feature.price.toString(),
        isOneTime: feature.isOneTime,
        defaultInPlans: feature.defaultInPlans || [],
        dependsOn: feature.dependsOn || []
      });
    }
    setShowModal(true);
  };

  const getFilteredFeatures = () => {
    let filtered = [...features];
    
    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.nameEn && f.nameEn.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(f => f.category === selectedCategory);
    }
    
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(f => f.group === selectedGroup);
    }
    
    return filtered;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'restaurant': return <IoRestaurant className="text-blue-500" />;
      case 'store': return <IoStorefront className="text-green-500" />;
      default: return <IoGlobe className="text-purple-500" />;
    }
  };

  const getGroupBadge = (group: string) => {
    const styles: Record<string, string> = {
      basic: 'bg-gray-100 text-gray-700',
      marketing: 'bg-pink-100 text-pink-700',
      advanced: 'bg-purple-100 text-purple-700',
      payment: 'bg-green-100 text-green-700',
      delivery: 'bg-orange-100 text-orange-700',
      analytics: 'bg-blue-100 text-blue-700',
      integration: 'bg-indigo-100 text-indigo-700'
    };
    
    const names: Record<string, string> = {
      basic: 'أساسية',
      marketing: 'تسويق',
      advanced: 'متقدمة',
      payment: 'دفع',
      delivery: 'توصيل',
      analytics: 'تحليلات',
      integration: 'تكامل'
    };
    
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${styles[group] || 'bg-gray-100'}`}>
        {names[group] || group}
      </span>
    );
  };

  if (loading) return <Loader fullScreen />;

  const filteredFeatures = getFilteredFeatures();

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">⚙️ إدارة ميزات المنصة</h1>
          <p className="text-sm text-gray-500 mt-1">إنشاء وتعديل الميزات المتاحة للمطاعم والمتاجر</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <IoAdd className="inline ml-1" />
          إضافة ميزة جديدة
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <IoSearch className="absolute right-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن ميزة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">جميع الفئات</option>
            <option value="restaurant">مطاعم</option>
            <option value="store">متاجر</option>
            <option value="both">مشترك</option>
          </select>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">جميع المجموعات</option>
            <option value="basic">أساسية</option>
            <option value="marketing">تسويق</option>
            <option value="advanced">متقدمة</option>
            <option value="payment">دفع</option>
            <option value="delivery">توصيل</option>
            <option value="analytics">تحليلات</option>
            <option value="integration">تكامل</option>
          </select>
          <Button variant="outline" onClick={fetchFeatures}>
            <IoRefresh className="inline" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">إجمالي الميزات</p>
          <p className="text-2xl font-bold text-purple-600">{features.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">ميزات نشطة</p>
          <p className="text-2xl font-bold text-green-600">{features.filter(f => f.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">ميزات أساسية</p>
          <p className="text-2xl font-bold text-blue-600">{features.filter(f => f.isCore).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">ميزات مدفوعة</p>
          <p className="text-2xl font-bold text-orange-600">{features.filter(f => f.price > 0).length}</p>
        </div>
      </div>

      {/* Features Table */}
      {filteredFeatures.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <IoInformation className="text-gray-300 text-6xl mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد ميزات</h3>
          <p className="text-gray-500">قم بإضافة ميزة جديدة</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكود</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفئة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المجموعة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">أساسية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFeatures.map((feature) => (
                  <tr key={feature.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                        {feature.code}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-800">{feature.name}</p>
                        {feature.nameEn && (
                          <p className="text-xs text-gray-500">{feature.nameEn}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(feature.category)}
                        <span className="text-sm">
                          {feature.category === 'restaurant' ? 'مطعم' : 
                           feature.category === 'store' ? 'متجر' : 'مشترك'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getGroupBadge(feature.group)}
                    </td>
                    <td className="px-6 py-4">
                      {feature.price > 0 ? (
                        <div>
                          <span className="font-bold text-green-600">{feature.price} ر.س</span>
                          {feature.isOneTime && (
                            <p className="text-xs text-gray-500">لمرة واحدة</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-green-600">مجانية</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {feature.isActive ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <IoCheckmark /> مفعلة
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <IoClose /> معطلة
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {feature.isCore ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          أساسية
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                          إضافية
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(feature)}
                          className="text-blue-500 hover:text-blue-700 transition"
                          title="تعديل"
                        >
                          <IoPencil size={18} />
                        </button>
                        {!feature.isCore && (
                          <button
                            onClick={() => handleDelete(feature)}
                            className="text-red-500 hover:text-red-700 transition"
                            title="حذف"
                          >
                            <IoTrash size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal إضافة/تعديل ميزة */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingFeature ? '✏️ تعديل ميزة' : '➕ إضافة ميزة جديدة'}
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto p-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الكود (Code) *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z_]/g, '_') })}
                className="w-full p-2 border rounded-lg font-mono"
                placeholder="whatsapp_button"
                disabled={!!editingFeature}
                required
              />
              <p className="text-xs text-gray-500 mt-1">يستخدم للتحقق في الكود</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الاسم (عربي) *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الاسم (إنجليزي)</label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الفئة</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="restaurant">مطعم</option>
                <option value="store">متجر</option>
                <option value="both">مشترك</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">المجموعة</label>
              <select
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value as any })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="basic">أساسية</option>
                <option value="marketing">تسويق</option>
                <option value="advanced">متقدمة</option>
                <option value="payment">دفع</option>
                <option value="delivery">توصيل</option>
                <option value="analytics">تحليلات</option>
                <option value="integration">تكامل</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">السعر (ر.س)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isCore}
                onChange={(e) => setFormData({ ...formData, isCore: e.target.checked })}
                className="w-4 h-4"
              />
              <span>ميزة أساسية</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <span>مفعلة</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isOneTime}
                onChange={(e) => setFormData({ ...formData, isOneTime: e.target.checked })}
                className="w-4 h-4"
              />
              <span>دفع لمرة واحدة</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الوصف (عربي)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded-lg"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الوصف (إنجليزي)</label>
            <textarea
              value={formData.descriptionEn}
              onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
              className="w-full p-2 border rounded-lg"
              rows={2}
            />
          </div>

          <Button variant="primary" onClick={handleSave} fullWidth>
            {editingFeature ? 'تحديث' : 'إنشاء'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminFeatures;