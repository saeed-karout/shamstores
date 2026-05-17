// backend/src/controllers/orderController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import MenuItem from '../models/MenuItem';
import Table from '../models/Table';
import Coupon from '../models/Coupon';
import User from '../models/User';
import Restaurant from '../models/Restaurant';
import Store from '../models/Store';
import Product from '../models/Product';
import { Op } from 'sequelize';
import sequelize from '../config/database';
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
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    if (targetRestaurantId) return targetRestaurantId;
    const restaurants = await Restaurant.findAll({ limit: 1 });
    if (restaurants.length > 0) return restaurants[0].id;
    return null;
  }
  return req.user?.restaurantId || null;
};

const toRealtimeOrderPayload = (order: Order): RealtimeOrderPayload => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  isPaid: order.isPaid,
  total: Number(order.total),
  orderType: order.orderType,
  restaurantId: order.restaurantId || null,
  storeId: order.storeId || null,
  createdBy: order.createdBy || null,
  assignedDriverId: order.assignedDriverId || null
});

const emitOrderRealtimeNotification = (
  order: Order,
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
): Promise<User | null> => {
  try {
    // جلب جميع السائقين النشطين للمتجر
    const drivers = await User.findAll({
      where: {
        storeId,
        role: 'delivery_driver',
        isActive: true,
        isOnline: true
      },
      attributes: ['id', 'name', 'phone', 'lastLocationLat', 'lastLocationLng', 'lastLocationUpdate']
    });

    if (drivers.length === 0) return null;

    // إذا كان هناك موقع توصيل، اختر أقرب سائق
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

    // إذا لم نجد سائقاً بالموقع، اختر السائق الأقل انشغالاً
    const driversWithStats = await Promise.all(
      drivers.map(async (driver) => {
        const activeOrdersCount = await Order.count({
          where: {
            assignedDriverId: driver.id,
            status: { [Op.in]: ['pending', 'preparing', 'ready', 'delivering'] }
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
export const rateOrderAdvanced = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const {
      overallRating,
      foodQuality,
      deliverySpeed,
      driverBehavior,
      packaging,
      comment,
      recommend
    } = req.body;
    const userId = req.user?.id;

    const order = await Order.findOne({
      where: {
        id: orderId,
        createdBy: userId,
        status: 'delivered'
      },
      include: [
        { model: User, as: 'assignedDriver' }
      ]
    });

    if (!order) {
      res.status(404).json({ 
        success: false,
        error: 'الطلب غير موجود أو لم يتم تسليمه بعد' 
      });
      return;
    }

    // تحديث تقييم الطلب
    await order.update({
      rating: overallRating,
      ratingComment: comment,
      ratedAt: new Date()
    });

    // إذا كان هناك سائق مخصص، قم بتحديث تقييمه
    if (order.assignedDriverId) {
      const driver = await User.findByPk(order.assignedDriverId);
      if (driver) {
        // حساب متوسط تقييم السائق الجديد
        const newDriverRating = (driver.driverRating || 0 + deliverySpeed) / 2;
        await driver.update({
          driverRating: newDriverRating,
          driverRatingCount: (driver.driverRatingCount || 0) + 1
        });
      }
    }

    res.json({
      success: true,
      message: 'شكراً لتقييمك',
      data: {
        orderId,
        overallRating,
        foodQuality,
        deliverySpeed,
        driverBehavior,
        packaging,
        comment,
        recommend
      }
    });
  } catch (error) {
    console.error('Error in advanced rating:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إرسال التقييم' 
    });
  }
};


export const getOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { status, limit = 50 } = req.query;

    const where: any = { restaurantId };
    if (status) where.status = status;

    const orders = await Order.findAll({
      where,
      include: [
        { model: Table, as: 'table' },
        { 
          model: OrderItem, 
          as: 'orderItems',
          include: [{ model: MenuItem, as: 'menuItem' }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit)
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('خطأ في جلب الطلبات:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const getOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { id } = req.params;
    const order = await Order.findOne({
      where: { id, restaurantId },
      include: [
        { model: Table, as: 'table' },
        { 
          model: OrderItem, 
          as: 'orderItems',
          include: [{ model: MenuItem, as: 'menuItem' }]
        }
      ]
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('خطأ في جلب الطلب:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== إنشاء الطلب (مع التوزيع التلقائي) ====================

export const createOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const transaction = await sequelize.transaction();
  
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
      items, notes, paymentMethod = 'cash',
      subtotal, couponCode, discountAmount, total,
      orderSource = 'restaurant',
      storeId: providedStoreId,
      orderType = 'dine_in',
      deliveryAddress, deliveryLat, deliveryLng,
      deliveryFee: providedDeliveryFee,
      deliveryDistance: providedDeliveryDistance
    } = req.body;

    console.log('📦 Creating order:', { 
      customerName, customerPhone, itemsCount: items?.length, subtotal, total, orderType
    });

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      res.status(400).json({ success: false, error: 'الطلب يجب أن يحتوي على عناصر على الأقل' });
      return;
    }

    if (!tableId && (!customerName || !customerPhone)) {
      await transaction.rollback();
      res.status(400).json({ success: false, error: 'يرجى إدخال الاسم ورقم الهاتف' });
      return;
    }

    // تحديد restaurantId أو storeId
    let restaurantId: string | undefined;
    let storeId: string | undefined;

    if (tableId) {
      const table = await Table.findByPk(tableId, { transaction });
      if (!table) {
        await transaction.rollback();
        res.status(404).json({ success: false, error: 'الطاولة غير موجودة' });
        return;
      }
      restaurantId = table.restaurantId;
    } 
    else if (providedStoreId) {
      const store = await Store.findByPk(providedStoreId, { transaction });
      if (!store) {
        await transaction.rollback();
        res.status(404).json({ success: false, error: 'المتجر غير موجود' });
        return;
      }
      storeId = providedStoreId;
    }
    else if (userId) {
      const user = await User.findByPk(userId, { transaction });
      if (user?.restaurantId) restaurantId = user.restaurantId;
      else if (user?.storeId) storeId = user.storeId;
    }

    if (!restaurantId && !storeId) {
      await transaction.rollback();
      res.status(400).json({ success: false, error: 'معرف المطعم أو المتجر غير موجود' });
      return;
    }

    // التحقق من الكوبون
    if (couponCode) {
      let couponWhere: any = {
        code: couponCode.toUpperCase(),
        isActive: true,
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() }
      };
      if (restaurantId) couponWhere.restaurantId = restaurantId;
      else if (storeId) couponWhere.storeId = storeId;
      
      const coupon = await Coupon.findOne({ where: couponWhere, transaction });
      if (!coupon) {
        await transaction.rollback();
        res.status(400).json({ success: false, error: 'الكوبون غير صالح' });
        return;
      }
      if (coupon.usedCount >= coupon.usageLimit) {
        await transaction.rollback();
        res.status(400).json({ success: false, error: 'تم استنفاذ عدد استخدامات الكوبون' });
        return;
      }
      if (subtotal < Number(coupon.minOrder)) {
        await transaction.rollback();
        res.status(400).json({ success: false, error: `الحد الأدنى للطلب هو ${coupon.minOrder} ر.س` });
        return;
      }
    }

    // حساب عناصر الطلب
    let calculatedTotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      if ((!item.menuItemId && !item.productId) || !item.quantity) {
        await transaction.rollback();
        res.status(400).json({ success: false, error: 'بيانات العنصر غير مكتملة' });
        return;
      }

      let price = item.price || 0;

      if (item.menuItemId) {
        const menuItem = await MenuItem.findByPk(item.menuItemId, { transaction });
        if (!menuItem) {
          await transaction.rollback();
          res.status(404).json({ success: false, error: 'العنصر غير موجود' });
          return;
        }
        if (!menuItem.isAvailable) {
          await transaction.rollback();
          res.status(400).json({ success: false, error: `العنصر ${menuItem.name} غير متاح` });
          return;
        }
        if (restaurantId && menuItem.restaurantId !== restaurantId) {
          await transaction.rollback();
          res.status(400).json({ success: false, error: 'العنصر لا ينتمي لهذا المطعم' });
          return;
        }
        price = item.price || Number(menuItem.price);
      }
      else if (item.productId) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (!product) {
          await transaction.rollback();
          res.status(404).json({ success: false, error: 'المنتج غير موجود' });
          return;
        }
        if (!product.isAvailable) {
          await transaction.rollback();
          res.status(400).json({ success: false, error: `المنتج ${product.name} غير متاح` });
          return;
        }
        if (product.stock < item.quantity) {
          await transaction.rollback();
          res.status(400).json({ success: false, error: `المنتج ${product.name} غير متوفر بالكمية المطلوبة` });
          return;
        }
        if (storeId && product.storeId !== storeId) {
          await transaction.rollback();
          res.status(400).json({ success: false, error: 'المنتج لا ينتمي لهذا المتجر' });
          return;
        }
        price = item.price || Number(product.price);
      }

      const itemTotal = price * item.quantity;
      calculatedTotal += itemTotal;

      // معالجة addons بشكل صحيح
      let addonsValue = undefined;
      if (item.addons) {
        if (typeof item.addons === 'string') {
          addonsValue = item.addons;
        } else {
          addonsValue = JSON.stringify(item.addons);
        }
      }

      orderItemsData.push({
        menuItemId: item.menuItemId || null,
        productId: item.productId || null,
        quantity: item.quantity,
        price: price,
        size: item.size || undefined,
        addons: addonsValue,
        notes: item.notes || undefined
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
      tableId: tableId || undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      subtotal: subtotal || calculatedTotal,
      discountAmount: discountAmount || 0,
      couponCode: couponCode || undefined,
      total: finalTotal + finalDeliveryFee,
      notes: notes || undefined,
      paymentMethod,
      orderType: orderType,
      deliveryAddress: deliveryAddress,
      deliveryLat: deliveryLat,
      deliveryLng: deliveryLng,
      deliveryFee: finalDeliveryFee,
      deliveryDistance: finalDeliveryDistance,
      orderSource: orderSource,
      status: 'pending',
      isPaid: paymentMethod === 'cash' ? false : true
    };

    if (userId) orderData.createdBy = userId;

    // التوزيع التلقائي للسائق (للمتاجر فقط)
    if (storeId && orderType === 'delivery') {
      const bestDriver = await findBestDriver(storeId, deliveryLat, deliveryLng);
      
      if (bestDriver) {
        orderData.assignedDriverId = bestDriver.id;
        orderData.status = 'preparing';
        orderData.estimatedDeliveryTime = new Date(Date.now() + 60 * 60000);
        console.log(`✅ Auto-assigned driver: ${bestDriver.name} (${bestDriver.id})`);
      } else {
        console.log('⚠️ No active drivers available, order pending');
      }
    }

    const order = await Order.create(orderData, { transaction });
    console.log('✅ Order created with ID:', order.id);

    // إنشاء عناصر الطلب
    for (const itemData of orderItemsData) {
      await OrderItem.create({
        orderId: order.id,
        menuItemId: itemData.menuItemId,
        productId: itemData.productId,
        quantity: itemData.quantity,
        price: itemData.price,
        size: itemData.size,
        addons: itemData.addons,
        notes: itemData.notes
      }, { transaction });

      if (itemData.productId) {
        await Product.decrement('stock', { 
          by: itemData.quantity, 
          where: { id: itemData.productId }, 
          transaction 
        });
      }
      if (itemData.menuItemId) {
        await MenuItem.increment('ordersCount', { 
          by: itemData.quantity, 
          where: { id: itemData.menuItemId }, 
          transaction 
        });
      }
    }

    // تحديث استخدام الكوبون
    if (couponCode) {
      let whereCondition: any = { code: couponCode.toUpperCase() };
      if (restaurantId) whereCondition.restaurantId = restaurantId;
      else if (storeId) whereCondition.storeId = storeId;
      await Coupon.increment('usedCount', { by: 1, where: whereCondition, transaction });
    }

    await transaction.commit();

    const completedOrder = await Order.findByPk(order.id, {
      include: [
        { model: Table, as: 'table' },
        { 
          model: OrderItem, 
          as: 'orderItems',
          include: [
            { model: MenuItem, as: 'menuItem' },
            { model: Product, as: 'product' }
          ]
        },
        { model: User, as: 'assignedDriver', attributes: ['id', 'name', 'phone'] }
      ]
    });

    const orderForRealtime = completedOrder || order;
    emitOrderRealtimeNotification(
      orderForRealtime,
      'order.created',
      'طلب جديد',
      `تم إنشاء طلب جديد برقم ${orderForRealtime.orderNumber}`,
      userId,
      { orderSource: orderForRealtime.orderSource }
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: completedOrder
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error in createOrder:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الطلب' });
  }
};

// ==================== باقي الدوال ====================

export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ where: { id, restaurantId } });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    await order.update({ status });

    emitOrderRealtimeNotification(
      order,
      'order.status.updated',
      'تحديث حالة الطلب',
      `تم تحديث حالة الطلب ${order.orderNumber} إلى ${order.status}`,
      req.user?.id,
      { previousStatus: order.previous('status') }
    );

    res.json({ 
      success: true, 
      message: 'تم تحديث حالة الطلب', 
      data: { status: order.status } 
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الطلب' });
  }
};

export const updatePaymentStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { id } = req.params;
    const { isPaid } = req.body;

    const order = await Order.findOne({ where: { id, restaurantId } });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    await order.update({ isPaid });

    emitOrderRealtimeNotification(
      order,
      'order.payment.updated',
      'تحديث حالة الدفع',
      `تم تحديث حالة الدفع للطلب ${order.orderNumber}`,
      req.user?.id
    );

    res.json({ 
      success: true, 
      message: 'تم تحديث حالة الدفع', 
      data: { isPaid: order.isPaid } 
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الدفع' });
  }
};

export const getTodayOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.findAll({
      where: { restaurantId, createdAt: { [Op.gte]: today } },
      include: [
        { model: Table, as: 'table' },
        { 
          model: OrderItem, 
          as: 'orderItems', 
          include: [{ model: MenuItem, as: 'menuItem' }] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      served: orders.filter(o => o.status === 'served').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalSales: orders.reduce((sum, o) => sum + Number(o.total), 0)
    };

    res.json({ success: true, data: { orders, stats } });
  } catch (error) {
    console.error('Error getting today orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const getOrderStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
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

    const orders = await Order.findAll({
      where: { 
        restaurantId, 
        createdAt: { [Op.gte]: startDate }, 
        status: { [Op.ne]: 'cancelled' } 
      }
    });

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

export const getMyOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: 'يجب تسجيل الدخول أولاً' });
      return;
    }

    const orders = await Order.findAll({
      where: { createdBy: req.user.id },
      include: [
        { model: Table, as: 'table' },
        { 
          model: OrderItem, 
          as: 'orderItems', 
          include: [{ model: MenuItem, as: 'menuItem' }] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلبات' });
  }
};





// ==================== دوال التوصيل ====================

export const getDeliveryOrdersForRestaurant = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { status } = req.query;

    const where: any = { 
      restaurantId,
      orderType: 'delivery'
    };
    
    if (status) {
      where.status = status;
    }

    const orders = await Order.findAll({
      where,
      include: [
        { 
          model: User, 
          as: 'assignedDriver',
          attributes: ['id', 'name', 'phone', 'email'],
          required: false
        },
        { 
          model: Table, 
          as: 'table',
          required: false
        },
        { 
          model: OrderItem, 
          as: 'orderItems',
          include: [{ model: MenuItem, as: 'menuItem' }],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('خطأ في جلب طلبات التوصيل:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const getDeliveryOrdersForDriver = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const driverId = req.user?.id;
    
    if (!driverId) {
      res.status(401).json({ 
        success: false,
        error: 'غير مصرح' 
      });
      return;
    }

    const orders = await Order.findAll({
      where: {
        assignedDriverId: driverId,
        orderType: 'delivery',
        status: {
          [Op.in]: ['ready', 'delivering']
        }
      },
      include: [
        { 
          model: Restaurant, 
          as: 'restaurant',
          attributes: ['name', 'address', 'phone', 'latitude', 'longitude']
        },
        { 
          model: OrderItem, 
          as: 'orderItems',
          include: [{ model: MenuItem, as: 'menuItem' }]
        }
      ],
      order: [['estimatedDeliveryTime', 'ASC']]
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('خطأ في جلب طلبات المندوب:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const assignDeliveryDriver = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { orderId } = req.params;
    const { driverId, estimatedMinutes = 30 } = req.body;

    // التحقق من وجود الطلب
    const order = await Order.findOne({
      where: { 
        id: orderId,
        restaurantId,
        orderType: 'delivery'
      },
      transaction
    });

    if (!order) {
      await transaction.rollback();
      res.status(404).json({ 
        success: false,
        error: 'الطلب غير موجود أو ليس طلب توصيل' 
      });
      return;
    }

    // التحقق من وجود المندوب
    const driver = await User.findOne({
      where: { 
        id: driverId,
        role: 'delivery_driver'
      },
      transaction
    });

    if (!driver) {
      await transaction.rollback();
      res.status(404).json({ 
        success: false,
        error: 'مندوب التوصيل غير موجود' 
      });
      return;
    }

    // حساب وقت التوصيل المتوقع
    const estimatedDeliveryTime = new Date();
    estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + estimatedMinutes);

    // تحديث الطلب
    await order.update({
      assignedDriverId: driverId,
      estimatedDeliveryTime,
      status: 'ready'
    }, { transaction });

    await transaction.commit();

    emitOrderRealtimeNotification(
      order,
      'order.driver.assigned',
      'تعيين مندوب توصيل',
      `تم تعيين المندوب ${driver.name} للطلب ${order.orderNumber}`,
      req.user?.id,
      {
        driverId: driver.id,
        driverName: driver.name,
        estimatedDeliveryTime
      }
    );

    res.json({
      success: true,
      message: 'تم تعيين مندوب التوصيل بنجاح',
      data: {
        orderId: order.id,
        driverId,
        driverName: driver.name,
        estimatedDeliveryTime
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('خطأ في تعيين مندوب التوصيل:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تعيين مندوب التوصيل' 
    });
  }
};

export const updateDeliveryOrderStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const driverId = req.user?.id;
    const userRole = req.user?.role;
    const isOwner = userRole === 'owner' || userRole === 'super_admin';

    const where: any = { 
      id: orderId,
      orderType: 'delivery'
    };
    
    if (!isOwner && driverId) {
      where.assignedDriverId = driverId;
    }

    const order = await Order.findOne({ where, transaction });

    if (!order) {
      await transaction.rollback();
      res.status(404).json({ 
        success: false,
        error: 'الطلب غير موجود' 
      });
      return;
    }

    // التحقق من صلاحية الحالة
    const validTransitions: Record<string, string[]> = {
      'pending': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['delivering', 'cancelled'],
      'delivering': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    };

    if (validTransitions[order.status] && !validTransitions[order.status].includes(status)) {
      await transaction.rollback();
      res.status(400).json({ 
        success: false,
        error: `لا يمكن تغيير الحالة من ${order.status} إلى ${status}` 
      });
      return;
    }

    // تحديث البيانات حسب الحالة
    const updateData: any = { status };
    
    if (status === 'delivering') {
      updateData.driverAcceptedAt = new Date();
    }
    
    if (status === 'delivered') {
      updateData.actualDeliveryTime = new Date();
    }

    await order.update(updateData, { transaction });

    await transaction.commit();

    let successMessage = 'تم تحديث حالة الطلب بنجاح';
    if (status === 'delivering') successMessage = 'تم قبول الطلب وبدء التوصيل';
    if (status === 'delivered') successMessage = 'تم إكمال التوصيل بنجاح';

    emitOrderRealtimeNotification(
      order,
      'order.delivery.status.updated',
      'تحديث حالة التوصيل',
      `تم تحديث حالة الطلب ${order.orderNumber} إلى ${order.status}`,
      req.user?.id
    );

    res.json({
      success: true,
      message: successMessage,
      data: { status: order.status }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('خطأ في تحديث حالة الطلب:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث حالة الطلب' 
    });
  }
};

export const getOrderWithDeliveryInfo = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({
      where: { 
        id: orderId,
        orderType: 'delivery'
      },
      include: [
        { 
          model: Restaurant, 
          as: 'restaurant',
          attributes: ['name', 'address', 'phone', 'latitude', 'longitude']
        },
        {
          model: User,
          as: 'assignedDriver',
          attributes: ['id', 'name', 'phone']
        },
        { 
          model: OrderItem, 
          as: 'orderItems',
          include: [{ model: MenuItem, as: 'menuItem' }]
        }
      ]
    });

    if (!order) {
      res.status(404).json({ 
        success: false,
        error: 'الطلب غير موجود' 
      });
      return;
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('خطأ في جلب معلومات التوصيل:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const getDeliveryStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // طلبات التوصيل اليوم
    const todayDeliveryOrders = await Order.count({
      where: {
        restaurantId,
        orderType: 'delivery',
        createdAt: { [Op.gte]: today }
      }
    });

    // الطلبات النشطة (قيد التوصيل)
    const activeDeliveryOrders = await Order.findAll({
      where: {
        restaurantId,
        orderType: 'delivery',
        status: { [Op.in]: ['ready', 'delivering'] }
      },
      include: [
        { model: User, as: 'assignedDriver', attributes: ['id', 'name', 'phone'] }
      ]
    });

    // عدد مناديب التوصيل النشطين
    const activeDrivers = await User.count({
      where: {
        restaurantId,
        role: 'delivery_driver',
        isActive: true
      }
    });

    // الطلبات المكتملة - إصلاح الخطأ هنا
    // استخدم Sequelize.literal بدلاً من Op.ne
    const deliveredOrders = await Order.findAll({
      where: {
        restaurantId,
        orderType: 'delivery',
        status: 'delivered'
      },
      attributes: ['createdAt', 'actualDeliveryTime', 'deliveryFee', 'deliveryDistance']
    });

    // تصفية النتائج في JavaScript بدلاً من SQL
    const validDeliveredOrders = deliveredOrders.filter(order => order.actualDeliveryTime !== null);

    let avgDeliveryTime = 0;
    let totalDeliveryFees = 0;
    let avgDeliveryDistance = 0;

    if (validDeliveredOrders.length > 0) {
      const totalMinutes = validDeliveredOrders.reduce((sum, order) => {
        if (order.actualDeliveryTime) {
          const deliveryTime = new Date(order.actualDeliveryTime).getTime();
          const orderTime = new Date(order.createdAt).getTime();
          const minutes = (deliveryTime - orderTime) / 1000 / 60;
          return sum + minutes;
        }
        return sum;
      }, 0);
      avgDeliveryTime = totalMinutes / validDeliveredOrders.length;
      
      totalDeliveryFees = validDeliveredOrders.reduce((sum, order) => sum + Number(order.deliveryFee || 0), 0);
      avgDeliveryDistance = validDeliveredOrders.reduce((sum, order) => sum + Number(order.deliveryDistance || 0), 0) / validDeliveredOrders.length;
    }

    res.json({
      success: true,
      data: {
        todayDeliveryOrders,
        activeDeliveryOrders: activeDeliveryOrders.length,
        activeDeliveryOrdersList: activeDeliveryOrders,
        activeDrivers,
        avgDeliveryTime: Math.round(avgDeliveryTime),
        totalDeliveredOrders: validDeliveredOrders.length,
        totalDeliveryFees: Math.round(totalDeliveryFees),
        avgDeliveryDistance: Math.round(avgDeliveryDistance * 100) / 100
      }
    });
  } catch (error) {
    console.error('خطأ في جلب إحصائيات التوصيل:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const rateOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.id;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ 
        success: false,
        error: 'يرجى إدخال تقييم بين 1 و 5 نجوم' 
      });
      return;
    }

    const order = await Order.findOne({
      where: {
        id: orderId,
        createdBy: userId,
        status: 'delivered'
      }
    });

    if (!order) {
      res.status(404).json({ 
        success: false,
        error: 'الطلب غير موجود أو لم يتم تسليمه بعد' 
      });
      return;
    }

    await order.update({
      rating: rating,
      ratingComment: comment || null,
      ratedAt: new Date()
    });

    res.json({
      success: true,
      message: 'شكراً لتقييمك',
      data: { rating, comment }
    });
  } catch (error) {
    console.error('Error rating order:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إرسال التقييم' 
    });
  }
};

export const updateDriverLocation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const driverId = req.user?.id;
    const { lat, lng } = req.body;

    if (!driverId) {
      res.status(401).json({ 
        success: false,
        error: 'غير مصرح' 
      });
      return;
    }

    if (lat === undefined || lng === undefined) {
      res.status(400).json({ 
        success: false,
        error: 'الإحداثيات مطلوبة' 
      });
      return;
    }

    await User.update(
      { 
        lastLocationLat: lat,
        lastLocationLng: lng,
        lastLocationUpdate: new Date()
      },
      { where: { id: driverId }, individualHooks: true }
    );

    res.json({
      success: true,
      message: 'تم تحديث الموقع بنجاح',
      data: { lat, lng, timestamp: new Date() }
    });
  } catch (error) {
    console.error('خطأ في تحديث موقع المندوب:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث الموقع' 
    });
  }
};

export const getDriverLocation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { driverId } = req.params;
    
    const driver = await User.findOne({
      where: { 
        id: driverId,
        role: 'delivery_driver'
      },
      attributes: ['id', 'name', 'lastLocationLat', 'lastLocationLng', 'lastLocationUpdate']
    });

    if (!driver) {
      res.status(404).json({ 
        success: false,
        error: 'مندوب التوصيل غير موجود' 
      });
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
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الموقع' 
    });
  }
};



