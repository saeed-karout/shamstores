import React, { useState } from 'react';
import { Order, OrderStatus, PaymentMethod } from '../../services/types';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { IoCash, IoCard, IoLogoBitcoin, IoCheckmarkCircle, IoTime, IoCloseCircle } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface OrderDetailsProps {
  order: Order;
  onUpdateStatus: (status: OrderStatus) => void;
  onUpdatePayment?: (isPaid: boolean, paymentMethod?: PaymentMethod) => void;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({ 
  order, 
  onUpdateStatus,
  onUpdatePayment 
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(order.paymentMethod || 'cash');
  const [isPaid, setIsPaid] = useState(order.isPaid || false);
  const [updating, setUpdating] = useState(false);

  const handleUpdatePayment = async () => {
    setUpdating(true);
    try {
      await api.patch(`/orders/${order.id}/payment`, {
        isPaid,
        paymentMethod: selectedPaymentMethod
      });
      toast.success('تم تحديث حالة الدفع');
      setShowPaymentModal(false);
      if (onUpdatePayment) {
        onUpdatePayment(isPaid, selectedPaymentMethod);
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('فشل تحديث حالة الدفع');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusActions = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <div className="space-x-2 rtl:space-x-reverse">
            <Button
              variant="success"
              onClick={() => onUpdateStatus('preparing')}
            >
              بدء التحضير
            </Button>
            <Button
              variant="danger"
              onClick={() => onUpdateStatus('cancelled')}
            >
              إلغاء
            </Button>
          </div>
        );
      case 'preparing':
        return (
          <Button
            variant="success"
            onClick={() => onUpdateStatus('ready')}
          >
            جاهز
          </Button>
        );
      case 'ready':
        return (
          <Button
            variant="primary"
            onClick={() => onUpdateStatus('served')}
          >
            تم التسليم
          </Button>
        );
      default:
        return null;
    }
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return <IoCash className="text-green-600" size={20} />;
      case 'card':
        return <IoCard className="text-blue-600" size={20} />;
      case 'online':
        return <IoLogoBitcoin className="text-purple-600" size={20} />;
      default:
        return null;
    }
  };

  const getPaymentMethodText = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return 'نقدي';
      case 'card':
        return 'بطاقة';
      case 'online':
        return 'إلكتروني';
      default:
        return method;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold mb-2">طلب {order.orderNumber}</h2>
            <p className="text-gray-600">
              {order.table?.name && `طاولة ${order.table.name} • `}
              {format(new Date(order.createdAt), 'dd/MM/yyyy hh:mm a', { locale: ar })}
            </p>
          </div>
          <div className="text-left">
            <div className="text-sm text-gray-600 mb-1">حالة الطلب</div>
            <div className={`px-3 py-1 rounded-full text-sm inline-block ${
              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
              order.status === 'ready' ? 'bg-green-100 text-green-800' :
              order.status === 'served' ? 'bg-gray-100 text-gray-800' :
              'bg-red-100 text-red-800'
            }`}>
              {order.status === 'pending' && 'قيد الانتظار'}
              {order.status === 'preparing' && 'قيد التحضير'}
              {order.status === 'ready' && 'جاهز'}
              {order.status === 'served' && 'مكتمل'}
              {order.status === 'cancelled' && 'ملغي'}
            </div>
          </div>
        </div>
      </div>

      {/* معلومات العميل */}
      {(order.customerName || order.customerPhone) && (
        <div className="p-6 border-b bg-gray-50">
          <h3 className="font-semibold mb-2">معلومات العميل</h3>
          {order.customerName && (
            <p className="text-gray-700 mb-1">الاسم: {order.customerName}</p>
          )}
          {order.customerPhone && (
            <p className="text-gray-700">الهاتف: {order.customerPhone}</p>
          )}
        </div>
      )}

      {/* عناصر الطلب */}
      <div className="p-6 border-b">
        <h3 className="font-semibold mb-4">عناصر الطلب</h3>
        <div className="space-y-3">
          {order.orderItems?.map(item => (
            <div key={item.id} className="flex justify-between items-center">
              <div>
                <span className="font-medium">{item.menuItem?.name}</span>
                {item.size && (
                  <span className="text-sm text-gray-500 mr-2">({item.size})</span>
                )}
                <span className="text-sm text-gray-500 mr-2">x{item.quantity}</span>
                {item.notes && (
                  <p className="text-xs text-gray-400 mt-1">ملاحظة: {item.notes}</p>
                )}
              </div>
              <span className="font-bold">{Number(item.price).toFixed(2)} ل.س</span>
            </div>
          ))}
        </div>
      </div>

      {/* ملخص الطلب */}
      <div className="p-6 border-b">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>المجموع الفرعي</span>
            <span>{Number(order.total).toFixed(2)} ل.س</span>
          </div>
          
          {/* قسم الدفع */}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">طريقة الدفع</span>
              <div className="flex items-center gap-2">
                {getPaymentMethodIcon(order.paymentMethod)}
                <span>{getPaymentMethodText(order.paymentMethod)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">حالة الدفع</span>
              <div className="flex items-center gap-2">
                {order.isPaid ? (
                  <>
                    <IoCheckmarkCircle className="text-green-500" size={20} />
                    <span className="text-green-600 font-medium">مدفوع</span>
                  </>
                ) : (
                  <>
                    <IoTime className="text-yellow-500" size={20} />
                    <span className="text-yellow-600 font-medium">غير مدفوع</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4">
              <span className="text-sm text-gray-600">ملاحظات: {order.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* إجراءات الحالة */}
      {order.status !== 'cancelled' && order.status !== 'served' && (
        <div className="p-6">
          <h3 className="font-semibold mb-4">تحديث حالة الطلب</h3>
          {getStatusActions(order.status)}
        </div>
      )}

      {/* زر تحديث الدفع (للمسؤول فقط) */}
      <div className="p-6 border-t">
        <Button
          variant="outline"
          onClick={() => setShowPaymentModal(true)}
          fullWidth
        >
          تحديث حالة الدفع
        </Button>
      </div>

      {/* مودال تحديث الدفع */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="تحديث حالة الدفع"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">حالة الدفع</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={isPaid}
                  onChange={() => setIsPaid(true)}
                  className="w-4 h-4 text-blue-600"
                />
                <span>مدفوع</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!isPaid}
                  onChange={() => setIsPaid(false)}
                  className="w-4 h-4 text-blue-600"
                />
                <span>غير مدفوع</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">طريقة الدفع</label>
            <div className="grid grid-cols-3 gap-3">
              {(['cash', 'card', 'online'] as PaymentMethod[]).map(method => (
                <button
                  key={method}
                  onClick={() => setSelectedPaymentMethod(method)}
                  className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    selectedPaymentMethod === method
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {method === 'cash' && <IoCash size={24} className="text-green-600" />}
                  {method === 'card' && <IoCard size={24} className="text-blue-600" />}
                  {method === 'online' && <IoLogoBitcoin size={24} className="text-purple-600" />}
                  <span className="text-sm">
                    {method === 'cash' ? 'نقدي' : method === 'card' ? 'بطاقة' : 'إلكتروني'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              fullWidth
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdatePayment}
              loading={updating}
              fullWidth
            >
              حفظ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrderDetails;