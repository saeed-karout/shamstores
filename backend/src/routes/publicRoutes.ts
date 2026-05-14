// backend/src/routes/publicRoutes.ts

import { Router } from 'express';
import { extractSubdomain } from '../middleware/subdomain';
import {
  getBusinessBySubdomain,
  getTableBySubdomain,
  getProductBySubdomain,
  getCategories,
  getMenuItems,
  getProducts
} from '../controllers/publicController';

const router = Router();

// استخدام middleware استخراج الـ subdomain لجميع المسارات
router.use(extractSubdomain);

// تعريف المسارات (كلها تبدأ بـ /public)
router.get('/public', getBusinessBySubdomain);
router.get('/public/categories', getCategories);
router.get('/public/menu-items', getMenuItems);
router.get('/public/products', getProducts);
router.get('/public/table/:tableId', getTableBySubdomain);
router.get('/public/product/:productId', getProductBySubdomain);

export default router;