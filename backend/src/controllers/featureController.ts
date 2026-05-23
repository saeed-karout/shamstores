// backend/src/controllers/featureController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';

// ==================== إدارة الميزات (للسوبر أدمن) ====================

export const getAllFeatures = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, group, isActive } = req.query;
    
    const where: any = {};
    if (category) where.category = category as string;
    if (group) where.group = group as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const features = await prisma.feature.findMany({
      where,
      orderBy: [
        { group: 'asc' },
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    
    res.json({ success: true, data: features });
  } catch (error) {
    console.error('Error getting features:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الميزات' });
  }
};

export const getFeature = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    
    const feature = await prisma.feature.findUnique({
      where: { code }
    });
    
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

export const createFeature = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const feature = await prisma.feature.create({
      data: req.body
    });
    
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

export const updateFeature = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const { code } = req.params;
    
    const feature = await prisma.feature.findUnique({
      where: { code }
    });
    
    if (!feature) {
      res.status(404).json({ success: false, error: 'الميزة غير موجودة' });
      return;
    }
    
    const updated = await prisma.feature.update({
      where: { code },
      data: req.body
    });
    
    res.json({
      success: true,
      message: 'تم تحديث الميزة بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الميزة' });
  }
};

export const deleteFeature = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const { code } = req.params;
    
    const feature = await prisma.feature.findUnique({
      where: { code }
    });
    
    if (!feature) {
      res.status(404).json({ success: false, error: 'الميزة غير موجودة' });
      return;
    }
    
    if (feature.isCore) {
      res.status(400).json({ success: false, error: 'لا يمكن حذف ميزة أساسية' });
      return;
    }
    
    await prisma.feature.delete({
      where: { code }
    });
    
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

export const getBusinessFeatures = async (req: AuthRequest, res: Response): Promise<void> => {
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
    
    // جلب ميزات العميل (بدون include)
    const businessFeatures = await prisma.businessFeature.findMany({
      where: { 
        businessId, 
        businessType: validBusinessType 
      }
    });
    
    // جلب جميع الميزات المتاحة
    const allFeatures = await prisma.feature.findMany({
      where: { 
        isActive: true,
        OR: [
          { category: businessType },
          { category: 'both' }
        ]
      }
    });
    
    // دمج البيانات - الحصول على تفاصيل الميزات بشكل منفصل
    const featuresWithStatus = await Promise.all(allFeatures.map(async (feature) => {
      const businessFeature = businessFeatures.find(bf => bf.featureCode === feature.code);
      
      // جلب feature code من businessFeature
      const enabledFeatureCodes = businessFeatures
        .filter(bf => bf.isEnabled)
        .map(bf => bf.featureCode);
      
      return {
        ...feature,
        isEnabled: enabledFeatureCodes.includes(feature.code),
        isOverridden: businessFeature?.isOverridden || false,
        expiresAt: businessFeature?.expiresAt,
        config: businessFeature?.config || {}
      };
    }));
    
    res.json({ success: true, data: featuresWithStatus });
  } catch (error) {
    console.error('Error getting business features:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب ميزات العميل' });
  }
};

export const enableBusinessFeature = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { businessId, businessType, featureCode } = req.params;
    const { expiresAt, config } = req.body;
    const validBusinessType = businessType as 'restaurant' | 'store';
    
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const feature = await prisma.feature.findUnique({
      where: { code: featureCode }
    });
    if (!feature) {
      res.status(404).json({ success: false, error: 'الميزة غير موجودة' });
      return;
    }
    
    // البحث عن الميزة
    let businessFeature = await prisma.businessFeature.findFirst({
      where: { 
        businessId, 
        businessType: validBusinessType, 
        featureCode 
      }
    });
    
    if (businessFeature) {
      // تحديث الميزة الموجودة
      businessFeature = await prisma.businessFeature.update({
        where: { id: businessFeature.id },
        data: {
          isEnabled: true,
          isOverridden: true,
          overriddenBy: req.user.id,
          expiresAt: expiresAt || businessFeature.expiresAt,
          config: config || businessFeature.config
        }
      });
    } else {
      // إنشاء ميزة جديدة
      businessFeature = await prisma.businessFeature.create({
        data: {
          businessId,
          businessType: validBusinessType,
          featureCode,
          isEnabled: true,
          isOverridden: true,
          overriddenBy: req.user.id,
          assignedBy: req.user.id,
          assignedAt: new Date(),
          expiresAt: expiresAt || null,
          config: config || {}
        }
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

export const disableBusinessFeature = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { businessId, businessType, featureCode } = req.params;
    const validBusinessType = businessType as 'restaurant' | 'store';
    
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }
    
    const feature = await prisma.feature.findUnique({
      where: { code: featureCode }
    });
    if (!feature) {
      res.status(404).json({ success: false, error: 'الميزة غير موجودة' });
      return;
    }
    
    if (feature.isCore) {
      res.status(400).json({ success: false, error: 'لا يمكن تعطيل ميزة أساسية' });
      return;
    }
    
    const businessFeature = await prisma.businessFeature.findFirst({
      where: { 
        businessId, 
        businessType: validBusinessType, 
        featureCode 
      }
    });
    
    if (!businessFeature) {
      res.status(404).json({ success: false, error: 'الميزة غير مفعلة لهذا العميل' });
      return;
    }
    
    if (businessFeature.isOverridden) {
      await prisma.businessFeature.update({
        where: { id: businessFeature.id },
        data: { isEnabled: false }
      });
    } else {
      await prisma.businessFeature.delete({
        where: { id: businessFeature.id }
      });
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

export const getMyFeatures = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const businessId = req.user?.restaurantId || req.user?.storeId;
    const businessType = req.user?.restaurantId ? 'restaurant' : 
                        req.user?.storeId ? 'store' : null;
    
    if (!businessId || !businessType) {
      res.json({ success: true, data: [] });
      return;
    }
    
    const currentDate = new Date();
    
    const businessFeatures = await prisma.businessFeature.findMany({
      where: {
        businessId,
        businessType,
        isEnabled: true
      }
    });
    
    // تصفية التواريخ في JavaScript
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

export const checkFeature = async (req: AuthRequest, res: Response): Promise<void> => {
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
    
    const businessFeature = await prisma.businessFeature.findFirst({
      where: {
        businessId,
        businessType,
        featureCode,
        isEnabled: true
      }
    });
    
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