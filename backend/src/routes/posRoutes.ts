// backend/src/routes/posRoutes.ts
//
// الكاشير — إضافة مدفوعة.
//
// `pos` **ليست في بوابات الخطط**: لا تمنحها خطة، وتُشترى وحدها. ولذلك
// أُضيفت إلى `strictFeatures` في الحارس — بدونها كان الحارس يمرّرها لأي
// خطة مدفوعة، فتُفتح مجّاناً لمن لم يشترها.

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { checkPlanFeature } from '../middleware/checkPlan';
import {
  searchProducts,
  lookupBySku,
  createSale,
  getShiftSummary
} from '../controllers/posController';

const router = Router();

router.use(authenticate);
router.use(authorize(['owner', 'staff', 'super_admin']));
router.use(checkPlanFeature('pos'));

router.get('/products', searchProducts);
router.get('/sku/:sku', lookupBySku);
router.get('/shift', getShiftSummary);
router.post('/sale', createSale);

export default router;
