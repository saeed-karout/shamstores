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
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

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
        name: '', price: 0, maxItems: 20, maxTables: 1, maxStaff: 0,
        hasWhatsapp: false, hasOnlineOrders: false, hasCustomDomain: false,
        hasAnalytics: false, hasTableQr: false, hasMultiLanguage: false,
        hasPromotions: false, hasCoupons: false, description: '', isActive: true
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', background: 'rgba(251,191,36,0.12)', color: '#FBB924', borderRadius: 999, fontSize: 12 }}>
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
        <h1 style={{ color: C.text, fontWeight: 700, fontSize: 22, margin: 0 }}>إدارة المنصة</h1>
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
          الخطط والاشتراكات
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
          طلبات الترقية
          {upgradeRequests.filter(r => r.status === 'pending').length > 0 && (
            <span style={{ marginRight: 6, background: C.red, color: '#fff', fontSize: 11, padding: '1px 8px', borderRadius: 999 }}>
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
                  name: '', price: 0, maxItems: 20, maxTables: 1, maxStaff: 0,
                  hasWhatsapp: false, hasOnlineOrders: false, hasCustomDomain: false,
                  hasAnalytics: false, hasTableQr: false, hasMultiLanguage: false,
                  hasPromotions: false, hasCoupons: false, description: '', isActive: true
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {plans.map((plan) => (
              <div key={plan.id} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, overflow: 'hidden' }}>
                <div style={{
                  padding: 16,
                  background: plan.isActive
                    ? 'linear-gradient(135deg, rgba(200,226,53,0.15), rgba(200,226,53,0.05))'
                    : 'rgba(156,163,175,0.08)',
                  borderBottom: '1px solid ' + C.border,
                }}>
                  <h3 style={{ color: C.text, fontWeight: 700, fontSize: 18, margin: 0 }}>{plan.name}</h3>
                  <p style={{ color: C.accent, fontSize: 24, fontWeight: 700, margin: '8px 0 0' }}>
                    {plan.price} ل.س <span style={{ fontSize: 13, color: C.muted }}>/ شهر</span>
                  </p>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: C.muted }}>المنتجات/الأصناف:</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{plan.maxItems === 0 ? 'غير محدود' : plan.maxItems}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: C.muted }}>الطاولات:</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{plan.maxTables === 0 ? 'غير محدود' : plan.maxTables}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: C.muted }}>الموظفين:</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{plan.maxStaff === 0 ? 'غير محدود' : plan.maxStaff}</span>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 12, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {plan.hasWhatsapp && <div style={{ fontSize: 13, color: C.accent }}>✓ واتساب متكامل</div>}
                    {plan.hasOnlineOrders && <div style={{ fontSize: 13, color: C.accent }}>✓ طلبات أونلاين</div>}
                    {plan.hasCustomDomain && <div style={{ fontSize: 13, color: C.accent }}>✓ دومين مخصص</div>}
                    {plan.hasAnalytics && <div style={{ fontSize: 13, color: C.accent }}>✓ تحليلات متقدمة</div>}
                    {plan.hasTableQr && <div style={{ fontSize: 13, color: C.accent }}>✓ رموز QR للطاولات</div>}
                    {plan.hasMultiLanguage && <div style={{ fontSize: 13, color: C.accent }}>✓ دعم لغات متعددة</div>}
                    {plan.hasPromotions && <div style={{ fontSize: 13, color: C.accent }}>✓ عروض ترويجية</div>}
                    {plan.hasCoupons && <div style={{ fontSize: 13, color: C.accent }}>✓ كوبونات خصم</div>}
                  </div>
                  {plan.description && <p style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>{plan.description}</p>}
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
        </>
      )}

      {/* ==================== تبويب طلبات الترقية ==================== */}
      {activeTab === 'requests' && (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{
            padding: 16,
            background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(167,139,250,0.05))',
            borderBottom: '1px solid ' + C.border,
          }}>
            <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, margin: 0 }}>طلبات ترقية الخطط</h2>
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
                        <p style={{ color: C.text, fontWeight: 600, margin: 0 }}>{req.userName}</p>
                        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{req.userEmail}</p>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {req.userWhatsapp ? (
                          <button
                            onClick={() => contactViaWhatsApp(req.userWhatsapp!, req.userName, req.planName)}
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
                        {(req as any).currentPlanName || 'مجاني'}
                      </td>
                      <td style={{ padding: '12px 16px', color: C.blue, fontWeight: 600 }}>{req.planName}</td>
                      <td style={{ padding: '12px 16px', color: C.accent, fontWeight: 700 }}>{req.price} ر.س</td>
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
                                onClick={() => contactViaWhatsApp(req.userWhatsapp!, req.userName, req.planName)}
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
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{
              padding: 16, borderBottom: '1px solid ' + C.border,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(200,226,53,0.1), rgba(200,226,53,0.03))',
            }}>
              <h3 style={{ color: C.text, fontWeight: 700, fontSize: 18, margin: 0 }}>{editingPlan ? 'تعديل خطة' : 'إضافة خطة جديدة'}</h3>
              <button onClick={() => setShowModal(false)} style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>اسم الخطة</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>السعر (ل.س)</label>
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
                    value={formData.maxItems}
                    onChange={(e) => setFormData({ ...formData, maxItems: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>الطاولات (0 = غير محدود)</label>
                  <input
                    type="number"
                    value={formData.maxTables}
                    onChange={(e) => setFormData({ ...formData, maxTables: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4 }}>الموظفين (0 = غير محدود)</label>
                  <input
                    type="number"
                    value={formData.maxStaff}
                    onChange={(e) => setFormData({ ...formData, maxStaff: Number(e.target.value) })}
                    style={inputStyle}
                  />
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

              <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 16 }}>
                <h4 style={{ color: C.text, fontWeight: 700, marginBottom: 12, marginTop: 0 }}>الميزات</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'hasWhatsapp', label: 'واتساب متكامل' },
                    { key: 'hasOnlineOrders', label: 'طلبات أونلاين' },
                    { key: 'hasCustomDomain', label: 'دومين مخصص' },
                    { key: 'hasAnalytics', label: 'تحليلات متقدمة' },
                    { key: 'hasTableQr', label: 'رموز QR للطاولات' },
                    { key: 'hasMultiLanguage', label: 'دعم لغات متعددة' },
                    { key: 'hasPromotions', label: 'عروض ترويجية' },
                    { key: 'hasCoupons', label: 'كوبونات خصم' },
                  ].map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={(formData as any)[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                        style={{ width: 16, height: 16 }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                <button
                  type="submit"
                  style={{ flex: 1, background: C.accent, color: C.bg, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
                >
                  {editingPlan ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, background: C.surf, color: C.muted, padding: '10px 0', borderRadius: 10, border: '1px solid ' + C.border, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal رفض الطلب */}
      {showRejectModal && selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, maxWidth: 400, width: '100%', padding: 24 }}>
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
                  background: C.surf, border: `2px solid ${C.border}`,
                  borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', outline: 'none',
                  resize: 'vertical',
                }}
                rows={4}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ flex: 1, background: C.surf, color: C.muted, padding: '10px 0', borderRadius: 10, border: '1px solid ' + C.border, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
              >
                إلغاء
              </button>
              <button
                onClick={handleRejectRequest}
                style={{ flex: 1, background: C.red, color: '#fff', padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
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
