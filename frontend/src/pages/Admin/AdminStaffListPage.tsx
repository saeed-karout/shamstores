// pages/Admin/AdminStaffListPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { IoEye, IoSearch, IoRefresh, IoFilter, IoStorefront, IoRestaurant } from 'react-icons/io5';
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
  storeId?: string;
  restaurantId?: string;
  store?: {
    id: string;
    name: string;
  };
  restaurant?: {
    id: string;
    name: string;
  };
}

const AdminStaffListPage: React.FC = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'restaurant' | 'store'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchStaff();
  }, []);


const fetchStaff = async () => {
  try {
    // ✅ استخدام المسار الصحيح
    const response = await api.get('/admin/staff');
    // التعامل مع response.data إذا كان موجوداً
    const staffData = response?.data || response;
    setStaff(Array.isArray(staffData) ? staffData : (staffData?.staff || []));
  } catch (error) {
    console.error('Error fetching staff:', error);
    toast.error('حدث خطأ في جلب الموظفين');
  } finally {
    setLoading(false);
  }
};

const handleViewStaff = (staffMember: StaffMember) => {
  // ✅ الانتقال إلى صفحة تفاصيل الموظف
  navigate(`/admin/staff/${staffMember.id}`);
};

  const getFilteredStaff = () => {
    let filtered = [...staff];
    
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone && s.phone.includes(searchTerm))
      );
    }
    
    if (filterType !== 'all') {
      if (filterType === 'restaurant') {
        filtered = filtered.filter(s => s.restaurantId);
      } else {
        filtered = filtered.filter(s => s.storeId);
      }
    }
    
    if (filterActive === 'active') {
      filtered = filtered.filter(s => s.isActive);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter(s => !s.isActive);
    }
    
    return filtered;
  };


  if (loading) return <Loader fullScreen />;

  const filteredStaff = getFilteredStaff();

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">👥 إدارة موظفي المنصة</h1>
        <p className="text-sm text-gray-500 mt-1">إدارة جميع موظفي المطاعم والمتاجر</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <IoSearch className="absolute right-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن موظف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">جميع الموظفين</option>
              <option value="restaurant">موظفي المطاعم</option>
              <option value="store">موظفي المتاجر</option>
            </select>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
              className="p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
            <Button variant="outline" onClick={fetchStaff}>
              <IoRefresh className="inline" />
            </Button>
          </div>
        </div>
      </div>

      {/* قائمة الموظفين */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <IoStorefront className="text-gray-300 text-6xl mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا يوجد موظفين</h3>
          <p className="text-gray-500">لم يتم العثور على موظفين</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الهاتف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التابع لـ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ التسجيل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.map((member, index) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {index + 1}
                    </td>
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
                      {member.storeId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          <IoStorefront size={12} />
                          متجر
                        </span>
                      ) : member.restaurantId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          <IoRestaurant size={12} />
                          مطعم
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                          غير محدد
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.store?.name || member.restaurant?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        member.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {member.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.createdAt
                        ? format(new Date(member.createdAt), 'dd/MM/yyyy', { locale: ar })
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewStaff(member)}
                        className="text-purple-500 hover:text-purple-700 transition"
                        title="عرض التفاصيل"
                      >
                        <IoEye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffListPage;