// backend/src/controllers/featureController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import Feature from '../models/Feature';
import BusinessFeature from '../models/BusinessFeature';
import Restaurant from '../models/Restaurant';
import Store from '../models/Store';
import { Op } from 'sequelize';

// ==================== إدارة الميزات (للسوبر أدمن) ====================

export const getAllFeatures = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { category, group, isActive } = req.query;
    
    const where: any = {};
    if (category) where.category = category;
    if (group) where.feature_group = group;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const features = await Feature.findAll({
      where,
      order: [['feature_group', 'ASC'], ['category', 'ASC'], ['name', 'ASC']]
    });
    
    res.json({ success: true, data: features });
  } catch (error) {
    console.error('Error getting features:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الميزات' });
  }
};

export const getFeature = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { code } = req.params;
    
    const feature = await Feature.findOne({ where: { code } });
    
    if (!feature) {
      res.status(404).json({ success: false, error: 'الميزة غير موجودة' });
      return;
    }
    
    res.json({ success: true, data: feature });
  } catch (error) {
    console.error('Error getting feature:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الميزة' });
  }
};

export const createFeature = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const feature = await Feature.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الميزة بنجاح',
      data: feature
    });
  } catch (error) {
    console.error('Error creating feature:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الميزة' });
  }
};

export const updateFeature = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const { code } = req.params;
    
    const feature = await Feature.findOne({ where: { code } });
    
    if (!feature) {
      res.status(404).json({ success: false, error: 'الميزة غير موجودة' });
      return;
    }
    
    await feature.update(req.body);
    
    res.json({
      success: true,
      message: 'تم تحديث الميزة بنجاح',
      data: feature
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الميزة' });
  }
};

export const deleteFeature = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const { code } = req.params;
    
    const feature = await Feature.findOne({ where: { code } });
    
    if (!feature) {
      res.status(404).json({ success: false, error: 'الميزة غير موجودة' });
      return;
    }
    
    if (feature.isCore) {
      res.status(400).json({ success: false, error: 'لا يمكن حذف ميزة أساسية' });
      return;
    }
    
    await feature.destroy();
    
    res.json({
      success: true,
      message: 'تم حذف الميزة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting feature:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الميزة' });
  }
};

// ==================== ميزات العميل ====================

export const getBusinessFeatures = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { businessId, businessType } = req.params;
    const validBusinessType = businessType as 'restaurant' | 'store';
    
    // التحقق من الصلاحية
    if (req.user?.role !== 'super_admin') {
      if (businessType === 'restaurant' && req.user?.restaurantId !== businessId) {
        res.status(403).json({ success: false, error: 'غير مصرح' });
        return;
      }
      if (businessType === 'store' && req.user?.storeId !== businessId) {
        res.status(403).json({ success: false, error: 'غير مصرح' });
        return;
      }
    }
    
    const businessFeatures = await BusinessFeature.findAll({
      where: { 
        businessId: businessId, 
        businessType: validBusinessType 
      },
      include: [{ model: Feature, as: 'feature' }]
    });
    
    // جلب جميع الميزات المتاحة
    const allFeatures = await Feature.findAll({
      where: { 
        isActive: true,
        [Op.or]: [
          { category: businessType },
          { category: 'both' }
        ]
      }
    });
    
    // دمج البيانات
    const enabledFeatureCodes = businessFeatures
      .filter(bf => bf.isEnabled)
      .map(bf => bf.featureCode);
    
    const featuresWithStatus = allFeatures.map(feature => {
      const businessFeature = businessFeatures.find(bf => bf.featureCode === feature.code);
      return {
        ...feature.toJSON(),
        isEnabled: enabledFeatureCodes.includes(feature.code),
        isOverridden: businessFeature?.isOverridden || false,
        expiresAt: businessFeature?.expiresAt,
        config: businessFeature?.config || {}
      };
    });
    
    res.json({ success: true, data: featuresWithStatus });
  } catch (error) {
    console.error('Error getting business features:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب ميزات العميل' });
  }
};

export const enableBusinessFeature = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { businessId, businessType, featureCode } = req.params;
    const { expiresAt, config } = req.body;
    const validBusinessType = businessType as 'restaurant' | 'store';
    
    // التحقق من الصلاحية (للسوبر أدمن فقط)
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const feature = await Feature.findOne({ where: { code: featureCode } });
    if (!feature) {
      res.status(404).json({ success: false, error: 'الميزة غير موجودة' });
      return;
    }
    
    // البحث عن الميزة
    let businessFeature = await BusinessFeature.findOne({
      where: { 
        businessId: businessId, 
        businessType: validBusinessType, 
        featureCode: featureCode 
      }
    });
    
    if (businessFeature) {
      // تحديث الميزة الموجودة
      await businessFeature.update({
        isEnabled: true,
        isOverridden: true,
        overriddenBy: req.user.id,
        expiresAt: expiresAt || businessFeature.expiresAt,
        config: config || businessFeature.config
      });
    } else {
      // إنشاء ميزة جديدة
      businessFeature = await BusinessFeature.create({
        businessId: businessId,
        businessType: validBusinessType,
        featureCode: featureCode,
        isEnabled: true,
        isOverridden: true,
        overriddenBy: req.user.id,
        assignedBy: req.user.id,
        assignedAt: new Date(),
        expiresAt: expiresAt || null,
        config: config || {}
      });
    }
    
    res.json({
      success: true,
      message: `تم تفعيل ميزة ${feature.name} بنجاح`,
      data: businessFeature
    });
  } catch (error) {
    console.error('Error enabling business feature:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تفعيل الميزة' });
  }
};

export const disableBusinessFeature = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { businessId, businessType, featureCode } = req.params;
    const validBusinessType = businessType as 'restaurant' | 'store';
    
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const feature = await Feature.findOne({ where: { code: featureCode } });
    if (!feature) {
      res.status(404).json({ success: false, error: 'الميزة غير موجودة' });
      return;
    }
    
    if (feature.isCore) {
      res.status(400).json({ success: false, error: 'لا يمكن تعطيل ميزة أساسية' });
      return;
    }
    
    const businessFeature = await BusinessFeature.findOne({
      where: { 
        businessId: businessId, 
        businessType: validBusinessType, 
        featureCode: featureCode 
      }
    });
    
    if (!businessFeature) {
      res.status(404).json({ success: false, error: 'الميزة غير مفعلة لهذا العميل' });
      return;
    }
    
    if (businessFeature.isOverridden) {
      await businessFeature.update({ isEnabled: false });
    } else {
      await businessFeature.destroy();
    }
    
    res.json({
      success: true,
      message: `تم تعطيل ميزة ${feature.name} بنجاح`
    });
  } catch (error) {
    console.error('Error disabling business feature:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تعطيل الميزة' });
  }
};

// ==================== ميزات المستخدم الحالي ====================

export const getMyFeatures = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const businessId = req.user?.restaurantId || req.user?.storeId;
    const businessType = req.user?.restaurantId ? 'restaurant' : 
                        req.user?.storeId ? 'store' : null;
    
    if (!businessId || !businessType) {
      res.json({ success: true, data: [] });
      return;
    }
    
    const currentDate = new Date();
    
    // ✅ استخدام استعلام بسيط بدون Op.or المعقد
    const businessFeatures = await BusinessFeature.findAll({
      where: {
        businessId: businessId,
        businessType: businessType,
        isEnabled: true
      },
      include: [{ model: Feature, as: 'feature' }]
    });
    
    // ✅ تصفية التواريخ في JavaScript بدلاً من SQL
    const validFeatures = businessFeatures.filter(bf => {
      if (!bf.expiresAt) return true;
      return new Date(bf.expiresAt) >= currentDate;
    });
    
    res.json({
      success: true,
      data: validFeatures.map(bf => bf.featureCode)
    });
  } catch (error) {
    console.error('Error getting my features:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الميزات' });
  }
};

export const checkFeature = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { featureCode } = req.params;
    
    const businessId = req.user?.restaurantId || req.user?.storeId;
    const businessType = req.user?.restaurantId ? 'restaurant' : 
                        req.user?.storeId ? 'store' : null;
    
    if (!businessId || !businessType) {
      res.json({ success: true, data: { hasFeature: false } });
      return;
    }
    
    const currentDate = new Date();
    
    const businessFeature = await BusinessFeature.findOne({
      where: {
        businessId: businessId,
        businessType: businessType,
        featureCode: featureCode,
        isEnabled: true
      }
    });
    
    // ✅ التحقق من تاريخ الانتهاء في JavaScript
    let hasFeature = false;
    if (businessFeature) {
      if (!businessFeature.expiresAt) {
        hasFeature = true;
      } else {
        hasFeature = new Date(businessFeature.expiresAt) >= currentDate;
      }
    }
    
    res.json({
      success: true,
      data: { hasFeature }
    });
  } catch (error) {
    console.error('Error checking feature:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في التحقق من الميزة' });
  }
};