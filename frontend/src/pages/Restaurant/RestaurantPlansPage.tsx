// frontend/src/pages/Restaurant/RestaurantPlansPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCheckmark, IoCard, IoTime, IoLogoWhatsapp, IoChatbubble, IoGlobe, IoStatsChart, IoQrCode, IoLanguage, IoMegaphone, IoTicket, IoBusiness, IoPeople, IoRestaurant, IoStorefront, IoFastFood, IoCube, IoCart, IoAlertCircle, IoSend } from 'react-icons/io5';
import { planService, Plan } from '../../services/api/plan.service';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  blue: '#60A5FA',
  purple: '#A78BFA',
  yellow: '#FBBF24',
};

const monthsOptions = [
  { value: 1, label: 'شهر واحد', discount: 0 },
  { value: 3, label: '3 أشهر', discount: 5, savings: 'وفر 5%' },
  { value: 6, label: '6 أشهر', discount: 10, savings: 'وفر 10%' },
  { value: 12, label: '12 شهر', discount: 15, savings: 'وفر 15%' },
];

const RestaurantPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchCurrentPlan();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/plans');
      const plansData = response?.data || (Array.isArray(response) ? response : []);
      setPlans(plansData);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('فشل تحميل الخطط');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPlan = async () => {
    try {
      const response = await api.get('/plans/current/me').catch(() => null);
      if (response) {
        setCurrentPlan(response);
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
    }
  };

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setSelectedMonths(1);
    setShowUpgradeModal(true);
  };

  const calculatePrice = (price: number, months: number): number => {
    const monthOption = monthsOptions.find(m => m.value === months);
    const discount = monthOption?.discount || 0;
    const total = price * months;
    const discountedTotal = total - (total * discount / 100);
    return discountedTotal;
  };

  // ✅ إرسال طلب ترقية بدلاً من ترقية مباشرة
  const handleSendUpgradeRequest = async () => {
    if (!selectedPlan) return;
    
    setProcessing(true);
    try {
      const totalAmount = calculatePrice(selectedPlan.price, selectedMonths);
      
      await api.post('/admin/upgrade-request', {
        planId: selectedPlan.id,
        entityType: 'restaurant',
        entityId: user?.restaurantId,
        notes: `طلب ترقية من خطة ${currentPlan?.name || 'مجانية'} إلى خطة ${selectedPlan.name}`,
        months: selectedMonths,
        totalAmount: totalAmount
      });
      
      toast.success('تم إرسال طلب الترقية بنجاح، سيتم مراجعته من قبل الإدارة');
      setShowUpgradeModal(false);
    } catch (error: any) {
      console.error('Upgrade request error:', error);
      toast.error(error.response?.data?.error || 'فشل إرسال طلب الترقية');
    } finally {
      setProcessing(false);
    }
  };

  const getPlanFeatures = (plan: Plan) => {
    const features = [];
    if (plan.hasWhatsapp) features.push({ icon: IoLogoWhatsapp, label: 'واتساب متكامل' });
    if (plan.hasOnlineOrders) features.push({ icon: IoCart, label: 'طلبات أونلاين' });
    if (plan.hasCustomDomain) features.push({ icon: IoGlobe, label: 'دومين مخصص' });
    if (plan.hasAnalytics) features.push({ icon: IoStatsChart, label: 'تحليلات متقدمة' });
    if (plan.hasTableQr) features.push({ icon: IoQrCode, label: 'رموز QR للطاولات' });
    if (plan.hasMultiLanguage) features.push({ icon: IoLanguage, label: 'دعم لغات متعددة' });
    if (plan.hasPromotions) features.push({ icon: IoMegaphone, label: 'عروض ترويجية' });
    if (plan.hasCoupons) features.push({ icon: IoTicket, label: 'كوبونات خصم' });
    return features;
  };

  const getPlanLimits = (plan: Plan) => {
    return [
      { icon: IoRestaurant, label: 'الأصناف', value: plan.maxMenuItems === 999999 ? 'غير محدود' : plan.maxMenuItems },
      { icon: IoPeople, label: 'الموظفين', value: plan.maxUsers === 999999 ? 'غير محدود' : plan.maxUsers },
      { icon: IoCart, label: 'الطلبات', value: plan.maxOrders === 999999 ? 'غير محدود' : plan.maxOrders },
    ];
  };

  if (loading) return <Loader fullScreen />;

  const currentPlanData = currentPlan || plans.find(p => p.name === 'free');

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>💰 الخطط والاشتراكات</h1>
        <p style={{ color: C.muted, fontSize: 13 }}>اختر الخطة المناسبة لتحصل على ميزات أكثر وخدمة أفضل</p>
      </div>

      {/* Current Plan Card */}
      {currentPlanData && (
        <div style={{
          background: `linear-gradient(135deg, ${C.accent}15, ${C.accent}05)`,
          border: `1px solid ${C.accent}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: C.accent, marginBottom: 4 }}>خطتك الحالية</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{currentPlanData.name}</div>
            </div>
            {currentPlanData.name !== 'enterprise' && (
              <button
                onClick={() => {
                  const nextPlan = plans.find(p => p.position > (currentPlanData?.position || 0));
                  if (nextPlan) handleUpgrade(nextPlan);
                }}
                style={{
                  padding: '10px 24px',
                  background: C.accent,
                  border: 'none',
                  borderRadius: 10,
                  color: C.bg,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ترقية الخطة
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {plans.map((plan) => {
          const features = getPlanFeatures(plan);
          const limits = getPlanLimits(plan);
          const isCurrentPlan = currentPlanData?.id === plan.id;
          const canUpgrade = !isCurrentPlan && (plan.position || 0) > (currentPlanData?.position || 0);
          
          return (
            <div
              key={plan.id}
              style={{
                background: C.card,
                border: `1px solid ${isCurrentPlan ? C.accent : C.border}`,
                borderRadius: 16,
                overflow: 'hidden',
                position: 'relative',
                transform: isCurrentPlan ? 'scale(1.02)' : 'scale(1)',
                transition: 'transform 0.2s',
              }}
            >
              {plan.isPopular && (
                <div style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  background: C.accent,
                  color: C.bg,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 12px',
                  borderRadius: 20,
                }}>
                  الأكثر شيوعاً
                </div>
              )}
              
              <div style={{
                padding: 20,
                background: `linear-gradient(135deg, ${C.accent}10, transparent)`,
                borderBottom: `1px solid ${C.border}`,
              }}>
                <h3 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{plan.name}</h3>
                <p style={{ color: C.muted, fontSize: 13 }}>{plan.description}</p>
                <div style={{ marginTop: 12 }}>
                  <span style={{ color: C.accent, fontSize: 32, fontWeight: 800 }}>{plan.price}</span>
                  <span style={{ color: C.muted, fontSize: 14 }}> ر.س / شهر</span>
                </div>
              </div>

              <div style={{ padding: 20 }}>
                {/* Limits */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>الحدود</div>
                  {limits.map(({ icon: Icon, label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon size={14} color={C.accent} /> {label}
                      </span>
                      <span style={{ color: C.text, fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                {features.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>الميزات</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {features.map(({ icon: Icon, label }) => (
                        <span key={label} style={{
                          fontSize: 11,
                          background: `${C.accent}20`,
                          color: C.accent,
                          padding: '3px 8px',
                          borderRadius: 20,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Icon size={11} /> {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => canUpgrade ? handleUpgrade(plan) : null}
                  disabled={!canUpgrade}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: isCurrentPlan ? C.surf : (canUpgrade ? C.accent : C.muted),
                    border: 'none',
                    borderRadius: 10,
                    color: isCurrentPlan ? C.muted : C.bg,
                    fontWeight: 600,
                    cursor: canUpgrade ? 'pointer' : 'not-allowed',
                    marginTop: 8,
                  }}
                >
                  {isCurrentPlan ? 'الخطة الحالية' : (canUpgrade ? 'ترقية' : 'غير متاح')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upgrade Request Modal */}
      <Modal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} title={`طلب ترقية إلى خطة ${selectedPlan?.name}`} size="md">
        {selectedPlan && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: C.muted, fontSize: 13, marginBottom: 8, display: 'block' }}>فترة الاشتراك</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
                {monthsOptions.map(({ value, label, discount, savings }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedMonths(value)}
                    style={{
                      padding: '10px',
                      background: selectedMonths === value ? C.accent : C.surf,
                      border: `1px solid ${selectedMonths === value ? C.accent : C.border}`,
                      borderRadius: 10,
                      color: selectedMonths === value ? C.bg : C.text,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{label}</div>
                    {discount > 0 && (
                      <div style={{ fontSize: 10, color: selectedMonths === value ? C.bg : C.accent }}>{savings}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: C.surf, padding: 16, borderRadius: 10, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: C.muted }}>السعر الشهري</span>
                <span style={{ color: C.text }}>{selectedPlan.price} ر.س</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: C.muted }}>عدد الأشهر</span>
                <span style={{ color: C.text }}>{selectedMonths}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: C.muted }}>السعر الكلي</span>
                <span style={{ color: C.text }}>{selectedPlan.price * selectedMonths} ر.س</span>
              </div>
              {selectedMonths > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: C.accent }}>الخصم</span>
                  <span style={{ color: C.accent }}>{monthsOptions.find(m => m.value === selectedMonths)?.discount}%</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span style={{ color: C.text, fontWeight: 700 }}>الإجمالي</span>
                <span style={{ color: C.accent, fontWeight: 700, fontSize: 18 }}>
                  {calculatePrice(selectedPlan.price, selectedMonths).toFixed(2)} ر.س
                </span>
              </div>
            </div>

            <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: 12, marginBottom: 20 }}>
              <p style={{ color: C.muted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoAlertCircle size={18} style={{ color: C.yellow }} />
                سيتم إرسال طلب الترقية إلى الإدارة للمراجعة. سيتم تفعيل الخطة بعد الموافقة عليها.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: C.surf,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  color: C.muted,
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSendUpgradeRequest}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: C.accent,
                  border: 'none',
                  borderRadius: 10,
                  color: C.bg,
                  fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {processing ? 'جاري المعالجة...' : <><IoSend size={16} /> إرسال طلب الترقية</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RestaurantPlansPage;