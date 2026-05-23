// backend/src/routes/adminRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { 
  // إحصائيات عامة
  getPlatformStats,
  getRevenueStats,
  getOrderStatsByPeriod,
  
  // إدارة المطاعم
  getAllRestaurants,
  toggleRestaurantStatus,
  deleteRestaurant,
  getRestaurantDetails,
  updateRestaurant,
  resetRestaurantPassword,
  
  // إدارة المتاجر
  getAllStores,
  toggleStoreStatus,
  deleteStore,
  getStoreDetails,
  updateStore,
  resetStorePassword,
  
  // إدارة المستخدمين
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getUserDetails,
  resetUserPassword,
  
  // إدارة الطلبات
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  
  // إدارة السائقين
  getAllDrivers,
  toggleDriverStatus,
  deleteDriver,
  getDriverDetails,
  createDriver,
  getDriversStats,
  getBusinessesWithoutDrivers,
  assignDriverToBusiness,
  
  // إدارة الخطط
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  
  // إعدادات المنصة
  getPlatformSettings,
  updatePlatformSettings,
  
  // طلبات الترقية
  getUpgradeRequests,
  getUserUpgradeRequests,
  createUpgradeRequest,
  approveUpgrade,
  rejectUpgrade,
  
  // أدوات مساعدة
  checkSlugAvailability,
  
  // إدارة موظفي المتجر
  getStoreStaff,
  getStoreStaffDetails,
  createStoreStaff,
  updateStoreStaff,
  toggleStoreStaffStatus,
  updateStoreStaffPermissions,
  deleteStoreStaff,
  
  // إدارة موظفي المنصة
  getAllPlatformStaff,
  getPlatformStaffDetails,
  updatePlatformStaff,
  togglePlatformStaffStatus,
  deletePlatformStaff,
  createPlatformStaff,
  updatePlatformStaffPermissions,
  
  // صلاحيات الموظفين
  updateRestaurantStaffPermissions,
  getRestaurantStaffPermissions,
  updateStoreStaffPermissions as updateStoreStaffPermissionsController
} from '../controllers/adminController';

import { 
  getMaintenanceMode, 
  toggleMaintenanceMode 
} from '../controllers/platformSettingController';
import { getRestaurantStats, getStoreStats } from '../controllers/qrController';
import { AuthRequest } from '../types';

const router = Router();

// ==================== مسارات عامة (لا تتطلب مصادقة) ====================
router.get('/check-slug', checkSlugAvailability);
router.post('/upgrade-request', authenticate, createUpgradeRequest);
router.get('/user/upgrade-requests', authenticate, getUserUpgradeRequests);
router.get('/maintenance', getMaintenanceMode);

// ==================== Middleware للتحقق من صلاحيات موظف المنصة ====================
const checkPlatformStaffPermission = (req: any, res: any, next: any, permission: string) => {
  const user = req.user;
  
  // السوبر أدمن يمر
  if (user?.role === 'super_admin') {
    return next();
  }
  
  // موظف منصة (ليس لديه مطعم أو متجر)
  if (user?.role === 'staff' && !user?.restaurantId && !user?.storeId) {
    const permissions = user?.permissions || {};
    
    let hasPermission = false;
    switch (permission) {
      case 'manage_restaurants':
        hasPermission = permissions.canManageRestaurants === true;
        break;
      case 'manage_stores':
        hasPermission = permissions.canManageStores === true;
        break;
      case 'manage_users':
        hasPermission = permissions.canManageUsers === true;
        break;
      case 'manage_drivers':
        hasPermission = permissions.canManageDrivers === true;
        break;
      case 'manage_plans':
        hasPermission = permissions.canManagePlans === true;
        break;
      case 'manage_settings':
        hasPermission = permissions.canManageSettings === true;
        break;
      case 'view_reports':
        hasPermission = permissions.canViewReports === true;
        break;
      default:
        hasPermission = false;
    }
    
    if (hasPermission) {
      return next();
    }
  }
  
  return res.status(403).json({ success: false, error: 'لا تملك صلاحية الوصول' });
};

// ==================== مسارات السوبر أدمن وموظفي المنصة ====================
router.use(authenticate);

// -------------------- وضع الصيانة (سوبر أدمن فقط) --------------------
router.post('/maintenance/toggle', authorize(['super_admin']), toggleMaintenanceMode);

// -------------------- إحصائيات عامة --------------------
router.get('/stats', authorize(['super_admin']), getPlatformStats);
router.get('/revenue', authorize(['super_admin']), getRevenueStats);
router.get('/orders/stats/:period', authorize(['super_admin']), getOrderStatsByPeriod);

// -------------------- إدارة المطاعم --------------------
router.get('/restaurants', (req, res, next) => {
  checkPlatformStaffPermission(req, res, next, 'manage_restaurants');
}, getAllRestaurants);
router.get('/restaurants/:id', (req, res, next) => {
  checkPlatformStaffPermission(req, res, next, 'manage_restaurants');
}, getRestaurantDetails);
router.put('/restaurants/:id', authorize(['super_admin']), updateRestaurant);
router.patch('/restaurants/:id/toggle', authorize(['super_admin']), toggleRestaurantStatus);
router.delete('/restaurants/:id', authorize(['super_admin']), deleteRestaurant);
router.post('/restaurants/:id/reset-password', authorize(['super_admin']), resetRestaurantPassword);

// -------------------- إدارة موظفي المطاعم (الصلاحيات) --------------------
router.get('/restaurants/:restaurantId/staff/:staffId/permissions', authorize(['super_admin']), getRestaurantStaffPermissions);
router.put('/restaurants/:restaurantId/staff/:staffId/permissions', authorize(['super_admin']), updateRestaurantStaffPermissions);

// -------------------- إدارة المتاجر --------------------
router.get('/stores', (req, res, next) => {
  checkPlatformStaffPermission(req, res, next, 'manage_stores');
}, getAllStores);
router.get('/stores/:id', (req, res, next) => {
  checkPlatformStaffPermission(req, res, next, 'manage_stores');
}, getStoreDetails);
router.put('/stores/:id', authorize(['super_admin']), updateStore);
router.patch('/stores/:id/toggle', authorize(['super_admin']), toggleStoreStatus);
router.delete('/stores/:id', authorize(['super_admin']), deleteStore);
router.post('/stores/:id/reset-password', authorize(['super_admin']), resetStorePassword);

// -------------------- إدارة موظفي المتجر --------------------
router.get('/stores/:storeId/staff', authorize(['super_admin', 'owner']), getStoreStaff);
router.get('/stores/:storeId/staff/:staffId', authorize(['super_admin', 'owner']), getStoreStaffDetails);
router.post('/stores/:storeId/staff', authorize(['super_admin', 'owner']), createStoreStaff);
router.put('/stores/:storeId/staff/:staffId', authorize(['super_admin', 'owner']), updateStoreStaff);
router.patch('/stores/:storeId/staff/:staffId/toggle', authorize(['super_admin', 'owner']), toggleStoreStaffStatus);
router.put('/stores/:storeId/staff/:staffId/permissions', authorize(['super_admin', 'owner']), updateStoreStaffPermissions);
router.delete('/stores/:storeId/staff/:staffId', authorize(['super_admin', 'owner']), deleteStoreStaff);

// -------------------- إدارة موظفي المنصة (سوبر أدمن فقط) --------------------
router.get('/platform-staff', authorize(['super_admin']), getAllPlatformStaff);
router.post('/platform-staff', authorize(['super_admin']), createPlatformStaff);
router.get('/platform-staff/:staffId', authorize(['super_admin']), getPlatformStaffDetails);
router.put('/platform-staff/:staffId', authorize(['super_admin']), updatePlatformStaff);
router.patch('/platform-staff/:staffId/toggle', authorize(['super_admin']), togglePlatformStaffStatus);
router.delete('/platform-staff/:staffId', authorize(['super_admin']), deletePlatformStaff);
router.put('/platform-staff/:id/permissions', authorize(['super_admin']), updatePlatformStaffPermissions);

// -------------------- إدارة المستخدمين العامين --------------------
router.get('/users', (req, res, next) => {
  checkPlatformStaffPermission(req, res, next, 'manage_users');
}, getAllUsers);
router.get('/users/:id', (req, res, next) => {
  checkPlatformStaffPermission(req, res, next, 'manage_users');
}, getUserDetails);
router.patch('/users/:id/role', authorize(['super_admin']), updateUserRole);
router.patch('/users/:id/toggle', authorize(['super_admin']), toggleUserStatus);
router.delete('/users/:id', authorize(['super_admin']), deleteUser);
router.post('/users/:id/reset-password', authorize(['super_admin']), resetUserPassword);

// -------------------- إدارة الطلبات --------------------
router.get('/orders', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  const isSuperAdmin = user?.role === 'super_admin';
  const isPlatformStaff = user?.role === 'staff' && !user?.restaurantId && !user?.storeId;
  
  // موظف المنصة يحتاج إلى صلاحية canManageRestaurants أو canManageStores
  let hasPermission = false;
  if (isPlatformStaff) {
    const permissions = user?.permissions || {};
    hasPermission = permissions.canManageRestaurants === true || 
                    permissions.canManageStores === true;
  }
  
  if (isSuperAdmin || (isPlatformStaff && hasPermission)) {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      error: 'لا تملك صلاحية الوصول. هذه الصفحة مخصصة للمدير العام' 
    });
  }
}, getAllOrders);

router.get('/orders/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  const isSuperAdmin = user?.role === 'super_admin';
  const isPlatformStaff = user?.role === 'staff' && !user?.restaurantId && !user?.storeId;
  
  let hasPermission = false;
  if (isPlatformStaff) {
    const permissions = user?.permissions || {};
    hasPermission = permissions.canManageRestaurants === true || 
                    permissions.canManageStores === true;
  }
  
  if (isSuperAdmin || (isPlatformStaff && hasPermission)) {
    next();
  } else {
    res.status(403).json({ success: false, error: 'لا تملك صلاحية الوصول' });
  }
}, getOrderDetails);

router.patch('/orders/:id/status', authorize(['super_admin']), updateOrderStatus);
// -------------------- إدارة السائقين --------------------
router.get('/drivers', (req, res, next) => {
  checkPlatformStaffPermission(req, res, next, 'manage_drivers');
}, getAllDrivers);
router.get('/drivers/stats', authorize(['super_admin']), getDriversStats);
router.get('/drivers/businesses-without-drivers', authorize(['super_admin']), getBusinessesWithoutDrivers);
router.get('/drivers/:id', (req, res, next) => {
  checkPlatformStaffPermission(req, res, next, 'manage_drivers');
}, getDriverDetails);
router.post('/drivers', authorize(['super_admin']), createDriver);
router.patch('/drivers/:id/toggle', authorize(['super_admin']), toggleDriverStatus);
router.post('/drivers/:id/assign', authorize(['super_admin']), assignDriverToBusiness);
router.delete('/drivers/:id', authorize(['super_admin']), deleteDriver);

// -------------------- إدارة الخطط --------------------
router.get('/plans', authorize(['super_admin']), getAllPlans);
router.post('/plans', authorize(['super_admin']), createPlan);
router.put('/plans/:id', authorize(['super_admin']), updatePlan);
router.delete('/plans/:id', authorize(['super_admin']), deletePlan);

// -------------------- إعدادات المنصة --------------------
router.get('/settings', authorize(['super_admin']), getPlatformSettings);
router.put('/settings', authorize(['super_admin']), updatePlatformSettings);

// -------------------- طلبات الترقية --------------------
router.get('/upgrade-requests', authorize(['super_admin']), getUpgradeRequests);
router.post('/approve-upgrade/:requestId', authorize(['super_admin']), approveUpgrade);
router.post('/reject-upgrade/:requestId', authorize(['super_admin']), rejectUpgrade);

// -------------------- إحصائيات إضافية --------------------
router.get('/restaurants/:restaurantId/stats', authorize(['super_admin']), getRestaurantStats);
router.get('/stores/:storeId/stats', authorize(['super_admin']), getStoreStats);

// -------------------- إدارة صلاحيات موظفي المتاجر (سوبر أدمن) --------------------
router.put('/stores/:storeId/staff/:staffId/permissions', authorize(['super_admin']), updateStoreStaffPermissionsController);

export default router;