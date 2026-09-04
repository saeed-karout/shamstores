// backend/src/controllers/platformSettingController.ts

import { Response } from 'express';
import {
  getUsdRate,
  setUsdRate,
  BASE_CURRENCY,
  MIN_USD_RATE,
  MAX_USD_RATE
} from '../services/currency.service';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';

// ==================== دوال مساعدة ====================

const isSuperAdmin = (req: AuthRequest): boolean => {
  return req.user?.role === 'super_admin';
};


// backend/src/controllers/platformSettingController.ts

// أضف هذه الدالة الجديدة
export const getSeoSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    // جلب جميع إعدادات SEO (من general group)
    const allSettings = await prisma.extendedPlatformSetting.findMany({
      where: {
        OR: [
          { keyName: { startsWith: 'seo_' } },
          { keyName: { startsWith: 'og_' } },
          { keyName: { startsWith: 'twitter_' } },
          { keyName: { startsWith: 'schema_org_' } },
          { keyName: 'alternate_languages' },
          { keyName: 'google_analytics_id' },
          { keyName: 'facebook_pixel_id' },
          { keyName: 'google_tag_manager_id' },
          { keyName: 'revisit_after' },
          { keyName: 'geo_region' },
          { keyName: 'geo_placename' },
          { keyName: 'geo_position' },
          { keyName: 'icbm' }
        ]
      },
      orderBy: { keyName: 'asc' }
    });

    res.json({ 
      success: true, 
      data: {
        seo: allSettings.map(s => ({
          id: s.id,
          key_name: s.keyName,
          value: s.value,
          type: s.type,
          setting_group: 'seo',
          description: s.description,
          is_public: s.isPublic,
          is_editable: s.isEditable
        }))
      }
    });
  } catch (error) {
    console.error('Error getting SEO settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات SEO' });
  }
};

// تعديل getAllPlatformSettings لتشمل إعدادات SEO في مجموعة seo
export const getAllPlatformSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const settings = await prisma.extendedPlatformSetting.findMany({
      orderBy: [
        { settingGroup: 'asc' },
        { keyName: 'asc' }
      ]
    });
    
    // تجميع الإعدادات حسب المجموعة
    const groupedSettings: Record<string, any[]> = {};
    
    settings.forEach(setting => {
      let group = setting.settingGroup;
      
      // إعادة توجيه إعدادات SEO إلى مجموعة منفصلة
      const isSeoSetting = 
        setting.keyName.startsWith('seo_') ||
        setting.keyName.startsWith('og_') ||
        setting.keyName.startsWith('twitter_') ||
        setting.keyName.startsWith('schema_org_') ||
        ['alternate_languages', 'google_analytics_id', 'facebook_pixel_id', 
         'google_tag_manager_id', 'revisit_after', 'geo_region', 
         'geo_placename', 'geo_position', 'icbm'].includes(setting.keyName);
      
      if (isSeoSetting) {
        group = 'seo';
      }
      
      if (!groupedSettings[group]) {
        groupedSettings[group] = [];
      }
      
      groupedSettings[group].push({
        id: setting.id,
        key_name: setting.keyName,
        value: setting.value,
        type: setting.type,
        setting_group: group,
        description: setting.description,
        is_public: setting.isPublic,
        is_editable: setting.isEditable,
        created_by: setting.createdBy,
        updated_by: setting.updatedBy,
        created_at: setting.createdAt,
        updated_at: setting.updatedAt
      });
    });
    
    res.json({ success: true, data: groupedSettings });
  } catch (error) {
    console.error('Error getting platform settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات المنصة' });
  }
};


// backend/src/controllers/platformSettingController.ts - أضف هذه الدوال

// ==================== الحصول على إعداد وضع الصيانة ====================

export const getMaintenanceMode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const setting = await prisma.extendedPlatformSetting.findUnique({
      where: { keyName: 'maintenance_mode' }
    });
    
    res.json({ 
      success: true, 
      data: { 
        enabled: setting?.value === 'true',
        message: setting?.value === 'true' ? await getMaintenanceMessage() : null
      } 
    });
  } catch (error) {
    console.error('Error getting maintenance mode:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب حالة الصيانة' });
  }
};

// ==================== تبديل وضع الصيانة ====================

export const toggleMaintenanceMode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;
    
    const { enabled } = req.body;
    
    const setting = await prisma.extendedPlatformSetting.upsert({
      where: { keyName: 'maintenance_mode' },
      update: { value: enabled ? 'true' : 'false', updatedBy: req.user?.id },
      create: {
        keyName: 'maintenance_mode',
        value: enabled ? 'true' : 'false',
        type: 'boolean',
        settingGroup: 'general',
        isPublic: true,
        isEditable: true,
        description: 'تفعيل وضع الصيانة',
        createdBy: req.user?.id,
        updatedBy: req.user?.id
      }
    });
    
    res.json({ 
      success: true, 
      message: enabled ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة',
      data: { enabled: setting.value === 'true' }
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تبديل وضع الصيانة' });
  }
};

async function getMaintenanceMessage(): Promise<string> {
  const message = await prisma.extendedPlatformSetting.findUnique({
    where: { keyName: 'maintenance_message' }
  });
  return message?.value || 'نعمل على تحسين المنصة، نعتذر عن الإزعاج';
}

const ensureSuperAdmin = (req: AuthRequest, res: Response): boolean => {
  if (!isSuperAdmin(req)) {
    res.status(403).json({ success: false, error: 'غير مصرح. هذه الصلاحية متاحة فقط للمدير العام' });
    return false;
  }
  return true;
};

// ==================== جلب جميع إعدادات المنصة (للسوبر أدمن) ====================
// backend/src/controllers/platformSettingController.ts

// backend/src/controllers/platformSettingController.ts
// أضف هذه الدالة إذا لم تكن موجودة

export const getAllPlatformSettingsCombined = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!isSuperAdmin(req)) {
      res.status(403).json({ 
        success: false, 
        error: 'غير مصرح. هذه الصلاحية متاحة فقط للمدير العام' 
      });
      return;
    }

    // جلب الإعدادات من ExtendedPlatformSetting
    const extendedSettings = await prisma.extendedPlatformSetting.findMany({
      orderBy: [{ settingGroup: 'asc' }, { keyName: 'asc' }]
    });

    // جلب الإعدادات من PlatformSetting
    const platformSettings = await prisma.platformSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }]
    });

    // دمج الإعدادات
    const groupedSettings: Record<string, any[]> = {};

    // معالجة ExtendedPlatformSetting
    extendedSettings.forEach(setting => {
      const group = setting.settingGroup;
      if (!groupedSettings[group]) {
        groupedSettings[group] = [];
      }
      groupedSettings[group].push({
        id: setting.id,
        key_name: setting.keyName,
        value: setting.value,
        type: setting.type,
        setting_group: setting.settingGroup,
        description: setting.description,
        is_public: setting.isPublic,
        is_editable: setting.isEditable,
        created_by: setting.createdBy,
        updated_by: setting.updatedBy,
        created_at: setting.createdAt,
        updated_at: setting.updatedAt
      });
    });

    // معالجة PlatformSetting وتحويلها إلى نفس الهيكل
    const existingKeys = new Set<string>();
    Object.values(groupedSettings).forEach(group => {
      group.forEach(setting => {
        existingKeys.add(setting.key_name);
      });
    });

    platformSettings.forEach(setting => {
      const group = setting.group;
      
      // تجنب التكرار
      if (existingKeys.has(setting.key)) {
        return;
      }
      
      if (!groupedSettings[group]) {
        groupedSettings[group] = [];
      }
      
      groupedSettings[group].push({
        id: setting.id,
        key_name: setting.key,
        value: setting.value,
        type: setting.type,
        setting_group: setting.group,
        description: setting.description || '',
        is_public: setting.isPublic || true,
        is_editable: true,
        created_by: null,
        updated_by: null,
        created_at: setting.createdAt,
        updated_at: setting.updatedAt
      });
    });

    res.json({ success: true, data: groupedSettings });
  } catch (error) {
    console.error('Error getting combined platform settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات المنصة' });
  }
};


// ==================== جلب إعداد واحد ====================

export const getPlatformSetting = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { key } = req.params;
    
    const setting = await prisma.extendedPlatformSetting.findUnique({
      where: { keyName: key }
    });
    
    if (!setting) {
      res.status(404).json({ success: false, error: 'الإعداد غير موجود' });
      return;
    }
    
    res.json({ 
      success: true, 
      data: {
        id: setting.id,
        key_name: setting.keyName,
        value: setting.value,
        type: setting.type,
        setting_group: setting.settingGroup,
        description: setting.description,
        is_public: setting.isPublic,
        is_editable: setting.isEditable
      }
    });
  } catch (error) {
    console.error('Error getting platform setting:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعداد' });
  }
};

// ==================== تحديث إعداد واحد ====================

export const updatePlatformSetting = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { key } = req.params;
    const { value } = req.body;
    
    const setting = await prisma.extendedPlatformSetting.findUnique({
      where: { keyName: key }
    });
    
    if (!setting) {
      res.status(404).json({ success: false, error: 'الإعداد غير موجود' });
      return;
    }
    
    const updatedSetting = await prisma.extendedPlatformSetting.update({
      where: { keyName: key },
      data: { 
        value: String(value),
        updatedBy: req.user?.id
      }
    });
    
    res.json({
      success: true,
      message: 'تم تحديث الإعداد بنجاح',
      data: {
        id: updatedSetting.id,
        key_name: updatedSetting.keyName,
        value: updatedSetting.value,
        type: updatedSetting.type,
        setting_group: updatedSetting.settingGroup,
        description: updatedSetting.description,
        is_public: updatedSetting.isPublic,
        is_editable: updatedSetting.isEditable
      }
    });
  } catch (error) {
    console.error('Error updating platform setting:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعداد' });
  }
};

// ==================== تحديث عدة إعدادات ====================

export const updateMultiplePlatformSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ success: false, error: 'بيانات غير صالحة' });
      return;
    }
    
    const updates: string[] = [];
    const errors: string[] = [];
    
    for (const [key, value] of Object.entries(settings)) {
      try {
        const setting = await prisma.extendedPlatformSetting.findUnique({
          where: { keyName: key }
        });
        
        if (setting) {
          await prisma.extendedPlatformSetting.update({
            where: { keyName: key },
            data: { 
              value: String(value),
              updatedBy: req.user?.id
            }
          });
          updates.push(key);
        } else {
          await prisma.extendedPlatformSetting.create({
            data: {
              keyName: key,
              value: String(value),
              type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string',
              settingGroup: 'general',
              isPublic: true,
              isEditable: true,
              createdBy: req.user?.id,
              updatedBy: req.user?.id
            }
          });
          updates.push(key);
        }
      } catch (error) {
        console.error(`Error updating setting ${key}:`, error);
        errors.push(key);
      }
    }
    
    res.json({
      success: true,
      message: `تم تحديث ${updates.length} إعداد بنجاح${errors.length > 0 ? `، فشل تحديث ${errors.length} إعداد` : ''}`,
      data: { updated: updates, failed: errors }
    });
  } catch (error) {
    console.error('Error updating multiple platform settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعدادات' });
  }
};

// ==================== جلب الإعدادات العامة (للواجهة الأمامية - بدون مصادقة) ====================

export const getPublicPlatformSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const settings = await prisma.platformSetting.findMany({
      where: { isPublic: true },
      orderBy: [
        { group: 'asc' },
        { key: 'asc' }
      ]
    });

    const settingsMap: Record<string, any> = {};
    settings.forEach(setting => {
      let value: any = setting.value;
      
      if (setting.type === 'boolean') {
        value = setting.value === 'true';
      } else if (setting.type === 'number') {
        value = Number(setting.value);
      } else if (setting.type === 'json') {
        try {
          value = JSON.parse(setting.value);
        } catch {
          value = {};
        }
      }
      
      settingsMap[setting.key] = value;
    });

    res.json({
      success: true,
      data: settingsMap
    });
  } catch (error) {
    console.error('Error getting public settings:', error);
    res.json({
      success: true,
      data: {
        site_name: 'شام ستورز',
        site_name_en: 'Sham Stores',
        site_logo: '',
        site_favicon: '',
        primary_color: '#C8E235',
        secondary_color: '#10B981',
        maintenance_mode: false,
        allow_registration: true,
        require_email_verification: false,
        max_login_attempts: 5,
        session_timeout_minutes: 720,
        default_currency: 'SYP',
        currency_symbol: 'ر.س',
        contact_email: 'support@digitalmenu.com',
        contact_phone: '+966 123456789',
        default_delivery_fee: 5,
        free_delivery_threshold: 100,
        estimated_delivery_time: 45
      }
    });
  }
};

// ==================== إنشاء إعداد جديد ====================

export const createPlatformSetting = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { key, value, type, group, description, isPublic } = req.body;
    
    if (!key || value === undefined) {
      res.status(400).json({ success: false, error: 'المفتاح والقيمة مطلوبان' });
      return;
    }
    
    const existing = await prisma.extendedPlatformSetting.findUnique({
      where: { keyName: key }
    });
    
    if (existing) {
      res.status(400).json({ success: false, error: 'الإعداد موجود بالفعل' });
      return;
    }
    
    const newSetting = await prisma.extendedPlatformSetting.create({
      data: {
        keyName: key,
        value: String(value),
        type: (type || 'string') as any,
        settingGroup: (group || 'general') as any,
        description: description || null,
        isPublic: isPublic || false,
        isEditable: true,
        createdBy: req.user?.id,
        updatedBy: req.user?.id
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الإعداد بنجاح',
      data: {
        id: newSetting.id,
        key_name: newSetting.keyName,
        value: newSetting.value,
        type: newSetting.type,
        setting_group: newSetting.settingGroup,
        description: newSetting.description,
        is_public: newSetting.isPublic,
        is_editable: newSetting.isEditable
      }
    });
  } catch (error) {
    console.error('Error creating platform setting:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الإعداد' });
  }
};

// ==================== حذف إعداد ====================

export const deletePlatformSetting = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { key } = req.params;
    
    const setting = await prisma.extendedPlatformSetting.findUnique({
      where: { keyName: key }
    });
    
    if (!setting) {
      res.status(404).json({ success: false, error: 'الإعداد غير موجود' });
      return;
    }
    
    await prisma.extendedPlatformSetting.delete({
      where: { keyName: key }
    });
    
    res.json({
      success: true,
      message: 'تم حذف الإعداد بنجاح'
    });
  } catch (error) {
    console.error('Error deleting platform setting:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الإعداد' });
  }
};

// ==================== جلب إعدادات بواسطة المجموعة ====================

export const getPlatformSettingsByGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { group } = req.params;
    
    const settings = await prisma.extendedPlatformSetting.findMany({
      where: { settingGroup: group as any },
      orderBy: { keyName: 'asc' }
    });
    
    const formattedSettings = settings.map(setting => ({
      id: setting.id,
      key_name: setting.keyName,
      value: setting.value,
      type: setting.type,
      setting_group: setting.settingGroup,
      description: setting.description,
      is_public: setting.isPublic,
      is_editable: setting.isEditable
    }));
    
    res.json({ success: true, data: formattedSettings });
  } catch (error) {
    console.error('Error getting settings by group:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعدادات' });
  }
};

// ==================== تحديث إعدادات المنصة الرئيسية ====================

export const updatePlatformSettingsMain = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ success: false, error: 'بيانات غير صالحة' });
      return;
    }
    
    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      const result = await prisma.platformSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string',
          group: 'general',
          isPublic: true
        }
      });
      results.push({
        key: result.key,
        value: result.value,
        type: result.type
      });
    }
    
    res.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      data: results
    });
  } catch (error) {
    console.error('Error updating main settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعدادات' });
  }
};

// ==================== الحصول على إعداد واحد من PlatformSetting ====================

export const getPlatformSettingSimple = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { key } = req.params;
    
    const setting = await prisma.platformSetting.findUnique({
      where: { key }
    });
    
    if (!setting) {
      res.status(404).json({ success: false, error: 'الإعداد غير موجود' });
      return;
    }
    
    let value: any = setting.value;
    if (setting.type === 'boolean') {
      value = setting.value === 'true';
    } else if (setting.type === 'number') {
      value = Number(setting.value);
    } else if (setting.type === 'json') {
      try {
        value = JSON.parse(setting.value);
      } catch {
        value = {};
      }
    }
    
    res.json({ 
      success: true, 
      data: {
        key: setting.key,
        value,
        type: setting.type,
        group: setting.group,
        description: setting.description,
        isPublic: setting.isPublic
      }
    });
  } catch (error) {
    console.error('Error getting platform setting:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعداد' });
  }
};

// ==================== إعادة تعيين الإعدادات إلى القيم الافتراضية ====================

export const resetPlatformSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const defaultSettings = [
      { keyName: 'site_name', value: 'شام ستورز', type: 'string' as const, settingGroup: 'general' as const, isPublic: true },
      { keyName: 'site_name_en', value: 'Sham Stores', type: 'string' as const, settingGroup: 'general' as const, isPublic: true },
      { keyName: 'maintenance_mode', value: 'false', type: 'boolean' as const, settingGroup: 'general' as const, isPublic: true },
      { keyName: 'allow_registration', value: 'true', type: 'boolean' as const, settingGroup: 'auth' as const, isPublic: true },
      { keyName: 'require_email_verification', value: 'false', type: 'boolean' as const, settingGroup: 'auth' as const, isPublic: true },
      { keyName: 'max_login_attempts', value: '5', type: 'number' as const, settingGroup: 'security' as const, isPublic: true },
      { keyName: 'session_timeout_minutes', value: '720', type: 'number' as const, settingGroup: 'security' as const, isPublic: true },
      { keyName: 'default_currency', value: 'SYP', type: 'string' as const, settingGroup: 'payment' as const, isPublic: true },
      { keyName: 'currency_symbol', value: 'ر.س', type: 'string' as const, settingGroup: 'payment' as const, isPublic: true },
      { keyName: 'enable_cash_on_delivery', value: 'true', type: 'boolean' as const, settingGroup: 'payment' as const, isPublic: true },
      { keyName: 'enable_online_payment', value: 'false', type: 'boolean' as const, settingGroup: 'payment' as const, isPublic: true },
      { keyName: 'default_delivery_fee', value: '5', type: 'number' as const, settingGroup: 'delivery' as const, isPublic: true },
      { keyName: 'free_delivery_threshold', value: '100', type: 'number' as const, settingGroup: 'delivery' as const, isPublic: true },
      { keyName: 'estimated_delivery_time', value: '45', type: 'number' as const, settingGroup: 'delivery' as const, isPublic: true },
      { keyName: 'contact_email', value: 'support@digitalmenu.com', type: 'string' as const, settingGroup: 'general' as const, isPublic: true },
      { keyName: 'contact_phone', value: '+966 123456789', type: 'string' as const, settingGroup: 'general' as const, isPublic: true },
      { keyName: 'contact_whatsapp', value: '+966 123456789', type: 'string' as const, settingGroup: 'general' as const, isPublic: true },
      { keyName: 'primary_color', value: '#C8E235', type: 'string' as const, settingGroup: 'general' as const, isPublic: true },
      { keyName: 'secondary_color', value: '#10B981', type: 'string' as const, settingGroup: 'general' as const, isPublic: true }
    ];

    for (const defaultSetting of defaultSettings) {
      await prisma.extendedPlatformSetting.upsert({
        where: { keyName: defaultSetting.keyName },
        update: {
          value: defaultSetting.value,
          type: defaultSetting.type,
          settingGroup: defaultSetting.settingGroup,
          isPublic: defaultSetting.isPublic,
          updatedBy: req.user?.id
        },
        create: {
          keyName: defaultSetting.keyName,
          value: defaultSetting.value,
          type: defaultSetting.type,
          settingGroup: defaultSetting.settingGroup,
          isPublic: defaultSetting.isPublic,
          isEditable: true,
          createdBy: req.user?.id,
          updatedBy: req.user?.id
        }
      });
    }

    res.json({
      success: true,
      message: 'تم إعادة تعيين الإعدادات إلى القيم الافتراضية بنجاح'
    });
  } catch (error) {
    console.error('Error resetting platform settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إعادة تعيين الإعدادات' });
  }
};

// ==================== تصدير جميع الدوال ====================

export default {
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
  resetPlatformSettings
};

// ==================== سعر صرف الدولار ====================
//
// نقطة مخصّصة لا تمرّ بالحفظ العام للإعدادات: هذه القيمة تضرب في كل سعر
// على المنصة، وخانة زائدة أو ناقصة تغيّر أسعار كل التجّار دفعةً واحدة.
// فتمرّ بـ setUsdRate الذي يفحص النطاق ويرفض ما دونه.

export const getExchangeRate = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rate = await getUsdRate();
    res.json({
      success: true,
      data: {
        usdRate: rate,
        baseCurrency: BASE_CURRENCY,
        minRate: MIN_USD_RATE,
        maxRate: MAX_USD_RATE,
        /** صحيح حين لا سعر مضبوط — عندها يتعذّر العرض بالدولار على المنصة كلها */
        isConfigured: rate !== null
      }
    });
  } catch (error) {
    console.error('Error reading exchange rate:', error);
    res.status(500).json({ success: false, error: 'تعذّر قراءة سعر الصرف' });
  }
};

export const updateExchangeRate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await setUsdRate(req.body?.usdRate);

    if (!result.ok) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    console.warn(
      `💱 سعر الصرف غُيّر إلى ${result.rate} ل.س للدولار — بواسطة ${req.user?.email || 'غير معروف'}`
    );

    res.json({
      success: true,
      message: 'تم تحديث سعر الصرف — يسري فوراً على المنصة كلها',
      data: { usdRate: result.rate }
    });
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    res.status(500).json({ success: false, error: 'تعذّر حفظ سعر الصرف' });
  }
};
