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
    // لا نسجّل قيمة الترويسة إطلاقاً — التوكن بيانات اعتماد كاملة
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;

    if (!token) {
      res.status(401).json({ success: false, error: 'لا يوجد صلاحية دخول' });
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ success: false, error: 'انتهت صلاحية الدخول' });
      return;
    }

    // التحقق من أن الحساب ما يزال موجوداً ونشطاً — التوكن وحده لا يكفي:
    // تعطيل حساب أو تغيير دوره يجب أن يسري فوراً وليس بعد انتهاء صلاحية التوكن.
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        role: true,
        isActive: true,
        permissions: true,
        restaurantId: true,
        storeId: true
      }
    });

    if (!dbUser) {
      res.status(401).json({ success: false, error: 'الحساب غير موجود' });
      return;
    }

    if (dbUser.isActive === false) {
      res.status(403).json({ success: false, error: 'الحساب غير مفعل' });
      return;
    }

    // المصدر الموثوق للدور والانتماء هو قاعدة البيانات، لا حمولة التوكن
    req.user = {
      ...decoded,
      id: dbUser.id,
      role: dbUser.role || decoded.role,
      restaurantId: dbUser.restaurantId ?? undefined,
      storeId: dbUser.storeId ?? undefined,
      permissions: (dbUser.permissions as any) || decoded.permissions
    };

    next();
  } catch (error) {
    console.error('❌ Auth error:', error instanceof Error ? error.message : error);
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
// ==================== حراسة ملكية المستأجر (Tenant Ownership) ====================

/**
 * يمنع الوصول العابر بين المستأجرين (IDOR).
 *
 * بعض مسارات الإدارة تسمح بدور `owner` وتأخذ معرّف المتجر/المطعم من الـ URL.
 * بدون هذا الفحص يستطيع مالك المتجر (أ) قراءة موظفي المتجر (ب) — بل وإنشاء
 * حساب موظف بكلمة مرور يختارها داخل متجر لا يملكه.
 */
export const requireBusinessOwnership = (
  businessType: 'store' | 'restaurant',
  paramName: string
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مصرح' });
        return;
      }

      // السوبر أدمن يمر
      if (req.user.role === 'super_admin') {
        next();
        return;
      }

      // موظف المنصة صاحب الصلاحية المناسبة يمر
      const platformPermission =
        businessType === 'store' ? 'manage_stores' : 'manage_restaurants';
      if (checkPlatformStaffPermission(req, platformPermission)) {
        next();
        return;
      }

      const targetId = req.params[paramName];
      if (!targetId) {
        res.status(400).json({ success: false, error: 'معرّف النشاط التجاري مفقود' });
        return;
      }

      const linkedId =
        businessType === 'store' ? req.user.storeId : req.user.restaurantId;

      if (linkedId && linkedId === targetId) {
        next();
        return;
      }

      // فحص إضافي: قد يملك المستخدم النشاط دون أن يكون مرتبطاً به في التوكن
      if (req.user.role === 'owner') {
        const owned =
          businessType === 'store'
            ? await prisma.store.findFirst({
                where: { id: targetId, userId: req.user.id },
                select: { id: true }
              })
            : await prisma.restaurant.findFirst({
                where: { id: targetId, userId: req.user.id },
                select: { id: true }
              });

        if (owned) {
          next();
          return;
        }
      }

      res.status(403).json({ success: false, error: 'لا تملك صلاحية الوصول لهذا النشاط التجاري' });
    } catch (error) {
      console.error('Error verifying business ownership:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ في التحقق من الصلاحية' });
    }
  };
};
