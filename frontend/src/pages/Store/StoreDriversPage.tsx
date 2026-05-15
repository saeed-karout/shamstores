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
      setDrivers(res?.data || res?.drivers || []);
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

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IoCar className="text-green-600" />
            سائقو التوصيل
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {drivers.length} سائق — {activeCount} نشط
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDrivers}
            className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <IoRefresh />
          </button>
          <button
            onClick={() => { setShowModal(true); setForm(emptyForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
          >
            <IoAdd />
            إضافة سائق
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow p-4 text-center">
          <p className="text-gray-500 text-sm">إجمالي السائقين</p>
          <p className="text-2xl font-bold text-blue-600">{drivers.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4 text-center">
          <p className="text-gray-500 text-sm">نشط</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4 text-center">
          <p className="text-gray-500 text-sm">غير نشط</p>
          <p className="text-2xl font-bold text-red-600">{drivers.length - activeCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6">
        <div className="relative">
          <IoSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد الإلكتروني أو الهاتف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300"
          />
        </div>
      </div>

      {/* Drivers Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <IoCar className="text-6xl mx-auto mb-4 opacity-30" />
          <p className="text-lg mb-2">لا يوجد سائقون</p>
          <p className="text-sm">أضف سائقاً للبدء في إدارة التوصيل</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(driver => (
            <motion.div
              key={driver.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow hover:shadow-md transition-shadow p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <IoCar className="text-green-600 text-xl" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{driver.name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                      driver.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {driver.isActive ? <IoCheckmarkCircle /> : <IoCloseCircle />}
                      {driver.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <IoMail className="text-blue-500 flex-shrink-0" />
                  <span className="truncate" dir="ltr">{driver.email}</span>
                </div>
                {driver.phone && (
                  <div className="flex items-center gap-2">
                    <IoCall className="text-green-500 flex-shrink-0" />
                    <span dir="ltr">{driver.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  onClick={() => toggleStatus(driver)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    driver.isActive
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {driver.isActive ? 'تعطيل' : 'تفعيل'}
                </button>
                <button
                  disabled={deletingId === driver.id}
                  onClick={() => deleteDriver(driver.id)}
                  className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold">إضافة سائق جديد</h2>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl"
                  >
                    <IoClose />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الاسم <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="اسم السائق"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      البريد الإلكتروني <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="example@email.com"
                      dir="ltr"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="09xxxxxxxx"
                      dir="ltr"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      كلمة المرور <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="كلمة مرور قوية"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-green-300"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <IoEyeOff /> : <IoEye />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-60 transition-colors"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                    className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
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
