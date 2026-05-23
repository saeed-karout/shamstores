// backend/src/controllers/orderController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { verifyToken } from '../config/auth';
import { emitOrderRealtimeEvent, RealtimeOrderPayload } from '../realtime/socket';

// ==================== دوال مساعدة ====================

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getBusinessId = async (req: AuthRequest): Promise<{ type: 'restaurant' | 'store', id: string } | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    if (targetRestaurantId) return { type: 'restaurant', id: targetRestaurantId };
    const targetStoreId = req.query.storeId as string || req.body.storeId;
    if (targetStoreId) return { type: 'store', id: targetStoreId };
    
    const restaurants = await prisma.restaurant.findMany({ take: 1 });
    if (restaurants.length > 0) return { type: 'restaurant', id: restaurants[0].id };
    const stores = await prisma.store.findMany({ take: 1 });
    if (stores.length > 0) return { type: 'store', id: stores[0].id };
    return null;
  }
  if (req.user?.restaurantId) return { type: 'restaurant', id: req.user.restaurantId };
  if (req.user?.storeId) return { type: 'store', id: req.user.storeId };
  return null;
};

const toRealtimeOrderPayload = (order: any): RealtimeOrderPayload => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  isPaid: order.isPaid || false,
  total: Number(order.total),
  orderType: order.orderType,
  restaurantId: order.restaurantId || null,
  storeId: order.storeId || null,
  createdBy: order.createdBy || null,
  assignedDriverId: order.assignedDriverId || null
});

const emitOrderRealtimeNotification = (
  order: any,
  event: string,
  title: string,
  message: string,
  actorId?: string | null,
  extraData?: Record<string, unknown>
): void => {
  emitOrderRealtimeEvent({
    event,
    title,
    message,
    actorId,
    order: toRealtimeOrderPayload(order),
    extraData
  });
};

// ==================== التوزيع التلقائي للسائقين ====================

const findBestDriver = async (
  storeId: string,
  deliveryLat?: number,
  deliveryLng?: number
): Promise<any | null> => {
  try {
    const drivers = await prisma.user.findMany({
      where: {
        storeId,
        role: 'delivery_driver',
        isActive: true,
        isOnline: true
      },
      select: {
        id: true,
        name: true,
        phone: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationUpdate: true
      }
    });

    if (drivers.length === 0) return null;

    if (deliveryLat && deliveryLng) {
      let bestDriver = null;
      let shortestDistance = Infinity;

      for (const driver of drivers) {
        if (driver.lastLocationLat && driver.lastLocationLng) {
          const distance = calculateDistance(
            driver.lastLocationLat,
            driver.lastLocationLng,
            deliveryLat,
            deliveryLng
          );
          if (distance < shortestDistance) {
            shortestDistance = distance;
            bestDriver = driver;
          }
        }
      }
      if (bestDriver) return bestDriver;
    }

    const driversWithStats = await Promise.all(
      drivers.map(async (driver) => {
        const activeOrdersCount = await prisma.order.count({
          where: {
            assignedDriverId: driver.id,
            status: { in: ['pending', 'preparing', 'ready', 'delivering'] }
          }
        });
        return { driver, activeOrdersCount };
      })
    );

    driversWithStats.sort((a, b) => a.activeOrdersCount - b.activeOrdersCount);
    return driversWithStats[0]?.driver || drivers[0];
  } catch (error) {
    console.error('Error finding best driver:', error);
    return null;
  }
};

// ==================== جلب الطلبات ====================

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const { status, limit = 50 } = req.query;
    const where: any = {};
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: order.id }
      });
      return { ...order, orderItems };
    }));

    res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    console.error('خطأ في جلب الطلبات:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const getOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const { id } = req.params;
    const where: any = { id };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const order = await prisma.order.findFirst({ where });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: order.id }
    });

    res.json({ success: true, data: { ...order, orderItems } });
  } catch (error) {
    console.error('خطأ في جلب الطلب:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== إنشاء الطلب ====================

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded) userId = decoded.id;
      } catch (error) {
        console.log('⚠️ Invalid token, continuing as guest');
      }
    }

    const {
      tableId, customerName, customerPhone,
      items: orderItemsData, notes, paymentMethod = 'cash',
      subtotal, couponCode, discountAmount, total,
      orderSource = 'restaurant',
      storeId: providedStoreId,
      orderType = 'dine_in',
      deliveryAddress, deliveryLat, deliveryLng,
      deliveryFee: providedDeliveryFee,
      deliveryDistance: providedDeliveryDistance
    } = req.body;

    console.log('📦 Creating order:', { 
      customerName, customerPhone, itemsCount: orderItemsData?.length, subtotal, total, orderType
    });

    if (!orderItemsData || !Array.isArray(orderItemsData) || orderItemsData.length === 0) {
      res.status(400).json({ success: false, error: 'الطلب يجب أن يحتوي على عناصر على الأقل' });
      return;
    }

    if (!tableId && (!customerName || !customerPhone)) {
      res.status(400).json({ success: false, error: 'يرجى إدخال الاسم ورقم الهاتف' });
      return;
    }

    // تحديد restaurantId أو storeId
    let restaurantId: string | undefined;
    let storeId: string | undefined;

    if (tableId) {
  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table) {
    res.status(404).json({ success: false, error: 'الطاولة غير موجودة' });
    return;
  }
  restaurantId = table.restaurantId;
}
    else if (providedStoreId) {
      const store = await prisma.store.findUnique({ where: { id: providedStoreId } });
      if (!store) {
        res.status(404).json({ success: false, error: 'المتجر غير موجود' });
        return;
      }
      storeId = providedStoreId;
    }
    else if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.restaurantId) restaurantId = user.restaurantId;
      else if (user?.storeId) storeId = user.storeId;
    }

    if (!restaurantId && !storeId) {
      res.status(400).json({ success: false, error: 'معرف المطعم أو المتجر غير موجود' });
      return;
    }

    // التحقق من الكوبون
    let coupon = null;
    if (couponCode) {
      const couponWhere: any = {
        code: couponCode.toUpperCase(),
        isActive: true,
       startDate: { lte: new Date() },
        validUntil: { gte: new Date() }
      };
      if (restaurantId) couponWhere.restaurantId = restaurantId;
      else if (storeId) couponWhere.storeId = storeId;
      
      coupon = await prisma.coupon.findFirst({ where: couponWhere });
      if (!coupon) {
        res.status(400).json({ success: false, error: 'الكوبون غير صالح' });
        return;
      }
      // التحقق من الحد الأقصى للاستخدام (usageLimit)
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        res.status(400).json({ success: false, error: 'تم استنفاذ عدد استخدامات الكوبون' });
        return;
      }
      if (subtotal < (coupon.minOrderAmount || 0)) {
        res.status(400).json({ success: false, error: `الحد الأدنى للطلب هو ${coupon.minOrderAmount} ر.س` });
        return;
      }
    }

    // حساب عناصر الطلب
    let calculatedTotal = 0;
    const orderItemsToCreate = [];

    for (const item of orderItemsData) {
      if ((!item.menuItemId && !item.productId) || !item.quantity) {
        res.status(400).json({ success: false, error: 'بيانات العنصر غير مكتملة' });
        return;
      }

      let price = item.price || 0;

      if (item.menuItemId) {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
        if (!menuItem) {
          res.status(404).json({ success: false, error: 'العنصر غير موجود' });
          return;
        }
        if (!menuItem.isAvailable) {
          res.status(400).json({ success: false, error: `العنصر ${menuItem.name} غير متاح` });
          return;
        }
        if (restaurantId && menuItem.restaurantId !== restaurantId) {
          res.status(400).json({ success: false, error: 'العنصر لا ينتمي لهذا المطعم' });
          return;
        }
        price = item.price || Number(menuItem.price);
      }
      else if (item.productId) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          res.status(404).json({ success: false, error: 'المنتج غير موجود' });
          return;
        }
        if (!product.isAvailable) {
          res.status(400).json({ success: false, error: `المنتج ${product.name} غير متاح` });
          return;
        }
        if (product.stock < item.quantity) {
          res.status(400).json({ success: false, error: `المنتج ${product.name} غير متوفر بالكمية المطلوبة` });
          return;
        }
        if (storeId && product.storeId !== storeId) {
          res.status(400).json({ success: false, error: 'المنتج لا ينتمي لهذا المتجر' });
          return;
        }
        price = item.price || Number(product.price);
      }

      const itemTotal = price * item.quantity;
      calculatedTotal += itemTotal;

      orderItemsToCreate.push({
        menuItemId: item.menuItemId || null,
        productId: item.productId || null,
        quantity: item.quantity,
        price: price,
        size: item.size || null,
        addons: item.addons || null,
        notes: item.notes || null
      });
    }

    const finalTotal = total !== undefined ? total : calculatedTotal;
    const finalDeliveryFee = providedDeliveryFee || 0;
    const finalDeliveryDistance = providedDeliveryDistance || 0;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`;

    const orderData: any = {
      orderNumber,
      restaurantId: restaurantId || null,
      storeId: storeId || null,
      tableId: tableId || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      subtotal: subtotal || calculatedTotal,
      discountAmount: discountAmount || 0,
      couponCode: couponCode || null,
      total: finalTotal + finalDeliveryFee,
      notes: notes || null,
      paymentMethod,
      orderType: orderType,
      deliveryAddress: deliveryAddress || null,
      deliveryLat: deliveryLat || null,
      deliveryLng: deliveryLng || null,
      deliveryFee: finalDeliveryFee,
      deliveryDistance: finalDeliveryDistance,
      orderSource: orderSource,
      status: 'pending',
      isPaid: paymentMethod !== 'cash'
    };

    if (userId) orderData.createdBy = userId;

    // التوزيع التلقائي للسائق (للمتاجر فقط)
    if (storeId && orderType === 'delivery') {
      const bestDriver = await findBestDriver(storeId, deliveryLat, deliveryLng);
      if (bestDriver) {
        orderData.assignedDriverId = bestDriver.id;
        orderData.status = 'preparing';
        orderData.estimatedDeliveryTime = 60; // دقائق
        console.log(`✅ Auto-assigned driver: ${bestDriver.name} (${bestDriver.id})`);
      } else {
        console.log('⚠️ No active drivers available, order pending');
      }
    }

    const order = await prisma.order.create({
      data: orderData
    });
    console.log('✅ Order created with ID:', order.id);

    // إنشاء عناصر الطلب
    for (const itemData of orderItemsToCreate) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: itemData.menuItemId,
          productId: itemData.productId,
          quantity: itemData.quantity,
          price: itemData.price,
          size: itemData.size,
          addons: itemData.addons,
          notes: itemData.notes
        }
      });

      if (itemData.productId) {
        await prisma.product.update({
          where: { id: itemData.productId },
          data: { stock: { decrement: itemData.quantity } }
        });
      }
    }

    // تحديث استخدام الكوبون
    if (coupon) {
  await prisma.coupon.update({
    where: { id: coupon.id },
    data: { usageCount: { increment: 1 } }
  });
}

    const orderItemsResult = await prisma.orderItem.findMany({
      where: { orderId: order.id }
    });

    const completedOrder = { ...order, orderItems: orderItemsResult };

    emitOrderRealtimeNotification(
      completedOrder,
      'order.created',
      'طلب جديد',
      `تم إنشاء طلب جديد برقم ${order.orderNumber}`,
      userId,
      { orderSource: order.orderSource }
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: completedOrder
    });
  } catch (error) {
    console.error('❌ Error in createOrder:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الطلب' });
  }
};

// ==================== تحديث حالة الطلب ====================

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    const where: any = { id };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const order = await prisma.order.findFirst({ where });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status }
    });

    emitOrderRealtimeNotification(
      updated,
      'order.status.updated',
      'تحديث حالة الطلب',
      `تم تحديث حالة الطلب ${updated.orderNumber} إلى ${updated.status}`,
      req.user?.id
    );

    res.json({ success: true, message: 'تم تحديث حالة الطلب', data: { status: updated.status } });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الطلب' });
  }
};

// ==================== تحديث حالة الدفع ====================

export const updatePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const { id } = req.params;
    const { isPaid } = req.body;

    const where: any = { id };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const order = await prisma.order.findFirst({ where });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { isPaid }
    });

    emitOrderRealtimeNotification(
      updated,
      'order.payment.updated',
      'تحديث حالة الدفع',
      `تم تحديث حالة الدفع للطلب ${updated.orderNumber}`,
      req.user?.id
    );

    res.json({ success: true, message: 'تم تحديث حالة الدفع', data: { isPaid: updated.isPaid } });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الدفع' });
  }
};

// ==================== طلبات اليوم ====================

export const getTodayOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = { createdAt: { gte: today } };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: order.id }
      });
      return { ...order, orderItems };
    }));

    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      delivering: orders.filter(o => o.status === 'delivering').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalSales: orders.reduce((sum, o) => sum + Number(o.total), 0)
    };

    res.json({ success: true, data: { orders: ordersWithItems, stats } });
  } catch (error) {
    console.error('Error getting today orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== إحصائيات الطلبات ====================

export const getOrderStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const { period = 'week' } = req.query;
    let startDate: Date;

    if (period === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    const where: any = { createdAt: { gte: startDate }, status: { not: 'cancelled' } };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const orders = await prisma.order.findMany({ where });

    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

    const dailyStats: { [key: string]: { orders: number; sales: number } } = {};
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { orders: 0, sales: 0 };
      }
      dailyStats[date].orders++;
      dailyStats[date].sales += Number(order.total);
    });

    res.json({
      success: true,
      data: {
        period,
        totalOrders,
        totalSales,
        averageOrder,
        dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({ date, ...stats }))
      }
    });
  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإحصائيات' });
  }
};

// ==================== طلبات المستخدم ====================

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: 'يجب تسجيل الدخول أولاً' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: { createdBy: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: order.id }
      });
      return { ...order, orderItems };
    }));

    res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلبات' });
  }
};

// ==================== دوال التوصيل (مختصرة) ====================

export const getDeliveryOrdersForRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business || business.type !== 'restaurant') {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { status } = req.query;
    const where: any = { restaurantId: business.id, orderType: 'delivery' };
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('خطأ في جلب طلبات التوصيل:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const getDeliveryOrdersForDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driverId = req.user?.id;
    if (!driverId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        assignedDriverId: driverId,
        orderType: 'delivery',
        status: { in: ['ready', 'delivering'] }
      },
      orderBy: { estimatedDeliveryTime: 'asc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('خطأ في جلب طلبات المندوب:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const assignDeliveryDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business || business.type !== 'restaurant') {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { orderId } = req.params;
    const { driverId, estimatedMinutes = 30 } = req.body;

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: business.id, orderType: 'delivery' }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود أو ليس طلب توصيل' });
      return;
    }

    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: 'delivery_driver' }
    });

    if (!driver) {
      res.status(404).json({ success: false, error: 'مندوب التوصيل غير موجود' });
      return;
    }

    if (!driver.isActive || !driver.isOnline) {
      res.status(403).json({ success: false, error: 'المندوب غير متاح حالياً' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        assignedDriverId: driverId,
        estimatedDeliveryTime: estimatedMinutes,
        status: 'ready'
      }
    });

    emitOrderRealtimeNotification(
      updated,
      'order.driver.assigned',
      'تعيين مندوب توصيل',
      `تم تعيين المندوب ${driver.name} للطلب ${updated.orderNumber}`,
      req.user?.id,
      { driverId: driver.id, driverName: driver.name, estimatedDeliveryTime: estimatedMinutes }
    );

    res.json({
      success: true,
      message: 'تم تعيين مندوب التوصيل بنجاح',
      data: { orderId: updated.id, driverId, driverName: driver.name, estimatedDeliveryTime: estimatedMinutes }
    });
  } catch (error) {
    console.error('خطأ في تعيين مندوب التوصيل:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تعيين مندوب التوصيل' });
  }
};

export const updateDeliveryOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const driverId = req.user?.id;
    const userRole = req.user?.role;
    const isOwner = userRole === 'owner' || userRole === 'super_admin';

    const where: any = { id: orderId, orderType: 'delivery' };
    if (!isOwner && driverId) where.assignedDriverId = driverId;

    const order = await prisma.order.findFirst({ where });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    const validTransitions: Record<string, string[]> = {
      'pending': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['delivering', 'cancelled'],
      'delivering': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    };

    if (validTransitions[order.status] && !validTransitions[order.status].includes(status)) {
      res.status(400).json({ success: false, error: `لا يمكن تغيير الحالة من ${order.status} إلى ${status}` });
      return;
    }

    const updateData: any = { status };
    if (status === 'delivering') updateData.driverAcceptedAt = new Date();
    if (status === 'delivered') updateData.actualDeliveryTime = Math.floor(new Date().getTime() / 60000);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

    let successMessage = 'تم تحديث حالة الطلب بنجاح';
    if (status === 'delivering') successMessage = 'تم قبول الطلب وبدء التوصيل';
    if (status === 'delivered') successMessage = 'تم إكمال التوصيل بنجاح';

    emitOrderRealtimeNotification(
      updated,
      'order.delivery.status.updated',
      'تحديث حالة التوصيل',
      `تم تحديث حالة الطلب ${updated.orderNumber} إلى ${updated.status}`,
      req.user?.id
    );

    res.json({ success: true, message: successMessage, data: { status: updated.status } });
  } catch (error) {
    console.error('خطأ في تحديث حالة الطلب:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الطلب' });
  }
};

export const getOrderWithDeliveryInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findFirst({
      where: { id: orderId, orderType: 'delivery' }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('خطأ في جلب معلومات التوصيل:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const getDeliveryStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = { orderType: 'delivery' };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const todayDeliveryOrders = await prisma.order.count({
      where: { ...where, createdAt: { gte: today } }
    });

    const activeDeliveryOrders = await prisma.order.findMany({
      where: { ...where, status: { in: ['ready', 'delivering'] } }
    });

    const activeDrivers = await prisma.user.count({
      where: {
        [business.type === 'restaurant' ? 'restaurantId' : 'storeId']: business.id,
        role: 'delivery_driver',
        isActive: true
      }
    });

    const deliveredOrders = await prisma.order.findMany({
      where: { ...where, status: 'delivered' }
    });

    const validDeliveredOrders = deliveredOrders.filter(order => order.actualDeliveryTime !== null);

    let avgDeliveryTime = 0;
    let totalDeliveryFees = 0;
    let avgDeliveryDistance = 0;

    if (validDeliveredOrders.length > 0) {
      const totalMinutes = validDeliveredOrders.reduce((sum, order) => {
        if (order.actualDeliveryTime) {
          const orderMinutes = Math.floor(new Date(order.createdAt).getTime() / 60000);
          return sum + (order.actualDeliveryTime - orderMinutes);
        }
        return sum;
      }, 0);
      avgDeliveryTime = totalMinutes / validDeliveredOrders.length;
      totalDeliveryFees = validDeliveredOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
      avgDeliveryDistance = validDeliveredOrders.reduce((sum, order) => sum + (order.deliveryDistance || 0), 0) / validDeliveredOrders.length;
    }

    res.json({
      success: true,
      data: {
        todayDeliveryOrders,
        activeDeliveryOrders: activeDeliveryOrders.length,
        activeDrivers,
        avgDeliveryTime: Math.round(avgDeliveryTime),
        totalDeliveredOrders: validDeliveredOrders.length,
        totalDeliveryFees: Math.round(totalDeliveryFees),
        avgDeliveryDistance: Math.round(avgDeliveryDistance * 100) / 100
      }
    });
  } catch (error) {
    console.error('خطأ في جلب إحصائيات التوصيل:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== تقييم الطلب ====================

export const rateOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.id;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ success: false, error: 'يرجى إدخال تقييم بين 1 و 5 نجوم' });
      return;
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, createdBy: userId, status: 'delivered' }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود أو لم يتم تسليمه بعد' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        rating: rating,
        ratingComment: comment || null,
        ratedAt: new Date()
      }
    });

    res.json({ success: true, message: 'شكراً لتقييمك', data: { rating, comment } });
  } catch (error) {
    console.error('Error rating order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال التقييم' });
  }
};

export const rateOrderAdvanced = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { overallRating, comment } = req.body;
    const userId = req.user?.id;

    const order = await prisma.order.findFirst({
      where: { id: orderId, createdBy: userId, status: 'delivered' }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود أو لم يتم تسليمه بعد' });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        rating: overallRating,
        ratingComment: comment || null,
        ratedAt: new Date()
      }
    });

    if (order.assignedDriverId) {
      const driver = await prisma.user.findUnique({ where: { id: order.assignedDriverId } });
      if (driver) {
        const newRating = ((driver.driverRating || 0) + overallRating) / 2;
        await prisma.user.update({
          where: { id: order.assignedDriverId },
          data: {
            driverRating: newRating,
            driverRatingCount: (driver.driverRatingCount || 0) + 1
          }
        });
      }
    }

    res.json({ success: true, message: 'شكراً لتقييمك', data: { orderId, overallRating, comment } });
  } catch (error) {
    console.error('Error in advanced rating:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال التقييم' });
  }
};

export const updateDriverLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driverId = req.user?.id;
    const { lat, lng } = req.body;

    if (!driverId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    if (lat === undefined || lng === undefined) {
      res.status(400).json({ success: false, error: 'الإحداثيات مطلوبة' });
      return;
    }

    await prisma.user.update({
      where: { id: driverId },
      data: {
        lastLocationLat: lat,
        lastLocationLng: lng,
        lastLocationUpdate: new Date()
      }
    });

    res.json({ success: true, message: 'تم تحديث الموقع بنجاح', data: { lat, lng, timestamp: new Date() } });
  } catch (error) {
    console.error('خطأ في تحديث موقع المندوب:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الموقع' });
  }
};

export const getDriverLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { driverId } = req.params;
    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: 'delivery_driver' },
      select: {
        id: true,
        name: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationUpdate: true
      }
    });

    if (!driver) {
      res.status(404).json({ success: false, error: 'مندوب التوصيل غير موجود' });
      return;
    }

    res.json({
      success: true,
      data: {
        driverId: driver.id,
        name: driver.name,
        lat: driver.lastLocationLat,
        lng: driver.lastLocationLng,
        lastUpdate: driver.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('خطأ في جلب موقع المندوب:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الموقع' });
  }
};