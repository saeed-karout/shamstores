import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Coupon } from '../../services/types';
import { usePermissions } from '../../hooks/usePermissions';
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
  IoShield,
  IoRestaurant,
  IoGlobe
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const CouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const permissions = usePermissions();
  const { user, isSuperAdmin, isOwner, isStaff } = useAuth();

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    minOrder: '',
    usageLimit: '',
    startDate: '',
    endDate: '',
    isRestaurantOnly: false,
  });

  useEffect(() => {
    // السوبر أدمن يرى كل شيء بدون قيود
    if (isSuperAdmin) {
      fetchCoupons();
      return;
    }
    
    // الموظف لا يرى الكوبونات أبداً
    if (isStaff) {
      setLoading(false);
      return;
    }
    
    // المالك يمكنه رؤية الكوبونات إذا كانت الخطة تدعم
    if (isOwner && permissions.checkPermission('coupons')) {
      fetchCoupons();
    } else {
      setLoading(false);
    }
  }, [permissions.currentPlan, isStaff, isOwner, isSuperAdmin]);

  const fetchCoupons = async () => {
    try {
      const data = await api.get<Coupon[]>('/coupons');
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
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
      isRestaurantOnly: false,
    });
    setSelectedCoupon(null);
  };

  const handleOpenModal = (coupon?: Coupon) => {
    // السوبر أدمن يمكنه فتح المودال بدون قيود
    if (isSuperAdmin) {
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
          isRestaurantOnly: coupon.isRestaurantOnly || false,
        });
      }
      setShowModal(true);
      return;
    }
    
    // الموظف لا يمكنه فتح المودال
    if (isStaff) {
      toast.error('ليس لديك صلاحية لإدارة الكوبونات');
      return;
    }

    // المالك يحتاج للتحقق من الخطة
    if (isOwner && !permissions.checkPermission('coupons')) {
      permissions.showUpgradePrompt('coupons');
      return;
    }
    
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
        isRestaurantOnly: coupon.isRestaurantOnly || false,
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
        await api.put(`/coupons/${selectedCoupon.id}`, dataToSend);
        toast.success('تم تحديث الكوبون بنجاح');
      } else {
        await api.post('/coupons', dataToSend);
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
    // السوبر أدمن يمكنه الحذف بدون قيود
    if (isSuperAdmin) {
      if (!window.confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
      try {
        await api.delete(`/coupons/${id}`);
        toast.success('تم حذف الكوبون بنجاح');
        await fetchCoupons();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'حدث خطأ');
      }
      return;
    }
    
    // الموظف لا يمكنه الحذف
    if (isStaff) {
      toast.error('ليس لديك صلاحية لحذف الكوبونات');
      return;
    }

    if (!window.confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    
    try {
      await api.delete(`/coupons/${id}`);
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

  // عرض رسالة للموظف
  if (isStaff) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <IoLockClosed className="text-yellow-500 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح</h2>
          <p className="text-gray-600">
            ليس لديك صلاحية الوصول إلى صفحة الكوبونات.
          </p>
        </div>
      </div>
    );
  }

  // عرض رسالة للمالك إذا كانت الخطة لا تدعم الكوبونات (وليس سوبر أدمن)
  if (isOwner && !permissions.checkPermission('coupons') && !isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <IoWarning className="text-yellow-500 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الميزة غير متاحة</h2>
          <p className="text-gray-600 mb-4">
            نظام الكوبونات غير متاح في خطتك الحالية. قم بترقية خطتك للاستفادة من هذه الميزة.
          </p>
          <Button
            variant="primary"
            onClick={() => window.location.href = '/plans'}
          >
            عرض خطط الترقية
          </Button>
        </div>
      </div>
    );
  }

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">إدارة الكوبونات</h1>
          {isSuperAdmin && (
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <IoShield className="text-purple-600" />
              صلاحية كاملة
            </span>
          )}
        </div>
        {/* السوبر أدمن والمالك (إذا كانت الخطة تدعم) يمكنهم الإضافة */}
        {(isSuperAdmin || (isOwner && permissions.checkPermission('coupons'))) && (
          <Button
            variant="primary"
            onClick={() => handleOpenModal()}
          >
            <IoAdd className="inline ml-1" />
            إضافة كوبون
          </Button>
        )}
      </div>

      {/* الإحصائيات - تظهر للجميع */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">إجمالي الكوبونات</p>
              <p className="text-2xl font-bold">{coupons.length}</p>
            </div>
            <IoPricetag className="text-blue-500 text-3xl" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">كوبونات نشطة</p>
              <p className="text-2xl font-bold text-green-600">
                {coupons.filter(c => getStatus(c) === 'active').length}
              </p>
            </div>
            <IoCheckmark className="text-green-500 text-3xl" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">قادمة</p>
              <p className="text-2xl font-bold text-blue-600">
                {coupons.filter(c => getStatus(c) === 'upcoming').length}
              </p>
            </div>
            <IoTime className="text-blue-500 text-3xl" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">منتهية</p>
              <p className="text-2xl font-bold text-red-600">
                {coupons.filter(c => getStatus(c) === 'expired' || getStatus(c) === 'exhausted').length}
              </p>
            </div>
            <IoWarning className="text-red-500 text-3xl" />
          </div>
        </div>
      </div>

      {/* قائمة الكوبونات */}
      {coupons.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <IoPricetag className="text-gray-300 text-5xl mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد كوبونات</h3>
          <p className="text-gray-500 mb-4">
            {(isSuperAdmin || (isOwner && permissions.checkPermission('coupons'))) 
              ? 'قم بإضافة أول كوبون الآن'
              : 'لا توجد كوبونات متاحة'}
          </p>
          {(isSuperAdmin || (isOwner && permissions.checkPermission('coupons'))) && (
            <Button
              variant="primary"
              onClick={() => handleOpenModal()}
            >
              <IoAdd className="inline ml-1" />
              إضافة كوبون
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الكود
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  النوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الوصف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الخصم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الفترة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الاستخدام
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {coupons.map(coupon => {
                const status = getStatus(coupon);
                return (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                          {coupon.code}
                        </code>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="text-gray-400 hover:text-blue-500"
                        >
                          <IoCopy size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {coupon.isRestaurantOnly ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          <IoRestaurant />
                          داخل المطعم
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          <IoGlobe />
                          عام
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{coupon.description}</p>
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
                      <div>من: {format(new Date(coupon.startDate), 'dd/MM/yyyy')}</div>
                      <div>إلى: {format(new Date(coupon.endDate), 'dd/MM/yyyy')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-center">
                        <span className="font-bold">{coupon.usedCount}</span>
                        <span className="text-gray-500"> / {coupon.usageLimit}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status)}`}>
                        {getStatusText(status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2 rtl:space-x-reverse">
                        {/* السوبر أدمن والمالك (إذا كانت الخطة تدعم) يمكنهم التعديل والحذف */}
                        {(isSuperAdmin || (isOwner && permissions.checkPermission('coupons'))) && (
                          <>
                            <button
                              onClick={() => handleOpenModal(coupon)}
                              className="text-blue-500 hover:text-blue-700"
                              title="تعديل"
                            >
                              <IoPencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(coupon.id)}
                              className="text-red-500 hover:text-red-700"
                              title="حذف"
                            >
                              <IoTrash size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال إضافة/تعديل كوبون */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={selectedCoupon ? 'تعديل كوبون' : 'إضافة كوبون جديد'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">كود الكوبون</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="flex-1 p-2 border rounded font-mono"
                placeholder="مثال: SAVE20"
                required
              />
              <Button
                variant="outline"
                onClick={generateRandomCode}
              >
                توليد عشوائي
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الوصف</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="وصف الكوبون"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">نوع الخصم</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                className="w-full p-2 border rounded"
              >
                <option value="percentage">نسبة مئوية</option>
                <option value="fixed">قيمة ثابتة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {formData.discountType === 'percentage' ? 'نسبة الخصم' : 'قيمة الخصم'}
              </label>
              <input
                type="number"
                step={formData.discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الحد الأدنى للطلب</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.minOrder}
                onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="0 = بدون حد"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">حد الاستخدام</label>
              <input
                type="number"
                min="1"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                className="w-full p-2 border rounded"
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
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ الانتهاء</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          {/* نوع الكوبون */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.isRestaurantOnly}
                onChange={(e) => setFormData({ ...formData, isRestaurantOnly: e.target.checked })}
                className="w-4 h-4 text-blue-500 rounded"
              />
              <span className="font-medium">كوبون خاص بالمطعم</span>
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                {formData.isRestaurantOnly ? (
                  <IoRestaurant className="text-blue-600 mt-1" size={18} />
                ) : (
                  <IoGlobe className="text-green-600 mt-1" size={18} />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {formData.isRestaurantOnly ? 'يعمل فقط داخل المطعم' : 'يعمل في أي مكان'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formData.isRestaurantOnly 
                      ? 'يمكن استخدام هذا الكوبون فقط عند الطلب من داخل المطعم (مع مسح QR الطاولة)'
                      : 'يمكن استخدام هذا الكوبون في أي طلب سواء داخل المطعم أو خارجه'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleSave}
            fullWidth
          >
            حفظ
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CouponsPage;