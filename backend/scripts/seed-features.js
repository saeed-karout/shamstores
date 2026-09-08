#!/usr/bin/env node
// backend/scripts/seed-features.js
//
// كتالوج الإضافات المدفوعة.
//
// **يضيف الناقص ولا يعدّل الموجود.**
//
// الأسعار والأوصاف قرارٌ تجاري يعدّله السوبر أدمن من اللوحة، وبذرٌ يكتب
// فوقها مع كل نشرة يسحب من تجّار أسعاراً وعدناهم بها. ولذلك الصفّ الموجود
// يُترك كما هو — وهذا ما يجعل تشغيله في مرحلة الإصدار آمناً، فتظهر أي إضافة
// جديدة تلقائياً بلا خطوةٍ يدوية تُنسى.
//
// `--force` يحدّث الموجود أيضاً — لتعديلٍ مقصود في الأوصاف، ولا يُستعمل في
// مرحلة الإصدار.
//
// **قاعدة الإدراج:** لا تُعرَّف هنا إلا ميزةٌ **يفحصها الخادم فعلاً**. بيعُ
// ميزةٍ بلا حارس يعني تاجراً يدفع ولا يتغيّر شيء — وهو أسوأ من ألّا تُباع.
// كل رمزٍ أدناه مُتحقَّقٌ منه في الشيفرة، والعمود الأخير يقول أين.
//
// **ولا تُعرَّف ميزةٌ تمنحها كل الخطط**: `online_orders` و`table_qr`
// و`whatsapp` مفعّلة حتى في المجاني، فبيعها بيعُ هواء.

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
const prisma = new PrismaClient();

/**
 * السعر بالدولار شهرياً.
 *
 * كلٌّ منها **أقلّ من فرق الترقية التي تمنحه**: الترقية من pro إلى
 * enterprise تكلّف ‎$10، والنطاق الخاص وحده ‎$5. فالإضافة هي الطريق الأرخص
 * لمن يريد ميزةً واحدة، والترقية أوفر لمن يريد ثلاثاً — وهذا هو الحافز
 * المقصود، لا مصادفة تسعير.
 */
const FEATURES = [
  {
    code: 'custom_domain',
    name: 'نطاق خاص بك',
    nameEn: 'Custom domain',
    description:
      'اربط نطاقك (مثل mystore.com) بمتجرك، مع شهادة أمان تلقائية. ' +
      'الربط آليّ بالكامل: تضيف سجلّ CNAME واحداً ويتكفّل النظام بالباقي.',
    group: 'identity',
    price: 5,
    // مُتحقَّق: checkPlanFeature('custom_domain') على 3 مسارات
  },
  {
    code: 'multi_language',
    name: 'واجهة بلغتين',
    nameEn: 'Multi-language storefront',
    description:
      'أضف الإنجليزية إلى جانب العربية، واختر أيّهما يراها الزائر أولاً — ' +
      'أو أظهر واجهتك بالإنجليزية وحدها إن كان جمهورك غير عربي.',
    group: 'storefront',
    price: 4,
    // مُتحقَّق: language.service.validateLanguageUpdate عبر businessHasEntitlement
  },
  {
    code: 'analytics',
    name: 'لوحة التحليلات',
    nameEn: 'Analytics',
    description:
      'مبيعاتك عبر الوقت، وأكثر المنتجات طلباً، وساعات الذروة، ومتوسّط ' +
      'قيمة الطلب — بدل تخمين ما ينجح.',
    group: 'insights',
    price: 3,
    // مُتحقَّق: بوابة hasAnalytics في getPlanFeatureCodes وقائمة strictFeatures
  },
  {
    code: 'coupons',
    name: 'كوبونات الخصم',
    nameEn: 'Coupons',
    description:
      'أنشئ أكواد خصم بنسبة أو بمبلغ، بسقفٍ للاستخدام وتاريخ انتهاء، ' +
      'وتابع كم مرّة استُخدم كلٌّ منها.',
    group: 'marketing',
    price: 2,
    // مُتحقَّق: checkPlanFeature('coupons') على مسارين
  },
  {
    code: 'promotions',
    name: 'العروض والأقسام التسويقية',
    nameEn: 'Promotions',
    description:
      'شرائح إعلانية وأقسام مميّزة في واجهة متجرك، تُبرز ما تريد بيعه ' +
      'بدل ترك الزائر يبحث.',
    group: 'marketing',
    price: 2,
    // مُتحقَّق: checkPlanFeature('promotions')
  },
  {
    code: 'pos',
    name: 'الكاشير',
    nameEn: 'Point of sale',
    description:
      'بِع داخل محلّك من هاتفك: امسح الباركود بالكاميرا، أو ابحث بالاسم، ' +
      'وأتمم البيعة واحسب الباقي. المخزون ينقص تلقائياً وتدخل البيعة تقاريرك ' +
      'وقسمك المالي مع الطلبات الإلكترونية.',
    group: 'sales',
    price: 4,
    // مُتحقَّق: checkPlanFeature('pos') على كل مسارات /api/pos،
    // و`pos` مدرجة في strictFeatures فلا تُفتح لخطة مدفوعة بلا شراء
  },
  {
    code: 'affiliate',
    name: 'المسوّقون بالعمولة',
    nameEn: 'Affiliate program',
    description:
      'أعطِ كل مسوّق رابطاً خاصاً به، وتابع كم زيارة جلب وكم بيعة أتمّ وكم ' +
      'استحقّ. العمولة تُحسب تلقائياً، ولا تُستحقّ إلا باكتمال الطلب، وتسقط ' +
      'إن أُلغي.',
    group: 'marketing',
    price: 4,
    // مُتحقَّق: checkPlanFeature('affiliate') على مسارات التاجر،
    // و`affiliate` في strictFeatures فلا تُفتح لخطة مدفوعة بلا شراء
  },
  {
    code: 'branding_removal',
    name: 'إخفاء شعار المنصّة',
    nameEn: 'Remove platform badge',
    description:
      'يختفي «مدعوم من شام ستورز» من واجهة متجرك، فتظهر هويتك وحدها ' +
      'أمام زبائنك.',
    group: 'identity',
    price: 2,
    // مُتحقَّق: branding.service.shouldShowPlatformBadge
  }
];

const FORCE = process.argv.includes('--force');

(async () => {
  console.log(`فحص ${FEATURES.length} إضافة${FORCE ? ' (تحديث قسري)' : ''}…\n`);
  let added = 0;
  let kept = 0;

  for (const feature of FEATURES) {
    const data = {
      name: feature.name,
      nameEn: feature.nameEn,
      description: feature.description,
      group: feature.group,
      price: feature.price,
      // الاشتراك شهري لا شراءٌ نهائي: الميزة تكلّف تشغيلاً مستمراً
      // (نطاق، وترجمة، وتخزين تحليلات) فتسعيرها مرّةً واحدة يخسر مع الوقت
      isOneTime: false,
      category: 'both',
      isCore: false,
      isActive: true
    };

    const existing = await prisma.feature.findUnique({ where: { code: feature.code } });

    // الموجود يُترك: سعرٌ عدّلته الإدارة لا تكتب فوقه نشرةٌ عابرة
    if (existing && !FORCE) {
      kept += 1;
      console.log(`  تُركت   ${feature.code.padEnd(18)} $${existing.price}/شهر (كما ضبطتها الإدارة)`);
      continue;
    }

    await prisma.feature.upsert({
      where: { code: feature.code },
      update: data,
      create: { code: feature.code, ...data }
    });

    added += 1;
    console.log(`  ${existing ? 'حُدِّثت' : 'أُضيفت'}  ${feature.code.padEnd(18)} $${feature.price}/شهر`);
  }

  const total = await prisma.feature.count({ where: { isActive: true } });
  console.log(
    `\n✅ ${added ? `${added} تغيير` : 'لا تغيير'}` +
    `${kept ? ` · ${kept} تُركت كما هي` : ''} · الكتالوج ${total} إضافة مفعّلة.`
  );
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error('❌ فشل البذر:', error.message);
  await prisma.$disconnect();
  process.exit(1);
});
