// types/delivery.ts

// عنصر الطلب (للمطاعم والمتاجر)
export interface OrderItem {
  id: string;
  orderId: string;
  quantity: number;
  price: number;
  size?: string;
  addons?: string[] | object | string;
  notes?: string;
  
  // للمطاعم (menuItem)
  menuItemId?: string;
  menuItem?: {
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    image?: string;
    price: number;
    isAvailable?: boolean;
  };
  
  // للمتاجر (product)
  productId?: string;
  product?: {
    id: string;
    name: string;
    description?: string;
    images?: string | string[];
    price: number;
    stock?: number;
  };
  
  // اسم موحد للعنصر (سواء كان menuItem أو product)
  itemName?: string;
  itemImage?: string | null;
  
  createdAt: string;
  updatedAt: string;
}

// معلومات المندوب
export interface DeliveryDriver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isOnline: boolean;
  lastLocationLat?: number | null;
  lastLocationLng?: number | null;
  lastLocationUpdate?: string | null;
  driverRating?: number;
  driverRatingCount?: number;
}

// طلب التوصيل الكامل
export interface DeliveryOrder {
  id: string;
  orderNumber: string;
  
  // معلومات العميل
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  
  // معلومات التوصيل
  deliveryAddress?: string;
  deliveryLat?: number | string;
  deliveryLng?: number | string;
  deliveryLocation?: string;
  deliveryFee?: number;
  deliveryDistance?: number;
  
  // معلومات الطلب
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  total: number;
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  orderType: 'delivery' | 'pickup' | 'dine_in';
  paymentMethod: 'cash' | 'card' | 'online';
  isPaid: boolean;
  orderSource?: 'restaurant' | 'store' | 'mobile';
  
  // التواقيت
  createdAt: string;
  updatedAt: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  driverAcceptedAt?: string;
  driverReachedAt?: string;
  paymentCollectedAt?: string;
  
  // معلومات المطعم/المتجر
  restaurantId?: string | null;
  restaurant?: {
    id: string;
    name: string;
    address: string;
    phone: string;
    latitude?: number;
    longitude?: number;
    logo?: string;
  };
  
  storeId?: string | null;
  store?: {
    id: string;
    name: string;
    address: string;
    phone: string;
    latitude?: number;
    longitude?: number;
    logo?: string;
  };
  
  // معلومات المندوب
  assignedDriverId?: string;
  assignedDriver?: DeliveryDriver;
  
  // عناصر الطلب
  orderItems?: OrderItem[];
  
  // تقييم الطلب
  rating?: number | null;
  ratingComment?: string | null;
  ratedAt?: string | null;
  
  // تقييم السائق (إذا كان التقييم للسائق)
  driverRating?: number;
  driverReview?: string;
}

// إحصائيات التوصيل للمطعم/المتجر
export interface DeliveryStats {
  todayOrders: number;
  pendingOrders: number;
  activeOrders: number;
  activeOrdersList: DeliveryOrder[];
  driversCount: number;
  driversList: DeliveryDriver[];
  avgDeliveryTime: number;
  totalDelivered: number;
  totalDeliveryFees?: number;
  avgDeliveryDistance?: number;
}

// موقع المندوب للتتبع المباشر
export interface DriverLocation {
  driverId: string;
  name: string;
  lat: number | null;
  lng: number | null;
  lastUpdate: string | null;
}

// تحديث موقع المندوب
export interface UpdateDriverLocationRequest {
  lat: number;
  lng: number;
}

// تحديث حالة الطلب
export interface UpdateDeliveryStatusRequest {
  status: DeliveryOrder['status'];
}

// تعيين مندوب للطلب
export interface AssignDriverRequest {
  driverId: string;
  estimatedMinutes?: number;
}

// تقييم الطلب
export interface RateOrderRequest {
  rating: number;
  comment?: string;
}

// تأكيد الدفع
export interface ConfirmPaymentRequest {
  // يمكن أن يكون فارغاً أو يحتوي على معلومات إضافية
}

// حساب سعر التوصيل
export interface CalculateDeliveryFeeRequest {
  restaurantId?: string;
  storeId?: string;
  customerLat: number;
  customerLng: number;
}

// نتيجة حساب سعر التوصيل
export interface DeliveryFeeResponse {
  distance: number;
  deliveryFee: number;
  currency: string;
  estimatedTime?: number;
}