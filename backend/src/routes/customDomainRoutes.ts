// backend/src/routes/customDomainRoutes.ts

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { checkPlanFeature } from '../middleware/checkPlan';
import { dnsLookupLimiter } from '../middleware/security';
import {
  verifyCustomDomain,
  removeCustomDomain,
  getDnsSettings,
  getCustomDomainStatus,
  updateSubdomain,
  checkSubdomainAvailability
} from '../controllers/customDomainController';

const router = Router();

router.use(authenticate);
router.use(authorize(['owner', 'super_admin']));

// ==================== الـ subdomain (متاح لكل الخطط) ====================
router.get('/subdomain/check', checkSubdomainAvailability);
router.put('/subdomain', updateSubdomain);

// ==================== الحالة (متاحة دائماً حتى تعرض الواجهة الترقية) ====================
router.get('/status', getCustomDomainStatus);

// ==================== النطاق المخصص (يتطلب خطة تدعمه) ====================
router.use(checkPlanFeature('custom_domain'));

router.get('/dns-settings', getDnsSettings);
router.post('/verify-domain', dnsLookupLimiter, verifyCustomDomain);
router.delete('/remove-domain', removeCustomDomain);

export default router;
