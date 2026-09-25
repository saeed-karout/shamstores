#!/usr/bin/env node
// backend/scripts/sync-plan-catalog.js
//
// يُدخل الخطط الجديدة من `config/plans.ts` إلى قاعدة قائمة، ويضمّ رموز
// الإضافات (`features`) إلى الخطط الموجودة.
//
// **لماذا سكربت:** بذر الإقلاع في `server.ts` يعمل على قاعدةٍ فارغة وحدها،
// فخطةٌ تُضاف إلى الشيفرة لا تصل الإنتاج أبداً.
//
// **وما لا يمسّه:** السعر في كل الخطط، والحدود والوصف في الخطط الموجودة —
// قرارات الأدمن من لوحته — **إلا** ما في `RESHAPED` أدناه: خططٌ أُعيد رسم
// حدودها بقرارٍ صريح، والمعاينة تعدّ من سيتجاوز الحدود الجديدة قبل التنفيذ. الرموز تُضَمّ ولا تُحذف: خطةٌ تفقد
// `pos` تُغلق الكاشير على من يستعمله. والحدود لها سكربتها (`apply-plan-limits`).
//
// **وشارة «الأكثر اختياراً» واحدة:** تنتقل إلى الخطة التي يعلّمها الملف.
// شارتان في صفحة الأسعار تُلغيان معنى كلتيهما.
//
// المعاينة افتراضية:
//   heroku run --app shamstores --no-tty "node backend/scripts/sync-plan-catalog.js"
//   heroku run --app shamstores --no-tty "node backend/scripts/sync-plan-catalog.js --apply"

// الاشتقاق وسقف الاتصالات من وحدةٍ واحدة — انظر `db-env.js`
const { prepareDatabaseUrl } = require('./db-env');

prepareDatabaseUrl();

const { PrismaClient } = require('@prisma/client');
// `PLANS_MODULE` للمعاينة محلياً قبل البناء — الإنتاج يقرأ `dist` دائماً
const { PLAN_SEEDS } = require(process.env.PLANS_MODULE || '../dist/config/plans');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

/**
 * خططٌ خُفّضت حدودها عمداً: كانت «الانطلاقة» و«النموّ» تعطيان ما يكفي أغلب
 * المحلّات، فلا يجد التاجر سبباً للصعود إلى «الأعمال». الأسعار لا تتغيّر.
 */
const RESHAPED = new Set(['free', 'basic', 'pos', 'pro', 'business']);
const LIMIT_FIELDS = ['maxUsers', 'maxMenuItems', 'maxProducts', 'maxOrders'];

/** نشاطاتٌ على الخطة تتجاوز حدودها الجديدة — عددها لكل حدّ */
const countOverLimit = async (planId, seed) => {
  const out = [];
  const stores = await prisma.store.findMany({ where: { planId }, select: { id: true, name: true } });
  const restaurants = await prisma.restaurant.findMany({ where: { planId }, select: { id: true, name: true } });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  for (const s of stores) {
    const products = await prisma.product.count({ where: { storeId: s.id } });
    const orders = await prisma.order.count({ where: { storeId: s.id, createdAt: { gte: monthStart } } });
    if (products > seed.maxProducts) out.push(`${s.name} (${products} منتج)`);
    if (orders > seed.maxOrders) out.push(`${s.name} (${orders} طلب هذا الشهر)`);
  }
  for (const r of restaurants) {
    const items = await prisma.menuItem.count({ where: { restaurantId: r.id } });
    const orders = await prisma.order.count({ where: { restaurantId: r.id, createdAt: { gte: monthStart } } });
    if (items > seed.maxMenuItems) out.push(`${r.name} (${items} صنف)`);
    if (orders > seed.maxOrders) out.push(`${r.name} (${orders} طلب هذا الشهر)`);
  }
  return out;
};

const parseCodes = (raw) => {
  if (!raw) return [];
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
};

(async () => {
  console.log(APPLY ? 'تنفيذ المزامنة:\n' : 'معاينة (بلا كتابة — أضف --apply للتنفيذ):\n');

  const existing = await prisma.plan.findMany();
  const bySlug = new Map(existing.map((p) => [p.slug, p]));
  let changes = 0;

  for (const seed of PLAN_SEEDS) {
    const current = bySlug.get(seed.slug);

    if (!current) {
      // المعرّف من الملف قد يكون مأخوذاً في قاعدةٍ قديمة — يُترك لـ cuid
      const { id: _ignored, ...data } = seed;
      const taken = existing.some((p) => p.id === seed.id);
      console.log(`＋ ${seed.slug.padEnd(11)} خطة جديدة · $${seed.price}/شهر · ${(seed.features || []).join('، ') || 'بلا إضافات'}`);
      if (APPLY) await prisma.plan.create({ data: taken ? data : { id: seed.id, ...data } });
      changes += 1;
      continue;
    }

    const have = parseCodes(current.features);
    const missing = (seed.features || []).filter((code) => !have.includes(code));
    const data = {};
    const notes = [];
    if (missing.length) {
      data.features = [...have, ...missing];
      notes.push(`تُضاف الإضافات: ${missing.join('، ')}`);
    }
    // الترتيب ترتيب عرضٍ لا وعدٌ تجاريّ — ولوحة التاجر تقرّر به «ترقية» أم
    // لا: خطةٌ جديدة بترتيبٍ مكرّر تجعل صاحب «المؤسسات» يرى زرّ ترقيةٍ إلى أدنى
    if (current.position !== seed.position) {
      data.position = seed.position;
      notes.push(`الترتيب ${current.position} ← ${seed.position}`);
    }

    // خطط أُعيد رسم حدودها بقرارٍ صريح — تُكتب حدودها ووصفها كما في الملف،
    // خفضاً أو رفعاً. وما عداها لا تُمسّ حدوده هنا (انظر apply-plan-limits).
    if (RESHAPED.has(seed.slug)) {
      for (const field of LIMIT_FIELDS) {
        if (current[field] !== seed[field]) {
          data[field] = seed[field];
          notes.push(`${field} ${current[field]} ← ${seed[field]}`);
        }
      }
      if (current.description !== seed.description) data.description = seed.description;
      // الإخفاء عن المشتركين الجدد — لا يمسّ من عليها
      if (current.isActive !== seed.isActive) {
        data.isActive = seed.isActive;
        notes.push(seed.isActive ? 'تُظهَر' : 'تُخفى عن المشتركين الجدد');
      }

      const onPlan =
        (await prisma.store.count({ where: { planId: current.id } })) +
        (await prisma.restaurant.count({ where: { planId: current.id } }));
      notes.push(`عليها ${onPlan} نشاطاً`);

      // من سيتجاوز الحدّ الجديد فور التطبيق — يُقال قبل التنفيذ لا بعده
      const over = await countOverLimit(current.id, seed);
      if (over.length) notes.push(`⚠️ يتجاوز الحدّ الجديد: ${over.join('، ')}`);
    }
    if (Object.keys(data).length || notes.some((n) => n.startsWith('⚠️'))) {
      console.log(`↑ ${seed.slug.padEnd(11)} ${notes.join(' · ')}`);
      if (APPLY) await prisma.plan.update({ where: { id: current.id }, data });
      changes += 1;
    } else {
      console.log(`✓ ${seed.slug.padEnd(11)} لا تغيير`);
    }
  }

  const popularSlug = PLAN_SEEDS.find((s) => s.isPopular)?.slug;
  if (popularSlug) {
    const wrong = existing.filter((p) => p.isPopular && p.slug !== popularSlug);
    const target = bySlug.get(popularSlug);
    if (wrong.length || (target && !target.isPopular)) {
      console.log(`★ شارة «الأكثر اختياراً» تنتقل إلى ${popularSlug}${wrong.length ? ` (من ${wrong.map((p) => p.slug).join('، ')})` : ''}`);
      if (APPLY) {
        await prisma.plan.updateMany({ where: { isPopular: true, NOT: { slug: popularSlug } }, data: { isPopular: false } });
        await prisma.plan.updateMany({ where: { slug: popularSlug }, data: { isPopular: true } });
      }
      changes += 1;
    }
  }

  console.log(APPLY ? `\n✅ نُفّذ ${changes} تغيير.` : `\nالمعاينة: ${changes} تغيير. أعد التشغيل مع --apply للتنفيذ.`);
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error('❌ فشلت المزامنة:', error.message);
  await prisma.$disconnect();
  process.exit(1);
});
