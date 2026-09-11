// backend/src/schedulers/index.ts
import cron from 'node-cron';
import { checkAndUpdateExpiredSubscriptions, checkExpiringSubscriptions } from './subscriptionScheduler';
import { createBackup, pruneOldBackups, checkBackupTarget } from '../services/backup.service';
import emailService from '../services/emailService';
import { runAllAutomations } from '../services/automation.service';
import { pruneEvents } from '../services/storefrontEvents.service';

/**
 * تشغيل جميع المهام المجدولة
 */
export const startSchedulers = () => {
  /**
   * الرسائل التلقائية — كل ساعة.
   *
   * **ساعةً لا دقيقة:** «السلّة المتروكة بعد ساعتين» لا تحتاج دقّةً أعلى،
   * ودورةٌ كل دقيقة تعني ستّين مسحاً لكل جداول المتاجر مقابل لا شيء.
   *
   * **وساعةً لا يوماً:** الدورة اليومية كانت ستجعل تذكير السلّة يصل بعد
   * أربعٍ وعشرين ساعة مهما ضبط التاجر «بعد ساعتين» — أي وعدٌ في الواجهة
   * لا يفي به المحرّك.
   */
  cron.schedule('7 * * * *', async () => {
    try {
      const summary = await runAllAutomations();
      if (summary.sent > 0 || summary.businesses > 0) {
        console.log(`🤖 الرسائل التلقائية: ${summary.sent} رسالة من ${summary.businesses} نشاط`);
      }
    } catch (error) {
      console.error('❌ فشل تشغيل الرسائل التلقائية:', error);
    }
  });

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
      // notify: true — المجدول وحده يُرسل. القائمة كانت تُجلب ثم تُطبَع
      // ولا يصل التاجر شيء: الاشتراك ينتهي فجأةً وتُغلق ميزاته بلا إنذار.
      const expiring = await checkExpiringSubscriptions(3, true);
      if (expiring.length > 0) {
        console.log(`📧 نُبِّه ${expiring.length} تاجراً باقتراب انتهاء اشتراكه`);
      }
    } catch (error) {
      console.error('❌ Expiring check failed:', error);
    }
  });

  // نسخة احتياطية يومية عند 03:00 — ساعة هادئة لا يطلب فيها أحد.
  //
  // تُتخطّى صامتةً إن لم تُضبط حاوية نسخ خاصة؛ لكن التحذير يُطبع عند الإقلاع
  // مرة واحدة (أدناه) حتى لا يظن أحد أن النسخ يعمل بينما هو معطّل.
  // حذف أحداث الإحصاء القديمة — 03:40، بعد النسخة الاحتياطية لا قبلها،
  // فما يُحذف يكون قد دخل نسخة الأمس.
  //
  // **جدولُ أحداثٍ بلا سقفٍ عمريّ يبتلع القاعدة:** متجرٌ نشط يكتب آلاف
  // الصفوف شهرياً، وقاعدتنا صغيرة. وأربعة أشهرٍ تكفي لمقارنة موسمٍ بموسم
  // وهو أطول مدّةٍ يعرضها التقرير أصلاً.
  cron.schedule('40 3 * * *', async () => {
    try {
      const removed = await pruneEvents(120);
      if (removed > 0) console.warn(`🧹 حُذف ${removed} حدث إحصاء أقدم من 120 يوماً`);
    } catch (error) {
      console.error('❌ فشل حذف أحداث الإحصاء القديمة:', error);
    }
  });

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
        // فشل صامت لا يراه مراقب خارجي: الموقع أخضر وتمرّ الأيام بلا نسخة
        await emailService.sendAdminAlert(
          'فشل النسخ الاحتياطي',
          `تعذّر إنشاء النسخة اليومية.

السبب: ${result.error}

الوقت: ${new Date().toISOString()}`
        );
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