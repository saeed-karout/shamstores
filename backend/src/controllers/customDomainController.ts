// backend/src/controllers/customDomainController.ts

import { Request, Response } from 'express';
import Restaurant from '../models/Restaurant';
import Store from '../models/Store';
import User from '../models/User';
import dns from 'dns';
import { promisify } from 'util';
import { Op } from 'sequelize';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

// توليد رمز التحقق العشوائي
const generateVerificationCode = () => {
  return `verify-${Math.random().toString(36).substring(2, 15)}`;
};

// دالة مساعدة لجلب العمل التجاري للمستخدم
const getBusinessByUser = async (userId: string, businessType?: string) => {
  const user = await User.findByPk(userId);
  if (!user) return null;

  if (businessType === 'restaurant' && user.restaurantId) {
    return await Restaurant.findByPk(user.restaurantId);
  }
  if (businessType === 'store' && user.storeId) {
    return await Store.findByPk(user.storeId);
  }
  
  // إذا لم يكن محدداً
  if (user.restaurantId) {
    return await Restaurant.findByPk(user.restaurantId);
  }
  if (user.storeId) {
    return await Store.findByPk(user.storeId);
  }
  
  return null;
};

// جلب إعدادات DNS المطلوبة
export const getDnsSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const businessType = req.user?.businessType;
    
    if (!userId) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    
    const business = await getBusinessByUser(userId, businessType);
    
    if (!business) {
      return res.status(404).json({ error: 'المطعم/المتجر غير موجود' });
    }
    
    const verificationCode = business.customDomainVerificationCode || generateVerificationCode();
    
    if (!business.customDomainVerificationCode) {
      business.customDomainVerificationCode = verificationCode;
      await business.save();
    }
    
    res.json({
      success: true,
      data: {
        targetDomain: `${business.subdomain}.yourdomain.com`,
        verificationCode: verificationCode,
        instructions: {
          cname: {
            name: 'www',
            value: `${business.subdomain}.yourdomain.com`,
            ttl: 3600
          },
          txt: {
            name: '@',
            value: `verification=${verificationCode}`,
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
    
    const business = await getBusinessByUser(userId, businessType);
    
    if (!business) {
      return res.status(404).json({ error: 'المطعم/المتجر غير موجود' });
    }
    
    // التحقق من أن الدومين غير مستخدم
    const existingRestaurant = await Restaurant.findOne({ 
      where: { customDomain, id: { [Op.ne]: business.id } }
    });
    const existingStore = await Store.findOne({ 
      where: { customDomain, id: { [Op.ne]: business.id } }
    });
    
    if (existingRestaurant || existingStore) {
      return res.status(400).json({ error: 'هذا الدومين مستخدم بالفعل' });
    }
    
    let cnameVerified = false;
    let txtVerified = false;
    
    try {
      const cnameRecords = await resolveCname(customDomain);
      cnameVerified = cnameRecords.some(record => 
        record === `${business.subdomain}.yourdomain.com`
      );
    } catch (error) {
      console.log('CNAME check failed:', error);
    }
    
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
      business.customDomain = customDomain;
      business.customDomainVerified = true;
      business.customDomainVerifiedAt = new Date();
      await business.save();
      
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
          requiredCname: `${business.subdomain}.yourdomain.com`,
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
    
    const business = await getBusinessByUser(userId, businessType);
    
    if (!business) {
      return res.status(404).json({ error: 'المطعم/المتجر غير موجود' });
    }
    
    business.customDomain = null;
    business.customDomainVerified = false;
    business.customDomainVerifiedAt = null;
    await business.save();
    
    res.json({
      success: true,
      message: 'تم إزالة الدومين المخصص بنجاح'
    });
  } catch (error) {
    console.error('Error removing custom domain:', error);
    res.status(500).json({ error: 'حدث خطأ في إزالة الدومين' });
  }
};