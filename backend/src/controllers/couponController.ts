// backend/src/controllers/couponController.ts
import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';

// دالة مساعدة للحصول على business من subdomain أو host
const getBusinessFromHost = async (req: AuthRequest): Promise<{ type: 'restaurant' | 'store', id: string, data: any } | null> => {
  const host = req.get('host');
  if (!host) return null;
  
  const hostWithoutPort = host.split(':')[0];
  console.log('🌐 Getting business from host:', hostWithoutPort);
  
  const xSubdomain = req.headers['x-subdomain'] as string;
  if (xSubdomain) {
    return getBusinessFromXSubdomain(req);
  }
  
  const parts = hostWithoutPort.split('.');
  let subdomain: string | null = null;
  
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
  
  let store = await prisma.store.findFirst({
    where: { subdomain, isActive: true }
  });
  
  if (store) {
    console.log('🛒 Found store by host subdomain:', store.name);
    return { type: 'store', id: store.id, data: store };
  }
  
  let restaurant = await prisma.restaurant.findFirst({
    where: { subdomain, isActive: true }
  });
  
  if (restaurant) {
    console.log('🍽️ Found restaurant by host subdomain:', restaurant.name);
    return { type: 'restaurant', id: restaurant.id, data: restaurant };
  }
  
  return null;
};

// دالة مساعدة للحصول على business من X-Subdomain header
const getBusinessFromXSubdomain = async (req: AuthRequest): Promise<{ type: 'restaurant' | 'store', id: string, data: any } | null> => {
  const xSubdomain = req.headers['x-subdomain'] as string;
  
  if (!xSubdomain) return null;
  
  console.log('🌐 Looking for business with X-Subdomain:', xSubdomain);
  
  let store = await prisma.store.findFirst({
    where: { subdomain: xSubdomain, isActive: true }
  });
  
  if (store) {
    console.log('🛒 Found store by X-Subdomain:', store.name);
    return { type: 'store', id: store.id, data: store };
  }
  
  let restaurant = await prisma.restaurant.findFirst({
    where: { subdomain: xSubdomain, isActive: true }
  });
  
  if (restaurant) {
    console.log('🍽️ Found restaurant by X-Subdomain:', restaurant.name);
    return { type: 'restaurant', id: restaurant.id, data: restaurant };
  }
  
  return null;
};

// دالة مساعدة للحصول على businessId من الطلب (للمستخدمين المسجلين)
const getBusinessIdFromAuth = async (req: AuthRequest): Promise<{ type: 'restaurant' | 'store', id: string } | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string;
    if (targetRestaurantId) return { type: 'restaurant', id: targetRestaurantId };
    
    const targetStoreId = req.query.storeId as string;
    if (targetStoreId) return { type: 'store', id: targetStoreId };
    
    const restaurants = await prisma.restaurant.findMany({ take: 1 });
    if (restaurants.length > 0) return { type: 'restaurant', id: restaurants[0].id };
    
    const stores = await prisma.store.findMany({ take: 1 });
    if (stores.length > 0) return { type: 'store', id: stores[0].id };
    
    return null;
  }
  
  if (req.user?.restaurantId) return { type: 'restaurant', id: req.user.restaurantId };
  if (req.user?.storeId) return { type: 'store', id: req.user.storeId };
  
  if (req.user?.role === 'delivery_driver') {
    const fromHost = await getBusinessFromHost(req);
    if (fromHost) return { type: fromHost.type, id: fromHost.id };
  }
  
  return null;
};

// ==================== جلب الكوبونات ====================

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
      coupons = await prisma.coupon.findMany({
        where: { restaurantId: business.id },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      coupons = await prisma.coupon.findMany({
        where: { storeId: business.id },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json({ success: true, data: coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الكوبونات' });
  }
};

// ==================== جلب كوبون واحد ====================

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
      coupon = await prisma.coupon.findFirst({
        where: { id, restaurantId: business.id }
      });
    } else {
      coupon = await prisma.coupon.findFirst({
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

    res.json({ success: true, data: coupon });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الكوبون' 
    });
  }
};

// ==================== إنشاء كوبون جديد ====================

export const createCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      code, description, discountType, discountValue,
      minOrderAmount, usageLimit, validFrom, validUntil,
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
      minOrderAmount,
      usageLimit,
      validFrom,
      validUntil,
      isStoreOnly,
      business
    });

    if (!code || !String(code).trim()) {
      res.status(400).json({ success: false, error: 'رمز الكوبون مطلوب' });
      return;
    }
    if (!['percentage', 'fixed'].includes(String(discountType))) {
      res.status(400).json({ success: false, error: 'نوع الخصم غير صالح' });
      return;
    }
    const numericValue = Number(discountValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      res.status(400).json({ success: false, error: 'قيمة الخصم غير صالحة' });
      return;
    }
    if (String(discountType) === 'percentage' && numericValue > 100) {
      res.status(400).json({ success: false, error: 'نسبة الخصم لا يمكن أن تتجاوز 100%' });
      return;
    }

    // التحقق من وجود كوبون بنفس الكود
    let existingCoupon;
    if (business.type === 'restaurant') {
      existingCoupon = await prisma.coupon.findFirst({
        where: { 
          code: code.toUpperCase(),
          restaurantId: business.id
        }
      });
    } else {
      existingCoupon = await prisma.coupon.findFirst({
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

    // ملاحظة: كانت هذه الدالة تكتب أعمدة غير موجودة في المخطط
    // (description / usedCount / validFrom / validUntil / createdBy /
    // isStoreOnly / isRestaurantOnly) فيرمي Prisma ويفشل إنشاء أي كوبون.
    const couponData: any = {
      code: String(code).toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      startDate: validFrom ? new Date(validFrom) : new Date(),
      endDate: validUntil ? new Date(validUntil) : null,
      isActive: true
    };

    if (business.type === 'restaurant') {
      couponData.restaurantId = business.id;
    } else {
      couponData.storeId = business.id;
    }

    const coupon = await prisma.coupon.create({ data: couponData });

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

// ==================== تحديث كوبون ====================

export const updateCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      code, description, discountType, discountValue,
      minOrderAmount, usageLimit, validFrom, validUntil, isActive
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
      coupon = await prisma.coupon.findFirst({
        where: { id, restaurantId: business.id }
      });
    } else {
      coupon = await prisma.coupon.findFirst({
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

    if (code && code.toUpperCase() !== coupon.code) {
      let existingCoupon;
      if (business.type === 'restaurant') {
        existingCoupon = await prisma.coupon.findFirst({
          where: { 
            code: code.toUpperCase(),
            restaurantId: business.id,
            NOT: { id }
          }
        });
      } else {
        existingCoupon = await prisma.coupon.findFirst({
          where: { 
            code: code.toUpperCase(),
            storeId: business.id,
            NOT: { id }
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

    const updateData: any = {};
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = Number(discountValue);
    if (minOrderAmount !== undefined) updateData.minOrderAmount = Number(minOrderAmount);
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit ? Number(usageLimit) : null;
    if (validFrom !== undefined) updateData.startDate = new Date(validFrom);
    if (validUntil !== undefined) updateData.endDate = validUntil ? new Date(validUntil) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'تم تحديث الكوبون بنجاح',
      data: updatedCoupon
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث الكوبون' 
    });
  }
};

// ==================== حذف كوبون ====================

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
      coupon = await prisma.coupon.findFirst({
        where: { id, restaurantId: business.id }
      });
    } else {
      coupon = await prisma.coupon.findFirst({
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

    await prisma.coupon.delete({ where: { id } });

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

// ==================== التحقق من صحة الكوبون (للمستخدمين غير المسجلين) ====================

export const validateCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { code } = req.params;
    const { orderTotal, tableId, slug } = req.query;

    console.log('🔍 Validating coupon:', { code, orderTotal, tableId, slug });

    const total = Number(orderTotal);
    if (isNaN(total) || total <= 0) {
      res.status(400).json({ 
        success: false,
        error: 'قيمة الطلب غير صالحة' 
      });
      return;
    }

    let business: { type: 'restaurant' | 'store'; id: string; data?: any } | null = null;

    // 1. من X-Subdomain header
    business = await getBusinessFromXSubdomain(req);
    
    // 2. من slug في query
    if (!business && slug) {
      const restaurant = await prisma.restaurant.findFirst({
        where: { slug: slug as string }
      });
      if (restaurant) {
        business = { type: 'restaurant', id: restaurant.id, data: restaurant };
      }
      
      if (!business) {
        const store = await prisma.store.findFirst({
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
    
    // 4. من المستخدم المصادق
    if (!business) {
      const fromAuth = await getBusinessIdFromAuth(req);
      if (fromAuth) {
        business = fromAuth;
      }
    }

    if (!business) {
      console.log('❌ Could not determine business');
      res.status(400).json({ 
        success: false,
        error: 'لم نتمكن من تحديد المتجر أو المطعم' 
      });
      return;
    }

    console.log(`✅ ${business.type === 'restaurant' ? 'Restaurant' : 'Store'} found:`, business.id);

    let coupon;
    if (business.type === 'restaurant') {
      coupon = await prisma.coupon.findFirst({
        where: { 
          code: code.toUpperCase(),
          restaurantId: business.id,
          isActive: true,
          startDate: { lte: new Date() },
          // كوبون بلا تاريخ انتهاء يجب أن يبقى صالحاً
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }]
        }
      });
    } else {
      coupon = await prisma.coupon.findFirst({
        where: { 
          code: code.toUpperCase(),
          storeId: business.id,
          isActive: true,
          startDate: { lte: new Date() },
          // كوبون بلا تاريخ انتهاء يجب أن يبقى صالحاً
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }]
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

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      res.status(400).json({ 
        success: false,
        error: 'تم استنفاذ عدد استخدامات هذا الكوبون' 
      });
      return;
    }

    const minOrder = Number(coupon.minOrderAmount);
    if (total < minOrder) {
      res.status(400).json({ 
        success: false,
        error: `الحد الأدنى للطلب هو ${minOrder} ر.س` 
      });
      return;
    }

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
        ...coupon,
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