// components/CartModal.tsx

import React, { useState, useEffect } from 'react';
import { IoCart, IoClose, IoLocation, IoNavigate } from 'react-icons/io5';
import { motion } from 'framer-motion';
import Button from './common/Button';
import CartItem from './CartItem';
import LocationPicker from './LocationPicker';
import { calculateDeliveryFee, calculateDistance } from '../utils/distance';
import { DeliveryLocation, DEFAULT_DELIVERY_SETTINGS } from '../models/order';
import api from '../services/api';
import toast from 'react-hot-toast';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  isOutside?: boolean;
  tableId?: string;
  customerInfo: { name: string; phone: string; notes: string };
  onCustomerInfoChange: (info: any) => void;
  onSubmit: () => void;
  onUpdateQuantity: (id: string, quantity: number, size?: string) => void;
  onRemoveFromCart: (id: string, size?: string) => void;
  onApplyCoupon?: (code: string) => void;
  onRemoveCoupon?: () => void;
  validateCoupon?: (code: string) => Promise<void>;
  couponCode?: string;
  appliedCoupon?: any;
  discountAmount?: number;
  validatingCoupon?: boolean;
  subtotal: number;
  formatPrice: (price: number) => string;
  getCartCount: () => number;
  submitting?: boolean;
  restaurantLat?: number;
  restaurantLng?: number;
  customerLocation?: DeliveryLocation | null;
  onCustomerLocationChange?: (location: DeliveryLocation | null) => void;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  cart,
  isOutside = false,
  tableId,
  customerInfo,
  onCustomerInfoChange,
  onSubmit,
  onUpdateQuantity,
  onRemoveFromCart,
  onApplyCoupon,
  onRemoveCoupon,
  validateCoupon,
  couponCode = '',
  appliedCoupon,
  discountAmount = 0,
  validatingCoupon = false,
  subtotal,
  formatPrice,
  getCartCount,
  submitting = false,
  restaurantLat,
  restaurantLng,
  customerLocation,
  onCustomerLocationChange
}) => {
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [calculatingDelivery, setCalculatingDelivery] = useState(false);
  const [localCouponCode, setLocalCouponCode] = useState('');

  useEffect(() => {
    if (isOpen && isOutside && customerLocation && restaurantLat && restaurantLng) {
      calculateDelivery();
    }
  }, [customerLocation, cart, discountAmount, isOutside, restaurantLat, restaurantLng, isOpen]);

  const calculateDelivery = async () => {
    if (!customerLocation || !restaurantLat || !restaurantLng) return;
    
    setCalculatingDelivery(true);
    try {
      const distance = calculateDistance(
        restaurantLat,
        restaurantLng,
        customerLocation.lat,
        customerLocation.lng
      );
      
      setDeliveryDistance(Math.round(distance * 100) / 100);
      
      const response = await api.get('/restaurants/profile').catch(() => ({ deliverySettings: DEFAULT_DELIVERY_SETTINGS }));
      const settings = response.deliverySettings || DEFAULT_DELIVERY_SETTINGS;
      
      const currentSubtotal = subtotal - discountAmount;
      let fee = settings.baseFee;
      
      if (currentSubtotal >= settings.freeDeliveryAbove) {
        fee = 0;
      } else if (distance > settings.minDistance) {
        fee += (distance - settings.minDistance) * settings.feePerKm;
      }
      
      setDeliveryFee(Math.round(fee));
    } catch (error) {
      console.error('Error calculating delivery fee:', error);
      setDeliveryFee(DEFAULT_DELIVERY_SETTINGS.baseFee);
    } finally {
      setCalculatingDelivery(false);
    }
  };

  const handleLocationSelect = (location: DeliveryLocation | null) => {
    console.log('📍 Location selected in CartModal:', location);
    if (onCustomerLocationChange) {
      onCustomerLocationChange(location);
    }
    setShowLocationPicker(false);
    if (location) {
      toast.success('تم تحديد موقع التوصيل');
    }
  };

  const handleApplyCoupon = () => {
    console.log('🎯 Apply coupon button clicked, code:', localCouponCode || couponCode);
    const codeToApply = localCouponCode || couponCode;
    if (!codeToApply || codeToApply.trim() === '') {
      toast.error('يرجى إدخال كود الكوبون');
      return;
    }
    if (cart.length === 0) {
      toast.error('لا يمكن تطبيق الكوبون على سلة فارغة');
      return;
    }
    if (validateCoupon) {
      validateCoupon(codeToApply);
    } else if (onApplyCoupon) {
      onApplyCoupon(codeToApply);
    }
  };

  const handleRemoveCoupon = () => {
    if (onRemoveCoupon) {
      onRemoveCoupon();
    }
  };

  const totalWithDelivery = (subtotal - discountAmount) + (deliveryFee || 0);
  const finalTotal = isOutside && deliveryFee ? totalWithDelivery : subtotal - discountAmount;
  const displayCouponCode = couponCode || localCouponCode;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[100vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <IoCart />
              سلة المشتريات ({getCartCount()})
            </h3>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
            >
              <IoClose size={24} />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="p-6 overflow-y-auto max-h-80">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <IoCart className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">سلة المشتريات فارغة</p>
              <Button variant="primary" onClick={onClose} className="mt-4">
                متابعة التسوق
              </Button>
            </div>
          ) : (
            cart.map((item, index) => (
              <CartItem
                key={`${item.id}-${item.size || 'default'}-${index}`}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemoveFromCart}
              />
            ))
          )}
        </div>

        {/* Coupon Section - Only show if coupon functions exist */}
        {(onApplyCoupon || validateCoupon) && cart.length > 0 && (
          <div className="p-6 border-t">
            <h4 className="font-bold mb-3">🎫 كود خصم</h4>
            {appliedCoupon ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-green-600">{appliedCoupon.code}</span>
                    <p className="text-sm text-gray-600">
                      خصم {appliedCoupon.discountValue}{appliedCoupon.discountType === 'percentage' ? '%' : ' ر.س'}
                    </p>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-red-500 hover:text-red-700">
                    <IoClose size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayCouponCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    if (onApplyCoupon && !validateCoupon) {
                      onApplyCoupon(value);
                    } else {
                      setLocalCouponCode(value);
                    }
                  }}
                  placeholder="أدخل كود الخصم"
                  className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0"
                />
                <Button
                  variant="outline"
                  onClick={handleApplyCoupon}
                  loading={validatingCoupon}
                  disabled={!displayCouponCode || cart.length === 0}
                >
                  تطبيق
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Delivery Section - Only for outside orders with location picker */}
        {isOutside && onCustomerLocationChange && (
          <div className="p-6 border-t bg-gray-50">
            <h4 className="font-bold mb-3 flex items-center gap-2">
              <IoLocation />
              معلومات التوصيل
            </h4>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-medium">طلب توصيل (خارج المتجر)</span>
              </div>
              {tableId && <p className="text-sm text-gray-600 mt-1">طاولة رقم: {tableId}</p>}
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="font-medium flex items-center gap-2">
                  <IoNavigate />
                  موقع التوصيل
                  <span className="text-red-500">*</span>
                </label>
                {!customerLocation && <span className="text-xs text-red-500">مطلوب</span>}
              </div>
              
              {customerLocation ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 break-words">{customerLocation.address}</p>
                      {deliveryDistance && (
                        <p className="text-xs text-gray-500 mt-1">📍 المسافة: {deliveryDistance} كم</p>
                      )}
                      {deliveryFee !== null && (
                        <p className="text-xs text-green-600 mt-1">💰 سعر التوصيل: {deliveryFee} ر.س</p>
                      )}
                      <button
                        onClick={() => setShowLocationPicker(true)}
                        className="text-xs text-blue-500 hover:text-blue-700 mt-2"
                      >
                        تغيير الموقع
                      </button>
                    </div>
                    <button
                      onClick={() => handleLocationSelect(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <IoClose size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLocationPicker(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
                >
                  <IoNavigate size={20} />
                  <span>اختر موقع التوصيل</span>
                </button>
              )}
            </div>

            {/* Customer Info */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="الاسم"
                value={customerInfo.name}
                onChange={(e) => onCustomerInfoChange({ ...customerInfo, name: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-all"
              />
              <input
                type="tel"
                placeholder="رقم الهاتف"
                value={customerInfo.phone}
                onChange={(e) => onCustomerInfoChange({ ...customerInfo, phone: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-all"
              />
              <textarea
                placeholder="ملاحظات إضافية (رقم الشقة، الطابق، المعلم...)"
                value={customerInfo.notes}
                onChange={(e) => onCustomerInfoChange({ ...customerInfo, notes: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-all"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Customer Info for dine-in orders */}
        {!isOutside && (
          <div className="p-6 border-t">
            <h4 className="font-bold mb-3">👤 معلومات العميل</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="الاسم"
                value={customerInfo.name}
                onChange={(e) => onCustomerInfoChange({ ...customerInfo, name: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0"
              />
              <input
                type="tel"
                placeholder="رقم الهاتف"
                value={customerInfo.phone}
                onChange={(e) => onCustomerInfoChange({ ...customerInfo, phone: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0"
              />
            </div>
          </div>
        )}

        {/* Price Summary */}
        {cart.length > 0 && (
          <div className="p-6 border-t bg-white">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي:</span>
                <span>{formatPrice(subtotal)} ر.س</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>الخصم:</span>
                  <span>- {formatPrice(discountAmount)} ر.س</span>
                </div>
              )}
              {isOutside && deliveryFee !== null && deliveryFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>سعر التوصيل:</span>
                  <span>{formatPrice(deliveryFee)} ر.س</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>الإجمالي:</span>
                <span className="text-blue-600">
                  {formatPrice(finalTotal)} ر.س
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {cart.length > 0 && (
          <div className="p-6 border-t">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSubmit}
              disabled={submitting || (isOutside && !customerLocation)}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                submitting || (isOutside && !customerLocation)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg'
              }`}
            >
              {submitting ? 'جاري إرسال الطلب...' : 'تأكيد الطلب'}
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Location Picker Modal */}
      {showLocationPicker && onCustomerLocationChange && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowLocationPicker(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">تحديد موقع التوصيل</h3>
              <button onClick={() => setShowLocationPicker(false)} className="text-gray-500 hover:text-gray-700">
                <IoClose size={24} />
              </button>
            </div>
            <LocationPicker
              onLocationSelect={handleLocationSelect}
              initialLocation={customerLocation || undefined}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CartModal;