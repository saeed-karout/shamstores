// src/middleware/checkPlan.ts

import { Response, NextFunction } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../types';

export const checkPlanFeature = (featureCode: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // مؤقتاً - السماح للجميع
      // يمكنك تعديل هذا حسب منطق عملك لاحقاً
      next();
    } catch (error) {
      res.status(403).json({ message: 'الخطة الحالية لا تدعم هذه الميزة' });
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
