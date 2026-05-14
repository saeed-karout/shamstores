import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { User } from '../../services/types';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoAdd, IoPencil, IoTrash, IoKey } from 'react-icons/io5';
import toast from 'react-hot-toast';

const StaffPage: React.FC = () => {
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
    fetchStaff();
  }, []);

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
      viewMenu: true,
      updateMenu: false,
      viewTables: true,
      updateTables: false,
    });
  };

  const handleOpenModal = (staff?: User) => {
    if (staff) {
      setSelectedStaff(staff);
      setFormData({
        name: staff.name,
        email: staff.email,
        password: '',
        phone: staff.phone || '',
      });
      
      // تحميل الصلاحيات
      if (staff.permissions) {
        setPermissions(staff.permissions as any);
      }
    }
    setShowModal(true);
  };

  const handleOpenPermissionsModal = (staff: User) => {
    setSelectedStaff(staff);
    if (staff.permissions) {
      setPermissions(staff.permissions as any);
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
      await api.put(`/restaurants/staff/${selectedStaff.id}`, {
        permissions,
      });
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

  const handleToggleActive = async (staff: User) => {
    try {
      await api.put(`/restaurants/staff/${staff.id}`, {
        isActive: !staff.isActive,
      });
      toast.success(`تم ${staff.isActive ? 'تعطيل' : 'تفعيل'} الموظف`);
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة الموظفين</h1>
        <Button
          variant="primary"
          onClick={() => handleOpenModal()}
        >
          <IoAdd className="inline ml-1" />
          إضافة موظف
        </Button>
      </div>

      {/* قائمة الموظفين */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                الاسم
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                البريد الإلكتروني
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                الهاتف
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                الحالة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                آخر دخول
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staff.map(member => (
              <tr key={member.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {member.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {member.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {member.phone || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(member)}
                    className={`px-2 py-1 text-xs rounded-full ${
                      member.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
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
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenPermissionsModal(member)}
                      className="text-purple-500 hover:text-purple-700"
                      title="الصلاحيات"
                    >
                      <IoKey size={18} />
                    </button>
                    <button
                      onClick={() => handleOpenModal(member)}
                      className="text-blue-500 hover:text-blue-700"
                      title="تعديل"
                    >
                      <IoPencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="text-red-500 hover:text-red-700"
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

      {/* مودال إضافة/تعديل موظف */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={selectedStaff ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {selectedStaff ? 'كلمة المرور (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-2 border rounded"
              required={!selectedStaff}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <Button
            variant="primary"
            onClick={handleSave}
            fullWidth
          >
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
        title={`صلاحيات ${selectedStaff?.name}`}
      >
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-2">الطلبات</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={permissions.viewOrders}
                  onChange={(e) => setPermissions({ ...permissions, viewOrders: e.target.checked })}
                  className="ml-2"
                />
                <span>عرض الطلبات</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={permissions.updateOrderStatus}
                  onChange={(e) => setPermissions({ ...permissions, updateOrderStatus: e.target.checked })}
                  className="ml-2"
                />
                <span>تحديث حالة الطلب</span>
              </label>
            </div>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-semibold mb-2">القائمة</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={permissions.viewMenu}
                  onChange={(e) => setPermissions({ ...permissions, viewMenu: e.target.checked })}
                  className="ml-2"
                />
                <span>عرض القائمة</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={permissions.updateMenu}
                  onChange={(e) => setPermissions({ ...permissions, updateMenu: e.target.checked })}
                  className="ml-2"
                />
                <span>تعديل القائمة</span>
              </label>
            </div>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-semibold mb-2">الطاولات</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={permissions.viewTables}
                  onChange={(e) => setPermissions({ ...permissions, viewTables: e.target.checked })}
                  className="ml-2"
                />
                <span>عرض الطاولات</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={permissions.updateTables}
                  onChange={(e) => setPermissions({ ...permissions, updateTables: e.target.checked })}
                  className="ml-2"
                />
                <span>تعديل الطاولات</span>
              </label>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleUpdatePermissions}
            fullWidth
          >
            حفظ الصلاحيات
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default StaffPage;