// models/order.ts

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  size?: string;
  addons?: string[];
  notes?: string;
}

export interface DeliveryLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface OrderRequest {
  tableId: string | null;
  customerName: string;
  customerPhone: string;
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  couponCode?: string;
  discountAmount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'online';
  orderType: 'dine_in' | 'delivery' | 'takeaway';
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryLocation?: string;
}

export interface DeliverySettings {
  enableDelivery: boolean;
  baseFee: number;
  feePerKm: number;
  minDistance: number;
  maxDistance: number;
  freeDeliveryAbove: number;
  estimatedTime: number;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  enableDelivery: true,
  baseFee: 5,
  feePerKm: 2,
  minDistance: 1,
  maxDistance: 20,
  freeDeliveryAbove: 100,
  estimatedTime: 45
};