// backend/src/routes/supportRoutes.ts
//
// الدعم البشري ومركز المساعدة في لوحة التاجر.

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getSupportConfig,
  getOnboardingChecklist,
  getSupportSettings,
  updateSupportSettings
} from '../controllers/supportController';

const router = Router();

router.use(authenticate);

// التاجر وموظّفوه: رقم الدعم ومقاطع الشرح وقائمة البداية
router.get('/config', getSupportConfig);
router.get('/checklist', getOnboardingChecklist);

// المشرف: تعديل الرقم والمقاطع
router.get('/admin/settings', authorize(['super_admin']), getSupportSettings);
router.put('/admin/settings', authorize(['super_admin']), updateSupportSettings);

export default router;
