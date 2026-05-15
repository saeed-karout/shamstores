// pages/Store/StoreStaffPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoAdd, IoPencil, IoTrash, IoKey, IoStorefront } from 'react-icons/io5';
import toast from 'react-hot-toast';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  permissions: {
    viewOrders: boolean;
    updateOrderStatus: boolean;
    viewProducts: boolean;
    updateProducts: boolean;
    viewInventory: boolean;
    updateInventory: boolean;
  };
}

const StoreStaffPage: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [permissions, setPermissions] = useState({
    viewOrders: true,
    updateOrderStatus: false,
    viewProducts: true,
    updateProducts: false,
    viewInventory: true,
    updateInventory: false,
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const data = await api.get('/store/staff');
      setStaff(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('حدث خطأ في جلب الموظفين');
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
      viewProducts: true,
      updateProducts: false,
      viewInventory: true,
      updateInventory: false,
    });
  };

  const handleOpenModal = (staff?: StaffMember) => {
    if (staff) {
      setSelectedStaff(staff);
      setFormData({ name: staff.name, email: staff.email, password: '', phone: staff.phone || '' });
      if (staff.permissions) setPermissions(staff.permissions);
    }
    setShowModal(true);
  };

  const handleOpenPermissionsModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    if (staff.permissions) {
      setPermissions(staff.permissions);
    } else {
      resetPermissions();
    }
    setShowPermissionsModal(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.email) {
        toast.error('الاسم والبريد الإلكتروني مطلوبان');
        return;
      }

      if (selectedStaff) {
        await api.put(`/store/staff/${selectedStaff.id}`, formData);
        toast.success('تم تحديث بيانات الموظف');
      } else {
        if (!formData.password) {
          toast.error('كلمة المرور مطلوبة للموظف الجديد');
          return;
        }
        await api.post('/store/staff', formData);
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
      await api.put(`/store/staff/${selectedStaff.id}/permissions`, { permissions });
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
      await api.delete(`/store/staff/${id}`);
      toast.success('تم حذف الموظف');
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleToggleActive = async (staffMember: StaffMember) => {
    try {
      await api.patch(`/store/staff/${staffMember.id}/toggle`, { isActive: !staffMember.isActive });
      toast.success(`تم ${staffMember.isActive ? 'تعطيل' : 'تفعيل'} الموظف`);
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: C.surf, border: '1px solid ' + C.border,
    borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box',
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800 }}>👥 إدارة موظفي المتجر</h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>إدارة صلاحيات وبيانات موظفي المتجر</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <IoAdd style={{ display: 'inline', marginLeft: 4 }} />
          إضافة موظف
        </Button>
      </div>

      {/* قائمة الموظفين */}
      {staff.length === 0 ? (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <IoStorefront style={{ color: C.muted, fontSize: 56, display: 'block', margin: '0 auto 16px', opacity: 0.4 }} />
          <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>لا يوجد موظفين</h3>
          <p style={{ color: C.muted, marginBottom: 16 }}>قم بإضافة موظفين لمساعدتك في إدارة المتجر</p>
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <IoAdd style={{ display: 'inline', marginLeft: 4 }} />
            إضافة موظف
          </Button>
        </div>
      ) : (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: C.surf }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الاسم</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>البريد الإلكتروني</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الهاتف</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الحالة</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>آخر دخول</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(member => (
                  <tr
                    key={member.id}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    style={{ borderBottom: '1px solid ' + C.border }}
                  >
                    <td style={{ padding: '12px 16px', color: C.text, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {member.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, whiteSpace: 'nowrap' }}>
                      {member.email}
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, whiteSpace: 'nowrap' }}>
                      {member.phone || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleToggleActive(member)}
                        style={{
                          padding: '4px 12px', borderRadius: 20, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 600,
                          ...(member.isActive
                            ? { background: 'rgba(200,226,53,0.12)', color: C.accent }
                            : { background: 'rgba(255,107,107,0.12)', color: C.red })
                        }}
                      >
                        {member.isActive ? 'نشط' : 'غير نشط'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {member.lastLogin
                        ? new Date(member.lastLogin).toLocaleDateString('ar-SA')
                        : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleOpenPermissionsModal(member)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.purple }}
                          title="الصلاحيات"
                        >
                          <IoKey size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(member)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.blue }}
                          title="تعديل"
                        >
                          <IoPencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red }}
                          title="حذف"
                        >
                          <IoTrash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* مودال إضافة/تعديل موظف */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={selectedStaff ? '✏️ تعديل بيانات موظف' : '➕ إضافة موظف جديد'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>الاسم *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>البريد الإلكتروني *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {selectedStaff ? 'كلمة المرور (اتركها فارغة لعدم التغيير)' : 'كلمة المرور *'}
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
            <label style={{ display: 'block', color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>رقم الهاتف</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={inputStyle}
            />
          </div>
          <Button variant="primary" onClick={handleSave} fullWidth>
            حفظ
          </Button>
        </div>
      </Modal>

      {/* مودال الصلاحيات */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => { setShowPermissionsModal(false); setSelectedStaff(null); resetPermissions(); }}
        title={`🔑 صلاحيات ${selectedStaff?.name}`}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderBottom: '1px solid ' + C.border, paddingBottom: 16 }}>
            <h3 style={{ color: C.text, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, background: C.blue, borderRadius: '50%', display: 'inline-block' }}></span>
              الطلبات
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: C.text, gap: 8 }}>
                <input
                  type="checkbox"
                  checked={permissions.viewOrders}
                  onChange={(e) => setPermissions({ ...permissions, viewOrders: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: C.accent }}
                />
                <span>عرض الطلبات</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: C.text, gap: 8 }}>
                <input
                  type="checkbox"
                  checked={permissions.updateOrderStatus}
                  onChange={(e) => setPermissions({ ...permissions, updateOrderStatus: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: C.accent }}
                />
                <span>تحديث حالة الطلب</span>
              </label>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid ' + C.border, paddingBottom: 16 }}>
            <h3 style={{ color: C.text, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, background: C.accent, borderRadius: '50%', display: 'inline-block' }}></span>
              المنتجات
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: C.text, gap: 8 }}>
                <input
                  type="checkbox"
                  checked={permissions.viewProducts}
                  onChange={(e) => setPermissions({ ...permissions, viewProducts: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: C.accent }}
                />
                <span>عرض المنتجات</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: C.text, gap: 8 }}>
                <input
                  type="checkbox"
                  checked={permissions.updateProducts}
                  onChange={(e) => setPermissions({ ...permissions, updateProducts: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: C.accent }}
                />
                <span>إضافة/تعديل/حذف المنتجات</span>
              </label>
            </div>
          </div>

          <div>
            <h3 style={{ color: C.text, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, background: '#FBB91F', borderRadius: '50%', display: 'inline-block' }}></span>
              المخزون
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: C.text, gap: 8 }}>
                <input
                  type="checkbox"
                  checked={permissions.viewInventory}
                  onChange={(e) => setPermissions({ ...permissions, viewInventory: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: C.accent }}
                />
                <span>عرض المخزون</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: C.text, gap: 8 }}>
                <input
                  type="checkbox"
                  checked={permissions.updateInventory}
                  onChange={(e) => setPermissions({ ...permissions, updateInventory: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: C.accent }}
                />
                <span>تحديث المخزون</span>
              </label>
            </div>
          </div>

          <Button variant="primary" onClick={handleUpdatePermissions} fullWidth>
            حفظ الصلاحيات
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default StoreStaffPage;
