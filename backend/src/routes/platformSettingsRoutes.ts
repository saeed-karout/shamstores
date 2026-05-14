// backend/src/routes/platformSettingsRoutes.ts

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllPlatformSettings,
  getPlatformSetting,
  updatePlatformSetting,
  updateMultiplePlatformSettings,
  getPublicPlatformSettings 
} from '../controllers/platformSettingController';

const router = Router();

// ✅ مسار عام (لا يحتاج مصادقة)
router.get('/public', getPublicPlatformSettings);

// مسارات الإدارة (تتطلب super_admin)
router.use(authenticate);
router.use(authorize(['super_admin']));

router.get('/', getAllPlatformSettings);
router.get('/:key', getPlatformSetting);
router.put('/:key', updatePlatformSetting);
router.put('/', updateMultiplePlatformSettings);

export default router;