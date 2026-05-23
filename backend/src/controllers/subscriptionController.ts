// backend/src/controllers/subscriptionController.ts
import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';

// دالة مساعدة للحصول على businessId (مطعم أو متجر)
const getBusinessId = async (req: AuthRequest): Promise<{ type: 'restaurant' | 'store', id: string } | null> => {
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
  
  return null;
};

// حساب الخصم حسب عدد الشهور
const calculateDiscount = (months: number, customDiscount?: number): number => {
  if (customDiscount !== undefined) return customDiscount;
  if (months >= 12) return 15; // خصم 15% للسنة كاملة
  if (months >= 6) return 10;  // خصم 10% لـ 6 شهور
  if (months >= 3) return 5;   // خصم 5% لـ 3 شهور
  return 0;
};

// ==================== إنشاء اشتراك جديد ====================

export const createSubscription = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      planId,
      planName,
      months,
      price,
      discount,
      paymentMethod,
      paymentReference,
      notes,
      businessType, // 'restaurant' أو 'store'
      businessId    // اختياري للسوبر أدمن
    } = req.body;

    // تحديد نوع النشاط التجاري
    let targetBusinessType = businessType;
    let targetBusinessId = businessId;

    if (!targetBusinessType || !targetBusinessId) {
      const business = await getBusinessId(req);
      if (business) {
        targetBusinessType = business.type;
        targetBusinessId = business.id;
      } else {
        res.status(400).json({ 
          success: false,
          error: 'معرف النشاط التجاري غير موجود' 
        });
        return;
      }
    }

    // التحقق من وجود النشاط التجاري
    if (targetBusinessType === 'restaurant') {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: targetBusinessId }
      });
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'المطعم غير موجود' });
        return;
      }
    } else {
      const store = await prisma.store.findUnique({
        where: { id: targetBusinessId }
      });
      if (!store) {
        res.status(404).json({ success: false, error: 'المتجر غير موجود' });
        return;
      }
    }

    // حساب الخصم
    const finalDiscount = calculateDiscount(months, discount);
    const monthlyPrice = price;
    const totalBeforeDiscount = monthlyPrice * months;
    const discountAmount = (totalBeforeDiscount * finalDiscount) / 100;
    const totalPaid = totalBeforeDiscount - discountAmount;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    // إنشاء الاشتراك
    const subscription = await prisma.subscription.create({
      data: {
        businessType: targetBusinessType,
        businessId: targetBusinessId,
        planId,
        planName,
        months,
        price: monthlyPrice,
        discount: finalDiscount,
        totalPaid,
        startDate,
        endDate,
        status: 'active',
        paymentMethod,
        paymentReference: paymentReference || null,
        notes: notes || null,
        reminderSent: false,
        reminderSentAt: null
      }
    });

    // تحديث خطة النشاط التجاري
    if (targetBusinessType === 'restaurant') {
      await prisma.restaurant.update({
        where: { id: targetBusinessId },
        data: {
          planId,
          subscriptionStart: startDate,
          subscriptionEnd: endDate
        }
      });
    } else {
      await prisma.store.update({
        where: { id: targetBusinessId },
        data: {
          planId,
          subscriptionStart: startDate,
          subscriptionEnd: endDate
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الاشتراك بنجاح',
      data: subscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء الاشتراك' 
    });
  }
};

// ==================== جلب اشتراكات النشاط التجاري ====================

export const getSubscriptions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    
    if (!business) {
      res.status(400).json({ 
        success: false,
        error: 'معرف النشاط التجاري غير موجود' 
      });
      return;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: {
        businessType: business.type,
        businessId: business.id
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الاشتراكات' 
    });
  }
};

// ==================== جلب الاشتراك الحالي ====================

export const getCurrentSubscription = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    
    if (!business) {
      res.status(400).json({ 
        success: false,
        error: 'معرف النشاط التجاري غير موجود' 
      });
      return;
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        businessType: business.type,
        businessId: business.id,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الاشتراك الحالي' 
    });
  }
};

// ==================== إلغاء اشتراك ====================

export const cancelSubscription = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const business = await getBusinessId(req);
    
    if (!business) {
      res.status(400).json({ 
        success: false,
        error: 'معرف النشاط التجاري غير موجود' 
      });
      return;
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        id,
        businessType: business.type,
        businessId: business.id,
        status: 'active'
      }
    });

    if (!subscription) {
      res.status(404).json({ 
        success: false,
        error: 'الاشتراك غير موجود' 
      });
      return;
    }

    // تحديث حالة الاشتراك
    const cancelledSubscription = await prisma.subscription.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    // تحديث خطة النشاط التجاري إلى المجانية
    const freePlanId = '11111111-1111-1111-1111-111111111111';
    
    if (business.type === 'restaurant') {
      await prisma.restaurant.update({
        where: { id: business.id },
        data: { planId: freePlanId }
      });
    } else {
      await prisma.store.update({
        where: { id: business.id },
        data: { planId: freePlanId }
      });
    }

    res.json({
      success: true,
      message: 'تم إلغاء الاشتراك بنجاح',
      data: cancelledSubscription
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إلغاء الاشتراك' 
    });
  }
};

// ==================== جلب الاشتراكات المنتهية قريباً (للسوبر أدمن) ====================

export const getExpiringSubscriptions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ 
        success: false,
        error: 'غير مصرح' 
      });
      return;
    }

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        endDate: {
          lte: threeDaysFromNow,
          gt: new Date()
        }
      },
      orderBy: { endDate: 'asc' }
    });

    // جلب أسماء المطاعم/المتاجر لكل اشتراك
    const subscriptionsWithBusiness = await Promise.all(expiringSubscriptions.map(async (sub) => {
      if (sub.businessType === 'restaurant') {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: sub.businessId },
          select: { name: true, phone: true, email: true }
        });
        return { ...sub, business: restaurant };
      } else {
        const store = await prisma.store.findUnique({
          where: { id: sub.businessId },
          select: { name: true, phone: true, email: true }
        });
        return { ...sub, business: store };
      }
    }));

    res.json({
      success: true,
      data: subscriptionsWithBusiness
    });
  } catch (error) {
    console.error('Error fetching expiring subscriptions:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الاشتراكات المنتهية' 
    });
  }
};

// ==================== إرسال تذكيرات التجديد (للسوبر أدمن) ====================

export const sendRenewalReminders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ 
        success: false,
        error: 'غير مصرح' 
      });
      return;
    }

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const subscriptionsToRemind = await prisma.subscription.findMany({
      where: {
        status: 'active',
        reminderSent: false,
        endDate: {
          lte: twoDaysFromNow,
          gt: new Date()
        }
      }
    });

    let sentCount = 0;
    const reminders = [];

    for (const sub of subscriptionsToRemind) {
      let phoneNumber = null;
      let businessName = '';

      if (sub.businessType === 'restaurant') {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: sub.businessId },
          select: { name: true, phone: true }
        });
        phoneNumber = restaurant?.phone;
        businessName = restaurant?.name || '';
      } else {
        const store = await prisma.store.findUnique({
          where: { id: sub.businessId },
          select: { name: true, phone: true }
        });
        phoneNumber = store?.phone;
        businessName = store?.name || '';
      }

      if (phoneNumber) {
        // TODO: تفعيل إرسال رسائل واتساب أو SMS
        // console.log(`Sending reminder to ${businessName} at ${phoneNumber}: اشتراك ${sub.planName} سينتهي في ${sub.endDate}`);
        
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { 
            reminderSent: true,
            reminderSentAt: new Date()
          }
        });
        
        sentCount++;
        reminders.push({
          businessName,
          phone: phoneNumber,
          planName: sub.planName,
          endDate: sub.endDate
        });
      }
    }

    res.json({
      success: true,
      message: `تم إرسال ${sentCount} تذكير`,
      data: { sentCount, reminders }
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إرسال التذكيرات' 
    });
  }
};

// ==================== التحقق من الاشتراكات المنتهية (للسوبر أدمن) ====================

export const checkExpiredSubscriptions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ 
        success: false,
        error: 'غير مصرح' 
      });
      return;
    }

    const now = new Date();

    // الاشتراكات المنتهية
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        endDate: { lt: now }
      }
    });

    let expiredCount = 0;
    const freePlanId = '11111111-1111-1111-1111-111111111111';

    for (const sub of expiredSubscriptions) {
      // تحديث حالة الاشتراك
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'expired' }
      });
      
      // تحديث خطة النشاط التجاري إلى المجانية
      if (sub.businessType === 'restaurant') {
        await prisma.restaurant.update({
          where: { id: sub.businessId },
          data: { 
            planId: freePlanId,
            subscriptionEnd: null
          }
        });
      } else {
        await prisma.store.update({
          where: { id: sub.businessId },
          data: { 
            planId: freePlanId,
            subscriptionEnd: null
          }
        });
      }
      
      expiredCount++;
    }

    res.json({
      success: true,
      message: `تم إنهاء ${expiredCount} اشتراك منتهي`,
      data: { expiredCount }
    });
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في التحقق من الاشتراكات' 
    });
  }
};