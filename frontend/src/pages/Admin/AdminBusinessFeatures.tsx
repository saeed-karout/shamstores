// pages/Admin/AdminBusinessFeatures.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { 
  IoArrowBack, IoCheckmark, IoClose, IoAdd, 
  IoTime, IoCalendar, IoSettings, IoWarning,
  IoRestaurant, IoStorefront, IoGlobe
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Feature {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  description: string;
  category: string;
  group: string;
  isCore: boolean;
  isActive: boolean;
  price: number;
  isOneTime: boolean;
  isEnabled: boolean;
  isOverridden: boolean;
  expiresAt?: string;
  config?: any;
}

const AdminBusinessFeatures: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [type, id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [businessData, featuresData] = await Promise.all([
        api.get(`/admin/${type}s/${id}`),
        api.get(`/features/business/${type}/${id}`)
      ]);
      setBusiness(businessData);
      setFeatures(featuresData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableFeature = async () => {
    if (!selectedFeature) return;
    
    try {
      await api.post(`/features/business/${type}/${id}/enable/${selectedFeature.code}`, {
        expiresAt: expiryDate || null
      });
      toast.success(`تم تفعيل ميزة "${selectedFeature.name}" بنجاح`);
      setShowEnableModal(false);
      setSelectedFeature(null);
      setExpiryDate('');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleDisableFeature = async (feature: Feature) => {
    if (!window.confirm(`هل أنت متأكد من تعطيل ميزة "${feature.name}"؟`)) return;
    
    try {
      await api.delete(`/features/business/${type}/${id}/disable/${feature.code}`);
      toast.success(`تم تعطيل ميزة "${feature.name}" بنجاح`);
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const getFilteredFeatures = () => {
    let filtered = [...features];
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(f => f.category === filterCategory);
    }
    
    return filtered;
  };

  const getStatusBadge = (feature: Feature) => {
    if (feature.isEnabled) {
      if (feature.isOverridden) {
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1">
            <IoCheckmark size={12} />
            مفعلة (تجاوز)
          </span>
        );
      }
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1">
          <IoCheckmark size={12} />
          مفعلة
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs flex items-center gap-1">
        <IoClose size={12} />
        معطلة
      </span>
    );
  };

  if (loading) return <Loader fullScreen />;

  const filteredFeatures = getFilteredFeatures();
  const enabledCount = features.filter(f => f.isEnabled).length;
  const availableFeatures = features.filter(f => !f.isEnabled && !f.isCore);

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <button
          onClick={() => navigate(`/admin/${type}s`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <IoArrowBack size={20} />
          العودة
        </button>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            type === 'restaurant' ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            {type === 'restaurant' ? (
              <IoRestaurant className="text-blue-600 text-2xl" />
            ) : (
              <IoStorefront className="text-green-600 text-2xl" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{business?.name}</h1>
            <p className="text-sm text-gray-500">
              إدارة الميزات الإضافية لل{type === 'restaurant' ? 'مطعم' : 'متجر'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">إجمالي الميزات</p>
          <p className="text-2xl font-bold text-purple-600">{features.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">ميزات مفعلة</p>
          <p className="text-2xl font-bold text-green-600">{enabledCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">ميزات متاحة للإضافة</p>
          <p className="text-2xl font-bold text-blue-600">{availableFeatures.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterCategory === 'all' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilterCategory('restaurant')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterCategory === 'restaurant' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            مطاعم
          </button>
          <button
            onClick={() => setFilterCategory('store')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterCategory === 'store' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            متاجر
          </button>
          <button
            onClick={() => setFilterCategory('both')}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              filterCategory === 'both' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            مشترك
          </button>
        </div>
      </div>

      {/* Features Table */}
      {filteredFeatures.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <IoGlobe className="text-gray-300 text-6xl mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد ميزات</h3>
          <p className="text-gray-500">لا توجد ميزات متاحة</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الميزة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكود</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفئة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المجموعة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السعر</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">انتهاء</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFeatures.map((feature) => (
                  <tr key={feature.code} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-800">{feature.name}</p>
                        {feature.description && (
                          <p className="text-xs text-gray-500">{feature.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        {feature.code}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">
                        {feature.category === 'restaurant' ? 'مطعم' : 
                         feature.category === 'store' ? 'متجر' : 'مشترك'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(feature)}
                    </td>
                    <td className="px-6 py-4">
                      {feature.price > 0 ? (
                        <span className="font-bold text-green-600">{feature.price} ر.س</span>
                      ) : (
                        <span className="text-green-600">مجانية</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(feature)}
                    </td>
                    <td className="px-6 py-4">
                      {feature.expiresAt ? (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <IoTime size={12} />
                          {format(new Date(feature.expiresAt), 'dd/MM/yyyy', { locale: ar })}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">دائم</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {feature.isEnabled ? (
                        <button
                          onClick={() => handleDisableFeature(feature)}
                          className="text-red-500 hover:text-red-700 transition text-sm"
                          disabled={feature.isCore}
                        >
                          تعطيل
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedFeature(feature);
                            setShowEnableModal(true);
                          }}
                          className="text-green-500 hover:text-green-700 transition text-sm"
                        >
                          تفعيل
                        </button>
                      )}
                     </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal تفعيل ميزة */}
      <Modal
        isOpen={showEnableModal}
        onClose={() => {
          setShowEnableModal(false);
          setSelectedFeature(null);
          setExpiryDate('');
        }}
        title={`➕ تفعيل ميزة "${selectedFeature?.name}"`}
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <IoWarning className="text-yellow-500 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  الميزة: <span className="font-bold">{selectedFeature?.name}</span>
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  السعر: <span className="font-bold">{selectedFeature?.price} ر.س</span>
                  {selectedFeature?.isOneTime ? ' (دفعة واحدة)' : ' / شهرياً'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">تاريخ الانتهاء (اختياري)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full p-2 border rounded-lg"
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            <p className="text-xs text-gray-500 mt-1">
              اتركه فارغاً للميزة الدائمة
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="primary" onClick={handleEnableFeature} fullWidth>
              تفعيل الميزة
            </Button>
            <Button variant="outline" onClick={() => setShowEnableModal(false)} fullWidth>
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminBusinessFeatures;