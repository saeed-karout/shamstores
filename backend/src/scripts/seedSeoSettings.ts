// backend/src/scripts/seedSeoSettings.ts
import { PrismaClient, SettingGroup } from '@prisma/client';

const prisma = new PrismaClient();

interface SEOSetting {
  keyName: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  settingGroup: SettingGroup;  // استخدم الـ enum مباشرة
  isPublic: boolean;
  isEditable: boolean;
  description: string;
}

const seoSettings: SEOSetting[] = [
  // SEO Basic
  { keyName: 'seo_title', value: 'شام ستورز | الحل الرقمي المتكامل للمطاعم والمتاجر', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'عنوان الصفحة الرئيسية (SEO Title)' },
  { keyName: 'seo_title_en', value: 'Sham Stores | The Complete Digital Solution for Restaurants and Stores', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'عنوان الصفحة الرئيسية بالإنجليزية' },
  { keyName: 'seo_description', value: 'حوّل مطعمك أو متجرك إلى تجربة رقمية متكاملة مع شام ستورز. قوائم ذكية، طلبات أونلاين، QR Code، وتحليلات متقدمة. ابدأ الآن مجاناً!', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'وصف الموقع' },
  { keyName: 'seo_description_en', value: 'Transform your restaurant or store into a complete digital experience with Sham Stores. Smart menus, online orders, QR Code, and advanced analytics. Start for free!', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'وصف الموقع بالإنجليزية' },
  { keyName: 'seo_keywords', value: 'قائمة رقمية, منيو مطعم, طلبات اونلاين, QR Code للمطاعم, متجر إلكتروني, نظام مطاعم, شام ستورز, Sham Stores, digital menu, restaurant management', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'الكلمات المفتاحية' },
  { keyName: 'seo_author', value: 'Sham Stores', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اسم المؤلف' },
  { keyName: 'seo_robots', value: 'index, follow', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'إعدادات محركات البحث' },
  { keyName: 'seo_canonical_url', value: 'https://shamstores.com/', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'الرابط الأساسي' },
  
  // Open Graph
  { keyName: 'og_title', value: 'شام ستورز | الحل الرقمي المتكامل للمطاعم والمتاجر', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'عنوان Open Graph' },
  { keyName: 'og_title_en', value: 'Sham Stores | The Complete Digital Solution for Restaurants and Stores', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'عنوان Open Graph بالإنجليزية' },
  { keyName: 'og_description', value: 'حوّل مطعمك أو متجرك إلى تجربة رقمية متكاملة مع شام ستورز. قوائم ذكية، طلبات أونلاين، QR Code، وتحليلات متقدمة.', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'وصف Open Graph' },
  { keyName: 'og_description_en', value: 'Transform your restaurant or store into a complete digital experience with Sham Stores. Smart menus, online orders, QR Code, and advanced analytics.', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'وصف Open Graph بالإنجليزية' },
  { keyName: 'og_image', value: '/og-image.jpg', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رابط صورة Open Graph' },
  { keyName: 'og_type', value: 'website', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'نوع Open Graph' },
  
  // Twitter Card
  { keyName: 'twitter_card', value: 'summary_large_image', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'نوع بطاقة Twitter' },
  { keyName: 'twitter_title', value: 'شام ستورز | الحل الرقمي المتكامل للمطاعم والمتاجر', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'عنوان Twitter Card' },
  { keyName: 'twitter_title_en', value: 'Sham Stores | The Complete Digital Solution for Restaurants and Stores', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'عنوان Twitter Card بالإنجليزية' },
  { keyName: 'twitter_description', value: 'حوّل مطعمك أو متجرك إلى تجربة رقمية متكاملة مع شام ستورز.', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'وصف Twitter Card' },
  { keyName: 'twitter_description_en', value: 'Transform your restaurant or store into a complete digital experience with Sham Stores.', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'وصف Twitter Card بالإنجليزية' },
  { keyName: 'twitter_image', value: '/og-image.jpg', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رابط صورة Twitter Card' },
  
  // Schema.org
  { keyName: 'schema_org_type', value: 'SoftwareApplication', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'نوع Schema.org' },
  { keyName: 'schema_org_name', value: 'شام ستورز', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اسم Schema.org' },
  { keyName: 'schema_org_name_en', value: 'Sham Stores', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اسم Schema.org بالإنجليزية' },
  { keyName: 'schema_org_description', value: 'الحل الرقمي المتكامل للمطاعم والمتاجر - قوائم رقمية، طلبات أونلاين، QR Code، وتحليلات متقدمة', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'وصف Schema.org' },
  { keyName: 'schema_org_description_en', value: 'The complete digital solution for restaurants and stores - digital menus, online orders, QR Code, and advanced analytics', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'وصف Schema.org بالإنجليزية' },
  { keyName: 'schema_org_rating_value', value: '4.9', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'قيمة التقييم' },
  { keyName: 'schema_org_rating_count', value: '1250', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'عدد التقييمات' },
  
  // Additional
  { keyName: 'alternate_languages', value: '["ar","en"]', type: 'array', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اللغات البديلة' },
  { keyName: 'google_analytics_id', value: '', type: 'string', settingGroup: 'general', isPublic: false, isEditable: true, description: 'معرف Google Analytics' },
  { keyName: 'facebook_pixel_id', value: '', type: 'string', settingGroup: 'general', isPublic: false, isEditable: true, description: 'معرف Facebook Pixel' },
  { keyName: 'google_tag_manager_id', value: '', type: 'string', settingGroup: 'general', isPublic: false, isEditable: true, description: 'معرف Google Tag Manager' },
  { keyName: 'revisit_after', value: '7 days', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'فترة إعادة الزيارة' },
  { keyName: 'geo_region', value: 'SA-RI', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'المنطقة الجغرافية' },
  { keyName: 'geo_placename', value: 'Riyadh', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اسم المكان' },
  { keyName: 'geo_position', value: '24.7136;46.6753', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'الإحداثيات الجغرافية' },
  { keyName: 'icbm', value: '24.7136,46.6753', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'إحداثيات ICBM' }
];

async function seedSeoSettings() {
  console.log('🚀 بدء إضافة إعدادات SEO...');
  console.log(`📊 عدد الإعدادات: ${seoSettings.length}`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const setting of seoSettings) {
    try {
      const result = await prisma.extendedPlatformSetting.upsert({
        where: { keyName: setting.keyName },
        update: {
          value: setting.value,
          type: setting.type as any,
          settingGroup: setting.settingGroup,
          isPublic: setting.isPublic,
          isEditable: setting.isEditable,
          description: setting.description,
          updatedAt: new Date()
        },
        create: {
          keyName: setting.keyName,
          value: setting.value,
          type: setting.type as any,
          settingGroup: setting.settingGroup,
          isPublic: setting.isPublic,
          isEditable: setting.isEditable,
          description: setting.description
        }
      });
      
      console.log(`✅ ${successCount + 1}. تم إضافة/تحديث: ${setting.keyName}`);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`❌ خطأ في ${setting.keyName}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`🎉 اكتمل التنفيذ!`);
  console.log(`✅ تم بنجاح: ${successCount} إعداد`);
  console.log(`❌ فشل: ${errorCount} إعداد`);
  console.log('='.repeat(50));
}

// تشغيل السكربت
seedSeoSettings()
  .catch((error) => {
    console.error('💥 خطأ فادح:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 تم قطع الاتصال بقاعدة البيانات');
    process.exit(0);
  });