// src/middleware/checkPlan.ts

import { Response, NextFunction } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../types';
import {
  normalizeFeatureCode,
  getPlanFeatureCodes,
  businessHasEntitlement
} from '../services/entitlement.service';

// القواعد نفسها يستخدمها بقية الخادم — تعريفها في services/entitlement.service.ts
// حتى لا تتباعد بوابات الخطة عن الميزات المُسندة لكل نشاط.
const getPlanFeaturesFromPlan = getPlanFeatureCodes;

export const checkPlanFeature = (featureCode: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مصرح' });
        return;
      }

      if (req.user.role === 'super_admin') {
        next();
        return;
      }

      const businessId = req.user.restaurantId || req.user.storeId;
      const businessType = req.user.restaurantId ? 'restaurant' : req.user.storeId ? 'store' : null;

      if (!businessId || !businessType) {
        res.status(403).json({ success: false, error: 'لا تملك هذه الميزة' });
        return;
      }

      const business =
        businessType === 'restaurant'
          ? await prisma.restaurant.findUnique({
              where: { id: businessId },
              select: { plan: true }
            })
          : await prisma.store.findUnique({
              where: { id: businessId },
              select: { plan: true }
            });

      const plan = business?.plan;
      if (!plan) {
        res.status(403).json({ success: false, error: 'لا يمكن تحديد الخطة الحالية' });
        return;
      }

      const planFeatures = getPlanFeaturesFromPlan(plan).map(normalizeFeatureCode);
      const normalizedFeature = normalizeFeatureCode(featureCode);
      const featureSet = new Set(planFeatures);

      // **الإضافات المشتراة تُفحص أوّلاً.**
      //
      // كان هذا الحارس يقرأ بوابات الخطة وحدها ولا يرى `BusinessFeature`
      // إطلاقاً. فتاجرٌ يشتري إضافةً يراها «مملوكة» في الكتالوج — لأن
      // الكتالوج يسأل `businessHasEntitlement` — ثم يرتدّ عند المسار بـ403.
      // أي أن متجر الإضافات كلّه كان يبيع ما لا يُفتح بالشراء.
      if (await businessHasEntitlement(businessId, businessType, normalizedFeature)) {
        next();
        return;
      }

      const isPaidPlan = (plan.price || 0) > 0 && plan.slug !== 'free' && plan.name !== 'free';
      const strictFeatures = new Set([
        'whatsapp',
        'online_orders',
        'custom_domain',
        'analytics',
        'table_qr',
        'multi_language',
        'promotions',
        'coupons'
      ]);

      if (featureSet.has(normalizedFeature)) {
        next();
        return;
      }

      if (!strictFeatures.has(normalizedFeature)) {
        if (isPaidPlan) {
          next();
          return;
        }
      } else if (featureSet.size === 0 && isPaidPlan) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        error: 'الخطة الحالية لا تدعم هذه الميزة',
        requiresUpgrade: true,
        featureCode: normalizedFeature
      });
      return;

    } catch (error) {
      console.error('Plan feature check error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ أثناء التحقق من الخطة' });
    }
  };
};

export const checkPlan = (requiredPlan: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // مؤقتاً - السماح للجميع
      next();
    } catch (error) {
      res.status(403).json({ message: 'الخطة الحالية لا تدعم هذه الميزة' });
    }
  };
};

const isFreePlan = (plan: { name: string; slug: string; price: number }): boolean => {
  return plan.price <= 0 || plan.slug === 'free' || plan.name === 'free';
};

export const requirePaidPlanForStaff = (businessType: 'restaurant' | 'store') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'غير مصرح' });
        return;
      }

      if (req.user.role === 'super_admin') {
        next();
        return;
      }

      const businessId =
        businessType === 'restaurant' ? req.user.restaurantId : req.user.storeId;

      if (!businessId) {
        res.status(403).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });
        return;
      }

      const business =
        businessType === 'restaurant'
          ? await prisma.restaurant.findUnique({
              where: { id: businessId },
              select: { plan: { select: { name: true, slug: true, price: true } } }
            })
          : await prisma.store.findUnique({
              where: { id: businessId },
              select: { plan: { select: { name: true, slug: true, price: true } } }
            });

      const plan = business?.plan;
      if (!plan) {
        res.status(403).json({ success: false, error: 'لا يمكن تحديد الخطة الحالية' });
        return;
      }

      if (isFreePlan(plan)) {
        res.status(403).json({ success: false, error: 'الخطة الحالية لا تدعم إدارة الموظفين' });
        return;
      }

      next();
    } catch (error) {
      console.error('Plan check error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ أثناء التحقق من الخطة' });
    }
  };
};
