// src/middleware/checkPlan.ts

import { Request, Response, NextFunction } from 'express';

export const checkPlanFeature = (featureCode: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
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
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // مؤقتاً - السماح للجميع
      next();
    } catch (error) {
      res.status(403).json({ message: 'الخطة الحالية لا تدعم هذه الميزة' });
    }
  };
};