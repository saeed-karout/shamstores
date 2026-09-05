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

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', yellow: '#FBBF24',
};

// ✅ تحديث الـ Interface ليتوافق مع البيانات الفعلية من API
interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  billingCycle: string | null;
  maxRestaurants: number;
  maxStores: number;
  maxUsers: number;
  maxMenuItems: number;
  maxProducts: number;
  maxOrders: number;
  features: any;
  isActive: boolean;
  position: number;
  isPopular: boolean;
  hasWhatsapp: boolean;
  hasOnlineOrders: boolean;
  hasCustomDomain: boolean;
  hasAnalytics: boolean;
  hasTableQr: boolean;
  hasMultiLanguage: boolean;
  hasPromotions: boolean;
  hasCoupons: boolean;
  hasBrandingRemoval?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UpgradeRequest {
  id: string;
  userId: string;
  // ⚠️ اختيارية عمداً: الخادم يجمعها من جداول منفصلة (النموذج بلا علاقات)،
  // وحساب محذوف أو خطة مُزالة تُنتج صفاً ناقصاً لا صفاً مفقوداً.
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string;
  userWhatsapp?: string | null;
  businessName?: string | null;
  planId?: string;
  planName?: string | null;
  price?: number;
  priceUsd?: number | null;
  priceSyp?: number | null;
  currentPlanName?: string | null;
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

  // ✅ تحديث formData ليتوافق مع الحقول الفعلية
  const [formData, setFormData] = useState<Partial<Plan>>({
    name: '',
    price: 0,
    maxMenuItems: 20,
    maxProducts: 50,
    maxOrders: 100,
    maxUsers: 5,
    maxRestaurants: 1,
    maxStores: 1,
    description: '',
    isActive: true,
    position: 0,
    isPopular: false,
    hasWhatsapp: false,
    hasOnlineOrders: false,
    hasCustomDomain: false,
    hasAnalytics: false,
    hasTableQr: false,
    hasMultiLanguage: false,
    hasPromotions: false,
    hasCoupons: false,
    hasBrandingRemoval: false
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
      const plansData = response?.data?.data || response?.data || response || [];
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('فشل تحميل الخطط');
      setPlans([]);
    }
  };

  const fetchUpgradeRequests = async () => {
    try {
      const response = await api.get('/admin/upgrade-requests');
      const requestsData = response?.data?.data || response?.data || response || [];
      setUpgradeRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (error) {
      console.error('Error fetching upgrade requests:', error);
      setUpgradeRequests([]);
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
        name: '', price: 0, maxMenuItems: 20, maxProducts: 50, maxOrders: 100,
        maxUsers: 5, maxRestaurants: 1, maxStores: 1, description: '', isActive: true,
        position: 0, isPopular: false,
        hasWhatsapp: false, hasOnlineOrders: false, hasCustomDomain: false,
        hasAnalytics: false, hasTableQr: false, hasMultiLanguage: false,
        hasPromotions: false, hasCoupons: false, hasBrandingRemoval: false
      });
      fetchPlans();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.error || 'فشل حفظ الخطة');
    }
  };

  const deletePlan = async (id: string, name: string) => {
    if (window.confirm(`⚠️ هل أنت متأكد من حذف خطة "${name}"؟\n\nقد تؤثر هذه العملية على المطاعم والمتاجر المشتركة في هذه الخطة.`)) {
      try {
        await api.delete(`/plans/${id}`);
        toast.success('تم حذف الخطة بنجاح');
        fetchPlans();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'فشل حذف الخطة');
      }
    }
  };

  const approveRequest = async (requestId: string) => {
    try {
      await api.post(`/admin/approve-upgrade/${requestId}`);
      toast.success('تمت الموافقة على طلب الترقية بنجاح');
      fetchUpgradeRequests();
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', background: 'rgba(251,191,36,0.12)', color: C.yellow, borderRadius: 999, fontSize: 12 }}>
            <IoTime size={12} />
            قيد الانتظار
          </span>
        );
      case 'approved':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', background: 'rgba(200,226,53,0.12)', color: C.accent, borderRadius: 999, fontSize: 12 }}>
            <IoCheckmarkCircle size={12} />
            تمت الموافقة
          </span>
        );
      case 'rejected':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', background: 'rgba(255,107,107,0.12)', color: C.red, borderRadius: 999, fontSize: 12 }}>
            <IoCloseCircle size={12} />
            مرفوض
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) return <Loader fullScreen />;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: C.surf,
    border: '1px solid ' + C.border,
    borderRadius: 10,
    color: C.text,
    fontFamily: 'Cairo, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: C.text, fontWeight: 700, fontSize: 22, margin: 0 }}>💰 إدارة المنصة</h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>إدارة الخطط وطلبات الترقية</p>
        </div>
        <button
          onClick={() => fetchData()}
          style={{
            background: C.surf, color: C.muted, padding: '8px 16px', borderRadius: 10,
            border: '1px solid ' + C.border, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Cairo, sans-serif'
          }}
        >
          <IoRefresh size={20} />
          تحديث
        </button>
      </div>

      {/* تبويبات */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid ' + C.border, paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('plans')}
          style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif', fontSize: 14,
            background: activeTab === 'plans' ? C.accent : C.surf,
            color: activeTab === 'plans' ? C.bg : C.muted,
            fontWeight: activeTab === 'plans' ? 700 : 400,
          }}
        >
          📋 الخطط والاشتراكات
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif', fontSize: 14,
            background: activeTab === 'requests' ? C.accent : C.surf,
            color: activeTab === 'requests' ? C.bg : C.muted,
            fontWeight: activeTab === 'requests' ? 700 : 400,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          📨 طلبات الترقية
          {upgradeRequests.filter(r => r.status === 'pending').length > 0 && (
            <span style={{
              marginRight: 6,
              background: C.red,
              color: '#fff',
              fontSize: 11,
              padding: '1px 8px',
              borderRadius: 999
            }}>
              {upgradeRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* ==================== تبويب الخطط ==================== */}
      {activeTab === 'plans' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => {
                setEditingPlan(null);
                setFormData({
                  name: '', price: 0, maxMenuItems: 20, maxProducts: 50, maxOrders: 100,
                  maxUsers: 5, maxRestaurants: 1, maxStores: 1, description: '', isActive: true,
                  position: 0, isPopular: false,
                  hasWhatsapp: false, hasOnlineOrders: false, hasCustomDomain: false,
                  hasAnalytics: false, hasTableQr: false, hasMultiLanguage: false,
                  hasPromotions: false, hasCoupons: false
                });
                setShowModal(true);
              }}
              style={{
                background: C.accent, color: C.bg, padding: '8px 16px', borderRadius: 10,
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'Cairo, sans-serif', fontWeight: 700
              }}
            >
              <IoAdd size={20} />
              خطة جديدة
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {plans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  background: C.card,
                  border: `1px solid ${plan.isActive ? C.border : C.red}`,
                  borderRadius: 16,
                  overflow: 'hidden',
                  opacity: plan.isActive ? 1 : 0.7,
                }}
              >
                <div style={{
                  padding: 16,
                  background: plan.isActive
                    ? `linear-gradient(135deg, ${C.accent}15, ${C.accent}05)`
                    : `rgba(156,163,175,0.08)`,
                  borderBottom: '1px solid ' + C.border,
                  position: 'relative',
                }}>
                  {!plan.isActive && (
                    <span style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: C.red,
                      color: '#fff',
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 20,
                    }}>
                      غير نشط
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <h3 style={{ color: C.text, fontWeight: 700, fontSize: 18, margin: 0 }}>{plan.name}</h3>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(200,226,53,0.12)', color: C.accent, borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, background: C.accent, color: C.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>ش</span>
                      شام ستورز
                    </span>
                  </div>
                  <p style={{ color: C.accent, fontSize: 28, fontWeight: 700, margin: '8px 0 0' }}>
                    {plan.price} ر.س <span style={{ fontSize: 13, color: C.muted }}>/ شهر</span>
                  </p>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: C.muted }}>المنتجات/الأصناف:</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{plan.maxMenuItems === 999999 ? '♾️ غير محدود' : plan.maxMenuItems}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: C.muted }}>المنتجات (متجر):</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{plan.maxProducts === 999999 ? '♾️ غير محدود' : plan.maxProducts}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: C.muted }}>الطلبات:</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{plan.maxOrders === 999999 ? '♾️ غير محدود' : plan.maxOrders}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: C.muted }}>المستخدمين:</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{plan.maxUsers === 999999 ? '♾️ غير محدود' : plan.maxUsers}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: C.muted }}>المطاعم:</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{plan.maxRestaurants === 999999 ? '♾️ غير محدود' : plan.maxRestaurants}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: C.muted }}>المتاجر:</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{plan.maxStores === 999999 ? '♾️ غير محدود' : plan.maxStores}</span>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 12, marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {plan.hasWhatsapp && <span style={{ fontSize: 11, background: `${C.accent}20`, color: C.accent, padding: '2px 8px', borderRadius: 20 }}>✓ واتساب</span>}
                    {plan.hasOnlineOrders && <span style={{ fontSize: 11, background: `${C.accent}20`, color: C.accent, padding: '2px 8px', borderRadius: 20 }}>✓ طلبات أونلاين</span>}
                    {plan.hasCustomDomain && <span style={{ fontSize: 11, background: `${C.accent}20`, color: C.accent, padding: '2px 8px', borderRadius: 20 }}>✓ دومين مخصص</span>}
                    {plan.hasAnalytics && <span style={{ fontSize: 11, background: `${C.accent}20`, color: C.accent, padding: '2px 8px', borderRadius: 20 }}>✓ تحليلات</span>}
                    {plan.hasTableQr && <span style={{ fontSize: 11, background: `${C.accent}20`, color: C.accent, padding: '2px 8px', borderRadius: 20 }}>✓ QR للطاولات</span>}
                    {plan.hasMultiLanguage && <span style={{ fontSize: 11, background: `${C.accent}20`, color: C.accent, padding: '2px 8px', borderRadius: 20 }}>✓ لغات متعددة</span>}
                    {plan.hasPromotions && <span style={{ fontSize: 11, background: `${C.accent}20`, color: C.accent, padding: '2px 8px', borderRadius: 20 }}>✓ عروض</span>}
                    {plan.hasCoupons && <span style={{ fontSize: 11, background: `${C.accent}20`, color: C.accent, padding: '2px 8px', borderRadius: 20 }}>✓ كوبونات</span>}
                    {plan.hasBrandingRemoval && <span style={{ fontSize: 11, background: `${C.accent}20`, color: C.accent, padding: '2px 8px', borderRadius: 20 }}>✓ إزالة شعار شام ستورز</span>}
                  </div>
                  {plan.description && (
                    <p style={{ color: C.muted, fontSize: 12, marginTop: 12, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                      {plan.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button
                      onClick={() => {
                        setEditingPlan(plan);
                        setFormData(plan);
                        setShowModal(true);
                      }}
                      style={{
                        flex: 1, background: C.accent, color: C.bg, padding: '8px 0', borderRadius: 10,
                        border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'Cairo, sans-serif', fontWeight: 700
                      }}
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => deletePlan(plan.id, plan.name)}
                      style={{
                        flex: 1, background: C.red, color: '#fff', padding: '8px 0', borderRadius: 10,
                        border: 'none', cursor: 'pointer', fontSize: 13,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        fontFamily: 'Cairo, sans-serif'
                      }}
                    >
                      <IoTrash size={14} /> حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {plans.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
              لا توجد خطط حالياً. قم بإضافة خطة جديدة.
            </div>
          )}
        </>
      )}

      {/* ==================== تبويب طلبات الترقية ==================== */}
      {activeTab === 'requests' && (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{
            padding: 16,
            background: `linear-gradient(135deg, ${C.purple}15, ${C.purple}05)`,
            borderBottom: '1px solid ' + C.border,
          }}>
            <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, margin: 0 }}>📋 طلبات ترقية الخطط</h2>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>مراجعة وقبول أو رفض طلبات ترقية العملاء</p>
          </div>

          {upgradeRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 64, height: 64, background: C.surf, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IoEye size={32} style={{ color: C.muted }} />
              </div>
              <p style={{ color: C.muted }}>لا توجد طلبات ترقية</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.surf }}>
                    <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>المستخدم</th>
                    <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>واتساب</th>
                    <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الخطة الحالية</th>
                    <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الخطة المطلوبة</th>
                    <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>المبلغ</th>
                    <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>التاريخ</th>
                    <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الحالة</th>
                    <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {upgradeRequests.map((req) => (
                    <tr
                      key={req.id}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      style={{ borderBottom: '1px solid ' + C.border }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ color: C.text, fontWeight: 600, margin: 0 }}>
                          {req.userName || 'مستخدم محذوف'}
                        </p>
                        {req.businessName && (
                          <p style={{ color: C.accent, fontSize: 12, margin: 0 }}>{req.businessName}</p>
                        )}
                        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{req.userEmail}</p>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {req.userWhatsapp ? (
                          <button
                            onClick={() => contactViaWhatsApp(req.userWhatsapp!, req.userName || '', req.planName || '')}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                          >
                            <IoLogoWhatsapp size={16} />
                            <span style={{ fontSize: 13 }}>{req.userWhatsapp}</span>
                          </button>
                        ) : (
                          <span style={{ color: C.muted, fontSize: 13 }}>غير متوفر</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: C.text, fontSize: 13 }}>
                        {req.currentPlanName || 'مجاني'}
                      </td>
                      <td style={{ padding: '12px 16px', color: C.blue, fontWeight: 600 }}>
                        {req.planName || '—'}
                      </td>
                      {/* ⚠️ كان مكتوباً «ر.س» ثابتاً. أسعار الخطط مخزَّنة
                          بالدولار وحدة حساب، والتاجر يدفع بالليرة عبر سعر
                          الصرف الموحّد — والخادم يرسل الرقمين معاً. */}
                      <td style={{ padding: '12px 16px', color: C.accent, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {req.priceSyp != null
                          ? `${req.priceSyp.toLocaleString('en-US')} ل.س`
                          : req.priceUsd != null
                            ? `$${req.priceUsd}`
                            : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>
                        {format(new Date(req.createdAt), 'dd/MM/yyyy', { locale: ar })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {getStatusBadge(req.status)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {req.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => approveRequest(req.id)}
                              style={{ background: C.accent, color: C.bg, padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
                            >
                              قبول
                            </button>
                            <button
                              onClick={() => openRejectModal(req)}
                              style={{ background: C.red, color: '#fff', padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo, sans-serif' }}
                            >
                              رفض
                            </button>
                            {req.userWhatsapp && (
                              <button
                                onClick={() => contactViaWhatsApp(req.userWhatsapp!, req.userName || '', req.planName || '')}
                                style={{ background: C.surf, color: C.muted, padding: '4px 10px', borderRadius: 8, border: '1px solid ' + C.border, cursor: 'pointer' }}
                                title="تواصل عبر واتساب"
                              >
                                <IoChatbubbleEllipses size={16} />
                              </button>
                            )}
                          </div>
                        )}
                        {req.status === 'rejected' && req.reason && (
                          <div style={{ color: C.red, fontSize: 12, maxWidth: 200 }}>
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
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingPlan ? '✏️ تعديل خطة' : '➕ إضافة خطة جديدة'} size="lg">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>اسم الخطة *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>السعر (ر.س) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>المنتجات/الأصناف (0 = غير محدود)</label>
              <input
                type="number"
                value={formData.maxMenuItems}
                onChange={(e) => setFormData({ ...formData, maxMenuItems: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>المنتجات (متجر)</label>
              <input
                type="number"
                value={formData.maxProducts}
                onChange={(e) => setFormData({ ...formData, maxProducts: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>الطلبات</label>
              <input
                type="number"
                value={formData.maxOrders}
                onChange={(e) => setFormData({ ...formData, maxOrders: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>المستخدمين</label>
              <input
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData({ ...formData, maxUsers: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>المطاعم</label>
              <input
                type="number"
                value={formData.maxRestaurants}
                onChange={(e) => setFormData({ ...formData, maxRestaurants: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>المتاجر</label>
              <input
                type="number"
                value={formData.maxStores}
                onChange={(e) => setFormData({ ...formData, maxStores: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>الترتيب</label>
              <input
                type="number"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>الحالة</label>
              <select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                style={inputStyle}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>الوصف</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical' }}
                rows={2}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 16, marginTop: 16 }}>
            <h4 style={{ color: C.text, fontWeight: 700, marginBottom: 12, marginTop: 0 }}>الميزات</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {[
                { key: 'hasWhatsapp', label: 'واتساب متكامل' },
                { key: 'hasOnlineOrders', label: 'طلبات أونلاين' },
                { key: 'hasCustomDomain', label: 'دومين مخصص' },
                { key: 'hasAnalytics', label: 'تحليلات متقدمة' },
                { key: 'hasTableQr', label: 'رموز QR للطاولات' },
                { key: 'hasMultiLanguage', label: 'دعم لغات متعددة' },
                { key: 'hasPromotions', label: 'عروض ترويجية' },
                { key: 'hasCoupons', label: 'كوبونات خصم' },
                { key: 'hasBrandingRemoval', label: 'إزالة شعار شام ستورز' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={(formData as any)[key] || false}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 20px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer' }}>
              إلغاء
            </button>
            <button type="submit" style={{ padding: '8px 24px', background: C.accent, border: 'none', borderRadius: 8, color: C.bg, cursor: 'pointer', fontWeight: 600 }}>
              {editingPlan ? 'تحديث' : 'إضافة'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal رفض الطلب */}
      {showRejectModal && selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, maxWidth: 420, width: '100%', padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, background: 'rgba(255,107,107,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <IoCloseCircle size={32} style={{ color: C.red }} />
              </div>
              <h3 style={{ color: C.text, fontWeight: 700, fontSize: 18, margin: 0 }}>رفض طلب الترقية</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>
                رفض طلب {selectedRequest.userName} إلى خطة {selectedRequest.planName}
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 8 }}>سبب الرفض (اختياري)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="اكتب سبب الرفض هنا..."
                style={{
                  width: '100%', padding: '12px', boxSizing: 'border-box',
                  background: C.surf, border: `1px solid ${C.border}`,
                  borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', outline: 'none',
                  resize: 'vertical',
                }}
                rows={4}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ flex: 1, background: C.surf, color: C.muted, padding: '10px 0', borderRadius: 10, border: `1px solid ${C.border}`, cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                onClick={handleRejectRequest}
                style={{ flex: 1, background: C.red, color: '#fff', padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700 }}
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