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
