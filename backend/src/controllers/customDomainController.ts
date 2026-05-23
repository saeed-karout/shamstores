// backend/src/controllers/customDomainController.ts

import { Request, Response } from 'express';
import { prisma } from '../server';
import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

// توليد رمز التحقق العشوائي
const generateVerificationCode = () => {
  return `verify-${Math.random().toString(36).substring(2, 15)}`;
};

// دالة مساعدة لجلب العمل التجاري للمستخدم
const getBusinessByUser = async (userId: string, businessType?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) return { business: null, type: null };

  if (businessType === 'restaurant' && user.restaurantId) {
    const business = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId }
    });
    return { business, type: 'restaurant' };
  }
  
  if (businessType === 'store' && user.storeId) {
    const business = await prisma.store.findUnique({
      where: { id: user.storeId }
    });
    return { business, type: 'store' };
  }
  
  // إذا لم يكن محدداً
  if (user.restaurantId) {
    const business = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId }
    });
    return { business, type: 'restaurant' };
  }
  
  if (user.storeId) {
    const business = await prisma.store.findUnique({
      where: { id: user.storeId }
    });
    return { business, type: 'store' };
  }
  
  return { business: null, type: null };
};

// جلب إعدادات DNS المطلوبة
export const getDnsSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const businessType = req.user?.businessType;
    
    if (!userId) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    
    const { business, type } = await getBusinessByUser(userId, businessType);
    
    if (!business) {
      return res.status(404).json({ error: 'المطعم/المتجر غير موجود' });
    }
    
    const verificationCode = business.customDomainVerificationCode || generateVerificationCode();
    
    if (!business.customDomainVerificationCode) {
      // تحديث باستخدام Prisma حسب النوع
      if (type === 'restaurant') {
        await prisma.restaurant.update({
          where: { id: business.id },
          data: { customDomainVerificationCode: verificationCode }
        });
      } else {
        await prisma.store.update({
          where: { id: business.id },
          data: { customDomainVerificationCode: verificationCode }
        });
      }
    }
    
    // تحديث المتغير المحلي بالرمز الجديد
    const finalVerificationCode = business.customDomainVerificationCode || verificationCode;
    const subdomain = business.subdomain;
    
    res.json({
      success: true,
      data: {
        targetDomain: `${subdomain}.shamstores.com`,
        verificationCode: finalVerificationCode,
        instructions: {
          cname: {
            name: 'www',
            value: `${subdomain}.shamstores.com`,
            ttl: 3600
          },
          txt: {
            name: '@',
            value: `verification=${finalVerificationCode}`,
            ttl: 3600
          }
        }
      }
    });
  } catch (error) {
    console.error('Error getting DNS settings:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب إعدادات DNS' });
  }
};

// التحقق من صحة الدومين المخصص
export const verifyCustomDomain = async (req: Request, res: Response) => {
  try {
    const { customDomain } = req.body;
    const userId = req.user?.id;
    const businessType = req.user?.businessType;
    
    if (!userId) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    
    if (!customDomain) {
      return res.status(400).json({ error: 'الرجاء إدخال الدومين' });
    }
    
    const { business, type } = await getBusinessByUser(userId, businessType);
    
    if (!business) {
      return res.status(404).json({ error: 'المطعم/المتجر غير موجود' });
    }
    
    // التحقق من أن الدومين غير مستخدم من قبل مطعم آخر
    const existingRestaurant = await prisma.restaurant.findFirst({
      where: {
        customDomain: customDomain,
        id: { not: business.id }
      }
    });
    
    // التحقق من أن الدومين غير مستخدم من قبل متجر آخر
    const existingStore = await prisma.store.findFirst({
      where: {
        customDomain: customDomain,
        id: { not: business.id }
      }
    });
    
    if (existingRestaurant || existingStore) {
      return res.status(400).json({ error: 'هذا الدومين مستخدم بالفعل' });
    }
    
    let cnameVerified = false;
    let txtVerified = false;
    
    // التحقق من سجل CNAME
    try {
      const cnameRecords = await resolveCname(customDomain);
      cnameVerified = cnameRecords.some(record => 
        record === `${business.subdomain}.shamstores.com`
      );
    } catch (error) {
      console.log('CNAME check failed:', error);
    }
    
    // التحقق من سجل TXT
    try {
      const txtRecords = await resolveTxt(customDomain);
      const flatRecords = txtRecords.map(record => record.join(''));
      txtVerified = flatRecords.some(record => 
        record === `verification=${business.customDomainVerificationCode}`
      );
    } catch (error) {
      console.log('TXT check failed:', error);
    }
    
    if (cnameVerified && txtVerified) {
      // تحديث باستخدام Prisma حسب النوع
      if (type === 'restaurant') {
        await prisma.restaurant.update({
          where: { id: business.id },
          data: {
            customDomain: customDomain,
            customDomainVerified: true,
            customDomainVerifiedAt: new Date()
          }
        });
      } else {
        await prisma.store.update({
          where: { id: business.id },
          data: {
            customDomain: customDomain,
            customDomainVerified: true,
            customDomainVerifiedAt: new Date()
          }
        });
      }
      
      res.json({
        success: true,
        message: 'تم التحقق من الدومين وتفعيله بنجاح',
        data: { customDomain, verified: true }
      });
    } else {
      res.json({
        success: false,
        message: 'لم يتم التحقق من إعدادات DNS بعد',
        data: {
          cnameVerified,
          txtVerified,
          requiredCname: `${business.subdomain}.shamstores.com`,
          requiredTxt: `verification=${business.customDomainVerificationCode}`
        }
      });
    }
  } catch (error) {
    console.error('Error verifying custom domain:', error);
    res.status(500).json({ error: 'حدث خطأ في التحقق من الدومين' });
  }
};

// إزالة الدومين المخصص
export const removeCustomDomain = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const businessType = req.user?.businessType;
    
    if (!userId) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    
    const { business, type } = await getBusinessByUser(userId, businessType);
    
    if (!business) {
      return res.status(404).json({ error: 'المطعم/المتجر غير موجود' });
    }
    
    // تحديث باستخدام Prisma حسب النوع
    if (type === 'restaurant') {
      await prisma.restaurant.update({
        where: { id: business.id },
        data: {
          customDomain: null,
          customDomainVerified: false,
          customDomainVerifiedAt: null
        }
      });
    } else {
      await prisma.store.update({
        where: { id: business.id },
        data: {
          customDomain: null,
          customDomainVerified: false,
          customDomainVerifiedAt: null
        }
      });
    }
    
    res.json({
      success: true,
      message: 'تم إزالة الدومين المخصص بنجاح'
    });
  } catch (error) {
    console.error('Error removing custom domain:', error);
    res.status(500).json({ error: 'حدث خطأ في إزالة الدومين' });
  }
};

// جلب حالة الدومين المخصص
export const getCustomDomainStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const businessType = req.user?.businessType;
    
    if (!userId) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    
    const { business } = await getBusinessByUser(userId, businessType);
    
    if (!business) {
      return res.status(404).json({ error: 'المطعم/المتجر غير موجود' });
    }
    
    res.json({
      success: true,
      data: {
        customDomain: business.customDomain,
        customDomainVerified: business.customDomainVerified,
        customDomainVerifiedAt: business.customDomainVerifiedAt,
        customDomainVerificationCode: business.customDomainVerificationCode
      }
    });
  } catch (error) {
    console.error('Error getting custom domain status:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب حالة الدومين' });
  }
};