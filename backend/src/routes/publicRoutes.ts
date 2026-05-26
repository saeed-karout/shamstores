import express from 'express';
import {
  getBusinessBySlug,
  getTableById,
  getProductById,
  getCategoriesBySlug,
  getMenuItemsBySlug,
  getProductsBySlug,
  getMenuItemById,
  createContactMessage
} from '../controllers/publicController';

const router = express.Router();

// ==================== المسارات العامة (بدون مصادقة) ====================

router.post('/contact-messages', createContactMessage);

// ✅ هذا هو المسار المطلوب - جلب بيانات المطعم/المتجر (باستخدام slug أو subdomain)
router.get('/:identifier', getBusinessBySlug);

// جلب فئات المطعم (باستخدام slug)
router.get('/:slug/categories', getCategoriesBySlug);

// جلب أطباق المطعم (باستخدام slug)
router.get('/:slug/menu', getMenuItemsBySlug);

// جلب منتجات المتجر (باستخدام slug)
router.get('/:slug/products', getProductsBySlug);

// جلب طاولة محددة (باستخدام ID)
router.get('/table/:tableId', getTableById);

// جلب طبق محدد (باستخدام ID)
router.get('/item/:itemId', getMenuItemById);

// جلب منتج محدد (باستخدام ID)
router.get('/product/:productId', getProductById);

export default router;