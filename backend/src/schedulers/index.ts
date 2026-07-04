// backend/src/schedulers/index.ts
import cron from 'node-cron';
import { checkAndUpdateExpiredSubscriptions, checkExpiringSubscriptions } from './subscriptionScheduler';

/**
 * تشغيل جميع المهام المجدولة
 */
export const startSchedulers = () => {
  // تشغيل كل ساعة: التحقق من الاشتراكات المنتهية
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running subscription expiration check...');
    try {
      const result = await checkAndUpdateExpiredSubscriptions();
      if (result.expiredCount > 0) {
        console.log(`✅ Updated ${result.expiredCount} expired subscriptions`);
      }
    } catch (error) {
      console.error('❌ Subscription check failed:', error);
    }
  });

  // تشغيل كل 6 ساعات: التحقق من الاشتراكات المنتهية قريباً للتذكير
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 Running expiring subscriptions check...');
    try {
      const expiring = await checkExpiringSubscriptions(3);
      if (expiring.length > 0) {
        console.log(`📧 Found ${expiring.length} subscriptions expiring soon`);
        // يمكن إضافة إرسال إيميلات هنا
      }
    } catch (error) {
      console.error('❌ Expiring check failed:', error);
    }
  });

  console.log('✅ Schedulers started successfully');
};