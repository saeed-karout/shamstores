// pages/Admin/AdminOrders.tsx

import React, { useEffect, useState } from 'react';
import { IoSearch, IoEye } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  orderType: string;
  orderSource: string;
  restaurant?: { name: string };
  store?: { name: string };
  assignedDriver?: { name: string };
  createdAt: string;
}

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/admin/orders');
      setOrders(response.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('فشل تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
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
    return <span className={`px-2 py-1 rounded-full text-xs ${colors[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
  };

  const filteredOrders = orders.filter(order => {
    if (searchTerm && !order.orderNumber.includes(searchTerm) && !order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    return true;
  });

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة الطلبات</h1>
        <div className="flex gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="بحث برقم الطلب أو اسم العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <IoSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border rounded-lg"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="preparing">قيد التحضير</option>
            <option value="ready">جاهز</option>
            <option value="delivering">قيد التوصيل</option>
            <option value="delivered">مكتمل</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-right">رقم الطلب</th>
                <th className="py-3 px-4 text-right">العميل</th>
                <th className="py-3 px-4 text-right">المبلغ</th>
                <th className="py-3 px-4 text-right">المصدر</th>
                <th className="py-3 px-4 text-right">النوع</th>
                <th className="py-3 px-4 text-right">السائق</th>
                <th className="py-3 px-4 text-right">الحالة</th>
                <th className="py-3 px-4 text-right">التاريخ</th>
                <th className="py-3 px-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono">{order.orderNumber}</td>
                  <td className="py-3 px-4">{order.customerName} <br/><span className="text-xs text-gray-500">{order.customerPhone}</span></td>
                  <td className="py-3 px-4 font-bold text-green-600">{order.total} ل.س</td>
                  <td className="py-3 px-4">
                    {order.orderSource === 'restaurant' ? (
                      <span className="flex items-center gap-1 text-blue-600">{order.restaurant?.name}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600">{order.store?.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {order.orderType === 'delivery' ? 'توصيل' : order.orderType === 'dine_in' ? 'داخل المطعم' : 'طلبية'}
                  </td>
                  <td className="py-3 px-4">{order.assignedDriver?.name || '-'}</td>
                  <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                  <td className="py-3 px-4 text-sm">
                    {new Date(order.createdAt).toLocaleString('ar-SA')}
                  </td>
                  <td className="py-3 px-4">
                    <button className="p-1 text-blue-500 hover:text-blue-700">
                      <IoEye size={18} />
                    </button>
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

export default AdminOrders;