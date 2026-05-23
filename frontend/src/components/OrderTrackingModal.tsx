// components/OrderTrackingModal.tsx

import React from 'react';
import { IoLocation, IoCheckmarkCircle, IoWallet } from 'react-icons/io5';
import Modal from './common/Modal';
import { Order, OrderStatus } from '../services/types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingOrder: Order | null;
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  formatPrice: (price: number) => string;
  loading: boolean;
}

const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  trackingOrder,
  orders,
  onSelectOrder,
  formatPrice,
  loading
}) => {
  const getStatusProgress = (currentStatus: OrderStatus, targetStatus: OrderStatus) => {
    const order = ['pending', 'preparing', 'ready', 'served'];
    const currentIndex = order.indexOf(currentStatus);
    const targetIndex = order.indexOf(targetStatus);
    return currentIndex >= targetIndex;
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'served': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'preparing': return 'قيد التحضير';
      case 'ready': return 'جاهز';
      case 'served': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const getPaymentBadge = (isPaid: boolean) => {
    return isPaid ? (
      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
        <IoWallet size={12} />
        مدفوع
      </span>
    ) : (
      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1">
        <IoWallet size={12} />
        غير مدفوع
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="طلباتي" size="lg">
      {loading ? (
        <div className="py-8 text-center">جاري التحميل...</div>
      ) : trackingOrder ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => onSelectOrder(null as any)}
              className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              ← العودة للقائمة
            </button>
            <span className="text-sm text-gray-500">
              {formatPrice(Number(trackingOrder.total))} ل.س
            </span>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-bold text-lg">طلب #{trackingOrder.orderNumber}</h3>
            <p className="text-sm text-gray-500">
              {new Date(trackingOrder.createdAt).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {getPaymentBadge(trackingOrder.isPaid)}
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(trackingOrder.status)}`}>
                {getStatusText(trackingOrder.status)}
              </span>
            </div>
          </div>
          
          <div className="relative py-4">
            <div className="flex justify-between mb-2">
              {(['pending', 'preparing', 'ready', 'served'] as OrderStatus[]).map((status, index) => (
                <div key={status} className="text-center relative z-10">
                  <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center ${
                    getStatusProgress(trackingOrder.status, status)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {getStatusProgress(trackingOrder.status, status) ? (
                      <IoCheckmarkCircle />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className="text-xs">
                    {status === 'pending' && 'قيد الانتظار'}
                    {status === 'preparing' && 'قيد التحضير'}
                    {status === 'ready' && 'جاهز'}
                    {status === 'served' && 'مكتمل'}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="absolute top-7 left-0 right-0 h-1 bg-gray-200">
              <div 
                className="h-full bg-green-500 transition-all"
                style={{ 
                  width: trackingOrder.status === 'served' ? '100%' :
                         trackingOrder.status === 'ready' ? '75%' :
                         trackingOrder.status === 'preparing' ? '50%' :
                         trackingOrder.status === 'pending' ? '25%' : '0%'
                }}
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {trackingOrder.status === 'pending' && 'طلبك قيد الانتظار، سيبدأ التحضير قريباً'}
              {trackingOrder.status === 'preparing' && 'طلبك قيد التحضير'}
              {trackingOrder.status === 'ready' && 'طلبك جاهز للتسليم'}
              {trackingOrder.status === 'served' && 'تم تسليم الطلب'}
            </p>
          </div>

          <div className="mt-4">
            <h4 className="font-bold mb-2">تفاصيل الطلب:</h4>
            {trackingOrder.orderItems?.map((item, index) => (
              <div key={index} className="flex justify-between py-2 border-b">
                <div>
                  <span className="font-medium">{item.menuItem?.name}</span>
                  <span className="text-sm text-gray-500 mr-2">x{item.quantity}</span>
                </div>
                <span>{formatPrice(Number(item.price) * item.quantity)} ل.س</span>
              </div>
            ))}
          </div>

          {trackingOrder.deliveryLocation && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <IoLocation className="text-blue-600" />
                <span className="font-bold">موقع التوصيل</span>
              </div>
              <p className="text-sm text-gray-700">
                {(() => {
                  try {
                    const location = JSON.parse(trackingOrder.deliveryLocation);
                    return location.address;
                  } catch {
                    return trackingOrder.deliveryLocation;
                  }
                })()}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {orders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">لا توجد طلبات سابقة</p>
          ) : (
            orders.map(order => (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-all"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">طلب #{order.orderNumber}</span>
                  <div className="flex items-center gap-2">
                    {getPaymentBadge(order.isPaid)}
                  </div>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                  {order.orderType && (
                    <span className="text-xs text-gray-500">
                      {order.orderType === 'delivery' ? 'توصيل' : 'داخل المطعم'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p className="text-sm font-bold mt-2">
                  المجموع: {formatPrice(Number(order.total))} ل.س
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
};

export default OrderTrackingModal;