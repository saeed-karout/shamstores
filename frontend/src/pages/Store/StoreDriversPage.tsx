// pages/Store/StoreDriversPage.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  IoCar, IoAdd, IoTrash, IoPencil, IoSearch, IoRefresh,
  IoCheckmarkCircle, IoCloseCircle, IoCall, IoMail,
  IoClose, IoSave, IoEye, IoEyeOff
} from 'react-icons/io5';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Loader from '../../components/common/Loader';
import { motion } from 'framer-motion';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

interface DriverForm {
  name: string;
  email: string;
  phone: string;
  password: string;
}

const emptyForm: DriverForm = { name: '', email: '', phone: '', password: '' };

const StoreDriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await api.get('/store/drivers');
      // `api.get` يفكّ التغليف أصلاً ويعيد المصفوفة. وقراءة `res.data` منها
      // تعطي `undefined` دائماً، فتسقط إلى `[]` — الصفحة كانت فارغة مهما
      // كان عدد السائقين، لا لعلّة في الخادم بل لفكّ تغليفٍ مرّتين.
      setDrivers(Array.isArray(res) ? res : ((res as any)?.data ?? (res as any)?.drivers ?? []));
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('فشل تحميل السائقين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setSaving(true);
    try {
      await api.post('/store/drivers', form);
      toast.success('تم إضافة السائق بنجاح');
      setShowModal(false);
      setForm(emptyForm);
      await fetchDrivers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل إضافة السائق');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (driver: Driver) => {
    try {
      await api.patch(`/admin/drivers/${driver.id}/toggle`);
      toast.success(driver.isActive ? 'تم تعطيل السائق' : 'تم تفعيل السائق');
      await fetchDrivers();
    } catch (error) {
      toast.error('فشل تغيير حالة السائق');
    }
  };

  const deleteDriver = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السائق؟')) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/drivers/${id}`);
      toast.success('تم حذف السائق');
      setDrivers(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      toast.error('فشل حذف السائق');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = drivers.filter(d =>
    !searchTerm ||
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone?.includes(searchTerm)
  );

  const activeCount = drivers.filter(d => d.isActive).length;

  const inputStyle: React.CSSProperties = {
    width: '100%', background: C.surf, border: '1px solid ' + C.border, borderRadius: 12,
    padding: '8px 12px', color: C.text, fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box',
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IoCar style={{ color: C.accent, display: 'inline' }} />
            سائقو التوصيل
          </h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            {drivers.length} سائق — {activeCount} نشط
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            aria-label="تحديث قائمة السائقين"
            onClick={fetchDrivers}
            style={{ padding: 8, background: C.surf, border: '1px solid ' + C.border, borderRadius: 12, cursor: 'pointer', color: C.muted }}
          >
            <IoRefresh />
          </button>
          <button
            onClick={() => { setShowModal(true); setForm(emptyForm); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: C.accent, color: C.bg, border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
          >
            <IoAdd />
            إضافة سائق
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16, textAlign: 'center' }}>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>إجمالي السائقين</p>
          <p style={{ color: C.blue, fontSize: 24, fontWeight: 700 }}>{drivers.length}</p>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16, textAlign: 'center' }}>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>نشط</p>
          <p style={{ color: C.accent, fontSize: 24, fontWeight: 700 }}>{activeCount}</p>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16, textAlign: 'center' }}>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>غير نشط</p>
          <p style={{ color: C.red, fontSize: 24, fontWeight: 700 }}>{drivers.length - activeCount}</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16, marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <IoSearch style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد الإلكتروني أو الهاتف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, paddingRight: 36 }}
          />
        </div>
      </div>

      {/* Drivers Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: C.muted }}>
          <IoCar style={{ fontSize: 56, display: 'block', margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: 17, marginBottom: 8 }}>لا يوجد سائقون</p>
          <p style={{ fontSize: 13 }}>أضف سائقاً للبدء في إدارة التوصيل</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(driver => (
            <motion.div
              key={driver.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 20 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, background: 'rgba(200,226,53,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IoCar style={{ color: C.accent, fontSize: 20 }} />
                  </div>
                  <div>
                    <p style={{ color: C.text, fontWeight: 700 }}>{driver.name}</p>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 20, fontSize: 12,
                      ...(driver.isActive
                        ? { background: 'rgba(200,226,53,0.12)', color: C.accent }
                        : { background: 'rgba(255,107,107,0.12)', color: C.red })
                    }}>
                      {driver.isActive ? <IoCheckmarkCircle /> : <IoCloseCircle />}
                      {driver.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: C.muted, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoMail style={{ color: C.blue, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="ltr">{driver.email}</span>
                </div>
                {driver.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IoCall style={{ color: C.accent, flexShrink: 0 }} />
                    <span dir="ltr">{driver.phone}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid ' + C.border }}>
                <button
                  onClick={() => toggleStatus(driver)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'Cairo, sans-serif',
                    ...(driver.isActive
                      ? { background: 'rgba(255,107,107,0.1)', color: C.red }
                      : { background: 'rgba(200,226,53,0.1)', color: C.accent })
                  }}
                >
                  {driver.isActive ? 'تعطيل' : 'تفعيل'}
                </button>
                <button
                  disabled={deletingId === driver.id}
                  onClick={() => deleteDriver(driver.id)}
                  style={{ padding: '8px 12px', background: 'rgba(255,107,107,0.1)', color: C.red, border: 'none', borderRadius: 12, cursor: 'pointer', opacity: deletingId === driver.id ? 0.6 : 1 }}
                >
                  <IoTrash />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Driver Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, width: '100%', maxWidth: 448 }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <h2 style={{ color: C.text, fontSize: 17, fontWeight: 700 }}>إضافة سائق جديد</h2>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ background: C.surf, border: '1px solid ' + C.border, borderRadius: 10, padding: 8, cursor: 'pointer', color: C.muted }}
                  >
                    <IoClose />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      الاسم <span style={{ color: C.red }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="اسم السائق"
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      البريد الإلكتروني <span style={{ color: C.red }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="example@email.com"
                      dir="ltr"
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>رقم الهاتف</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="09xxxxxxxx"
                      dir="ltr"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      كلمة المرور <span style={{ color: C.red }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="كلمة مرور قوية"
                        style={{ ...inputStyle, paddingLeft: 40 }}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}
                      >
                        {showPassword ? <IoEyeOff /> : <IoEye />}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', background: C.accent, color: C.bg, border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? (
                      <div style={{ width: 20, height: 20, border: '2px solid ' + C.bg, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <>
                        <IoSave />
                        حفظ السائق
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ padding: '12px 16px', background: C.surf, color: C.muted, border: '1px solid ' + C.border, borderRadius: 12, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StoreDriversPage;
