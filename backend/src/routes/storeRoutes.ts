// backend/src/routes/storeRoutes.ts

import { Router } from 'express';
import { authenticate, authorizeOwner } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  getProfile,
  updateProfile,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventoryStats,
  updateInventory,
  getStoreOrders,
  getStoreOrderStats,
  getStoreDrivers,
  getStoreOrderById,    
  updateStoreOrderStatus,
  createStoreDriver,
  getStoreCoupons,
  createStoreCoupon,
  updateStoreCoupon,
  deleteStoreCoupon,
  getTopProducts,
  uploadStoreLogo,
  uploadStoreCover,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
  getCategory,
  // دوال الإعدادات
  getStoreSettings,
  updateGeneralSettings,
  updateDesignSettings,
  updateDeliverySettings,
  updateSocialSettings,
  updatePaymentSettings,
  updateNotificationSettings,
  getDnsSettings,
  verifyCustomDomain,
  removeCustomDomain,
  // ✅ دوال الموظفين
  getStoreStaff,
  getStoreStaffDetails,
  updateStoreStaff,
  toggleStoreStaffStatus,
  deleteStoreStaff,
  updateStoreStaffPermissions,
  // ✅ الدوال العامة (Public Routes)
  getPublicStore,
  getPublicProduct,
  getPublicProducts,
  getPublicCategories,
  getPublicRelatedProducts
} from '../controllers/storeController';

const router = Router();

// ==================== 🆕 المسارات العامة (بدون مصادقة) ====================
// هذه المسارات تسبق middleware المصادقة لتكون متاحة للجميع
router.get('/public/:slug', getPublicStore);
router.get('/public/:slug/products', getPublicProducts);
router.get('/public/:slug/categories', getPublicCategories);
router.get('/public/:slug/product/:productId', getPublicProduct);
router.get('/public/:slug/related-products/:productId', getPublicRelatedProducts);

// ==================== مسارات المصادقة ====================
// جميع المسارات بعد هذا الخط تحتاج مصادقة
router.use(authenticate);
router.use(authorizeOwner);

// ==================== ملف المتجر ====================
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// ==================== رفع الصور ====================
router.post('/upload/logo', upload.single('logo'), uploadStoreLogo);
router.post('/upload/cover', upload.single('cover'), uploadStoreCover);

// ==================== المنتجات ====================
router.get('/products', getProducts);
router.get('/products/:id', getProduct);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.patch('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// ==================== المخزون ====================
router.get('/inventory/stats', getInventoryStats);
router.patch('/inventory/:productId', updateInventory);

// ==================== الطلبات ====================
router.get('/orders', getStoreOrders);
router.get('/orders/stats', getStoreOrderStats);
router.get('/orders/top-products', getTopProducts);
router.get('/orders/:id', getStoreOrderById);
router.patch('/orders/:id/status', updateStoreOrderStatus);

// ==================== الكوبونات ====================
router.get('/coupons', getStoreCoupons);
router.post('/coupons', createStoreCoupon);
router.put('/coupons/:id', updateStoreCoupon);
router.delete('/coupons/:id', deleteStoreCoupon);

// ==================== السائقين ====================
router.get('/drivers', getStoreDrivers);
router.post('/drivers', createStoreDriver);

// ==================== الفئات ====================
router.get('/categories', getCategories);
router.get('/categories/:id', getCategory);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// ==================== الموظفين ====================
router.get('/staff', getStoreStaff);
router.get('/staff/:staffId', getStoreStaffDetails);
router.put('/staff/:staffId', updateStoreStaff);
router.patch('/staff/:staffId/status', toggleStoreStaffStatus);
router.delete('/staff/:staffId', deleteStoreStaff);
router.put('/staff/:staffId/permissions', updateStoreStaffPermissions);

// ==================== إعدادات المتجر ====================
router.get('/settings', getStoreSettings);
router.get('/settings/me', getStoreSettings);
router.put('/settings/general', updateGeneralSettings);
router.put('/settings/design', updateDesignSettings);
router.put('/settings/delivery', updateDeliverySettings);
router.put('/settings/social', updateSocialSettings);
router.put('/settings/payment', updatePaymentSettings);
router.put('/settings/notifications', updateNotificationSettings);

// مسارات الدومين المخصص
router.get('/settings/domain/dns', getDnsSettings);
router.post('/settings/domain/verify', verifyCustomDomain);
router.delete('/settings/domain', removeCustomDomain);

// دعم المسارات التي تحتوي على storeId في URL (للتطوير أو السوبر أدمن)
router.get('/settings/:storeId', getStoreSettings);
router.put('/settings/:storeId/general', updateGeneralSettings);
router.put('/settings/:storeId/design', updateDesignSettings);
router.put('/settings/:storeId/delivery', updateDeliverySettings);
router.put('/settings/:storeId/social', updateSocialSettings);
router.put('/settings/:storeId/payment', updatePaymentSettings);
router.put('/settings/:storeId/notifications', updateNotificationSettings);
router.get('/settings/:storeId/domain/dns', getDnsSettings);
router.post('/settings/:storeId/domain/verify', verifyCustomDomain);
router.delete('/settings/:storeId/domain', removeCustomDomain);

export default router;