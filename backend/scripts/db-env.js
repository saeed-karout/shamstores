// backend/scripts/db-env.js
//
// تحضير `DATABASE_URL` لأي سكربت يُشغَّل خارج التطبيق.
//
// **لماذا مشترَك:** خمسة سكربتات كانت تكرّر الاشتقاق نفسه من رابط إضافة
// Heroku، وواحدٌ منها فقط يضع سقفاً للاتصالات. والنتيجة أن مرحلة الإصدار
// أسقطت النشر فعلاً (v110):
//
//   User '…' has exceeded the 'max_user_connections' resource (current: 10)
//
// لأن `prisma db push` فتح تجمّعه الافتراضي (عدد الأنوية × ٢ + ١) بينما
// دينو الويب القديم ما يزال ممسكاً بخمسة أثناء الإصدار.
//
// سطرٌ واحد يُنسى في السكربت السادس هو بالضبط ما تمنعه هذه الوحدة.

const path = require('path');

/**
 * يشتقّ الرابط ويضع سقف اتصالاته، ويُرجعه.
 *
 * @param {number} limit عدد الاتصالات — اثنان يكفيان لسكربتٍ لا يوازي.
 * @returns {string|null} الرابط، أو `null` إن لم يوجد.
 */
const prepareDatabaseUrl = (limit = 2) => {
  try {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  } catch {
    /* dotenv غير مثبت — المتغيرات من البيئة */
  }

  if (!process.env.DATABASE_URL) {
    const addonUrl =
      process.env.JAWSDB_URL ||
      process.env.JAWSDB_MARIA_URL ||
      process.env.CLEARDB_DATABASE_URL;

    if (addonUrl) {
      process.env.DATABASE_URL = addonUrl;
      console.log('ℹ️  DATABASE_URL مشتق من رابط إضافة قاعدة البيانات');
    }
  }

  if (!process.env.DATABASE_URL) return null;

  // السقف يُضاف ولا يُستبدل: من ضبطه صراحةً في البيئة أدرى بحاجته
  if (!/[?&]connection_limit=/.test(process.env.DATABASE_URL)) {
    const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?';
    process.env.DATABASE_URL = `${process.env.DATABASE_URL}${separator}connection_limit=${limit}`;
  }

  return process.env.DATABASE_URL;
};

module.exports = { prepareDatabaseUrl };
