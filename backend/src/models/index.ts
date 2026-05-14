// backend/src/models/index.ts

import sequelize from '../config/database';
import { Transaction } from 'sequelize';
import { emitEntityRealtimeEvent, RealtimeEntityAction, RealtimeScope } from '../realtime/socket';
import User from './User';
import Plan from './Plan';
import Restaurant from './Restaurant';
import Category from './Category';
import MenuItem from './MenuItem';
import Table from './Table';
import Order from './Order';
import OrderItem from './OrderItem';
import Coupon from './Coupon';
import Store from './Store';
import Product from './Product';
import ProductCategory from './ProductCategory';
import InventoryTransaction from './InventoryTransaction';
import Ticket from './Ticket';
import TicketMessage from './TicketMessage';
import PlatformSetting from './PlatformSettings';
import UpgradeRequest from './UpgradeRequest';
import MarketingSection from './MarketingSection';
import MarketingSettings from './MarketingSettings';
import Image from './Image';
import Feature from './Feature';
import BusinessFeature from './BusinessFeature';
import ExtendedPlatformSetting from './ExtendedPlatformSetting';
import Subscription from './Subscription';

// ==================== العلاقات الأساسية ====================

// ✅ Plan - Restaurant
Plan.hasMany(Restaurant, { foreignKey: 'planId', as: 'restaurants' });
Restaurant.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });

// ✅ Plan - Store
Plan.hasMany(Store, { foreignKey: 'planId', as: 'stores' });
Store.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });

// ✅ Restaurant - User (الموظفين)
Restaurant.hasMany(User, { foreignKey: 'restaurantId', as: 'users' });
User.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

// ✅ Restaurant Owner (المالك)
Restaurant.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
User.hasOne(Restaurant, { foreignKey: 'userId', as: 'ownedRestaurant' });

// ✅ Store - User (الموظفين)
Store.hasMany(User, { foreignKey: 'storeId', as: 'users' });
User.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// ✅ Store Owner (المالك)
Store.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
User.hasOne(Store, { foreignKey: 'userId', as: 'ownedStore' });

// ✅ Restaurant - Category
Restaurant.hasMany(Category, { foreignKey: 'restaurantId', as: 'categories' });
Category.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

// ✅ Restaurant - MenuItem
Restaurant.hasMany(MenuItem, { foreignKey: 'restaurantId', as: 'menuItems' });
MenuItem.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

// ✅ Restaurant - Table
Restaurant.hasMany(Table, { foreignKey: 'restaurantId', as: 'tables' });
Table.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

// ✅ Restaurant - Order
Restaurant.hasMany(Order, { foreignKey: 'restaurantId', as: 'orders' });
Order.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

// ✅ Store - Order
Store.hasMany(Order, { foreignKey: 'storeId', as: 'orders' });
Order.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// ✅ Restaurant - Coupon
Restaurant.hasMany(Coupon, { foreignKey: 'restaurantId', as: 'coupons' });
Coupon.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

// ✅ Store - Coupon
Store.hasMany(Coupon, { foreignKey: 'storeId', as: 'coupons' });
Coupon.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// ✅ Category - MenuItem
Category.hasMany(MenuItem, { foreignKey: 'categoryId', as: 'menuItems' });
MenuItem.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// ✅ Table - Order
Table.hasMany(Order, { foreignKey: 'tableId', as: 'orders' });
Order.belongsTo(Table, { foreignKey: 'tableId', as: 'table' });

// ✅ Order - OrderItem
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'orderItems' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// ✅ OrderItem - MenuItem
OrderItem.belongsTo(MenuItem, { foreignKey: 'menuItemId', as: 'menuItem' });
MenuItem.hasMany(OrderItem, { foreignKey: 'menuItemId', as: 'orderItems' });

// ✅ OrderItem - Product
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });

// ✅ Order - User (العميل)
Order.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Order, { foreignKey: 'createdBy', as: 'createdOrders' });

// ✅ Order - Driver (السائق)
Order.belongsTo(User, { foreignKey: 'assignedDriverId', as: 'assignedDriver' });
User.hasMany(Order, { foreignKey: 'assignedDriverId', as: 'assignedDeliveries' });

// ✅ Store - Product
Store.hasMany(Product, { foreignKey: 'storeId', as: 'products' });
Product.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// ✅ Store - ProductCategory
Store.hasMany(ProductCategory, { foreignKey: 'storeId', as: 'productCategories' });
ProductCategory.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// ✅ ProductCategory - Product
ProductCategory.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(ProductCategory, { foreignKey: 'categoryId', as: 'category' });

// ✅ Product - InventoryTransaction
Product.hasMany(InventoryTransaction, { foreignKey: 'productId', as: 'transactions' });
InventoryTransaction.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// ✅ User - Ticket
User.hasMany(Ticket, { foreignKey: 'userId', as: 'tickets' });
Ticket.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ✅ Restaurant - Ticket
Restaurant.hasMany(Ticket, { foreignKey: 'restaurantId', as: 'tickets' });
Ticket.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });

// ✅ Store - Ticket
Store.hasMany(Ticket, { foreignKey: 'storeId', as: 'tickets' });
Ticket.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// ✅ Ticket - TicketMessage
Ticket.hasMany(TicketMessage, { foreignKey: 'ticketId', as: 'messages' });
TicketMessage.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });

// ✅ User - TicketMessage
User.hasMany(TicketMessage, { foreignKey: 'userId', as: 'messages' });
TicketMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ✅ UpgradeRequest - User
UpgradeRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(UpgradeRequest, { foreignKey: 'userId', as: 'upgradeRequests' });

// ✅ UpgradeRequest - Restaurant
UpgradeRequest.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
Restaurant.hasMany(UpgradeRequest, { foreignKey: 'restaurantId', as: 'upgradeRequests' });

// ✅ UpgradeRequest - Store
UpgradeRequest.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
Store.hasMany(UpgradeRequest, { foreignKey: 'storeId', as: 'upgradeRequests' });

// ✅ UpgradeRequest - Plan
UpgradeRequest.belongsTo(Plan, { foreignKey: 'currentPlanId', as: 'currentPlan' });
UpgradeRequest.belongsTo(Plan, { foreignKey: 'requestedPlanId', as: 'requestedPlan' });

// ✅ Category - Store
Category.belongsTo(Store, { as: 'store', foreignKey: 'storeId' });
Store.hasMany(Category, { as: 'categories', foreignKey: 'storeId' });

// ✅ Feature - BusinessFeature
Feature.hasMany(BusinessFeature, { foreignKey: 'featureCode', sourceKey: 'code', as: 'businessFeatures' });
BusinessFeature.belongsTo(Feature, { foreignKey: 'featureCode', targetKey: 'code', as: 'feature' });

// ==================== العلاقات الإضافية ====================

// ✅ PlatformSetting - Restaurant/Store
PlatformSetting.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
Restaurant.hasMany(PlatformSetting, { foreignKey: 'restaurantId', as: 'platformSettings' });
PlatformSetting.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
Store.hasMany(PlatformSetting, { foreignKey: 'storeId', as: 'platformSettings' });

// ✅ ExtendedPlatformSetting
ExtendedPlatformSetting.belongsTo(PlatformSetting, { foreignKey: 'platformSettingId', as: 'platformSetting' });
PlatformSetting.hasOne(ExtendedPlatformSetting, { foreignKey: 'platformSettingId', as: 'extendedSettings' });

// ✅ MarketingSection - Restaurant/Store
MarketingSection.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
Restaurant.hasMany(MarketingSection, { foreignKey: 'restaurantId', as: 'marketingSections' });
MarketingSection.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
Store.hasMany(MarketingSection, { foreignKey: 'storeId', as: 'marketingSections' });

// ✅ MarketingSettings - Restaurant/Store
MarketingSettings.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
Restaurant.hasOne(MarketingSettings, { foreignKey: 'restaurantId', as: 'marketingSettings' });
MarketingSettings.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
Store.hasOne(MarketingSettings, { foreignKey: 'storeId', as: 'marketingSettings' });

// ✅ Image relationships
Image.belongsTo(MenuItem, { foreignKey: 'menuItemId', as: 'menuItem' });
MenuItem.hasMany(Image, { foreignKey: 'menuItemId', as: 'images' });
Image.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(Image, { foreignKey: 'productId', as: 'images' });
Image.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
Restaurant.hasMany(Image, { foreignKey: 'restaurantId', as: 'images' });
Image.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
Store.hasMany(Image, { foreignKey: 'storeId', as: 'images' });

// ✅ Coupon - User
Coupon.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Coupon, { foreignKey: 'createdBy', as: 'createdCoupons' });

// ✅ Order - Coupon
Order.belongsTo(Coupon, { foreignKey: 'couponId', as: 'coupon' });
Coupon.hasMany(Order, { foreignKey: 'couponId', as: 'orders' });

const normalizeIdentifier = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const readInstanceValue = (instance: any, key: string): unknown => {
  if (instance && typeof instance.get === 'function') {
    const value = instance.get(key);
    if (value !== undefined) {
      return value;
    }
  }

  return instance?.[key];
};

const hasAnyScope = (scope: RealtimeScope): boolean => (
  Boolean(scope.restaurantId) ||
  Boolean(scope.storeId) ||
  Boolean(scope.userId) ||
  Boolean(scope.createdBy) ||
  Boolean(scope.driverId) ||
  Boolean(scope.assignedDriverId) ||
  Boolean(scope.orderId)
);

const getChangedFields = (instance: any): string[] => {
  if (!instance || typeof instance.changed !== 'function') {
    return [];
  }

  const changed = instance.changed();
  if (Array.isArray(changed)) {
    return changed.map((field) => String(field));
  }

  return [];
};

const scheduleAfterCommit = (
  options: { transaction?: Transaction } | undefined,
  callback: () => void
): void => {
  const transaction = options?.transaction as (Transaction & { afterCommit?: (cb: () => void) => void }) | undefined;
  if (transaction && typeof transaction.afterCommit === 'function') {
    transaction.afterCommit(callback);
    return;
  }

  callback();
};

const resolveRealtimeScope = async (
  entity: string,
  instance: any,
  transaction?: Transaction
): Promise<RealtimeScope> => {
  const scope: RealtimeScope = {
    restaurantId: normalizeIdentifier(readInstanceValue(instance, 'restaurantId')),
    storeId: normalizeIdentifier(readInstanceValue(instance, 'storeId')),
    userId: normalizeIdentifier(readInstanceValue(instance, 'userId')),
    createdBy: normalizeIdentifier(readInstanceValue(instance, 'createdBy')),
    driverId: normalizeIdentifier(readInstanceValue(instance, 'driverId')),
    assignedDriverId: normalizeIdentifier(readInstanceValue(instance, 'assignedDriverId')),
    orderId: normalizeIdentifier(readInstanceValue(instance, 'orderId'))
  };

  const businessType = normalizeIdentifier(readInstanceValue(instance, 'businessType'));
  const businessId = normalizeIdentifier(readInstanceValue(instance, 'businessId'));
  if (businessType === 'restaurant' && businessId && !scope.restaurantId) {
    scope.restaurantId = businessId;
  }
  if (businessType === 'store' && businessId && !scope.storeId) {
    scope.storeId = businessId;
  }

  if (entity === 'user') {
    const userId = normalizeIdentifier(readInstanceValue(instance, 'id'));
    if (userId && !scope.userId) {
      scope.userId = userId;
    }
  }

  const orderId = normalizeIdentifier(readInstanceValue(instance, 'orderId'));
  if (orderId) {
    scope.orderId = orderId;
  }

  if (
    orderId &&
    (!scope.restaurantId || !scope.storeId || !scope.createdBy || !scope.assignedDriverId)
  ) {
    const order = await Order.findByPk(orderId, {
      attributes: ['restaurantId', 'storeId', 'createdBy', 'assignedDriverId'],
      transaction
    });

    if (order) {
      scope.restaurantId = scope.restaurantId || normalizeIdentifier(order.get('restaurantId'));
      scope.storeId = scope.storeId || normalizeIdentifier(order.get('storeId'));
      scope.createdBy = scope.createdBy || normalizeIdentifier(order.get('createdBy'));
      scope.assignedDriverId = scope.assignedDriverId || normalizeIdentifier(order.get('assignedDriverId'));
    }
  }

  const ticketId = normalizeIdentifier(readInstanceValue(instance, 'ticketId'));
  if (
    ticketId &&
    (!scope.restaurantId || !scope.storeId || !scope.userId)
  ) {
    const ticket = await Ticket.findByPk(ticketId, {
      attributes: ['restaurantId', 'storeId', 'userId'],
      transaction
    });

    if (ticket) {
      scope.restaurantId = scope.restaurantId || normalizeIdentifier(ticket.get('restaurantId'));
      scope.storeId = scope.storeId || normalizeIdentifier(ticket.get('storeId'));
      scope.userId = scope.userId || normalizeIdentifier(ticket.get('userId'));
    }
  }

  const productId = normalizeIdentifier(readInstanceValue(instance, 'productId'));
  if (productId && !scope.storeId) {
    const product = await Product.findByPk(productId, {
      attributes: ['storeId'],
      transaction
    });
    if (product) {
      scope.storeId = normalizeIdentifier(product.get('storeId'));
    }
  }

  return scope;
};

const emitModelRealtimeChange = async (
  entity: string,
  action: RealtimeEntityAction,
  instance: any,
  options?: { transaction?: Transaction }
): Promise<void> => {
  const entityId = normalizeIdentifier(readInstanceValue(instance, 'id'));
  if (!entityId) {
    return;
  }

  const scope = await resolveRealtimeScope(entity, instance, options?.transaction);
  if (!hasAnyScope(scope)) {
    return;
  }

  const changedFields = action === 'updated' ? getChangedFields(instance) : [];
  scheduleAfterCommit(options, () => {
    emitEntityRealtimeEvent({
      entity,
      entityId,
      action,
      scope,
      changedFields
    });
  });
};

const registerRealtimeHooks = (model: any, entity: string): void => {
  model.addHook('afterCreate', `${entity}RealtimeAfterCreate`, async (instance: any, options: { transaction?: Transaction }) => {
    await emitModelRealtimeChange(entity, 'created', instance, options);
  });

  model.addHook('afterUpdate', `${entity}RealtimeAfterUpdate`, async (instance: any, options: { transaction?: Transaction }) => {
    await emitModelRealtimeChange(entity, 'updated', instance, options);
  });

  model.addHook('afterDestroy', `${entity}RealtimeAfterDestroy`, async (instance: any, options: { transaction?: Transaction }) => {
    await emitModelRealtimeChange(entity, 'deleted', instance, options);
  });
};

[
  { model: Restaurant, entity: 'restaurant' },
  { model: Store, entity: 'store' },
  { model: User, entity: 'user' },
  { model: Category, entity: 'category' },
  { model: MenuItem, entity: 'menu_item' },
  { model: Table, entity: 'table' },
  { model: Order, entity: 'order' },
  { model: OrderItem, entity: 'order_item' },
  { model: Coupon, entity: 'coupon' },
  { model: ProductCategory, entity: 'product_category' },
  { model: Product, entity: 'product' },
  { model: InventoryTransaction, entity: 'inventory_transaction' },
  { model: Ticket, entity: 'ticket' },
  { model: TicketMessage, entity: 'ticket_message' },
  { model: UpgradeRequest, entity: 'upgrade_request' },
  { model: MarketingSection, entity: 'marketing_section' },
  { model: MarketingSettings, entity: 'marketing_settings' },
  { model: Image, entity: 'image' },
  { model: Subscription, entity: 'subscription' }
].forEach(({ model, entity }) => {
  registerRealtimeHooks(model, entity);
});

// تصدير جميع النماذج
export {
  sequelize,
  User,
  Plan,
  Restaurant,
  Category,
  Coupon,
  MenuItem,
  Table,
  Order,
  OrderItem,
  Store,
  Product,
  ProductCategory,
  InventoryTransaction,
  Ticket,
  TicketMessage,
  PlatformSetting,
  UpgradeRequest,
  Feature,
  BusinessFeature,
  ExtendedPlatformSetting,
  MarketingSection,
  MarketingSettings,
  Image,
  Subscription
};
