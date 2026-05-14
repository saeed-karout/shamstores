// backend/src/routes/adminRoutes.ts

import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { 
  // إحصائيات عامة
  getPlatformStats,
  
  // إدارة المطاعم
  getAllRestaurants,
  toggleRestaurantStatus,
  deleteRestaurant,
  getRestaurantDetails,
  
  // إدارة المتاجر
  getAllStores,
  toggleStoreStatus,
  deleteStore,
  getStoreDetails,
  
  // إدارة المستخدمين
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getUserDetails,
  
  // إدارة الطلبات
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  
  // إدارة السائقين
  getAllDrivers,
  toggleDriverStatus,
  deleteDriver,
  getDriverDetails,
  
  // إدارة الخطط
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  
  // إعدادات المنصة
  getPlatformSettings,
  updatePlatformSettings,
  
  // إحصائيات إضافية
  getRevenueStats,
  getOrderStatsByPeriod,
  updateRestaurant,
  resetRestaurantPassword,
  updateStore,
  resetStorePassword,
  
  // طلبات الترقية
  getUpgradeRequests,
  getUserUpgradeRequests,
  createUpgradeRequest,
  approveUpgrade,
  rejectUpgrade,
  
  // أدوات مساعدة
  checkSlugAvailability,
  resetUserPassword,
  
  // إدارة موظفي المتجر (للسوبر أدمن)
  getStoreStaff,
  getStoreStaffDetails,
  createStoreStaff,
  updateStoreStaff,
  toggleStoreStaffStatus,
  updateStoreStaffPermissions,
  deleteStoreStaff,
  
  // ✅ إدارة موظفي المنصة (للسوبر أدمن)
  getAllPlatformStaff,
  getPlatformStaffDetails,
  updatePlatformStaff,
  togglePlatformStaffStatus,
  deletePlatformStaff
} from '../controllers/adminController';
import { User } from '../models';

const router = Router();

// ==================== مسارات عامة (لا تتطلب أي صلاحيات - للاستخدام لمرة واحدة) ====================
// ⚠️ IMPORTANT: احذف هذا الـ endpoint بعد الاستخدام مباشرة!
router.post('/make-super-user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    console.log('📝 Attempting to make super user:', userId);
    
    // تأكد من أن المستخدم المطلوب موجود
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ 
        success: false, 
        error: 'المستخدم غير موجود' 
      });
    }
    
    console.log('📝 Current user info:', {
      id: user.id,
      email: user.email,
      currentRole: user.role
    });
    
    // تغيير الصلاحية إلى super_admin
    const oldRole = user.role;
    user.role = 'super_admin';
    await user.save();
    
    console.log('✅ User updated successfully:', {
      id: user.id,
      email: user.email,
      oldRole: oldRole,
      newRole: user.role
    });
    
    res.json({
      success: true,
      message: `تم ترقية المستخدم ${user.email || userId} من ${oldRole} إلى Super Admin بنجاح`,
      data: {
        id: user.id,
        email: user.email,
        old_role: oldRole,
        new_role: user.role
      }
    });
    
  } catch (error) {
    console.error('❌ Error making super user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في ترقية المستخدم',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// إضافة نسخة GET للاختبار من المتصفح (اختياري)
router.get('/make-super-user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'المستخدم غير موجود' 
      });
    }
    
    const oldRole = user.role;
    user.role = 'super_admin';
    await user.save();
    
    res.json({
      success: true,
      message: `تم ترقية المستخدم ${user.email} إلى Super Admin بنجاح`,
      data: {
        id: user.id,
        email: user.email,
        old_role: oldRole,
        new_role: user.role
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ' 
    });
  }
});

// ==================== باقي المسارات كما هي ====================
router.post('/upgrade-request', authenticate, createUpgradeRequest);
router.get('/user/upgrade-requests', authenticate, getUserUpgradeRequests);
router.get('/check-slug', authenticate, checkSlugAvailability);

// ==================== مسارات السوبر أدمن فقط ====================
router.use(authenticate);
router.use(authorize(['super_admin']));

// -------------------- إحصائيات عامة --------------------
router.get('/stats', getPlatformStats);
router.get('/revenue', getRevenueStats);
router.get('/orders/stats/:period', getOrderStatsByPeriod);

// -------------------- إدارة المطاعم --------------------
router.get('/restaurants', getAllRestaurants);
router.get('/restaurants/:id', getRestaurantDetails);
router.put('/restaurants/:id', updateRestaurant);
router.patch('/restaurants/:id/toggle', toggleRestaurantStatus);
router.delete('/restaurants/:id', deleteRestaurant);
router.post('/restaurants/:id/reset-password', resetRestaurantPassword);

// -------------------- إدارة المتاجر --------------------
router.get('/stores', getAllStores);
router.get('/stores/:id', getStoreDetails);
router.put('/stores/:id', updateStore);
router.patch('/stores/:id/toggle', toggleStoreStatus);
router.delete('/stores/:id', deleteStore);
router.post('/stores/:id/reset-password', resetStorePassword);

// -------------------- إدارة موظفي المتجر --------------------
router.get('/stores/:storeId/staff', getStoreStaff);
router.get('/stores/:storeId/staff/:staffId', getStoreStaffDetails);
router.post('/stores/:storeId/staff', createStoreStaff);
router.put('/stores/:storeId/staff/:staffId', updateStoreStaff);
router.patch('/stores/:storeId/staff/:staffId/toggle', toggleStoreStaffStatus);
router.put('/stores/:storeId/staff/:staffId/permissions', updateStoreStaffPermissions);
router.delete('/stores/:storeId/staff/:staffId', deleteStoreStaff);

// -------------------- إدارة موظفي المنصة --------------------
router.get('/staff', getAllPlatformStaff);
router.get('/staff/:staffId', getPlatformStaffDetails);
router.put('/staff/:staffId', updatePlatformStaff);
router.patch('/staff/:staffId/toggle', togglePlatformStaffStatus);
router.delete('/staff/:staffId', deletePlatformStaff);

// -------------------- إدارة المستخدمين العامين --------------------
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/toggle', toggleUserStatus);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetUserPassword);

// -------------------- إدارة الطلبات --------------------
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderDetails);
router.patch('/orders/:id/status', updateOrderStatus);

// -------------------- إدارة السائقين --------------------
router.get('/drivers', getAllDrivers);
router.get('/drivers/:id', getDriverDetails);
router.patch('/drivers/:id/toggle', toggleDriverStatus);
router.delete('/drivers/:id', deleteDriver);

// -------------------- إدارة الخطط --------------------
router.get('/plans', getAllPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// -------------------- إعدادات المنصة --------------------
router.get('/settings', getPlatformSettings);
router.put('/settings', updatePlatformSettings);

// -------------------- طلبات الترقية --------------------
router.get('/upgrade-requests', getUpgradeRequests);
router.post('/approve-upgrade/:requestId', approveUpgrade);
router.post('/reject-upgrade/:requestId', rejectUpgrade);

export default router;