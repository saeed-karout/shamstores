// backend/src/controllers/deliveryController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import Order from '../models/Order';
import User from '../models/User';
import Restaurant from '../models/Restaurant';
import Store from '../models/Store';
import Ticket from '../models/Ticket';
import PlatformSetting from '../models/PlatformSettings';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { MenuItem, OrderItem, Product } from '../models';
import { emitOrderRealtimeEvent } from '../realtime/socket';
import firebaseService from '../services/firebaseService';

// ==================== دوال مساعدة ====================

const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    if (targetRestaurantId) return targetRestaurantId;
    const restaurants = await Restaurant.findAll({ limit: 1 });
    return restaurants.length > 0 ? restaurants[0].id : null;
  }
  return req.user?.restaurantId || null;
};

const getStoreId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetStoreId = req.query.storeId as string || req.body.storeId;
    if (targetStoreId) return targetStoreId;
    const stores = await Store.findAll({ limit: 1 });
    return stores.length > 0 ? stores[0].id : null;
  }
  return req.user?.storeId || null;
};

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

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ==================== Firebase Notifications ====================

export const sendNotificationToDriver = async (
  driverId: string,
  title: string,
  body: string,
  type: 'new_order' | 'order_status' | 'alert',
  orderId?: string
): Promise<void> => {
  try {
    const driver = await User.findByPk(driverId);
    if (!driver || !driver.fcmToken) return;

    await firebaseService.sendToDevice(driver.fcmToken, {
      title,
      body,
      type,
      orderId,
      sound: 'default',
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    });
  } catch (error) {
    console.error('Error sending notification to driver:', error);
  }
};

// ==================== قبول الطلب ====================

export const acceptOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { orderId } = req.params;
    const driverId = req.user?.id;

    const activeOrder = await Order.findOne({
      where: {
        assignedDriverId: driverId,
        status: { [Op.in]: ['delivering'] }
      },
      transaction
    });

    if (activeOrder) {
      await transaction.rollback();
      res.status(400).json({
        success: false,
        error: 'لديك طلب قيد التوصيل حالياً. لا يمكنك قبول طلب آخر'
      });
      return;
    }

    const order = await Order.findOne({
      where: {
        id: orderId,
        assignedDriverId: driverId,
        status: 'ready'
      },
      transaction
    });

    if (!order) {
      await transaction.rollback();
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود أو غير متاح'
      });
      return;
    }

    await order.update({
      status: 'delivering',
      driverAcceptedAt: new Date()
    }, { transaction });

    await transaction.commit();

    try {
      emitOrderRealtimeEvent({
        event: 'order.status.updated',
        title: 'تم قبول الطلب',
        message: `تم قبول الطلب ${order.orderNumber} من قبل المندوب`,
        actorId: driverId || null,
        order: {
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
        },
        extraData: { previousStatus: 'ready' }
      });
    } catch (err) {
      console.error('Error emitting realtime event:', err);
    }

    res.json({
      success: true,
      message: 'تم قبول الطلب بنجاح',
      data: { status: order.status }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error accepting order:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في قبول الطلب'
    });
  }
};

// ==================== تأكيد الدفع ====================

export const confirmPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const driverId = req.user?.id;

    const order = await Order.findOne({
      where: {
        id: orderId,
        assignedDriverId: driverId,
        status: 'delivering'
      }
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
      return;
    }

    await order.update({
      isPaid: true,
      paymentCollectedAt: new Date()
    });

    res.json({
      success: true,
      message: 'تم تأكيد الدفع',
      data: { isPaid: true }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تأكيد الدفع'
    });
  }
};

// ==================== حساب سعر التوصيل ====================

export const calculateDeliveryFee = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { businessId, businessType, customerLat, customerLng } = req.body;

    let business;
    if (businessType === 'restaurant') {
      business = await Restaurant.findByPk(businessId);
    } else {
      business = await Store.findByPk(businessId);
    }

    if (!business) {
      res.status(404).json({ success: false, error: 'النشاط التجاري غير موجود' });
      return;
    }

    const deliverySettings = business.deliverySettings || {
      baseFee: 5,
      feePerKm: 2,
      minDistance: 1,
      maxDistance: 20,
      freeDeliveryAbove: 100
    };

    const distance = calculateDistance(
      business.latitude || 33.5138,
      business.longitude || 36.2765,
      customerLat,
      customerLng
    );

    let deliveryFee = deliverySettings.baseFee;

    if (distance > deliverySettings.minDistance) {
      deliveryFee += (distance - deliverySettings.minDistance) * deliverySettings.feePerKm;
    }

    if (deliveryFee > deliverySettings.maxDistance * deliverySettings.feePerKm) {
      deliveryFee = deliverySettings.maxDistance * deliverySettings.feePerKm;
    }

    res.json({
      success: true,
      data: {
        distance: Math.round(distance * 100) / 100,
        deliveryFee: Math.round(deliveryFee),
        currency: 'ر.س'
      }
    });
  } catch (error) {
    console.error('Error calculating delivery fee:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حساب سعر التوصيل' });
  }
};

// ==================== تقييم الطلب ====================

export const rateOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { stars, rating, comment } = req.body;
    const driverId = req.user?.id;
    const userRole = req.user?.role;
    const isOwner = userRole === 'owner' || userRole === 'super_admin';

    const finalRating = stars || rating;

    if (!finalRating || finalRating < 1 || finalRating > 5) {
      res.status(400).json({
        success: false,
        error: 'يرجى إدخال تقييم بين 1 و 5 نجوم'
      });
      return;
    }

    const whereCondition: any = {
      id: orderId,
      status: 'delivered'
    };

    if (!isOwner) {
      whereCondition.assignedDriverId = driverId;
    }

    const order = await Order.findOne({
      where: whereCondition
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود أو لم يتم تسليمه بعد'
      });
      return;
    }

    await order.update({
      rating: finalRating,
      ratingComment: comment || null,
      ratedAt: new Date()
    } as any);

    res.json({
      success: true,
      message: 'شكراً لتقييمك',
      data: {
        orderId: order.id,
        rating: finalRating,
        comment: comment || null
      }
    });
  } catch (error) {
    console.error('Error rating order:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في إرسال التقييم'
    });
  }
};

// ==================== تعيين مندوب توصيل ====================

export const assignDeliveryDriver = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const businessId = await getRestaurantId(req) || await getStoreId(req);

    if (!businessId) {
      res.status(400).json({
        success: false,
        error: 'معرف النشاط التجاري غير موجود'
      });
      return;
    }

    const { orderId } = req.params;
    const { driverId, estimatedMinutes = 30 } = req.body;

    const order = await Order.findOne({
      where: {
        id: orderId,
        [Op.or]: [
          { restaurantId: businessId },
          { storeId: businessId }
        ],
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

    if (!driver.isActive || !driver.isOnline) {
      await transaction.rollback();
      res.status(403).json({
        success: false,
        error: 'المندوب غير متاح حالياً'
      });
      return;
    }

    const estimatedDeliveryTime = new Date();
    estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + estimatedMinutes);

    await order.update({
      assignedDriverId: driverId,
      estimatedDeliveryTime,
      status: 'ready'
    }, { transaction });

    await transaction.commit();

    // إرسال إشعار للمندوب
    await sendNotificationToDriver(
      driverId,
      'طلب جديد',
      `طلب جديد #${order.orderNumber} جاهز للتوصيل`,
      'new_order',
      order.id
    );

    try {
      emitOrderRealtimeEvent({
        event: 'order.assigned',
        title: 'تم تعيين مندوب',
        message: `تم تعيين المندوب ${driver.name} للطلب ${order.orderNumber}`,
        actorId: req.user?.id || null,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          isPaid: order.isPaid,
          total: Number(order.total),
          orderType: order.orderType,
          restaurantId: order.restaurantId || null,
          storeId: order.storeId || null,
          createdBy: order.createdBy || null,
          assignedDriverId: driverId || null
        }
      });
    } catch (err) {
      console.error('Error emitting realtime event:', err);
    }

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
    console.error('Error assigning driver:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تعيين مندوب التوصيل'
    });
  }
};

// ==================== تحديث موقع المندوب ====================

export const updateDriverLocation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
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
      message: 'تم تحديث الموقع بنجاح'
    });
  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الموقع' });
  }
};

// ==================== الحصول على موقع المندوب ====================

export const getDriverLocation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { driverId } = req.params;
    const businessId = await getRestaurantId(req) || await getStoreId(req);

    if (!businessId && req.user?.role !== 'super_admin') {
      res.status(403).json({
        success: false,
        error: 'غير مصرح'
      });
      return;
    }

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
    console.error('Error getting driver location:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب موقع المندوب'
    });
  }
};

// ==================== الحصول على موقع السائق الحالي ====================

export const getMyDriverLocation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const driverId = req.user?.id;

    if (!driverId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

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
    console.error('Error getting current driver location:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب موقع المندوب'
    });
  }
};

// ==================== حالة تواجد المندوب ====================

export const getDriverAvailability = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const driverId = req.user?.id;

    if (!driverId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const driver = await User.findOne({
      where: {
        id: driverId,
        role: 'delivery_driver'
      },
      attributes: ['id', 'name', 'isActive', 'isOnline', 'fcmToken', 'lastLogin', 'lastLocationUpdate']
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
        isActive: driver.isActive,
        isOnline: driver.isOnline,
        hasFcmToken: !!driver.fcmToken,
        lastLogin: driver.lastLogin,
        lastLocationUpdate: driver.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('Error getting driver availability:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب حالة التواجد' });
  }
};

export const updateDriverAvailability = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const driverId = req.user?.id;

    if (!driverId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { isOnline, online, fcmToken } = req.body;
    const nextOnline = typeof isOnline === 'boolean' ? isOnline : typeof online === 'boolean' ? online : undefined;

    if (nextOnline === undefined) {
      res.status(400).json({ success: false, error: 'يجب إرسال isOnline أو online كقيمة منطقية' });
      return;
    }

    const driver = await User.findOne({
      where: {
        id: driverId,
        role: 'delivery_driver'
      }
    });

    if (!driver) {
      res.status(404).json({ success: false, error: 'مندوب التوصيل غير موجود' });
      return;
    }

    if (!driver.isActive && nextOnline) {
      res.status(403).json({ success: false, error: 'الحساب غير مفعل' });
      return;
    }

    const updateData: any = {
      isOnline: nextOnline,
      lastLogin: nextOnline ? new Date() : driver.lastLogin
    };

    if (fcmToken) {
      updateData.fcmToken = fcmToken;
    }

    await driver.update(updateData);

    res.json({
      success: true,
      message: nextOnline ? 'تم تفعيل وضع الأونلاين' : 'تم إيقاف وضع الأونلاين',
      data: {
        driverId: driver.id,
        isActive: driver.isActive,
        isOnline: driver.isOnline,
        hasFcmToken: !!driver.fcmToken
      }
    });
  } catch (error) {
    console.error('Error updating driver availability:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة التواجد' });
  }
};

// ==================== تحديث حالة طلب التوصيل ====================

export const updateDeliveryStatus = async (
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

    const where: any = { id: orderId };

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

    const updateData: any = { status };
    if (status === 'delivered') {
      updateData.actualDeliveryTime = new Date();
    }

    await order.update(updateData, { transaction });

    await transaction.commit();

    // إرسال إشعار للمستخدم
    if (order.createdBy && status === 'delivered') {
      const user = await User.findByPk(order.createdBy);
      if (user?.fcmToken) {
        await sendNotificationToDriver(
          user.id,
          'تم توصيل طلبك',
          `تم توصيل طلبك #${order.orderNumber} بنجاح`,
          'order_status',
          order.id
        );
      }
    }

    try {
      emitOrderRealtimeEvent({
        event: 'order.status.updated',
        title: 'تحديث حالة التوصيل',
        message: `تم تحديث حالة التوصيل للطلب ${order.orderNumber} إلى ${order.status}`,
        actorId: req.user?.id || null,
        order: {
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
        }
      });
    } catch (err) {
      console.error('Error emitting realtime event:', err);
    }

    res.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      data: { status: order.status }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating delivery status:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحديث حالة الطلب'
    });
  }
};

// ==================== إحصائيات التوصيل ====================

export const getDeliveryStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const businessId = await getRestaurantId(req) || await getStoreId(req);

    if (!businessId) {
      res.status(400).json({
        success: false,
        error: 'معرف النشاط التجاري غير موجود'
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereBusiness: any = {
      orderType: 'delivery'
    };
    if (req.user?.restaurantId) {
      whereBusiness.restaurantId = businessId;
    } else if (req.user?.storeId) {
      whereBusiness.storeId = businessId;
    }

    const todayOrders = await Order.count({
      where: {
        ...whereBusiness,
        createdAt: { [Op.gte]: today }
      }
    });

    const activeOrders = await Order.findAll({
      where: {
        ...whereBusiness,
        status: { [Op.in]: ['ready', 'delivering'] }
      },
      include: [
        { model: User, as: 'assignedDriver', attributes: ['name'] }
      ]
    });

    const drivers = await User.findAll({
      where: {
        [Op.or]: [
          { restaurantId: businessId },
          { storeId: businessId }
        ],
        role: 'delivery_driver',
        isActive: true
      },
      attributes: ['id', 'name', 'lastLocationLat', 'lastLocationLng', 'lastLocationUpdate', 'isOnline']
    });

    const deliveredOrders = await Order.findAll({
      where: {
        ...whereBusiness,
        status: 'delivered'
      },
      attributes: ['createdAt', 'actualDeliveryTime']
    });

    const validDeliveredOrders = deliveredOrders.filter(order => order.actualDeliveryTime !== null);

    let avgDeliveryTime = 0;
    if (validDeliveredOrders.length > 0) {
      const totalMinutes = validDeliveredOrders.reduce((sum, order) => {
        const deliveryTime = new Date(order.actualDeliveryTime!).getTime();
        const orderTime = new Date(order.createdAt).getTime();
        const minutes = (deliveryTime - orderTime) / 1000 / 60;
        return sum + minutes;
      }, 0);
      avgDeliveryTime = totalMinutes / validDeliveredOrders.length;
    }

    res.json({
      success: true,
      data: {
        todayOrders,
        activeOrders: activeOrders.length,
        activeOrdersList: activeOrders,
        driversCount: drivers.length,
        driversList: drivers,
        avgDeliveryTime: Math.round(avgDeliveryTime),
        totalDelivered: validDeliveredOrders.length,
        onlineDrivers: drivers.filter(d => d.isOnline).length
      }
    });
  } catch (error) {
    console.error('Error getting delivery stats:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب الإحصائيات'
    });
  }
};

// ==================== تأكيد وصول المندوب ====================

export const driverReachedRestaurant = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const driverId = req.user?.id;

    const order = await Order.findOne({
      where: {
        id: orderId,
        assignedDriverId: driverId,
        status: 'delivering'
      }
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
      return;
    }

    await order.update({ driverReachedAt: new Date() });

    res.json({
      success: true,
      message: 'تم تأكيد الوصول إلى المطعم'
    });
  } catch (error) {
    console.error('Error updating driver reach:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تأكيد الوصول'
    });
  }
};

// ==================== جلب طلبات التوصيل ====================

export const getDeliveryOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const businessId = await getRestaurantId(req) || await getStoreId(req);

    if (!businessId) {
      res.status(400).json({
        success: false,
        error: 'معرف النشاط التجاري غير موجود'
      });
      return;
    }

    const { status } = req.query;

    const where: any = {
      orderType: 'delivery'
    };

    if (req.user?.restaurantId) {
      where.restaurantId = businessId;
    } else if (req.user?.storeId) {
      where.storeId = businessId;
    }

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
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'phone', 'latitude', 'longitude'],
          required: false
        },
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'address', 'phone', 'latitude', 'longitude'],
          required: false
        },
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'nameEn', 'description', 'image', 'price'],
              required: false
            },
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'description', 'imageUrl', 'price'],
              required: false
            }
          ],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const processedOrders = orders.map(order => {
      const plainOrder = order.toJSON();
      if (plainOrder.orderItems) {
        plainOrder.orderItems = plainOrder.orderItems.map((item: any) => ({
          ...item,
          itemName: item.menuItem?.name || item.product?.name || 'منتج غير معروف',
          itemImage: item.menuItem?.image || item.product?.imageUrl || null
        }));
      }
      return plainOrder;
    });

    res.json({
      success: true,
      data: processedOrders
    });
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب طلبات التوصيل'
    });
  }
};

// ==================== طلبات مندوب التوصيل ====================

export const getDriverOrders = async (
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
        status: {
          [Op.in]: ['ready', 'delivering']
        }
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'phone', 'latitude', 'longitude'],
          required: false
        },
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'address', 'phone', 'latitude', 'longitude'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'phone'],
          required: false
        },
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'nameEn', 'description', 'image', 'price'],
              required: false
            },
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'description', 'imageUrl', 'price'],
              required: false
            }
          ],
          required: false
        }
      ],
      order: [['estimatedDeliveryTime', 'ASC']]
    });

    const processedOrders = orders.map(order => {
      const plainOrder = order.toJSON();
      if (plainOrder.orderItems) {
        plainOrder.orderItems = plainOrder.orderItems.map((item: any) => ({
          ...item,
          itemName: item.menuItem?.name || item.product?.name || 'منتج غير معروف',
          itemImage: item.menuItem?.image || item.product?.imageUrl || null
        }));
      }
      return plainOrder;
    });

    res.json({
      success: true,
      data: processedOrders
    });
  } catch (error) {
    console.error('Error fetching driver orders:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب الطلبات'
    });
  }
};

// ==================== إكمال الطلب ====================

export const completeOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { orderId } = req.params;
    const driverId = req.user?.id;
    const userRole = req.user?.role;
    const isOwner = userRole === 'owner' || userRole === 'super_admin';

    const where: any = {
      id: orderId,
      status: 'delivering'
    };

    if (!isOwner) {
      where.assignedDriverId = driverId;
    }

    const order = await Order.findOne({ where, transaction });

    if (!order) {
      await transaction.rollback();
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود أو ليس قيد التوصيل'
      });
      return;
    }

    if (!order.isPaid && order.paymentMethod === 'cash') {
      await transaction.rollback();
      res.status(400).json({
        success: false,
        error: 'يجب تحصيل الدفع أولاً قبل إكمال الطلب'
      });
      return;
    }

    await order.update({
      status: 'delivered',
      actualDeliveryTime: new Date()
    }, { transaction });

    await transaction.commit();

    if (order.createdBy) {
      const user = await User.findByPk(order.createdBy);
      if (user?.fcmToken) {
        await sendNotificationToDriver(
          user.id,
          'تم توصيل طلبك',
          `تم توصيل طلبك #${order.orderNumber} بنجاح`,
          'order_status',
          order.id
        );
      }
    }

    try {
      emitOrderRealtimeEvent({
        event: 'order.completed',
        title: 'تم إكمال الطلب',
        message: `تم إكمال الطلب ${order.orderNumber} بنجاح`,
        actorId: req.user?.id || null,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: 'delivered',
          isPaid: order.isPaid,
          total: Number(order.total),
          orderType: order.orderType,
          restaurantId: order.restaurantId || null,
          storeId: order.storeId || null,
          createdBy: order.createdBy || null,
          assignedDriverId: order.assignedDriverId || null
        }
      });
    } catch (err) {
      console.error('Error emitting realtime event:', err);
    }

    res.json({
      success: true,
      message: 'تم إكمال الطلب بنجاح',
      data: {
        status: 'delivered',
        actualDeliveryTime: order.actualDeliveryTime
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error completing order:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في إكمال الطلب'
    });
  }
};

// ==================== الحصول على طلب مع موقع التوصيل ====================

export const getOrderWithLocation = async (
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
          model: Store,
          as: 'store',
          attributes: ['name', 'address', 'phone', 'latitude', 'longitude']
        },
        {
          model: User,
          as: 'assignedDriver',
          attributes: ['id', 'name', 'phone', 'lastLocationLat', 'lastLocationLng']
        },
        {
          model: OrderItem,
          as: 'orderItems',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'nameEn', 'description', 'image', 'price']
            },
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'description', 'imageUrl', 'price']
            }
          ],
          required: false
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
    console.error('Error getting order with location:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب بيانات الطلب'
    });
  }
};

// ==================== إثبات التسليم ====================

export const uploadDeliveryProof = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const driverId = req.user?.id;
    const { proofType, signatureData, imageUrl } = req.body;

    const order = await Order.findOne({
      where: {
        id: orderId,
        assignedDriverId: driverId,
        status: { [Op.in]: ['delivering'] }
      }
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود أو غير قيد التوصيل'
      });
      return;
    }

    const updateData: any = {
      deliveryProofType: proofType,
      proofTakenAt: new Date()
    };

    if (proofType === 'signature' && signatureData) {
      updateData.deliveryProofSignature = signatureData;
    } else if (proofType === 'photo' && imageUrl) {
      updateData.deliveryProofImage = imageUrl;
    }

    await order.update(updateData);

    res.json({
      success: true,
      message: 'تم حفظ إثبات التسليم بنجاح',
      data: {
        proofType,
        takenAt: updateData.proofTakenAt
      }
    });
  } catch (error) {
    console.error('Error uploading delivery proof:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في رفع إثبات التسليم'
    });
  }
};

export const getDeliveryProof = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const userRole = req.user?.role;

    if (userRole !== 'owner' && userRole !== 'super_admin') {
      res.status(403).json({
        success: false,
        error: 'غير مصرح لك بعرض إثبات التسليم'
      });
      return;
    }

    const order = await Order.findByPk(orderId, {
      attributes: [
        'id',
        'orderNumber',
        'deliveryProofImage',
        'deliveryProofSignature',
        'deliveryProofType',
        'proofTakenAt',
        'status',
        'actualDeliveryTime'
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
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        hasProof: !!(order.deliveryProofImage || order.deliveryProofSignature),
        proofType: order.deliveryProofType,
        proofImage: order.deliveryProofImage,
        proofSignature: order.deliveryProofSignature,
        takenAt: order.proofTakenAt,
        status: order.status,
        deliveredAt: order.actualDeliveryTime
      }
    });
  } catch (error) {
    console.error('Error getting delivery proof:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب إثبات التسليم'
    });
  }
};

// ==================== أرباح المندوب ====================

export const getDriverEarnings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const driverId = req.user?.id;
    const { period = 'week' } = req.query;

    if (!driverId) {
      res.status(401).json({
        success: false,
        error: 'غير مصرح'
      });
      return;
    }

    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
    }

    const completedOrders = await Order.findAll({
      where: {
        assignedDriverId: driverId,
        status: 'delivered',
        actualDeliveryTime: { [Op.gte]: startDate }
      },
      attributes: [
        'id',
        'orderNumber',
        'deliveryFee',
        'actualDeliveryTime',
        'total',
        'createdAt'
      ]
    });

    const totalDeliveries = completedOrders.length;
    const totalEarnings = completedOrders.reduce((sum, order) =>
      sum + (order.deliveryFee || 0), 0);
    const averageEarnings = totalDeliveries > 0
      ? totalEarnings / totalDeliveries
      : 0;

    const dailyStats: Record<string, { count: number; earnings: number }> = {};
    completedOrders.forEach(order => {
      const date = order.actualDeliveryTime?.toISOString().split('T')[0] ||
        order.createdAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, earnings: 0 };
      }
      dailyStats[date].count++;
      dailyStats[date].earnings += order.deliveryFee || 0;
    });

    const dailyStatsArray = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      deliveries: stats.count,
      earnings: stats.earnings
    })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalDeliveries,
          totalEarnings,
          averageEarnings,
          startDate,
          endDate: now
        },
        dailyStats: dailyStatsArray,
        recentDeliveries: completedOrders.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Error getting driver earnings:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب أرباح المندوب'
    });
  }
};

// ==================== سجل طلبات المندوب ====================

export const getDriverOrderHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const driverId = req.user?.id;
    const { page = 1, limit = 20, status = 'delivered' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (!driverId) {
      res.status(401).json({
        success: false,
        error: 'غير مصرح'
      });
      return;
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where: {
        assignedDriverId: driverId,
        status: status === 'all' ? { [Op.ne]: 'pending' } : status
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'phone'],
          required: false
        },
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'address', 'phone'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'phone'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting driver order history:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب سجل الطلبات'
    });
  }
};

// ==================== التواصل مع الدعم ====================

export const getSupportContact = async (
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

    const platformSettings = await PlatformSetting.findOne();

    res.json({
      success: true,
      data: {
        phone: platformSettings?.supportPhone || '+966 123456789',
        whatsapp: platformSettings?.supportWhatsapp || '+966 123456789',
        email: platformSettings?.supportEmail || 'support@digitalmenu.com',
        openingHours: platformSettings?.supportHours || '9:00 ص - 9:00 م'
      }
    });
  } catch (error) {
    console.error('Error getting support contact:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب معلومات الدعم'
    });
  }
};

export const createSupportTicket = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const driverId = req.user?.id;
    const { subject, message, orderId } = req.body;

    if (!driverId) {
      res.status(401).json({
        success: false,
        error: 'غير مصرح'
      });
      return;
    }

    if (!subject || !message) {
      res.status(400).json({
        success: false,
        error: 'الموضوع والرسالة مطلوبان'
      });
      return;
    }

    const ticket = await Ticket.create({
      userId: driverId,
      subject,
      message,
      orderId: orderId || null,
      status: 'open',
      type: 'delivery'
    } as any);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء تذكرة الدعم بنجاح',
      data: ticket
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في إنشاء تذكرة الدعم'
    });
  }
};

export const getDriverTickets = async (
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

    const tickets = await Ticket.findAll({
      where: {
        userId: driverId,
        type: 'delivery'
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error('Error getting driver tickets:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب تذاكر الدعم'
    });
  }
};