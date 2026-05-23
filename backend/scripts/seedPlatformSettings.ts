// backend/src/scripts/seedPlatformSettings.ts

import prisma from '../services/prisma';

const defaultSettings = [
  // إعدادات عامة
  { keyName: 'site_name', value: 'شام ستورز', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اسم المنصة بالعربية' },
  { keyName: 'site_name_en', value: 'Sham Stores', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اسم المنصة بالإنجليزية' },
  { keyName: 'site_logo', value: '', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رابط شعار المنصة' },
  { keyName: 'site_favicon', value: '', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رابط أيقونة المنصة' },
  { keyName: 'primary_color', value: '#C8E235', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اللون الأساسي للمنصة' },
  { keyName: 'secondary_color', value: '#10B981', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اللون الثانوي للمنصة' },
  { keyName: 'maintenance_mode', value: 'false', type: 'boolean', settingGroup: 'general', isPublic: true, isEditable: true, description: 'تفعيل وضع الصيانة' },
  { keyName: 'maintenance_message', value: 'نعمل على تحسين المنصة، نعتذر عن الإزعاج', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رسالة الصيانة بالعربية' },
  { keyName: 'maintenance_message_en', value: 'We are improving the platform, sorry for the inconvenience', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رسالة الصيانة بالإنجليزية' },
  { keyName: 'contact_email', value: 'support@digitalmenu.com', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'بريد الدعم الفني' },
  { keyName: 'contact_phone', value: '+966 123456789', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رقم الدعم الفني' },
  { keyName: 'contact_whatsapp', value: '+966 123456789', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رقم واتساب الدعم' },
  { keyName: 'address', value: 'الرياض، المملكة العربية السعودية', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'عنوان المنصة' },
  { keyName: 'address_en', value: 'Riyadh, Saudi Arabia', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'عنوان المنصة بالإنجليزية' },

  // إعدادات المصادقة
  { keyName: 'allow_registration', value: 'true', type: 'boolean', settingGroup: 'auth', isPublic: true, isEditable: true, description: 'السماح بتسجيل حسابات جديدة' },
  { keyName: 'require_email_verification', value: 'false', type: 'boolean', settingGroup: 'auth', isPublic: true, isEditable: true, description: 'طلب تفعيل البريد الإلكتروني' },
  { keyName: 'max_login_attempts', value: '5', type: 'number', settingGroup: 'auth', isPublic: true, isEditable: true, description: 'الحد الأقصى لمحاولات الدخول' },
  { keyName: 'lockout_duration', value: '15', type: 'number', settingGroup: 'auth', isPublic: true, isEditable: true, description: 'مدة قفل الحساب بالدقائق' },
  { keyName: 'session_timeout_minutes', value: '720', type: 'number', settingGroup: 'auth', isPublic: true, isEditable: true, description: 'مدة انتهاء الجلسة بالدقائق' },

  // إعدادات الأعمال
  { keyName: 'max_restaurants_per_owner', value: '5', type: 'number', settingGroup: 'business', isPublic: false, isEditable: true, description: 'الحد الأقصى للمطاعم لكل مالك' },
  { keyName: 'max_stores_per_owner', value: '5', type: 'number', settingGroup: 'business', isPublic: false, isEditable: true, description: 'الحد الأقصى للمتاجر لكل مالك' },
  { keyName: 'auto_approve_business', value: 'true', type: 'boolean', settingGroup: 'business', isPublic: false, isEditable: true, description: 'الموافقة التلقائية على الأعمال الجديدة' },

  // إعدادات الاشتراكات
  { keyName: 'enable_subscriptions', value: 'true', type: 'boolean', settingGroup: 'subscription', isPublic: true, isEditable: true, description: 'تفعيل نظام الاشتراكات' },
  { keyName: 'allow_free_trial', value: 'true', type: 'boolean', settingGroup: 'subscription', isPublic: true, isEditable: true, description: 'السماح بالفترة التجريبية' },
  { keyName: 'free_trial_days', value: '14', type: 'number', settingGroup: 'subscription', isPublic: true, isEditable: true, description: 'مدة الفترة التجريبية بالأيام' },

  // إعدادات الدفع
  { keyName: 'enable_cash_on_delivery', value: 'true', type: 'boolean', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'تفعيل الدفع عند الاستلام' },
  { keyName: 'enable_online_payment', value: 'false', type: 'boolean', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'تفعيل الدفع الإلكتروني' },
  { keyName: 'enable_card_payment', value: 'false', type: 'boolean', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'تفعيل الدفع بالبطاقة' },
  { keyName: 'default_currency', value: 'SAR', type: 'string', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'العملة الافتراضية' },
  { keyName: 'currency_symbol', value: 'ر.س', type: 'string', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'رمز العملة' },
  { keyName: 'stripe_api_key', value: '', type: 'string', settingGroup: 'payment', isPublic: false, isEditable: true, description: 'مفتاح API لـ Stripe' },
  { keyName: 'stripe_webhook_secret', value: '', type: 'string', settingGroup: 'payment', isPublic: false, isEditable: true, description: 'مفتاح Webhook لـ Stripe' },

  // إعدادات الدومينات
  { keyName: 'enable_custom_domain', value: 'true', type: 'boolean', settingGroup: 'domain', isPublic: true, isEditable: true, description: 'تفعيل الدومينات المخصصة' },
  { keyName: 'custom_domain_price', value: '49.99', type: 'number', settingGroup: 'domain', isPublic: true, isEditable: true, description: 'سعر الدومين المخصص' },
  { keyName: 'default_subdomain', value: '.shamstores.com', type: 'string', settingGroup: 'domain', isPublic: true, isEditable: true, description: 'الـ subdomain الافتراضي' },

  // إعدادات التخزين
  { keyName: 'max_storage_gb', value: '10', type: 'number', settingGroup: 'storage', isPublic: false, isEditable: true, description: 'الحد الأقصى للتخزين بالجيجابايت' },
  { keyName: 'allowed_file_types', value: '["jpg","jpeg","png","gif","webp"]', type: 'array', settingGroup: 'storage', isPublic: false, isEditable: true, description: 'أنواع الملفات المسموحة' },
  { keyName: 'max_file_size_mb', value: '10', type: 'number', settingGroup: 'storage', isPublic: false, isEditable: true, description: 'الحد الأقصى لحجم الملف بالميجابايت' },

  // إعدادات التوصيل
  { keyName: 'default_delivery_fee', value: '5', type: 'number', settingGroup: 'delivery', isPublic: true, isEditable: true, description: 'سعر التوصيل الافتراضي' },
  { keyName: 'free_delivery_threshold', value: '100', type: 'number', settingGroup: 'delivery', isPublic: true, isEditable: true, description: 'الحد الأدنى للتوصيل المجاني' },
  { keyName: 'estimated_delivery_time', value: '45', type: 'number', settingGroup: 'delivery', isPublic: true, isEditable: true, description: 'وقت التوصيل المتوقع بالدقائق' },
  { keyName: 'max_delivery_distance', value: '20', type: 'number', settingGroup: 'delivery', isPublic: false, isEditable: true, description: 'أقصى مسافة للتوصيل بالكيلومتر' },
  { keyName: 'enable_scheduled_delivery', value: 'true', type: 'boolean', settingGroup: 'delivery', isPublic: true, isEditable: true, description: 'تفعيل التوصيل المجدول' },

  // إعدادات الإشعارات
  { keyName: 'email_notifications_enabled', value: 'true', type: 'boolean', settingGroup: 'notification', isPublic: true, isEditable: true, description: 'تفعيل الإشعارات عبر البريد' },
  { keyName: 'sms_notifications_enabled', value: 'false', type: 'boolean', settingGroup: 'notification', isPublic: true, isEditable: true, description: 'تفعيل الإشعارات عبر SMS' },
  { keyName: 'whatsapp_notifications_enabled', value: 'true', type: 'boolean', settingGroup: 'notification', isPublic: true, isEditable: true, description: 'تفعيل الإشعارات عبر واتساب' },
  { keyName: 'push_notifications_enabled', value: 'true', type: 'boolean', settingGroup: 'notification', isPublic: true, isEditable: true, description: 'تفعيل الإشعارات الفورية' },

  // إعدادات الأمان
  { keyName: 'enable_2fa', value: 'false', type: 'boolean', settingGroup: 'security', isPublic: false, isEditable: true, description: 'تفعيل المصادقة ذات العاملين' },
  { keyName: 'password_expiry_days', value: '90', type: 'number', settingGroup: 'security', isPublic: false, isEditable: true, description: 'انتهاء صلاحية كلمة المرور بالأيام' },
  { keyName: 'prevent_weak_passwords', value: 'true', type: 'boolean', settingGroup: 'security', isPublic: false, isEditable: true, description: 'منع كلمات المرور الضعيفة' },
  { keyName: 'enable_captcha', value: 'true', type: 'boolean', settingGroup: 'security', isPublic: false, isEditable: true, description: 'تفعيل CAPTCHA في التسجيل' },

  // إعدادات التحليلات
  { keyName: 'enable_analytics', value: 'true', type: 'boolean', settingGroup: 'analytics', isPublic: false, isEditable: true, description: 'تفعيل نظام التحليلات' },
  { keyName: 'anonymize_ip', value: 'true', type: 'boolean', settingGroup: 'analytics', isPublic: false, isEditable: true, description: 'إخفاء عناوين IP' },
  { keyName: 'cookie_consent_required', value: 'true', type: 'boolean', settingGroup: 'analytics', isPublic: true, isEditable: true, description: 'طلب موافقة ملفات تعريف الارتباط' },
  { keyName: 'google_analytics_id', value: '', type: 'string', settingGroup: 'analytics', isPublic: false, isEditable: true, description: 'معرف Google Analytics' },
  { keyName: 'facebook_pixel_id', value: '', type: 'string', settingGroup: 'analytics', isPublic: false, isEditable: true, description: 'معرف Facebook Pixel' }
];

async function seedPlatformSettings() {
  console.log('🔄 جاري إضافة الإعدادات الافتراضية للمنصة...');
  
  for (const setting of defaultSettings) {
    try {
      await prisma.extendedPlatformSetting.upsert({
        where: { keyName: setting.keyName },
        update: {
          value: setting.value,
          type: setting.type as any,
          settingGroup: setting.settingGroup as any,
          isPublic: setting.isPublic,
          isEditable: setting.isEditable,
          description: setting.description
        },
        create: {
          keyName: setting.keyName,
          value: setting.value,
          type: setting.type as any,
          settingGroup: setting.settingGroup as any,
          isPublic: setting.isPublic,
          isEditable: setting.isEditable,
          description: setting.description
        }
      });
      console.log(`✅ تم إضافة الإعداد: ${setting.keyName}`);
    } catch (error) {
      console.error(`❌ خطأ في إضافة الإعداد ${setting.keyName}:`, error);
    }
  }
  
  console.log('🎉 تم إضافة جميع الإعدادات الافتراضية بنجاح!');
}

seedPlatformSettings()
  .catch(console.error)
  .finally(() => process.exit(0));