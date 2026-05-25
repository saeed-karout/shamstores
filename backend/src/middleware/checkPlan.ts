// src/middleware/checkPlan.ts

import { Response, NextFunction } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../types';

const normalizeFeatureCode = (code: string): string => {
  const normalized = code
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
  return normalized.startsWith('has_') ? normalized.slice(4) : normalized;
};

const getPlanFeaturesFromPlan = (plan: any): string[] => {
  const features: string[] = [];

  if (plan?.hasWhatsapp) features.push('whatsapp');
  if (plan?.hasOnlineOrders) features.push('online_orders');
  if (plan?.hasCustomDomain) features.push('custom_domain');
  if (plan?.hasAnalytics) features.push('analytics');
  if (plan?.hasTableQr) features.push('table_qr');
  if (plan?.hasMultiLanguage) features.push('multi_language');
  if (plan?.hasPromotions) features.push('promotions');
  if (plan?.hasCoupons) features.push('coupons');

  if (plan?.features) {
    try {
      let parsedFeatures = plan.features;
      if (typeof parsedFeatures === 'string') {
        parsedFeatures = JSON.parse(parsedFeatures);
      }
      if (Array.isArray(parsedFeatures)) {
        features.push(...parsedFeatures.map((f) => String(f)));
      }
    } catch (error) {
      console.error('Error parsing plan features:', error);
    }
  }

  return features;
};

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
