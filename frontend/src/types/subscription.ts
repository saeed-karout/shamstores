// frontend/src/types/subscription.ts

export interface Subscription {
  id: string;
  businessType: 'restaurant' | 'store';
  businessId: string;
  planId: string;
  planName: string;
  months: number;
  price: number;
  discount: number;
  totalPaid: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
  reminderSent: boolean;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionWithBusiness extends Subscription {
  business?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface CreateSubscriptionDto {
  planId: string;
  planName: string;
  months: number;
  price: number;
  discount?: number;
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
  businessType?: 'restaurant' | 'store';
  businessId?: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  maxRestaurants: number;
  maxStores: number;
  maxUsers: number;
  maxMenuItems: number;
  maxProducts: number;
  maxOrders: number;
  isActive: boolean;
  position: number;
  isPopular: boolean;
  hasWhatsapp: boolean;
  hasOnlineOrders: boolean;
  hasCustomDomain: boolean;
  hasAnalytics: boolean;
  hasTableQr: boolean;
  hasMultiLanguage: boolean;
  hasPromotions: boolean;
  hasCoupons: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpgradeRequest {
  id: string;
  userId: string;
  restaurantId?: string;
  storeId?: string;
  currentPlanId: string;
  requestedPlanId: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpgradeRequestWithDetails extends UpgradeRequest {
  currentPlan?: Plan;
  requestedPlan?: Plan;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}