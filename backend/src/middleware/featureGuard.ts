// backend/src/middleware/featureGuard.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../server';

/**
 * التحقق من أن العميل لديه ميزة معينة
 */
export const requireFeature = (featureCode: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // السوبر أدمن لديه كل الميزات
      if (req.user?.role === 'super_admin') {
        next();
        return;
      }
      
      const businessId = req.user?.restaurantId || req.user?.storeId;
      const businessType = req.user?.restaurantId ? 'restaurant' : 
                          req.user?.storeId ? 'store' : null;
      
      if (!businessId || !businessType) {
        res.status(403).json({ 
          success: false, 
          error: 'لا تملك هذه الميزة. يرجى ترقية حسابك' 
        });
        return;
      }
      
      const now = new Date();
      
      const hasFeature = await prisma.businessFeature.findFirst({
        where: {
          businessId,
          businessType,
          featureCode,
          isEnabled: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } }
          ]
        }
      });
      
      if (!hasFeature) {
        // التحقق من وجود الميزة في الخطة
        const feature = await prisma.feature.findUnique({
          where: { code: featureCode }
        });
        const featureName = feature?.name || featureCode;
        
        res.status(403).json({ 
          success: false, 
          error: `ميزة "${featureName}" غير متاحة في خطتك الحالية. يرجى ترقية حسابك`,
          requiresUpgrade: true,
          featureCode
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Feature guard error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ في التحقق من الصلاحية' });
    }
  };
};

/**
 * التحقق من وجود أي ميزة من القائمة
 */
export const requireAnyFeature = (featureCodes: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role === 'super_admin') {
        next();
        return;
      }
      
      const businessId = req.user?.restaurantId || req.user?.storeId;
      const businessType = req.user?.restaurantId ? 'restaurant' : 
                          req.user?.storeId ? 'store' : null;
      
      if (!businessId || !businessType) {
        res.status(403).json({ success: false, error: 'غير مصرح' });
        return;
      }
      
      const now = new Date();
      
      const hasAnyFeature = await prisma.businessFeature.findFirst({
        where: {
          businessId,
          businessType,
          featureCode: { in: featureCodes },
          isEnabled: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } }
          ]
        }
      });
      
      if (!hasAnyFeature) {
        res.status(403).json({ 
          success: false, 
          error: 'هذه الميزة غير متاحة في خطتك الحالية' 
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Feature guard error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ في التحقق من الصلاحية' });
    }
  };
};