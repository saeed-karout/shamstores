// frontend/src/pages/Admin/AdminAdvertisements.tsx
import React, { useEffect, useState } from 'react';
import { IoAdd, IoTrash, IoEye, IoRefresh, IoCash, IoCheckmark, IoClose, IoImage, IoCalendar, IoPerson, IoPencil, IoWarning } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import ImageUploadField from '@/components/common/ImageUploadField';
import { formatPrice } from '@/utils/currency';

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

interface Advertisement {
  id: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUrl: string;
  linkUrl?: string;
  position: number;
  isActive: boolean;
  startAt?: string;
  endAt?: string;
  price: number;
  paid: boolean;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  paid: number;
  unpaid: number;
  totalRevenue: number;
}

const AdminAdvertisements: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    titleEn: '',
    description: '',
    descriptionEn: '',
    imageUrl: '',
    linkUrl: '',
    position: 0,
    price: 0,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    startAt: '',
    endAt: '',
    isActive: true
  });

  useEffect(() => {
    fetchAds();
    fetchStats();
  }, []);

  // دالة لحساب الحالة الفعلية للإعلان
  const getActualStatus = (ad: Advertisement): { status: 'active' | 'expired' | 'scheduled' | 'inactive'; color: string; label: string } => {
    const now = new Date();
    const startDate = ad.startAt ? new Date(ad.startAt) : null;
    const endDate = ad.endAt ? new Date(ad.endAt) : null;
    
    if (!ad.isActive) {
      return { status: 'inactive', color: C.muted, label: 'معطل' };
    }
    
    if (startDate && startDate > now) {
      return { status: 'scheduled', color: C.blue, label: 'مجدول' };
    }
    
    if (endDate && endDate < now) {
      return { status: 'expired', color: C.red, label: 'منتهي' };
    }
    
    return { status: 'active', color: C.accent, label: 'نشط' };
  };

  const fetchAds = async () => {
    setLoading(true);
    try {
      const response = await api.get('/advertisements');
      console.log('Ads response:', response);
      
      let adsData = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        adsData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        adsData = response.data;
      } else if (Array.isArray(response)) {
        adsData = response;
      }
      
      console.log('Ads data:', adsData);
      setAds(adsData);
    } catch (error) {
      console.error('Error fetching ads:', error);
      toast.error('فشل تحميل الإعلانات');
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/advertisements/stats');
      let statsData = null;
      if (response.data?.data) {
        statsData = response.data.data;
      } else if (response.data) {
        statsData = response.data;
      }
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('الرجاء إدخال عنوان الإعلان');
      return;
    }
    
    if (!formData.imageUrl.trim()) {
      toast.error('ارفع صورة الإعلان أولاً');
      return;
    }

    try {
      const payload = {
        ...formData,
        price: Number(formData.price) || 0,
        position: Number(formData.position) || 0,
        startAt: formData.startAt || null,
        endAt: formData.endAt || null,
      };

      if (editingAd) {
        await api.put(`/advertisements/${editingAd.id}`, payload);
        toast.success('تم تحديث الإعلان بنجاح');
      } else {
        await api.post('/advertisements', payload);
        toast.success('تم إنشاء الإعلان بنجاح');
      }
      
      setShowModal(false);
      setEditingAd(null);
      resetForm();
      fetchAds();
      fetchStats();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.error || 'فشل حفظ الإعلان');
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/advertisements/${id}/toggle`);
      toast.success(currentStatus ? 'تم تعطيل الإعلان' : 'تم تفعيل الإعلان');
      fetchAds();
    } catch (error) {
      toast.error('فشل تغيير حالة الإعلان');
    }
  };

  const deleteAd = async (id: string, title: string) => {
    if (window.confirm(`⚠️ هل أنت متأكد من حذف الإعلان "${title}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) {
      try {
        await api.delete(`/advertisements/${id}`);
        toast.success('تم حذف الإعلان بنجاح');
        fetchAds();
        fetchStats();
      } catch (error) {
        toast.error('فشل حذف الإعلان');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      titleEn: '',
      description: '',
      descriptionEn: '',
      imageUrl: '',
      linkUrl: '',
      position: 0,
      price: 0,
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      startAt: '',
      endAt: '',
      isActive: true
    });
  };

  const openEditModal = (ad: Advertisement) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      titleEn: ad.titleEn || '',
      description: ad.description || '',
      descriptionEn: ad.descriptionEn || '',
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl || '',
      position: ad.position,
      price: ad.price,
      clientName: ad.clientName || '',
      clientEmail: ad.clientEmail || '',
      clientPhone: ad.clientPhone || '',
      startAt: ad.startAt?.split('T')[0] || '',
      endAt: ad.endAt?.split('T')[0] || '',
      isActive: ad.isActive
    });
    setShowModal(true);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: C.muted,
    fontSize: 13,
    marginBottom: 6,
    display: 'block',
  };

  if (loading) return <Loader fullScreen />;

  // إحصائيات محسنة بناءً على الحالة الفعلية
  const actualActiveCount = ads.filter(ad => {
    const { status } = getActualStatus(ad);
    return status === 'active';
  }).length;

  const expiredCount = ads.filter(ad => {
    const { status } = getActualStatus(ad);
    return status === 'expired';
  }).length;

  const scheduledCount = ads.filter(ad => {
    const { status } = getActualStatus(ad);
    return status === 'scheduled';
  }).length;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📢 إدارة الإعلانات</h1>
          <p style={{ color: C.muted, fontSize: 13 }}>إدارة الإعلانات التي تظهر على جميع المطاعم والمتاجر</p>
        </div>
        <button
          onClick={() => {
            setEditingAd(null);
            resetForm();
            setShowModal(true);
          }}
          style={{
            padding: '10px 24px',
            background: C.accent,
            border: 'none',
            borderRadius: 10,
            color: C.bg,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
          }}
        >
          <IoAdd size={18} /> إعلان جديد
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.accent }}>{ads.length}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>إجمالي الإعلانات</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.accent }}>{actualActiveCount}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>نشطة حالياً</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.yellow }}>{scheduledCount}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>مجدولة</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.red }}>{expiredCount}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>منتهية</div>
        </div>
      </div>

      {/* Refresh Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={() => { fetchAds(); fetchStats(); }}
          style={{
            padding: '8px 16px',
            background: C.surf,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
          }}
        >
          <IoRefresh size={16} /> تحديث
        </button>
      </div>

      {/* Ads Table */}
      {ads.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <IoImage size={48} style={{ color: C.border, marginBottom: 12 }} />
          <h3 style={{ color: C.text, fontSize: 16, marginBottom: 6 }}>لا توجد إعلانات</h3>
          <p style={{ color: C.muted, fontSize: 13 }}>قم بإضافة إعلان جديد لبدء عرض الإعلانات على المنصة</p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              marginTop: 16,
              padding: '8px 20px',
              background: C.accent,
              border: 'none',
              borderRadius: 8,
              color: C.bg,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إضافة إعلان
          </button>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>#</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>الصورة</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>العنوان</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>الموضع</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>السعر</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>العميل</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>الفترة</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>الحالة</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad, index) => {
                  const { status, color, label } = getActualStatus(ad);
                  const isExpired = status === 'expired';
                  const isScheduled = status === 'scheduled';
                  
                  return (
                    <tr key={ad.id} style={{ borderBottom: `1px solid ${C.border}`, opacity: isExpired ? 0.6 : 1 }}>
                      <td style={{ padding: '12px 16px', color: C.muted }}>{index + 1}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <img 
                          src={ad.imageUrl} 
                          alt={ad.title} 
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', color: C.text, fontWeight: 500 }}>{ad.title}</td>
                      <td style={{ padding: '12px 16px', color: C.muted }}>{ad.position}</td>
                      <td style={{ padding: '12px 16px', color: C.accent, fontWeight: 600 }}>{formatPrice(ad.price)}</td>
                      <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12 }}>{ad.clientName || '-'}</td>
                      <td style={{ padding: '12px 16px', color: C.muted, fontSize: 11 }}>
                        {ad.startAt && new Date(ad.startAt).toLocaleDateString('ar-SA')}
                        {ad.startAt && ad.endAt && ' → '}
                        {ad.endAt && new Date(ad.endAt).toLocaleDateString('ar-SA')}
                        {!ad.startAt && !ad.endAt && 'دائم'}
                        {isExpired && <IoWarning size={12} style={{ color: C.red, marginRight: 4 }} />}
                        {isScheduled && <IoCalendar size={12} style={{ color: C.blue, marginRight: 4 }} />}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <button
                            onClick={() => toggleStatus(ad.id, ad.isActive)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                              background: ad.isActive ? `${C.accent}20` : `${C.red}20`,
                              color: ad.isActive ? C.accent : C.red,
                            }}
                          >
                            {ad.isActive ? '✅ مفعل' : '❌ معطل'}
                          </button>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 20,
                            fontSize: 10,
                            fontWeight: 500,
                            background: `${color}20`,
                            color: color,
                            textAlign: 'center'
                          }}>
                            {label}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => openEditModal(ad)}
                            style={{ padding: 6, borderRadius: 8, background: `${C.accent}15`, color: C.accent, border: 'none', cursor: 'pointer' }}
                            title="تعديل"
                          >
                            <IoPencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteAd(ad.id, ad.title)}
                            style={{ padding: 6, borderRadius: 8, background: `${C.red}20`, color: C.red, border: 'none', cursor: 'pointer' }}
                            title="حذف"
                          >
                            <IoTrash size={16} />
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

      {/* Add/Edit Modal - نفس الكود السابق */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingAd(null); resetForm(); }} title={editingAd ? '✏️ تعديل إعلان' : '➕ إعلان جديد'} size="lg">
        {/* ... نفس المحتوى السابق ... */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>العنوان (عربي) *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={inputStyle}
                required
                placeholder="مثال: عرض خاص بمناسبة رمضان"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>العنوان (إنجليزي)</label>
              <input
                type="text"
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                style={inputStyle}
                placeholder="Example: Special Ramadan Offer"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <ImageUploadField
                label="صورة الإعلان"
                required
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                uploadType="advertisements"
                previewAspect="21 / 9"
                hint="يُعرض كبانر بعرض الشاشة — يُفضَّل 1200×510 بكسل"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>رابط الوجهة (عند النقر)</label>
              <input
                type="url"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                style={inputStyle}
                placeholder="https://example.com/offer"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>الوصف (عربي)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                rows={2}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>الوصف (إنجليزي)</label>
              <textarea
                value={formData.descriptionEn}
                onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                rows={2}
              />
            </div>
            <div>
              <label style={labelStyle}>الموضع (0 = الأعلى)</label>
              <input
                type="number"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: Number(e.target.value) })}
                style={inputStyle}
                min={0}
              />
            </div>
            <div>
              <label style={labelStyle}>السعر (ل.س)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                style={inputStyle}
                min={0}
              />
            </div>
            <div>
              <label style={labelStyle}>تاريخ البدء (اختياري)</label>
              <input
                type="date"
                value={formData.startAt}
                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>تاريخ الانتهاء (اختياري)</label>
              <input
                type="date"
                value={formData.endAt}
                onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>معلومات العميل (للفواتير)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  type="text"
                  placeholder="اسم العميل"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="tel"
                  placeholder="رقم الهاتف"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <button type="button" onClick={() => { setShowModal(false); setEditingAd(null); resetForm(); }} style={{ padding: '10px 24px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 14 }}>
              إلغاء
            </button>
            <button type="submit" style={{ padding: '10px 32px', background: C.accent, border: 'none', borderRadius: 8, color: C.bg, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              {editingAd ? 'تحديث' : 'إنشاء'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminAdvertisements;