// pages/Admin/AdminUsers.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoTrash, IoEye, IoPerson } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  restaurant?: { name: string };
  store?: { name: string };
}

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (id: string, role: string) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      toast.success('تم تحديث دور المستخدم');
      fetchUsers();
    } catch (error) {
      toast.error('فشل تحديث الدور');
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${id}/toggle`);
      toast.success(currentStatus ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
      fetchUsers();
    } catch (error) {
      toast.error('فشل تغيير حالة المستخدم');
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف المستخدم "${name}"؟`)) {
      try {
        await api.delete(`/admin/users/${id}`);
        toast.success('تم حذف المستخدم بنجاح');
        fetchUsers();
      } catch (error) {
        toast.error('فشل حذف المستخدم');
      }
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(`/admin/users/${id}`);
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
      user: 'مستخدم'
    };
    return <span className={`px-2 py-1 rounded-full text-xs ${colors[role] || 'bg-gray-100'}`}>{labels[role] || role}</span>;
  };

  const filteredUsers = users.filter(user => {
    if (searchTerm && !user.name.toLowerCase().includes(searchTerm.toLowerCase()) && !user.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    return true;
  });

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <div className="flex gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <IoSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="p-2 border rounded-lg"
          >
            <option value="all">جميع الأدوار</option>
            <option value="owner">مالك مطعم</option>
            <option value="delivery_driver">مندوب توصيل</option>
            <option value="staff">موظف</option>
            <option value="user">مستخدم عادي</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-right">الاسم</th>
                <th className="py-3 px-4 text-right">البريد الإلكتروني</th>
                <th className="py-3 px-4 text-right">رقم الهاتف</th>
                <th className="py-3 px-4 text-right">الدور</th>
                <th className="py-3 px-4 text-right">مرتبط بـ</th>
                <th className="py-3 px-4 text-right">الحالة</th>
                <th className="py-3 px-4 text-right">تاريخ التسجيل</th>
                <th className="py-3 px-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td 
                    className="py-3 px-4 font-medium text-blue-600 cursor-pointer hover:underline"
                    onClick={() => handleViewDetails(user.id)}
                  >
                    {user.name}
                  </td>
                  <td className="py-3 px-4">{user.email}</td>
                  <td className="py-3 px-4">{user.phone || '-'}</td>
                 <td className="py-3 px-4">
  <select
    value={user.role}
    onChange={(e) => updateRole(user.id, e.target.value)}
    className="text-sm border rounded px-2 py-1"
  >
    <option value="user">👤 مستخدم عادي</option>
    <option value="owner">🏢 مالك (مطعم/متجر)</option>
    <option value="staff">👨‍💼 موظف</option>
    <option value="delivery_driver">🚚 مندوب توصيل</option>
  </select>
  {/* عرض نوع الملكية إذا كان مالك */}
  {user.role === 'owner' && (
    <div className="text-xs text-gray-500 mt-1">
      {user.restaurant ? '📱 مطعم' : user.store ? '🛍️ متجر' : '⚠️ لا يوجد مطعم أو متجر'}
    </div>
  )}
</td>
                  <td className="py-3 px-4 text-sm">
                    {user.restaurant?.name || user.store?.name || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleStatus(user.id, user.isActive)}
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? 'نشط' : 'غير نشط'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {new Date(user.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(user.id)}
                        className="p-1 text-blue-500 hover:text-blue-700"
                        title="عرض التفاصيل"
                      >
                        <IoEye size={18} />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.name)}
                        className="p-1 text-red-500 hover:text-red-700"
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
    </div>
  );
};

export default AdminUsers;