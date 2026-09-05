#!/usr/bin/env node
// backend/scripts/admin.js
//
// عمليات إدارية على قاعدة البيانات، تُنفَّذ من دينو Heroku.
//
// لماذا من الدينو: كثير من الشبكات تحجب المنفذ 3306 صادراً، فيفشل الاتصال
// المباشر (Prisma Studio أو أي عميل MySQL) بـ ETIMEDOUT بينما الدينو يصل
// بلا مشكلة.
//
// الاستخدام:
//   heroku run --app shamstores "node backend/scripts/admin.js list-users"
//   heroku run --app shamstores "node backend/scripts/admin.js verify-user a@b.com"
//   heroku run --app shamstores "node backend/scripts/admin.js make-superadmin a@b.com"
//   heroku run --app shamstores "node backend/scripts/admin.js reset-password a@b.com"
//
// محلياً يعمل أيضاً على قاعدة التطوير عبر DATABASE_URL في backend/.env.

const path = require('path');

// محلياً: اقرأ backend/.env مهما كان مجلد التشغيل. على Heroku لا وجود للملف
// والمتغيرات مضبوطة أصلاً في البيئة.
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  /* dotenv غير مثبت — لا يهم، المتغيرات من البيئة */
}

// نفس منطق src/config/env.ts: إضافات Heroku تسمّي الرابط باسمها الخاص
if (!process.env.DATABASE_URL) {
  const addonUrl =
    process.env.JAWSDB_URL ||
    process.env.JAWSDB_MARIA_URL ||
    process.env.CLEARDB_DATABASE_URL;
  if (addonUrl) process.env.DATABASE_URL = addonUrl;
}

// أداة إدارية قصيرة العمر: اتصالان يكفيان. الخطة المجانية تسمح بعشرة لكل
// مستخدم، ويستهلك التطبيق العامل معظمها — بلا هذا الحدّ يفشل السكربت بـ
// max_user_connections.
if (process.env.DATABASE_URL && !/[?&]connection_limit=/.test(process.env.DATABASE_URL)) {
  const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${separator}connection_limit=2`;
}

const [command, ...args] = process.argv.slice(2);

// العميل يُنشأ عند الحاجة فقط، حتى تعمل المساعدة بلا قاعدة بيانات
let _prisma = null;
const getPrisma = () => {
  if (!_prisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error('لا DATABASE_URL ولا رابط إضافة قاعدة بيانات.');
    }
    const { PrismaClient } = require('@prisma/client');
    _prisma = new PrismaClient();
  }
  return _prisma;
};

/** الخدمات مكتوبة بـ TypeScript — نقرأ نسخها المبنية من dist */
const loadService = (name) => {
  try {
    return require(path.join(__dirname, '..', 'dist', 'services', name));
  } catch {
    throw new Error(`لم أجد dist/services/${name} — ابنِ الباكيند أولاً (npm run build).`);
  }
};

/** خدمة النسخ مكتوبة بـ TypeScript — نقرأ نسختها المبنية */
const loadBackupService = () => {
  try {
    return require(path.join(__dirname, '..', 'dist', 'services', 'backup.service'));
  } catch {
    throw new Error('لم أجد dist/services/backup.service — ابنِ الباكيند أولاً (npm run build).');
  }
};

/** slugify مكتوب بـ TypeScript — نعيد استعماله لا ننسخه */
const loadSlugify = () => {
  try {
    return require(path.join(__dirname, '..', 'dist', 'utils', 'slugify')).default;
  } catch {
    throw new Error('لم أجد dist/utils/slugify — ابنِ الباكيند أولاً (npm run build).');
  }
};

const requireEmail = () => {
  const email = (args[0] || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('مرّر بريداً إلكترونياً صالحاً كوسيط أول.');
  }
  return email;
};

const findUser = async (email) => {
  const user = await getPrisma().user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, isEmailVerified: true, isActive: true }
  });
  if (!user) throw new Error(`لا مستخدم بالبريد ${email}`);
  return user;
};

const commands = {
  /**
   * ينقل المتاجر من اللوحة القديمة المكسورة إلى لوحة المتجر الجديدة.
   *
   * الافتراضي القديم كان خلفية بيضاء ونصاً أسود مع بطاقات وأسطح داكنة —
   * نصٌّ رمادي فاتح على أبيض وبطاقات سوداء عليه. تغيير الافتراضي في
   * المخطط يصلح المتاجر الجديدة وحدها، وهذه للقائمة.
   *
   * ⚠️ يمسّ فقط ما طابق القيم القديمة حرفياً. متجر عدّل لونه عمداً — ولو
   * إلى الأبيض — لا يُلمس: تفضيله أهمّ من اتّساقنا.
   */
  async 'restyle-stores'() {
    // لوحتان قديمتان: البيضاء المكسورة، والزرقاء التي وصلت الإنتاج
    // لفترة قصيرة قبل العودة إلى هوية المنصة.
    const OLD_SETS = [
      { backgroundColor: '#FFFFFF', textColor: '#000000' },
      { backgroundColor: '#0D1424', textColor: '#E9EEF9' }
    ];
    const OLD = { OR: OLD_SETS };
    const NEW = {
      primaryColor: '#0D4A3A',
      secondaryColor: '#10B981',
      backgroundColor: '#082E24',
      textColor: '#E8F5E9',
      cardColor: '#112E23',
      surfaceColor: '#0F3D31',
      mutedColor: '#9DC4AC',
      accentColor: '#C8E235'
    };

    const p = getPrisma();
    const candidates = await p.store.findMany({
      where: OLD,
      select: { id: true, name: true, backgroundColor: true }
    });

    if (candidates.length === 0) {
      console.log('لا متجر على اللوحة القديمة — لا تغيير.');
      return;
    }

    const dryRun = args.includes('--dry-run');
    console.log(`${candidates.length} متجر على لوحة قديمة:`);
    for (const store of candidates) console.log(`  • ${store.name} (${store.backgroundColor})`);

    if (dryRun) {
      console.log('');
      console.log('(معاينة فقط — أعد الأمر بلا --dry-run للتنفيذ)');
      return;
    }

    const result = await p.store.updateMany({ where: OLD, data: NEW });
    console.log('');
    console.log(`✅ حُدِّث ${result.count} متجر إلى لوحة المتجر الداكنة.`);
  },
  /**
   * يلحق نشاطاً تجارياً بحساب أُنشئ زبوناً بالخطأ.
   *
   * لإصلاح الحسابات التي سجّلت بغوغل قبل أن يقرأ firebaseSignIn نيّة
   * التسجيل: بقيت role: 'user' بلا متجر، ولا سبيل لصاحبها لبلوغ لوحة
   * التحكم إطلاقاً.
   */
  async 'attach-business'() {
    const email = requireEmail();
    const type = (args[1] || '').trim();
    const name = args.slice(2).join(' ').trim();

    if (type !== 'restaurant' && type !== 'store') {
      throw new Error('النوع يجب أن يكون restaurant أو store.');
    }
    if (!name) throw new Error('مرّر اسم النشاط بعد النوع.');

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, restaurantId: true, storeId: true }
    });
    if (!user) throw new Error(`لا مستخدم بالبريد ${email}`);

    // الإلحاق مرة واحدة: حساب له نشاط أصلاً يحتاج نقلاً لا إنشاءً
    if (user.restaurantId || user.storeId) {
      console.log(`ℹ️  ${email} مرتبط بنشاط مسبقاً — لا تغيير.`);
      console.log(`      restaurantId: ${user.restaurantId || '—'} · storeId: ${user.storeId || '—'}`);
      return;
    }

    // المطاعم والمتاجر تتقاسم فضاء النطاقات الفرعية — التفرّد عبر الجدولين
    const slugify = loadSlugify();
    const baseSlug = slugify(name) || type;
    let slug = baseSlug;
    let counter = 1;
    while (
      (await prisma.restaurant.findUnique({ where: { slug } })) ||
      (await prisma.store.findUnique({ where: { slug } }))
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    const data = {
      name,
      slug,
      subdomain: slug,
      email: user.email,
      userId: user.id,
      planId: '11111111-1111-1111-1111-111111111111',
      isActive: true
    };

    const business = type === 'restaurant'
      ? await prisma.restaurant.create({ data })
      : await prisma.store.create({ data });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'owner',
        ...(type === 'restaurant' ? { restaurantId: business.id } : { storeId: business.id })
      }
    });

    console.log(`✅ ${email}: ${user.role} → owner`);
    console.log(`      ${type === 'restaurant' ? 'مطعم' : 'متجر'} «${name}» — النطاق: ${slug}`);
  },
  async 'list-users'() {
    const limit = Number(args[0]) || 20;
    const users = await getPrisma().user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { email: true, name: true, role: true, isEmailVerified: true, isActive: true, createdAt: true }
    });
    if (users.length === 0) {
      console.log('لا مستخدمين بعد.');
      return;
    }
    console.log(`آخر ${users.length} مستخدم:\n`);
    for (const u of users) {
      const flags = [
        u.isEmailVerified ? 'مُفعَّل' : 'غير مُفعَّل',
        u.isActive ? 'نشِط' : 'موقوف'
      ].join(' · ');
      console.log(`  ${u.email}`);
      console.log(`      ${u.name || '(بلا اسم)'} — ${u.role} — ${flags}`);
    }
  },

  async 'verify-user'() {
    const email = requireEmail();
    const user = await findUser(email);
    if (user.isEmailVerified) {
      console.log(`ℹ️  ${email} مُفعَّل مسبقاً — لا تغيير.`);
      return;
    }
    await getPrisma().user.update({ where: { id: user.id }, data: { isEmailVerified: true } });
    console.log(`✅ فُعِّل ${email} — يمكنه الدخول الآن بلا رمز بريد.`);
  },

  async 'make-superadmin'() {
    const email = requireEmail();
    const user = await findUser(email);
    if (user.role === 'super_admin') {
      console.log(`ℹ️  ${email} سوبر أدمن مسبقاً — لا تغيير.`);
      return;
    }
    await getPrisma().user.update({
      where: { id: user.id },
      data: { role: 'super_admin', isEmailVerified: true }
    });
    console.log(`✅ ${email}: ${user.role} → super_admin (ومُفعَّل).`);
  },

  /**
   * تغيير الافتراضي في المخطط لا يمسّ الصفوف القائمة: الأنشطة المُنشأة قبله
   * تبقى على عملتها القديمة. هذا الأمر يرحّلها إلى عملة الأساس.
   */
  async 'migrate-currency'() {
    const from = (args[0] || 'SAR').toUpperCase();
    const to = (args[1] || 'SYP').toUpperCase();
    const p = getPrisma();

    const [restaurants, stores] = await Promise.all([
      p.restaurant.count({ where: { currency: from } }),
      p.store.count({ where: { currency: from } })
    ]);

    if (restaurants + stores === 0) {
      console.log(`لا نشاط على ${from} — لا تغيير.`);
      return;
    }

    console.log(`سيُنقل ${restaurants} مطعماً و${stores} متجراً من ${from} إلى ${to}`);
    await Promise.all([
      p.restaurant.updateMany({ where: { currency: from }, data: { currency: to } }),
      p.store.updateMany({ where: { currency: from }, data: { currency: to } })
    ]);
    console.log('✅ تمّ.');
  },

  /** سعر صرف الدولار العام — يسري على المنصة كلها */
  async 'set-usd-rate'() {
    const raw = args[0];
    const rate = Number(raw);
    if (!Number.isFinite(rate) || rate < 1 || rate > 1000000) {
      throw new Error('مرّر سعر صرف رقمياً بين 1 و1,000,000 (كم ليرة للدولار).');
    }
    await getPrisma().extendedPlatformSetting.upsert({
      where: { keyName: 'usd_exchange_rate' },
      update: { value: String(rate), type: 'number', settingGroup: 'payment', isPublic: true },
      create: {
        keyName: 'usd_exchange_rate', value: String(rate), type: 'number',
        settingGroup: 'payment', isPublic: true, isEditable: true,
        description: 'سعر صرف الدولار بالليرة السورية'
      }
    });
    console.log(`✅ سعر الصرف الآن ${rate.toLocaleString('en-US')} ل.س للدولار.`);
  },

  /**
   * بذر الخطط لا يعمل إلا والجدول فارغ، فتبقى القواعد القائمة على تعريف
   * قديم بعد أي تغيير في التسعير أو الحدود. هذا الأمر يوائمها مع
   * src/config/plans.ts — المصدر الوحيد للتعريف.
   */
  async 'sync-plans'() {
    let seeds;
    try {
      seeds = require(path.join(__dirname, '..', 'dist', 'config', 'plans')).PLAN_SEEDS;
    } catch {
      throw new Error('لم أجد dist/config/plans — ابنِ الباكيند أولاً (npm run build).');
    }

    const p = getPrisma();
    for (const seed of seeds) {
      const before = await p.plan.findUnique({ where: { id: seed.id } });
      await p.plan.upsert({ where: { id: seed.id }, update: seed, create: seed });

      if (!before) {
        console.log(`+ ${seed.name}: أُنشئت — $${seed.price} · ${seed.maxProducts} منتج · ${seed.maxOrders} طلب`);
      } else {
        // كل حقل يتغيّر يُذكَر. المقارنة على السعر وعدد المنتجات وحدهما
        // كانت تطبع «بلا تغيير» بينما الحصّة أو بوابة الطلبات تتبدّل —
        // تقريرٌ يكذب أسوأ من غيابه.
        const changes = [];
        if (before.price !== seed.price) changes.push(`السعر $${before.price} → $${seed.price}`);
        if (before.maxProducts !== seed.maxProducts) changes.push(`المنتجات ${before.maxProducts} → ${seed.maxProducts}`);
        if (before.maxMenuItems !== seed.maxMenuItems) changes.push(`الأصناف ${before.maxMenuItems} → ${seed.maxMenuItems}`);
        if (before.maxOrders !== seed.maxOrders) changes.push(`الطلبات ${before.maxOrders} → ${seed.maxOrders}`);
        if (before.hasOnlineOrders !== !!seed.hasOnlineOrders) changes.push(`الطلبات أونلاين ${before.hasOnlineOrders ? 'نعم' : 'لا'} → ${seed.hasOnlineOrders ? 'نعم' : 'لا'}`);
        if (before.hasBrandingRemoval !== !!seed.hasBrandingRemoval) changes.push(`إخفاء الشعار ${before.hasBrandingRemoval ? 'نعم' : 'لا'} → ${seed.hasBrandingRemoval ? 'نعم' : 'لا'}`);

        console.log(changes.length ? `~ ${seed.name}: ${changes.join(' · ')}` : `= ${seed.name}: بلا تغيير`);
      }
    }
    console.log('');
    console.log('✅ الخطط موائمة لـ src/config/plans.ts');
  },

  /** نسخة احتياطية فورية — لا تنتظر موعد 03:00 */
  async 'backup-now'() {
    const { createBackup, pruneOldBackups } = loadBackupService();
    console.log('جارٍ إنشاء نسخة احتياطية...');
    const result = await createBackup();

    if (!result.ok) {
      throw new Error(result.error);
    }

    console.log(`✅ ${result.key}`);
    console.log(`   ${result.rows} صفاً من ${result.tables} جدولاً · ${Math.round(result.bytes / 1024)} ك.ب مضغوطة`);

    const pruned = await pruneOldBackups();
    if (pruned > 0) console.log(`   حُذفت ${pruned} نسخة تجاوزت مدة الاحتفاظ`);
  },

  /**
   * عرض النسخ المتاحة. نسخة لا تعرف أنها موجودة ليست نسخة —
   * شغّل هذا دورياً لتتأكد أن الجدولة تعمل فعلاً.
   */
  async 'backup-list'() {
    const { listBackups } = loadBackupService();
    const backups = await listBackups();

    if (backups.length === 0) {
      console.log('لا نسخ احتياطية بعد.');
      return;
    }

    console.log(`${backups.length} نسخة:`);
    for (const b of backups) {
      const when = b.lastModified ? new Date(b.lastModified).toISOString().slice(0, 16).replace('T', ' ') : '?';
      console.log(`  ${when}   ${String(Math.round(b.size / 1024)).padStart(6)} ك.ب   ${b.key}`);
    }

    const newest = backups[0].lastModified ? new Date(backups[0].lastModified) : null;
    if (newest) {
      const hours = Math.round((Date.now() - newest.getTime()) / 3600000);
      if (hours > 30) {
        console.log(`⚠️  أحدث نسخة عمرها ${hours} ساعة — الجدولة قد تكون متوقفة.`);
      }
    }
  },

  /**
   * يقارن أعمدة قاعدة البيانات بما يتوقّعه المخطط.
   *
   * تغيير المخطط بلا `prisma db push` يترك أعمدة مفقودة، فتفشل كل قراءة
   * للجدول بـ P2022 — وتظهر الشاشة معطّلة بلا سبب واضح في الواجهة.
   */
  async 'schema-check'() {
    const { Prisma } = require('@prisma/client');
    const p = getPrisma();
    let missing = 0;

    for (const model of Prisma.dmmf.datamodel.models) {
      const table = model.dbName || model.name;
      let columns;
      try {
        const rows = await p.$queryRawUnsafe(`SHOW COLUMNS FROM \`${table}\``);
        columns = rows.map((r) => r.Field);
      } catch {
        console.log(`✘ ${table}: الجدول غير موجود`);
        missing++;
        continue;
      }

      // الحقول القياسية وحدها — العلاقات ليست أعمدة
      const expected = model.fields
        .filter((f) => f.kind === 'scalar' || f.kind === 'enum')
        .map((f) => f.dbName || f.name);

      const absent = expected.filter((name) => !columns.includes(name));
      if (absent.length > 0) {
        console.log(`✘ ${table}: أعمدة مفقودة → ${absent.join(', ')}`);
        missing += absent.length;
      }
    }

    if (missing === 0) {
      console.log('✅ قاعدة البيانات موائمة للمخطط.');
    } else {
      console.log("");
      console.log(`⚠️  ${missing} عنصراً مفقوداً. شغّل:`);
      console.log('   npm --prefix backend run prisma:db-push');
      process.exitCode = 1;
    }
  },

  /**
   * يكشف طلبات الترقية الموافَق عليها بلا صفّ اشتراك مقابل.
   *
   * approveUpgrade كان يغيّر الخطة ويقلب الحالة بلا إنشاء اشتراك. الإصلاح
   * يعمل للأمام فقط — الطلبات المقبولة قبله تبقى بلا سجلّ.
   */
  async 'check-subscriptions'() {
    const p = getPrisma();
    const approved = await p.upgradeRequest.findMany({ where: { status: 'approved' } });
    const total = await p.subscription.count();

    console.log(`طلبات موافَق عليها: ${approved.length}`);
    console.log(`صفوف اشتراك:        ${total}`);

    const orphans = [];
    for (const req of approved) {
      const businessId = req.restaurantId || req.storeId;
      if (!businessId) continue;
      const match = await p.subscription.findFirst({
        where: { businessId, planId: req.requestedPlanId }
      });
      if (!match) orphans.push(req);
    }

    if (orphans.length === 0) {
      console.log('');
      console.log('✅ كل طلب مقبول له اشتراك.');
      return;
    }

    console.log('');
    console.log(`⚠️  ${orphans.length} طلباً مقبولاً بلا اشتراك (عولجت بالكود القديم):`);
    for (const o of orphans) {
      console.log(`   ${o.id} — ${o.restaurantId ? 'مطعم' : 'متجر'} ${o.restaurantId || o.storeId}`);
    }
    console.log('');
    console.log('لإنشائها: node backend/scripts/admin.js backfill-subscriptions');
  },

  /** ينشئ الاشتراكات الناقصة للطلبات المقبولة قديماً */
  async 'backfill-subscriptions'() {
    const p = getPrisma();
    const approved = await p.upgradeRequest.findMany({ where: { status: 'approved' } });
    let created = 0;

    for (const req of approved) {
      const businessId = req.restaurantId || req.storeId;
      if (!businessId) continue;

      const exists = await p.subscription.findFirst({
        where: { businessId, planId: req.requestedPlanId }
      });
      if (exists) continue;

      const plan = await p.plan.findUnique({ where: { id: req.requestedPlanId } });
      if (!plan) {
        console.log(`- تخطّي ${req.id}: الخطة لم تعد موجودة`);
        continue;
      }

      // تاريخ البدء = تاريخ المراجعة الفعلي لا اليوم، وإلا بدا الاشتراك
      // أحدث مما هو وتأخّر انتهاؤه بلا وجه حق
      const startDate = req.reviewedAt || req.requestedAt || new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      await p.subscription.create({
        data: {
          businessType: req.restaurantId ? 'restaurant' : 'store',
          businessId,
          planId: plan.id,
          planName: plan.name,
          months: 1,
          price: plan.price,
          discount: 0,
          totalPaid: 0,
          startDate,
          endDate,
          status: endDate > new Date() ? 'active' : 'expired',
          paymentMethod: 'manual',
          notes: `استدراك — طلب ${req.id} قُبل قبل إصلاح إنشاء الاشتراك`
        }
      });
      created++;
      console.log(`+ ${plan.name} لـ ${businessId}`);
    }

    console.log('');
    console.log(created === 0 ? 'لا شيء للاستدراك.' : `✅ أُنشئ ${created} اشتراكاً.`);
  },

  /** معاينة إعادة تقويم العملة — بلا أي كتابة */
  async 'redenominate-preview'() {
    const { planRedenomination, DIVISOR } = loadService('redenomination.service');
    const plan = await planRedenomination();

    if (plan.alreadyApplied) {
      console.log(`⚠️  الترحيل نُفِّذ مسبقاً في ${plan.alreadyApplied}`);
      console.log('   تنفيذه مجدداً يقسم على عشرة آلاف. لا تُعده.');
      console.log('');
    }

    console.log(`سيُقسَم على ${DIVISOR}:`);
    for (const c of plan.changes) {
      const sample = c.sampleBefore !== null
        ? `  (مثال: ${c.sampleBefore.toLocaleString()} → ${c.sampleAfter.toLocaleString()})`
        : '';
      console.log(`  ${c.table}.${c.field}: ${c.rows} صفاً${sample}`);
    }

    console.log('');
    console.log('لن تُمَسّ:');
    for (const s of plan.skipped) console.log(`  ${s.field} — ${s.reason}`);

    console.log('');
    console.log(`إجمالي الصفوف: ${plan.totalRows}`);
    console.log('');
    console.log('⚠️  خذ نسخة احتياطية أولاً: backup-now');
    console.log('   ثم نفّذ: redenominate-apply');
  },

  /** ينفّذ إعادة التقويم — لا رجعة عنه */
  async 'redenominate-apply'() {
    const { applyRedenomination } = loadService('redenomination.service');
    const force = args[0] === '--force';

    console.log('جارٍ إعادة التقويم...');
    const result = await applyRedenomination(force);

    if (!result.ok) {
      throw new Error(result.error);
    }

    console.log(`✅ حُدِّث ${result.updated} صفاً.`);
    if (result.newUsdRate !== null) {
      console.log(`   سعر الصرف الجديد: ${result.newUsdRate} ل.س للدولار`);
    }
  },

  async 'reset-password'() {
    const email = requireEmail();
    const user = await findUser(email);
    // كلمة مرور مؤقتة عشوائية تُطبع مرة واحدة — غيّرها فور الدخول
    const bcrypt = require('bcrypt');
    const temp = require('crypto').randomBytes(9).toString('base64url');
    await getPrisma().user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(temp, 10), loginAttempts: 0, lockedUntil: null }
    });
    console.log(`✅ كلمة مرور مؤقتة لـ ${email}:  ${temp}`);
    console.log('   غيّرها فور الدخول — طُبعت في سجل Heroku.');
  }
};

(async () => {
  try {
    const run = commands[command];
    if (!run) {
      console.log('الأوامر المتاحة:\n');
      console.log('  list-users [عدد]          عرض آخر المستخدمين');
      console.log('  verify-user <بريد>        تفعيل الحساب بلا رمز بريد');
      console.log('  make-superadmin <بريد>    ترقية إلى سوبر أدمن');
      console.log('  reset-password <بريد>     كلمة مرور مؤقتة');
      console.log('  attach-business <بريد> <restaurant|store> <اسم>  إلحاق نشاط بحساب أُنشئ زبوناً');
      console.log('  restyle-stores [--dry-run]  نقل المتاجر من اللوحة البيضاء المكسورة');
      console.log('  migrate-currency [من] [إلى]  ترحيل عملة الأنشطة (افتراضياً SAR→SYP)');
      console.log('  set-usd-rate <رقم>        سعر صرف الدولار العام');
      console.log('  sync-plans                مواءمة الخطط مع تعريفها في الكود');
      console.log('  backup-now                نسخة احتياطية فورية');
      console.log('  backup-list               عرض النسخ المتاحة');
      console.log('  schema-check              مقارنة قاعدة البيانات بالمخطط');
      console.log('  check-subscriptions       كشف طلبات مقبولة بلا اشتراك');
      console.log('  backfill-subscriptions    إنشاء الاشتراكات الناقصة');
      console.log('  redenominate-preview      معاينة حذف صفرين من الأسعار');
      console.log('  redenominate-apply        تنفيذه (لا رجعة)');
      process.exitCode = command ? 1 : 0;
      return;
    }
    await run();
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  } finally {
    // لا تُنشئ عميلاً لمجرد إغلاقه — المساعدة تعمل بلا قاعدة بيانات
    if (_prisma) await _prisma.$disconnect();
  }
})();
