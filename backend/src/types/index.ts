// backend/src/types/index.ts
import { Request } from 'express';

export type UserRole = 'super_admin' | 'owner' | 'staff' | 'user' | 'delivery_driver';

export interface UserPermissions {
  // صلاحيات المطاعم والمتاجر
  canManageRestaurants?: boolean;
  canManageStores?: boolean;
  canManageUsers?: boolean;
  canManageDrivers?: boolean;
  canManagePlans?: boolean;
  canManageSettings?: boolean;
  canViewReports?: boolean;
  
  // ✅ صلاحيات الطلبات (جديدة)
  canViewOrders?: boolean;
  canManageOrders?: boolean;
  canViewAllOrders?: boolean;
  canManageAllOrders?: boolean;
  
  // صلاحيات إضافية
  canViewMenu?: boolean;
  canManageMenu?: boolean;
  canViewTables?: boolean;
  canManageTables?: boolean;
  canViewDelivery?: boolean;
  canManageDelivery?: boolean;
}

export interface UserPayload {
  id: string;
  email: string;
  role: 'super_admin' | 'owner' | 'staff' | 'user' | 'delivery_driver';
  restaurantId?: string;
  storeId?: string;
  permissions?: UserPermissions;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'served' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'online';

export type OrderType = 'dine_in' | 'delivery' | 'takeaway';

export type DiscountType = 'percentage' | 'fixed';

export interface DriverLocation {
  driverId: string;
  driverName: string;
  lat: number;
  lng: number;
  lastUpdate: Date;
  currentOrderId?: string;
  isOnline: boolean;
}

export interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  status: OrderStatus;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  driver?: {
    id: string;
    name: string;
    phone: string;
    location?: {
      lat: number;
      lng: number;
      lastUpdate: Date;
    };
  };
}