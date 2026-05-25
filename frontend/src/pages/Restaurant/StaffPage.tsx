import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { User } from '../../services/types';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoAdd, IoPencil, IoTrash, IoKey } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { useCurrentPlan } from '../../hooks/stores/useCurrentPlan';

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

const StaffPage: React.FC = () => {
  const { isFree, loading: planLoading } = useCurrentPlan();
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [permissions, setPermissions] = useState({
    viewOrders: true,
    updateOrderStatus: false,
    viewMenu: true,
    updateMenu: false,
    viewTables: true,
    updateTables: false,
  });

  useEffect(() => {
    if (planLoading) return;
    if (isFree) {
      setLoading(false);
      return;
    }
    fetchStaff();
  }, [planLoading, isFree]);

  const fetchStaff = async () => {
    try {
      const data = await api.get<User[]>('/restaurants/staff');
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', phone: '' });
    setSelectedStaff(null);
  };

  const resetPermissions = () => {
    setPermissions({
      viewOrders: true,
      updateOrderStatus: false,
      viewMenu: true,
      updateMenu: false,
      viewTables: true,
      updateTables: false,
    });
  };

  const handleOpenModal = (staffMember?: User) => {
    if (staffMember) {
      setSelectedStaff(staffMember);
      setFormData({
        name: staffMember.name,
        email: staffMember.email,
        password: '',
        phone: staffMember.phone || '',
      });
      if (staffMember.permissions) {
        setPermissions(staffMember.permissions as any);
      }
    }
    setShowModal(true);
  };

  const handleOpenPermissionsModal = (staffMember: User) => {
    setSelectedStaff(staffMember);
    if (staffMember.permissions) {
      setPermissions(staffMember.permissions as any);
    } else {
      resetPermissions();
    }
    setShowPermissionsModal(true);
  };

  const handleSave = async () => {
    try {
      if (selectedStaff) {
        await api.put(`/restaurants/staff/${selectedStaff.id}`, formData);
        toast.success('تم تحديث بيانات الموظف');
      } else {
        await api.post('/restaurants/staff', formData);
        toast.success('تم إضافة الموظف');
      }
      setShowModal(false);
      resetForm();
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedStaff) return;
    try {
      await api.put(`/restaurants/staff/${selectedStaff.id}`, { permissions });
      toast.success('تم تحديث الصلاحيات');
      setShowPermissionsModal(false);
      setSelectedStaff(null);
      resetPermissions();
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    try {
      await api.delete(`/restaurants/staff/${id}`);
      toast.success('تم حذف الموظف');
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleToggleActive = async (staffMember: User) => {
    try {
      await api.put(`/restaurants/staff/${staffMember.id}`, { isActive: !staffMember.isActive });
      toast.success(`تم ${staffMember.isActive ? 'تعطيل' : 'تفعيل'} الموظف`);
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const PermCheckbox = ({
    label,
    checked,
    onChange,
  }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: C.accent, width: 16, height: 16 }}
      />
      <span style={{ color: C.text, fontSize: 14 }}>{label}</span>
    </label>
  );

  if (planLoading || loading) return <Loader fullScreen />;

  if (isFree) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: 24, direction: 'rtl', color: C.text }}>
        <div style={{ maxWidth: 520, margin: '40px auto', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, textAlign: 'center' }}>
          <IoKey size={48} color={C.accent} style={{ marginBottom: 12 }} />
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>إدارة الموظفين غير متاحة</h2>
          <p style={{ color: C.muted, margin: '0 0 20px' }}>
            هذه الميزة متاحة فقط في الخطط المدفوعة. قم بترقية خطتك للمتابعة.
          </p>
          <Button
            onClick={() => {
              window.location.href = '/plans';
            }}
          >
            ترقية الخطة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, direction: 'rtl', color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>إدارة الموظفين</h1>
        <button
          onClick={() => handleOpenModal()}
          style={{ background: C.accent, color: C.bg, padding: '8px 20px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, border: 'none', fontSize: 14 }}
        >
          <IoAdd size={16} />
          إضافة موظف
        </button>
      </div>

      {/* Staff Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.surf }}>
              {['الاسم', 'البريد الإلكتروني', 'الهاتف', 'الحالة', 'آخر دخول', 'الإجراءات'].map(h => (
                <th key={h} style={{ padding: '12px 20px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map(member => (
              <tr
                key={member.id}
                style={{ borderTop: `1px solid ${C.border}` }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(200,226,53,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
              >
                <td style={{ padding: '14px 20px', whiteSpace: 'nowrap', color: C.text, fontWeight: 500 }}>
                  {member.name}
                </td>
                <td style={{ padding: '14px 20px', whiteSpace: 'nowrap', color: C.muted, fontSize: 13 }}>
                  {member.email}
                </td>
                <td style={{ padding: '14px 20px', whiteSpace: 'nowrap', color: C.muted, fontSize: 13 }}>
                  {member.phone || '-'}
                </td>
                <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => handleToggleActive(member)}
                    style={{
                      padding: '3px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: member.isActive ? 'rgba(200,226,53,0.15)' : 'rgba(255,107,107,0.15)',
                      color: member.isActive ? C.accent : C.red,
                    }}
                  >
                    {member.isActive ? 'نشط' : 'غير نشط'}
                  </button>
                </td>
                <td style={{ padding: '14px 20px', whiteSpace: 'nowrap', fontSize: 13, color: C.muted }}>
                  {member.lastLogin
                    ? new Date(member.lastLogin).toLocaleDateString('ar-SA')
                    : '-'}
                </td>
                <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleOpenPermissionsModal(member)}
                      style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', padding: 4 }}
                      title="الصلاحيات"
                    >
                      <IoKey size={17} />
                    </button>
                    <button
                      onClick={() => handleOpenModal(member)}
                      style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', padding: 4 }}
                      title="تعديل"
                    >
                      <IoPencil size={17} />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 4 }}
                      title="حذف"
                    >
                      <IoTrash size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Staff Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={selectedStaff ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>الاسم</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>البريد الإلكتروني</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>
              {selectedStaff ? 'كلمة المرور (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={inputStyle}
              required={!selectedStaff}
            />
          </div>
          <div>
            <label style={labelStyle}>رقم الهاتف</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={inputStyle}
            />
          </div>
          <button
            onClick={handleSave}
            style={{ background: C.accent, color: C.bg, padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: 15 }}
          >
            حفظ
          </button>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => { setShowPermissionsModal(false); setSelectedStaff(null); resetPermissions(); }}
        title={`صلاحيات ${selectedStaff?.name}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Orders */}
          <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
            <h3 style={{ fontWeight: 600, color: C.text, marginBottom: 12, marginTop: 0, fontSize: 15 }}>الطلبات</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PermCheckbox
                label="عرض الطلبات"
                checked={permissions.viewOrders}
                onChange={(v) => setPermissions({ ...permissions, viewOrders: v })}
              />
              <PermCheckbox
                label="تحديث حالة الطلب"
                checked={permissions.updateOrderStatus}
                onChange={(v) => setPermissions({ ...permissions, updateOrderStatus: v })}
              />
            </div>
          </div>

          {/* Menu */}
          <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
            <h3 style={{ fontWeight: 600, color: C.text, marginBottom: 12, marginTop: 0, fontSize: 15 }}>القائمة</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PermCheckbox
                label="عرض القائمة"
                checked={permissions.viewMenu}
                onChange={(v) => setPermissions({ ...permissions, viewMenu: v })}
              />
              <PermCheckbox
                label="تعديل القائمة"
                checked={permissions.updateMenu}
                onChange={(v) => setPermissions({ ...permissions, updateMenu: v })}
              />
            </div>
          </div>

          {/* Tables */}
          <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
            <h3 style={{ fontWeight: 600, color: C.text, marginBottom: 12, marginTop: 0, fontSize: 15 }}>الطاولات</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PermCheckbox
                label="عرض الطاولات"
                checked={permissions.viewTables}
                onChange={(v) => setPermissions({ ...permissions, viewTables: v })}
              />
              <PermCheckbox
                label="تعديل الطاولات"
                checked={permissions.updateTables}
                onChange={(v) => setPermissions({ ...permissions, updateTables: v })}
              />
            </div>
          </div>

          <button
            onClick={handleUpdatePermissions}
            style={{ background: C.accent, color: C.bg, padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: 15 }}
          >
            حفظ الصلاحيات
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default StaffPage;
