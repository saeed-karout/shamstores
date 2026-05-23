// backend/src/services/index.ts
// Central exports for all services

// ==================== Core Services ====================
export { UserService, default as userService } from './user.service';
export { PlanService, default as planService } from './plan.service';
export { RestaurantService, default as restaurantService } from './restaurant.service';
export { StoreService, default as storeService } from './store.service';
export { MenuService, default as menuService } from './menu.service';
export { OrderService, default as orderService } from './order.service';
export { ProductService, default as productService } from './product.service';
export { CouponService, default as couponService } from './coupon.service';
export { TableService, default as tableService } from './table.service';
export { TicketService, default as ticketService } from './ticket.service';

// ==================== Feature & Settings Services ====================
export { FeatureService, default as featureService } from './feature.service';
export { SettingService, default as settingService } from './setting.service';
export { InventoryService, default as inventoryService } from './inventory.service';

// ==================== Event & Notification Services ====================
export { default as eventsService, EventType } from './events.service';
export { default as firebaseService } from './firebaseService';

// ==================== Infrastructure Services ====================
export { default as prisma } from './prisma';
export { default as settingsService } from './settingsService'; // Legacy - for backward compatibility
export { CloudflareImagesService } from './cloudflareImagesService';
export { default as d1Service } from './d1Service';

// ==================== Convenience Object ====================
import { UserService } from './user.service';
import { PlanService } from './plan.service';
import { RestaurantService } from './restaurant.service';
import { StoreService } from './store.service';
import { MenuService } from './menu.service';
import { OrderService } from './order.service';
import { ProductService } from './product.service';
import { CouponService } from './coupon.service';
import { TableService } from './table.service';
import { TicketService } from './ticket.service';
import { FeatureService } from './feature.service';
import { SettingService } from './setting.service';
import { InventoryService } from './inventory.service';
import eventsService from './events.service';
import firebaseService from './firebaseService';
import prisma from './prisma';
import settingsService from './settingsService';
import d1Service from './d1Service';

/**
 * Unified services object for easy access
 * @example
 * import { services } from '../services';
 * const user = await services.user.findById(id);
 */
export const services = {
  user: UserService,
  plan: PlanService,
  restaurant: RestaurantService,
  store: StoreService,
  menu: MenuService,
  order: OrderService,
  product: ProductService,
  coupon: CouponService,
  table: TableService,
  ticket: TicketService,
  feature: FeatureService,
  setting: SettingService,
  inventory: InventoryService,
  events: eventsService,
  firebase: firebaseService,
  prisma: prisma,
  settings: settingsService,
  d1: d1Service,
};

// ==================== Type Exports ====================
export type {
  UserRole,
  OrderStatus,
  PaymentMethod,
  OrderType,
  DiscountType
} from '@prisma/client';

// ==================== Default Export ====================
export default {
  UserService,
  PlanService,
  RestaurantService,
  StoreService,
  MenuService,
  OrderService,
  ProductService,
  CouponService,
  TableService,
  TicketService,
  FeatureService,
  SettingService,
  InventoryService,
  eventsService,
  firebaseService,
  prisma,
  settingsService,
  d1Service,
  CloudflareImagesService,
  services,
};