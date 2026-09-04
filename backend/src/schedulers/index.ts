// backend/src/schedulers/index.ts
import cron from 'node-cron';
import { checkAndUpdateExpiredSubscriptions, checkExpiringSubscriptions } from './subscriptionScheduler';
import { createBackup, pruneOldBackups, checkBackupTarget } from '../services/backup.service';

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

  // نسخة احتياطية يومية عند 03:00 — ساعة هادئة لا يطلب فيها أحد.
  //
  // تُتخطّى صامتةً إن لم تُضبط حاوية نسخ خاصة؛ لكن التحذير يُطبع عند الإقلاع
  // مرة واحدة (أدناه) حتى لا يظن أحد أن النسخ يعمل بينما هو معطّل.
  cron.schedule('0 3 * * *', async () => {
    const configError = checkBackupTarget();
    if (configError) return;

    console.warn('💾 بدء النسخة الاحتياطية اليومية...');
    try {
      const result = await createBackup();
      if (result.ok) {
        console.warn(
          `✅ نسخة احتياطية: ${result.key} — ${result.rows} صفاً من ${result.tables} جدولاً ` +
          `(${Math.round((result.bytes || 0) / 1024)} ك.ب)`
        );
        const pruned = await pruneOldBackups();
        if (pruned > 0) console.warn(`🧹 حُذفت ${pruned} نسخة قديمة`);
      } else {
        console.error('❌ فشلت النسخة الاحتياطية:', result.error);
      }
    } catch (error) {
      console.error('❌ فشلت النسخة الاحتياطية:', error);
    }
  });

  // تحذير واحد عند الإقلاع: النسخ المعطّل بصمت أخطر من غيابه المعلَن.
  const backupError = checkBackupTarget();
  if (backupError) {
    console.error('⚠️  النسخ الاحتياطي معطّل:', backupError);
  } else {
    console.warn('💾 النسخ الاحتياطي اليومي مفعّل (03:00)');
  }

  console.log('✅ Schedulers started successfully');
};