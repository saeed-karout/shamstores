// backend/src/routes/qrRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { checkPlanFeature } from '../middleware/checkPlan';
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
router.post('/restaurant', authenticate, checkPlanFeature('table_qr'), generateRestaurantQR);
router.post('/table/:tableId', authenticate, checkPlanFeature('table_qr'), generateTableQR);
router.post('/item/:itemId', authenticate, checkPlanFeature('table_qr'), generateItemQR);
router.post('/tables/all', authenticate, checkPlanFeature('table_qr'), generateAllTablesQR);

// ==================== مسارات المتجر (للمالك) ====================
router.post('/store', authenticate, checkPlanFeature('table_qr'), generateStoreQR);
router.post('/store-product/:productId', authenticate, checkPlanFeature('table_qr'), generateStoreProductQR);

// ==================== مسارات السوبر أدمن ====================
router.post('/admin/restaurant/:restaurantId', authenticate, checkPlanFeature('table_qr'), generateAdminRestaurantQR);
router.post('/admin/store/:storeId', authenticate, checkPlanFeature('table_qr'), generateAdminStoreQR);

export default router;
