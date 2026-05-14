// pages/Store/StorePlansPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
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
  IoSettings,
  IoBagOutline,
  IoCube,
  IoStatsChart,
  IoCloudOutline,
  IoShieldOutline,
  IoCartOutline,
  IoGiftOutline,
  IoBarChartOutline,
  IoLanguageOutline,
  IoSearchOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Plan {
  id: string;
  name: string;
  price: number;
  maxProducts: number;
  maxOrdersPerMonth: number;
  maxStaff: number;
  maxStorage: number;
  hasWhatsapp: boolean;
  hasOnlineOrders: boolean;
  hasCustomDomain: boolean;
  hasAnalytics: boolean;
  hasMultiLanguage: boolean;
  hasPromotions: boolean;
  hasCoupons: boolean;
  hasInventory: boolean;
  hasReturns: boolean;
  hasReviews: boolean;
  hasWishlist: boolean;
  hasCompare: boolean;
  hasSeo: boolean;
  hasEmailMarketing: boolean;
  hasAbandonedCart: boolean;
  hasBulkImport: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

const StorePlansPage: React.FC = () => {
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
    maxProducts: '',
    maxOrdersPerMonth: '',
    maxStaff: '',
    maxStorage: '',
    hasWhatsapp: false,
    hasOnlineOrders: false,
    hasCustomDomain: false,
    hasAnalytics: false,
    hasMultiLanguage: false,
    hasPromotions: false,
    hasCoupons: false,
    hasInventory: false,
    hasReturns: false,
    hasReviews: false,
    hasWishlist: false,
    hasCompare: false,
    hasSeo: false,
    hasEmailMarketing: false,
    hasAbandonedCart: false,
    hasBulkImport: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
    description: ''
  });

  const { user, isSuperAdmin } = useAuth();
  const { store } = useStore();

  useEffect(() => {
    fetchData();
    if (isSuperAdmin) {
      fetchUpgradeRequests();
    } else {
      fetchMyRequests();
    }
  }, [isSuperAdmin]);

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
        maxProducts: plan.maxProducts?.toString() || '',
        maxOrdersPerMonth: plan.maxOrdersPerMonth?.toString() || '',
        maxStaff: plan.maxStaff?.toString() || '',
        maxStorage: plan.maxStorage?.toString() || '',
        hasWhatsapp: plan.hasWhatsapp,
        hasOnlineOrders: plan.hasOnlineOrders,
        hasCustomDomain: plan.hasCustomDomain,
        hasAnalytics: plan.hasAnalytics,
        hasMultiLanguage: plan.hasMultiLanguage,
        hasPromotions: plan.hasPromotions,
        hasCoupons: plan.hasCoupons,
        hasInventory: plan.hasInventory,
        hasReturns: plan.hasReturns,
        hasReviews: plan.hasReviews,
        hasWishlist: plan.hasWishlist,
        hasCompare: plan.hasCompare,
        hasSeo: plan.hasSeo,
        hasEmailMarketing: plan.hasEmailMarketing,
        hasAbandonedCart: plan.hasAbandonedCart,
        hasBulkImport: plan.hasBulkImport,
        hasApiAccess: plan.hasApiAccess,
        hasPrioritySupport: plan.hasPrioritySupport,
        description: plan.description || ''
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: 'free',
        price: '',
        maxProducts: '',
        maxOrdersPerMonth: '',
        maxStaff: '',
        maxStorage: '',
        hasWhatsapp: false,
        hasOnlineOrders: false,
        hasCustomDomain: false,
        hasAnalytics: false,
        hasMultiLanguage: false,
        hasPromotions: false,
        hasCoupons: false,
        hasInventory: false,
        hasReturns: false,
        hasReviews: false,
        hasWishlist: false,
        hasCompare: false,
        hasSeo: false,
        hasEmailMarketing: false,
        hasAbandonedCart: false,
        hasBulkImport: false,
        hasApiAccess: false,
        hasPrioritySupport: false,
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
        maxProducts: parseInt(planForm.maxProducts) || 0,
        maxOrdersPerMonth: parseInt(planForm.maxOrdersPerMonth) || 0,
        maxStaff: parseInt(planForm.maxStaff) || 0,
        maxStorage: parseInt(planForm.maxStorage) || 100,
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

  const sendUpgradeRequest = async () => {
    if (!selectedPlan) return;

    try {
      await api.post('/admin/upgrade-request', {
        planId: selectedPlan.id,
        entityType: 'store',
        entityId: store?.id,
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
    <div className="p-6" dir="rtl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">📦 خطط المتجر</h1>
        <p className="text-gray-600">
          اختر الخطة المناسبة لمتجرك واستمتع بالمميزات
        </p>
      </div>

      {/* شريط أدوات المسؤول */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <IoSettings size={24} />
              <span className="font-bold">لوحة تحكم المسؤول - إدارة خطط المتاجر</span>
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
      {currentPlan && !isSuperAdmin && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-green-600 font-semibold">خطتك الحالية:</span>
              <span className="text-lg font-bold mr-2">{getCurrentPlanTitle()}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMyRequests(true)}
              >
                <IoEye className="inline ml-1" />
                طلباتي
              </Button>
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
          const isCurrentPlan = currentPlan?.id === plan.id && !isSuperAdmin;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden transform transition hover:scale-105 ${
                isCurrentPlan ? 'ring-2 ring-green-500' : ''
              } ${isSuperAdmin ? 'border-2 border-purple-200' : ''}`}
            >
              {/* رأس البطاقة */}
              <div className="p-6 text-center bg-gradient-to-br from-gray-50 to-gray-100 relative">
                {isSuperAdmin && (
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
                  {/* مميزات المتجر الأساسية */}
                  <li className="flex items-center">
                    <IoCheckmark className="text-green-500 ml-2" size={20} />
                    <span>عدد المنتجات: {plan.maxProducts === -1 || plan.maxProducts >= 999999 ? 'غير محدود' : plan.maxProducts}</span>
                  </li>
                  <li className="flex items-center">
                    <IoCheckmark className="text-green-500 ml-2" size={20} />
                    <span>الطلبات الشهرية: {plan.maxOrdersPerMonth === -1 || plan.maxOrdersPerMonth >= 999999 ? 'غير محدود' : plan.maxOrdersPerMonth}</span>
                  </li>
                  <li className="flex items-center">
                    <IoCheckmark className="text-green-500 ml-2" size={20} />
                    <span>عدد الموظفين: {plan.maxStaff}</span>
                  </li>
                  <li className="flex items-center">
                    <IoCheckmark className="text-green-500 ml-2" size={20} />
                    <span>مساحة التخزين: {plan.maxStorage} MB</span>
                  </li>
                  
                  {/* المميزات */}
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
                    <span>كوبونات خصم</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasInventory ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>نظام مخزون متقدم</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasReturns ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>نظام مرتجعات</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasReviews ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>تقييمات المنتجات</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasWishlist ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>قائمة الرغبات</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasCompare ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>مقارنة المنتجات</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasSeo ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>تحسين محركات البحث (SEO)</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasEmailMarketing ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>تسويق بالبريد الإلكتروني</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasAbandonedCart ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>استرداد السلة المتروكة</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasBulkImport ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>استيراد كميات كبيرة</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasApiAccess ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>API للدمج الخارجي</span>
                  </li>
                  <li className="flex items-center">
                    {plan.hasPrioritySupport ? (
                      <IoCheckmark className="text-green-500 ml-2" size={20} />
                    ) : (
                      <IoClose className="text-red-500 ml-2" size={20} />
                    )}
                    <span>دعم فني優先</span>
                  </li>
                </ul>

                {plan.description && (
                  <p className="text-sm text-gray-500 mt-4 border-t pt-4">
                    {plan.description}
                  </p>
                )}

                {/* زر الاختيار */}
                {!isSuperAdmin && (
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
        title={editingPlan ? '✏️ تعديل خطة' : '➕ إضافة خطة جديدة'}
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
              placeholder="أدخل اسم الخطة"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">السعر (ر.س/شهر)</label>
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
              <label className="block text-sm font-medium mb-1">الحد الأقصى للمنتجات</label>
              <input
                type="number"
                value={planForm.maxProducts}
                onChange={(e) => setPlanForm({ ...planForm, maxProducts: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الحد الأقصى للطلبات الشهرية</label>
              <input
                type="number"
                value={planForm.maxOrdersPerMonth}
                onChange={(e) => setPlanForm({ ...planForm, maxOrdersPerMonth: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الحد الأقصى للموظفين</label>
              <input
                type="number"
                value={planForm.maxStaff}
                onChange={(e) => setPlanForm({ ...planForm, maxStaff: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">مساحة التخزين (MB)</label>
              <input
                type="number"
                value={planForm.maxStorage}
                onChange={(e) => setPlanForm({ ...planForm, maxStorage: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold mb-2">مميزات المتجر</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasWhatsapp}
                  onChange={(e) => setPlanForm({ ...planForm, hasWhatsapp: e.target.checked })}
                  className="ml-2"
                />
                <span>واتساب</span>
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
                <span>إحصائيات</span>
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
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasInventory}
                  onChange={(e) => setPlanForm({ ...planForm, hasInventory: e.target.checked })}
                  className="ml-2"
                />
                <span>نظام مخزون</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasReturns}
                  onChange={(e) => setPlanForm({ ...planForm, hasReturns: e.target.checked })}
                  className="ml-2"
                />
                <span>نظام مرتجعات</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasReviews}
                  onChange={(e) => setPlanForm({ ...planForm, hasReviews: e.target.checked })}
                  className="ml-2"
                />
                <span>تقييمات</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasWishlist}
                  onChange={(e) => setPlanForm({ ...planForm, hasWishlist: e.target.checked })}
                  className="ml-2"
                />
                <span>قائمة رغبات</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasCompare}
                  onChange={(e) => setPlanForm({ ...planForm, hasCompare: e.target.checked })}
                  className="ml-2"
                />
                <span>مقارنة منتجات</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasSeo}
                  onChange={(e) => setPlanForm({ ...planForm, hasSeo: e.target.checked })}
                  className="ml-2"
                />
                <span>SEO</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasEmailMarketing}
                  onChange={(e) => setPlanForm({ ...planForm, hasEmailMarketing: e.target.checked })}
                  className="ml-2"
                />
                <span>تسويق إلكتروني</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasAbandonedCart}
                  onChange={(e) => setPlanForm({ ...planForm, hasAbandonedCart: e.target.checked })}
                  className="ml-2"
                />
                <span>استرداد السلة</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasBulkImport}
                  onChange={(e) => setPlanForm({ ...planForm, hasBulkImport: e.target.checked })}
                  className="ml-2"
                />
                <span>استيراد كميات</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasApiAccess}
                  onChange={(e) => setPlanForm({ ...planForm, hasApiAccess: e.target.checked })}
                  className="ml-2"
                />
                <span>API</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={planForm.hasPrioritySupport}
                  onChange={(e) => setPlanForm({ ...planForm, hasPrioritySupport: e.target.checked })}
                  className="ml-2"
                />
                <span>دعم優先</span>
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

          <Button variant="primary" onClick={handleSavePlan} fullWidth>
            حفظ
          </Button>
        </div>
      </Modal>

      {/* مودال طلباتي */}
      <Modal
        isOpen={showMyRequests}
        onClose={() => setShowMyRequests(false)}
        title="📋 طلبات الترقية الخاصة بي"
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
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* مودال تأكيد الترقية */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="🚀 طلب ترقية الخطة"
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
              <p>الخطة الجديدة: <span className="font-bold text-green-600">{getPlanTitle(selectedPlan.name)}</span></p>
              <p className="mt-2">المبلغ: <span className="text-xl font-bold text-green-600">{selectedPlan.price} ر.س</span>/شهر</p>
            </div>

            <div className="flex gap-3">
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
        title="❌ رفض طلب الترقية"
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

            <div className="flex gap-3">
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
      {isSuperAdmin && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">📋 طلبات ترقية المتاجر</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">المستخدم</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">الخطة المطلوبة</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">المبلغ</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">التاريخ</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">الحالة</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {upgradeRequests.map((req: any) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{req.userName}</p>
                          <p className="text-xs text-gray-500">{req.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{req.planName}</td>
                      <td className="px-6 py-4 text-green-600 font-bold">{req.price} ر.س</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(req.createdAt), 'dd/MM/yyyy', { locale: ar })}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4">
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleAdminUpgrade(req.id)}
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
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {upgradeRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        لا توجد طلبات ترقية حالياً
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePlansPage;