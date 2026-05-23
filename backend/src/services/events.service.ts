// backend/src/services/events.service.ts

import { EventEmitter } from 'events';

export enum EventType {
  USER_CREATED = 'user:created',
  USER_UPDATED = 'user:updated',
  USER_DELETED = 'user:deleted',
  USER_LOGIN = 'user:login',
  
  RESTAURANT_CREATED = 'restaurant:created',
  RESTAURANT_UPDATED = 'restaurant:updated',
  RESTAURANT_DELETED = 'restaurant:deleted',
  
  STORE_CREATED = 'store:created',
  STORE_UPDATED = 'store:updated',
  STORE_DELETED = 'store:deleted',
  
  MENU_ITEM_CREATED = 'menu_item:created',
  MENU_ITEM_UPDATED = 'menu_item:updated',
  MENU_ITEM_DELETED = 'menu_item:deleted',
  
  PRODUCT_CREATED = 'product:created',
  PRODUCT_UPDATED = 'product:updated',
  PRODUCT_DELETED = 'product:deleted',
  PRODUCT_STOCK_LOW = 'product:stock_low',
  PRODUCT_OUT_OF_STOCK = 'product:out_of_stock',
  
  ORDER_CREATED = 'order:created',
  ORDER_STATUS_CHANGED = 'order:status_changed',
  ORDER_PAYMENT_STATUS_CHANGED = 'order:payment_status_changed',
  ORDER_DRIVER_ASSIGNED = 'order:driver_assigned',
  ORDER_COMPLETED = 'order:completed',
  ORDER_CANCELLED = 'order:cancelled',
  
  COUPON_CREATED = 'coupon:created',
  COUPON_USED = 'coupon:used',
  COUPON_EXPIRED = 'coupon:expired',
  
  TICKET_CREATED = 'ticket:created',
  TICKET_STATUS_CHANGED = 'ticket:status_changed',
  TICKET_MESSAGE_ADDED = 'ticket:message_added',
  
  FEATURE_ENABLED = 'feature:enabled',
  FEATURE_DISABLED = 'feature:disabled',
  
  INVENTORY_ADJUSTED = 'inventory:adjusted',
  INVENTORY_TRANSFER = 'inventory:transfer',
}

interface EventPayload {
  type: EventType;
  data: any;
  timestamp: Date;
  userId?: string;
}

class EventsService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);
  }

  emit(type: EventType, data: any, userId?: string): boolean {
    const payload: EventPayload = {
      type,
      data,
      timestamp: new Date(),
      userId,
    };
    
    return super.emit(type, payload);
  }

  on(type: EventType, listener: (payload: EventPayload) => void): this {
    return super.on(type, listener);
  }

  once(type: EventType, listener: (payload: EventPayload) => void): this {
    return super.once(type, listener);
  }

  // Helper methods for common events
  emitUserCreated(userId: string, data: any) {
    this.emit(EventType.USER_CREATED, { userId, ...data }, userId);
  }

  emitUserUpdated(userId: string, data: any) {
    this.emit(EventType.USER_UPDATED, { userId, ...data }, userId);
  }

  emitOrderCreated(orderId: string, data: any, userId: string) {
    this.emit(EventType.ORDER_CREATED, { orderId, ...data }, userId);
  }

  emitOrderStatusChanged(orderId: string, status: string, userId: string) {
    this.emit(EventType.ORDER_STATUS_CHANGED, { orderId, status }, userId);
  }

  emitRestaurantCreated(restaurantId: string, data: any, userId: string) {
    this.emit(EventType.RESTAURANT_CREATED, { restaurantId, ...data }, userId);
  }

  emitStoreCreated(storeId: string, data: any, userId: string) {
    this.emit(EventType.STORE_CREATED, { storeId, ...data }, userId);
  }

  emitProductStockLow(productId: string, currentStock: number, reorderLevel: number) {
    this.emit(EventType.PRODUCT_STOCK_LOW, { productId, currentStock, reorderLevel });
  }

  emitProductOutOfStock(productId: string) {
    this.emit(EventType.PRODUCT_OUT_OF_STOCK, { productId });
  }

  emitTicketCreated(ticketId: string, data: any, userId: string) {
    this.emit(EventType.TICKET_CREATED, { ticketId, ...data }, userId);
  }

  emitInventoryAdjusted(productId: string, quantity: number, type: string, userId?: string) {
    this.emit(EventType.INVENTORY_ADJUSTED, { productId, quantity, type }, userId);
  }
}

const eventsService = new EventsService();
export default eventsService;
