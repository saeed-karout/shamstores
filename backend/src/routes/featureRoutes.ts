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
import {
  getMyFeatureCatalog,
  createFeatureRequest,
  getMyFeatureRequests,
  getAllFeatureRequests,
  approveFeatureRequest,
  rejectFeatureRequest
} from '../controllers/featureRequestController';

const router = Router();

// جميع المسارات تتطلب مصادقة
router.use(authenticate);

// ==================== مسارات التاجر ====================
//
// ⚠️ الترتيب مقصود: هذه قبل `router.use(authorize(['super_admin']))`.
// أي مسار للتاجر يُكتب بعده يصير محجوباً عنه بصمت.
router.get('/my-features', getMyFeatures);
router.get('/check/:featureCode', checkFeature);

// كتالوج الميزات المفردة وشراؤها — قسم التاجر المستقل عن الخطط
router.get('/catalog', getMyFeatureCatalog);
router.get('/my-requests', getMyFeatureRequests);
router.post('/requests', createFeatureRequest);

// ==================== مسارات إدارة الميزات (للسوبر أدمن فقط) ====================
router.use(authorize(['super_admin']));

// طلبات الشراء — قبل '/:code' وإلا التقطها كرمز ميزة اسمه "requests"
router.get('/requests', getAllFeatureRequests);
router.post('/requests/:id/approve', approveFeatureRequest);
router.post('/requests/:id/reject', rejectFeatureRequest);

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