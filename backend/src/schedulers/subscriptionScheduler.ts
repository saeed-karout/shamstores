// backend/src/schedulers/subscriptionScheduler.ts

import prisma from '../services/prisma';

const freePlanId = '11111111-1111-1111-1111-111111111111';

/**
 * التحقق من الاشتراكات المنتهية وتحديثها
 */
export const checkAndUpdateExpiredSubscriptions = async () => {
  try {
    const now = new Date();

    // جلب الاشتراكات النشطة التي انتهت
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        endDate: { lt: now }
      }
    });

    let expiredCount = 0;
    const results = [];

    for (const sub of expiredSubscriptions) {
      // تحديث حالة الاشتراك
      const updated = await prisma.subscription.update({
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
      } else if (sub.businessType === 'store') {
        await prisma.store.update({
          where: { id: sub.businessId },
          data: { 
            planId: freePlanId,
            subscriptionEnd: null
          }
        });
      }

      expiredCount++;
      results.push({
        subscriptionId: sub.id,
        businessType: sub.businessType,
        businessId: sub.businessId,
        planName: sub.planName,
        endDate: sub.endDate
      });
    }

    if (expiredCount > 0) {
      console.log(`✅ تم تحديث ${expiredCount} اشتراك منتهي`);
    }

    return { expiredCount, results };
  } catch (error) {
    console.error('❌ Error checking expired subscriptions:', error);
    return { expiredCount: 0, results: [], error };
  }
};

/**
 * التحقق من الاشتراكات التي ستنتهي قريباً (للتذكير)
 */
export const checkExpiringSubscriptions = async (daysThreshold: number = 3) => {
  try {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);

    // ✅ إزالة include وإجراء استعلام منفصل للحصول على معلومات النشاط التجاري
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        reminderSent: false,
        endDate: {
          lte: threshold,
          gt: now
        }
      }
    });

    // جلب معلومات النشاط التجاري بشكل منفصل
    const results = await Promise.all(expiringSubscriptions.map(async (sub) => {
      let business = null;
      if (sub.businessType === 'restaurant') {
        business = await prisma.restaurant.findUnique({
          where: { id: sub.businessId },
          select: { name: true, phone: true, email: true }
        });
      } else if (sub.businessType === 'store') {
        business = await prisma.store.findUnique({
          where: { id: sub.businessId },
          select: { name: true, phone: true, email: true }
        });
      }
      return { ...sub, business };
    }));

    return results;
  } catch (error) {
    console.error('❌ Error checking expiring subscriptions:', error);
    return [];
  }
};