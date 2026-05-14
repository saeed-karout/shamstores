// pages/Admin/AdminStaffPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { 
  IoArrowBack, IoAdd, IoPencil, IoTrash, IoKey, 
  IoStorefront, IoRefresh, IoSearch, IoFilter 
} from 'react-icons/io5';
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
  storeId: string;
  store?: {
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

const AdminStaffPage: React.FC = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    storeId: '',
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
    if (storeId) {
      fetchStore();
      fetchStaff();
    }
  }, [storeId]);

  const fetchStore = async () => {
    try {
      const response = await api.get(`/admin/stores/${storeId}`);
      setStore(response);
    } catch (error) {
      console.error('Error fetching store:', error);
      toast.error('فشل تحميل بيانات المتجر');
    }
  };

  const fetchStaff = async () => {
  try {
    // ✅ استخدام المسار الصحيح مع storeId
    const data = await api.get(`/admin/stores/${storeId}/staff`);
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
      storeId: storeId || '',
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
        storeId: staff.storeId,
      });
      
      if (staff.permissions) {
        setPermissions(staff.permissions);
      }
    } else {
      resetForm();
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
      // ✅ تحديث موظف موجود
      await api.put(`/admin/stores/${storeId}/staff/${selectedStaff.id}`, formData);
      toast.success('تم تحديث بيانات الموظف');
    } else {
      // ✅ إضافة موظف جديد
      if (!formData.password) {
        toast.error('كلمة المرور مطلوبة للموظف الجديد');
        return;
      }
      await api.post(`/admin/stores/${storeId}/staff`, formData);
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
    // ✅ تحديث صلاحيات الموظف
    await api.put(`/admin/stores/${storeId}/staff/${selectedStaff.id}/permissions`, { permissions });
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
    // ✅ حذف موظف
    await api.delete(`/admin/stores/${storeId}/staff/${id}`);
    toast.success('تم حذف الموظف');
    await fetchStaff();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'حدث خطأ');
  }
};

  const handleToggleActive = async (staffMember: StaffMember) => {
  try {
    // ✅ تبديل حالة الموظف
    await api.patch(`/admin/stores/${storeId}/staff/${staffMember.id}/toggle`, {
      isActive: !staffMember.isActive,
    });
    toast.success(`تم ${staffMember.isActive ? 'تعطيل' : 'تفعيل'} الموظف`);
    await fetchStaff();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'حدث خطأ');
  }
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
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <button
          onClick={() => navigate('/admin/stores')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <IoArrowBack size={20} />
          العودة
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <IoStorefront className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة موظفي {store?.name || 'المتجر'}</h1>
            <p className="text-sm text-gray-500">إدارة صلاحيات وبيانات موظفي المتجر</p>
          </div>
        </div>
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
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
              className="p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">جميع الموظفين</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
            <Button variant="outline" onClick={fetchStaff}>
              <IoRefresh className="inline" />
            </Button>
            <Button variant="primary" onClick={() => handleOpenModal()}>
              <IoAdd className="inline ml-1" />
              إضافة موظف
            </Button>
          </div>
        </div>
      </div>

      {/* قائمة الموظفين */}
      {filteredStaff.length === 0 ? (
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ التسجيل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">آخر دخول</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.map(member => (
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
                      {member.createdAt
                        ? format(new Date(member.createdAt), 'dd/MM/yyyy', { locale: ar })
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.lastLogin
                        ? format(new Date(member.lastLogin), 'dd/MM/yyyy', { locale: ar })
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
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              required={!selectedStaff}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
                  className="ml-2 w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                />
                <span>عرض الطلبات</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.updateOrderStatus}
                  onChange={(e) => setPermissions({ ...permissions, updateOrderStatus: e.target.checked })}
                  className="ml-2 w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
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
                  className="ml-2 w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                />
                <span>عرض المنتجات</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.updateProducts}
                  onChange={(e) => setPermissions({ ...permissions, updateProducts: e.target.checked })}
                  className="ml-2 w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
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
                  className="ml-2 w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                />
                <span>عرض المخزون</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.updateInventory}
                  onChange={(e) => setPermissions({ ...permissions, updateInventory: e.target.checked })}
                  className="ml-2 w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
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

export default AdminStaffPage;