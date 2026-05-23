// backend/src/routes/marketingRoutes.ts

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createMarketingSection,
  deleteMarketingSection,
  getMarketingSettings,
  updateMarketingSection,
  updateMarketingSectionOrder
} from '../controllers/marketingController';

const router = Router();

// ✅ جميع المسارات تحتاج مصادقة
router.use(authenticate);

// ✅ السماح لكل من super_admin و owner بالوصول
// مع فلترة في الـ controller حسب الدور
router.get('/', authorize(['super_admin', 'owner']), getMarketingSettings);
router.put('/section-order', authorize(['super_admin', 'owner']), updateMarketingSectionOrder);
router.post('/sections', authorize(['super_admin', 'owner']), createMarketingSection);
router.put('/sections/:id', authorize(['super_admin', 'owner']), updateMarketingSection);
router.delete('/sections/:id', authorize(['super_admin', 'owner']), deleteMarketingSection);

export default router;