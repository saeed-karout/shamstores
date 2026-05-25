// frontend/src/pages/Admin/AdminDrivers.tsx

import React, { useEffect, useState } from 'react';
import { IoSearch, IoTrash, IoEye, IoCar, IoAdd, IoClose, IoLocation, IoCall, IoMail, IoCalendar, IoStatsChart, IoCheckmarkCircle, IoTime, IoCard, IoRefresh, IoMap, IoPerson, IoKey, IoBusiness, IoWarning } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const C = {
  bg: '#082E24',
  card: '#112E23',
  prim: '#0D4A3A',
  surf: '#0F3D31',
  surfL: '#164D3E',
  accent: '#C8E235',
  acDk: '#A8C220',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  blue: '#60A5FA',
  yellow: '#F59E0B',
  purple: '#A78BFA',
  orange: '#FB923C',
};

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isOnline: boolean;
  business: {
    id: string;
    name: string;
    type: 'restaurant' | 'store';
    slug?: string;
    logo?: string;
  } | null;
  businessId?: string | null;
  businessType?: string | null;
  businessName?: string | null;
  lastLocation: {
    lat: number;
    lng: number;
    updatedAt: string;
  } | null;
  driverRating?: number;
  driverRatingCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface Business {
  id: string;
  name: string;
  type: 'restaurant' | 'store';
  logo?: string;
  email?: string;
  phone?: string;
  address?: string;
}

const AdminDrivers: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [driverStats, setDriverStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    businessId: '',
    businessType: 'restaurant' as 'restaurant' | 'store'
  });
  const [assignData, setAssignData] = useState({
    driverId: '',
    businessId: '',
    businessType: 'restaurant' as 'restaurant' | 'store'
  });

  useEffect(() => {
    fetchDrivers();
    fetchBusinessesWithoutDrivers();
  }, []);

  // ✅ جلب السائقين مع معالجة صحيحة للبيانات
  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/drivers');
      console.log('Drivers response:', response);
      
      let driversData = [];
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        driversData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        driversData = response.data;
      } else if (response.data?.drivers && Array.isArray(response.data.drivers)) {
        driversData = response.data.drivers;
      } else if (Array.isArray(response)) {
        driversData = response;
      }
      
      // ✅ معالجة البيانات للتأكد من وجود businessName
      driversData = driversData.map((driver: any) => ({
        ...driver,
        businessName: driver.business?.name || driver.businessName || null,
        businessId: driver.business?.id || driver.businessId || null,
        businessType: driver.business?.type || driver.businessType || null,
      }));
      
      setDrivers(driversData);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('فشل تحميل السائقين');
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ جلب المنشآت بدون سائقين
  // ✅ جلب المنشآت بدون سائقين - نسخة محسنة
const fetchBusinessesWithoutDrivers = async () => {
  try {
    const response = await api.get('/admin/drivers/businesses-without-drivers');
    console.log('Businesses response:', response);
    
    let restaurants: any[] = [];
    let stores: any[] = [];
    
    // ✅ معالجة مختلفة للاستجابة
    if (response.data?.data?.restaurants) {
      restaurants = response.data.data.restaurants;
      stores = response.data.data.stores;
    } else if (response.data?.restaurants) {
      restaurants = response.data.restaurants;
      stores = response.data.stores;
    } else if (response.restaurants) {
      restaurants = response.restaurants;
      stores = response.stores;
    }
    
    console.log('Restaurants found:', restaurants);
    console.log('Stores found:', stores);
    
    const allBusinesses: Business[] = [
      ...restaurants.map((r: any) => ({ 
        id: r.id, 
        name: r.name, 
        type: 'restaurant' as const,
        logo: r.logo,
        email: r.email,
        phone: r.phone,
        address: r.address
      })),
      ...stores.map((s: any) => ({ 
        id: s.id, 
        name: s.name, 
        type: 'store' as const,
        logo: s.logo,
        email: s.email,
        phone: s.phone,
        address: s.address
      }))
    ];
    
    console.log('All businesses for assignment:', allBusinesses);
    setBusinesses(allBusinesses);
    
    if (allBusinesses.length === 0) {
      toast('لا توجد منشآت متاحة لتعيين سائقين', { icon: 'ℹ️' });
    }
  } catch (error) {
    console.error('Error fetching businesses:', error);
    toast.error('فشل تحميل المنشآت');
    setBusinesses([]);
  }
};

  // ✅ جلب تفاصيل سائق
  const fetchDriverDetails = async (driverId: string) => {
    setStatsLoading(true);
    try {
      const response = await api.get(`/admin/drivers/${driverId}`);
      console.log('Driver details response:', response);
      
      let driverData = null;
      if (response.data?.data) {
        driverData = response.data.data;
      } else if (response.data && response.data.id) {
        driverData = response.data;
      } else if (response.id) {
        driverData = response;
      }
      
      console.log('Driver data processed:', driverData);
      setDriverStats(driverData);
    } catch (error) {
      console.error('Error fetching driver details:', error);
      toast.error('فشل تحميل تفاصيل السائق');
    } finally {
      setStatsLoading(false);
    }
  };

  // ✅ عرض تفاصيل السائق
  const viewDetails = async (driver: Driver) => {
    console.log('Viewing driver details for:', driver);
    setSelectedDriver(driver);
    setShowDetailsModal(true);
    await fetchDriverDetails(driver.id);
  };

  // ✅ فتح نافذة التعديل
  const openEditModal = (driver: any) => {
    setEditFormData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone || '',
      password: ''
    });
    setSelectedDriver(driver);
    setShowEditModal(true);
  };

  // ✅ تحديث بيانات السائق
  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone
      };
      
      if (editFormData.password) {
        payload.password = editFormData.password;
      }
      
      const response = await api.put(`/admin/users/${selectedDriver?.id}`, payload);
      
      if (response.data?.success) {
        toast.success('تم تحديث بيانات السائق بنجاح');
        setShowEditModal(false);
        fetchDrivers();
        if (selectedDriver) {
          await fetchDriverDetails(selectedDriver.id);
        }
      } else {
        toast.error(response.data?.error || 'فشل تحديث البيانات');
      }
    } catch (error: any) {
      console.error('Update driver error:', error);
      toast.error(error.response?.data?.error || 'فشل تحديث بيانات السائق');
    }
  };

  // ✅ تبديل حالة الحساب (تفعيل/تعطيل)
  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/drivers/${id}/toggle`);
      toast.success(currentStatus ? 'تم تعطيل السائق' : 'تم تفعيل السائق');
      fetchDrivers();
      if (selectedDriver?.id === id) {
        await fetchDriverDetails(id);
      }
    } catch (error) {
      toast.error('فشل تغيير حالة السائق');
    }
  };

  // ✅ إعادة تعيين كلمة المرور
  const resetDriverPassword = async (driverId: string) => {
    const newPassword = prompt('أدخل كلمة المرور الجديدة (6 أحرف على الأقل)');
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    try {
      await api.post(`/admin/users/${driverId}/reset-password`, { password: newPassword });
      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.response?.data?.error || 'فشل إعادة تعيين كلمة المرور');
    }
  };

  // ✅ حذف سائق
  const deleteDriver = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف السائق "${name}"؟`)) return;
    try {
      await api.delete(`/admin/drivers/${id}`);
      toast.success('تم حذف السائق بنجاح');
      fetchDrivers();
      if (selectedDriver?.id === id) {
        setShowDetailsModal(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل حذف السائق');
    }
  };

  // ✅ إزالة سائق من منشأة
  const removeDriverFromBusiness = async (driverId: string, businessName: string) => {
    if (!window.confirm(`هل أنت متأكد من إزالة السائق من "${businessName}"؟`)) return;
    try {
      await api.delete(`/admin/drivers/${driverId}/assign`);
      toast.success('تم إزالة السائق من المنشأة بنجاح');
      fetchDrivers();
      if (selectedDriver?.id === driverId) {
        await fetchDriverDetails(driverId);
      }
      fetchBusinessesWithoutDrivers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل إزالة السائق');
    }
  };

  // ✅ إنشاء سائق جديد
  const createDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        businessId: formData.businessId || undefined,
        businessType: formData.businessType
      };
      
      const response = await api.post('/admin/drivers', payload);
      
      if (response.data?.success || response.success) {
        toast.success('تم إنشاء السائق بنجاح');
        setShowCreateModal(false);
        setFormData({ name: '', email: '', password: '', phone: '', businessId: '', businessType: 'restaurant' });
        fetchDrivers();
        fetchBusinessesWithoutDrivers();
      } else {
        toast.error(response.data?.error || 'فشل إنشاء السائق');
      }
    } catch (error: any) {
      console.error('Create driver error:', error);
      toast.error(error.response?.data?.error || 'فشل إنشاء السائق');
    }
  };

  // ✅ تعيين سائق لمنشأة
  const assignDriverToBusiness = async () => {
    if (!assignData.driverId || !assignData.businessId) {
      toast.error('الرجاء اختيار السائق والمنشأة');
      return;
    }
    try {
      await api.post(`/admin/drivers/${assignData.driverId}/assign`, {
        businessId: assignData.businessId,
        businessType: assignData.businessType
      });
      toast.success('تم تعيين السائق بنجاح');
      setShowAssignModal(false);
      setAssignData({ driverId: '', businessId: '', businessType: 'restaurant' });
      fetchDrivers();
      fetchBusinessesWithoutDrivers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل تعيين السائق');
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Loader fullScreen />;

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'right',
    color: C.muted,
    fontSize: 12,
    fontWeight: 600,
    background: C.surf,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    color: C.text,
    fontSize: 13,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'middle',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
    fontSize: 14,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 500,
    color: C.text,
  };

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🚚 إدارة السائقين</h1>
          <p style={{ color: C.muted, fontSize: 13 }}>إدارة سائقي التوصيل للمطاعم والمتاجر</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowAssignModal(true)}
            style={{
              padding: '8px 16px',
              background: `${C.blue}20`,
              border: `1px solid ${C.blue}`,
              borderRadius: 10,
              color: C.blue,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
            }}
          >
            <IoCar size={18} />
            تعيين سائق
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 20px',
              background: C.accent,
              border: 'none',
              borderRadius: 10,
              color: C.bg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <IoAdd size={18} />
            سائق جديد
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${C.accent}20`, padding: 8, borderRadius: 10 }}>
              <IoPerson size={20} color={C.accent} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{drivers.length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>إجمالي السائقين</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${C.accent}20`, padding: 8, borderRadius: 10 }}>
              <IoCheckmarkCircle size={20} color={C.accent} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{drivers.filter(d => d.isActive).length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>حسابات نشطة</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${C.blue}20`, padding: 8, borderRadius: 10 }}>
              <IoLocation size={20} color={C.blue} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{drivers.filter(d => d.lastLocation).length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>مشاركي الموقع</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${C.purple}20`, padding: 8, borderRadius: 10 }}>
              <IoBusiness size={20} color={C.purple} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{businesses.length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>بحاجة سائقين</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 300 }}>
          <input
            type="text"
            placeholder="بحث بالاسم، البريد، أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: C.surf,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              padding: '10px 40px 10px 14px',
              fontSize: 14,
              outline: 'none',
              width: '100%',
            }}
          />
          <IoSearch style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
        </div>
      </div>

      {/* Drivers Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>الاسم</th>
                <th style={thStyle}>البريد الإلكتروني</th>
                <th style={thStyle}>رقم الهاتف</th>
                <th style={thStyle}>مرتبط بـ</th>
                <th style={thStyle}>التقييم</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>تاريخ التسجيل</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver, index) => (
                <tr
                  key={driver.id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, color: C.muted, width: 40 }}>{index + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{driver.name}</td>
                  <td style={{ ...tdStyle, color: C.muted }}>{driver.email}</td>
                  <td style={tdStyle}>{driver.phone || '-'}</td>
                  <td style={tdStyle}>
                    {driver.business ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 600,
                          background: driver.business.type === 'restaurant' ? `${C.blue}20` : `${C.purple}20`,
                          color: driver.business.type === 'restaurant' ? C.blue : C.purple,
                        }}>
                          {driver.business.type === 'restaurant' ? '🍽️ ' : '🛍️ '}
                          {driver.business.name}
                        </span>
                        <button
                          onClick={() => removeDriverFromBusiness(driver.id, driver.business!.name)}
                          title="إزالة من المنشأة"
                          style={{
                            padding: '2px 6px',
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            background: `${C.red}20`,
                            color: C.red,
                            fontSize: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <IoClose size={12} /> إزالة
                        </button>
                      </div>
                    ) : '-'}
                  </td>
                  <td style={tdStyle}>
                    {driver.driverRating && driver.driverRating > 0 ? (
                      <span style={{ color: C.yellow }}>
                        ⭐ {driver.driverRating.toFixed(1)} ({driver.driverRatingCount})
                      </span>
                    ) : '-'}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button
                        onClick={() => toggleStatus(driver.id, driver.isActive)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background: driver.isActive ? `${C.accent}20` : `${C.red}20`,
                          color: driver.isActive ? C.accent : C.red,
                        }}
                      >
                        {driver.isActive ? '✅ حساب نشط' : '❌ حساب معطل'}
                      </button>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 500,
                        background: driver.isOnline ? `${C.blue}15` : `${C.muted}10`,
                        color: driver.isOnline ? C.blue : C.muted,
                        textAlign: 'center'
                      }}>
                        {driver.isOnline ? '🟢 متصل' : '⚫ غير متصل'}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: C.muted }}>
                    {new Date(driver.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => viewDetails(driver)}
                        title="عرض التفاصيل"
                        style={{
                          padding: 6,
                          borderRadius: 8,
                          border: 'none',
                          cursor: 'pointer',
                          background: `${C.accent}15`,
                          color: C.accent,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <IoEye size={16} />
                      </button>
                      <button
                        onClick={() => deleteDriver(driver.id, driver.name)}
                        title="حذف"
                        style={{
                          padding: 6,
                          borderRadius: 8,
                          border: 'none',
                          cursor: 'pointer',
                          background: `${C.red}20`,
                          color: C.red,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <IoTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredDrivers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
          {searchTerm ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد سائقون'}
        </div>
      )}

      {/* ==================== MODAL: إنشاء سائق جديد ==================== */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="➕ إنشاء سائق جديد" size="md">
        <form onSubmit={createDriver}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>الاسم الكامل *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle}
              placeholder="مثال: أحمد محمد"
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>البريد الإلكتروني *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle}
              placeholder="example@domain.com"
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>كلمة المرور *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={inputStyle}
              placeholder="********"
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>رقم الهاتف</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={inputStyle}
              placeholder="05XXXXXXXX"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>نوع المنشأة</label>
            <select
              value={formData.businessType}
              onChange={(e) => setFormData({ ...formData, businessType: e.target.value as 'restaurant' | 'store', businessId: '' })}
              style={inputStyle}
            >
              <option value="restaurant">🍽️ مطعم</option>
              <option value="store">🛍️ متجر</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>المنشأة (اختياري)</label>
            <select
              value={formData.businessId}
              onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
              style={inputStyle}
            >
              <option value="">-- اختر المنشأة --</option>
              {businesses.filter(b => b.type === formData.businessType).map(business => (
                <option key={business.id} value={business.id}>{business.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer' }}>
              إلغاء
            </button>
            <button type="submit" style={{ padding: '8px 24px', background: C.accent, border: 'none', borderRadius: 8, color: C.bg, cursor: 'pointer', fontWeight: 600 }}>
              إنشاء
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================== MODAL: تعيين سائق لمنشأة ==================== */}
      {/* ==================== MODAL: تعيين سائق لمنشأة ==================== */}
<Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="🔄 تعيين سائق لمنشأة" size="md">
  <div style={{ marginBottom: 16 }}>
    <label style={labelStyle}>اختر السائق</label>
    <select
      value={assignData.driverId}
      onChange={(e) => setAssignData({ ...assignData, driverId: e.target.value })}
      style={inputStyle}
    >
      <option value="">-- اختر السائق --</option>
      {drivers.filter(d => !d.business).map(driver => (
        <option key={driver.id} value={driver.id}>
          {driver.name} ({driver.email})
        </option>
      ))}
    </select>
    {drivers.filter(d => !d.business).length === 0 && (
      <p style={{ color: C.yellow, fontSize: 12, marginTop: 8 }}>
        ⚠️ لا يوجد سائقون غير مرتبطين بمنشأة
      </p>
    )}
  </div>
  
  <div style={{ marginBottom: 16 }}>
    <label style={labelStyle}>نوع المنشأة</label>
    <select
      value={assignData.businessType}
      onChange={(e) => setAssignData({ ...assignData, businessType: e.target.value as 'restaurant' | 'store', businessId: '' })}
      style={inputStyle}
    >
      <option value="restaurant">🍽️ مطعم</option>
      <option value="store">🛍️ متجر</option>
    </select>
  </div>
  
  <div style={{ marginBottom: 16 }}>
    <label style={labelStyle}>اختر المنشأة</label>
    <select
      value={assignData.businessId}
      onChange={(e) => setAssignData({ ...assignData, businessId: e.target.value })}
      style={inputStyle}
    >
      <option value="">-- اختر المنشأة --</option>
      {businesses
        .filter(b => b.type === assignData.businessType)
        .map(business => (
          <option key={business.id} value={business.id}>
            {business.type === 'restaurant' ? '🍽️' : '🛍️'} {business.name}
          </option>
        ))}
    </select>
    {businesses.filter(b => b.type === assignData.businessType).length === 0 && (
      <p style={{ color: C.yellow, fontSize: 12, marginTop: 8 }}>
        ⚠️ لا توجد {assignData.businessType === 'restaurant' ? 'مطاعم' : 'متاجر'} متاحة لتعيين سائق
      </p>
    )}
  </div>
  
  {/* عرض إحصاءات سريعة */}
  <div style={{ 
    background: C.surf, 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 16,
    fontSize: 12,
    color: C.muted
  }}>
    <div>📊 ملخص:</div>
    <div>• مطاعم متاحة: {businesses.filter(b => b.type === 'restaurant').length}</div>
    <div>• متاجر متاحة: {businesses.filter(b => b.type === 'store').length}</div>
    <div>• سائقين غير مرتبطين: {drivers.filter(d => !d.business).length}</div>
  </div>
  
  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
    <button onClick={() => setShowAssignModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer' }}>
      إلغاء
    </button>
    <button 
      onClick={assignDriverToBusiness} 
      disabled={!assignData.driverId || !assignData.businessId}
      style={{ 
        padding: '8px 24px', 
        background: (!assignData.driverId || !assignData.businessId) ? C.muted : C.blue, 
        border: 'none', 
        borderRadius: 8, 
        color: '#fff', 
        cursor: (!assignData.driverId || !assignData.businessId) ? 'not-allowed' : 'pointer', 
        fontWeight: 600,
        opacity: (!assignData.driverId || !assignData.businessId) ? 0.6 : 1
      }}
    >
      تعيين
    </button>
  </div>
</Modal>

      {/* ==================== MODAL: تفاصيل السائق ==================== */}
      <Modal isOpen={showDetailsModal} onClose={() => { 
        setShowDetailsModal(false); 
        setSelectedDriver(null); 
        setDriverStats(null); 
      }} title={`🚚 تفاصيل السائق: ${driverStats?.name || selectedDriver?.name || ''}`} size="lg">
        {statsLoading ? (
          <Loader />
        ) : driverStats && driverStats.id ? (
          <div>
            {/* معلومات أساسية */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: `${C.accent}20`, padding: 12, borderRadius: 50 }}>
                    <IoPerson size={24} color={C.accent} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{driverStats.name}</div>
                    <div style={{ color: C.muted, fontSize: 13 }}>{driverStats.email}</div>
                    <button
                      onClick={() => openEditModal(driverStats)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.accent,
                        cursor: 'pointer',
                        fontSize: 12,
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <IoKey size={12} /> تعديل البيانات
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {driverStats.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                      <IoCall size={14} /> {driverStats.phone}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                    <IoCalendar size={14} /> انضم: {new Date(driverStats.createdAt).toLocaleDateString('ar-SA')}
                  </div>
                  {driverStats.restaurant && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                      <IoBusiness size={14} /> مرتبط بـ: 
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: `${C.blue}20`,
                        color: C.blue,
                      }}>
                        🍽️ {driverStats.restaurant.name}
                      </span>
                      <button
                        onClick={() => removeDriverFromBusiness(driverStats.id, driverStats.restaurant.name)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          background: `${C.red}20`,
                          color: C.red,
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <IoClose size={12} /> إزالة
                      </button>
                    </div>
                  )}
                  {driverStats.store && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                      <IoBusiness size={14} /> مرتبط بـ: 
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: `${C.purple}20`,
                        color: C.purple,
                      }}>
                        🛍️ {driverStats.store.name}
                      </span>
                      <button
                        onClick={() => removeDriverFromBusiness(driverStats.id, driverStats.store.name)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          background: `${C.red}20`,
                          color: C.red,
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <IoClose size={12} /> إزالة
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>
                      {driverStats.stats?.totalDeliveries || 0}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>إجمالي التوصيل</div>
                  </div>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>
                      {driverStats.stats?.totalEarnings || 0} ر.س
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>إجمالي الأرباح</div>
                  </div>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.yellow }}>
                      {driverStats.stats?.averageRating ? driverStats.stats.averageRating.toFixed(1) : '0'}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>متوسط التقييم</div>
                  </div>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: driverStats.isActive ? C.accent : C.red }}>
                      {driverStats.isActive ? (driverStats.isOnline ? '📱 متصل' : '✅ نشط') : '⛔ غير نشط'}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>الحالة</div>
                  </div>
                </div>
              </div>
            </div>

            {/* معلومات إضافية */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📍 معلومات إضافية</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                <div style={{ background: C.surf, padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: C.muted }}>معرف السائق</div>
                  <div style={{ fontSize: 12, color: C.text, fontFamily: 'monospace' }}>{driverStats.id}</div>
                </div>
                <div style={{ background: C.surf, padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: C.muted }}>التقييمات المستلمة</div>
                  <div style={{ fontSize: 12, color: C.text }}>{driverStats.driverRatingCount || 0} تقييم</div>
                </div>
                <div style={{ background: C.surf, padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: C.muted }}>آخر تحديث</div>
                  <div style={{ fontSize: 12, color: C.text }}>{new Date(driverStats.updatedAt).toLocaleString('ar-SA')}</div>
                </div>
              </div>
            </div>

            {/* حالة الحساب والاتصال */}
            <div style={{ marginBottom: 20, padding: 16, background: C.surf, borderRadius: 12 }}>
              <h4 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📊 حالة السائق</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>حالة الحساب في النظام</div>
                  <button
                    onClick={() => toggleStatus(driverStats.id, driverStats.isActive)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 99,
                      fontSize: 12,
                      border: 'none',
                      cursor: 'pointer',
                      background: driverStats.isActive ? `${C.accent}20` : `${C.red}20`,
                      color: driverStats.isActive ? C.accent : C.red,
                    }}
                  >
                    {driverStats.isActive ? '✅ مفعل' : '❌ معطل'}
                  </button>
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    {driverStats.isActive 
                      ? 'السائق يمكنه تسجيل الدخول واستلام الطلبات' 
                      : 'السائق لا يمكنه استخدام التطبيق'}
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>حالة الاتصال</div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 99,
                    fontSize: 12,
                    background: driverStats.isOnline ? `${C.blue}20` : `${C.muted}15`,
                    color: driverStats.isOnline ? C.blue : C.muted,
                  }}>
                    {driverStats.isOnline ? '🟢 متصل حالياً' : '⚫ غير متصل'}
                  </span>
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    {driverStats.isOnline 
                      ? 'السائق متصل وجاهز لاستلام الطلبات' 
                      : 'السائق غير متصل حالياً (قد يكون خارج التطبيق أو في إجازة)'}
                  </p>
                </div>
              </div>
            </div>

            {/* أزرار الإجراءات للسوبر أدمن */}
            <div style={{ display: 'flex', gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={() => resetDriverPassword(driverStats.id)}
                style={{
                  padding: '8px 20px',
                  background: `${C.accent}20`,
                  border: `1px solid ${C.accent}`,
                  borderRadius: 8,
                  color: C.accent,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                <IoKey size={16} />
                إعادة تعيين كلمة المرور
              </button>
              <button
                onClick={() => {
                  toggleStatus(driverStats.id, driverStats.isActive);
                }}
                style={{
                  padding: '8px 20px',
                  background: driverStats.isActive ? `${C.red}20` : `${C.accent}20`,
                  border: `1px solid ${driverStats.isActive ? C.red : C.accent}`,
                  borderRadius: 8,
                  color: driverStats.isActive ? C.red : C.accent,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                {driverStats.isActive ? 'تعطيل السائق' : 'تفعيل السائق'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`هل أنت متأكد من حذف السائق "${driverStats.name}"؟`)) {
                    deleteDriver(driverStats.id, driverStats.name);
                    setShowDetailsModal(false);
                  }
                }}
                style={{
                  padding: '8px 20px',
                  background: `${C.red}20`,
                  border: `1px solid ${C.red}`,
                  borderRadius: 8,
                  color: C.red,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                <IoTrash size={16} />
                حذف السائق
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 32, color: C.muted }}>
            {statsLoading ? 'جاري التحميل...' : 'لا توجد تفاصيل'}
          </div>
        )}
      </Modal>

      {/* ==================== MODAL: تعديل بيانات السائق ==================== */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ تعديل بيانات السائق" size="md">
        <form onSubmit={handleUpdateDriver}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>الاسم الكامل *</label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>البريد الإلكتروني *</label>
            <input
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>رقم الهاتف</label>
            <input
              type="tel"
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)</label>
            <input
              type="password"
              value={editFormData.password}
              onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
              style={inputStyle}
              placeholder="********"
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer' }}>
              إلغاء
            </button>
            <button type="submit" style={{ padding: '8px 24px', background: C.accent, border: 'none', borderRadius: 8, color: C.bg, cursor: 'pointer', fontWeight: 600 }}>
              حفظ التغييرات
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDrivers;