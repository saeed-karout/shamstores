// تضييق تفرّد رمز المنتج: من عالميّ إلى داخل المتجر.
//
// نُفِّذ على الإنتاج في ٢٠٢٦-٠٩-٠٨. مُبقًى في المستودع لأنه **مُعاد التنفيذ
// بأمان** (يتخطّى ما هو منجَز)، ولأن قاعدةً أُنشئت من نسخةٍ قديمة قد تحتاجه.
//
// يُنفَّذ مرّةً واحدة بيدٍ لأن `prisma db push` يرفض إضافة قيد تفرّد بلا
// `--accept-data-loss`، وإضافة الراية إلى مرحلة الإصدار تُسقط الحارس عن كل
// نشرةٍ لاحقة — وهو ثمنٌ أغلى من تنفيذٍ واحدٍ مقصود.
//
// الأسماء مطابقة لما يولّده Prisma (`Product_storeId_sku_key`) حتى يرى
// `db push` التالي المخطّط متوافقاً فلا يحاول تغييره ثانية.
// الاشتقاق وسقف الاتصالات من وحدةٍ واحدة — انظر `db-env.js`
const { prepareDatabaseUrl } = require('./db-env');

prepareDatabaseUrl();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // الفحص يسبق التغيير مرّةً أخرى: القراءة السابقة كانت قبل دقائق، والقاعدة حيّة
  const dupes = await prisma.$queryRawUnsafe(
    'SELECT storeId, sku, COUNT(*) AS n FROM Product GROUP BY storeId, sku HAVING n > 1 LIMIT 5'
  );
  if (dupes.length > 0) {
    console.error('ABORT: يوجد تكرار في (storeId, sku) — لن يُنشأ الفهرس');
    process.exit(1);
  }

  const has = (rows, name) => rows.some((r) => r.Key_name === name);
  let idx = await prisma.$queryRawUnsafe('SHOW INDEX FROM Product');

  if (has(idx, 'Product_storeId_sku_key')) {
    console.log('SKIP: الفهرس المركّب موجود أصلاً');
  } else {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE Product ADD UNIQUE INDEX Product_storeId_sku_key (storeId, sku)'
    );
    console.log('OK: أُنشئ Product_storeId_sku_key');
  }

  idx = await prisma.$queryRawUnsafe('SHOW INDEX FROM Product');
  if (has(idx, 'Product_sku_key')) {
    // الإسقاط بعد إنشاء البديل لا قبله: بينهما لحظةٌ بلا أي حارسٍ على الرمز
    await prisma.$executeRawUnsafe('ALTER TABLE Product DROP INDEX Product_sku_key');
    console.log('OK: أُسقط Product_sku_key');
  } else {
    console.log('SKIP: الفهرس العالميّ غير موجود');
  }

  idx = await prisma.$queryRawUnsafe('SHOW INDEX FROM Product');
  console.log('FINAL=' + JSON.stringify([...new Set(idx.map((r) => r.Key_name))]));
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('FAIL ' + e.message);
  await prisma.$disconnect();
  process.exit(1);
});
