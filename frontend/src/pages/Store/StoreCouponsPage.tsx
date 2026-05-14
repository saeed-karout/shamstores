// pages/Store/StoreCouponsPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { 
  IoAdd, 
  IoPencil, 
  IoTrash, 
  IoCopy, 
  IoCheckmark,
  IoTime,
  IoPricetag,
  IoWarning,
  IoLockClosed,
  IoStorefront,
  IoGlobe
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrder: number;
  usageLimit: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isStoreOnly: boolean;
}

const StoreCouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const { user, isSuperAdmin, isStoreOwner } = useAuth();

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    minOrder: '',
    usageLimit: '',
    startDate: '',
    endDate: '',
    isStoreOnly: false,
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await api.get('/store/coupons');
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('حدث خطأ في جلب الكوبونات');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minOrder: '',
      usageLimit: '',
      startDate: '',
      endDate: '',
      isStoreOnly: false,
    });
    setSelectedCoupon(null);
  };

  const handleOpenModal = (coupon?: Coupon) => {
  if (coupon) {
    setSelectedCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minOrder: coupon.minOrder.toString(),
      usageLimit: coupon.usageLimit.toString(),
      startDate: coupon.startDate.split('T')[0],
      endDate: coupon.endDate.split('T')[0],
      isStoreOnly: coupon.isStoreOnly || false,  // ✅ استخدام isStoreOnly
    });
  }
  setShowModal(true);
};

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleSave = async () => {
    try {
      const dataToSend = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        minOrder: parseFloat(formData.minOrder) || 0,
        usageLimit: parseInt(formData.usageLimit) || 1,
      };

      if (selectedCoupon) {
        await api.put(`/store/coupons/${selectedCoupon.id}`, dataToSend);
        toast.success('تم تحديث الكوبون بنجاح');
      } else {
        await api.post('/store/coupons', dataToSend);
        toast.success('تم إنشاء الكوبون بنجاح');
      }
      setShowModal(false);
      resetForm();
      await fetchCoupons();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    try {
      await api.delete(`/store/coupons/${id}`);
      toast.success('تم حذف الكوبون بنجاح');
      await fetchCoupons();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('تم نسخ الكود');
  };

  const getStatus = (coupon: Coupon) => {
    const now = new Date();
    const start = new Date(coupon.startDate);
    const end = new Date(coupon.endDate);

    if (now < start) return 'upcoming';
    if (now > end) return 'expired';
    if (coupon.usedCount >= coupon.usageLimit) return 'exhausted';
    return 'active';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'exhausted': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'upcoming': return 'قادم';
      case 'expired': return 'منتهي';
      case 'exhausted': return 'مستنفذ';
      default: return status;
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <IoPricetag className="text-green-500 text-3xl" />
          <div>
            <h1 className="text-2xl font-bold">إدارة كوبونات المتجر</h1>
            <p className="text-sm text-gray-500">أنشئ كوبونات خصم لجذب المزيد من العملاء</p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2"
        >
          <IoAdd size={18} />
          إضافة كوبون
        </Button>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">إجمالي الكوبونات</p>
              <p className="text-2xl font-bold text-blue-600">{coupons.length}</p>
            </div>
            <IoPricetag className="text-blue-500 text-3xl opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">كوبونات نشطة</p>
              <p className="text-2xl font-bold text-green-600">
                {coupons.filter(c => getStatus(c) === 'active').length}
              </p>
            </div>
            <IoCheckmark className="text-green-500 text-3xl opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">قادمة</p>
              <p className="text-2xl font-bold text-teal-600">
                {coupons.filter(c => getStatus(c) === 'upcoming').length}
              </p>
            </div>
            <IoTime className="text-teal-500 text-3xl opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">منتهية/مستنفذة</p>
              <p className="text-2xl font-bold text-red-600">
                {coupons.filter(c => getStatus(c) === 'expired' || getStatus(c) === 'exhausted').length}
              </p>
            </div>
            <IoWarning className="text-red-500 text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {/* قائمة الكوبونات */}
      {coupons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <IoPricetag className="text-gray-300 text-6xl mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد كوبونات</h3>
          <p className="text-gray-500 mb-4">قم بإضافة أول كوبون لجذب المزيد من العملاء</p>
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <IoAdd className="inline ml-1" />
            إضافة كوبون
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكود</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخصم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفترة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاستخدام</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {coupons.map(coupon => {
                  const status = getStatus(coupon);
                  const usagePercent = (coupon.usedCount / coupon.usageLimit) * 100;
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm font-bold">
                            {coupon.code}
                          </code>
                          <button
                            onClick={() => copyCode(coupon.code)}
                            className="text-gray-400 hover:text-green-500 transition"
                            title="نسخ الكود"
                          >
                            <IoCopy size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
  {coupon.isStoreOnly ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
      <IoStorefront size={12} />
      خاص بالمتجر
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
      <IoGlobe size={12} />
      عام
    </span>
  )}
</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 max-w-xs truncate">
                          {coupon.description || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {coupon.discountType === 'percentage' ? (
                          <span className="font-bold text-green-600">{coupon.discountValue}%</span>
                        ) : (
                          <span className="font-bold text-green-600">{coupon.discountValue} ر.س</span>
                        )}
                        {coupon.minOrder > 0 && (
                          <p className="text-xs text-gray-500">الحد الأدنى: {coupon.minOrder} ر.س</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>{format(new Date(coupon.startDate), 'dd/MM/yyyy')}</div>
                        <div className="text-gray-400">→</div>
                        <div>{format(new Date(coupon.endDate), 'dd/MM/yyyy')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-24">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{coupon.usedCount}</span>
                            <span className="text-gray-400">/{coupon.usageLimit}</span>
                          </div>
                          <div className="bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-green-500 rounded-full h-1.5 transition-all"
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(coupon)}
                            className="text-blue-500 hover:text-blue-700 transition"
                            title="تعديل"
                          >
                            <IoPencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            className="text-red-500 hover:text-red-700 transition"
                            title="حذف"
                          >
                            <IoTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal إضافة/تعديل كوبون */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={selectedCoupon ? '✏️ تعديل كوبون' : '➕ إضافة كوبون جديد'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              كود الكوبون <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="flex-1 p-2 border rounded-lg font-mono focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="مثال: SAVE20"
                required
              />
              <Button variant="outline" onClick={generateRandomCode}>
                توليد عشوائي
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              rows={2}
              placeholder="وصف الكوبون (اختياري)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">نوع الخصم</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">قيمة ثابتة (ر.س)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {formData.discountType === 'percentage' ? 'نسبة الخصم (%)' : 'قيمة الخصم (ر.س)'}
              </label>
              <input
                type="number"
                step={formData.discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={formData.discountType === 'percentage' ? '100' : undefined}
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الحد الأدنى للطلب</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="0 = بدون حد"
                />
                <span className="absolute left-3 top-2 text-gray-400 text-sm">ر.س</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">حد الاستخدام</label>
              <input
                type="number"
                min="1"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="عدد مرات الاستخدام"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ البدء</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ الانتهاء</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </div>

          {/* نوع الكوبون */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isStoreOnly}
                onChange={(e) => setFormData({ ...formData, isStoreOnly: e.target.checked })}
                className="w-4 h-4 text-green-500 rounded focus:ring-green-500"
              />
              <span className="font-medium">كوبون خاص بالمتجر فقط</span>
            </label>
            <div className={`rounded-lg p-3 ${formData.isStoreOnly ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-start gap-2">
                {formData.isStoreOnly ? (
                  <IoStorefront className="text-green-600 mt-1" size={18} />
                ) : (
                  <IoGlobe className="text-gray-600 mt-1" size={18} />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {formData.isStoreOnly ? 'يعمل فقط عند الطلب من المتجر' : 'يعمل في أي مكان'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formData.isStoreOnly 
                      ? 'يمكن استخدام هذا الكوبون فقط عند الشراء من متجرك عبر الإنترنت'
                      : 'يمكن استخدام هذا الكوبون في أي طلب من المتجر أو خارجه'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="primary" onClick={handleSave} className="flex-1">
              {selectedCoupon ? 'تحديث' : 'إنشاء'}
            </Button>
            <Button variant="outline" onClick={() => {
              setShowModal(false);
              resetForm();
            }} className="flex-1">
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StoreCouponsPage;