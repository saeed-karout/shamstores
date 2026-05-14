export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'owner' | 'staff' | 'user' | 'delivery_driver';
  restaurantId?: string;
  phone?: string;
  whatsapp?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  restaurant?: Restaurant;
}
  
  export interface Restaurant {
    id: string;
    planId: string;
    name: string;
    slug: string;
    email: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    description?: string;
    logo?: string;
    coverImage?: string;
    openingHours?: any;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    templateId: number;
    isActive: boolean;
    subscriptionStart?: string;
    subscriptionEnd?: string;
    createdAt: string;
    updatedAt: string;
    plan?: Plan;
  }
  
  export interface Plan {
    id: string;
    name: 'free' | 'basic' | 'pro' | 'enterprise';
    price: number;
    maxItems: number;
    maxTables: number;
    maxStaff: number;
    hasWhatsapp: boolean;
    hasOnlineOrders: boolean;
    hasCustomDomain: boolean;
    hasAnalytics: boolean;
    hasTableQr: boolean;
    hasMultiLanguage: boolean;
    hasPromotions: boolean;
    hasCoupons: boolean;
    description?: string;
    hasMarketing: boolean;
  }
  
  export interface Category {
    id: string;
    restaurantId: string;
    name: string;
    nameEn?: string;
    description?: string;
    descriptionEn?: string;
    image?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    menuItems?: MenuItem[];
  }
  
  export interface MenuItem {
    id: string;
    restaurantId: string;
    categoryId: string;
    name: string;
    nameEn?: string;
    description?: string;
    descriptionEn?: string;
    price: number;
    discountedPrice?: number;
    image?: string;
    isAvailable: boolean;
    isFeatured: boolean;
    sortOrder: number;
    preparationTime?: number;
    calories?: number;
    hasSizes: boolean;
    hasAddons: boolean;
    sizes?: any; // يمكن أن يكون object أو string
    addons?: any; // يمكن أن يكون object أو string
    shareToken: string;
    viewsCount: number;
    ordersCount: number;
    createdAt: string;
    updatedAt: string;
    category?: Category;
    restaurant?: Restaurant;
  }
  
  export interface Table {
    id: string;
    restaurantId: string;
    name: string;
    nameEn?: string;
    qrCode?: string;
    qrSvg?: string;
    seats: number;
    notes?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    restaurant?: {  // أضف هذا إذا كنت تريد جلب المطعم مع الطاولة
      slug: string;
      name: string;
    };
  }

// أضف هذا في نهاية ملف types.ts
export interface CartItem {
  id: string;
  name: string;
  originalPrice: number; // السعر الأصلي لحساب الخصم
  price: number; // السعر المعروض (بعد خصم العنصر)
  quantity: number;
  image?: string;
  notes?: string;
  size?: string;
  addons?: string[];
}
  
  export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  export type PaymentMethod = 'cash' | 'card' | 'online';
  
  export interface Order {
    id: string;
    restaurantId: string;
    tableId?: string;
    orderNumber: string;
    customerName?: string;
    customerPhone?: string;
    status: OrderStatus;
    total: number;
    subtotal?: number;
    discountAmount?: number;
    couponCode?: string;
    notes?: string;
    paymentMethod: PaymentMethod;
    isPaid: boolean;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    table?: Table;
    orderItems?: OrderItem[];
    deliveryLocation?: string;
  orderType?: 'dine_in' | 'delivery' | 'takeaway';
  deliveryAddress?: string; // عنوان نصي للتوصيل
  deliveryLat?: number;
  deliveryLng?: number;
  }
  
  export interface OrderItem {
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    price: number;
    finalPrice?: number;
    size?: string;
  addons?: string | string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
    menuItem?: MenuItem;
  }
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    phone?: string;
    restaurantName?: string;
  }
  
  export interface AuthResponse {
    token: string;
    user: User;
  }
  
  export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }


export interface Plan {
  id: string;
  name: 'free' | 'basic' | 'pro' | 'enterprise';
  price: number;
  maxItems: number;
  maxTables: number;
  maxStaff: number;
  hasWhatsapp: boolean;
  hasOnlineOrders: boolean;
  hasCustomDomain: boolean;
  hasAnalytics: boolean;
  hasTableQr: boolean;
  hasMultiLanguage: boolean;
  hasPromotions: boolean;
  hasCoupons: boolean;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  restaurantId: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrder: number;
  usageLimit: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  restaurantId: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  image?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Feature {
  id: string;
  name: string;
  keyName: string;
  description?: string;
  price: number;
  isOneTime: boolean;
  isActive: boolean;
}