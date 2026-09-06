// backend/src/controllers/deliveryController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { emitOrderRealtimeEvent } from '../realtime/socket';
import firebaseService from '../services/firebaseService';

// ==================== دوال مساعدة ====================

const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    if (targetRestaurantId) return targetRestaurantId;
    const restaurants = await prisma.restaurant.findMany({ take: 1 });
    return restaurants.length > 0 ? restaurants[0].id : null;
  }
  return req.user?.restaurantId || null;
};

const getStoreId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetStoreId = req.query.storeId as string || req.body.storeId;
    if (targetStoreId) return targetStoreId;
    const stores = await prisma.store.findMany({ take: 1 });
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
    const driver = await prisma.user.findUnique({ where: { id: driverId } });
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
  try {
    const { orderId } = req.params;
    const driverId = req.user?.id;

    const activeOrder = await prisma.order.findFirst({
      where: {
        assignedDriverId: driverId,
        status: 'delivering'
      }
    });

    if (activeOrder) {
      res.status(400).json({
        success: false,
        error: 'لديك طلب قيد التوصيل حالياً. لا يمكنك قبول طلب آخر'
      });
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        assignedDriverId: driverId,
        status: 'ready'
      }
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود أو غير متاح'
      });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'delivering',
        driverAcceptedAt: new Date()
      }
    });

    try {
      emitOrderRealtimeEvent({
        event: 'order.status.updated',
        title: 'تم قبول الطلب',
        message: `تم قبول الطلب ${order.orderNumber} من قبل المندوب`,
        actorId: driverId || null,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          isPaid: order.isPaid || false,
          status: 'delivering',
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
      data: { status: 'delivering' }
    });
  } catch (error) {
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

    const order = await prisma.order.findFirst({
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

    // ملاحظة: حقل isPaid غير موجود في الـ schema، يمكن إضافته إذا لزم الأمر
    // أو استخدام paymentCollectedAt كبديل
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentCollectedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'تم تأكيد الدفع',
      data: { paymentCollectedAt: new Date() }
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
      business = await prisma.restaurant.findUnique({ where: { id: businessId } });
    } else {
      business = await prisma.store.findUnique({ where: { id: businessId } });
    }

    if (!business) {
      res.status(404).json({ success: false, error: 'النشاط التجاري غير موجود' });
      return;
    }

    const deliverySettings = (business as any).deliverySettings || {
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

    const order = await prisma.order.findFirst({
      where: whereCondition
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود أو لم يتم تسليمه بعد'
      });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        rating: finalRating,
        ratingComment: comment || null,
        ratedAt: new Date()
      }
    });

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

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { restaurantId: businessId },
          { storeId: businessId }
        ],
        orderType: 'delivery'
      }
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود أو ليس طلب توصيل'
      });
      return;
    }

    const driver = await prisma.user.findFirst({
      where: {
        id: driverId,
        role: 'delivery_driver'
      }
    });

    if (!driver) {
      res.status(404).json({
        success: false,
        error: 'مندوب التوصيل غير موجود'
      });
      return;
    }

    if (!driver.isActive || !driver.isOnline) {
      res.status(403).json({
        success: false,
        error: 'المندوب غير متاح حالياً'
      });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        assignedDriverId: driverId,
        estimatedDeliveryTime: estimatedMinutes,
        status: 'ready'
      }
    });

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
          isPaid: order.isPaid || false,
          status: order.status,
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
        estimatedDeliveryTime: estimatedMinutes
      }
    });
  } catch (error) {
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

    await prisma.user.update({
      where: { id: driverId },
      data: {
        lastLocationLat: lat,
        lastLocationLng: lng,
        lastLocationUpdate: new Date()
      }
    });

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

    const driver = await prisma.user.findFirst({
      where: {
        id: driverId,
        role: 'delivery_driver'
      },
      select: {
        id: true,
        name: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationUpdate: true
      }
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

    const driver = await prisma.user.findFirst({
      where: {
        id: driverId,
        role: 'delivery_driver'
      },
      select: {
        id: true,
        name: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationUpdate: true
      }
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

    const driver = await prisma.user.findFirst({
      where: {
        id: driverId,
        role: 'delivery_driver'
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        isOnline: true,
        fcmToken: true,
        lastLogin: true,
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
        isActive: driver.isActive,
        isOnline: driver.isOnline,
        hasFcmToken: !!driver.fcmToken,
        lastLogin: driver.lastLogin,
        lastLocationUpdate: driver.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('Error getting driver availability:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب حالة التواجد'
    });
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

    const { isOnline, fcmToken } = req.body;
    const nextOnline = typeof isOnline === 'boolean' ? isOnline : undefined;

    if (nextOnline === undefined) {
      res.status(400).json({ success: false, error: 'يجب إرسال isOnline كقيمة منطقية' });
      return;
    }

    const driver = await prisma.user.findFirst({
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

    const updateData: any = { isOnline: nextOnline };
    if (fcmToken) updateData.fcmToken = fcmToken;

    await prisma.user.update({
      where: { id: driverId },
      data: updateData
    });

    res.json({
      success: true,
      message: nextOnline ? 'تم تفعيل وضع الأونلاين' : 'تم إيقاف وضع الأونلاين',
      data: {
        driverId: driver.id,
        isActive: driver.isActive,
        isOnline: nextOnline,
        hasFcmToken: !!fcmToken || !!driver.fcmToken
      }
    });
  } catch (error) {
    console.error('Error updating driver availability:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحديث حالة التواجد'
    });
  }
};

// ==================== تحديث حالة طلب التوصيل ====================

export const updateDeliveryStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
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

    const order = await prisma.order.findFirst({ where });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
      return;
    }

    const updateData: any = { status };
    if (status === 'delivered') {
      updateData.actualDeliveryTime = Math.floor(new Date().getTime() / 60000); // minutes since epoch
    }

    await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

    if (order.createdBy && status === 'delivered') {
      const user = await prisma.user.findUnique({ where: { id: order.createdBy } });
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
        message: `تم تحديث حالة التوصيل للطلب ${order.orderNumber} إلى ${status}`,
        actorId: req.user?.id || null,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: status,
          total: Number(order.total),
          isPaid: order.isPaid || false,
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
      data: { status }
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحديث حالة الطلب'
    });
  }
};

// ==================== إحصائيات التوصيل ====================

/**
 * إحصائيات التوصيل.
 *
 * السائق يسأل نفس المسار الذي يسأله التاجر — هكذا يوثّقه تطبيق التوصيل.
 * والمسار كان مقصوراً على المالك، فيرتدّ 403 على السائق: شاشة إحصائياته في
 * التطبيق فارغة أبداً بلا سبب ظاهر. فيُحوَّل السائق إلى أرقامه هو.
 */
export const getDeliveryStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role === 'delivery_driver') {
      return getDriverEarnings(req, res);
    }

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

    const whereBusiness: any = { orderType: 'delivery' };
    if (req.user?.restaurantId) {
      whereBusiness.restaurantId = businessId;
    } else if (req.user?.storeId) {
      whereBusiness.storeId = businessId;
    }

    const todayOrders = await prisma.order.count({
      where: {
        ...whereBusiness,
        createdAt: { gte: today }
      }
    });

    const activeOrders = await prisma.order.findMany({
      where: {
        ...whereBusiness,
        status: { in: ['ready', 'delivering'] }
      }
    });

    const drivers = await prisma.user.findMany({
      where: {
        OR: [
          { restaurantId: businessId },
          { storeId: businessId }
        ],
        role: 'delivery_driver',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationUpdate: true,
        isOnline: true
      }
    });

    const deliveredOrders = await prisma.order.findMany({
      where: {
        ...whereBusiness,
        status: 'delivered'
      },
      select: {
        createdAt: true,
        actualDeliveryTime: true
      }
    });

    const validDeliveredOrders = deliveredOrders.filter(order => order.actualDeliveryTime !== null);

    let avgDeliveryTime = 0;
    if (validDeliveredOrders.length > 0) {
      const totalMinutes = validDeliveredOrders.reduce((sum, order) => {
        const deliveryMinutes = order.actualDeliveryTime || 0;
        const orderMinutes = Math.floor(new Date(order.createdAt).getTime() / 60000);
        const minutes = deliveryMinutes - orderMinutes;
        return sum + (minutes > 0 ? minutes : 0);
      }, 0);
      avgDeliveryTime = totalMinutes / validDeliveredOrders.length;
    }

    res.json({
      success: true,
      data: {
        todayOrders,
        activeOrders: activeOrders.length,
        driversCount: drivers.length,
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

    const order = await prisma.order.findFirst({
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

    await prisma.order.update({
      where: { id: orderId },
      data: { driverReachedAt: new Date() }
    });

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

    const where: any = { orderType: 'delivery' };

    if (req.user?.restaurantId) {
      where.restaurantId = businessId;
    } else if (req.user?.storeId) {
      where.storeId = businessId;
    }

    if (status) {
      where.status = status as string;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب طلبات التوصيل'
    });
  }
};

// ==================== طلبات مندوب التوصيل ====================

/**
 * يسطّح الطلب لتطبيق السائق.
 *
 * التطبيق يقرأ `restaurantName` و`restaurantLat` مهما كان مصدر الطلب مطعماً
 * أو متجراً — لأن السائق لا يفرّق: كلاهما «محلّ يستلم منه». فنملأ الحقول من
 * أيّهما وُجد بدل أن نطلب من التطبيق أن يعرف الفرق.
 *
 * و`orderItems` لا `items`: هو الاسم الذي تقرأه كل واجهات المنصّة.
 */
const shapeDriverOrder = (order: any) => {
  const business = order.restaurant || order.store || null;
  return {
    ...order,
    orderItems: order.items || [],
    businessType: order.restaurantId ? 'restaurant' : 'store',
    restaurantName: business?.name ?? null,
    restaurantAddress: business?.address ?? null,
    restaurantPhone: business?.phone ?? null,
    restaurantLat: business?.latitude ?? null,
    restaurantLng: business?.longitude ?? null
  };
};

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

    const orders = await prisma.order.findMany({
      where: {
        assignedDriverId: driverId,
        status: { in: ['ready', 'delivering'] }
      },
      orderBy: { estimatedDeliveryTime: 'asc' },
      // كان الردّ صفوفاً عارية: لا أصناف، ولا اسم المحلّ، ولا إحداثياته.
      // فيصل السائق إلى شاشة تقول «طلب #123» ولا تقول من أين يستلمه ولا ما
      // يحمله — وهما أوّل ما يحتاجه قبل أن يتحرّك.
      include: {
        items: {
          include: {
            menuItem: { select: { name: true } },
            product: { select: { name: true } }
          }
        },
        restaurant: { select: { name: true, address: true, phone: true, latitude: true, longitude: true } },
        store: { select: { name: true, address: true, phone: true, latitude: true, longitude: true } }
      }
    });

    res.json({ success: true, data: orders.map(shapeDriverOrder) });
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

    const order = await prisma.order.findFirst({ where });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود أو ليس قيد التوصيل'
      });
      return;
    }

    // التحقق من الدفع من خلال paymentCollectedAt
    const hasPayment = order.paymentCollectedAt !== null;

    if (!hasPayment && order.paymentMethod === 'cash') {
      res.status(400).json({
        success: false,
        error: 'يجب تحصيل الدفع أولاً قبل إكمال الطلب'
      });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'delivered',
        actualDeliveryTime: Math.floor(new Date().getTime() / 60000)
      }
    });

    if (order.createdBy) {
      const user = await prisma.user.findUnique({ where: { id: order.createdBy } });
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
          isPaid: order.isPaid || false,
          status: 'delivered',
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
        isPaid: order.isPaid || false,
        actualDeliveryTime: order.actualDeliveryTime
      }
    });
  } catch (error) {
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

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        orderType: 'delivery'
      }
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
      return;
    }

    res.json({ success: true, data: order });
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

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        assignedDriverId: driverId,
        status: { in: ['delivering'] }
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

    await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

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

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        deliveryProofImage: true,
        deliveryProofSignature: true,
        deliveryProofType: true,
        proofTakenAt: true,
        status: true,
        actualDeliveryTime: true
      }
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

    const completedOrders = await prisma.order.findMany({
      where: {
        assignedDriverId: driverId,
        status: 'delivered',
        createdAt: { gte: startDate }
      },
      select: {
        id: true,
        orderNumber: true,
        deliveryFee: true,
        createdAt: true
      }
    });

    const totalDeliveries = completedOrders.length;
    const totalEarnings = completedOrders.reduce((sum, order) =>
      sum + (order.deliveryFee || 0), 0);
    const averageEarnings = totalDeliveries > 0
      ? totalEarnings / totalDeliveries
      : 0;

    // أرقام اليوم مستقلّة عن المدى المطلوب: شاشة السائق تعرض «اليوم» دائماً
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayDeliveries = completedOrders.filter((o) => o.createdAt >= todayStart);
    const todayEarnings = todayDeliveries.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

    const [pendingCount, driver] = await Promise.all([
      prisma.order.count({
        where: { assignedDriverId: driverId, status: { in: ['ready', 'delivering'] } }
      }),
      prisma.user.findUnique({
        where: { id: driverId },
        select: { isOnline: true, driverRating: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        period,
        // الحقول المسطّحة يقرأها تطبيق السائق مباشرةً. كانت كلّها داخل
        // `summary` بأسماء أخرى، فتُقرأ أصفاراً — شاشة إحصائيات لا تتحرّك
        // أبداً تبدو تطبيقاً معطّلاً لا خادماً يردّ بشكل مختلف.
        todayOrders: todayDeliveries.length,
        activeOrders: pendingCount,
        completedOrders: totalDeliveries,
        todayEarnings,
        totalEarnings,
        rating: driver?.driverRating ?? 0,
        isOnline: driver?.isOnline ?? false,
        summary: {
          totalDeliveries,
          totalEarnings,
          averageEarnings,
          startDate,
          endDate: now
        },
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

    const where: any = {
      assignedDriverId: driverId
    };

    if (status !== 'all') {
      where.status = status as string;
    } else {
      where.status = { not: 'pending' };
    }

    const [orders, count] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: offset,
        // نفس تسطيح شاشة الطلبات: سجلٌّ بلا اسم المحلّ ولا الأصناف لا يقول
        // للسائق ماذا وصّل، وهو كل غرض السجلّ
        include: {
          items: {
            include: {
              menuItem: { select: { name: true } },
              product: { select: { name: true } }
            }
          },
          restaurant: { select: { name: true, address: true, phone: true, latitude: true, longitude: true } },
          store: { select: { name: true, address: true, phone: true, latitude: true, longitude: true } }
        }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        orders: orders.map(shapeDriverOrder),
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

    const platformSettings = await prisma.platformSetting.findFirst();

    res.json({
      success: true,
      data: {
        phone: platformSettings?.contactPhone || '+966 123456789',
        whatsapp: platformSettings?.contactWhatsapp || '+966 123456789',
        email: platformSettings?.contactEmail || 'support@digitalmenu.com',
        openingHours: '9:00 ص - 9:00 م'
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

    const ticket = await prisma.ticket.create({
      data: {
        userId: driverId,
        subject,
        description: message,
        status: 'open',
        priority: 'medium'
      }
    });

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

    const tickets = await prisma.ticket.findMany({
      where: {
        userId: driverId
      },
      orderBy: { createdAt: 'desc' }
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