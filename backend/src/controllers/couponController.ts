// backend/src/controllers/couponController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import Coupon from '../models/Coupon';
import Table from '../models/Table';
import Restaurant from '../models/Restaurant';
import Store from '../models/Store';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../config/database';


const getBusinessFromXSubdomain = async (req: AuthRequest): Promise<{ type: 'restaurant' | 'store', id: string, data: any } | null> => {
  const xSubdomain = req.headers['x-subdomain'] as string;
  
  if (!xSubdomain) return null;
  
  console.log('🌐 Looking for business with X-Subdomain:', xSubdomain);
  
  // البحث عن متجر أولاً
  let store = await Store.findOne({ 
    where: { subdomain: xSubdomain, isActive: true }
  });
  
  if (store) {
    console.log('🛒 Found store by X-Subdomain:', store.name);
    return { type: 'store', id: store.id, data: store };
  }
  
  // ثم البحث عن مطعم
  let restaurant = await Restaurant.findOne({ 
    where: { subdomain: xSubdomain, isActive: true }
  });
  
  if (restaurant) {
    console.log('🍽️ Found restaurant by X-Subdomain:', restaurant.name);
    return { type: 'restaurant', id: restaurant.id, data: restaurant };
  }
  
  return null;
};


// دالة مساعدة للحصول على restaurantId أو storeId من الطلب (للمستخدمين المسجلين)
const getBusinessIdFromAuth = async (req: AuthRequest): Promise<{ type: 'restaurant' | 'store', id: string } | null> => {
  // للسوبر أدمن
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string;
    if (targetRestaurantId) return { type: 'restaurant', id: targetRestaurantId };
    
    const targetStoreId = req.query.storeId as string;
    if (targetStoreId) return { type: 'store', id: targetStoreId };
    
    // جلب أول مطعم أو متجر
    const restaurants = await Restaurant.findAll({ limit: 1 });
    if (restaurants.length > 0) return { type: 'restaurant', id: restaurants[0].id };
    
    const stores = await Store.findAll({ limit: 1 });
    if (stores.length > 0) return { type: 'store', id: stores[0].id };
    
    return null;
  }
  
  // للمالك أو الموظف
  if (req.user?.restaurantId) return { type: 'restaurant', id: req.user.restaurantId };
  if (req.user?.storeId) return { type: 'store', id: req.user.storeId };
  
  // ✅ لسائق التوصيل (delivery_driver) - نحتاج إلى إيجاد طريقة أخرى
  // سائق التوصيل مرتبط بمطعم أو متجر عبر restaurantId أو storeId في التوكن
  if (req.user?.role === 'delivery_driver') {
    // محاولة الحصول من header أو host
    const fromHost = await getBusinessFromHost(req);
    if (fromHost) return { type: fromHost.type, id: fromHost.id };
  }
  
  return null;
};
// دالة مساعدة للحصول على business من subdomain أو host (للمستخدمين غير المسجلين)
const getBusinessFromHost = async (req: AuthRequest): Promise<{ type: 'restaurant' | 'store', id: string, data: any } | null> => {
  const host = req.get('host');
  if (!host) return null;
  
  const hostWithoutPort = host.split(':')[0];
  console.log('🌐 Getting business from host:', hostWithoutPort);
  
  // استخدام X-Subdomain أولاً إذا كان موجوداً
  const xSubdomain = req.headers['x-subdomain'] as string;
  if (xSubdomain) {
    return getBusinessFromXSubdomain(req);
  }
  
  const parts = hostWithoutPort.split('.');
  let subdomain: string | null = null;
  
  // استخراج subdomain من host
  if (hostWithoutPort.includes('localhost') || hostWithoutPort.includes('127.0.0.1')) {
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
      subdomain = parts[0];
    }
  } else if (parts.length >= 3) {
    subdomain = parts[0];
  }
  
  if (!subdomain) {
    console.log('⚠️ No subdomain found in host');
    return null;
  }
  
  console.log('🌐 Extracted subdomain from host:', subdomain);
  
  // البحث عن متجر أولاً
  let store = await Store.findOne({ 
    where: { subdomain, isActive: true }
  });
  
  if (store) {
    console.log('🛒 Found store by host subdomain:', store.name);
    return { type: 'store', id: store.id, data: store };
  }
  
  // ثم البحث عن مطعم
  let restaurant = await Restaurant.findOne({ 
    where: { subdomain, isActive: true }
  });
  
  if (restaurant) {
    console.log('🍽️ Found restaurant by host subdomain:', restaurant.name);
    return { type: 'restaurant', id: restaurant.id, data: restaurant };
  }
  
  return null;
};

export const getCoupons = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const business = await getBusinessIdFromAuth(req);
    
    if (!business) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم أو المتجر غير موجود' 
      });
      return;
    }

    console.log(`🔍 Fetching coupons for ${business.type}:`, business.id);

    let coupons;
    if (business.type === 'restaurant') {
      coupons = await Coupon.findAll({
        where: { restaurantId: business.id },
        order: [['createdAt', 'DESC']]
      });
    } else {
      coupons = await Coupon.findAll({
        where: { storeId: business.id },
        order: [['createdAt', 'DESC']]
      });
    }

    res.json({ success: true, data: coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الكوبونات' });
  }
};

export const getCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const business = await getBusinessIdFromAuth(req);
    
    if (!business) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم أو المتجر غير موجود' 
      });
      return;
    }

    let coupon;
    if (business.type === 'restaurant') {
      coupon = await Coupon.findOne({
        where: { id, restaurantId: business.id }
      });
    } else {
      coupon = await Coupon.findOne({
        where: { id, storeId: business.id }
      });
    }

    if (!coupon) {
      res.status(404).json({ 
        success: false,
        error: 'الكوبون غير موجود' 
      });
      return;
    }

    res.json({
      success: true,
      data: coupon
    });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الكوبون' 
    });
  }
};

export const createCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      code, description, discountType, discountValue,
      minOrder, usageLimit, startDate, endDate,
      isStoreOnly
    } = req.body;

    const business = await getBusinessIdFromAuth(req);
    
    if (!business) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم أو المتجر غير موجود' 
      });
      return;
    }

    console.log('📝 Creating coupon with data:', {
      code,
      description,
      discountType,
      discountValue,
      minOrder,
      usageLimit,
      startDate,
      endDate,
      isStoreOnly,
      business
    });

    // التحقق من وجود كوبون بنفس الكود
    let existingCoupon;
    if (business.type === 'restaurant') {
      existingCoupon = await Coupon.findOne({
        where: { 
          code: code.toUpperCase(),
          restaurantId: business.id
        }
      });
    } else {
      existingCoupon = await Coupon.findOne({
        where: { 
          code: code.toUpperCase(),
          storeId: business.id
        }
      });
    }

    if (existingCoupon) {
      res.status(400).json({ 
        success: false,
        error: 'يوجد كوبون بنفس الكود بالفعل' 
      });
      return;
    }

    const couponData: any = {
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minOrder: minOrder || 0,
      usageLimit: usageLimit || 1,
      usedCount: 0,
      startDate,
      endDate,
      isActive: true
    };

    if (business.type === 'restaurant') {
      couponData.restaurantId = business.id;
      couponData.isRestaurantOnly = true;
    } else {
      couponData.storeId = business.id;
      couponData.isStoreOnly = true;
    }

    const coupon = await Coupon.create(couponData);

    console.log('✅ Coupon created:', coupon.id);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الكوبون بنجاح',
      data: coupon
    });
  } catch (error: any) {
    console.error('❌ Error creating coupon:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء الكوبون' 
    });
  }
};

export const updateCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      code, description, discountType, discountValue,
      minOrder, usageLimit, startDate, endDate, isActive
    } = req.body;

    const business = await getBusinessIdFromAuth(req);
    
    if (!business) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم أو المتجر غير موجود' 
      });
      return;
    }

    let coupon;
    if (business.type === 'restaurant') {
      coupon = await Coupon.findOne({
        where: { id, restaurantId: business.id }
      });
    } else {
      coupon = await Coupon.findOne({
        where: { id, storeId: business.id }
      });
    }

    if (!coupon) {
      res.status(404).json({ 
        success: false,
        error: 'الكوبون غير موجود' 
      });
      return;
    }

    if (code && code !== coupon.code) {
      let existingCoupon;
      if (business.type === 'restaurant') {
        existingCoupon = await Coupon.findOne({
          where: { 
            code: code.toUpperCase(),
            restaurantId: business.id,
            id: { [Op.ne]: id }
          }
        });
      } else {
        existingCoupon = await Coupon.findOne({
          where: { 
            code: code.toUpperCase(),
            storeId: business.id,
            id: { [Op.ne]: id }
          }
        });
      }

      if (existingCoupon) {
        res.status(400).json({ 
          success: false,
          error: 'يوجد كوبون بنفس الكود بالفعل' 
        });
        return;
      }
    }

    await coupon.update({
      code: code ? code.toUpperCase() : coupon.code,
      description: description !== undefined ? description : coupon.description,
      discountType: discountType || coupon.discountType,
      discountValue: discountValue || coupon.discountValue,
      minOrder: minOrder !== undefined ? minOrder : coupon.minOrder,
      usageLimit: usageLimit || coupon.usageLimit,
      startDate: startDate || coupon.startDate,
      endDate: endDate || coupon.endDate,
      isActive: isActive !== undefined ? isActive : coupon.isActive
    });

    res.json({
      success: true,
      message: 'تم تحديث الكوبون بنجاح',
      data: coupon
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث الكوبون' 
    });
  }
};

export const deleteCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const business = await getBusinessIdFromAuth(req);
    
    if (!business) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم أو المتجر غير موجود' 
      });
      return;
    }

    let coupon;
    if (business.type === 'restaurant') {
      coupon = await Coupon.findOne({
        where: { id, restaurantId: business.id }
      });
    } else {
      coupon = await Coupon.findOne({
        where: { id, storeId: business.id }
      });
    }

    if (!coupon) {
      res.status(404).json({ 
        success: false,
        error: 'الكوبون غير موجود' 
      });
      return;
    }

    await coupon.destroy();

    res.json({
      success: true,
      message: 'تم حذف الكوبون بنجاح'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في حذف الكوبون' 
    });
  }
};

// ==================== دالة التحقق من صحة الكوبون (للمستخدمين غير المسجلين في المتاجر) ====================

export const validateCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { code } = req.params;
    const { orderTotal, tableId, slug } = req.query;

    console.log('🔍 Validating coupon:', { code, orderTotal, tableId, slug });

    // تحويل orderTotal إلى رقم مع التحقق من الصحة
    const total = Number(orderTotal);
    if (isNaN(total) || total <= 0) {
      res.status(400).json({ 
        success: false,
        error: 'قيمة الطلب غير صالحة' 
      });
      return;
    }

    // محاولة الحصول على business من مصادر مختلفة
    let business: { type: 'restaurant' | 'store'; id: string; data?: any } | null = null;

    // 1. من X-Subdomain header (الأولوية القصوى)
    business = await getBusinessFromXSubdomain(req);
    
    // 2. من slug في query
    if (!business && slug) {
      const restaurant = await Restaurant.findOne({
        where: { slug: slug as string }
      });
      if (restaurant) {
        business = { type: 'restaurant', id: restaurant.id, data: restaurant };
      }
      
      if (!business) {
        const store = await Store.findOne({
          where: { slug: slug as string }
        });
        if (store) {
          business = { type: 'store', id: store.id, data: store };
        }
      }
    }
    
    // 3. من host/subdomain
    if (!business) {
      business = await getBusinessFromHost(req);
    }
    
    // 4. من المستخدم المصادق (للمالك أو الموظف)
    if (!business) {
      const fromAuth = await getBusinessIdFromAuth(req);
      if (fromAuth) {
        business = fromAuth;
      }
    }

    if (!business) {
      console.log('❌ Could not determine business (restaurant or store)');
      res.status(400).json({ 
        success: false,
        error: 'لم نتمكن من تحديد المتجر أو المطعم' 
      });
      return;
    }

    console.log(`✅ ${business.type === 'restaurant' ? 'Restaurant' : 'Store'} found:`, business.id);

    // البحث عن الكوبون حسب نوع العمل
    let coupon;
    if (business.type === 'restaurant') {
      coupon = await Coupon.findOne({
        where: { 
          code: code.toUpperCase(),
          restaurantId: business.id,
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() }
        }
      });
    } else {
      coupon = await Coupon.findOne({
        where: { 
          code: code.toUpperCase(),
          storeId: business.id,
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() }
        }
      });
    }

    if (!coupon) {
      res.status(404).json({ 
        success: false,
        error: 'الكوبون غير صالح أو منتهي الصلاحية' 
      });
      return;
    }

    // التحقق من عدد الاستخدامات
    if (coupon.usedCount >= coupon.usageLimit) {
      res.status(400).json({ 
        success: false,
        error: 'تم استنفاذ عدد استخدامات هذا الكوبون' 
      });
      return;
    }

    // التحقق من الحد الأدنى للطلب
    if (total < Number(coupon.minOrder)) {
      res.status(400).json({ 
        success: false,
        error: `الحد الأدنى للطلب هو ${coupon.minOrder} ر.س` 
      });
      return;
    }

    // حساب قيمة الخصم
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (total * Number(coupon.discountValue)) / 100;
    } else {
      discountAmount = Math.min(Number(coupon.discountValue), total);
    }

    console.log('✅ Coupon validated:', {
      code: coupon.code,
      discountAmount,
      discountValue: coupon.discountValue,
      discountType: coupon.discountType,
      businessType: business.type
    });

    res.json({
      success: true,
      data: {
        ...coupon.toJSON(),
        discountAmount: Math.round(discountAmount * 100) / 100
      }
    });
  } catch (error) {
    console.error('❌ Error validating coupon:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في التحقق من الكوبون' 
    });
  }
};