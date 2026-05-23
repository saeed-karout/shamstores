// backend/src/middleware/auth.ts
import { Response, NextFunction } from 'express';
import { AuthRequest, UserPayload } from '../types';
import { verifyToken } from '../config/auth';
import prisma from '../services/prisma';

// ==================== المصادقة الأساسية ====================

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔑 Auth header received:', authHeader ? 'Yes' : 'No');
    
    if (authHeader) {
      console.log('🔑 Auth header value:', authHeader.substring(0, 30) + '...');
    }
    
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token provided');
      res.status(401).json({ success: false, error: 'لا يوجد صلاحية دخول' });
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('❌ Invalid token');
      res.status(401).json({ success: false, error: 'انتهت صلاحية الدخول' });
      return;
    }

    // جلب صلاحيات المستخدم من قاعدة البيانات إذا كان موظفاً
    let permissions = decoded.permissions;
    if (decoded.role === 'staff') {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { permissions: true }
      });
      if (user && user.permissions) {
        permissions = user.permissions as any;
      }
    }

    req.user = { 
      ...decoded, 
      permissions: permissions || decoded.permissions 
    };
    
    console.log('✅ Token verified for user:', decoded.id, 'role:', decoded.role);
    next();
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(401).json({ success: false, error: 'خطأ في التحقق من الصلاحية' });
  }
};

// ==================== التحقق العام من الأدوار ====================

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        error: `لا تملك صلاحية الوصول. الدور المطلوب: ${allowedRoles.join(' أو ')}` 
      });
      return;
    }

    next();
  };
};

// ==================== دوال مساعدة للتحقق من صلاحيات موظف المنصة ====================

/**
 * التحقق من صلاحيات موظف المنصة
 */
export const checkPlatformStaffPermission = (
  req: AuthRequest,
  requiredPermission: string
): boolean => {
  const user = req.user;
  
  // السوبر أدمن يملك كل الصلاحيات
  if (user?.role === 'super_admin') return true;
  
  // موظف منصة (ليس لديه مطعم أو متجر)
  if (user?.role === 'staff' && !user?.restaurantId && !user?.storeId) {
    const permissions = user?.permissions || {};
    
    const permissionMap: Record<string, string> = {
      'manage_restaurants': 'canManageRestaurants',
      'manage_stores': 'canManageStores',
      'manage_users': 'canManageUsers',
      'manage_drivers': 'canManageDrivers',
      'manage_plans': 'canManagePlans',
      'manage_settings': 'canManageSettings',
      'view_reports': 'canViewReports'
    };
    
    const permissionKey = permissionMap[requiredPermission];
    if (permissionKey) {
      return (permissions as any)[permissionKey] === true;
    }
  }
  
  return false;
};

/**
 * Middleware للتحقق من صلاحيات موظف المنصة
 */
export const requirePlatformStaffPermission = (requiredPermission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const hasPermission = checkPlatformStaffPermission(req, requiredPermission);
    if (!hasPermission) {
      res.status(403).json({ 
        success: false, 
        error: 'لا تملك صلاحية الوصول' 
      });
      return;
    }
    next();
  };
};

// ==================== أدوار محددة ====================

export const authorizeAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'super_admin') {
    res.status(403).json({ success: false, error: 'لا تملك صلاحية الوصول' });
    return;
  }
  next();
};

export const authorizeStaff = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!['owner', 'super_admin', 'staff'].includes(req.user?.role || '')) {
    res.status(403).json({ success: false, error: 'لا تملك صلاحية الوصول' });
    return;
  }
  next();
};

export const authorizeUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'user' && req.user?.role !== 'super_admin') {
    res.status(403).json({ 
      success: false, 
      error: 'هذه الخدمة مخصصة للمستخدمين العاديين' 
    });
    return;
  }
  next();
};

// ==================== دوال المالك والمتجر ====================

export const authorizeOwner = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'غير مصرح' });
    return;
  }

  const isOwner = req.user.role === 'owner' || req.user.role === 'super_admin';
  
  if (!isOwner) {
    res.status(403).json({ success: false, error: 'لا تملك صلاحية الوصول' });
    return;
  }

  // التأكد من أن المالك لديه مطعم أو متجر مرتبط (لغير السوبر أدمن)
  const hasBusiness = req.user.restaurantId || req.user.storeId;
  
  if (!hasBusiness && req.user.role !== 'super_admin') {
    res.status(403).json({ 
      success: false, 
      error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' 
    });
    return;
  }

  next();
};

// ==================== دوال التوصيل ====================

export const authorizeDeliveryDriver = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!['delivery_driver', 'owner', 'super_admin'].includes(req.user?.role || '')) {
    res.status(403).json({ 
      success: false, 
      error: 'هذه الخدمة مخصصة لمندوبي التوصيل' 
    });
    return;
  }
  next();
};

export const authorizeRestaurantOrDriver = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const allowedRoles = ['owner', 'super_admin', 'staff', 'delivery_driver'];
  if (!allowedRoles.includes(req.user?.role || '')) {
    res.status(403).json({ 
      success: false, 
      error: 'غير مصرح بالوصول' 
    });
    return;
  }
  next();
};

// ==================== التحقق من الوصول إلى الموارد ====================

/**
 * التحقق من صلاحية الوصول إلى مطعم معين
 */
export const verifyRestaurantAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    const userRole = req.user?.role;
    const userRestaurantId = req.user?.restaurantId;

    // السوبر أدمن يمكنه الوصول لأي مطعم
    if (userRole === 'super_admin') {
      next();
      return;
    }

    // المالك والموظف يمكنهم الوصول فقط لمطعمهم
    if (userRole === 'owner' || userRole === 'staff') {
      if (userRestaurantId === restaurantId) {
        next();
        return;
      }
      res.status(403).json({ 
        success: false, 
        error: 'لا تملك صلاحية الوصول لهذا المطعم' 
      });
      return;
    }

    // مندوب التوصيل يمكنه الوصول فقط لطلباته
    if (userRole === 'delivery_driver') {
      next();
      return;
    }

    res.status(403).json({ 
      success: false, 
      error: 'غير مصرح بالوصول' 
    });
  } catch (error) {
    console.error('Error verifying restaurant access:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في التحقق من الصلاحية' 
    });
  }
};

/**
 * التحقق من صلاحية الوصول إلى متجر معين
 */
export const verifyStoreAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { storeId } = req.params;
    const userRole = req.user?.role;
    const userStoreId = req.user?.storeId;

    // السوبر أدمن يمكنه الوصول لأي متجر
    if (userRole === 'super_admin') {
      next();
      return;
    }

    // المالك يمكنه الوصول فقط لمتجره
    if (userRole === 'owner') {
      if (userStoreId === storeId) {
        next();
        return;
      }
      res.status(403).json({ 
        success: false, 
        error: 'لا تملك صلاحية الوصول لهذا المتجر' 
      });
      return;
    }

    // الموظف يمكنه الوصول إلى متاجر معينة حسب الصلاحيات
    if (userRole === 'staff') {
      const hasPermission = checkPlatformStaffPermission(req, 'manage_stores');
      if (hasPermission) {
        next();
        return;
      }
      res.status(403).json({ 
        success: false, 
        error: 'لا تملك صلاحية الوصول للمتاجر' 
      });
      return;
    }

    res.status(403).json({ 
      success: false, 
      error: 'غير مصرح بالوصول' 
    });
  } catch (error) {
    console.error('Error verifying store access:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في التحقق من الصلاحية' 
    });
  }
};

/**
 * التحقق من صلاحية الوصول إلى طلب معين (باستخدام Prisma)
 */
export const verifyOrderAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;
    const userRole = req.user?.role;
    const userRestaurantId = req.user?.restaurantId;
    const userStoreId = req.user?.storeId;
    const userId = req.user?.id;

    // السوبر أدمن يمكنه الوصول لأي طلب
    if (userRole === 'super_admin') {
      next();
      return;
    }

    // جلب الطلب من قاعدة البيانات
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      res.status(404).json({ 
        success: false, 
        error: 'الطلب غير موجود' 
      });
      return;
    }

    // التحقق من أن المستخدم لديه صلاحية للطلب
    if (userRole === 'owner') {
      // مالك مطعم: يجب أن يكون الطلب لمطعمه
      if (order.restaurantId && userRestaurantId === order.restaurantId) {
        next();
        return;
      }
      // مالك متجر: يجب أن يكون الطلب لمتجره
      if (order.storeId && userStoreId === order.storeId) {
        next();
        return;
      }
      res.status(403).json({ 
        success: false, 
        error: 'لا تملك صلاحية الوصول لهذا الطلب' 
      });
      return;
    }

    if (userRole === 'staff') {
      // موظف مطعم: يمكنه الوصول فقط لطلبات مطعمه
      if (order.restaurantId && userRestaurantId === order.restaurantId) {
        next();
        return;
      }
      // موظف منصة: يمكنه الوصول إذا كانت لديه صلاحية
      const hasPermission = checkPlatformStaffPermission(req, 'manage_restaurants');
      if (hasPermission) {
        next();
        return;
      }
      res.status(403).json({ 
        success: false, 
        error: 'لا تملك صلاحية الوصول لهذا الطلب' 
      });
      return;
    }

    if (userRole === 'delivery_driver') {
      // مندوب توصيل: يجب أن يكون الطلب مخصصاً له
      if (order.assignedDriverId === userId) {
        next();
        return;
      }
      res.status(403).json({ 
        success: false, 
        error: 'هذا الطلب غير مخصص لك' 
      });
      return;
    }

    res.status(403).json({ 
      success: false, 
      error: 'غير مصرح بالوصول' 
    });
  } catch (error) {
    console.error('Error verifying order access:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في التحقق من الصلاحية' 
    });
  }
};

// ==================== دوال النشاط التجاري ====================

/**
 * الحصول على معرف المطعم أو المتجر الحالي للمستخدم
 */
export const getBusinessId = (req: AuthRequest): { type: 'restaurant' | 'store' | null; id: string | null } => {
  if (req.user?.restaurantId) {
    return { type: 'restaurant', id: req.user.restaurantId };
  }
  if (req.user?.storeId) {
    return { type: 'store', id: req.user.storeId };
  }
  return { type: null, id: null };
};

/**
 * التحقق من وجود نشاط تجاري (مطعم أو متجر) للمستخدم
 */
export const requireBusiness = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const business = getBusinessId(req);
  
  if (!business.id && req.user?.role !== 'super_admin') {
    res.status(403).json({ 
      success: false, 
      error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' 
    });
    return;
  }
  
  next();
};

// ==================== دالة مساعدة للحصول على صلاحيات المستخدم ====================

/**
 * جلب صلاحيات المستخدم (للموظفين)
 */
export const getUserPermissions = async (userId: string): Promise<any> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { permissions: true, role: true, restaurantId: true, storeId: true }
  });
  return user?.permissions || {};
};