// pages/Store/StoreCouponsPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import {
  IoAdd, IoPencil, IoTrash, IoCopy, IoCheckmark,
  IoTime, IoPricetag, IoWarning, IoLockClosed,
  IoStorefront, IoGlobe
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

interface Coupon {
  id: string; code: string; description: string;
  discountType: 'percentage' | 'fixed'; discountValue: number;
  minOrder: number; usageLimit: number; usedCount: number;
  startDate: string; endDate: string; isActive: boolean; isStoreOnly: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: C.surf,
  border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: C.muted };

const StoreCouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const { user, isSuperAdmin, isStoreOwner } = useAuth();

  const [formData, setFormData] = useState({
    code: '', description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '', minOrder: '', usageLimit: '',
    startDate: '', endDate: '', isStoreOnly: false,
  });

  useEffect(() => { fetchCoupons(); }, []);

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
    setFormData({ code: '', description: '', discountType: 'percentage', discountValue: '', minOrder: '', usageLimit: '', startDate: '', endDate: '', isStoreOnly: false });
    setSelectedCoupon(null);
  };

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setSelectedCoupon(coupon);
      setFormData({
        code: coupon.code, description: coupon.description || '',
        discountType: coupon.discountType, discountValue: coupon.discountValue.toString(),
        minOrder: coupon.minOrder.toString(), usageLimit: coupon.usageLimit.toString(),
        startDate: coupon.startDate.split('T')[0], endDate: coupon.endDate.split('T')[0],
        isStoreOnly: coupon.isStoreOnly || false,
      });
    }
    setShowModal(true);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
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

  const getStatusStyle = (status: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
      active:    { bg: `rgba(200,226,53,0.15)`,  color: C.accent },
      upcoming:  { bg: `rgba(96,165,250,0.15)`,   color: C.blue },
      expired:   { bg: `rgba(255,107,107,0.15)`,  color: C.red },
      exhausted: { bg: `rgba(157,196,172,0.15)`,  color: C.muted },
    };
    const s = map[status] || map.exhausted;
    return { background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 12, fontSize: 12 };
  };

  const getStatusText = (status: string) => {
    return { active: 'نشط', upcoming: 'قادم', expired: 'منتهي', exhausted: 'مستنفذ' }[status] || status;
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24 }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IoPricetag style={{ color: C.accent, fontSize: 32 }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>إدارة كوبونات المتجر</h1>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>أنشئ كوبونات خصم لجذب المزيد من العملاء</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{ background: C.accent, color: C.bg, padding: '10px 20px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
        >
          <IoAdd size={18} /> إضافة كوبون
        </button>
      </div>

      {/* الإحصائيات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي الكوبونات', value: coupons.length, color: C.blue, Icon: IoPricetag },
          { label: 'كوبونات نشطة', value: coupons.filter(c => getStatus(c) === 'active').length, color: C.accent, Icon: IoCheckmark },
          { label: 'قادمة', value: coupons.filter(c => getStatus(c) === 'upcoming').length, color: C.muted, Icon: IoTime },
          { label: 'منتهية/مستنفذة', value: coupons.filter(c => getStatus(c) === 'expired' || getStatus(c) === 'exhausted').length, color: C.red, Icon: IoWarning },
        ].map((stat, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{stat.label}</p>
                <p style={{ color: stat.color, fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{stat.value}</p>
              </div>
              <stat.Icon style={{ color: stat.color, fontSize: 28, opacity: 0.4 }} />
            </div>
          </div>
        ))}
      </div>

      {/* قائمة الكوبونات */}
      {coupons.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '64px 24px', textAlign: 'center' }}>
          <IoPricetag style={{ color: C.muted, fontSize: 56, marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>لا توجد كوبونات</h3>
          <p style={{ color: C.muted, margin: '0 0 20px' }}>قم بإضافة أول كوبون لجذب المزيد من العملاء</p>
          <button onClick={() => handleOpenModal()} style={{ background: C.accent, color: C.bg, padding: '10px 24px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer' }}>
            <IoAdd style={{ display: 'inline', marginLeft: 4 }} /> إضافة كوبون
          </button>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  {['الكود', 'النوع', 'الوصف', 'الخصم', 'الفترة', 'الاستخدام', 'الحالة', 'الإجراءات'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'right', color: C.muted, fontSize: 12, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map(coupon => {
                  const status = getStatus(coupon);
                  const usagePercent = (coupon.usedCount / coupon.usageLimit) * 100;
                  return (
                    <tr key={coupon.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code style={{ background: C.surf, color: C.accent, padding: '3px 8px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                            {coupon.code}
                          </code>
                          <button onClick={() => copyCode(coupon.code)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}>
                            <IoCopy size={15} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        {coupon.isStoreOnly ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `rgba(200,226,53,0.12)`, color: C.accent, padding: '3px 8px', borderRadius: 12, fontSize: 12 }}>
                            <IoStorefront size={12} /> خاص بالمتجر
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `rgba(157,196,172,0.12)`, color: C.muted, padding: '3px 8px', borderRadius: 12, fontSize: 12 }}>
                            <IoGlobe size={12} /> عام
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ color: C.text, fontSize: 13, margin: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{coupon.description || '-'}</p>
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: C.accent, fontWeight: 700, fontSize: 14 }}>
                          {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `${coupon.discountValue} ر.س`}
                        </span>
                        {coupon.minOrder > 0 && <p style={{ color: C.muted, fontSize: 11, margin: '2px 0 0' }}>الحد الأدنى: {coupon.minOrder} ر.س</p>}
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: 13, color: C.text }}>
                        <div>{format(new Date(coupon.startDate), 'dd/MM/yyyy')}</div>
                        <div style={{ color: C.muted }}>→</div>
                        <div>{format(new Date(coupon.endDate), 'dd/MM/yyyy')}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: 90 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: C.text }}>{coupon.usedCount}</span>
                            <span style={{ color: C.muted }}>/{coupon.usageLimit}</span>
                          </div>
                          <div style={{ background: C.surf, borderRadius: 4, height: 5 }}>
                            <div style={{ width: `${Math.min(usagePercent, 100)}%`, background: C.accent, borderRadius: 4, height: 5 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={getStatusStyle(status)}>{getStatusText(status)}</span>
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => handleOpenModal(coupon)} style={{ background: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', padding: 4 }}>
                            <IoPencil size={17} />
                          </button>
                          <button onClick={() => handleDelete(coupon.id)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', padding: 4 }}>
                            <IoTrash size={17} />
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

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={selectedCoupon ? 'تعديل كوبون' : 'إضافة كوبون جديد'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>كود الكوبون <span style={{ color: C.red }}>*</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} style={{ ...inputStyle, fontFamily: 'monospace', flex: 1 }} placeholder="SAVE20" />
              <button onClick={generateRandomCode} style={{ background: C.surf, border: `1px solid ${C.border}`, color: C.muted, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                توليد عشوائي
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>الوصف</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="وصف الكوبون (اختياري)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>نوع الخصم</label>
              <select value={formData.discountType} onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })} style={inputStyle}>
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">قيمة ثابتة (ر.س)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{formData.discountType === 'percentage' ? 'نسبة الخصم (%)' : 'قيمة الخصم (ر.س)'}</label>
              <input type="number" step={formData.discountType === 'percentage' ? '1' : '0.01'} min="0" max={formData.discountType === 'percentage' ? '100' : undefined} value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>الحد الأدنى للطلب</label>
              <input type="number" step="0.01" min="0" value={formData.minOrder} onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })} style={inputStyle} placeholder="0 = بدون حد" />
            </div>
            <div>
              <label style={labelStyle}>حد الاستخدام</label>
              <input type="number" min="1" value={formData.usageLimit} onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })} style={inputStyle} placeholder="عدد مرات الاستخدام" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>تاريخ البدء</label>
              <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>تاريخ الانتهاء</label>
              <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} style={inputStyle} />
            </div>
          </div>

          {/* نوع الكوبون */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={formData.isStoreOnly} onChange={(e) => setFormData({ ...formData, isStoreOnly: e.target.checked })} style={{ width: 16, height: 16, accentColor: C.accent }} />
              <span style={{ color: C.text, fontSize: 14, fontWeight: 500 }}>كوبون خاص بالمتجر فقط</span>
            </label>
            <div style={{ background: formData.isStoreOnly ? `rgba(200,226,53,0.08)` : C.surf, border: `1px solid ${formData.isStoreOnly ? `rgba(200,226,53,0.3)` : C.border}`, borderRadius: 10, padding: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {formData.isStoreOnly ? <IoStorefront style={{ color: C.accent, marginTop: 2 }} size={17} /> : <IoGlobe style={{ color: C.muted, marginTop: 2 }} size={17} />}
              <div>
                <p style={{ color: C.text, fontSize: 13, fontWeight: 500, margin: 0 }}>{formData.isStoreOnly ? 'يعمل فقط عند الطلب من المتجر' : 'يعمل في أي مكان'}</p>
                <p style={{ color: C.muted, fontSize: 12, margin: '4px 0 0' }}>
                  {formData.isStoreOnly ? 'يمكن استخدام هذا الكوبون فقط عند الشراء من متجرك عبر الإنترنت' : 'يمكن استخدام هذا الكوبون في أي طلب من المتجر أو خارجه'}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} style={{ flex: 1, background: C.accent, color: C.bg, padding: '10px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              {selectedCoupon ? 'تحديث' : 'إنشاء'}
            </button>
            <button onClick={() => { setShowModal(false); resetForm(); }} style={{ flex: 1, background: C.surf, color: C.muted, padding: '10px', borderRadius: 10, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 14 }}>
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StoreCouponsPage;
