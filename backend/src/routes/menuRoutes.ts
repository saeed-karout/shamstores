// backend/src/routes/menuRoutes.ts
import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  getMenuItem,
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
router.get('/public/:slug', getPublicMenu);
router.get('/share/:token', getMenuItemByShare);

// ==================== المسارات الخاصة ====================
router.use(authenticate);

// مسارات الفئات
router.get('/categories', authorizeStaff, getCategories);
router.post('/categories', authorizeOwner, createCategory);
router.put('/categories/:id', authorizeOwner, updateCategory);
router.delete('/categories/:id', authorizeOwner, deleteCategory);

// مسارات عناصر القائمة
router.get('/items', authorizeStaff, getMenuItems);
router.get('/items/:id', authorizeStaff, getMenuItem);
router.post('/items', authorizeOwner, createMenuItem);
router.put('/items/:id', authorizeOwner, updateMenuItem);
router.delete('/items/:id', authorizeOwner, deleteMenuItem);
router.patch('/items/:id/toggle', authorizeStaff, toggleAvailability);

// مسارات إضافية
router.post('/fix-tokens', authorizeOwner, fixMissingShareTokens);

export default router;