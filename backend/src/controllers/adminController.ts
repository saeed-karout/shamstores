// backend/src/controllers/adminController.ts

import { NextFunction, Response } from 'express';
import { ContactMessageStatus, Prisma } from '@prisma/client';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { notifyUser } from '../services/notification.service';
import { DriverService } from '../services/driver.service';
import bcrypt from 'bcrypt';
import { buildBranchSummary, getLinkedBranches } from '../services/businessBranch.service';

// ==================== دوال مساعدة ====================


// إعدادات عرض جميع المنتجات
let globalProductsEnabled = false;

export const getGlobalProductsSetting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: { enabled: globalProductsEnabled } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

export const toggleGlobalProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { enabled } = req.body;
    globalProductsEnabled = enabled;
    res.json({ success: true, message: 'تم تحديث الإعداد', data: { enabled: globalProductsEnabled } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ' });
  }
};

export const getAllProductsFromAllBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurants = await prisma.restaurant.findMany({ select: { id: true, name: true } });
    const stores = await prisma.store.findMany({ select: { id: true, name: true } });
    
    const allProducts: any[] = [];
    
    for (const restaurant of restaurants) {
      const products = await prisma.menuItem.findMany({
        where: { restaurantId: restaurant.id, isAvailable: true },
        select: { id: true, name: true, price: true, image: true }
      });
      allProducts.push(...products.map(p => ({ ...p, branchName: restaurant.name, branchType: 'restaurant' })));
    }
    
    for (const store of stores) {
      const products = await prisma.product.findMany({
        where: { storeId: store.id, isAvailable: true },
        select: { id: true, name: true, price: true, imageUrl: true }
      });
      allProducts.push(...products.map(p => ({ ...p, branchName: store.name, branchType: 'store', image: p.imageUrl })));
    }
    
    res.json({ success: true, data: allProducts });
  } catch (error) {
    console.error('Error fetching all products:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتجات' });
  }
};



const generateUniqueStoreSubdomain = async (baseSubdomain: string, excludeId?: string): Promise<string> => {
  let subdomain = baseSubdomain
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  let counter = 1;
  let uniqueSubdomain = subdomain;
  
  while (true) {
    const where: any = { subdomain: uniqueSubdomain };
    if (excludeId) where.id = { not: excludeId };
    
    const existing = await prisma.store.findFirst({ where });
    if (!existing) break;
    
    uniqueSubdomain = `${subdomain}-${counter++}`;
  }
  
  return uniqueSubdomain;
};

// ==================== إحصائيات عامة ====================

// backend/src/controllers/adminController.ts
// قم بتحديث دالة getPlatformStats إلى:

export const getPlatformStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      restaurantsCount,
      storesCount,
      usersCount,
      driversCount,
      ordersCount,
      totalRevenue,
      pendingOrders,
      deliveringOrders,
      completedOrders
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.store.count(),
      prisma.user.count({ where: { role: { not: 'super_admin' } } }),
      prisma.user.count({ where: { role: 'delivery_driver' } }),
      // ✅ استخدام الاسم الصحيح للجدول (قد يكون Order أو orders)
      (prisma.order as any)?.count?.() || 0,
      (prisma.order as any)?.aggregate?.({ where: {}, _sum: { total: true } }) || { _sum: { total: 0 } },
      (prisma.order as any)?.count?.({ where: { status: 'pending' } }) || 0,
      (prisma.order as any)?.count?.({ where: { status: 'delivering' } }) || 0,
      (prisma.order as any)?.count?.({ where: { status: 'delivered' } }) || 0
    ]);

    // ✅ تجنب استخدام $queryRaw إذا كان الجدول غير موجود
    let weeklyOrders: any[] = [];
    try {
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      
      // استخدام Prisma مباشرة بدلاً من $queryRaw
      const orders = await (prisma.order as any)?.findMany?.({
        where: { createdAt: { gte: last7Days } },
        select: { createdAt: true }
      }) || [];
      
      // تجميع الطلبات حسب اليوم
      const ordersByDate: Record<string, number> = {};
      orders.forEach((order: any) => {
        const date = order.createdAt.toISOString().split('T')[0];
        ordersByDate[date] = (ordersByDate[date] || 0) + 1;
      });
      
      weeklyOrders = Object.entries(ordersByDate).map(([date, count]) => ({
        date,
        count
      }));
    } catch (error) {
      console.log('Orders table not ready yet, skipping weekly stats');
      weeklyOrders = [];
    }

    res.json({
      success: true,
      data: {
        overview: {
          restaurants: restaurantsCount,
          stores: storesCount,
          users: usersCount,
          drivers: driversCount,
          orders: ordersCount,
          revenue: (totalRevenue._sum.total as number) || 0
        },
        orders: {
          total: ordersCount,
          pending: pendingOrders,
          delivering: deliveringOrders,
          completed: completedOrders
        },
        weeklyOrders,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting platform stats:', error);
    // ✅ إرجاع إحصائيات جزئية بدلاً من الخطأ
    res.json({
      success: true,
      data: {
        overview: {
          restaurants: await prisma.restaurant.count(),
          stores: await prisma.store.count(),
          users: await prisma.user.count({ where: { role: { not: 'super_admin' } } }),
          drivers: await prisma.user.count({ where: { role: 'delivery_driver' } }),
          orders: 0,
          revenue: 0
        },
        orders: {
          total: 0,
          pending: 0,
          delivering: 0,
          completed: 0
        },
        weeklyOrders: [],
        lastUpdated: new Date()
      }
    });
  }
};

// ==================== رسائل التواصل ====================

export const getContactMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { status } = req.query;
    const where: Prisma.ContactMessageWhereInput =
      status && typeof status === 'string' && status !== 'all'
        ? { status: status as ContactMessageStatus }
        : {};

    const messages = await prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error getting contact messages:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الرسائل' });
  }
};

export const updateContactMessageStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['new', 'read', 'replied', 'archived'].includes(status)) {
      res.status(400).json({ success: false, error: 'حالة غير صالحة' });
      return;
    }

    const updatedMessage = await prisma.contactMessage.update({
      where: { id },
      data: { status: status as ContactMessageStatus }
    });

    res.json({ success: true, message: 'تم تحديث حالة الرسالة', data: updatedMessage });
  } catch (error) {
    console.error('Error updating contact message:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الرسالة' });
  }
};

// ==================== إدارة صلاحيات موظفي المطاعم ====================

export const getRestaurantStaffPermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, staffId } = req.params;
    
    const staff = await prisma.user.findFirst({
      where: { id: staffId, restaurantId, role: 'staff' },
      select: { permissions: true }
    });
    
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    
    res.json({ success: true, data: staff.permissions || {} });
  } catch (error) {
    console.error('Error getting staff permissions:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب صلاحيات الموظف' });
  }
};

export const updateRestaurantStaffPermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { restaurantId, staffId } = req.params;
    const { permissions } = req.body;
    
    const staff = await prisma.user.findFirst({
      where: { id: staffId, restaurantId, role: 'staff' }
    });
    
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    
    const updated = await prisma.user.update({
      where: { id: staffId },
      data: { permissions },
      select: { id: true, name: true, permissions: true }
    });
    
    res.json({ success: true, message: 'تم تحديث صلاحيات الموظف', data: updated });
  } catch (error) {
    console.error('Error updating staff permissions:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الصلاحيات' });
  }
};

// backend/src/controllers/adminController.ts

// ... دوال أخرى ...

// ==================== إدارة السائقين (للمنصة بالكامل) ====================

// backend/src/controllers/adminController.ts
// أضف هذه الدوال في قسم إدارة السائقين


// ==================== إدارة السائقين (Prisma) ====================

export const getAllDrivers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const canManage = await checkPlatformStaffPermission(req, 'manage_drivers');
    
    if (!isSuperAdmin && !canManage) {
      res.status(403).json({ 
        success: false, 
        error: 'لا تملك صلاحية الوصول. الدور المطلوب: super_admin' 
      });
      return;
    }

    const { search, businessType, businessId, status } = req.query;
    
    let where: any = { role: 'delivery_driver' };
    
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
        { phone: { contains: search as string } }
      ];
    }
    
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'online') {
      where.isOnline = true;
    }
    
    if (businessType === 'restaurant' && businessId) {
      where.restaurantId = businessId as string;
    } else if (businessType === 'store' && businessId) {
      where.storeId = businessId as string;
    }
    
    const drivers = await prisma.user.findMany({
      where,
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
        updatedAt: true,
        driverRating: true,
        driverRatingCount: true,
        fcmToken: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const driversWithBusiness = await Promise.all(drivers.map(async (driver) => {
      let business = null;
      if (driver.restaurantId) {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: driver.restaurantId },
          select: { id: true, name: true, slug: true, logo: true }
        });
        if (restaurant) {
          business = { ...restaurant, type: 'restaurant' };
        }
      } else if (driver.storeId) {
        const store = await prisma.store.findUnique({
          where: { id: driver.storeId },
          select: { id: true, name: true, slug: true, logo: true }
        });
        if (store) {
          business = { ...store, type: 'store' };
        }
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
    
    res.json({
      success: true,
      data: driversWithBusiness,
      total: driversWithBusiness.length
    });
  } catch (error) {
    console.error('Error getting all drivers:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب السائقين' });
  }
};
export const getDriverDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const driver = await DriverService.findById(id);
    
    if (!driver) {
      res.status(404).json({ success: false, error: 'السائق غير موجود' });
      return;
    }
    
    res.json({ success: true, data: driver });
  } catch (error) {
    console.error('Error getting driver details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تفاصيل السائق' });
  }
};

// backend/src/controllers/adminController.ts
// قم بتحديث دالة createDriver إلى:

export const createDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, businessId, businessType } = req.body;

    // التحقق من وجود البريد الإلكتروني مسبقاً
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({ 
        success: false, 
        error: 'البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر.' 
      });
      return;
    }

    let restaurantId: string | undefined;
    let storeId: string | undefined;
    let businessName = '';

    if (businessType === 'restaurant' && businessId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: businessId }
      });
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'المطعم غير موجود' });
        return;
      }
      restaurantId = businessId;
      businessName = restaurant.name;
    } else if (businessType === 'store' && businessId) {
      const store = await prisma.store.findUnique({
        where: { id: businessId }
      });
      if (!store) {
        res.status(404).json({ success: false, error: 'المتجر غير موجود' });
        return;
      }
      storeId = businessId;
      businessName = store.name;
    } else {
      // إذا لم يحدد، جلب أول مطعم أو متجر
      const firstRestaurant = await prisma.restaurant.findFirst();
      const firstStore = await prisma.store.findFirst();
      
      if (firstRestaurant) {
        restaurantId = firstRestaurant.id;
        businessName = firstRestaurant.name;
      } else if (firstStore) {
        storeId = firstStore.id;
        businessName = firstStore.name;
      } else {
        res.status(400).json({ 
          success: false, 
          error: 'لا يوجد مطاعم أو متاجر في المنصة. قم بإنشاء نشاط تجاري أولاً' 
        });
        return;
      }
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إنشاء السائق
    const driver = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: 'delivery_driver',
        restaurantId,
        storeId,
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

    res.status(201).json({
      success: true,
      message: `تم إنشاء السائق بنجاح لـ ${businessName}`,
      data: driver
    });
  } catch (error: any) {
    console.error('Error creating driver:', error);
    
    // معالجة خطأ التكرار في البريد الإلكتروني
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      res.status(400).json({ 
        success: false, 
        error: 'البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر.' 
      });
      return;
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'حدث خطأ في إنشاء السائق' 
    });
  }
};

export const toggleDriverStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const driver = await prisma.user.findFirst({
      where: { id, role: 'delivery_driver' }
    });

    if (!driver) {
      res.status(404).json({ success: false, error: 'السائق غير موجود' });
      return;
    }

    const updated = await DriverService.updateStatus(id, !driver.isActive);

    res.json({
      success: true,
      message: updated.isActive ? 'تم تفعيل السائق' : 'تم تعطيل السائق',
      data: updated
    });
  } catch (error) {
    console.error('Error toggling driver:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تبديل حالة السائق' });
  }
};

export const deleteDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await DriverService.delete(id);
    
    res.json({ success: true, message: 'تم حذف السائق بنجاح' });
  } catch (error: any) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'حدث خطأ في حذف السائق' 
    });
  }
};

export const getDriversStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await DriverService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting drivers stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات السائقين' });
  }
};

export const getBusinessesWithoutDrivers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await DriverService.getBusinessesWithoutDrivers();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting businesses without drivers:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنشآت' });
  }
};

export const assignDriverToBusiness = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // driver id
    const { businessId, businessType } = req.body;

    let updateData: any = {};
    
    if (businessType === 'restaurant') {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: businessId }
      });
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'المطعم غير موجود' });
        return;
      }
      updateData = { restaurantId: businessId, storeId: null };
    } else if (businessType === 'store') {
      const store = await prisma.store.findUnique({
        where: { id: businessId }
      });
      if (!store) {
        res.status(404).json({ success: false, error: 'المتجر غير موجود' });
        return;
      }
      updateData = { storeId: businessId, restaurantId: null };
    } else {
      res.status(400).json({ success: false, error: 'نوع المنشأة غير صالح' });
      return;
    }

    const updatedDriver = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, restaurantId: true, storeId: true }
    });

    res.json({
      success: true,
      message: 'تم تعيين السائق للمنشأة بنجاح',
      data: updatedDriver
    });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تعيين السائق' });
  }
};

// دوال إدارة التوصيل للسائقين
// backend/src/controllers/adminController.ts
// ابحث عن دالة updateDriverLocation وقم بتعديلها إلى:

export const updateDriverLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { lat, lng, accuracy, speed } = req.body;

    if (!lat || !lng) {
      res.status(400).json({ success: false, error: 'الإحداثيات مطلوبة' });
      return;
    }

    // ✅ تمرير المعاملات الصحيحة (3 معاملات فقط)
    const result = await DriverService.updateLocation(id, lat, lng);
    
    res.json({
      success: true,
      message: 'تم تحديث الموقع بنجاح',
      data: result.driver
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الموقع' });
  }
};

export const acceptDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const driverId = req.user?.id;

    if (!driverId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const delivery = await DriverService.acceptDelivery(driverId, orderId);
    
    res.json({
      success: true,
      message: 'تم قبول الطلب بنجاح',
      data: delivery
    });
  } catch (error: any) {
    console.error('Error accepting delivery:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};



// ==================== إدارة السائقين (نهاية) ====================



export const getRevenueStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const [todayRevenue, monthRevenue, totalRevenue] = await Promise.all([
      prisma.order.aggregate({ where: { createdAt: { gte: today } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: thisMonth } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: {}, _sum: { total: true } })
    ]);
    
    res.json({
      success: true,
      data: {
        today: (todayRevenue._sum.total as number) || 0,
        month: (monthRevenue._sum.total as number) || 0,
        total: (totalRevenue._sum.total as number) || 0
      }
    });
  } catch (error) {
    console.error('Error getting revenue stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات الإيرادات' });
  }
};

export const getOrderStatsByPeriod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period } = req.params;
    let startDate: Date;
    
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
        startDate.setDate(startDate.getDate() - 30);
    }
    
    const orders = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total) as revenue
      FROM orders
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات الطلبات' });
  }
};

const checkPlatformStaffPermission = async (
  req: AuthRequest,
  requiredPermission: string
): Promise<boolean> => {
  const user = req.user;
  
  // السوبر أدمن يملك كل الصلاحيات
  if (user?.role === 'super_admin') return true;
  
  // موظف منصة (ليس لديه مطعم أو متجر)
  if (user?.role === 'staff' && !user?.restaurantId && !user?.storeId) {
    const permissions = user?.permissions || {};
    
    switch (requiredPermission) {
      case 'manage_restaurants':
        return permissions.canManageRestaurants === true;
      case 'manage_stores':
        return permissions.canManageStores === true;
      case 'manage_users':
        return permissions.canManageUsers === true;
      case 'manage_drivers':
        return permissions.canManageDrivers === true;
      case 'manage_plans':
        return permissions.canManagePlans === true;
      case 'manage_settings':
        return permissions.canManageSettings === true;
      case 'view_reports':
        return permissions.canViewReports === true;
      default:
        return false;
    }
  }
  
  return false;
};

// Middleware للتحقق من صلاحيات موظف المنصة
const requirePlatformStaffPermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const hasPermission = await checkPlatformStaffPermission(req, permission);
    if (!hasPermission) {
      return res.status(403).json({ 
        success: false, 
        error: 'لا تملك صلاحية الوصول' 
      });
    }
    next();
  };
};

// ==================== تحديث دوال المطاعم ====================

export const getAllRestaurants = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // التحقق من الصلاحيات
    const isSuperAdmin = req.user?.role === 'super_admin';
    const canManage = await checkPlatformStaffPermission(req, 'manage_restaurants');
    
    if (!isSuperAdmin && !canManage) {
      res.status(403).json({ 
        success: false, 
        error: 'لا تملك صلاحية الوصول. الدور المطلوب: super_admin' 
      });
      return;
    }

    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }
    
    const restaurants = await prisma.restaurant.findMany({
      where,
      skip: offset,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });
    
    const total = await prisma.restaurant.count({ where });
    
    const restaurantsWithStats = await Promise.all(restaurants.map(async (restaurant) => {
      const productsCount = await prisma.menuItem.count({ where: { restaurantId: restaurant.id } });
      const ordersCount = await prisma.order.count({ where: { restaurantId: restaurant.id } });
      
      const owner = await prisma.user.findFirst({
        where: { restaurantId: restaurant.id, role: 'owner' },
        select: { id: true, name: true, email: true }
      });
      
      const plan = await prisma.plan.findUnique({
        where: { id: restaurant.planId },
        select: { id: true, name: true, price: true }
      });

      const linkedBranches = await getLinkedBranches('restaurant', restaurant.userId || owner?.id, restaurant.id);
      
      return {
        ...restaurant,
        owner,
        plan,
        productsCount,
        ordersCount,
        linkedBranches,
        ...buildBranchSummary(restaurant)
      };
    }));
    
    res.json({
      success: true,
      data: {
        restaurants: restaurantsWithStats,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting restaurants:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المطاعم' });
  }
};


export const getRestaurantDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const restaurant = await prisma.restaurant.findUnique({
      where: { id }
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    const owner = await prisma.user.findFirst({
      where: { restaurantId: id, role: 'owner' },
      select: { id: true, name: true, email: true, phone: true, isActive: true }
    });
    
    // ✅ تصحيح: استخدم الحقول الموجودة فقط
    const plan = await prisma.plan.findUnique({
      where: { id: restaurant.planId },
      select: { id: true, name: true, price: true }
    });

    const linkedBranches = await getLinkedBranches('restaurant', restaurant.userId || owner?.id, restaurant.id);
    
    const [productsCount, ordersCount, totalSales] = await Promise.all([
      prisma.menuItem.count({ where: { restaurantId: id } }),
      prisma.order.count({ where: { restaurantId: id } }),
      prisma.order.aggregate({ where: { restaurantId: id, status: 'delivered' }, _sum: { total: true } })
    ]);
    
    const recentOrders = await prisma.order.findMany({
      where: { restaurantId: id },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: {
        ...restaurant,
        owner,
        plan,
        linkedBranches,
        ...buildBranchSummary(restaurant),
        stats: {
          productsCount: productsCount || 0,
          ordersCount: ordersCount || 0,
          totalSales: (totalSales._sum.total as number) || 0
        },
        recentOrders
      }
    });
  } catch (error) {
    console.error('Error getting restaurant details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تفاصيل المطعم' });
  }
};

export const toggleRestaurantStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    const updated = await prisma.restaurant.update({
      where: { id },
      data: { isActive: !restaurant.isActive }
    });
    
    res.json({
      success: true,
      message: updated.isActive ? 'تم تفعيل المطعم' : 'تم تعطيل المطعم',
      data: { isActive: updated.isActive }
    });
  } catch (error) {
    console.error('Error toggling restaurant:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة المطعم' });
  }
};

export const deleteRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    await prisma.user.deleteMany({ where: { restaurantId: id } });
    await prisma.restaurant.delete({ where: { id } });
    
    res.json({ success: true, message: 'تم حذف المطعم بنجاح' });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المطعم' });
  }
};

export const updateRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phone, whatsapp, address, description, isActive, planId, primaryColor, secondaryColor } = req.body;
    
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (planId !== undefined) updateData.planId = planId;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    
    const updated = await prisma.restaurant.update({
      where: { id },
      data: updateData
    });
    
    const plan = await prisma.plan.findUnique({
      where: { id: updated.planId },
      select: { id: true, name: true, price: true }
    });
    
    res.json({ success: true, message: 'تم تحديث المطعم بنجاح', data: { ...updated, plan } });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المطعم' });
  }
};

export const resetRestaurantPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      return;
    }
    
    const owner = await prisma.user.findFirst({ where: { restaurantId: id, role: 'owner' } });
    if (!owner) {
      res.status(404).json({ success: false, error: 'مالك المطعم غير موجود' });
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await prisma.user.update({ where: { id: owner.id }, data: { password: hashedPassword } });
    
    res.json({ success: true, message: 'تم إعادة تعيين كلمة مرور المطعم بنجاح' });
  } catch (error) {
    console.error('Error resetting restaurant password:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إعادة تعيين كلمة المرور' });
  }
};

// ==================== إدارة المتاجر ====================

export const getAllStores = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const canManage = await checkPlatformStaffPermission(req, 'manage_stores');
    
    if (!isSuperAdmin && !canManage) {
      res.status(403).json({ 
        success: false, 
        error: 'لا تملك صلاحية الوصول. الدور المطلوب: super_admin' 
      });
      return;
    }

    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }
    
    const stores = await prisma.store.findMany({
      where,
      skip: offset,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });
    
    const total = await prisma.store.count({ where });
    
    const storesWithStats = await Promise.all(stores.map(async (store) => {
      const productsCount = await prisma.product.count({ where: { storeId: store.id } });
      const ordersCount = await prisma.order.count({ where: { storeId: store.id } });
      
      const owner = await prisma.user.findFirst({
        where: { storeId: store.id, role: 'owner' },
        select: { id: true, name: true, email: true }
      });
      
      const plan = await prisma.plan.findUnique({
        where: { id: store.planId },
        select: { id: true, name: true, price: true }
      });

      const linkedBranches = await getLinkedBranches('store', store.userId || owner?.id, store.id);
      
      return {
        ...store,
        owner,
        plan,
        productsCount,
        ordersCount,
        linkedBranches,
        ...buildBranchSummary(store)
      };
    }));
    
    res.json({
      success: true,
      data: {
        stores: storesWithStats,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting stores:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المتاجر' });
  }
};

export const getStoreDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const store = await prisma.store.findUnique({
      where: { id }
    });
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const owner = await prisma.user.findFirst({
      where: { storeId: id, role: 'owner' },
      select: { id: true, name: true, email: true, phone: true, isActive: true }
    });
    
    // ✅ تصحيح: استخدم الحقول الموجودة فقط
    const plan = await prisma.plan.findUnique({
      where: { id: store.planId },
      select: { id: true, name: true, price: true }
    });

    const linkedBranches = await getLinkedBranches('store', store.userId || owner?.id, store.id);
    
    const [productsCount, ordersCount, totalSales] = await Promise.all([
      prisma.product.count({ where: { storeId: id } }),
      prisma.order.count({ where: { storeId: id } }),
      prisma.order.aggregate({ where: { storeId: id, status: 'delivered' }, _sum: { total: true } })
    ]);
    
    res.json({
      success: true,
      data: {
        ...store,
        owner,
        plan,
        linkedBranches,
        ...buildBranchSummary(store),
        stats: {
          productsCount: productsCount || 0,
          ordersCount: ordersCount || 0,
          totalSales: (totalSales._sum.total as number) || 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting store details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تفاصيل المتجر' });
  }
};

export const toggleStoreStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({ where: { id } });
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const updated = await prisma.store.update({
      where: { id },
      data: { isActive: !store.isActive }
    });
    
    res.json({
      success: true,
      message: updated.isActive ? 'تم تفعيل المتجر' : 'تم تعطيل المتجر',
      data: { isActive: updated.isActive }
    });
  } catch (error) {
    console.error('Error toggling store:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة المتجر' });
  }
};

export const deleteStore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({ where: { id } });
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    await prisma.user.deleteMany({ where: { storeId: id } });
    await prisma.store.delete({ where: { id } });
    
    res.json({ success: true, message: 'تم حذف المتجر بنجاح' });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المتجر' });
  }
};

export const updateStore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, description, isActive, planId, primaryColor, secondaryColor, subdomain } = req.body;
    
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (planId !== undefined) updateData.planId = planId;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (subdomain !== undefined) updateData.subdomain = subdomain;
    
    const updated = await prisma.store.update({
      where: { id },
      data: updateData
    });
    
    const plan = await prisma.plan.findUnique({
      where: { id: updated.planId },
      select: { id: true, name: true, price: true }
    });
    
    res.json({ success: true, message: 'تم تحديث المتجر بنجاح', data: { ...updated, plan } });
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المتجر' });
  }
};

export const resetStorePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      return;
    }
    
    const owner = await prisma.user.findFirst({ where: { storeId: id, role: 'owner' } });
    if (!owner) {
      res.status(404).json({ success: false, error: 'مالك المتجر غير موجود' });
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await prisma.user.update({ where: { id: owner.id }, data: { password: hashedPassword } });
    
    res.json({ success: true, message: 'تم إعادة تعيين كلمة مرور المتجر بنجاح' });
  } catch (error) {
    console.error('Error resetting store password:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إعادة تعيين كلمة المرور' });
  }
};

// ==================== إدارة المستخدمين ====================

export const getAllUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin';
    const canManage = await checkPlatformStaffPermission(req, 'manage_users');
    
    if (!isSuperAdmin && !canManage) {
      res.status(403).json({ 
        success: false, 
        error: 'لا تملك صلاحية الوصول. الدور المطلوب: super_admin' 
      });
      return;
    }

    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }
    
    if (!role || role !== 'super_admin') {
      where.role = { not: 'super_admin' };
    }
    
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isOnline: true,
        createdAt: true,
        updatedAt: true,
        restaurantId: true,
        storeId: true
      },
      skip: offset,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });
    
    const total = await prisma.user.count({ where });
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المستخدمين' });
  }
};


export const getUserDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isOnline: true,
        createdAt: true,
        updatedAt: true,
        restaurantId: true,
        storeId: true
      }
    });
    
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تفاصيل المستخدم' });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    const allowedRoles = ['user', 'owner', 'staff', 'delivery_driver'];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ success: false, error: 'دور غير صالح' });
      return;
    }
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }
    
    if (user.role === 'super_admin') {
      res.status(403).json({ success: false, error: 'لا يمكن تغيير دور السوبر أدمن' });
      return;
    }
    
    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, role: true }
    });
    
    res.json({ success: true, message: 'تم تحديث دور المستخدم بنجاح', data: updated });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث دور المستخدم' });
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }
    
    if (user.role === 'super_admin') {
      res.status(403).json({ success: false, error: 'لا يمكن تعطيل السوبر أدمن' });
      return;
    }
    
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true }
    });
    
    res.json({
      success: true,
      message: updated.isActive ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم',
      data: updated
    });
  } catch (error) {
    console.error('Error toggling user:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة المستخدم' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }
    
    if (user.role === 'super_admin') {
      res.status(403).json({ success: false, error: 'لا يمكن حذف السوبر أدمن' });
      return;
    }
    
    await prisma.user.delete({ where: { id } });
    
    res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المستخدم' });
  }
};

export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      return;
    }
    
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return;
    }
    
    if (user.role === 'super_admin') {
      res.status(403).json({ success: false, error: 'لا يمكن تغيير كلمة مرور المدير الأساسي' });
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
    
    res.json({ success: true, message: 'تم إعادة تعيين كلمة المرور بنجاح' });
  } catch (error) {
    console.error('Error resetting user password:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إعادة تعيين كلمة المرور' });
  }
};

// ==================== إدارة الطلبات ====================

export const getAllOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } }
      ];
    }
    
    // إذا كان المستخدم مالك مطعم أو متجر
    if (req.user?.role === 'owner') {
      if (req.user?.restaurantId) {
        where.restaurantId = req.user.restaurantId;
      } else if (req.user?.storeId) {
        where.storeId = req.user.storeId;
      }
    }
    
    const orders = await prisma.order.findMany({
      where,
      skip: offset,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });
    
    const total = await prisma.order.count({ where });
    
    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلبات' });
  }
};

export const getOrderDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id }
    });
    
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error getting order details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تفاصيل الطلب' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    
    const updated = await prisma.order.update({
      where: { id },
      data: { status }
    });
    
    res.json({ success: true, message: 'تم تحديث حالة الطلب بنجاح', data: updated });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الطلب' });
  }
};





// ==================== إدارة الخطط ====================

export const getAllPlans = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' }
    });
    
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Error getting plans:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الخطط' });
  }
};

export const createPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const plan = await prisma.plan.create({
      data: req.body
    });
    
    res.status(201).json({ success: true, message: 'تم إنشاء الخطة بنجاح', data: plan });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الخطة' });
  }
};

export const updatePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await prisma.plan.findUnique({ where: { id } });
    
    if (!plan) {
      res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
      return;
    }
    
    const updated = await prisma.plan.update({
      where: { id },
      data: req.body
    });
    
    res.json({ success: true, message: 'تم تحديث الخطة بنجاح', data: updated });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الخطة' });
  }
};

export const deletePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await prisma.plan.findUnique({ where: { id } });
    
    if (!plan) {
      res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
      return;
    }
    
    const restaurantsCount = await prisma.restaurant.count({ where: { planId: id } });
    const storesCount = await prisma.store.count({ where: { planId: id } });
    
    if (restaurantsCount > 0 || storesCount > 0) {
      res.status(400).json({ success: false, error: 'لا يمكن حذف خطة مستخدمة' });
      return;
    }
    
    await prisma.plan.delete({ where: { id } });
    
    res.json({ success: true, message: 'تم حذف الخطة بنجاح' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الخطة' });
  }
};

// ==================== إعدادات المنصة ====================

export const getPlatformSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await prisma.platformSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }]
    });
    
    const groupedSettings = settings.reduce((acc, setting) => {
      const group = setting.group;
      if (!acc[group]) acc[group] = [];
      acc[group].push(setting);
      return acc;
    }, {} as Record<string, any[]>);
    
    res.json({ success: true, data: groupedSettings });
  } catch (error) {
    console.error('Error getting platform settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات المنصة' });
  }
};

export const updatePlatformSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { settings } = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await prisma.platformSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          type: 'string',
          group: 'general',
          isPublic: true
        }
      });
    }
    
    res.json({ success: true, message: 'تم تحديث إعدادات المنصة بنجاح' });
  } catch (error) {
    console.error('Error updating platform settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعدادات' });
  }
};

// ==================== طلبات الترقية ====================

export const getUpgradeRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requests = await prisma.upgradeRequest.findMany({
      orderBy: { requestedAt: 'desc' }
    });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching upgrade requests:', error);
    res.json({ success: true, data: [] });
  }
};

export const getUserUpgradeRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const requests = await prisma.upgradeRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' }
    });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching user upgrade requests:', error);
    res.json({ success: true, data: [] });
  }
};

export const createUpgradeRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planId, entityType, entityId, notes } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const requestedPlan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!requestedPlan) {
      res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
      return;
    }
    
    const existingRequest = await prisma.upgradeRequest.findFirst({
      where: { userId, status: 'pending' }
    });
    
    if (existingRequest) {
      res.status(400).json({ success: false, error: 'لديك طلب ترقية معلق بالفعل' });
      return;
    }
    
    let currentPlanId: string;
    let restaurantId: string | undefined = undefined;
    let storeId: string | undefined = undefined;
    
    if (entityType === 'restaurant') {
      const restaurant = await prisma.restaurant.findUnique({ where: { id: entityId } });
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'المطعم غير موجود' });
        return;
      }
      currentPlanId = restaurant.planId;
      restaurantId = entityId;
    } else if (entityType === 'store') {
      const store = await prisma.store.findUnique({ where: { id: entityId } });
      if (!store) {
        res.status(404).json({ success: false, error: 'المتجر غير موجود' });
        return;
      }
      currentPlanId = store.planId;
      storeId = entityId;
    } else {
      res.status(400).json({ success: false, error: 'نوع الكيان غير صالح' });
      return;
    }
    
    const upgradeRequest = await prisma.upgradeRequest.create({
      data: {
        userId,
        restaurantId: restaurantId || null,
        storeId: storeId || null,
        currentPlanId,
        requestedPlanId: planId,
        reason: notes || null,
        status: 'pending',
        requestedAt: new Date()
      }
    });
    
    res.json({ success: true, message: 'تم إرسال طلب الترقية بنجاح', data: upgradeRequest });
  } catch (error) {
    console.error('Error creating upgrade request:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال الطلب' });
  }
};

/**
 * يبلّغ صاحب الطلب بقرار المشرف عبر غرفة المستخدم الخاصة به.
 *
 * فشل البثّ لا يُسقط الطلب: القرار حُفظ في قاعدة البيانات، والإشعار راحة
 * إضافية. رمي خطأ هنا يعني ترقية نجحت وردّاً بالفشل.
 */
const notifyRequester = async (
  userId: string | null | undefined,
  params: { event: string; title: string; message: string; requestId: string }
): Promise<void> => {
  // notifyUser يحفظ ثم يبثّ، ويبتلع أخطاءه: القرار حُفظ في قاعدة البيانات
  // وفشل الإشعار لا يجوز أن يُرجع فشلاً لترقية نجحت.
  await notifyUser(userId, {
    type: 'upgrade_request',
    event: params.event,
    title: params.title,
    message: params.message,
    link: '/plans',
    entityId: params.requestId
  });
};

export const approveUpgrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const adminId = req.user?.id;
    
    const upgradeRequest = await prisma.upgradeRequest.findUnique({ where: { id: requestId } });
    
    if (!upgradeRequest) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    
    if (upgradeRequest.status !== 'pending') {
      res.status(400).json({ success: false, error: 'تم معالجة هذا الطلب مسبقاً' });
      return;
    }
    
    if (upgradeRequest.restaurantId) {
      await prisma.restaurant.update({
        where: { id: upgradeRequest.restaurantId },
        data: { planId: upgradeRequest.requestedPlanId }
      });
    } else if (upgradeRequest.storeId) {
      await prisma.store.update({
        where: { id: upgradeRequest.storeId },
        data: { planId: upgradeRequest.requestedPlanId }
      });
    }
    
    const updatedRequest = await prisma.upgradeRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: adminId
      }
    });
    
    // إشعار فوري لصاحب الطلب — القرار يخصّه وانتظاره بلا خبر أسوأ من الرفض
    await notifyRequester(updatedRequest.userId, {
      event: 'upgrade_request.approved',
      title: 'تمت الموافقة على ترقيتك',
      message: 'خطتك الجديدة فعّالة الآن. تصفّح ما فُتح لك من ميزات.',
      requestId: updatedRequest.id
    });

    res.json({ success: true, message: 'تمت الموافقة على الترقية بنجاح', data: updatedRequest });
  } catch (error) {
    console.error('Error approving upgrade:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في الموافقة على الطلب' });
  }
};

export const rejectUpgrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;
    
    const upgradeRequest = await prisma.upgradeRequest.findUnique({ where: { id: requestId } });
    
    if (!upgradeRequest) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    
    if (upgradeRequest.status !== 'pending') {
      res.status(400).json({ success: false, error: 'تم معالجة هذا الطلب مسبقاً' });
      return;
    }
    
    const updatedRequest = await prisma.upgradeRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        reason: reason || null
      }
    });
    
    await notifyRequester(updatedRequest.userId, {
      event: 'upgrade_request.rejected',
      title: 'لم تتم الموافقة على طلب الترقية',
      // سبب المشرف يُعرض كما هو: «مرفوض» بلا سبب يترك التاجر بلا خطوة تالية
      message: reason ? `السبب: ${reason}` : 'تواصل معنا لمعرفة التفاصيل.',
      requestId: updatedRequest.id
    });

    res.json({ success: true, message: 'تم رفض طلب الترقية', data: updatedRequest });
  } catch (error) {
    console.error('Error rejecting upgrade:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في رفض الطلب' });
  }
};

// ==================== أدوات مساعدة ====================

export const checkSlugAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug, type, id } = req.query;
    
    if (!slug || typeof slug !== 'string') {
      res.status(400).json({ success: false, error: 'الرابط مطلوب' });
      return;
    }
    
    let exists = false;
    
    if (type === 'restaurant') {
      const restaurant = await prisma.restaurant.findFirst({ where: { slug } });
      exists = !!restaurant;
    } else if (type === 'store') {
      const store = await prisma.store.findFirst({ where: { slug } });
      exists = !!store;
    } else {
      const restaurantExists = await prisma.restaurant.findFirst({ where: { slug } });
      const storeExists = await prisma.store.findFirst({ where: { slug } });
      exists = !!(restaurantExists || storeExists);
    }
    
    res.json({ success: true, available: !exists, slug });
  } catch (error) {
    console.error('Error checking slug:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في التحقق من الرابط' });
  }
};

// ==================== إدارة موظفي المتجر ====================

export const getStoreStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;
    const staff = await prisma.user.findMany({
      where: { storeId, role: 'staff' },
      select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true }
    });
    
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error getting store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الموظفين' });
  }
};

export const getStoreStaffDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { storeId, staffId } = req.params;
    const staff = await prisma.user.findFirst({
      where: { id: staffId, storeId, role: 'staff' },
      select: { id: true, name: true, email: true, phone: true, isActive: true, permissions: true, createdAt: true }
    });
    
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error getting staff details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات الموظف' });
  }
};

export const createStoreStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { name, email, password, phone, permissions } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, error: 'البريد الإلكتروني موجود بالفعل' });
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const staff = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: 'staff',
        storeId,
        isActive: true,
        isEmailVerified: true,
        permissions: permissions || {}
      },
      select: { id: true, name: true, email: true, phone: true, isActive: true, permissions: true }
    });
    
    res.status(201).json({ success: true, message: 'تم إضافة الموظف بنجاح', data: staff });
  } catch (error) {
    console.error('Error creating store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إضافة الموظف' });
  }
};

export const updateStoreStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { storeId, staffId } = req.params;
    const { name, email, phone, password } = req.body;
    
    const staff = await prisma.user.findFirst({ where: { id: staffId, storeId, role: 'staff' } });
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    const updated = await prisma.user.update({
      where: { id: staffId },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, isActive: true }
    });
    
    res.json({ success: true, message: 'تم تحديث بيانات الموظف', data: updated });
  } catch (error) {
    console.error('Error updating store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث بيانات الموظف' });
  }
};

export const toggleStoreStaffStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { storeId, staffId } = req.params;
    const staff = await prisma.user.findFirst({ where: { id: staffId, storeId, role: 'staff' } });
    
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    
    const updated = await prisma.user.update({
      where: { id: staffId },
      data: { isActive: !staff.isActive },
      select: { id: true, name: true, isActive: true }
    });
    
    res.json({ success: true, message: updated.isActive ? 'تم تفعيل الموظف' : 'تم تعطيل الموظف', data: updated });
  } catch (error) {
    console.error('Error toggling staff status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة الموظف' });
  }
};
export const updatePlatformStaffPermissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { id } = req.params;
    const { permissions } = req.body;

    const staff = await prisma.user.findFirst({
      where: { id, role: 'staff', restaurantId: null, storeId: null }
    });

    if (!staff) {
      res.status(404).json({ 
        success: false, 
        error: 'موظف المنصة غير موجود' 
      });
      return;
    }

    const updatedStaff = await prisma.user.update({
      where: { id },
      data: { permissions },
      select: {
        id: true,
        name: true,
        email: true,
        permissions: true
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث صلاحيات الموظف بنجاح',
      data: updatedStaff
    });
  } catch (error) {
    console.error('Error updating platform staff permissions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في تحديث صلاحيات الموظف' 
    });
  }
};



export const updateStoreStaffPermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { storeId, staffId } = req.params;
    const { permissions } = req.body;
    
    const staff = await prisma.user.findFirst({ where: { id: staffId, storeId, role: 'staff' } });
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    
    const updated = await prisma.user.update({
      where: { id: staffId },
      data: { permissions },
      select: { id: true, name: true, permissions: true }
    });
    
    res.json({ success: true, message: 'تم تحديث صلاحيات الموظف', data: updated });
  } catch (error) {
    console.error('Error updating staff permissions:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الصلاحيات' });
  }
};

export const deleteStoreStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { storeId, staffId } = req.params;
    const staff = await prisma.user.findFirst({ where: { id: staffId, storeId, role: 'staff' } });
    
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    
    await prisma.user.delete({ where: { id: staffId } });
    
    res.json({ success: true, message: 'تم حذف الموظف بنجاح' });
  } catch (error) {
    console.error('Error deleting store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الموظف' });
  }
};

// ==================== إدارة موظفي المنصة ====================

export const getAllPlatformStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: 'staff' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        restaurantId: true,
        storeId: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error getting platform staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب موظفي المنصة' });
  }
};

export const getPlatformStaffDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;
    const staff = await prisma.user.findFirst({
      where: { id: staffId, role: 'staff' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        restaurantId: true,
        storeId: true
      }
    });
    
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error getting staff details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات الموظف' });
  }
};







// backend/src/controllers/adminController.ts
// أضف هذه الدوال في نهاية الملف

// ==================== إدارة موظفي المنصة (للسوبر أدمن) ====================

/**
 * جلب جميع موظفي المنصة (الموظفين الذين ليس لديهم restaurantId أو storeId)
 */
export const getPlatformStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const staff = await prisma.user.findMany({
      where: {
        role: 'staff',
        restaurantId: null,
        storeId: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        permissions: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Error getting platform staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب موظفي المنصة' });
  }
};

/**
 * إنشاء موظف منصة جديد
 */
export const createPlatformStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { name, email, password, phone, permissions } = req.body;

    // التحقق من وجود البريد الإلكتروني
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({ 
        success: false, 
        error: 'البريد الإلكتروني موجود بالفعل' 
      });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ 
        success: false, 
        error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' 
      });
      return;
    }

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: 'staff',
        permissions: permissions || {},
        isActive: true,
        isEmailVerified: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة موظف المنصة بنجاح',
      data: staff
    });
  } catch (error) {
    console.error('Error creating platform staff:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في إضافة موظف المنصة' 
    });
  }
};

/**
 * تحديث موظف منصة
 */
export const updatePlatformStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { id } = req.params;
    const { name, email, phone, permissions, isActive } = req.body;

    const staff = await prisma.user.findFirst({
      where: { id, role: 'staff', restaurantId: null, storeId: null }
    });

    if (!staff) {
      res.status(404).json({ 
        success: false, 
        error: 'موظف المنصة غير موجود' 
      });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedStaff = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        permissions: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث موظف المنصة بنجاح',
      data: updatedStaff
    });
  } catch (error) {
    console.error('Error updating platform staff:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في تحديث موظف المنصة' 
    });
  }
};

/**
 * تبديل حالة موظف منصة (تفعيل/تعطيل)
 */
export const togglePlatformStaffStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { id } = req.params;

    const staff = await prisma.user.findFirst({
      where: { id, role: 'staff', restaurantId: null, storeId: null }
    });

    if (!staff) {
      res.status(404).json({ 
        success: false, 
        error: 'موظف المنصة غير موجود' 
      });
      return;
    }

    const updatedStaff = await prisma.user.update({
      where: { id },
      data: { isActive: !staff.isActive },
      select: {
        id: true,
        name: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: updatedStaff.isActive ? 'تم تفعيل الموظف' : 'تم تعطيل الموظف',
      data: updatedStaff
    });
  } catch (error) {
    console.error('Error toggling platform staff:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في تغيير حالة موظف المنصة' 
    });
  }
};

/**
 * حذف موظف منصة
 */
export const deletePlatformStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { id } = req.params;

    const staff = await prisma.user.findFirst({
      where: { id, role: 'staff', restaurantId: null, storeId: null }
    });

    if (!staff) {
      res.status(404).json({ 
        success: false, 
        error: 'موظف المنصة غير موجود' 
      });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      message: 'تم حذف موظف المنصة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting platform staff:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في حذف موظف المنصة' 
    });
  }
};


// backend/src/controllers/adminController.ts

// ==================== إدارة الفروع (Branches) ====================

/**
 * جلب جميع الفروع (المطاعم)
 */
export const getAllBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const branches = await prisma.restaurant.findMany({
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            maxRestaurants: true,
            maxUsers: true,
            maxMenuItems: true,
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          }
        },
        _count: {
          select: {
            menuItems: true,
            orders: true,
            tables: true,
            users: true,
            categories: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      data: branches,
      count: branches.length
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب الفروع'
    });
  }
};

/**
 * جلب فرع محدد بالمعرف
 */
export const getBranchById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const branch = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            maxRestaurants: true,
            maxUsers: true,
            maxMenuItems: true,
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          }
        },
        _count: {
          select: {
            menuItems: true,
            orders: true,
            tables: true,
            users: true,
            categories: true,
          }
        }
      }
    });

    if (!branch) {
      res.status(404).json({
        success: false,
        error: 'الفرع غير موجود'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: branch
    });
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب بيانات الفرع'
    });
  }
};

/**
 * تحديث حالة الفرع (تفعيل/تعطيل)
 */
export const toggleBranchStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'يجب إرسال قيمة isActive من نوع boolean'
      });
      return;
    }

    const branch = await prisma.restaurant.findUnique({
      where: { id }
    });

    if (!branch) {
      res.status(404).json({
        success: false,
        error: 'الفرع غير موجود'
      });
      return;
    }

    const updatedBranch = await prisma.restaurant.update({
      where: { id },
      data: { isActive }
    });

    res.status(200).json({
      success: true,
      message: `تم ${isActive ? 'تفعيل' : 'تعطيل'} الفرع بنجاح`,
      data: updatedBranch
    });
  } catch (error) {
    console.error('Error toggling branch status:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحديث حالة الفرع'
    });
  }
};

/**
 * تحديث خطة الفرع
 */
export const updateBranchPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { planId } = req.body;

    if (!planId) {
      res.status(400).json({
        success: false,
        error: 'معرف الخطة مطلوب'
      });
      return;
    }

    // التحقق من وجود الفرع
    const branch = await prisma.restaurant.findUnique({
      where: { id }
    });

    if (!branch) {
      res.status(404).json({
        success: false,
        error: 'الفرع غير موجود'
      });
      return;
    }

    // التحقق من وجود الخطة
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        error: 'الخطة غير موجودة'
      });
      return;
    }

    const updatedBranch = await prisma.restaurant.update({
      where: { id },
      data: { planId },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            maxRestaurants: true,
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'تم تحديث خطة الفرع بنجاح',
      data: updatedBranch
    });
  } catch (error) {
    console.error('Error updating branch plan:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحديث خطة الفرع'
    });
  }
};

/**
 * حذف فرع
 */
export const deleteBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // التحقق من وجود الفرع
    const branch = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            menuItems: true,
            orders: true,
            tables: true,
            users: true,
          }
        }
      }
    });

    if (!branch) {
      res.status(404).json({
        success: false,
        error: 'الفرع غير موجود'
      });
      return;
    }

    // التحقق من وجود بيانات مرتبطة
    const hasRelatedData = branch._count.menuItems > 0 || 
                          branch._count.orders > 0 || 
                          branch._count.tables > 0 ||
                          branch._count.users > 0;

    if (hasRelatedData) {
      res.status(400).json({
        success: false,
        error: 'لا يمكن حذف الفرع لأنه يحتوي على بيانات مرتبطة',
        data: {
          menuItems: branch._count.menuItems,
          orders: branch._count.orders,
          tables: branch._count.tables,
          users: branch._count.users,
        }
      });
      return;
    }

    // حذف الفرع
    await prisma.restaurant.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'تم حذف الفرع بنجاح'
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في حذف الفرع'
    });
  }
};
