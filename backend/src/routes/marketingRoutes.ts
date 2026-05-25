// backend/src/routes/marketingRoutes.ts

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { checkPlanFeature } from '../middleware/checkPlan';
import {
  createMarketingSection,
  deleteMarketingSection,
  getMarketingSettings,
  updateMarketingSection,
  updateMarketingSectionOrder,
  getPublicMarketingData  // ✅ تأكد من وجود هذا الاستيراد
} from '../controllers/marketingController';

const router = Router();

// ==================== مسار عام (بدون مصادقة) ====================
router.get('/public', getPublicMarketingData as any);

// ==================== المسارات المحمية ====================
router.use(authenticate);
router.use(checkPlanFeature('promotions'));

router.get('/', authorize(['super_admin', 'owner']), getMarketingSettings);
router.put('/section-order', authorize(['super_admin', 'owner']), updateMarketingSectionOrder);
router.post('/sections', authorize(['super_admin', 'owner']), createMarketingSection);
router.put('/sections/:id', authorize(['super_admin', 'owner']), updateMarketingSection);
router.delete('/sections/:id', authorize(['super_admin', 'owner']), deleteMarketingSection);

export default router;
