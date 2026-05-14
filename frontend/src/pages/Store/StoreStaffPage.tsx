// pages/Store/StoreStaffPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoAdd, IoPencil, IoTrash, IoKey, IoStorefront } from 'react-icons/io5';
import toast from 'react-hot-toast';

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
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
    });
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
      setFormData({
        name: staff.name,
        email: staff.email,
        password: '',
        phone: staff.phone || '',
      });
      
      if (staff.permissions) {
        setPermissions(staff.permissions);
      }
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
      await api.patch(`/store/staff/${staffMember.id}/toggle`, {
        isActive: !staffMember.isActive,
      });
      toast.success(`تم ${staffMember.isActive ? 'تعطيل' : 'تفعيل'} الموظف`);
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">👥 إدارة موظفي المتجر</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة صلاحيات وبيانات موظفي المتجر</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <IoAdd className="inline ml-1" />
          إضافة موظف
        </Button>
      </div>

      {/* قائمة الموظفين */}
      {staff.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <IoStorefront className="text-gray-300 text-6xl mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا يوجد موظفين</h3>
          <p className="text-gray-500 mb-4">قم بإضافة موظفين لمساعدتك في إدارة المتجر</p>
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <IoAdd className="inline ml-1" />
            إضافة موظف
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهاتف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">آخر دخول</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {staff.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {member.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {member.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {member.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={`px-2 py-1 text-xs rounded-full transition ${
                          member.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {member.isActive ? 'نشط' : 'غير نشط'}
                      </button>
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.lastLogin
                        ? new Date(member.lastLogin).toLocaleDateString('ar-SA')
                        : '-'
                      }
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenPermissionsModal(member)}
                          className="text-purple-500 hover:text-purple-700 transition"
                          title="الصلاحيات"
                        >
                          <IoKey size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(member)}
                          className="text-blue-500 hover:text-blue-700 transition"
                          title="تعديل"
                        >
                          <IoPencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="text-red-500 hover:text-red-700 transition"
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
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={selectedStaff ? '✏️ تعديل بيانات موظف' : '➕ إضافة موظف جديد'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {selectedStaff ? 'كلمة المرور (اتركها فارغة لعدم التغيير)' : 'كلمة المرور *'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              required={!selectedStaff}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
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
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedStaff(null);
          resetPermissions();
        }}
        title={`🔑 صلاحيات ${selectedStaff?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              الطلبات
            </h3>
            <div className="space-y-2 pr-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.viewOrders}
                  onChange={(e) => setPermissions({ ...permissions, viewOrders: e.target.checked })}
                  className="ml-2 w-4 h-4 text-green-500 rounded focus:ring-green-500"
                />
                <span>عرض الطلبات</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.updateOrderStatus}
                  onChange={(e) => setPermissions({ ...permissions, updateOrderStatus: e.target.checked })}
                  className="ml-2 w-4 h-4 text-green-500 rounded focus:ring-green-500"
                />
                <span>تحديث حالة الطلب</span>
              </label>
            </div>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              المنتجات
            </h3>
            <div className="space-y-2 pr-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.viewProducts}
                  onChange={(e) => setPermissions({ ...permissions, viewProducts: e.target.checked })}
                  className="ml-2 w-4 h-4 text-green-500 rounded focus:ring-green-500"
                />
                <span>عرض المنتجات</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.updateProducts}
                  onChange={(e) => setPermissions({ ...permissions, updateProducts: e.target.checked })}
                  className="ml-2 w-4 h-4 text-green-500 rounded focus:ring-green-500"
                />
                <span>إضافة/تعديل/حذف المنتجات</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              المخزون
            </h3>
            <div className="space-y-2 pr-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.viewInventory}
                  onChange={(e) => setPermissions({ ...permissions, viewInventory: e.target.checked })}
                  className="ml-2 w-4 h-4 text-green-500 rounded focus:ring-green-500"
                />
                <span>عرض المخزون</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.updateInventory}
                  onChange={(e) => setPermissions({ ...permissions, updateInventory: e.target.checked })}
                  className="ml-2 w-4 h-4 text-green-500 rounded focus:ring-green-500"
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