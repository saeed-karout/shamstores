// backend/src/schedulers/subscriptionScheduler.ts

import prisma from '../services/prisma';
import { notifyUser } from '../services/notification.service';
import { findBusinessOwner } from '../services/subscriptionCancel.service';

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

      // التاجر يستحق أن يعرف. بلا هذا الإشعار يستيقظ على ميزات مغلقة
      // وواجهة تغيّرت، ولا شيء يفسّر له لماذا — فيظنّه عطلاً في المنصة.
      const ownerId = await findBusinessOwner(sub.businessType, sub.businessId);
      await notifyUser(ownerId, {
        type: 'subscription',
        event: 'subscription.expired',
        title: 'انتهى اشتراكك',
        message: `خطة ${sub.planName} انتهت وعاد نشاطك إلى الخطة المجانية. جدّد لاستعادة ميزاتك.`,
        link: '/plans',
        entityId: sub.id
      });

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
/**
 * الاشتراكات التي تنتهي قريباً.
 *
 * `notify` اختياري عمداً: لوحة الإدارة تقرأ القائمة للعرض، والمجدول وحده
 * يرسل. استدعاء واحد يُشعِر دائماً كان سيُغرق التاجر بتذكير كلما فتح
 * السوبر أدمن الصفحة.
 */
export const checkExpiringSubscriptions = async (
  daysThreshold: number = 3,
  notify: boolean = false
) => {
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

      if (notify) {
        const days = Math.max(
          1,
          Math.ceil((sub.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        );
        const ownerId = await findBusinessOwner(sub.businessType, sub.businessId);
        const sent = await notifyUser(ownerId, {
          type: 'subscription',
          event: 'subscription.expiring',
          title: 'اشتراكك على وشك الانتهاء',
          message: `خطة ${sub.planName} تنتهي خلال ${days} ${days === 1 ? 'يوم' : 'أيام'}. جدّد قبل أن تُغلق ميزاتك.`,
          link: '/plans',
          entityId: sub.id
        });

        // العَلَم يُرفع بعد الإرسال لا قبله: رفعه أولاً كان يُسقط التذكير
        // نهائياً لو فشل الإشعار — والاشتراك ينتهي بلا أن ينبَّه أحد.
        if (sent) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { reminderSent: true }
          });
        }
      }

      return { ...sub, business };
    }));

    return results;
  } catch (error) {
    console.error('❌ Error checking expiring subscriptions:', error);
    return [];
  }
};