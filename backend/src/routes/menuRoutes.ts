import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  getMenuItem,        // أضف هذا
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  getPublicMenu,
  getMenuItemByShare,
  fixMissingShareTokens,
  getMenuItemById
} from '../controllers/menuController';
import { authenticate, authorizeOwner, authorizeStaff } from '../middleware/auth';

const router = Router();

// ==================== المسارات العامة ====================

/**
 * @route   GET /api/menu/public/:slug
 * @desc    الحصول على القائمة العامة لمطعم
 * @access  Public
 */
router.get('/public/:slug', getPublicMenu);

/**
 * @route   GET /api/menu/share/:token
 * @desc    الحصول على عنصر قائمة عبر رمز المشاركة
 * @access  Public
 */
router.get('/share/:token', getMenuItemByShare);

// ==================== المسارات الخاصة ====================

// جميع المسارات التالية تحتاج مصادقة
router.use(authenticate);

// ==================== مسارات الفئات ====================

/**
 * @route   GET /api/menu/categories
 * @desc    الحصول على جميع الفئات
 * @access  Private (Owner/Staff)
 */
router.get('/categories', authorizeStaff, getCategories);

/**
 * @route   POST /api/menu/categories
 * @desc    إنشاء فئة جديدة
 * @access  Private (Owner)
 */
router.post('/categories', authorizeOwner, createCategory);

/**
 * @route   PUT /api/menu/categories/:id
 * @desc    تحديث فئة
 * @access  Private (Owner)
 */
router.put('/categories/:id', authorizeOwner, updateCategory);

/**
 * @route   DELETE /api/menu/categories/:id
 * @desc    حذف فئة
 * @access  Private (Owner)
 */
router.delete('/categories/:id', authorizeOwner, deleteCategory);

// ==================== مسارات عناصر القائمة ====================

/**
 * @route   GET /api/menu/items
 * @desc    الحصول على جميع عناصر القائمة
 * @access  Private (Owner/Staff)
 */
router.get('/items', authorizeStaff, getMenuItems);

/**
 * @route   GET /api/menu/items/:id
 * @desc    الحصول على عنصر محدد
 * @access  Private (Owner/Staff)
 */
router.get('/items/:id', authorizeStaff, getMenuItem);  // أضف هذا

/**
 * @route   POST /api/menu/items
 * @desc    إنشاء عنصر جديد
 * @access  Private (Owner)
 */
router.post('/items', authorizeOwner, createMenuItem);

/**
 * @route   PUT /api/menu/items/:id
 * @desc    تحديث عنصر
 * @access  Private (Owner)
 */
router.put('/items/:id', authorizeOwner, updateMenuItem);

/**
 * @route   DELETE /api/menu/items/:id
 * @desc    حذف عنصر
 * @access  Private (Owner)
 */
router.delete('/items/:id', authorizeOwner, deleteMenuItem);

/**
 * @route   PATCH /api/menu/items/:id/toggle
 * @desc    تغيير حالة توفر عنصر
 * @access  Private (Owner/Staff)
 */
router.patch('/items/:id/toggle', authorizeStaff, toggleAvailability);


/**
 * @route   POST /api/menu/fix-tokens
 * @desc    إصلاح share tokens للعناصر القديمة
 * @access  Private (Owner)
 */
router.post('/fix-tokens', authorizeOwner, fixMissingShareTokens);


/**
 * @route   GET /api/menu/items/:id
 * @desc    الحصول على عنصر محدد بواسطة ID
 * @access  Private (Owner/Staff)
 */
router.get('/items/:id', authorizeStaff, getMenuItemById);

export default router;