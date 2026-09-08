#!/usr/bin/env node
// backend/scripts/apply-plan-limits.js
//
// يزامن حدود الخطط من `config/plans.ts` إلى قاعدة بيانات قائمة.
//
// **لماذا يلزم سكربت أصلاً:** بذر الخطط في `server.ts` يعمل مرّةً واحدة —
// `if (plansCount === 0)`. فتعديل الحدود في الشيفرة لا يصل إلى قاعدة عاملة
// أبداً، ويبقى الفرق صامتاً بين ما يقوله المستودع وما يطبّقه الخادم.
//
// **قاعدة السلامة: يرفع ولا يخفض.**
//
// السوبر أدمن يعدّل الخطط من اللوحة، ومزامنةٌ تكتب فوق تعديلاته تسحب من
// تجّار يعملون حدوداً وعدناهم بها — وقد يكونون تجاوزوها فعلاً. فكل حدٍّ
// يُقارن، ولا يُكتب إلا إن كان الجديد أوسع. الخفض المقصود يُفعل من اللوحة
// حيث يراه فاعلُه.
//
//   heroku run --app shamstores --no-tty "npm --prefix backend run plans:apply-limits"

const path = require('path');

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

const { PrismaClient } = require('@prisma/client');
const { PLAN_SEEDS } = require('../dist/config/plans');

const prisma = new PrismaClient();

/** الحدود العددية وحدها. البوابات المنطقية تُدار من اللوحة ولا تُمسّ هنا. */
const LIMITS = [
  ['maxOrders', 'طلبات/شهر'],
  ['maxProducts', 'منتجات'],
  ['maxMenuItems', 'أصناف'],
  ['maxUsers', 'مستخدمون'],
  ['maxRestaurants', 'مطاعم'],
  ['maxStores', 'متاجر']
];

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  if (DRY_RUN) console.log('— معاينة فقط، لن يُكتب شيء —\n');

  let changedPlans = 0;

  for (const seed of PLAN_SEEDS) {
    const current = await prisma.plan.findFirst({ where: { slug: seed.slug } });
    if (!current) {
      console.log(`⏭️  ${seed.slug}: غير موجود في القاعدة — يُنشأ بالبذر لا هنا`);
      continue;
    }

    const updates = {};
    const lines = [];

    for (const [field, label] of LIMITS) {
      const target = seed[field];
      const now = current[field];
      if (typeof target !== 'number' || typeof now !== 'number') continue;

      if (target > now) {
        updates[field] = target;
        lines.push(`     ${label.padEnd(12)} ${now} ← ${target}`);
      } else if (target < now) {
        lines.push(`     ${label.padEnd(12)} ${now} (أوسع من ${target} — تُركت)`);
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log(`✓  ${seed.slug}: لا تغيير`);
      if (lines.length) lines.forEach((l) => console.log(l));
      continue;
    }

    console.log(`↑  ${seed.slug}:`);
    lines.forEach((l) => console.log(l));

    if (!DRY_RUN) {
      await prisma.plan.update({ where: { id: current.id }, data: updates });
    }
    changedPlans += 1;
  }

  console.log(
    DRY_RUN
      ? `\nالمعاينة: ${changedPlans} خطة ستتغيّر. أعد التشغيل بلا --dry-run للتطبيق.`
      : `\n✅ حُدِّثت ${changedPlans} خطة.`
  );

  await prisma.$disconnect();
})().catch(async (error) => {
  console.error('❌ فشلت المزامنة:', error.message);
  await prisma.$disconnect();
  process.exit(1);
});
