// backend/scripts/open-reach-to-guests.js
//
// فتح الوصول للضيوف: أجهزة الإشعارات واشتراكات التنبيهات لم تعد تشترط حساباً.
//
// **لماذا بيدٍ لا بـ`prisma db push`:** الدفع يرفض إضافة قيد تفرّدٍ على جدولٍ
// قائم بلا `--accept-data-loss`، وإضافة الراية إلى مرحلة الإصدار تُسقط
// الحارس عن **كل** نشرةٍ لاحقة. وهذا الجدول فارغ (فُحص قبل التنفيذ)، فلا
// خطر في القيد الجديد أصلاً — الخطر في إسقاط الحارس إلى الأبد.
//
// **مُعاد التنفيذ بأمان:** كل خطوة تفحص حالتها أوّلاً وتتخطّى ما هو منجَز.
//
// نُفِّذ على الإنتاج في ٢٠٢٦-٠٩-٠٩.

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.JAWSDB_URL || process.env.JAWSDB_MARIA_URL || process.env.CLEARDB_DATABASE_URL;
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const columns = async (table) => {
  const rows = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM ${table}`);
  return new Map(rows.map((r) => [r.Field, r]));
};

const indexes = async (table) => {
  const rows = await prisma.$queryRawUnsafe(`SHOW INDEX FROM ${table}`);
  return new Set(rows.map((r) => r.Key_name));
};

const run = async (sql) => {
  console.log('  → ' + sql.replace(/\s+/g, ' ').slice(0, 110));
  await prisma.$executeRawUnsafe(sql);
};

(async () => {
  // ---------- customer_subscriptions ----------
  console.log('customer_subscriptions:');

  const count = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS n FROM customer_subscriptions');
  const rows = Number(count[0].n);
  let cols = await columns('customer_subscriptions');

  // العمود إلزاميّ بلا قيمة افتراضية. إضافته إلى جدولٍ فيه صفوف تحتاج
  // تعبئتها أوّلاً — فنتوقّف بدل أن نكسر بيانات موجودة.
  if (rows > 0 && !cols.has('subject_key')) {
    console.error(`ABORT: الجدول فيه ${rows} صفّاً — التعبئة اليدوية مطلوبة قبل إضافة subject_key`);
    process.exit(1);
  }

  if (!cols.has('subject_key')) {
    await run('ALTER TABLE customer_subscriptions ADD COLUMN subject_key VARCHAR(191) NOT NULL');
  } else {
    console.log('  ✓ subject_key موجود');
  }
  if (!cols.has('visitor_id')) {
    await run('ALTER TABLE customer_subscriptions ADD COLUMN visitor_id VARCHAR(191) NULL');
  } else {
    console.log('  ✓ visitor_id موجود');
  }
  if (!cols.has('phone')) {
    await run('ALTER TABLE customer_subscriptions ADD COLUMN phone VARCHAR(191) NULL');
  } else {
    console.log('  ✓ phone موجود');
  }

  cols = await columns('customer_subscriptions');
  if (cols.get('user_id')?.Null !== 'YES') {
    await run('ALTER TABLE customer_subscriptions MODIFY user_id VARCHAR(191) NULL');
  } else {
    console.log('  ✓ user_id اختياريّ');
  }

  let idx = await indexes('customer_subscriptions');

  // فهرس المفتاح الأجنبي **قبل** إسقاط الفريد القديم: القديم يبدأ بـ
  // user_id وهو ما يحتاجه القيد الخارجي. وإسقاطه بلا بديلٍ يرفضه مايسكيوإل.
  if (!idx.has('customer_subscriptions_user_id_fkey')) {
    await run('CREATE INDEX customer_subscriptions_user_id_fkey ON customer_subscriptions(user_id)');
  } else {
    console.log('  ✓ فهرس المفتاح الأجنبي موجود');
  }

  idx = await indexes('customer_subscriptions');
  if (!idx.has('customer_subscriptions_subject_key_business_id_channel_key')) {
    await run(
      'CREATE UNIQUE INDEX customer_subscriptions_subject_key_business_id_channel_key ' +
        'ON customer_subscriptions(subject_key, business_id, channel)'
    );
  } else {
    console.log('  ✓ الفهرس الفريد الجديد موجود');
  }

  idx = await indexes('customer_subscriptions');
  if (idx.has('customer_subscriptions_user_id_business_id_channel_key')) {
    await run('DROP INDEX customer_subscriptions_user_id_business_id_channel_key ON customer_subscriptions');
  } else {
    console.log('  ✓ الفهرس القديم مُسقَط');
  }

  idx = await indexes('customer_subscriptions');
  if (!idx.has('customer_subscriptions_phone_idx')) {
    await run('CREATE INDEX customer_subscriptions_phone_idx ON customer_subscriptions(phone)');
  } else {
    console.log('  ✓ فهرس الهاتف موجود');
  }

  // ---------- device_tokens ----------
  console.log('device_tokens:');

  const dcols = await columns('device_tokens');
  if (dcols.get('user_id')?.Null !== 'YES') {
    await run('ALTER TABLE device_tokens MODIFY user_id VARCHAR(191) NULL');
  } else {
    console.log('  ✓ user_id اختياريّ');
  }
  if (!dcols.has('visitor_id')) {
    await run('ALTER TABLE device_tokens ADD COLUMN visitor_id VARCHAR(191) NULL');
  } else {
    console.log('  ✓ visitor_id موجود');
  }

  const didx = await indexes('device_tokens');
  if (!didx.has('device_tokens_visitor_id_idx')) {
    await run('CREATE INDEX device_tokens_visitor_id_idx ON device_tokens(visitor_id)');
  } else {
    console.log('  ✓ فهرس الزائر موجود');
  }

  console.log('FINAL_SUBS=' + JSON.stringify([...(await indexes('customer_subscriptions'))]));
  console.log('FINAL_DEV=' + JSON.stringify([...(await indexes('device_tokens'))]));
  console.log('DONE');
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('FAIL ' + e.message);
  await prisma.$disconnect();
  process.exit(1);
});
