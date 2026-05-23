// backend/src/services/order.service.ts

import { prisma } from '../server';
import { OrderStatus } from '@prisma/client';

export class OrderService {
  static async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        restaurant: true,
        store: true,
        table: true,
        creator: true,  // ✅ creator بدلاً من user
        driver: true,
        coupon: true,
        items: {
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
        items: true,  // ✅ items بدلاً من orderItems
      }
    });
  }

  static async getRestaurantOrders(restaurantId: string, status?: OrderStatus) {
    return prisma.order.findMany({
      where: {
        restaurantId,
        ...(status && { status }),
      },
      include: { items: true, creator: true },  // ✅ creator بدلاً من user
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getStoreOrders(storeId: string, status?: OrderStatus) {
    return prisma.order.findMany({
      where: {
        storeId,
        ...(status && { status }),
      },
      include: { items: true, creator: true },  // ✅ creator بدلاً من user
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createOrder(data: {
    orderNumber: string;
    restaurantId?: string;
    storeId?: string;
    tableId?: string;
    createdBy: string;  // ✅ createdBy بدلاً من userId
    couponId?: string;
    subtotal: number;
    tax: number;
    deliveryFee?: number;
    total: number;
    notes?: string;
    items: Array<{
      menuItemId?: string;
      productId?: string;
      quantity: number;
      price: number;      // ✅ price مطلوب
      totalPrice: number;
      notes?: string;
    }>;
  }) {
    return prisma.order.create({
      data: {
        orderNumber: data.orderNumber,
        restaurantId: data.restaurantId,
        storeId: data.storeId,
        tableId: data.tableId,
        createdBy: data.createdBy,
        couponId: data.couponId,
        subtotal: data.subtotal,
        tax: data.tax,
        deliveryFee: data.deliveryFee || 0,
        total: data.total,
        notes: data.notes,
        items: {
          create: data.items.map(item => ({
            menuItemId: item.menuItemId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,           // ✅ price مطلوب
            totalPrice: item.totalPrice,
            notes: item.notes,
          }))
        }
      },
      include: {
        items: true,
        creator: true,
      }
    });
  }

  static async updateOrderStatus(id: string, status: OrderStatus) {
    const updateData: any = { status };
    
    if (status === 'delivered') {
      updateData.completedAt = new Date();
    }
    
    return prisma.order.update({
      where: { id },
      data: updateData
    });
  }

  static async updatePaymentStatus(id: string, status: string) {  // ✅ string بدلاً من PaymentStatus
    return prisma.order.update({
      where: { id },
      data: { isPaid: status === 'paid' }  // ✅ isPaid موجود في Schema
    });
  }

  static async assignDriver(id: string, driverId: string) {
    return prisma.order.update({
      where: { id },
      data: { assignedDriverId: driverId, status: 'preparing' }
    });
  }

  static async getDriverOrders(driverId: string) {
    return prisma.order.findMany({
      where: {
        assignedDriverId: driverId,
        status: { in: ['pending', 'preparing', 'ready'] }
      },
      include: { items: true, restaurant: true, store: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async delete(id: string) {
    return prisma.order.delete({ where: { id } });
  }

  // ✅ دوال إضافية مفيدة
  static async getCustomerOrders(customerPhone: string) {
    return prisma.order.findMany({
      where: { customerPhone },
      include: { items: true, restaurant: true, store: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getTodayOrders(businessId: string, businessType: 'restaurant' | 'store') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const where: any = {
      createdAt: { gte: today }
    };
    
    if (businessType === 'restaurant') {
      where.restaurantId = businessId;
    } else {
      where.storeId = businessId;
    }
    
    const [orders, stats] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, creator: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.aggregate({
        where: { ...where, status: 'delivered' },
        _sum: { total: true },
        _count: true
      })
    ]);
    
    return {
      orders,
      totalRevenue: stats._sum.total || 0,
      totalOrders: stats._count
    };
  }

  static async getOrderStatusCounts(businessId: string, businessType: 'restaurant' | 'store') {
    const where: any = {};
    
    if (businessType === 'restaurant') {
      where.restaurantId = businessId;
    } else {
      where.storeId = businessId;
    }
    
    const counts = await prisma.order.groupBy({
      by: ['status'],
      where,
      _count: true
    });
    
    return counts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);
  }
}

export default OrderService;