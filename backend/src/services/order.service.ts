import { prisma } from '../server';
import { Decimal, OrderStatus, PaymentStatus } from '@prisma/client';

export class OrderService {
 static async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        restaurant: true,
        store: true,
        table: true,
        user: true,  // creator replaced with user
        driver: true,  // assignedDriver replaced with driver
        coupon: true,
        items: {  // orderItems replaced with items
          include: { menuItem: true, product: true }
        }
      }
    });
  }

  static async findByOrderNumber(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: {
        restaurant: true,
        store: true,
        orderItems: true,
      }
    });
  }

 static async getRestaurantOrders(restaurantId: string, status?: OrderStatus) {
    return prisma.order.findMany({
      where: {
        restaurantId,
        ...(status && { status }),
      },
      include: { items: true, user: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getStoreOrders(storeId: string, status?: OrderStatus) {
    return prisma.order.findMany({
      where: {
        storeId,
        ...(status && { status }),
      },
      include: { items: true, user: true },
      orderBy: { createdAt: 'desc' }
    });
  }

 static async createOrder(data: {
    orderNumber: string;
    restaurantId?: string;
    storeId?: string;
    tableId?: string;
    userId: string;  // changed from createdBy
    couponId?: string;
    subtotal: number | Decimal;
    tax: number | Decimal;
    deliveryFee?: number | Decimal;
    total: number | Decimal;
    notes?: string;
    items: Array<{
      menuItemId?: string;
      productId?: string;
      quantity: number;
      unitPrice: number | Decimal;
      totalPrice: number | Decimal;
      notes?: string;
    }>;
  }) {
    return prisma.order.create({
      data: {
        orderNumber: data.orderNumber,
        restaurantId: data.restaurantId,
        storeId: data.storeId,
        tableId: data.tableId,
        userId: data.userId,
        couponId: data.couponId,
        subtotal: new Decimal(data.subtotal.toString()),
        tax: new Decimal(data.tax.toString()),
        deliveryFee: data.deliveryFee ? new Decimal(data.deliveryFee.toString()) : new Decimal(0),
        total: new Decimal(data.total.toString()),
        notes: data.notes,
        items: {
          create: data.items.map(item => ({
            menuItemId: item.menuItemId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: new Decimal(item.unitPrice.toString()),
            totalPrice: new Decimal(item.totalPrice.toString()),
            notes: item.notes,
          }))
        }
      },
      include: {
        items: true,
        user: true,
      }
    });
  }

  static async updateOrderStatus(id: string, status: OrderStatus) {
    return prisma.order.update({
      where: { id },
      data: {
        status,
        ...(status === 'delivered' && { completedAt: new Date() })
      }
    });
  }

  static async updatePaymentStatus(id: string, status: PaymentStatus) {
    return prisma.order.update({
      where: { id },
      data: { paymentStatus: status }
    });
  }

  static async assignDriver(id: string, driverId: string) {
    return prisma.order.update({
      where: { id },
      data: { assignedDriverId: driverId }
    });
  }

  static async getDriverOrders(driverId: string) {
    return prisma.order.findMany({
      where: {
        driverId: driverId,
        status: { in: ['confirmed', 'preparing', 'ready'] }  // ✅ تغيير dispatched إلى confirmed
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async delete(id: string) {
    return prisma.order.delete({ where: { id } });
  }
}

export default OrderService;
