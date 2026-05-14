// pages/Admin/AdminUserDetails.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  IoArrowBack, IoPerson, IoMail, IoCall, IoCalendar, 
  IoKey, IoEye, IoEyeOff, IoTrash, IoCheckmarkCircle, 
  IoCloseCircle, IoRefresh, IoRestaurant, IoStorefront,
  IoCar, IoWallet, IoSettings, IoShield, IoLockClosed
} from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

interface UserDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'owner' | 'staff' | 'user' | 'delivery_driver';
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
  restaurant?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    isActive: boolean;
    plan: { name: string; price: number };
  };
  store?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    isActive: boolean;
    plan: { name: string; price: number };
  };
  orders?: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  stats?: {
    totalOrders: number;
    totalSpent: number;
    completedOrders: number;
    cancelledOrders: number;
  };
}

const AdminUserDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      const response = await api.get(`/admin/users/${id}`);
      setUser(response);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('فشل تحميل بيانات المستخدم');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast.error('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.post(`/admin/users/${id}/reset-password`, { password: newPassword });
      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
      setNewPassword('');
      setShowPassword(false);
    } catch (error) {
      toast.error('فشل إعادة تعيين كلمة المرور');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpdateRole = async (newRole: string) => {
    setChangingRole(true);
    try {
      await api.patch(`/admin/users/${id}/role`, { role: newRole });
      toast.success('تم تحديث دور المستخدم بنجاح');
      fetchUserDetails();
    } catch (error) {
      toast.error('فشل تحديث دور المستخدم');
    } finally {
      setChangingRole(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    try {
      await api.patch(`/admin/users/${id}/toggle`);
      toast.success(user.isActive ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
      fetchUserDetails();
    } catch (error) {
      toast.error('فشل تغيير حالة المستخدم');
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    if (user.role === 'super_admin') {
      toast.error('لا يمكن حذف المستخدم الأساسي');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف المستخدم "${user.name}"؟ سيتم حذف جميع البيانات المرتبطة به.`)) {
      try {
        await api.delete(`/admin/users/${id}`);
        toast.success('تم حذف المستخدم بنجاح');
        navigate('/admin/users');
      } catch (error) {
        toast.error('فشل حذف المستخدم');
      }
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-800',
      owner: 'bg-blue-100 text-blue-800',
      staff: 'bg-green-100 text-green-800',
      delivery_driver: 'bg-orange-100 text-orange-800',
      user: 'bg-gray-100 text-gray-800'
    };
    const labels: Record<string, string> = {
      super_admin: 'مدير المنصة',
      owner: 'مالك مطعم',
      staff: 'موظف',
      delivery_driver: 'مندوب توصيل',
      user: 'مستخدم عادي'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[role] || 'bg-gray-100'}`}>
        {labels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
        <IoCheckmarkCircle size={14} />
        نشط
      </span>
    ) : (
      <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
        <IoCloseCircle size={14} />
        غير نشط
      </span>
    );
  };

  const getOrderStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      delivering: 'bg-purple-100 text-purple-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      preparing: 'قيد التحضير',
      ready: 'جاهز',
      delivering: 'قيد التوصيل',
      delivered: 'مكتمل',
      cancelled: 'ملغي'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) return <Loader fullScreen />;
  if (!user) return <div className="text-center py-20">المستخدم غير موجود</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <button
          onClick={() => navigate('/admin/users')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <IoArrowBack size={20} />
          العودة
        </button>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <IoPerson className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        {getRoleBadge(user.role)}
        {getStatusBadge(user.isActive)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* العمود الأيسر - المعلومات الأساسية */}
        <div className="lg:col-span-2 space-y-6">
          {/* معلومات الحساب */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <IoPerson className="text-blue-600" />
              معلومات الحساب
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500">الاسم الكامل</label>
                <p className="font-medium text-lg">{user.name}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">البريد الإلكتروني</label>
                <p className="font-medium flex items-center gap-2">
                  <IoMail className="text-gray-400" size={16} />
                  {user.email}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">رقم الهاتف</label>
                <p className="font-medium flex items-center gap-2">
                  <IoCall className="text-gray-400" size={16} />
                  {user.phone || '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">آخر تسجيل دخول</label>
                <p className="font-medium flex items-center gap-2">
                  <IoCalendar className="text-gray-400" size={16} />
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ar-SA') : '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">تاريخ التسجيل</label>
                <p className="font-medium flex items-center gap-2">
                  <IoCalendar className="text-gray-400" size={16} />
                  {new Date(user.createdAt).toLocaleDateString('ar-SA')}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-500">آخر تحديث</label>
                <p className="font-medium flex items-center gap-2">
                  <IoRefresh className="text-gray-400" size={16} />
                  {new Date(user.updatedAt).toLocaleDateString('ar-SA')}
                </p>
              </div>
            </div>
          </div>

          {/* إحصائيات الطلبات */}
          {user.stats && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IoWallet className="text-green-600" />
                إحصائيات الطلبات
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{user.stats.totalOrders}</div>
                  <div className="text-sm text-gray-600">إجمالي الطلبات</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{user.stats.completedOrders}</div>
                  <div className="text-sm text-gray-600">مكتملة</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-xl">
                  <div className="text-2xl font-bold text-yellow-600">{user.stats.cancelledOrders}</div>
                  <div className="text-sm text-gray-600">ملغية</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">{user.stats.totalSpent} ل.س</div>
                  <div className="text-sm text-gray-600">إجمالي المشتريات</div>
                </div>
              </div>
            </div>
          )}

          {/* طلبات المستخدم */}
          {user.orders && user.orders.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IoCar className="text-orange-600" />
                آخر الطلبات
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right">رقم الطلب</th>
                      <th className="px-4 py-2 text-right">المبلغ</th>
                      <th className="px-4 py-2 text-right">الحالة</th>
                      <th className="px-4 py-2 text-right">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.orders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="border-t hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/admin/orders/${order.id}`)}>
                        <td className="px-4 py-2 font-mono text-sm">{order.orderNumber}</td>
                        <td className="px-4 py-2 font-bold text-green-600">{order.total} ل.س</td>
                        <td className="px-4 py-2">{getOrderStatusBadge(order.status)}</td>
                        <td className="px-4 py-2 text-sm">
                          {new Date(order.createdAt).toLocaleDateString('ar-SA')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* العمود الأيمن - الإجراءات */}
        <div className="space-y-6">
          {/* معلومات المطعم/المتجر */}
          {user.restaurant && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IoRestaurant className="text-blue-600" />
                المطعم
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-500">اسم المطعم</label>
                  <p 
                    className="font-medium text-blue-600 cursor-pointer hover:underline"
                    onClick={() => navigate(`/admin/restaurants/${user.restaurant?.id}`)}
                  >
                    {user.restaurant.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">البريد الإلكتروني</label>
                  <p>{user.restaurant.email}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">رقم الهاتف</label>
                  <p>{user.restaurant.phone || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">العنوان</label>
                  <p>{user.restaurant.address || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">الخطة</label>
                  <p>{user.restaurant.plan?.name || 'free'} - {user.restaurant.plan?.price || 0} ل.س/شهر</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">الحالة</label>
                  {getStatusBadge(user.restaurant.isActive)}
                </div>
                <button
                  onClick={() => navigate(`/admin/restaurants/${user.restaurant?.id}`)}
                  className="w-full mt-2 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-all"
                >
                  إدارة المطعم
                </button>
              </div>
            </div>
          )}

          {user.store && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IoStorefront className="text-green-600" />
                المتجر
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-500">اسم المتجر</label>
                  <p 
                    className="font-medium text-green-600 cursor-pointer hover:underline"
                    onClick={() => navigate(`/admin/stores/${user.store?.id}`)}
                  >
                    {user.store.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">البريد الإلكتروني</label>
                  <p>{user.store.email}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">رقم الهاتف</label>
                  <p>{user.store.phone || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">العنوان</label>
                  <p>{user.store.address || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">الخطة</label>
                  <p>{user.store.plan?.name || 'free'} - {user.store.plan?.price || 0} ل.س/شهر</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">الحالة</label>
                  {getStatusBadge(user.store.isActive)}
                </div>
                <button
                  onClick={() => navigate(`/admin/stores/${user.store?.id}`)}
                  className="w-full mt-2 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-all"
                >
                  إدارة المتجر
                </button>
              </div>
            </div>
          )}

          {/* تغيير الدور */}
          {user.role !== 'super_admin' && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IoShield className="text-purple-600" />
                تغيير الدور
              </h2>
              <div className="space-y-3">
                <select
                  value={user.role}
                  onChange={(e) => handleUpdateRole(e.target.value)}
                  disabled={changingRole}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="user">مستخدم عادي</option>
                  <option value="owner">مالك مطعم</option>
                  <option value="staff">موظف</option>
                  <option value="delivery_driver">مندوب توصيل</option>
                </select>
                {changingRole && <p className="text-sm text-gray-500">جاري التحديث...</p>}
              </div>
            </div>
          )}

          {/* إعادة تعيين كلمة المرور */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <IoKey className="text-yellow-600" />
              إعادة تعيين كلمة المرور
            </h2>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  className="w-full p-3 border rounded-lg pr-10 focus:ring-2 focus:ring-yellow-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <IoEyeOff size={18} /> : <IoEye size={18} />}
                </button>
              </div>
              <Button
                variant="primary"
                onClick={handleResetPassword}
                loading={updatingPassword}
                fullWidth
              >
                إعادة تعيين كلمة المرور
              </Button>
            </div>
          </div>

          {/* حالة الحساب */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <IoSettings className="text-gray-600" />
              حالة الحساب
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>الحالة الحالية:</span>
                {getStatusBadge(user.isActive)}
              </div>
              <button
                onClick={handleToggleStatus}
                className={`w-full py-2 rounded-lg text-white transition-all ${
                  user.isActive 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
              </button>
            </div>
          </div>

          {/* حذف الحساب */}
          {user.role !== 'super_admin' && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-200">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
                <IoTrash className="text-red-600" />
                منطقة الخطر
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                حذف هذا الحساب سيؤدي إلى حذف جميع البيانات المرتبطة به بشكل دائم.
              </p>
              <button
                onClick={handleDeleteUser}
                className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-all"
              >
                حذف الحساب
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetails;