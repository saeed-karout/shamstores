// types/delivery.ts

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  size?: string;
  addons?: string[] | object;
  notes?: string;
  menuItem: {
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    image?: string;
    price: number;
  };
}

export interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryLat?: number | string;
  deliveryLng?: number | string;
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  total: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee?: number;
  deliveryDistance?: number;
  couponCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  orderType: string;
  paymentMethod: 'cash' | 'card' | 'online';
  isPaid: boolean;
  assignedDriverId?: string;
  assignedDriver?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  restaurant?: {
    id: string;
    name: string;
    address: string;
    phone: string;
    latitude?: number;
    longitude?: number;
  };
  orderItems?: OrderItem[];  
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  driverAcceptedAt?: string;
  driverReachedAt?: string;
}