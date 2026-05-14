// pages/Admin/AdminRestaurants.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoFilter, IoClose, IoCheckmark, IoTrash, IoEye } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

interface Restaurant {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  plan: { name: string };
  users: Array<{ name: string; email: string }>;
  createdAt: string;
}

const AdminRestaurants: React.FC = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await api.get('/admin/restaurants');
      setRestaurants(response.restaurants);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast.error('فشل تحميل المطاعم');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/restaurants/${id}/toggle`);
      toast.success(currentStatus ? 'تم تعطيل المطعم' : 'تم تفعيل المطعم');
      fetchRestaurants();
    } catch (error) {
      toast.error('فشل تغيير حالة المطعم');
    }
  };

  const deleteRestaurant = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف مطعم "${name}"؟`)) {
      try {
        await api.delete(`/admin/restaurants/${id}`);
        toast.success('تم حذف المطعم بنجاح');
        fetchRestaurants();
      } catch (error) {
        toast.error('فشل حذف المطعم');
      }
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(`/admin/restaurants/${id}`);
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    if (searchTerm && !restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus === 'active' && !restaurant.isActive) return false;
    if (filterStatus === 'inactive' && restaurant.isActive) return false;
    return true;
  });

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة المطاعم</h1>
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="p-2 border rounded-lg"
          >
            <option value="all">الكل</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-right">اسم المطعم</th>
                <th className="py-3 px-4 text-right">البريد الإلكتروني</th>
                <th className="py-3 px-4 text-right">رقم الهاتف</th>
                <th className="py-3 px-4 text-right">الخطة</th>
                <th className="py-3 px-4 text-right">المالك</th>
                <th className="py-3 px-4 text-right">الحالة</th>
                <th className="py-3 px-4 text-right">تاريخ التسجيل</th>
                <th className="py-3 px-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredRestaurants.map((restaurant) => (
                <tr key={restaurant.id} className="border-t hover:bg-gray-50">
                  <td 
                    className="py-3 px-4 font-medium text-blue-600 cursor-pointer hover:underline"
                    onClick={() => handleViewDetails(restaurant.id)}
                  >
                    {restaurant.name}
                  </td>
                  <td className="py-3 px-4">{restaurant.email}</td>
                  <td className="py-3 px-4">{restaurant.phone || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {restaurant.plan?.name || 'free'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {restaurant.users?.[0]?.name || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleStatus(restaurant.id, restaurant.isActive)}
                      className={`px-2 py-1 rounded-full text-xs ${
                        restaurant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {restaurant.isActive ? 'نشط' : 'غير نشط'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {new Date(restaurant.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(restaurant.id)}
                        className="p-1 text-blue-500 hover:text-blue-700"
                        title="عرض التفاصيل"
                      >
                        <IoEye size={18} />
                      </button>
                      <button
                        onClick={() => deleteRestaurant(restaurant.id, restaurant.name)}
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

      {filteredRestaurants.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">لا توجد مطاعم</p>
        </div>
      )}
    </div>
  );
};

export default AdminRestaurants;