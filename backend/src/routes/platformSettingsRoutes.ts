// backend/src/routes/platformSettingsRoutes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllPlatformSettings,
  getPlatformSetting,
  updatePlatformSetting,
  updateMultiplePlatformSettings,
  getPublicPlatformSettings,
  createPlatformSetting,
  deletePlatformSetting,
  getPlatformSettingsByGroup,
  updatePlatformSettingsMain,
  getPlatformSettingSimple,
  resetPlatformSettings,
  getMaintenanceMode,
  toggleMaintenanceMode,
  getAllPlatformSettingsCombined
} from '../controllers/platformSettingController';

const router = Router();

// ==================== مسارات عامة (بدون مصادقة) ====================
router.get('/public', getPublicPlatformSettings);
router.get('/maintenance-mode', getMaintenanceMode);

// ==================== جميع المسارات بعد هذا الخط تحتاج مصادقة ====================
router.use(authenticate);

// ==================== مسارات السوبر أدمن فقط ====================
router.use(authorize(['super_admin']));

// وضع الصيانة (للسوبر أدمن)
router.post('/maintenance-mode/toggle', toggleMaintenanceMode);

// جلب جميع الإعدادات مجتمعة (من كلا الجدولين)
router.get('/all', getAllPlatformSettingsCombined);

// إعدادات المنصة
router.get('/', getAllPlatformSettings);
router.get('/group/:group', getPlatformSettingsByGroup);
router.get('/:key', getPlatformSetting);
router.post('/', createPlatformSetting);
router.put('/:key', updatePlatformSetting);
router.put('/', updateMultiplePlatformSettings);
router.delete('/:key', deletePlatformSetting);
router.post('/reset', resetPlatformSettings);

// إعدادات بسيطة (PlatformSetting)
router.get('/simple/:key', getPlatformSettingSimple);
router.put('/simple', updatePlatformSettingsMain);

export default router;