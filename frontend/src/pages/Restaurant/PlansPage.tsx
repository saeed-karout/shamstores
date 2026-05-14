import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Plan } from '../../services/types';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { 
  IoCheckmark, 
  IoClose, 
  IoRocket, 
  IoBusiness, 
  IoStar,
  IoWarning,
  IoLogoWhatsapp,
  IoSend,
  IoTime,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoEye,
  IoChatbubbleEllipses,
  IoAdd,
  IoPencil,
  IoTrash,
  IoSettings
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [upgradeRequests, setUpgradeRequests] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // حالة إدارة الخطط للمسؤول
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: 'free',
    price: '',
    maxItems: '',
    maxTables: '',
    maxStaff: '',
    hasWhatsapp: false,
    hasOnlineOrders: false,
    hasCustomDomain: false,
    hasAnalytics: false,
    hasTableQr: false,
    hasMultiLanguage: false,
    hasPromotions: false,
    hasCoupons: false,
    description: ''
  });

  const { user, isAdmin } = useAuth();

  // التحقق من صلاحية super admin
  const isSuperAdminUser = user?.role === 'super_admin';

  useEffect(() => {
    fetchData();
    if (isAdmin) {
      fetchUpgradeRequests();
    } else {
      fetchMyRequests();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [plansData, currentPlanData] = await Promise.all([
        api.get<Plan[]>('/plans'),
        api.get<Plan>('/plans/current/me').catch(() => null)
      ]);
      setPlans(plansData);
      setCurrentPlan(currentPlanData);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
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

  const fetchMyRequests = async () => {
    try {
      const requests = await api.get('/admin/user/upgrade-requests');
      setMyRequests(requests);
    } catch (error) {
      console.error('Error fetching my requests:', error);
    }
  };

  // دوال إدارة الخطط للمسؤول
  const handleOpenPlanModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        price: plan.price.toString(),
        maxItems: plan.maxItems.toString(),
        maxTables: plan.maxTables.toString(),
        maxStaff: plan.maxStaff.toString(),
        hasWhatsapp: plan.hasWhatsapp,
        hasOnlineOrders: plan.hasOnlineOrders,
        hasCustomDomain: plan.hasCustomDomain,
        hasAnalytics: plan.hasAnalytics,
        hasTableQr: plan.hasTableQr,
        hasMultiLanguage: plan.hasMultiLanguage,
        hasPromotions: plan.hasPromotions,
        hasCoupons: plan.hasCoupons,
        description: plan.description || ''
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: 'free',
        price: '',
        maxItems: '',
        maxTables: '',
        maxStaff: '',
        hasWhatsapp: false,
        hasOnlineOrders: false,
        hasCustomDomain: false,
        hasAnalytics: false,
        hasTableQr: false,
        hasMultiLanguage: false,
        hasPromotions: false,
        hasCoupons: false,
        description: ''
      });
    }
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    try {
      const dataToSend = {
        ...planForm,
        price: parseFloat(planForm.price) || 0,
        maxItems: parseInt(planForm.maxItems) || 0,
        maxTables: parseInt(planForm.maxTables) || 0,
        maxStaff: parseInt(planForm.maxStaff) || 0,
      };

      if (editingPlan) {
        await api.put(`/plans/${editingPlan.id}`, dataToSend);
        toast.success('تم تحديث الخطة بنجاح');
      } else {
        await api.post('/plans', dataToSend);
        toast.success('تم إنشاء الخطة بنجاح');
      }
      setShowPlanModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخطة؟')) return;
    
    try {
      await api.delete(`/plans/${planId}`);
      toast.success('تم حذف الخطة بنجاح');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  // في PlansPage.tsx، قم بتحديث دالة sendUpgradeRequest

const sendUpgradeRequest = async () => {
  if (!selectedPlan) return;

  try {
    // ✅ إرسال البيانات بالشكل الصحيح
    await api.post('/admin/upgrade-request', {
      planId: selectedPlan.id,
      entityType: 'restaurant',
      entityId: user?.restaurantId,
      notes: `طلب ترقية من خطة ${currentPlan?.name} إلى خطة ${selectedPlan.name}`
    });

    toast.success('تم إرسال طلب الترقية بنجاح');
    setShowUpgradeModal(false);
    fetchMyRequests();
  } catch (error: any) {
    console.error('Error sending upgrade request:', error);
    toast.error(error.response?.data?.error || 'حدث خطأ في إرسال الطلب');
  }
};

  
const handleAdminUpgrade = async (requestId: string) => {
  try {
    await api.post(`/admin/approve-upgrade/${requestId}`);
    toast.success('تمت الموافقة على طلب الترقية بنجاح');
    fetchUpgradeRequests();
    
    // فتح واتساب للتواصل مع العميل بعد الموافقة
    const request = upgradeRequests.find(r => r.id === requestId);
    if (request?.userWhatsapp) {
      const message = `تمت الموافقة على طلب الترقية الخاص بك. شكراً لثقتك!`;
      window.open(`https://wa.me/${request.userWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    }
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'حدث خطأ');
  }
};

  const openRejectModal = (request: any) => {
    setSelectedRequest(request);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      await api.post('/admin/reject-upgrade', {
        requestId: selectedRequest.id,
        reason: rejectReason
      });
      
      toast.success('تم رفض الطلب');
      setShowRejectModal(false);
      fetchUpgradeRequests();
      
      // فتح واتساب للتواصل مع العميل بعد الرفض - استخدام رقم واتساب العميل
      if (selectedRequest.userWhatsapp) {
        const message = `نأسف، تم رفض طلب الترقية الخاص بك. ${rejectReason ? `السبب: ${rejectReason}` : ''}`;
        window.open(`https://wa.me/${selectedRequest.userWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const contactViaWhatsApp = (whatsapp: string, name: string) => {
    if (!whatsapp) {
      toast.error('رقم واتساب غير متوفر');
      return;
    }
    const message = `مرحباً ${name}، بخصوص طلب الترقية...`;
    window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
            <IoTime />
            قيد الانتظار
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
            <IoCheckmarkCircle />
            تمت الموافقة
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
            <IoCloseCircle />
            مرفوض
          </span>
        );
      default:
        return null;
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'free':
        return <IoStar className="text-gray-400" size={32} />;
      case 'basic':
        return <IoBusiness className="text-blue-500" size={32} />;
      case 'pro':
        return <IoRocket className="text-purple-500" size={32} />;
      default:
        return <IoStar />;
    }
  };

  const getPlanTitle = (planName: string) => {
    switch (planName) {
      case 'free':
        return 'المجانية';
      case 'basic':
        return 'الأساسية';
      case 'pro':
        return 'الاحترافية';
      default:
        return planName;
    }
  };

  const getCurrentPlanTitle = () => {
    if (!currentPlan) return 'مجانية';
    return getPlanTitle(currentPlan.name);
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">خطط الأسعار</h1>
        <p className="text-gray-600">
          اختر الخطة المناسبة لمطعمك واستمتع بالمميزات
        </p>
      </div>

      {/* شريط أدوات المسؤول */}
      {isSuperAdminUser && (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <IoSettings size={24} />
              <span className="font-bold">لوحة تحكم المسؤول - إدارة الخطط</span>
            </div>
            <Button
              variant="primary"
              onClick={() => handleOpenPlanModal()}
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              <IoAdd className="inline ml-1" />
              إضافة خطة جديدة
            </Button>
          </div>
        </div>
      )}

      {/* الخطة الحالية */}
      {currentPlan && !isSuperAdminUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-blue-600 font-semibold">خطتك الحالية:</span>
              <span className="text-lg font-bold mr-2">{getCurrentPlanTitle()}</span>
            </div>
            <div className="flex gap-2">
              {!isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => setShowMyRequests(true)}
                >
                  <IoEye className="inline ml-1" />
                  طلباتي
                </Button>
              )}
              {currentPlan.name !== 'pro' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const nextPlan = plans.find(p => 
                      p.name === 'pro' || (p.name === 'basic' && currentPlan.name === 'free')
                    );
                    if (nextPlan) handleUpgrade(nextPlan);
                  }}
                >
                  ترقية الخطة
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* بطاقات الخطط */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map(plan => {
          const isCurrentPlan = currentPlan?.id === plan.id && !isSuperAdminUser;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-lg overflow-hidden transform transition hover:scale-105 ${
                isCurrentPlan ? 'ring-2 ring-blue-500' : ''
              } ${isSuperAdminUser ? 'border-2 border-purple-200' : ''}`}
            >
              {/* رأس البطاقة */}
              <div className="p-6 text-center bg-gradient-to-br from-gray-50 to-gray-100 relative">
                {isSuperAdminUser && (
                  <div className="absolute top-2 left-2 flex gap-1">
                    <button
                      onClick={() => handleOpenPlanModal(plan)}
                      className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      title="تعديل الخطة"
                    >
                      <IoPencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                      title="حذف الخطة"
                    >
                      <IoTrash size={16} />
                    </button>
                  </div>
                )}
                {getPlanIcon(plan.name)}
                <h3 className="text-xl font-bold mt-2">
                  {getPlanTitle(plan.name)}
                </h3>
                <div className="mt-4">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold">مجاني</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-gray-500"> ر.س/شهر</span>
                    </>
                  )}
                </div>
              </div>

              {/* المميزات */}
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <IoCheckmark className="text-green-500 ml-2" size={20} />
                    <span>عدد العناصر: {plan.maxItems === 999999 ? 'غير محدود' : plan.maxItems}</span>
                  </li>
                  <li className="flex items-center">
                    <IoCheckmark className="text-green-500 ml-2" size={20} />
                    <span>عدد الطاولات: {plan.maxTables === 999999 ? 'غير محدود' : plan.maxTables}</span>
                  </li>
                  <li className="flex items-center">
                    <IoCheckmark className="text-green-500 ml-2" size={20} />
                    <span>عدد الموظفين: {plan.maxStaff}</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasWhatsapp ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>زر واتساب</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasOnlineOrders ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>طلبات أونلاين</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasCustomDomain ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>دومين خاص</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasAnalytics ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>إحصائيات متقدمة</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasTableQr ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>QR للطاولات</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasMultiLanguage ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>لغات متعددة</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasPromotions ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>عروض وخصومات</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasCoupons ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>كوبونات</span>
                  </li>
                </ul>

                {plan.description && (
                  <p className="text-sm text-gray-500 mt-4 border-t pt-4">
                    {plan.description}
                  </p>
                )}

                {/* زر الاختيار - يظهر فقط للمستخدمين العاديين */}
                {!isSuperAdminUser && (
                  isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full mt-6 bg-gray-300 text-gray-600 py-2 rounded-lg cursor-not-allowed"
                    >
                      خطتك الحالية
                    </button>
                  ) : (
                    <Button
                      variant={plan.price === 0 ? 'outline' : 'primary'}
                      onClick={() => handleUpgrade(plan)}
                      fullWidth
                      className="mt-6"
                    >
                      {plan.price === 0 ? 'الاشتراك مجاني' : 'ترقية الآن'}
                    </Button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* مودال إدارة الخطط للمسؤول */}
      <Modal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title={editingPlan ? 'تعديل خطة' : 'إضافة خطة جديدة'}
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto p-2">
        <div>
  <label className="block text-sm font-medium mb-1">اسم الخطة</label>
  <input
    type="text"
    value={planForm.name}
    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
    className="w-full p-2 border rounded"
    placeholder="أدخل اسم الخطة (مثال: premium)"
    required
  />
  <p className="text-xs text-gray-500 mt-1">
    يمكنك إدخال أي اسم جديد للخطة (free, basic, pro, premium, enterprise, etc.)
  </p>
</div>

          <div>
            <label className="block text-sm font-medium mb-1">السعر (ر.س)</label>
            <input
              type="number"
              step="0.01"
              value={planForm.price}
              onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الحد الأقصى للعناصر</label>
              <input
                type="number"
                value={planForm.maxItems}
                onChange={(e) => setPlanForm({ ...planForm, maxItems: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الحد الأقصى للطاولات</label>
              <input
                type="number"
                value={planForm.maxTables}
                onChange={(e) => setPlanForm({ ...planForm, maxTables: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الحد الأقصى للموظفين</label>
            <input
              type="number"
              value={planForm.maxStaff}
              onChange={(e) => setPlanForm({ ...planForm, maxStaff: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold mb-2">المميزات</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasWhatsapp}
                  onChange={(e) => setPlanForm({ ...planForm, hasWhatsapp: e.target.checked })}
                  className="ml-2"
                />
                <span>زر واتساب</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasOnlineOrders}
                  onChange={(e) => setPlanForm({ ...planForm, hasOnlineOrders: e.target.checked })}
                  className="ml-2"
                />
                <span>طلبات أونلاين</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasCustomDomain}
                  onChange={(e) => setPlanForm({ ...planForm, hasCustomDomain: e.target.checked })}
                  className="ml-2"
                />
                <span>دومين خاص</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasAnalytics}
                  onChange={(e) => setPlanForm({ ...planForm, hasAnalytics: e.target.checked })}
                  className="ml-2"
                />
                <span>إحصائيات متقدمة</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasTableQr}
                  onChange={(e) => setPlanForm({ ...planForm, hasTableQr: e.target.checked })}
                  className="ml-2"
                />
                <span>QR للطاولات</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasMultiLanguage}
                  onChange={(e) => setPlanForm({ ...planForm, hasMultiLanguage: e.target.checked })}
                  className="ml-2"
                />
                <span>لغات متعددة</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasPromotions}
                  onChange={(e) => setPlanForm({ ...planForm, hasPromotions: e.target.checked })}
                  className="ml-2"
                />
                <span>عروض وخصومات</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasCoupons}
                  onChange={(e) => setPlanForm({ ...planForm, hasCoupons: e.target.checked })}
                  className="ml-2"
                />
                <span>كوبونات</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الوصف</label>
            <textarea
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>

          <Button
            variant="primary"
            onClick={handleSavePlan}
            fullWidth
          >
            حفظ
          </Button>
        </div>
      </Modal>

      {/* مودال طلباتي */}
      <Modal
        isOpen={showMyRequests}
        onClose={() => setShowMyRequests(false)}
        title="طلبات الترقية الخاصة بي"
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto p-2">
          {myRequests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">لا توجد طلبات سابقة</p>
          ) : (
            myRequests.map((req: any) => (
              <div key={req.id} className="border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold">طلب ترقية إلى خطة {req.planName}</h3>
                    <p className="text-sm text-gray-500">
                      تاريخ الطلب: {format(new Date(req.createdAt), 'dd/MM/yyyy hh:mm a', { locale: ar })}
                    </p>
                  </div>
                  {getStatusBadge(req.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-gray-500">المبلغ:</span>
                    <span className="font-bold mr-2 text-green-600">{req.price} ر.س</span>
                  </div>
                  {req.status === 'approved' && req.approvedAt && (
                    <div>
                      <span className="text-gray-500">تاريخ الموافقة:</span>
                      <span className="mr-2">{format(new Date(req.approvedAt), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                  {req.status === 'rejected' && req.reason && (
                    <div className="col-span-2 mt-2 p-3 bg-red-50 rounded-lg">
                      <span className="text-gray-700 font-medium">سبب الرفض:</span>
                      <p className="text-red-600 mt-1">{req.reason}</p>
                    </div>
                  )}
                </div>

                {/* زر التواصل مع الدعم */}
                {req.status === 'pending' && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const whatsappNumber = user?.restaurant?.whatsapp || import.meta.env.VITE_WHATSAPP || '966500000000';
                        const message = `استفسار بخصوص طلب الترقية إلى خطة ${req.planName}`;
                        window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                    >
                      <IoLogoWhatsapp className="inline ml-1" />
                      التواصل مع الدعم
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* مودال تأكيد الترقية */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="طلب ترقية الخطة"
      >
        {selectedPlan && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <IoWarning className="text-yellow-500 ml-2" size={24} />
                <div>
                  <h3 className="font-semibold mb-1">إجراءات الترقية</h3>
                  <p className="text-sm text-gray-600">
                    سيتم إرسال طلب ترقية إلى المسؤول. بعد الدفع، سيقوم المسؤول بتفعيل خطتك الجديدة.
                  </p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">ملخص الترقية:</h4>
              <p>الخطة الحالية: <span className="font-bold">{getCurrentPlanTitle()}</span></p>
              <p>الخطة الجديدة: <span className="font-bold text-blue-600">{getPlanTitle(selectedPlan.name)}</span></p>
              <p className="mt-2">المبلغ: <span className="text-xl font-bold text-green-600">{selectedPlan.price} ر.س</span>/شهر</p>
            </div>

            <div className="flex space-x-2 rtl:space-x-reverse">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeModal(false)}
                fullWidth
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={sendUpgradeRequest}
                fullWidth
              >
                <IoSend className="inline ml-1" />
                إرسال طلب الترقية
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* مودال رفض الطلب */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="رفض طلب الترقية"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <IoWarning className="text-red-500 ml-2" size={24} />
                <div>
                  <h3 className="font-semibold mb-1">تأكيد الرفض</h3>
                  <p className="text-sm text-gray-600">
                    سيتم رفض طلب الترقية للعميل {selectedRequest.userName} إلى خطة {selectedRequest.planName}
                  </p>
                </div>
              </div>
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

            <div className="flex space-x-2 rtl:space-x-reverse">
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
                fullWidth
              >
                إلغاء
              </Button>
              <Button
                variant="danger"
                onClick={handleRejectRequest}
                fullWidth
              >
                تأكيد الرفض
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* لوحة تحكم الأدمن - طلبات الترقية */}
      {isAdmin && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">طلبات الترقية</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right">المستخدم</th>
                  <th className="px-6 py-3 text-right">رقم واتساب</th>
                  <th className="px-6 py-3 text-right">الخطة المطلوبة</th>
                  <th className="px-6 py-3 text-right">المبلغ</th>
                  <th className="px-6 py-3 text-right">التاريخ</th>
                  <th className="px-6 py-3 text-right">الحالة</th>
                  <th className="px-6 py-3 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {upgradeRequests.map((req: any) => (
                  <tr key={req.id}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{req.userName}</p>
                        <p className="text-xs text-gray-500">{req.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
  {req.userWhatsapp ? (
    <button
      onClick={() => contactViaWhatsApp(req.userWhatsapp, req.userName)}
      className="flex items-center gap-1 text-green-600 hover:text-green-700"
    >
      <IoLogoWhatsapp />
      {req.userWhatsapp}
    </button>
  ) : (
    <span className="text-gray-400">غير متوفر</span>
  )}
</td>
                    <td className="px-6 py-4 font-medium">{req.planName}</td>
                    <td className="px-6 py-4 text-green-600 font-bold">{req.price} ر.س</td>
                    <td className="px-6 py-4 text-sm">
                      {format(new Date(req.createdAt), 'dd/MM/yyyy hh:mm a', { locale: ar })}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4">
                      {req.status === 'pending' && (
                        <div className="flex space-x-2 rtl:space-x-reverse">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleAdminUpgrade(req.id, req.userId, req.planId)}
                          >
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openRejectModal(req)}
                          >
                            رفض
                          </Button>
                          {req.userWhatsapp && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => contactViaWhatsApp(req.userWhatsapp, req.userName)}
                            >
                              <IoChatbubbleEllipses />
                            </Button>
                          )}
                        </div>
                      )}
                      {req.status === 'rejected' && req.reason && (
                        <div className="text-sm text-red-600 max-w-xs">
                          السبب: {req.reason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansPage;