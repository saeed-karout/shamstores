#!/usr/bin/env node
// backend/scripts/prisma.js
//
// غلاف رقيق حول Prisma CLI.
//
// السبب: إضافات Heroku (JawsDB/ClearDB) توفّر رابط الاتصال باسمها الخاص لا
// باسم DATABASE_URL. التطبيق يُسقطه في src/config/env.ts عند الإقلاع، لكن
// Prisma CLI عملية منفصلة لا تمرّ بذلك الكود، فتفشل بـ P1012:
//   Environment variable not found: DATABASE_URL
//
// نُسقط الاسم هنا بنفس منطق env.ts قبل استدعاء prisma.
// محلياً لا يفعل شيئاً: DATABASE_URL موجود في backend/.env أصلاً.
//
// الاستخدام:  node scripts/prisma.js db push
//             node scripts/prisma.js migrate deploy

const { spawnSync } = require('child_process');
const path = require('path');

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

if (!process.env.DATABASE_URL) {
  console.error('❌ لا DATABASE_URL ولا رابط إضافة (JAWSDB_URL / CLEARDB_DATABASE_URL).');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ لم تُحدَّد أوامر لـ prisma. مثال: node scripts/prisma.js db push');
  process.exit(1);
}

// استدعاء الملف التنفيذي المحلي مباشرة — أسرع من npx وأدق من الاعتماد على PATH
const isWindows = process.platform === 'win32';
const binName = isWindows ? 'prisma.cmd' : 'prisma';
const prismaBin = path.join(__dirname, '..', 'node_modules', '.bin', binName);

// على Windows نحتاج shell لتشغيل ملف .cmd، والصدفة تقسم المسار عند المسافات
// (مثل مجلد يحوي مسافة في اسمه) ما لم نقتبسه.
const command = isWindows ? '"' + prismaBin + '"' : prismaBin;

const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: process.env,
  cwd: path.join(__dirname, '..'),
  shell: isWindows
});

if (result.error) {
  console.error('❌ تعذّر تشغيل Prisma CLI:', result.error.message);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
