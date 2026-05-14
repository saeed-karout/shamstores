// pages/Admin/AdminStores.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoTrash, IoEye } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';
import { div } from 'framer-motion/m';

interface Store {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  plan: { name: string };
  owner: { name: string; email: string };
  createdAt: string;
}

const AdminStores: React.FC = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await api.get('/admin/stores');
      setStores(response.stores);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('فشل تحميل المتاجر');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/stores/${id}/toggle`);
      toast.success(currentStatus ? 'تم تعطيل المتجر' : 'تم تفعيل المتجر');
      fetchStores();
    } catch (error) {
      toast.error('فشل تغيير حالة المتجر');
    }
  };

  const deleteStore = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف متجر "${name}"؟`)) {
      try {
        await api.delete(`/admin/stores/${id}`);
        toast.success('تم حذف المتجر بنجاح');
        fetchStores();
      } catch (error) {
        toast.error('فشل حذف المتجر');
      }
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(`/admin/stores/${id}`);
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة المتاجر</h1>
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
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-right">اسم المتجر</th>
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
              {filteredStores.map((store) => (
                <tr key={store.id} className="border-t hover:bg-gray-50">
                  <td 
                    className="py-3 px-4 font-medium text-green-600 cursor-pointer hover:underline"
                    onClick={() => handleViewDetails(store.id)}
                  >
                    {store.name}
                  </td>
                  <td className="py-3 px-4">{store.email}</td>
                  <td className="py-3 px-4">{store.phone || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      {store.plan?.name || 'free'}
                    </span>
                  </td>
                  <td className="py-3 px-4">{store.owner?.name || '-'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleStatus(store.id, store.isActive)}
                      className={`px-2 py-1 rounded-full text-xs ${
                        store.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {store.isActive ? 'نشط' : 'غير نشط'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {new Date(store.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(store.id)}
                        className="p-1 text-blue-500 hover:text-blue-700"
                        title="عرض التفاصيل"
                      >
                        <IoEye size={18} />
                      </button>
                      <button
                        onClick={() => deleteStore(store.id, store.name)}
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

export default AdminStores;