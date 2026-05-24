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

// ==================== إعدادات المصادقة ====================

/**
 * @route   GET /api/platform-settings/auth
 * @desc    جلب إعدادات المصادقة والبريد الإلكتروني و Firebase
 * @access  Private (Super Admin only)
 */
router.get('/auth', async (req: any, res: any) => {
  try {
    if (!req.user || req.user.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const prisma = require('../services/prisma').default;

    const authSettings = await prisma.extendedPlatformSetting.findMany({
      where: {
        settingGroup: 'auth'
      },
      select: {
        id: true,
        keyName: true,
        value: true,
        type: true,
        description: true,
        isPublic: true,
        isEditable: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const formattedSettings: Record<string, any> = {};
    authSettings.forEach(setting => {
      formattedSettings[setting.keyName] = {
        value: setting.value,
        type: setting.type,
        description: setting.description,
        isPublic: setting.isPublic,
        isEditable: setting.isEditable,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt
      };
    });

    res.json({
      success: true,
      data: formattedSettings,
      count: authSettings.length
    });
  } catch (error) {
    console.error('Error fetching auth settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعدادات' });
  }
});

/**
 * @route   PUT /api/platform-settings/auth
 * @desc    تحديث إعدادات المصادقة والبريد الإلكتروني و Firebase
 * @access  Private (Super Admin only)
 */
router.put('/auth', async (req: any, res: any) => {
  try {
    if (!req.user || req.user.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ success: false, error: 'بيانات غير صالحة' });
      return;
    }

    const prisma = require('../services/prisma').default;
    const updates: string[] = [];
    const errors: Array<{ key: string; error: string }> = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        if (value === null || value === undefined || value === '') {
          errors.push({ key, error: 'القيمة فارغة' });
          continue;
        }

        const setting = await prisma.extendedPlatformSetting.findUnique({
          where: { keyName: key }
        });

        const stringValue = String(value);
        const settingType = typeof value === 'boolean' ? 'boolean' : 
                           typeof value === 'number' ? 'number' : 'string';

        if (setting) {
          await prisma.extendedPlatformSetting.update({
            where: { keyName: key },
            data: {
              value: stringValue,
              type: settingType,
              updatedBy: req.user?.id,
              updatedAt: new Date()
            }
          });
          updates.push(key);
        } else {
          await prisma.extendedPlatformSetting.create({
            data: {
              keyName: key,
              value: stringValue,
              type: settingType,
              settingGroup: 'auth',
              isPublic: false,
              isEditable: true,
              createdBy: req.user?.id,
              updatedBy: req.user?.id
            }
          });
          updates.push(key);
        }
      } catch (error) {
        console.error(`Error updating setting ${key}:`, error);
        errors.push({ 
          key, 
          error: error instanceof Error ? error.message : 'خطأ غير معروف' 
        });
      }
    }

    res.json({
      success: errors.length === 0 || updates.length > 0,
      message: `تم تحديث ${updates.length} من ${Object.keys(settings).length} إعداد`,
      data: { 
        updated: updates, 
        failed: errors,
        successCount: updates.length,
        failureCount: errors.length
      }
    });
  } catch (error) {
    console.error('Error updating auth settings:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'حدث خطأ في تحديث الإعدادات' 
    });
  }
});

export default router;