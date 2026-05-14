// pages/Admin/AdminPlans.tsx

import React, { useEffect, useState } from 'react';
import { 
  IoAdd, IoTrash, IoCheckmark, IoClose, IoTime, 
  IoCheckmarkCircle, IoCloseCircle, IoLogoWhatsapp, 
  IoChatbubbleEllipses, IoEye, IoRefresh
} from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Plan {
  id: string;
  name: string;
  price: number;
  maxItems: number;
  maxTables: number;
  maxStaff: number;
  hasWhatsapp: boolean;
  hasOnlineOrders: boolean;
  hasCustomDomain: boolean;
  hasAnalytics: boolean;
  hasTableQr: boolean;
  hasMultiLanguage: boolean;
  hasPromotions: boolean;
  hasCoupons: boolean;
  description: string;
  isActive: boolean;
}

interface UpgradeRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userWhatsapp?: string;
  planId: string;
  planName: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: string;
  approvedAt?: string;
}

const AdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState<'plans' | 'requests'>('plans');
  
  const [formData, setFormData] = useState<Partial<Plan>>({
    name: '',
    price: 0,
    maxItems: 20,
    maxTables: 1,
    maxStaff: 0,
    hasWhatsapp: false,
    hasOnlineOrders: false,
    hasCustomDomain: false,
    hasAnalytics: false,
    hasTableQr: false,
    hasMultiLanguage: false,
    hasPromotions: false,
    hasCoupons: false,
    description: '',
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPlans(),
        fetchUpgradeRequests()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await api.get('/plans');
      setPlans(response);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('فشل تحميل الخطط');
    }
  };

  const fetchUpgradeRequests = async () => {
    try {
      const requests = await api.get('/admin/upgrade-requests');
      setUpgradeRequests(requests);
    } catch (error) {
      console.error('Error fetching upgrade requests:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await api.put(`/plans/${editingPlan.id}`, formData);
        toast.success('تم تحديث الخطة بنجاح');
      } else {
        await api.post('/plans', formData);
        toast.success('تم إضافة الخطة بنجاح');
      }
      setShowModal(false);
      setEditingPlan(null);
      setFormData({
        name: '',
        price: 0,
        maxItems: 20,
        maxTables: 1,
        maxStaff: 0,
        hasWhatsapp: false,
        hasOnlineOrders: false,
        hasCustomDomain: false,
        hasAnalytics: false,
        hasTableQr: false,
        hasMultiLanguage: false,
        hasPromotions: false,
        hasCoupons: false,
        description: '',
        isActive: true
      });
      fetchPlans();
    } catch (error) {
      toast.error('فشل حفظ الخطة');
    }
  };

  const deletePlan = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف خطة "${name}"؟`)) {
      try {
        await api.delete(`/plans/${id}`);
        toast.success('تم حذف الخطة بنجاح');
        fetchPlans();
      } catch (error) {
        toast.error('فشل حذف الخطة');
      }
    }
  };

  // دوال إدارة طلبات الترقية
  const approveRequest = async (requestId: string) => {
    try {
      await api.post(`/admin/approve-upgrade/${requestId}`);
      toast.success('تمت الموافقة على طلب الترقية بنجاح');
      fetchUpgradeRequests();
      
      // تحديث الخطط لعرض الخطة الجديدة
      fetchPlans();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ في الموافقة على الطلب');
    }
  };

  const openRejectModal = (request: UpgradeRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      await api.post(`/admin/reject-upgrade/${selectedRequest.id}`, {
        reason: rejectReason
      });
      
      toast.success('تم رفض الطلب بنجاح');
      setShowRejectModal(false);
      fetchUpgradeRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ في رفض الطلب');
    }
  };

  const contactViaWhatsApp = (whatsapp: string, name: string, planName: string) => {
    if (!whatsapp) {
      toast.error('رقم واتساب غير متوفر');
      return;
    }
    const message = `مرحباً ${name}، بخصوص طلب الترقية إلى خطة ${planName}...`;
    window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
            <IoTime size={12} />
            قيد الانتظار
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
            <IoCheckmarkCircle size={12} />
            تمت الموافقة
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
            <IoCloseCircle size={12} />
            مرفوض
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة المنصة</h1>
        <button
          onClick={() => fetchData()}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-600"
        >
          <IoRefresh size={20} />
          تحديث
        </button>
      </div>

      {/* تبويبات */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'plans' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          الخطط والاشتراكات
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'requests' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          طلبات الترقية
          {upgradeRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="mr-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {upgradeRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* ==================== تبويب الخطط ==================== */}
      {activeTab === 'plans' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setEditingPlan(null);
                setFormData({
                  name: '',
                  price: 0,
                  maxItems: 20,
                  maxTables: 1,
                  maxStaff: 0,
                  hasWhatsapp: false,
                  hasOnlineOrders: false,
                  hasCustomDomain: false,
                  hasAnalytics: false,
                  hasTableQr: false,
                  hasMultiLanguage: false,
                  hasPromotions: false,
                  hasCoupons: false,
                  description: '',
                  isActive: true
                });
                setShowModal(true);
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600"
            >
              <IoAdd size={20} />
              خطة جديدة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className={`p-4 ${plan.isActive ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-500'} text-white`}>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-2xl font-bold mt-2">{plan.price} ل.س <span className="text-sm">/ شهر</span></p>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>المنتجات/الأصناف:</span>
                    <span className="font-bold">{plan.maxItems === 0 ? 'غير محدود' : plan.maxItems}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>الطاولات:</span>
                    <span className="font-bold">{plan.maxTables === 0 ? 'غير محدود' : plan.maxTables}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>الموظفين:</span>
                    <span className="font-bold">{plan.maxStaff === 0 ? 'غير محدود' : plan.maxStaff}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    {plan.hasWhatsapp && <div className="text-sm text-green-600">✓ واتساب متكامل</div>}
                    {plan.hasOnlineOrders && <div className="text-sm text-green-600">✓ طلبات أونلاين</div>}
                    {plan.hasCustomDomain && <div className="text-sm text-green-600">✓ دومين مخصص</div>}
                    {plan.hasAnalytics && <div className="text-sm text-green-600">✓ تحليلات متقدمة</div>}
                    {plan.hasTableQr && <div className="text-sm text-green-600">✓ رموز QR للطاولات</div>}
                    {plan.hasMultiLanguage && <div className="text-sm text-green-600">✓ دعم لغات متعددة</div>}
                    {plan.hasPromotions && <div className="text-sm text-green-600">✓ عروض ترويجية</div>}
                    {plan.hasCoupons && <div className="text-sm text-green-600">✓ كوبونات خصم</div>}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setEditingPlan(plan);
                        setFormData(plan);
                        setShowModal(true);
                      }}
                      className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => deletePlan(plan.id, plan.name)}
                      className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm hover:bg-red-600 flex items-center justify-center gap-1"
                    >
                      <IoTrash size={14} /> حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ==================== تبويب طلبات الترقية ==================== */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <h2 className="text-xl font-bold">طلبات ترقية الخطط</h2>
            <p className="text-sm opacity-90">مراجعة وقبول أو رفض طلبات ترقية العملاء</p>
          </div>
          
          {upgradeRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <IoEye size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-500">لا توجد طلبات ترقية</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right">المستخدم</th>
                    <th className="px-6 py-3 text-right">واتساب</th>
                    <th className="px-6 py-3 text-right">الخطة الحالية</th>
                    <th className="px-6 py-3 text-right">الخطة المطلوبة</th>
                    <th className="px-6 py-3 text-right">المبلغ</th>
                    <th className="px-6 py-3 text-right">التاريخ</th>
                    <th className="px-6 py-3 text-right">الحالة</th>
                    <th className="px-6 py-3 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {upgradeRequests.map((req) => (
                    <tr key={req.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{req.userName}</p>
                          <p className="text-xs text-gray-500">{req.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {req.userWhatsapp ? (
                          <button
                            onClick={() => contactViaWhatsApp(req.userWhatsapp, req.userName, req.planName)}
                            className="flex items-center gap-1 text-green-600 hover:text-green-700"
                          >
                            <IoLogoWhatsapp size={16} />
                            <span className="text-sm">{req.userWhatsapp}</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">غير متوفر</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{req.currentPlanName || 'مجاني'}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-blue-600">{req.planName}</td>
                      <td className="px-6 py-4 text-green-600 font-bold">{req.price} ر.س</td>
                      <td className="px-6 py-4 text-sm">
                        {format(new Date(req.createdAt), 'dd/MM/yyyy', { locale: ar })}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4">
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveRequest(req.id)}
                              className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600 transition-all"
                            >
                              قبول
                            </button>
                            <button
                              onClick={() => openRejectModal(req)}
                              className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition-all"
                            >
                              رفض
                            </button>
                            {req.userWhatsapp && (
                              <button
                                onClick={() => contactViaWhatsApp(req.userWhatsapp, req.userName, req.planName)}
                                className="bg-gray-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-gray-600 transition-all"
                                title="تواصل عبر واتساب"
                              >
                                <IoChatbubbleEllipses size={16} />
                              </button>
                            )}
                          </div>
                        )}
                        {req.status === 'rejected' && req.reason && (
                          <div className="text-xs text-red-600 max-w-xs">
                            السبب: {req.reason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal إضافة/تعديل خطة */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <h3 className="text-xl font-bold">{editingPlan ? 'تعديل خطة' : 'إضافة خطة جديدة'}</h3>
              <button onClick={() => setShowModal(false)} className="text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">اسم الخطة</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">السعر (ل.س)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">المنتجات/الأصناف (0 = غير محدود)</label>
                  <input
                    type="number"
                    value={formData.maxItems}
                    onChange={(e) => setFormData({ ...formData, maxItems: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الطاولات (0 = غير محدود)</label>
                  <input
                    type="number"
                    value={formData.maxTables}
                    onChange={(e) => setFormData({ ...formData, maxTables: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الموظفين (0 = غير محدود)</label>
                  <input
                    type="number"
                    value={formData.maxStaff}
                    onChange={(e) => setFormData({ ...formData, maxStaff: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">الوصف</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    rows={2}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold mb-3">الميزات</h4>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.hasWhatsapp} onChange={(e) => setFormData({ ...formData, hasWhatsapp: e.target.checked })} />
                    <span>واتساب متكامل</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.hasOnlineOrders} onChange={(e) => setFormData({ ...formData, hasOnlineOrders: e.target.checked })} />
                    <span>طلبات أونلاين</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.hasCustomDomain} onChange={(e) => setFormData({ ...formData, hasCustomDomain: e.target.checked })} />
                    <span>دومين مخصص</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.hasAnalytics} onChange={(e) => setFormData({ ...formData, hasAnalytics: e.target.checked })} />
                    <span>تحليلات متقدمة</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.hasTableQr} onChange={(e) => setFormData({ ...formData, hasTableQr: e.target.checked })} />
                    <span>رموز QR للطاولات</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.hasMultiLanguage} onChange={(e) => setFormData({ ...formData, hasMultiLanguage: e.target.checked })} />
                    <span>دعم لغات متعددة</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.hasPromotions} onChange={(e) => setFormData({ ...formData, hasPromotions: e.target.checked })} />
                    <span>عروض ترويجية</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.hasCoupons} onChange={(e) => setFormData({ ...formData, hasCoupons: e.target.checked })} />
                    <span>كوبونات خصم</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">
                  {editingPlan ? 'تحديث' : 'إضافة'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border py-2 rounded-lg hover:bg-gray-50">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal رفض الطلب */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <IoCloseCircle size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold">رفض طلب الترقية</h3>
              <p className="text-gray-500 text-sm mt-1">
                رفض طلب {selectedRequest.userName} إلى خطة {selectedRequest.planName}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">سبب الرفض (اختياري)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="اكتب سبب الرفض هنا..."
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-all"
                rows={4}
              />
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 border py-2 rounded-lg hover:bg-gray-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleRejectRequest}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-all"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlans;