// components/store/StoreOrderDetails.tsx

import React from 'react';
import { IoLocation, IoCall, IoTime, IoWallet, IoCheckmark, IoClose, IoCar, IoCube } from 'react-icons/io5';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getImageUrl } from '@/utils/imageHelpers';

interface StoreOrder {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number | string;
  isPaid: boolean;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  createdAt: string;
  orderItems: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: number | string;
    product?: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
}

interface StoreOrderDetailsProps {
  order: StoreOrder;
  onUpdateStatus: (status: string) => void;
}

const StoreOrderDetails: React.FC<StoreOrderDetailsProps> = ({ order, onUpdateStatus }) => {
  // ✅ دالة مساعدة لتحويل السعر إلى رقم
  const toNumber = (value: number | string | undefined): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    return parseFloat(value) || 0;
  };

  // تحويل القيم
  const total = toNumber(order.total);
  
  const getStatusOptions = () => {
    const options = [
      { value: 'pending', label: 'قيد الانتظار', color: 'yellow' },
      { value: 'processing', label: 'قيد التجهيز', color: 'blue' },
      { value: 'shipped', label: 'تم الشحن', color: 'purple' },
      { value: 'delivered', label: 'تم التوصيل', color: 'green' },
      { value: 'cancelled', label: 'ملغي', color: 'red' },
    ];
    
    return options;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'processing': return 'قيد التجهيز';
      case 'shipped': return 'تم الشحن';
      case 'delivered': return 'تم التوصيل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">#{order.orderNumber}</h2>
            <p className="text-green-100 mt-1">تم الإنشاء: {format(new Date(order.createdAt), 'dd MMMM yyyy - hh:mm a', { locale: ar })}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)} text-gray-800`}>
            {getStatusText(order.status)}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* تحديث الحالة */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">تحديث حالة الطلب</h3>
          <div className="flex flex-wrap gap-2">
            {getStatusOptions().map(option => (
              <button
                key={option.value}
                onClick={() => onUpdateStatus(option.value)}
                disabled={order.status === option.value}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  order.status === option.value
                    ? `bg-${option.color}-500 text-white`
                    : `bg-${option.color}-50 text-${option.color}-700 hover:bg-${option.color}-100`
                }`}
              >
                {order.status === option.value && <IoCheckmark className="inline ml-1" />}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* معلومات العميل */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <IoCall className="text-green-600" />
              معلومات العميل
            </h3>
            <div className="space-y-2">
              <p><span className="text-gray-500">الاسم:</span> {order.customerName || 'غير معروف'}</p>
              <p><span className="text-gray-500">الهاتف:</span> {order.customerPhone || 'غير متوفر'}</p>
              {order.deliveryAddress && (
                <p className="flex items-start gap-2">
                  <IoLocation className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <span><span className="text-gray-500">العنوان:</span> {order.deliveryAddress}</span>
                </p>
              )}
            </div>
          </div>

          {/* معلومات الدفع */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <IoWallet className="text-green-600" />
              معلومات الدفع
            </h3>
            <div className="space-y-2">
              <p><span className="text-gray-500">طريقة الدفع:</span> {order.paymentMethod === 'cash' ? 'كاش' : order.paymentMethod === 'card' ? 'بطاقة' : 'أونلاين'}</p>
              <p className="flex items-center gap-2">
                <span className="text-gray-500">الحالة:</span>
                {order.isPaid ? (
                  <span className="text-green-600 flex items-center gap-1"><IoCheckmark /> مدفوع</span>
                ) : (
                  <span className="text-yellow-600 flex items-center gap-1"><IoTime /> غير مدفوع</span>
                )}
              </p>
              <p><span className="text-gray-500">الإجمالي:</span> <span className="font-bold text-green-600">{total.toFixed(2)} ر.س</span></p>
            </div>
          </div>
        </div>

        {/* المنتجات */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <IoCube className="text-green-600" />
            المنتجات المطلوبة
          </h3>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المنتج</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">الكمية</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">السعر</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.orderItems.map((item) => {
                  const price = toNumber(item.price);
                  const itemTotal = price * item.quantity;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.product?.image ? (
                            <img 
                              src={getImageUrl(item.product.image)}
                              alt={item.product.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                              <IoCube className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{item.product?.name || 'منتج'}</p>
                          </div>
                        </div>
                       </td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3">{price.toFixed(2)} ر.س</td>
                      <td className="px-4 py-3 font-medium">{itemTotal.toFixed(2)} ر.س</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-left font-medium">المجموع الكلي</td>
                  <td className="px-4 py-3 font-bold text-green-600 text-lg">{total.toFixed(2)} ر.س</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreOrderDetails;
