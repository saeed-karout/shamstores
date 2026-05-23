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

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  prim:   '#0D4A3A',
  surf:   '#0F3D31',
  surfL:  '#164D3E',
  accent: '#C8E235',
  acDk:   '#A8C220',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
  blue:   '#60A5FA',
  yellow: '#F59E0B',
  purple: '#A78BFA',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: C.surf,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 4,
  color: C.muted,
};

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
    if (isSuperAdmin) {
      fetchCoupons();
      return;
    }
    if (isStaff) {
      setLoading(false);
      return;
    }
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

    if (isStaff) {
      toast.error('ليس لديك صلاحية لإدارة الكوبونات');
      return;
    }

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

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'active':    return { background: 'rgba(200,226,53,0.15)', color: C.accent };
      case 'upcoming':  return { background: 'rgba(96,165,250,0.15)', color: C.blue };
      case 'expired':   return { background: 'rgba(255,107,107,0.15)', color: C.red };
      case 'exhausted': return { background: 'rgba(157,196,172,0.15)', color: C.muted };
      default:          return { background: 'rgba(157,196,172,0.15)', color: C.muted };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':    return 'نشط';
      case 'upcoming':  return 'قادم';
      case 'expired':   return 'منتهي';
      case 'exhausted': return 'مستنفذ';
      default:          return status;
    }
  };

  // Staff access denied
  if (isStaff) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: 24, direction: 'rtl' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <IoLockClosed style={{ color: C.yellow, fontSize: 48, marginBottom: 16 }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>غير مصرح</h2>
          <p style={{ color: C.muted }}>ليس لديك صلاحية الوصول إلى صفحة الكوبونات.</p>
        </div>
      </div>
    );
  }

  // Owner without coupon plan
  if (isOwner && !permissions.checkPermission('coupons') && !isSuperAdmin) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: 24, direction: 'rtl' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <IoWarning style={{ color: C.yellow, fontSize: 48, marginBottom: 16 }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>الميزة غير متاحة</h2>
          <p style={{ color: C.muted, marginBottom: 20 }}>
            نظام الكوبونات غير متاح في خطتك الحالية. قم بترقية خطتك للاستفادة من هذه الميزة.
          </p>
          <button
            onClick={() => window.location.href = '/plans'}
            style={{ background: C.accent, color: C.bg, padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}
          >
            عرض خطط الترقية
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, direction: 'rtl', color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>إدارة الكوبونات</h1>
          {isSuperAdmin && (
            <span style={{ background: 'rgba(167,139,250,0.15)', color: C.purple, fontSize: 12, padding: '4px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IoShield size={14} />
              صلاحية كاملة
            </span>
          )}
        </div>
        {(isSuperAdmin || (isOwner && permissions.checkPermission('coupons'))) && (
          <button
            onClick={() => handleOpenModal()}
            style={{ background: C.accent, color: C.bg, padding: '8px 20px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, border: 'none', fontSize: 14 }}
          >
            <IoAdd size={16} />
            إضافة كوبون
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, color: C.muted, margin: '0 0 6px' }}>إجمالي الكوبونات</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: C.text, margin: 0 }}>{coupons.length}</p>
            </div>
            <IoPricetag style={{ color: C.blue, fontSize: 32 }} />
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, color: C.muted, margin: '0 0 6px' }}>كوبونات نشطة</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: C.accent, margin: 0 }}>
                {coupons.filter(c => getStatus(c) === 'active').length}
              </p>
            </div>
            <IoCheckmark style={{ color: C.accent, fontSize: 32 }} />
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, color: C.muted, margin: '0 0 6px' }}>قادمة</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: C.blue, margin: 0 }}>
                {coupons.filter(c => getStatus(c) === 'upcoming').length}
              </p>
            </div>
            <IoTime style={{ color: C.blue, fontSize: 32 }} />
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, color: C.muted, margin: '0 0 6px' }}>منتهية</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: C.red, margin: 0 }}>
                {coupons.filter(c => getStatus(c) === 'expired' || getStatus(c) === 'exhausted').length}
              </p>
            </div>
            <IoWarning style={{ color: C.red, fontSize: 32 }} />
          </div>
        </div>
      </div>

      {/* Coupons Table / Empty State */}
      {coupons.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <IoPricetag style={{ color: C.muted, fontSize: 48, marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>لا توجد كوبونات</h3>
          <p style={{ color: C.muted, marginBottom: 20 }}>
            {(isSuperAdmin || (isOwner && permissions.checkPermission('coupons')))
              ? 'قم بإضافة أول كوبون الآن'
              : 'لا توجد كوبونات متاحة'}
          </p>
          {(isSuperAdmin || (isOwner && permissions.checkPermission('coupons'))) && (
            <button
              onClick={() => handleOpenModal()}
              style={{ background: C.accent, color: C.bg, padding: '10px 24px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <IoAdd size={16} />
              إضافة كوبون
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.surf }}>
                {['الكود', 'النوع', 'الوصف', 'الخصم', 'الفترة', 'الاستخدام', 'الحالة', 'الإجراءات'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map(coupon => {
                const status = getStatus(coupon);
                return (
                  <tr
                    key={coupon.id}
                    style={{ borderTop: `1px solid ${C.border}` }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(200,226,53,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{ background: C.surf, padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace', color: C.accent, fontSize: 13 }}>
                          {coupon.code}
                        </code>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 0 }}
                          title="نسخ"
                        >
                          <IoCopy size={15} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      {coupon.isRestaurantOnly ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'rgba(96,165,250,0.15)', color: C.blue, borderRadius: 20, fontSize: 12 }}>
                          <IoRestaurant size={13} />
                          داخل المطعم
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'rgba(200,226,53,0.15)', color: C.accent, borderRadius: 20, fontSize: 12 }}>
                          <IoGlobe size={13} />
                          عام
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{coupon.description}</p>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      {coupon.discountType === 'percentage' ? (
                        <span style={{ fontWeight: 700, color: C.accent }}>{coupon.discountValue}%</span>
                      ) : (
                        <span style={{ fontWeight: 700, color: C.accent }}>{coupon.discountValue} ر.س</span>
                      )}
                      {coupon.minOrder > 0 && (
                        <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>الحد الأدنى: {coupon.minOrder} ر.س</p>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: 13, color: C.muted }}>
                      <div>من: {format(new Date(coupon.startDate), 'dd/MM/yyyy')}</div>
                      <div>إلى: {format(new Date(coupon.endDate), 'dd/MM/yyyy')}</div>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: C.text }}>{coupon.usedCount}</span>
                      <span style={{ color: C.muted }}> / {coupon.usageLimit}</span>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ ...getStatusStyle(status), padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {getStatusText(status)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      {(isSuperAdmin || (isOwner && permissions.checkPermission('coupons'))) && (
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={() => handleOpenModal(coupon)}
                            style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', padding: 4 }}
                            title="تعديل"
                          >
                            <IoPencil size={17} />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 4 }}
                            title="حذف"
                          >
                            <IoTrash size={17} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={selectedCoupon ? 'تعديل كوبون' : 'إضافة كوبون جديد'}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>كود الكوبون</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
                placeholder="مثال: SAVE20"
                required
              />
              <button
                onClick={generateRandomCode}
                style={{ background: C.surf, border: `1px solid ${C.border}`, color: C.text, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500 }}
              >
                توليد عشوائي
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>الوصف</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={inputStyle}
              placeholder="وصف الكوبون"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>نوع الخصم</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                <option value="percentage" style={{ background: C.surf }}>نسبة مئوية</option>
                <option value="fixed" style={{ background: C.surf }}>قيمة ثابتة</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>
                {formData.discountType === 'percentage' ? 'نسبة الخصم' : 'قيمة الخصم'}
              </label>
              <input
                type="number"
                step={formData.discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>الحد الأدنى للطلب</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.minOrder}
                onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                style={inputStyle}
                placeholder="0 = بدون حد"
              />
            </div>
            <div>
              <label style={labelStyle}>حد الاستخدام</label>
              <input
                type="number"
                min="1"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                style={inputStyle}
                placeholder="عدد مرات الاستخدام"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>تاريخ البدء</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>تاريخ الانتهاء</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                style={inputStyle}
                required
              />
            </div>
          </div>

          {/* Coupon type */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={formData.isRestaurantOnly}
                onChange={(e) => setFormData({ ...formData, isRestaurantOnly: e.target.checked })}
                style={{ accentColor: C.accent, width: 16, height: 16 }}
              />
              <span style={{ fontWeight: 500, color: C.text }}>كوبون خاص بالمطعم</span>
            </label>
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {formData.isRestaurantOnly ? (
                  <IoRestaurant style={{ color: C.blue, marginTop: 2 }} size={18} />
                ) : (
                  <IoGlobe style={{ color: C.accent, marginTop: 2 }} size={18} />
                )}
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 4px' }}>
                    {formData.isRestaurantOnly ? 'يعمل فقط داخل المطعم' : 'يعمل في أي مكان'}
                  </p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                    {formData.isRestaurantOnly
                      ? 'يمكن استخدام هذا الكوبون فقط عند الطلب من داخل المطعم (مع مسح QR الطاولة)'
                      : 'يمكن استخدام هذا الكوبون في أي طلب سواء داخل المطعم أو خارجه'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            style={{ background: C.accent, color: C.bg, padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: 15 }}
          >
            حفظ
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CouponsPage;
