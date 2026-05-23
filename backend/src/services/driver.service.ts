// backend/src/services/driver.service.ts
import prisma from './prisma';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

export class DriverService {
  /**
   * جلب جميع السائقين مع تصفية حسب النشاط التجاري
   */
  static async findAll(filters?: {
    restaurantId?: string;
    storeId?: string;
    isActive?: boolean;
    isOnline?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { restaurantId, storeId, isActive, isOnline, search, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: 'delivery_driver',
    };

    if (restaurantId) where.restaurantId = restaurantId;
    if (storeId) where.storeId = storeId;
    if (isActive !== undefined) where.isActive = isActive;
    if (isOnline !== undefined) where.isOnline = isOnline;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const [drivers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          isOnline: true,
          role: true,
          lastLogin: true,
          lastLocationLat: true,
          lastLocationLng: true,
          lastLocationUpdate: true,
          restaurantId: true,
          storeId: true,
          createdAt: true,
          driverRating: true,
          driverRatingCount: true,
          fcmToken: true,
        }
      }),
      prisma.user.count({ where })
    ]);

    // جلب معلومات النشاط التجاري المرتبط
    const driversWithBusiness = await Promise.all(drivers.map(async (driver) => {
      let business = null;
      if (driver.restaurantId) {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: driver.restaurantId },
          select: { id: true, name: true, slug: true, logo: true }
        });
        if (restaurant) business = { ...restaurant, type: 'restaurant' };
      } else if (driver.storeId) {
        const store = await prisma.store.findUnique({
          where: { id: driver.storeId },
          select: { id: true, name: true, slug: true, logo: true }
        });
        if (store) business = { ...store, type: 'store' };
      }

      return {
        ...driver,
        business,
        lastLocation: driver.lastLocationLat && driver.lastLocationLng ? {
          lat: driver.lastLocationLat,
          lng: driver.lastLocationLng,
          updatedAt: driver.lastLocationUpdate
        } : null
      };
    }));

    return {
      data: driversWithBusiness,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  /**
   * جلب سائق بواسطة ID
   */
  static async findById(id: string) {
    // ✅ جلب السائق بدون include أولاً
    const driver = await prisma.user.findFirst({
      where: { id, role: 'delivery_driver' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        isOnline: true,
        role: true,
        lastLogin: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationUpdate: true,
        restaurantId: true,
        storeId: true,
        createdAt: true,
        driverRating: true,
        driverRatingCount: true,
        fcmToken: true,
      }
    });

    if (!driver) return null;

    // ✅ جلب بيانات المطعم/المتجر بشكل منفصل
    let restaurant = null;
    let store = null;
    
    if (driver.restaurantId) {
      restaurant = await prisma.restaurant.findUnique({
        where: { id: driver.restaurantId },
        select: { id: true, name: true, slug: true, logo: true, phone: true, address: true }
      });
    } else if (driver.storeId) {
      store = await prisma.store.findUnique({
        where: { id: driver.storeId },
        select: { id: true, name: true, slug: true, logo: true, phone: true, address: true }
      });
    }

    // جلب إحصائيات الطلبات
    const ordersStats = await prisma.order.aggregate({
      where: { assignedDriverId: id },
      _count: true,
      _sum: { deliveryFee: true },
      _avg: { driverRating: true }
    });

    // جلب آخر الطلبات
    const recentOrders = await prisma.order.findMany({
      where: { assignedDriverId: id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        deliveryFee: true,
        createdAt: true,
        driverRating: true,
        restaurantId: true,
        storeId: true,
      }
    });

    // جلب أسماء المطاعم/المتاجر للطلبات
    const recentOrdersWithNames = await Promise.all(recentOrders.map(async (order) => {
      let restaurantName = null;
      let storeName = null;
      
      if (order.restaurantId) {
        const rest = await prisma.restaurant.findUnique({
          where: { id: order.restaurantId },
          select: { name: true }
        });
        restaurantName = rest?.name;
      } else if (order.storeId) {
        const st = await prisma.store.findUnique({
          where: { id: order.storeId },
          select: { name: true }
        });
        storeName = st?.name;
      }
      
      return {
        ...order,
        restaurantName,
        storeName
      };
    }));

    return {
      ...driver,
      restaurant,
      store,
      stats: {
        totalDeliveries: ordersStats._count,
        totalEarnings: ordersStats._sum.deliveryFee || 0,
        averageRating: ordersStats._avg.driverRating || 0,
      },
      recentOrders: recentOrdersWithNames
    };
  }

  /**
   * إنشاء سائق جديد
   */
  // backend/src/services/driver.service.ts
// قم بتحديث دالة create إلى:

/**
 * إنشاء سائق جديد
 */
static async create(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  restaurantId?: string;
  storeId?: string;
}) {
  // التحقق من وجود البريد الإلكتروني
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existingUser) {
    throw new Error('البريد الإلكتروني مستخدم بالفعل');
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone,
      role: 'delivery_driver',
      restaurantId: data.restaurantId,
      storeId: data.storeId,
      isActive: true,
      isOnline: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      restaurantId: true,
      storeId: true,
      isActive: true,
      isOnline: true,
      createdAt: true,
    }
  });
}

  /**
   * تحديث حالة السائق
   */
  static async updateStatus(id: string, isActive: boolean) {
    return prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, name: true, isActive: true }
    });
  }

  /**
   * تحديث حالة الاتصال (Online/Offline)
   */
  static async updateOnlineStatus(id: string, isOnline: boolean) {
    return prisma.user.update({
      where: { id },
      data: { isOnline },
      select: { id: true, name: true, isOnline: true }
    });
  }

  /**
   * تحديث موقع السائق
   */
  static async updateLocation(id: string, lat: number, lng: number) {
    const updatedDriver = await prisma.user.update({
      where: { id },
      data: {
        lastLocationLat: lat,
        lastLocationLng: lng,
        lastLocationUpdate: new Date(),
        isOnline: true
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

    return { driver: updatedDriver };
  }

  /**
   * قبول طلب توصيل
   */
  static async acceptDelivery(driverId: string, orderId: string) {
    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: 'delivery_driver', isActive: true, isOnline: true }
    });
    
    if (!driver) {
      throw new Error('السائق غير متاح حالياً');
    }

    const order = await prisma.order.findFirst({
      where: { 
        id: orderId, 
        status: 'ready',
        assignedDriverId: null
      }
    });

    if (!order) {
      throw new Error('الطلب غير متاح للتوصيل');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        assignedDriverId: driverId,
        status: 'delivering',
        driverAcceptedAt: new Date()
      }
    });

    return updatedOrder;
  }

  /**
   * تحديث حالة التوصيل
   */
  static async updateDeliveryStatus(
    driverId: string,
    orderId: string,
    status: 'picked_up' | 'delivered' | 'cancelled',
    data?: {
      proofImage?: string;
      proofSignature?: string;
      cancellationReason?: string;
      driverRating?: number;
      driverRatingComment?: string;
    }
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, assignedDriverId: driverId }
    });

    if (!order) {
      throw new Error('الطلب غير موجود أو غير مرتبط بك');
    }

    let orderStatus: any = 'delivering';
    const updateData: any = {};

    if (status === 'picked_up') {
      updateData.driverReachedAt = new Date();
    } else if (status === 'delivered') {
      orderStatus = 'delivered';
      updateData.actualDeliveryTime = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
      updateData.deliveryProofImage = data?.proofImage;
      updateData.deliveryProofSignature = data?.proofSignature;
      updateData.proofTakenAt = new Date();
      if (data?.driverRating) {
        updateData.driverRating = data.driverRating;
        updateData.driverRatingComment = data.driverRatingComment;
        updateData.driverRatedAt = new Date();
      }
    } else if (status === 'cancelled') {
      orderStatus = 'pending';
    }

    updateData.status = orderStatus;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

    if (data?.driverRating && status === 'delivered') {
      const driver = await prisma.user.findUnique({
        where: { id: driverId }
      });
      if (driver) {
        const currentTotal = (driver.driverRating || 0) * (driver.driverRatingCount || 0);
        const newCount = (driver.driverRatingCount || 0) + 1;
        const newAverage = (currentTotal + data.driverRating) / newCount;
        
        await prisma.user.update({
          where: { id: driverId },
          data: {
            driverRating: Math.round(newAverage * 10) / 10,
            driverRatingCount: newCount
          }
        });
      }
    }

    return updatedOrder;
  }

  /**
   * جلب المنشآت التي لا تملك سائقين
   */
  static async getBusinessesWithoutDrivers() {
    const restaurantsWithDrivers = await prisma.user.findMany({
      where: { role: 'delivery_driver', restaurantId: { not: null } },
      select: { restaurantId: true },
      distinct: ['restaurantId']
    });

    const restaurantIdsWithDrivers = new Set(
      restaurantsWithDrivers.map(r => r.restaurantId)
    );

    const restaurantsWithoutDrivers = await prisma.restaurant.findMany({
      where: { id: { notIn: Array.from(restaurantIdsWithDrivers) } },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
      }
    });

    const storesWithDrivers = await prisma.user.findMany({
      where: { role: 'delivery_driver', storeId: { not: null } },
      select: { storeId: true },
      distinct: ['storeId']
    });

    const storeIdsWithDrivers = new Set(
      storesWithDrivers.map(s => s.storeId)
    );

    const storesWithoutDrivers = await prisma.store.findMany({
      where: { id: { notIn: Array.from(storeIdsWithDrivers) } },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
      }
    });

    return {
      restaurants: restaurantsWithoutDrivers,
      stores: storesWithoutDrivers
    };
  }

  /**
   * إحصائيات السائقين
   */
  static async getStats() {
    const [
      totalDrivers,
      activeDrivers,
      onlineDrivers,
      driversWithLocation,
      totalDeliveries,
      totalEarnings,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'delivery_driver' } }),
      prisma.user.count({ where: { role: 'delivery_driver', isActive: true } }),
      prisma.user.count({ where: { role: 'delivery_driver', isOnline: true } }),
      prisma.user.count({ where: { role: 'delivery_driver', lastLocationLat: { not: null } } }),
      prisma.order.count({ where: { assignedDriverId: { not: null } } }),
      prisma.order.aggregate({ where: { assignedDriverId: { not: null } }, _sum: { deliveryFee: true } })
    ]);

    const topDrivers = await prisma.user.findMany({
      where: { role: 'delivery_driver', driverRating: { not: null, gt: 0 } },
      orderBy: { driverRating: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        driverRating: true,
        driverRatingCount: true,
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await prisma.order.count({
      where: { assignedDriverId: { not: null }, createdAt: { gte: today } }
    });

    return {
      overview: {
        total: totalDrivers,
        active: activeDrivers,
        inactive: totalDrivers - activeDrivers,
        online: onlineDrivers,
        offline: totalDrivers - onlineDrivers,
        withLocation: driversWithLocation,
      },
      performance: {
        totalDeliveries,
        totalEarnings: totalEarnings._sum.deliveryFee || 0,
        averageEarningsPerDriver: totalDrivers > 0 ? (totalEarnings._sum.deliveryFee || 0) / totalDrivers : 0,
        todayDeliveries: todayStats,
      },
      topDrivers
    };
  }

  /**
   * حذف سائق
   */
  static async delete(id: string) {
    const deliveriesCount = await prisma.order.count({
      where: { assignedDriverId: id }
    });

    if (deliveriesCount > 0) {
      throw new Error(`لا يمكن حذف السائق لأنه مرتبط بـ ${deliveriesCount} طلب/طلبات`);
    }

    return prisma.user.delete({ where: { id } });
  }
}

export default DriverService;