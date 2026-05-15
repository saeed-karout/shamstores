import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
import { IoCheckmark, IoClose, IoRocket, IoBusiness, IoStar, IoWarning, IoLogoWhatsapp, IoSend, IoTime, IoCheckmarkCircle, IoCloseCircle, IoEye, IoChatbubbleEllipses, IoAdd, IoPencil, IoTrash, IoSettings } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  prim:   '#0D4A3A',
  surf:   '#0F3D31',
  accent: '#C8E235',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
  yellow: '#FBBF24',
  blue:   '#60A5FA',
};

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'block', color: C.muted, fontSize: 13, marginBottom: 6 };

interface Plan {
  id: string; name: string; price: number; maxProducts: number; maxOrdersPerMonth: number; maxStaff: number; maxStorage: number;
  hasWhatsapp: boolean; hasOnlineOrders: boolean; hasCustomDomain: boolean; hasAnalytics: boolean; hasMultiLanguage: boolean;
  hasPromotions: boolean; hasCoupons: boolean; hasInventory: boolean; hasReturns: boolean; hasReviews: boolean;
  hasWishlist: boolean; hasCompare: boolean; hasSeo: boolean; hasEmailMarketing: boolean; hasAbandonedCart: boolean;
  hasBulkImport: boolean; hasApiAccess: boolean; hasPrioritySupport: boolean; description?: string; isActive: boolean; createdAt: string;
}

const FEATURES: { key: string; label: string }[] = [
  { key: 'hasWhatsapp', label: 'زر واتساب' }, { key: 'hasOnlineOrders', label: 'طلبات أونلاين' },
  { key: 'hasCustomDomain', label: 'دومين خاص' }, { key: 'hasAnalytics', label: 'إحصائيات متقدمة' },
  { key: 'hasMultiLanguage', label: 'لغات متعددة' }, { key: 'hasPromotions', label: 'عروض وخصومات' },
  { key: 'hasCoupons', label: 'كوبونات خصم' }, { key: 'hasInventory', label: 'نظام مخزون متقدم' },
  { key: 'hasReturns', label: 'نظام مرتجعات' }, { key: 'hasReviews', label: 'تقييمات المنتجات' },
  { key: 'hasWishlist', label: 'قائمة الرغبات' }, { key: 'hasCompare', label: 'مقارنة المنتجات' },
  { key: 'hasSeo', label: 'تحسين SEO' }, { key: 'hasEmailMarketing', label: 'تسويق بالبريد' },
  { key: 'hasAbandonedCart', label: 'استرداد السلة' }, { key: 'hasBulkImport', label: 'استيراد كميات' },
  { key: 'hasApiAccess', label: 'API خارجي' }, { key: 'hasPrioritySupport', label: 'دعم فني أولوية' },
];

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
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<Record<string, any>>({
    name: 'free', price: '', maxProducts: '', maxOrdersPerMonth: '', maxStaff: '', maxStorage: '',
    hasWhatsapp: false, hasOnlineOrders: false, hasCustomDomain: false, hasAnalytics: false,
    hasMultiLanguage: false, hasPromotions: false, hasCoupons: false, hasInventory: false,
    hasReturns: false, hasReviews: false, hasWishlist: false, hasCompare: false, hasSeo: false,
    hasEmailMarketing: false, hasAbandonedCart: false, hasBulkImport: false, hasApiAccess: false,
    hasPrioritySupport: false, description: ''
  });

  const { user, isSuperAdmin } = useAuth();
  const { store } = useStore();

  useEffect(() => {
    fetchData();
    if (isSuperAdmin) fetchUpgradeRequests();
    else fetchMyRequests();
  }, [isSuperAdmin]);

  const fetchData = async () => {
    try {
      const [plansData, currentPlanData] = await Promise.all([
        api.get<Plan[]>('/plans'),
        api.get<Plan>('/plans/current/me').catch(() => null)
      ]);
      setPlans(plansData); setCurrentPlan(currentPlanData);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchUpgradeRequests = async () => { try { setUpgradeRequests(await api.get('/admin/upgrade-requests')); } catch {} };
  const fetchMyRequests = async () => { try { setMyRequests(await api.get('/admin/user/upgrade-requests')); } catch {} };

  const handleOpenPlanModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      const form: Record<string, any> = { name: plan.name, price: plan.price.toString(), maxProducts: plan.maxProducts?.toString() || '', maxOrdersPerMonth: plan.maxOrdersPerMonth?.toString() || '', maxStaff: plan.maxStaff?.toString() || '', maxStorage: plan.maxStorage?.toString() || '', description: plan.description || '' };
      FEATURES.forEach(f => { form[f.key] = (plan as any)[f.key] || false; });
      setPlanForm(form);
    } else {
      setEditingPlan(null);
      const form: Record<string, any> = { name: 'free', price: '', maxProducts: '', maxOrdersPerMonth: '', maxStaff: '', maxStorage: '', description: '' };
      FEATURES.forEach(f => { form[f.key] = false; });
      setPlanForm(form);
    }
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    try {
      const data = { ...planForm, price: parseFloat(planForm.price) || 0, maxProducts: parseInt(planForm.maxProducts) || 0, maxOrdersPerMonth: parseInt(planForm.maxOrdersPerMonth) || 0, maxStaff: parseInt(planForm.maxStaff) || 0, maxStorage: parseInt(planForm.maxStorage) || 100 };
      if (editingPlan) { await api.put(`/plans/${editingPlan.id}`, data); toast.success('تم تحديث الخطة'); }
      else { await api.post('/plans', data); toast.success('تم إنشاء الخطة'); }
      setShowPlanModal(false); fetchData();
    } catch (error: any) { toast.error(error.response?.data?.error || 'حدث خطأ'); }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخطة؟')) return;
    try { await api.delete(`/plans/${planId}`); toast.success('تم الحذف'); fetchData(); }
    catch (error: any) { toast.error(error.response?.data?.error || 'حدث خطأ'); }
  };

  const handleUpgrade = (plan: Plan) => { setSelectedPlan(plan); setShowUpgradeModal(true); };

  const sendUpgradeRequest = async () => {
    if (!selectedPlan) return;
    try {
      await api.post('/admin/upgrade-request', { planId: selectedPlan.id, entityType: 'store', entityId: store?.id, notes: `طلب ترقية من خطة ${currentPlan?.name} إلى خطة ${selectedPlan.name}` });
      toast.success('تم إرسال طلب الترقية'); setShowUpgradeModal(false); fetchMyRequests();
    } catch (error: any) { toast.error(error.response?.data?.error || 'حدث خطأ'); }
  };

  const handleAdminUpgrade = async (requestId: string) => {
    try { await api.post(`/admin/approve-upgrade/${requestId}`); toast.success('تمت الموافقة'); fetchUpgradeRequests(); }
    catch (error: any) { toast.error(error.response?.data?.error || 'حدث خطأ'); }
  };

  const openRejectModal = (request: any) => { setSelectedRequest(request); setRejectReason(''); setShowRejectModal(true); };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    try { await api.post('/admin/reject-upgrade', { requestId: selectedRequest.id, reason: rejectReason }); toast.success('تم رفض الطلب'); setShowRejectModal(false); fetchUpgradeRequests(); }
    catch (error: any) { toast.error(error.response?.data?.error || 'حدث خطأ'); }
  };

  const contactViaWhatsApp = (whatsapp: string, name: string) => {
    if (!whatsapp) { toast.error('رقم واتساب غير متوفر'); return; }
    window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً ${name}، بخصوص طلب الترقية...`)}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
      pending:  { label: 'قيد الانتظار', color: C.yellow, bg: 'rgba(251,191,36,0.15)', Icon: IoTime },
      approved: { label: 'تمت الموافقة', color: C.accent, bg: 'rgba(200,226,53,0.15)', Icon: IoCheckmarkCircle },
      rejected: { label: 'مرفوض',        color: C.red,    bg: 'rgba(255,107,107,0.15)', Icon: IoCloseCircle },
    };
    const s = cfg[status]; if (!s) return null;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 12, background: s.bg, color: s.color }}><s.Icon size={12} />{s.label}</span>;
  };

  const getPlanIcon = (n: string) => n === 'pro' ? <IoRocket size={32} style={{ color: '#A78BFA' }} /> : n === 'basic' ? <IoBusiness size={32} style={{ color: C.blue }} /> : <IoStar size={32} style={{ color: C.muted }} />;
  const getPlanTitle = (n: string) => ({ free: 'المجانية', basic: 'الأساسية', pro: 'الاحترافية' })[n] || n;
  const getCurrentPlanTitle = () => currentPlan ? getPlanTitle(currentPlan.name) : 'مجانية';

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ color: C.text, fontSize: 26, fontWeight: 800, marginBottom: 8 }}>خطط المتجر</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>اختر الخطة المناسبة لمتجرك واستمتع بالمميزات</p>
      </div>

      {isSuperAdmin && (
        <div style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 14, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#A78BFA', fontWeight: 700 }}>
            <IoSettings size={20} /> لوحة تحكم المسؤول - إدارة خطط المتاجر
          </div>
          <Button variant="primary" size="sm" onClick={() => handleOpenPlanModal()}><IoAdd size={14} style={{ marginLeft: 4 }} />إضافة خطة</Button>
        </div>
      )}

      {currentPlan && !isSuperAdmin && (
        <div style={{ background: 'rgba(200,226,53,0.08)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ color: C.muted, fontSize: 13 }}>خطتك الحالية: </span>
            <span style={{ color: C.accent, fontWeight: 700, fontSize: 16 }}>{getCurrentPlanTitle()}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setShowMyRequests(true)}><IoEye size={14} style={{ marginLeft: 4 }} />طلباتي</Button>
            {currentPlan.name !== 'pro' && (
              <Button variant="primary" size="sm" onClick={() => { const p = plans.find(p => p.name === 'pro' || (p.name === 'basic' && currentPlan.name === 'free')); if (p) handleUpgrade(p); }}>ترقية الخطة</Button>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
        {plans.map(plan => {
          const isCurrent = currentPlan?.id === plan.id && !isSuperAdmin;
          const isPro = plan.name === 'pro';
          return (
            <div key={plan.id} style={{ background: C.card, border: `${isCurrent || isPro ? '2px' : '1px'} solid ${isCurrent ? C.accent : isPro ? 'rgba(167,139,250,0.4)' : C.border}`, borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
              {isPro && <div style={{ position: 'absolute', top: 12, right: 12, background: C.accent, color: C.bg, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>الأكثر شعبية</div>}
              {isSuperAdmin && (
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 4 }}>
                  <button onClick={() => handleOpenPlanModal(plan)} style={{ background: 'rgba(96,165,250,0.2)', border: 'none', borderRadius: 6, color: C.blue, cursor: 'pointer', padding: 6, display: 'flex' }}><IoPencil size={14} /></button>
                  <button onClick={() => handleDeletePlan(plan.id)} style={{ background: 'rgba(255,107,107,0.2)', border: 'none', borderRadius: 6, color: C.red, cursor: 'pointer', padding: 6, display: 'flex' }}><IoTrash size={14} /></button>
                </div>
              )}
              <div style={{ background: C.surf, padding: '28px 24px 20px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>
                {getPlanIcon(plan.name)}
                <div style={{ color: C.accent, fontSize: 18, fontWeight: 800, marginTop: 10 }}>{getPlanTitle(plan.name)}</div>
                <div style={{ marginTop: 12 }}>
                  {plan.price === 0 ? <span style={{ color: C.text, fontSize: 32, fontWeight: 900 }}>مجاني</span> : <><span style={{ color: C.text, fontSize: 32, fontWeight: 900 }}>{plan.price}</span><span style={{ color: C.muted, fontSize: 14 }}> ر.س/شهر</span></>}
                </div>
              </div>
              <div style={{ padding: 24 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                  {[`عدد المنتجات: ${plan.maxProducts >= 999999 ? 'غير محدود' : plan.maxProducts}`, `الطلبات الشهرية: ${plan.maxOrdersPerMonth >= 999999 ? 'غير محدود' : plan.maxOrdersPerMonth}`, `عدد الموظفين: ${plan.maxStaff}`, `مساحة التخزين: ${plan.maxStorage} MB`].map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.text, fontSize: 13, marginBottom: 8 }}>
                      <IoCheckmark size={16} style={{ color: C.accent, flexShrink: 0 }} />{item}
                    </li>
                  ))}
                  {FEATURES.map(f => {
                    const on = (plan as any)[f.key];
                    return (
                      <li key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, color: on ? C.text : C.muted, fontSize: 13, marginBottom: 8 }}>
                        {on ? <IoCheckmark size={16} style={{ color: C.accent, flexShrink: 0 }} /> : <IoClose size={16} style={{ color: C.red, flexShrink: 0 }} />}
                        {f.label}
                      </li>
                    );
                  })}
                </ul>
                {plan.description && <p style={{ color: C.muted, fontSize: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12, marginBottom: 16 }}>{plan.description}</p>}
                {!isSuperAdmin && (
                  isCurrent ? (
                    <button disabled style={{ width: '100%', padding: '11px', background: C.surf, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'not-allowed' }}>خطتك الحالية</button>
                  ) : (
                    <Button variant={plan.price === 0 ? 'secondary' : 'primary'} onClick={() => handleUpgrade(plan)} fullWidth>{plan.price === 0 ? 'الاشتراك مجاني' : 'ترقية الآن'}</Button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isSuperAdmin && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}` }}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>طلبات ترقية المتاجر</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  {['المستخدم', 'الخطة', 'المبلغ', 'التاريخ', 'الحالة', 'الإجراءات'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upgradeRequests.map((req: any) => (
                  <tr key={req.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 16px' }}><div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{req.userName}</div><div style={{ color: C.muted, fontSize: 11 }}>{req.userEmail}</div></td>
                    <td style={{ padding: '12px 16px', color: C.text, fontSize: 13 }}>{req.planName}</td>
                    <td style={{ padding: '12px 16px', color: C.accent, fontWeight: 700, fontSize: 13 }}>{req.price} ر.س</td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12 }}>{format(new Date(req.createdAt), 'dd/MM/yyyy', { locale: ar })}</td>
                    <td style={{ padding: '12px 16px' }}>{getStatusBadge(req.status)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {req.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button variant="success" size="sm" onClick={() => handleAdminUpgrade(req.id)}>قبول</Button>
                          <Button variant="danger" size="sm" onClick={() => openRejectModal(req)}>رفض</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {upgradeRequests.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: C.muted }}>لا توجد طلبات ترقية</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title={editingPlan ? 'تعديل خطة' : 'إضافة خطة'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>
          <div><label style={labelStyle}>اسم الخطة</label><input style={inputStyle} value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} /></div>
          <div><label style={labelStyle}>السعر (ر.س/شهر)</label><input style={inputStyle} type="number" step="0.01" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>الحد الأقصى للمنتجات</label><input style={inputStyle} type="number" value={planForm.maxProducts} onChange={e => setPlanForm({ ...planForm, maxProducts: e.target.value })} /></div>
            <div><label style={labelStyle}>الطلبات الشهرية</label><input style={inputStyle} type="number" value={planForm.maxOrdersPerMonth} onChange={e => setPlanForm({ ...planForm, maxOrdersPerMonth: e.target.value })} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>الحد الأقصى للموظفين</label><input style={inputStyle} type="number" value={planForm.maxStaff} onChange={e => setPlanForm({ ...planForm, maxStaff: e.target.value })} /></div>
            <div><label style={labelStyle}>مساحة التخزين (MB)</label><input style={inputStyle} type="number" value={planForm.maxStorage} onChange={e => setPlanForm({ ...planForm, maxStorage: e.target.value })} /></div>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ color: C.text, fontWeight: 700, marginBottom: 12 }}>مميزات المتجر</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {FEATURES.map(f => (
                <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text, fontSize: 13 }}>
                  <input type="checkbox" checked={!!planForm[f.key]} onChange={e => setPlanForm({ ...planForm, [f.key]: e.target.checked })} style={{ accentColor: C.accent }} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <div><label style={labelStyle}>الوصف</label><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} /></div>
          <Button variant="primary" onClick={handleSavePlan} fullWidth>حفظ</Button>
        </div>
      </Modal>

      <Modal isOpen={showMyRequests} onClose={() => setShowMyRequests(false)} title="طلباتي" size="lg">
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {myRequests.length === 0 ? <p style={{ color: C.muted, textAlign: 'center', padding: 32 }}>لا توجد طلبات سابقة</p> : myRequests.map((req: any) => (
            <div key={req.id} style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div><div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>طلب ترقية إلى خطة {req.planName}</div><div style={{ color: C.muted, fontSize: 12 }}>{format(new Date(req.createdAt), 'dd/MM/yyyy', { locale: ar })}</div></div>
                {getStatusBadge(req.status)}
              </div>
              <div style={{ color: C.accent, fontWeight: 700 }}>المبلغ: {req.price} ر.س</div>
              {req.status === 'rejected' && req.reason && <div style={{ background: 'rgba(255,107,107,0.1)', borderRadius: 8, padding: 10, marginTop: 8, color: C.red, fontSize: 13 }}>سبب الرفض: {req.reason}</div>}
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} title="طلب ترقية الخطة">
        {selectedPlan && (
          <div>
            <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', gap: 12 }}>
              <IoWarning size={22} style={{ color: C.yellow, flexShrink: 0 }} />
              <p style={{ color: C.muted, fontSize: 13 }}>سيتم إرسال طلب ترقية إلى المسؤول. بعد الدفع، سيتم تفعيل خطتك الجديدة.</p>
            </div>
            <div style={{ background: C.surf, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>الخطة الحالية: <span style={{ color: C.text, fontWeight: 600 }}>{getCurrentPlanTitle()}</span></div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>الخطة الجديدة: <span style={{ color: C.accent, fontWeight: 700 }}>{getPlanTitle(selectedPlan.name)}</span></div>
              <div style={{ color: C.muted, fontSize: 13 }}>المبلغ: <span style={{ color: C.accent, fontWeight: 800, fontSize: 18 }}>{selectedPlan.price} ر.س</span>/شهر</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={() => setShowUpgradeModal(false)} fullWidth>إلغاء</Button>
              <Button variant="primary" onClick={sendUpgradeRequest} fullWidth><IoSend size={14} style={{ marginLeft: 6 }} />إرسال طلب الترقية</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="رفض طلب الترقية">
        {selectedRequest && (
          <div>
            <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', gap: 12 }}>
              <IoWarning size={22} style={{ color: C.red, flexShrink: 0 }} />
              <p style={{ color: C.muted, fontSize: 13 }}>سيتم رفض طلب الترقية للعميل {selectedRequest.userName}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>سبب الرفض (اختياري)</label>
              <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="اكتب سبب الرفض هنا..." />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={() => setShowRejectModal(false)} fullWidth>إلغاء</Button>
              <Button variant="danger" onClick={handleRejectRequest} fullWidth>تأكيد الرفض</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StorePlansPage;
