// frontend/src/services/api/index.ts

// Export client and types
export { apiClient, getApiBaseUrl, getCurrentSubdomain, isMainDomain } from './client';
export type { ApiResponse, PaginatedResponse, ApiError } from './types';

// Export all services
export { authService } from './auth.service';
export { restaurantService } from './restaurant.service';
export { storeService } from './store.service';
export { orderService } from './order.service';
export { deliveryService } from './delivery.service';
export { publicService } from './public.service';
export { planService } from './plan.service';
export { couponService } from './coupon.service';
export { marketingService } from './marketing.service';
export { adminService } from './admin.service';
export { uploadService } from './upload.service';

// Convenience export
import { authService } from './auth.service';
import { restaurantService } from './restaurant.service';
import { storeService } from './store.service';
import { orderService } from './order.service';
import { deliveryService } from './delivery.service';
import { publicService } from './public.service';
import { planService } from './plan.service';
import { couponService } from './coupon.service';
import { marketingService } from './marketing.service';
import { adminService } from './admin.service';
import { uploadService } from './upload.service';

export const api = {
  auth: authService,
  restaurant: restaurantService,
  store: storeService,
  orders: orderService,
  delivery: deliveryService,
  public: publicService,
  plans: planService,
  coupons: couponService,
  marketing: marketingService,
  admin: adminService,
  upload: uploadService,
};

export default api;