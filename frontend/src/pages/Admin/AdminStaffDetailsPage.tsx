// pages/Admin/AdminStaffDetailsPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { IoArrowBack, IoPencil, IoTrash, IoEye, IoEyeOff, IoStorefront, IoRestaurant } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  storeId?: string;
  restaurantId?: string;
  store?: {
    id: string;
    name: string;
    slug: string;
  };
  restaurant?: {
    id: string;
    name: string;
    slug: string;
  };
  permissions: {
    viewOrders: boolean;
    updateOrderStatus: boolean;
    viewProducts: boolean;
    updateProducts: boolean;
    viewInventory: boolean;
    updateInventory: boolean;
  };
}

const AdminStaffDetailsPage: React.FC = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    fetchStaff();
  }, [staffId]);

  const fetchStaff = async () => {
    try {
      const response = await api.get(`/admin/staff/${staffId}`);
      const staffData = response?.data || response;
      setStaff(staffData);
      setFormData({
        name: staffData.name || '',
        email: staffData.email || '',
        phone: staffData.phone || '',
        password: '',
      });
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('فشل تحميل بيانات الموظف');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };
      
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      await api.put(`/admin/staff/${staffId}`, updateData);
      toast.success('تم تحديث بيانات الموظف بنجاح');
      setEditing(false);
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل تحديث البيانات');
    }
  };

  const handleToggleStatus = async () => {
    try {
      await api.patch(`/admin/staff/${staffId}/toggle`);
      toast.success(`تم ${staff?.isActive ? 'تعطيل' : 'تفعيل'} الموظف بنجاح`);
      fetchStaff();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('فشل تغيير حالة الموظف');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    try {
      await api.delete(`/admin/staff/${staffId}`);
      toast.success('تم حذف الموظف بنجاح');
      navigate('/admin/staff');
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('فشل حذف الموظف');
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!staff) return <div className="p-6 text-center">الموظف غير موجود</div>;

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <button
          onClick={() => navigate('/admin/staff')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <IoArrowBack size={20} />
          العودة
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            {staff.storeId ? (
              <IoStorefront className="text-white text-xl" />
            ) : (
              <IoRestaurant className="text-white text-xl" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{staff.name}</h1>
            <p className="text-sm text-gray-500">
              {staff.storeId ? 'موظف متجر' : 'موظف مطعم'} • {staff.email}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mr-auto">
          <button
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              staff.isActive 
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {staff.isActive ? 'تعطيل' : 'تفعيل'}
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-600"
          >
            حذف
          </button>
        </div>
      </div>

      {/* Staff Details */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">معلومات الموظف</h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 flex items-center gap-2"
            >
              <IoPencil size={16} />
              تعديل
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                حفظ
              </button>
              <button
                onClick={() => setEditing(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">الاسم</label>
            {editing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            ) : (
              <p className="text-gray-800">{staff.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">البريد الإلكتروني</label>
            {editing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            ) : (
              <p className="text-gray-800">{staff.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">رقم الهاتف</label>
            {editing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            ) : (
              <p className="text-gray-800">{staff.phone || '-'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">التابع لـ</label>
            {staff.store ? (
              <div className="flex items-center gap-2">
                <IoStorefront className="text-green-600" />
                <span>{staff.store.name}</span>
              </div>
            ) : staff.restaurant ? (
              <div className="flex items-center gap-2">
                <IoRestaurant className="text-blue-600" />
                <span>{staff.restaurant.name}</span>
              </div>
            ) : (
              <p className="text-gray-500">غير محدد</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">الحالة</label>
            <span className={`px-2 py-1 rounded-full text-xs ${
              staff.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {staff.isActive ? 'نشط' : 'غير نشط'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">تاريخ التسجيل</label>
            <p className="text-gray-800">
              {format(new Date(staff.createdAt), 'dd MMMM yyyy', { locale: ar })}
            </p>
          </div>

          {staff.lastLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">آخر دخول</label>
              <p className="text-gray-800">
                {format(new Date(staff.lastLogin), 'dd MMMM yyyy - hh:mm a', { locale: ar })}
              </p>
            </div>
          )}

          {editing && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                كلمة المرور (اتركها فارغة لعدم التغيير)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2 border rounded-lg pl-10"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <IoEyeOff size={18} /> : <IoEye size={18} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStaffDetailsPage;