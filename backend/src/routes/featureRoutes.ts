// backend/src/routes/featureRoutes.ts

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllFeatures,
  getFeature,
  createFeature,
  updateFeature,
  deleteFeature,
  getBusinessFeatures,
  enableBusinessFeature,
  disableBusinessFeature,
  getMyFeatures,
  checkFeature
} from '../controllers/featureController';

const router = Router();

// جميع المسارات تتطلب مصادقة
router.use(authenticate);

// ==================== مسارات المستخدم العادي ====================
router.get('/my-features', getMyFeatures);
router.get('/check/:featureCode', checkFeature);

// ==================== مسارات إدارة الميزات (للسوبر أدمن فقط) ====================
router.use(authorize(['super_admin']));

router.get('/', getAllFeatures);
router.get('/:code', getFeature);
router.post('/', createFeature);
router.put('/:code', updateFeature);
router.delete('/:code', deleteFeature);

// ==================== مسارات ميزات العميل ====================
router.get('/business/:businessType/:businessId', getBusinessFeatures);
router.post('/business/:businessType/:businessId/enable/:featureCode', enableBusinessFeature);
router.delete('/business/:businessType/:businessId/disable/:featureCode', disableBusinessFeature);

export default router;