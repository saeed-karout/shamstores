import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoArrowBack, IoAdd, IoPencil, IoTrash, IoKey, IoStorefront, IoRefresh, IoSearch } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

interface StaffMember {
  id: string; name: string; email: string; phone: string; role: string; isActive: boolean;
  lastLogin: string | null; createdAt: string; storeId: string;
  store?: { id: string; name: string; slug: string };
  permissions: { viewOrders: boolean; updateOrderStatus: boolean; viewProducts: boolean; updateProducts: boolean; viewInventory: boolean; updateInventory: boolean };
}

const AdminStaffPage: React.FC = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', storeId: '' });
  const [permissions, setPermissions] = useState({ viewOrders: true, updateOrderStatus: false, viewProducts: true, updateProducts: false, viewInventory: true, updateInventory: false });

  useEffect(() => {
    if (storeId) { fetchStore(); fetchStaff(); }
  }, [storeId]);

  const fetchStore = async () => {
    try { setStore(await api.get(`/admin/stores/${storeId}`)); }
    catch { toast.error('فشل تحميل بيانات المتجر'); }
  };

  const fetchStaff = async () => {
    try { const data = await api.get(`/admin/stores/${storeId}/staff`); setStaff(Array.isArray(data) ? data : []); }
    catch { toast.error('حدث خطأ في جلب الموظفين'); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setFormData({ name: '', email: '', password: '', phone: '', storeId: storeId || '' }); setSelectedStaff(null); };
  const resetPermissions = () => setPermissions({ viewOrders: true, updateOrderStatus: false, viewProducts: true, updateProducts: false, viewInventory: true, updateInventory: false });

  const handleOpenModal = (s?: StaffMember) => {
    if (s) { setSelectedStaff(s); setFormData({ name: s.name, email: s.email, password: '', phone: s.phone || '', storeId: s.storeId }); if (s.permissions) setPermissions(s.permissions); }
    else resetForm();
    setShowModal(true);
  };

  const handleOpenPermissionsModal = (s: StaffMember) => {
    setSelectedStaff(s); if (s.permissions) setPermissions(s.permissions); else resetPermissions(); setShowPermissionsModal(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.email) { toast.error('الاسم والبريد الإلكتروني مطلوبان'); return; }
      if (selectedStaff) { await api.put(`/admin/stores/${storeId}/staff/${selectedStaff.id}`, formData); toast.success('تم تحديث بيانات الموظف'); }
      else { if (!formData.password) { toast.error('كلمة المرور مطلوبة للموظف الجديد'); return; } await api.post(`/admin/stores/${storeId}/staff`, formData); toast.success('تم إضافة الموظف'); }
      setShowModal(false); resetForm(); await fetchStaff();
    } catch (error: any) { toast.error(error.response?.data?.error || 'حدث خطأ'); }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedStaff) return;
    try { await api.put(`/admin/stores/${storeId}/staff/${selectedStaff.id}/permissions`, { permissions }); toast.success('تم تحديث الصلاحيات'); setShowPermissionsModal(false); setSelectedStaff(null); resetPermissions(); await fetchStaff(); }
    catch (error: any) { toast.error(error.response?.data?.error || 'حدث خطأ'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    try { await api.delete(`/admin/stores/${storeId}/staff/${id}`); toast.success('تم حذف الموظف'); await fetchStaff(); }
    catch (error: any) { toast.error(error.response?.data?.error || 'حدث خطأ'); }
  };

  const handleToggleActive = async (s: StaffMember) => {
    try { await api.patch(`/admin/stores/${storeId}/staff/${s.id}/toggle`, { isActive: !s.isActive }); toast.success(`تم ${s.isActive ? 'تعطيل' : 'تفعيل'} الموظف`); await fetchStaff(); }
    catch (error: any) { toast.error(error.response?.data?.error || 'حدث خطأ'); }
  };

  const getFilteredStaff = () => {
    let f = [...staff];
    if (searchTerm) f = f.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterActive === 'active') f = f.filter(s => s.isActive);
    else if (filterActive === 'inactive') f = f.filter(s => !s.isActive);
    return f;
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', color: C.muted, fontSize: 13, marginBottom: 6 };

  const PERM_SECTIONS = [
    { title: 'الطلبات', color: C.blue, items: [{ key: 'viewOrders', label: 'عرض الطلبات' }, { key: 'updateOrderStatus', label: 'تحديث حالة الطلب' }] },
    { title: 'المنتجات', color: C.accent, items: [{ key: 'viewProducts', label: 'عرض المنتجات' }, { key: 'updateProducts', label: 'إضافة/تعديل/حذف المنتجات' }] },
    { title: 'المخزون', color: C.purple, items: [{ key: 'viewInventory', label: 'عرض المخزون' }, { key: 'updateInventory', label: 'تحديث المخزون' }] },
  ];

  if (loading) return <Loader fullScreen />;
  const filteredStaff = getFilteredStaff();

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/admin/stores')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
          <IoArrowBack size={18} /> العودة
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, background: 'rgba(167,139,250,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IoStorefront size={22} style={{ color: C.purple }} />
          </div>
          <div>
            <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800 }}>إدارة موظفي {store?.name || 'المتجر'}</h1>
            <p style={{ color: C.muted, fontSize: 13 }}>إدارة صلاحيات وبيانات موظفي المتجر</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <IoSearch size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          <input type="text" placeholder="بحث عن موظف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', paddingRight: 36, paddingLeft: 12, paddingTop: 10, paddingBottom: 10, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value as any)} style={{ padding: '9px 12px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13, outline: 'none' }}>
          <option value="all">جميع الموظفين</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
        <Button variant="secondary" onClick={fetchStaff}><IoRefresh size={16} /></Button>
        <Button variant="primary" onClick={() => handleOpenModal()}><IoAdd size={16} style={{ marginLeft: 4 }} />إضافة موظف</Button>
      </div>

      {filteredStaff.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <IoStorefront size={48} style={{ color: C.border, marginBottom: 12 }} />
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>لا يوجد موظفين</h3>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>قم بإضافة موظفين لمساعدتك في إدارة المتجر</p>
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
                        <button onClick={() => handleOpenPermissionsModal(member)} style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', padding: 2, display: 'flex' }} title="الصلاحيات"><IoKey size={17} /></button>
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

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={selectedStaff ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelStyle}>الاسم *</label><input style={inputStyle} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
          <div><label style={labelStyle}>البريد الإلكتروني *</label><input style={inputStyle} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required /></div>
          <div><label style={labelStyle}>{selectedStaff ? 'كلمة المرور (اتركها فارغة لعدم التغيير)' : 'كلمة المرور *'}</label><input style={inputStyle} type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!selectedStaff} /></div>
          <div><label style={labelStyle}>رقم الهاتف</label><input style={inputStyle} type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
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
                  <input type="checkbox" checked={(permissions as any)[item.key]} onChange={e => setPermissions({ ...permissions, [item.key]: e.target.checked })} style={{ accentColor: C.accent, width: 16, height: 16, cursor: 'pointer' }} />
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
