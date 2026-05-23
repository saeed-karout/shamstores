// backend/src/routes/qrRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  generateRestaurantQR,
  generateTableQR,
  generateItemQR,
  generateStoreQR,
  generateStoreProductQR,
  generateAdminRestaurantQR,
  generateAdminStoreQR,
  generateAllTablesQR
} from '../controllers/qrController';

const router = Router();

// ==================== مسارات المطعم (للمالك) ====================
router.post('/restaurant', authenticate, generateRestaurantQR);
router.post('/table/:tableId', authenticate, generateTableQR);
router.post('/item/:itemId', authenticate, generateItemQR);
router.post('/tables/all', authenticate, generateAllTablesQR);

// ==================== مسارات المتجر (للمالك) ====================
router.post('/store', authenticate, generateStoreQR);
router.post('/store-product/:productId', authenticate, generateStoreProductQR);

// ==================== مسارات السوبر أدمن ====================
router.post('/admin/restaurant/:restaurantId', authenticate, generateAdminRestaurantQR);
router.post('/admin/store/:storeId', authenticate, generateAdminStoreQR);

export default router;