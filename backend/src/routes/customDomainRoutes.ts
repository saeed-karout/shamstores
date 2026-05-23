// backend/src/routes/customDomainRoutes.ts

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { checkPlanFeature } from '../middleware/checkPlan';
import {
  verifyCustomDomain,
  removeCustomDomain,
  getDnsSettings
} from '../controllers/customDomainController';

const router = Router();

// كل هذه المسارات تتطلب توثيق ووجود خطة تدعم الدومينات المخصصة
router.use(authenticate);
router.use(checkPlanFeature('hasCustomDomain'));

router.post('/verify-domain', verifyCustomDomain);
router.delete('/remove-domain', removeCustomDomain);
router.get('/dns-settings', getDnsSettings);

export default router;