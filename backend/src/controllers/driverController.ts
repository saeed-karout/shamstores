// backend/src/controllers/driverController.ts
import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import bcrypt from 'bcrypt';

// ==================== دوال مساعدة ====================

const isSuperAdmin = (req: AuthRequest): boolean => {
  return req.user?.role === 'super_admin';
};

const ensureSuperAdmin = (req: AuthRequest, res: Response): boolean => {
  if (!isSuperAdmin(req)) {
    res.status(403).json({ 
      success: false, 
      error: 'غير مصرح. هذه الصلاحية متاحة فقط للمدير العام' 
    });
    return false;
  }
  return true;
};

/**
 * جلب قائمة السائقين
 * - السوبر أدمن: يجلب جميع السائقين في المنصة
 * - المالك: يجلب سائقين مطعمه/متجره فقط
 */
export const getDrivers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const restaurantId = req.user?.restaurantId;
    const storeId = req.user?.storeId;
    
    console.log('🔍 Fetching drivers - User:', {
      userId: req.user?.id,
      role: userRole,
      restaurantId,
      storeId
    });
    
    let where: any = { role: 'delivery_driver' };
    
    //如果不是 super_admin، اجلب السائقين المرتبطين فقط
    if (userRole !== 'super_admin') {
      if (restaurantId) {
        where.restaurantId = restaurantId;
      } else if (storeId) {
        where.storeId = storeId;
      } else {
        res.status(400).json({ 
          success: false,
          error: 'معرف المطعم أو المتجر غير موجود' 
        });
        return;
      }
    }
    
    // فلترة حسب businessId إذا ورد في query
    if (req.query.businessId && userRole === 'super_admin') {
      const businessId = req.query.businessId as string;
      const businessType = req.query.businessType as string;
      
      if (businessType === 'restaurant') {
        where.restaurantId = businessId;
      } else if (businessType === 'store') {
        where.storeId = businessId;
      }
    }

    console.log('🔍 Where clause:', where);

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
        driverRating: true,
        driverRatingCount: true,
      },
      orderBy: { name: 'asc' }
    });

    // جلب أسماء المطاعم/المتاجر المرتبطة
    const driversWithBusiness = await Promise.all(drivers.map(async (driver) => {
      let business = null;
      if (driver.restaurantId) {
        business = await prisma.restaurant.findUnique({
          where: { id: driver.restaurantId },
          select: { name: true, slug: true }
        });
      } else if (driver.storeId) {
        business = await prisma.store.findUnique({
          where: { id: driver.storeId },
          select: { name: true, slug: true }
        });
      }
      
      return {
        ...driver,
        business: business ? { name: business.name, type: driver.restaurantId ? 'restaurant' : 'store' } : null
      };
    }));

    console.log(`✅ Found ${driversWithBusiness.length} drivers`);

    res.json({
      success: true,
      data: driversWithBusiness
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب السائقين' 
    });
  }
};

/**
 * إنشاء سائق جديد
 * - السوبر أدمن: يمكنه إنشاء سائق لأي مطعم/متجر
 * - المالك: يمكنه إنشاء سائق لمطعمه/متجره فقط
 */
export const createDriver = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userRestaurantId = req.user?.restaurantId;
    const userStoreId = req.user?.storeId;
    
    const { 
      name, 
      email, 
      password, 
      phone, 
      businessId, 
      businessType,
      restaurantId: bodyRestaurantId,  // للتوافق مع الإصدار القديم
      storeId: bodyStoreId              // للتوافق مع الإصدار القديم
    } = req.body;

    console.log('🔍 Creating driver:', {
      userRole,
      userRestaurantId,
      userStoreId,
      bodyData: { name, email, businessId, businessType, bodyRestaurantId, bodyStoreId }
    });

    // التحقق من وجود البريد الإلكتروني
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: 'البريد الإلكتروني مستخدم بالفعل' 
      });
      return;
    }

    // تحديد نوع العمل (مطعم/متجر) ومعرفه
    let targetRestaurantId: string | null = null;
    let targetStoreId: string | null = null;
    let businessName = '';

    if (userRole === 'super_admin') {
      // السوبر أدمن: يحدد العمل من الـ request
      const useBusinessId = businessId || bodyRestaurantId || bodyStoreId;
      const useBusinessType = businessType || (bodyRestaurantId ? 'restaurant' : (bodyStoreId ? 'store' : null));
      
      if (useBusinessId && useBusinessType === 'restaurant') {
        targetRestaurantId = useBusinessId;
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: targetRestaurantId },
          select: { name: true }
        });
        if (!restaurant) {
          res.status(404).json({ success: false, error: 'المطعم غير موجود' });
          return;
        }
        businessName = restaurant.name;
      } else if (useBusinessId && useBusinessType === 'store') {
        targetStoreId = useBusinessId;
        const store = await prisma.store.findUnique({
          where: { id: targetStoreId },
          select: { name: true }
        });
        if (!store) {
          res.status(404).json({ success: false, error: 'المتجر غير موجود' });
          return;
        }
        businessName = store.name;
      } else {
        // إذا لم يحدد، جلب أول مطعم أو متجر
        const firstRestaurant = await prisma.restaurant.findFirst();
        const firstStore = await prisma.store.findFirst();
        
        if (firstRestaurant) {
          targetRestaurantId = firstRestaurant.id;
          businessName = firstRestaurant.name;
        } else if (firstStore) {
          targetStoreId = firstStore.id;
          businessName = firstStore.name;
        } else {
          res.status(400).json({ 
            success: false, 
            error: 'لا يوجد مطاعم أو متاجر في المنصة. قم بإنشاء نشاط تجاري أولاً' 
          });
          return;
        }
      }
    } else {
      // المالك: يستخدم معرف مطعمه/متجره
      if (userRestaurantId) {
        targetRestaurantId = userRestaurantId;
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: targetRestaurantId },
          select: { name: true }
        });
        businessName = restaurant?.name || 'المطعم';
      } else if (userStoreId) {
        targetStoreId = userStoreId;
        const store = await prisma.store.findUnique({
          where: { id: targetStoreId },
          select: { name: true }
        });
        businessName = store?.name || 'المتجر';
      } else {
        res.status(400).json({ 
          success: false,
          error: 'لا يوجد نشاط تجاري مرتبط بهذا المستخدم' 
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
        restaurantId: targetRestaurantId,
        storeId: targetStoreId,
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

    console.log(`✅ Driver created for ${businessName}`);

    res.status(201).json({
      success: true,
      message: `تم إنشاء السائق بنجاح لـ ${businessName}`,
      data: driver
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء السائق' 
    });
  }
};

/**
 * تحديث حالة السائق (تفعيل/تعطيل)
 */
export const updateDriverStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { driverId } = req.params;
    const { isActive } = req.body;
    const userRole = req.user?.role;
    const userRestaurantId = req.user?.restaurantId;
    const userStoreId = req.user?.storeId;

    // بناء شرط البحث
    const where: any = { 
      id: driverId,
      role: 'delivery_driver'
    };
    
    if (userRole !== 'super_admin') {
      if (userRestaurantId) {
        where.restaurantId = userRestaurantId;
      } else if (userStoreId) {
        where.storeId = userStoreId;
      }
    }

    const driver = await prisma.user.findFirst({ where });

    if (!driver) {
      res.status(404).json({ 
        success: false,
        error: 'السائق غير موجود أو لا تملك صلاحية الوصول إليه' 
      });
      return;
    }

    const updatedDriver = await prisma.user.update({
      where: { id: driverId },
      data: { isActive: isActive === undefined ? !driver.isActive : isActive },
      select: {
        id: true,
        name: true,
        isActive: true,
      }
    });

    res.json({
      success: true,
      message: updatedDriver.isActive ? 'تم تفعيل السائق' : 'تم تعطيل السائق',
      data: { isActive: updatedDriver.isActive }
    });
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث حالة السائق' 
    });
  }
};

/**
 * تبديل حالة السائق (Toggle)
 */
export const toggleDriverStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { driverId } = req.params;
    const userRole = req.user?.role;
    const userRestaurantId = req.user?.restaurantId;
    const userStoreId = req.user?.storeId;

    const where: any = { 
      id: driverId,
      role: 'delivery_driver'
    };
    
    if (userRole !== 'super_admin') {
      if (userRestaurantId) {
        where.restaurantId = userRestaurantId;
      } else if (userStoreId) {
        where.storeId = userStoreId;
      }
    }

    const driver = await prisma.user.findFirst({ where });

    if (!driver) {
      res.status(404).json({ 
        success: false,
        error: 'السائق غير موجود أو لا تملك صلاحية الوصول إليه' 
      });
      return;
    }

    const updatedDriver = await prisma.user.update({
      where: { id: driverId },
      data: { isActive: !driver.isActive },
      select: {
        id: true,
        name: true,
        isActive: true,
      }
    });

    res.json({
      success: true,
      message: updatedDriver.isActive ? 'تم تفعيل السائق' : 'تم تعطيل السائق',
      data: { isActive: updatedDriver.isActive }
    });
  } catch (error) {
    console.error('Error toggling driver status:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تبديل حالة السائق' 
    });
  }
};

/**
 * حذف سائق
 */
export const deleteDriver = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { driverId } = req.params;
    const userRole = req.user?.role;
    const userRestaurantId = req.user?.restaurantId;
    const userStoreId = req.user?.storeId;

    const where: any = { 
      id: driverId,
      role: 'delivery_driver'
    };
    
    if (userRole !== 'super_admin') {
      if (userRestaurantId) {
        where.restaurantId = userRestaurantId;
      } else if (userStoreId) {
        where.storeId = userStoreId;
      }
    }

    const driver = await prisma.user.findFirst({ where });

    if (!driver) {
      res.status(404).json({ 
        success: false,
        error: 'السائق غير موجود أو لا تملك صلاحية الوصول إليه' 
      });
      return;
    }

    await prisma.user.delete({ where: { id: driverId } });

    res.json({
      success: true,
      message: 'تم حذف السائق بنجاح'
    });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في حذف السائق' 
    });
  }
};

/**
 * إعادة تعيين كلمة مرور السائق
 */
export const resetDriverPassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { driverId } = req.params;
    const { newPassword } = req.body;
    const userRole = req.user?.role;
    const userRestaurantId = req.user?.restaurantId;
    const userStoreId = req.user?.storeId;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ 
        success: false, 
        error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' 
      });
      return;
    }

    const where: any = { 
      id: driverId,
      role: 'delivery_driver'
    };
    
    if (userRole !== 'super_admin') {
      if (userRestaurantId) {
        where.restaurantId = userRestaurantId;
      } else if (userStoreId) {
        where.storeId = userStoreId;
      }
    }

    const driver = await prisma.user.findFirst({ where });
    
    if (!driver) {
      res.status(404).json({ 
        success: false, 
        error: 'السائق غير موجود أو لا تملك صلاحية الوصول إليه' 
      });
      return;
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: driverId },
      data: { password: hashedPassword }
    });
    
    res.json({
      success: true,
      message: 'تم تحديث كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في تحديث كلمة المرور' 
    });
  }
};

/**
 * جلب إحصائيات السائقين (للسوبر أدمن فقط)
 */
export const getDriversStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const [
      totalDrivers,
      activeDrivers,
      onlineDrivers,
      driversWithLocation,
      driversByBusiness
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'delivery_driver' } }),
      prisma.user.count({ where: { role: 'delivery_driver', isActive: true } }),
      prisma.user.count({ where: { role: 'delivery_driver', isOnline: true } }),
      prisma.user.count({ 
        where: { 
          role: 'delivery_driver',
          lastLocationLat: { not: null },
          lastLocationLng: { not: null }
        } 
      }),
      // سائقين المطاعم
      prisma.user.groupBy({
        by: ['restaurantId'],
        where: { role: 'delivery_driver', restaurantId: { not: null } },
        _count: true
      }),
    ]);

    // جلب أسماء المطاعم
    const restaurantStats = await Promise.all(
      driversByBusiness
        .filter(item => item.restaurantId)
        .map(async (item) => {
          const restaurant = await prisma.restaurant.findUnique({
            where: { id: item.restaurantId! },
            select: { name: true }
          });
          return {
            businessId: item.restaurantId,
            businessName: restaurant?.name || 'غير معروف',
            businessType: 'restaurant',
            driversCount: item._count
          };
        })
    );

    // سائقين المتاجر
    const storeDrivers = await prisma.user.groupBy({
      by: ['storeId'],
      where: { role: 'delivery_driver', storeId: { not: null } },
      _count: true
    });

    const storeStats = await Promise.all(
      storeDrivers.map(async (item) => {
        const store = await prisma.store.findUnique({
          where: { id: item.storeId! },
          select: { name: true }
        });
        return {
          businessId: item.storeId,
          businessName: store?.name || 'غير معروف',
          businessType: 'store',
          driversCount: item._count
        };
      })
    );

    res.json({
      success: true,
      data: {
        summary: {
          total: totalDrivers,
          active: activeDrivers,
          inactive: totalDrivers - activeDrivers,
          online: onlineDrivers,
          offline: totalDrivers - onlineDrivers,
          withLocation: driversWithLocation,
        },
        byBusiness: [...restaurantStats, ...storeStats]
      }
    });
  } catch (error) {
    console.error('Error getting drivers stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في جلب إحصائيات السائقين' 
    });
  }
};

/**
 * جلب المطاعم والمتاجر التي لا تملك سائقين (للسوبر أدمن)
 */
export const getBusinessesWithoutDrivers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    // جلب جميع المطاعم
    const allRestaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true, slug: true, logo: true }
    });

    // جلب جميع المتاجر
    const allStores = await prisma.store.findMany({
      select: { id: true, name: true, slug: true, logo: true }
    });

    // جلب IDs المطاعم التي لديها سائقين
    const restaurantsWithDrivers = await prisma.user.groupBy({
      by: ['restaurantId'],
      where: { 
        role: 'delivery_driver', 
        restaurantId: { not: null } 
      }
    });

    // جلب IDs المتاجر التي لديها سائقين
    const storesWithDrivers = await prisma.user.groupBy({
      by: ['storeId'],
      where: { 
        role: 'delivery_driver', 
        storeId: { not: null } 
      }
    });

    const restaurantsWithDriversIds = new Set(
      restaurantsWithDrivers.map(r => r.restaurantId)
    );
    const storesWithDriversIds = new Set(
      storesWithDrivers.map(s => s.storeId)
    );

    const businessesWithoutDrivers = [
      ...allRestaurants
        .filter(r => !restaurantsWithDriversIds.has(r.id))
        .map(r => ({ ...r, type: 'restaurant' as const })),
      ...allStores
        .filter(s => !storesWithDriversIds.has(s.id))
        .map(s => ({ ...s, type: 'store' as const }))
    ];

    res.json({
      success: true,
      data: businessesWithoutDrivers,
      total: businessesWithoutDrivers.length
    });
  } catch (error) {
    console.error('Error getting businesses without drivers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في جلب المنشآت بدون سائقين' 
    });
  }
};

/**
 * تعيين سائق لمنشأة (مطعم/متجر)
 */
export const assignDriverToBusiness = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { driverId } = req.params;
    const { businessId, businessType } = req.body;

    if (!businessId || !businessType) {
      res.status(400).json({ 
        success: false, 
        error: 'يجب تحديد معرف ونوع المنشأة' 
      });
      return;
    }

    // التحقق من وجود السائق
    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: 'delivery_driver' }
    });

    if (!driver) {
      res.status(404).json({ 
        success: false, 
        error: 'السائق غير موجود' 
      });
      return;
    }

    // تحديث السائق
    const updateData: any = {};
    if (businessType === 'restaurant') {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: businessId }
      });
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'المطعم غير موجود' });
        return;
      }
      updateData.restaurantId = businessId;
      updateData.storeId = null;
    } else if (businessType === 'store') {
      const store = await prisma.store.findUnique({
        where: { id: businessId }
      });
      if (!store) {
        res.status(404).json({ success: false, error: 'المتجر غير موجود' });
        return;
      }
      updateData.storeId = businessId;
      updateData.restaurantId = null;
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'نوع المنشأة غير صالح. استخدم restaurant أو store' 
      });
      return;
    }

    const updatedDriver = await prisma.user.update({
      where: { id: driverId },
      data: updateData,
      select: {
        id: true,
        name: true,
        restaurantId: true,
        storeId: true,
      }
    });

    res.json({
      success: true,
      message: 'تم تعيين السائق للمنشأة بنجاح',
      data: updatedDriver
    });
  } catch (error) {
    console.error('Error assigning driver to business:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في تعيين السائق' 
    });
  }
};