// controllers/deliveryController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import Order from '../models/Order';
import User from '../models/User';
import Restaurant from '../models/Restaurant';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { MenuItem, OrderItem } from '../models';
import { emitOrderRealtimeEvent } from '../realtime/socket';

// دالة مساعدة للحصول على restaurantId
const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    if (targetRestaurantId) return targetRestaurantId;
    const restaurants = await Restaurant.findAll({ limit: 1 });
    return restaurants.length > 0 ? restaurants[0].id : null;
  }
  return req.user?.restaurantId || null;
};

// controllers/deliveryController.ts - أضف هذه الدوال

// قبول الطلب (مع منع قبول طلبين في نفس الوقت)
export const acceptOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const { orderId } = req.params;
    const driverId = req.user?.id;

    // التحقق من وجود طلب نشط للمندوب
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

    // Emit realtime event to notify driver/restaurant/store
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
      console.error('Error emitting realtime event on acceptOrder:', err);
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

// تأكيد الدفع
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



// إنهاء الطلب (بعد التوصيل والدفع)
export const completeOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const { orderId } = req.params;
    const driverId = req.user?.id;

    const order = await Order.findOne({
      where: {
        id: orderId,
        assignedDriverId: driverId,
        status: 'delivering'
      },
      transaction
    });

    if (!order) {
      await transaction.rollback();
      res.status(404).json({ 
        success: false,
        error: 'الطلب غير موجود' 
      });
      return;
    }

    if (!order.isPaid) {
      await transaction.rollback();
      res.status(400).json({ 
        success: false,
        error: 'يجب تأكيد الدفع أولاً' 
      });
      return;
    }

    await order.update({ 
      status: 'delivered',
      actualDeliveryTime: new Date()
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'تم إكمال الطلب بنجاح',
      data: { status: 'delivered' }
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

// حساب سعر التوصيل
export const calculateDeliveryFee = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId, customerLat, customerLng } = req.body;
    
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    const deliverySettings = restaurant.deliverySettings || {
      baseFee: 5,
      feePerKm: 2,
      minDistance: 1,
      maxDistance: 20,
      freeDeliveryAbove: 100
    };

    // حساب المسافة التقريبية (بسيط)
    const distance = calculateDistance(
      restaurant.latitude || 33.5138,
      restaurant.longitude || 36.2765,
      customerLat,
      customerLng
    );

    let deliveryFee = deliverySettings.baseFee;
    
    if (distance > deliverySettings.minDistance) {
      deliveryFee += (distance - deliverySettings.minDistance) * deliverySettings.feePerKm;
    }
    
    // حد أقصى للتوصيل
    if (deliveryFee > deliverySettings.maxDistance * deliverySettings.feePerKm) {
      deliveryFee = deliverySettings.maxDistance * deliverySettings.feePerKm;
    }

    res.json({
      success: true,
      data: {
        distance: Math.round(distance * 100) / 100,
        deliveryFee: Math.round(deliveryFee),
        currency: 'ل.س'
      }
    });
  } catch (error) {
    console.error('Error calculating delivery fee:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حساب سعر التوصيل' });
  }
};




function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}


export const rateOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { stars, comment } = req.body;
    const driverId = req.user?.id;

    const order = await Order.findOne({
      where: {
        id: orderId,
        assignedDriverId: driverId,
        status: 'delivered'
      }
    });

    if (!order) {
      res.status(404).json({ 
        success: false,
        error: 'الطلب غير موجود أو غير مكتمل' 
      });
      return;
    }

    // تخزين التقييم (يمكنك إنشاء جدول منفصل للتقييمات)
    await order.update({ 
      rating: stars,
      ratingComment: comment,
      ratedAt: new Date()
    } as any);

    res.json({
      success: true,
      message: 'تم إرسال التقييم بنجاح'
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

    // تحديث الطلب
    const estimatedDeliveryTime = new Date();
    estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + estimatedMinutes);

    await order.update({
      assignedDriverId: driverId,
      estimatedDeliveryTime,
      status: 'ready'
    }, { transaction });

    await transaction.commit();

    // Emit realtime event to notify assigned driver and store/restaurant
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
      console.error('Error emitting realtime event on assignDeliveryDriver:', err);
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
    const restaurantId = await getRestaurantId(req);

    if (!restaurantId && req.user?.role !== 'super_admin') {
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
    
    // إذا كان مندوب، تأكد أن الطلب مخصص له
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

    // تحديث وقت التسليم الفعلي
    const updateData: any = { status };
    if (status === 'delivered') {
      updateData.actualDeliveryTime = new Date();
    }

    await order.update(updateData, { transaction });

    await transaction.commit();

    // Emit realtime event after delivery status update
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
      console.error('Error emitting realtime event on updateDeliveryStatus:', err);
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




// controllers/deliveryController.ts - استبدل دالة getDeliveryStats بهذه النسخة

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
    const todayOrders = await Order.count({
      where: {
        restaurantId,
        orderType: 'delivery',
        createdAt: { [Op.gte]: today }
      }
    });

    // الطلبات النشطة
    const activeOrders = await Order.findAll({
      where: {
        restaurantId,
        orderType: 'delivery',
        status: { [Op.in]: ['ready', 'delivering'] }
      },
      include: [
        { model: User, as: 'assignedDriver', attributes: ['name'] }
      ]
    });

    // إحصائيات المندوبين
    const drivers = await User.findAll({
      where: {
        restaurantId,
        role: 'delivery_driver',
        isActive: true
      },
      attributes: ['id', 'name', 'lastLocationLat', 'lastLocationLng', 'lastLocationUpdate']
    });

    // حساب أوقات التسليم المتوسطة - نسخة آمنة
    const deliveredOrders = await Order.findAll({
      where: {
        restaurantId,
        orderType: 'delivery',
        status: 'delivered'
      },
      attributes: ['createdAt', 'actualDeliveryTime']
    });

    // فلترة النتائج في JavaScript بدلاً من SQL
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
        totalDelivered: validDeliveredOrders.length
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



// إضافة هذه الدوال في deliveryController.ts

// تأكيد وصول المندوب للمطعم
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




export const getDeliveryOrders = async (
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
          model: Restaurant, 
          as: 'restaurant',
          attributes: ['id', 'name', 'address', 'phone', 'latitude', 'longitude'],
          required: false
        },
        { 
          model: OrderItem,  // ✅ أضف هذا لجلب عناصر الطلب
          as: 'orderItems',
          include: [
            { 
              model: MenuItem,  // ✅ أضف هذا لجلب تفاصيل المنتج
              as: 'menuItem',
              attributes: ['id', 'name', 'nameEn', 'description', 'image', 'price']
            }
          ],
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
          attributes: ['name', 'address', 'phone', 'latitude', 'longitude']
        },
        { 
          model: OrderItem,  // ✅ أضف هذا لجلب عناصر الطلب
          as: 'orderItems',
          include: [
            { 
              model: MenuItem,  // ✅ أضف هذا لجلب تفاصيل المنتج
              as: 'menuItem',
              attributes: ['id', 'name', 'nameEn', 'description', 'image', 'price']
            }
          ],
          required: false
        }
      ],
      order: [['estimatedDeliveryTime', 'ASC']]
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching driver orders:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الطلبات' 
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
          model: User,
          as: 'assignedDriver',
          attributes: ['id', 'name', 'phone', 'lastLocationLat', 'lastLocationLng']
        },
        { 
          model: OrderItem,  // ✅ أضف هذا لجلب عناصر الطلب
          as: 'orderItems',
          include: [
            { 
              model: MenuItem,  // ✅ أضف هذا لجلب تفاصيل المنتج
              as: 'menuItem',
              attributes: ['id', 'name', 'nameEn', 'description', 'image', 'price']
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
