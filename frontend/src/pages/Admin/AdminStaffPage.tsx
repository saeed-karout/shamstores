// frontend/src/pages/Admin/AdminStaffPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoArrowBack, IoAdd, IoPencil, IoTrash, IoKey, IoStorefront, IoRefresh, IoSearch, IoRestaurant, IoBusiness } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', yellow: '#FBBF24',
};

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  storeId?: string;
  restaurantId?: string;
  store?: { id: string; name: string; slug: string };
  restaurant?: { id: string; name: string; slug: string };
  permissions: {
    viewOrders: boolean;
    updateOrderStatus: boolean;
    viewProducts: boolean;
    updateProducts: boolean;
    viewInventory: boolean;
    updateInventory: boolean;
  };
}

interface Business {
  id: string;
  name: string;
  type: 'restaurant' | 'store';
  slug: string;
  logo?: string;
}

const AdminStaffPage: React.FC = () => {
  const { businessType, businessId } = useParams<{ businessType?: string; businessId?: string }>();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showBusinessSelectModal, setShowBusinessSelectModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<{ type: string; id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    businessType: 'store' as 'restaurant' | 'store',
    businessId: ''
  });
  const [permissions, setPermissions] = useState({
    viewOrders: true,
    updateOrderStatus: false,
    viewProducts: true,
    updateProducts: false,
    viewInventory: true,
    updateInventory: false
  });
  const [filterType, setFilterType] = useState<'all' | 'platform' | 'restaurant' | 'store'>('all');


  useEffect(() => {
    if (businessId && businessType) {
      fetchBusiness();
      fetchStaff();
    } else {
      fetchBusinesses();
    }
  }, [businessId, businessType]);

  const fetchBusinesses = async () => {
    try {
      const [restaurantsRes, storesRes] = await Promise.all([
        api.get('/admin/restaurants'),
        api.get('/admin/stores')
      ]);
      
      const restaurants = (restaurantsRes.data?.data?.restaurants || restaurantsRes.data?.restaurants || []).map((r: any) => ({
        ...r,
        type: 'restaurant' as const
      }));
      
      const stores = (storesRes.data?.data?.stores || storesRes.data?.stores || []).map((s: any) => ({
        ...s,
        type: 'store' as const
      }));
      
      setBusinesses([...restaurants, ...stores]);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast.error('فشل تحميل قائمة المطاعم والمتاجر');
    }
  };

  const fetchBusiness = async () => {
    try {
      let response;
      if (businessType === 'restaurant') {
        response = await api.get(`/admin/restaurants/${businessId}`);
      } else {
        response = await api.get(`/admin/stores/${businessId}`);
      }
      setBusiness(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching business:', error);
      toast.error('فشل تحميل بيانات النشاط التجاري');
    }
  };

  const fetchStaff = async () => {
  setLoading(true);
  try {
    // ✅ استخدم المسار الصحيح لجلب جميع الموظفين (بما فيهم موظفي المنصة)
    const response = await api.get('/admin/staff');
    const staffData = response.data?.data || response.data || [];
    setStaff(Array.isArray(staffData) ? staffData : []);
  } catch (error) {
    console.error('Error fetching staff:', error);
    toast.error('حدث خطأ في جلب الموظفين');
    setStaff([]);
  } finally {
    setLoading(false);
  }
};

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      businessType: 'store',
      businessId: businessId || ''
    });
    setSelectedStaff(null);
    setSelectedBusiness(null);
  };

  const resetPermissions = () => setPermissions({
    viewOrders: true,
    updateOrderStatus: false,
    viewProducts: true,
    updateProducts: false,
    viewInventory: true,
    updateInventory: false
  });

  const handleOpenModal = (staff?: StaffMember) => {
    if (staff) {
      setSelectedStaff(staff);
      setFormData({
        name: staff.name,
        email: staff.email,
        password: '',
        phone: staff.phone || '',
        businessType: staff.storeId ? 'store' : 'restaurant',
        businessId: staff.storeId || staff.restaurantId || ''
      });
      if (staff.permissions) setPermissions(staff.permissions);
    } else {
      if (!businessId) {
        setShowBusinessSelectModal(true);
        return;
      }
      resetForm();
    }
    setShowModal(true);
  };

  const handleSelectBusiness = () => {
    if (!selectedBusiness) {
      toast.error('الرجاء اختيار مطعم أو متجر');
      return;
    }
    setFormData({
      ...formData,
      businessType: selectedBusiness.type,
      businessId: selectedBusiness.id
    });
    setShowBusinessSelectModal(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.email) {
        toast.error('الاسم والبريد الإلكتروني مطلوبان');
        return;
      }

      const targetBusinessId = formData.businessId || businessId;
      const targetBusinessType = formData.businessType || businessType;

      if (!targetBusinessId) {
        toast.error('الرجاء تحديد المطعم أو المتجر');
        return;
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        ...(formData.password && { password: formData.password })
      };

      if (selectedStaff) {
        if (targetBusinessType === 'restaurant') {
          await api.put(`/admin/restaurants/${targetBusinessId}/staff/${selectedStaff.id}`, payload);
        } else {
          await api.put(`/admin/stores/${targetBusinessId}/staff/${selectedStaff.id}`, payload);
        }
        toast.success('تم تحديث بيانات الموظف');
      } else {
        if (!formData.password) {
          toast.error('كلمة المرور مطلوبة للموظف الجديد');
          return;
        }
        if (targetBusinessType === 'restaurant') {
          await api.post(`/admin/restaurants/${targetBusinessId}/staff`, payload);
        } else {
          await api.post(`/admin/stores/${targetBusinessId}/staff`, payload);
        }
        toast.success('تم إضافة الموظف');
      }
      
      setShowModal(false);
      resetForm();
      await fetchStaff();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedStaff) return;
    
    const targetBusinessId = formData.businessId || businessId;
    const targetBusinessType = formData.businessType || businessType;
    
    try {
      if (targetBusinessType === 'restaurant') {
        await api.put(`/admin/restaurants/${targetBusinessId}/staff/${selectedStaff.id}/permissions`, { permissions });
      } else {
        await api.put(`/admin/stores/${targetBusinessId}/staff/${selectedStaff.id}/permissions`, { permissions });
      }
      toast.success('تم تحديث الصلاحيات');
      setShowPermissionsModal(false);
      setSelectedStaff(null);
      resetPermissions();
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleDelete = async (staffId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    
    const targetBusinessId = businessId;
    const targetBusinessType = businessType;
    
    if (!targetBusinessId) return;
    
    try {
      if (targetBusinessType === 'restaurant') {
        await api.delete(`/admin/restaurants/${targetBusinessId}/staff/${staffId}`);
      } else {
        await api.delete(`/admin/stores/${targetBusinessId}/staff/${staffId}`);
      }
      toast.success('تم حذف الموظف');
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleToggleActive = async (staffMember: StaffMember) => {
    const targetBusinessId = businessId;
    const targetBusinessType = businessType;
    
    if (!targetBusinessId) return;
    
    try {
      if (targetBusinessType === 'restaurant') {
        await api.patch(`/admin/restaurants/${targetBusinessId}/staff/${staffMember.id}/toggle`, {
          isActive: !staffMember.isActive
        });
      } else {
        await api.patch(`/admin/stores/${targetBusinessId}/staff/${staffMember.id}/toggle`, {
          isActive: !staffMember.isActive
        });
      }
      toast.success(`تم ${staffMember.isActive ? 'تعطيل' : 'تفعيل'} الموظف`);
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

const getFilteredStaff = () => {
  let filtered = [...staff];
  
  if (searchTerm) {
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // ✅ أضف فلتر النوع
  if (filterType === 'platform') {
    filtered = filtered.filter(s => !s.storeId && !s.restaurantId);
  } else if (filterType === 'restaurant') {
    filtered = filtered.filter(s => s.restaurantId);
  } else if (filterType === 'store') {
    filtered = filtered.filter(s => s.storeId);
  }
  
  if (filterActive === 'active') {
    filtered = filtered.filter(s => s.isActive);
  } else if (filterActive === 'inactive') {
    filtered = filtered.filter(s => !s.isActive);
  }
  
  return filtered;
};

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    fontFamily: 'Cairo, sans-serif',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: C.muted,
    fontSize: 13,
    marginBottom: 6
  };

  const PERM_SECTIONS = [
    { title: 'الطلبات', color: C.blue, items: [
      { key: 'viewOrders', label: 'عرض الطلبات' },
      { key: 'updateOrderStatus', label: 'تحديث حالة الطلب' }
    ]},
    { title: 'المنتجات', color: C.accent, items: [
      { key: 'viewProducts', label: 'عرض المنتجات' },
      { key: 'updateProducts', label: 'إضافة/تعديل/حذف المنتجات' }
    ]},
    { title: 'المخزون', color: C.purple, items: [
      { key: 'viewInventory', label: 'عرض المخزون' },
      { key: 'updateInventory', label: 'تحديث المخزون' }
    ]},
  ];

  if (loading) return <Loader fullScreen />;
  const filteredStaff = getFilteredStaff();

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate(businessId ? '/admin/stores' : '/admin/staff')}
          style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontFamily: 'Cairo, sans-serif' }}
        >
          <IoArrowBack size={18} /> العودة
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, background: businessType === 'restaurant' ? 'rgba(96,165,250,0.15)' : 'rgba(167,139,250,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {businessType === 'restaurant' ? <IoRestaurant size={22} style={{ color: C.blue }} /> : <IoStorefront size={22} style={{ color: C.purple }} />}
          </div>
          <div>
            <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800 }}>
              إدارة موظفي {business?.name || (businessType === 'restaurant' ? 'المطعم' : 'المتجر')}
            </h1>
            <p style={{ color: C.muted, fontSize: 13 }}>
              {businessType === 'restaurant' ? 'إدارة صلاحيات وبيانات موظفي المطعم' : 'إدارة صلاحيات وبيانات موظفي المتجر'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <IoSearch size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="بحث عن موظف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingRight: 36, paddingLeft: 12, paddingTop: 10, paddingBottom: 10, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value as any)} style={{ padding: '9px 12px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13, outline: 'none' }}>
          <option value="all">جميع الموظفين</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)} style={{ padding: '9px 12px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13, outline: 'none' }}>
            <option value="all">جميع الموظفين</option>
            <option value="platform">👑 موظفي المنصة</option>
            <option value="restaurant">🍽️ موظفي المطاعم</option>
            <option value="store">🛍️ موظفي المتاجر</option>
          </select>
        <Button variant="secondary" onClick={fetchStaff}><IoRefresh size={16} /></Button>
        <Button variant="primary" onClick={() => handleOpenModal()}><IoAdd size={16} style={{ marginLeft: 4 }} />إضافة موظف</Button>
      </div>

      {/* Staff Table */}
      {filteredStaff.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          {businessType === 'restaurant' ? <IoRestaurant size={48} style={{ color: C.border, marginBottom: 12 }} /> : <IoStorefront size={48} style={{ color: C.border, marginBottom: 12 }} />}
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>لا يوجد موظفين</h3>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>قم بإضافة موظفين لمساعدتك في إدارة {businessType === 'restaurant' ? 'المطعم' : 'المتجر'}</p>
          <Button variant="primary" onClick={() => handleOpenModal()}><IoAdd size={16} style={{ marginLeft: 4 }} />إضافة موظف</Button>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  {['الاسم', 'البريد', 'الهاتف', 'الحالة', 'التسجيل', 'آخر دخول', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map(member => (
                  <tr key={member.id} style={{ borderBottom: `1px solid ${C.border}` }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px', color: C.text, fontWeight: 600, fontSize: 13 }}>{member.name}</td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>{member.email}</td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>{member.phone || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => handleToggleActive(member)} style={{ background: member.isActive ? 'rgba(200,226,53,0.12)' : 'rgba(255,107,107,0.12)', color: member.isActive ? C.accent : C.red, border: 'none', borderRadius: 10, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                        {member.isActive ? 'نشط' : 'غير نشط'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12 }}>{member.createdAt ? format(new Date(member.createdAt), 'dd/MM/yyyy', { locale: ar }) : '-'}</td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12 }}>{member.lastLogin ? format(new Date(member.lastLogin), 'dd/MM/yyyy', { locale: ar }) : '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setSelectedStaff(member); if (member.permissions) setPermissions(member.permissions); setShowPermissionsModal(true); }} style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', padding: 2, display: 'flex' }} title="الصلاحيات"><IoKey size={17} /></button>
                        <button onClick={() => handleOpenModal(member)} style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', padding: 2, display: 'flex' }} title="تعديل"><IoPencil size={17} /></button>
                        <button onClick={() => handleDelete(member.id)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 2, display: 'flex' }} title="حذف"><IoTrash size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
        </div>
      )}

      {/* Business Select Modal (لإضافة موظف جديد بدون تحديد نشاط تجاري) */}
      <Modal isOpen={showBusinessSelectModal} onClose={() => setShowBusinessSelectModal(false)} title="اختر مطعماً أو متجراً" size="md">
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>اختر النشاط التجاري</label>
          <select
            value={selectedBusiness?.id || ''}
            onChange={(e) => {
              const business = businesses.find(b => b.id === e.target.value);
              if (business) setSelectedBusiness(business);
            }}
            style={inputStyle}
          >
            <option value="">-- اختر مطعماً أو متجراً --</option>
            <optgroup label="🍽️ المطاعم">
              {businesses.filter(b => b.type === 'restaurant').map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </optgroup>
            <optgroup label="🛍️ المتاجر">
              {businesses.filter(b => b.type === 'store').map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button variant="outline" onClick={() => setShowBusinessSelectModal(false)}>إلغاء</Button>
          <Button variant="primary" onClick={handleSelectBusiness}>التالي</Button>
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={selectedStaff ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'} size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!businessId && !selectedStaff && (
            <div>
              <label style={labelStyle}>النشاط التجاري</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: C.surf, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}` }}>
                {formData.businessType === 'restaurant' ? <IoRestaurant size={18} color={C.blue} /> : <IoStorefront size={18} color={C.purple} />}
                <span style={{ color: C.text }}>
                  {businesses.find(b => b.id === formData.businessId)?.name || 'غير محدد'}
                </span>
                <button
                  type="button"
                  onClick={() => { setShowBusinessSelectModal(true); setShowModal(false); }}
                  style={{ marginRight: 'auto', background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 12 }}
                >
                  تغيير
                </button>
              </div>
            </div>
          )}
          <div>
            <label style={labelStyle}>الاسم *</label>
            <input style={inputStyle} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div>
            <label style={labelStyle}>البريد الإلكتروني *</label>
            <input style={inputStyle} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div>
            <label style={labelStyle}>{selectedStaff ? 'كلمة المرور (اتركها فارغة لعدم التغيير)' : 'كلمة المرور *'}</label>
            <input style={inputStyle} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!selectedStaff} />
          </div>
          <div>
            <label style={labelStyle}>رقم الهاتف</label>
            <input style={inputStyle} type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <Button variant="primary" onClick={handleSave} fullWidth>حفظ</Button>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={showPermissionsModal} onClose={() => { setShowPermissionsModal(false); setSelectedStaff(null); resetPermissions(); }} title={`صلاحيات ${selectedStaff?.name}`} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PERM_SECTIONS.map(section => (
            <div key={section.title} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: section.color }} />
                <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{section.title}</span>
              </div>
              {section.items.map(item => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text, fontSize: 14, marginBottom: 8, paddingRight: 16 }}>
                  <input
                    type="checkbox"
                    checked={(permissions as any)[item.key]}
                    onChange={e => setPermissions({ ...permissions, [item.key]: e.target.checked })}
                    style={{ accentColor: C.accent, width: 16, height: 16, cursor: 'pointer' }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          ))}
          <Button variant="primary" onClick={handleUpdatePermissions} fullWidth>حفظ الصلاحيات</Button>
        </div>
      </Modal>
    </div>

  );
};

export default AdminStaffPage;