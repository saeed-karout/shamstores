// backend/src/controllers/platformSettingController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import ExtendedPlatformSetting from '../models/ExtendedPlatformSetting';
import { Op } from 'sequelize';
import { PlatformSetting } from '../models';

export const getAllPlatformSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const settings = await ExtendedPlatformSetting.findAll({
      order: [['setting_group', 'ASC'], ['key_name', 'ASC']]
    });
    
    // تجميع الإعدادات حسب المجموعة
    const groupedSettings: Record<string, any[]> = {};
    settings.forEach(setting => {
      const group = setting.setting_group;
      if (!groupedSettings[group]) {
        groupedSettings[group] = [];
      }
      groupedSettings[group].push(setting);
    });
    
    res.json({ success: true, data: groupedSettings });
  } catch (error) {
    console.error('Error getting platform settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات المنصة' });
  }
};

export const getPlatformSetting = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { key } = req.params;
    
    const setting = await ExtendedPlatformSetting.findOne({
      where: { key_name: key }
    });
    
    if (!setting) {
      res.status(404).json({ success: false, error: 'الإعداد غير موجود' });
      return;
    }
    
    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error getting platform setting:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعداد' });
  }
};

export const updatePlatformSetting = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    const setting = await ExtendedPlatformSetting.findOne({
      where: { key_name: key }
    });
    
    if (!setting) {
      res.status(404).json({ success: false, error: 'الإعداد غير موجود' });
      return;
    }
    
    // ✅ استخدام is_editable بدلاً من isEditable
    if (!setting.is_editable && req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'لا يمكن تعديل هذا الإعداد' });
      return;
    }
    
    await setting.update({ 
      value,
      updated_by: req.user?.id
    });
    
    res.json({
      success: true,
      message: 'تم تحديث الإعداد بنجاح',
      data: setting
    });
  } catch (error) {
    console.error('Error updating platform setting:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعداد' });
  }
};

export const updateMultiplePlatformSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { settings } = req.body;
    
    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      const setting = await ExtendedPlatformSetting.findOne({
        where: { key_name: key }
      });
      
      // ✅ استخدام is_editable بدلاً من isEditable
      if (setting && (setting.is_editable || req.user?.role === 'super_admin')) {
        await setting.update({ 
          value,
          updated_by: req.user?.id
        });
        updates.push(key);
      }
    }
    
    res.json({
      success: true,
      message: `تم تحديث ${updates.length} إعداد بنجاح`,
      data: { updated: updates }
    });
  } catch (error) {
    console.error('Error updating multiple platform settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعدادات' });
  }
};

export const getPublicPlatformSettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const settings = await PlatformSetting.findAll({
      where: { isPublic: true }, // إضافة حقل isPublic في النموذج
      order: [['group', 'ASC'], ['key', 'ASC']]
    });

    const settingsMap: Record<string, any> = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });

    res.json({
      success: true,
      data: settingsMap
    });
  } catch (error) {
    console.error('Error getting public settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعدادات' });
  }
};