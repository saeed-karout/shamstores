// src/services/settingsService.ts

import api from './api';

interface Setting {
  key: string;
  value: string;
  group: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  isPublic?: boolean;
  description?: string;
}

interface GroupedSettings {
  [group: string]: Setting[];
}

class SettingsService {
  private settings: Map<string, any> = new Map();
  private groupedSettings: GroupedSettings = {};
  private loading = false;
  private error: string | null = null;
  private initialized = false;

  constructor() {
    // لا نقوم بجلب الإعدادات تلقائياً في المُنشئ
    // سيتم جلبها عند الحاجة
  }

  /**
   * جلب جميع الإعدادات من الخادم
   */
  async fetchSettings(): Promise<void> {
    if (this.loading) return;
    
    this.loading = true;
    this.error = null;
    
    try {
      // محاولة جلب الإعدادات من المسار العام أولاً (دون مصادقة)
      let response = null;
      
      try {
        response = await api.get('/platform-settings/public');
        console.log('✅ Settings fetched from public endpoint');
      } catch (publicError: any) {
        // إذا فشل المسار العام، جرب المسار العادي (قد يعطي 403 للمستخدمين العاديين)
        if (publicError.response?.status === 404) {
          // المسار العام غير موجود، جرب المسار العادي
          try {
            response = await api.get('/platform-settings');
            console.log('✅ Settings fetched from admin endpoint');
          } catch (adminError: any) {
            if (adminError.response?.status === 403) {
              // غير مصرح، نستخدم الإعدادات الافتراضية
              console.log('⚠️ No permission to fetch platform settings, using defaults');
              this.setDefaultSettings();
              this.initialized = true;
              this.loading = false;
              return;
            }
            throw adminError;
          }
        } else {
          throw publicError;
        }
      }
      
      if (response && typeof response === 'object') {
        // إذا كانت الاستجابة على شكل grouped settings
        if (response.data && typeof response.data === 'object') {
          this.processGroupedSettings(response.data);
        } 
        // إذا كانت الاستجابة على شكل مصفوفة من الإعدادات
        else if (Array.isArray(response)) {
          this.processSettingsArray(response);
        }
        // إذا كانت الاستجابة على شكل كائن key-value
        else {
          this.processKeyValueSettings(response);
        }
      }
      
      this.initialized = true;
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      this.error = err.message;
      // استخدام الإعدادات الافتراضية في حالة الخطأ
      this.setDefaultSettings();
      this.initialized = true;
    } finally {
      this.loading = false;
    }
  }

  /**
   * معالجة الإعدادات المجمعة حسب المجموعة
   */
  private processGroupedSettings(data: Record<string, any>): void {
    this.groupedSettings = {};
    
    Object.entries(data).forEach(([group, settings]) => {
      if (Array.isArray(settings)) {
        this.groupedSettings[group] = settings;
        settings.forEach((setting: Setting) => {
          this.setSettingValue(setting.key, setting.value, setting.type);
        });
      } else if (typeof settings === 'object') {
        // إذا كان المجموعة تحتوي على key-value pairs
        this.groupedSettings[group] = [];
        Object.entries(settings).forEach(([key, value]) => {
          this.groupedSettings[group].push({
            key,
            value: String(value),
            group,
            type: typeof value === 'boolean' ? 'boolean' : 'string'
          });
          this.setSettingValue(key, value);
        });
      }
    });
  }

  /**
   * معالجة مصفوفة الإعدادات
   */
  private processSettingsArray(settings: Setting[]): void {
    settings.forEach(setting => {
      this.setSettingValue(setting.key, setting.value, setting.type);
      
      const group = setting.group || 'general';
      if (!this.groupedSettings[group]) {
        this.groupedSettings[group] = [];
      }
      this.groupedSettings[group].push(setting);
    });
  }

  /**
   * معالجة إعدادات key-value
   */
  private processKeyValueSettings(settings: Record<string, any>): void {
    Object.entries(settings).forEach(([key, value]) => {
      this.setSettingValue(key, value);
    });
  }

  /**
   * تعيين قيمة إعداد مع تحويل النوع
   */
  private setSettingValue(key: string, value: any, type?: string): void {
    if (type === 'number') {
      this.settings.set(key, Number(value));
    } else if (type === 'boolean') {
      this.settings.set(key, value === 'true' || value === true || value === '1');
    } else if (type === 'json') {
      try {
        this.settings.set(key, typeof value === 'string' ? JSON.parse(value) : value);
      } catch {
        this.settings.set(key, value);
      }
    } else {
      this.settings.set(key, value);
    }
  }

  /**
   * تعيين الإعدادات الافتراضية
   */
  private setDefaultSettings(): void {
    const defaultSettings = {
      site_name: 'ديجيتال مينو',
      site_name_en: 'Digital Menu',
      site_description: 'منصة إدارة المطاعم والمتاجر الإلكترونية',
      site_logo: '',
      site_favicon: '',
      
      // إعدادات عامة
      maintenance_mode: false,
      maintenance_message: 'نعمل على تحسين المنصة، نعتذر عن الإزعاج',
      maintenance_message_en: 'We are improving the platform, sorry for the inconvenience',
      require_email_verification: false,
      allow_registration: true,
      
      // إعدادات الدفع
      enable_cash_on_delivery: true,
      enable_online_payment: false,
      default_currency: 'SAR',
      currency_symbol: 'ر.س',
      
      // إعدادات التوصيل
      default_delivery_fee: 5,
      free_delivery_threshold: 100,
      estimated_delivery_time: 45,
      
      // إعدادات التواصل
      contact_email: 'support@digitalmenu.com',
      contact_phone: '+966 123456789',
      support_whatsapp: '+966 123456789',
      address: 'الرياض، المملكة العربية السعودية',
      address_en: 'Riyadh, Saudi Arabia',
      
      // إعدادات اجتماعية
      facebook_url: '',
      instagram_url: '',
      twitter_url: '',
      tiktok_url: '',
      linkedin_url: '',
      
      // إعدادات الإشعارات
      email_notifications_enabled: true,
      sms_notifications_enabled: false,
      whatsapp_notifications_enabled: true,
      
      // إعدادات الأمان
      max_login_attempts: 5,
      lockout_duration: 30,
      session_timeout: 120,
      
      // إعدادات الأداء
      items_per_page: 20,
      enable_cache: true,
      cache_duration: 3600,
      
      // إعدادات التطبيق
      default_language: 'ar',
      default_timezone: 'Asia/Riyadh',
      date_format: 'YYYY-MM-DD',
      time_format: 'HH:mm',
      
      // إعدادات الألوان
      primary_color: '#3B82F6',
      secondary_color: '#10B981',
      
      // إعدادات SEO
      meta_keywords: 'مطعم، متجر، طعام، توصيل، منيو رقمي',
      google_analytics_id: '',
      facebook_pixel_id: '',


      // إعدادات إضافية
payment_methods: ['cash', 'card', 'online'],
require_approval: false,
auto_approve_business: true,
max_businesses_per_user: 5,
allow_free_trial: true,
free_trial_days: 14,
enable_subscriptions: true,
default_plan_id: '',
enable_custom_domain: false,
custom_domain_price: 0,
default_subdomain: '',
max_storage_gb: 10,
allowed_file_types: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
max_file_size_mb: 5,
max_delivery_distance: 50,
enable_scheduled_delivery: true,
push_notifications_enabled: true,
enable_2fa: false,
password_expiry_days: 90,
prevent_weak_passwords: true,
enable_captcha: true,
enable_analytics: true,
anonymize_ip: true,
cookie_consent_required: true,
admin_items_per_page: 50,
site_description_en: 'Digital menu platform for restaurants and stores',
    };

    Object.entries(defaultSettings).forEach(([key, value]) => {
      this.settings.set(key, value);
    });
  }

  /**
   * التأكد من تهيئة الإعدادات
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && !this.loading) {
      await this.fetchSettings();
    }
    
    // انتظار حتى تنتهي عملية التحميل
    while (this.loading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * الحصول على إعداد معين
   */
  async getSetting(key: string, defaultValue?: any): Promise<any> {
    await this.ensureInitialized();
    const value = this.settings.get(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * الحصول على إعداد نصي
   */
  async getString(key: string, defaultValue: string = ''): Promise<string> {
    const value = await this.getSetting(key, defaultValue);
    return String(value);
  }

  /**
   * الحصول على إعداد رقمي
   */
  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.getSetting(key, defaultValue);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * الحصول على إعداد منطقي (true/false)
   */
  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.getSetting(key, defaultValue);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value === 'true' || value === '1' || value === 'yes' || value === 'on';
    }
    return !!value;
  }

  /**
   * الحصول على إعداد JSON
   */
  async getJSON(key: string, defaultValue: any = null): Promise<any> {
    const value = await this.getSetting(key, defaultValue);
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  /**
   * الحصول على جميع الإعدادات
   */
  async getAllSettings(): Promise<Map<string, any>> {
    await this.ensureInitialized();
    return new Map(this.settings);
  }

  /**
   * الحصول على الإعدادات المجمعة حسب المجموعة
   */
  async getGroupedSettings(): Promise<GroupedSettings> {
    await this.ensureInitialized();
    return { ...this.groupedSettings };
  }

  /**
   * الحصول على إعدادات مجموعة محددة
   */
  async getSettingsByGroup(group: string): Promise<Setting[]> {
    await this.ensureInitialized();
    return this.groupedSettings[group] || [];
  }

  // ==================== الدوال الجديدة المطلوبة ====================

  /**
   * الحصول على اسم المنصة (مع دعم اللغة)
   */
  async getPlatformName(): Promise<string> {
    await this.ensureInitialized();
    
    // التحقق من اللغة الحالية
    const isArabic = document.documentElement.dir === 'rtl' || 
                     localStorage.getItem('language') === 'ar';
    
    if (isArabic) {
      const arabicName = await this.getString('site_name', 'ديجيتال مينو');
      return arabicName;
    } else {
      const englishName = await this.getString('site_name_en', 'Digital Menu');
      return englishName;
    }
  }

  /**
   * الحصول على اسم المنصة بالعربية
   */
  async getPlatformNameAr(): Promise<string> {
    await this.ensureInitialized();
    return await this.getString('site_name', 'ديجيتال مينو');
  }

  /**
   * الحصول على اسم المنصة بالإنجليزية
   */
  async getPlatformNameEn(): Promise<string> {
    await this.ensureInitialized();
    return await this.getString('site_name_en', 'Digital Menu');
  }

  /**
   * الحصول على شعار المنصة
   */
  async getPlatformLogo(): Promise<string | null> {
    await this.ensureInitialized();
    const logo = await this.getString('site_logo', '');
    return logo || null;
  }

  /**
   * الحصول على أيقونة المنصة (favicon)
   */
  async getPlatformFavicon(): Promise<string | null> {
    await this.ensureInitialized();
    const favicon = await this.getString('site_favicon', '');
    return favicon || null;
  }

  /**
   * الحصول على ألوان المنصة
   */
  async getPlatformColors(): Promise<{ primary: string; secondary: string }> {
    await this.ensureInitialized();
    const primary = await this.getString('primary_color', '#3B82F6');
    const secondary = await this.getString('secondary_color', '#10B981');
    return { primary, secondary };
  }

  /**
   * الحصول على معلومات التواصل
   */
  async getContactInfo(): Promise<{
    email?: string;
    phone?: string;
    address?: string;
    addressEn?: string;
  }> {
    await this.ensureInitialized();
    const isArabic = document.documentElement.dir === 'rtl' || 
                     localStorage.getItem('language') === 'ar';
    
    return {
      email: await this.getString('contact_email', ''),
      phone: await this.getString('contact_phone', ''),
      address: isArabic ? await this.getString('address', '') : await this.getString('address_en', ''),
      addressEn: await this.getString('address_en', ''),
    };
  }

  /**
   * الحصول على روابط التواصل الاجتماعي
   */
  async getSocialLinks(): Promise<{
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    tiktok?: string;
  }> {
    await this.ensureInitialized();
    return {
      facebook: await this.getString('facebook_url', ''),
      twitter: await this.getString('twitter_url', ''),
      instagram: await this.getString('instagram_url', ''),
      linkedin: await this.getString('linkedin_url', ''),
      tiktok: await this.getString('tiktok_url', ''),
    };
  }

  /**
   * التحقق من وضع الصيانة
   */
  async isMaintenanceMode(): Promise<boolean> {
    return await this.getBoolean('maintenance_mode', false);
  }

  /**
   * الحصول على رسالة الصيانة (مع دعم اللغة)
   */
  async getMaintenanceMessage(): Promise<string> {
    await this.ensureInitialized();
    const isArabic = document.documentElement.dir === 'rtl' || 
                     localStorage.getItem('language') === 'ar';
    
    if (isArabic) {
      return await this.getString('maintenance_message', 'نعمل على تحسين المنصة، نعتذر عن الإزعاج');
    } else {
      return await this.getString('maintenance_message_en', 'We are improving the platform, sorry for the inconvenience');
    }
  }

  /**
   * الحصول على العملة الافتراضية
   */
  async getDefaultCurrency(): Promise<string> {
    return await this.getString('default_currency', 'SAR');
  }

  /**
   * الحصول على رمز العملة
   */
  async getCurrencySymbol(): Promise<string> {
    return await this.getString('currency_symbol', 'ر.س');
  }

  /**
   * الحصول على سعر التوصيل الافتراضي
   */
  async getDefaultDeliveryFee(): Promise<number> {
    return await this.getNumber('default_delivery_fee', 5);
  }

  /**
   * الحصول على حد التوصيل المجاني
   */
  async getFreeDeliveryThreshold(): Promise<number> {
    return await this.getNumber('free_delivery_threshold', 100);
  }

  /**
   * الحصول على الوقت التقديري للتوصيل
   */
  async getEstimatedDeliveryTime(): Promise<number> {
    return await this.getNumber('estimated_delivery_time', 45);
  }

  /**
   * الحصول على اللغة الافتراضية
   */
  async getDefaultLanguage(): Promise<string> {
    return await this.getString('default_language', 'ar');
  }

  /**
   * الحصول على المنطقة الزمنية الافتراضية
   */
  async getDefaultTimezone(): Promise<string> {
    return await this.getString('default_timezone', 'Asia/Riyadh');
  }

  /**
   * الحصول على عدد العناصر لكل صفحة
   */
  async getItemsPerPage(): Promise<number> {
    return await this.getNumber('items_per_page', 20);
  }

  /**
   * التحقق من الحاجة لتأكيد البريد الإلكتروني
   */
  async requireEmailVerification(): Promise<boolean> {
    return await this.getBoolean('require_email_verification', false);
  }

  /**
   * التحقق من السماح بالتسجيل
   */
  async isRegistrationAllowed(): Promise<boolean> {
    return await this.getBoolean('allow_registration', true);
  }

  /**
   * تحديث إعداد (يتطلب صلاحيات admin)
   */
  async updateSetting(key: string, value: any): Promise<boolean> {
    try {
      await api.put(`/platform-settings/${key}`, { value });
      this.settings.set(key, value);
      
      // تحديث في groupedSettings إذا وجد
      for (const group in this.groupedSettings) {
        const settingIndex = this.groupedSettings[group].findIndex(s => s.key === key);
        if (settingIndex !== -1) {
          this.groupedSettings[group][settingIndex].value = String(value);
          break;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating setting:', error);
      return false;
    }
  }

  /**
   * تحديث إعدادات متعددة (يتطلب صلاحيات admin)
   */
  async updateMultipleSettings(settings: Record<string, any>): Promise<boolean> {
    try {
      await api.put('/platform-settings', { settings });
      
      Object.entries(settings).forEach(([key, value]) => {
        this.settings.set(key, value);
      });
      
      return true;
    } catch (error) {
      console.error('Error updating multiple settings:', error);
      return false;
    }
  }

  /**
   * إعادة تعيين الإعدادات (مسح الذاكرة المؤقتة)
   */
  reset(): void {
    this.settings.clear();
    this.groupedSettings = {};
    this.initialized = false;
    this.error = null;
  }

  /**
   * الحصول على حالة التحميل
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * الحصول على الخطأ
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * التحقق من جاهزية الإعدادات
   */
  isReady(): boolean {
    return this.initialized && !this.loading;
  }


  // أضف هذه الدوال إلى class SettingsService في ملف settingsService.ts

  /**
   * الحصول على إعداد كمصفوفة
   */
  async getArray(key: string, defaultValue: any[] = []): Promise<any[]> {
    await this.ensureInitialized();
    const value = this.settings.get(key);
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : defaultValue;
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  /**
   * الحصول على الحد الأقصى لمحاولات تسجيل الدخول
   */
  async getMaxLoginAttempts(): Promise<number> {
    await this.ensureInitialized();
    return await this.getNumber('max_login_attempts', 5);
  }

  /**
   * الحصول على مدة الجلسة (بالدقائق)
   */
  async getSessionTimeout(): Promise<number> {
    await this.ensureInitialized();
    return await this.getNumber('session_timeout', 120);
  }

  /**
   * الحصول على طرق الدفع المتاحة
   */
  async getPaymentMethods(): Promise<string[]> {
    await this.ensureInitialized();
    const methods = await this.getArray('payment_methods', ['cash', 'card']);
    
    // إذا كان الإعداد غير موجود، نستخدم القيم الافتراضية بناءً على إعدادات أخرى
    if (methods.length === 0) {
      const methodsList: string[] = ['cash'];
      const enableOnlinePayment = await this.getBoolean('enable_online_payment', false);
      if (enableOnlinePayment) {
        methodsList.push('card');
        methodsList.push('online');
      }
      const enableCashOnDelivery = await this.getBoolean('enable_cash_on_delivery', true);
      if (enableCashOnDelivery && !methodsList.includes('cash')) {
        methodsList.push('cash');
      }
      return methodsList;
    }
    
    return methods;
  }

  /**
   * الحصول على طرق الدفع المدعومة (مع الترجمة)
   */
  async getPaymentMethodsWithLabels(): Promise<{ value: string; label: string; labelEn: string }[]> {
    await this.ensureInitialized();
    const methods = await this.getPaymentMethods();
    
    const methodLabels: Record<string, { label: string; labelEn: string }> = {
      cash: { label: 'دفع نقدي', labelEn: 'Cash' },
      card: { label: 'بطاقة ائتمان', labelEn: 'Credit Card' },
      online: { label: 'دفع إلكتروني', labelEn: 'Online Payment' },
      mada: { label: 'مدى', labelEn: 'Mada' },
      apple_pay: { label: 'Apple Pay', labelEn: 'Apple Pay' },
      google_pay: { label: 'Google Pay', labelEn: 'Google Pay' },
    };
    
    return methods.map(method => ({
      value: method,
      label: methodLabels[method]?.label || method,
      labelEn: methodLabels[method]?.labelEn || method,
    }));
  }

  /**
   * تحديث الإعدادات (إعادة التحميل)
   */
  async refresh(): Promise<void> {
    this.reset();
    await this.fetchSettings();
  }

  /**
   * جلب الإعدادات وإرجاعها مجمعة (لـ useSettings)
   */
  async fetchGroupedSettings(): Promise<GroupedSettings> {
    await this.ensureInitialized();
    
    // تعريف المجموعات
    const groups = [
      'general', 'auth', 'business', 'subscription', 
      'payment', 'domain', 'storage', 'delivery', 
      'notification', 'security', 'analytics'
    ];
    
    const result: any = {};
    
    for (const group of groups) {
      const settings = await this.getSettingsByGroup(group);
      result[group] = settings;
    }
    
    return result as GroupedSettings;
  }

  
  /**
   * تحديد نوع الإعداد
   */
  private getSettingType(key: string, value: any): 'string' | 'number' | 'boolean' | 'json' {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) return 'json';
    return 'string';
  }

  /**
   * الحصول على اسم المنصة مع إمكانية تحديد اللغة
   */
  async getPlatformNameWithLanguage(language?: 'ar' | 'en'): Promise<string> {
    await this.ensureInitialized();
    
    const lang = language || (document.documentElement.dir === 'rtl' ? 'ar' : 'en');
    
    if (lang === 'ar') {
      return await this.getString('site_name', 'ديجيتال مينو');
    } else {
      return await this.getString('site_name_en', 'Digital Menu');
    }
  }

  /**
   * الحصول على وصف المنصة (SEO)
   */
  async getPlatformDescription(): Promise<string> {
    await this.ensureInitialized();
    const isArabic = document.documentElement.dir === 'rtl' || 
                     localStorage.getItem('language') === 'ar';
    
    if (isArabic) {
      return await this.getString('site_description', 'منصة إدارة المطاعم والمتاجر الإلكترونية');
    } else {
      return await this.getString('site_description_en', 'Digital menu platform for restaurants and stores');
    }
  }

  /**
   * الحصول على الكلمات المفتاحية (SEO)
   */
  async getMetaKeywords(): Promise<string> {
    await this.ensureInitialized();
    return await this.getString('meta_keywords', 'مطعم، متجر، طعام، توصيل، منيو رقمي');
  }

  /**
   * الحصول على معرف Google Analytics
   */
  async getGoogleAnalyticsId(): Promise<string> {
    await this.ensureInitialized();
    return await this.getString('google_analytics_id', '');
  }

  /**
   * الحصول على معرف Facebook Pixel
   */
  async getFacebookPixelId(): Promise<string> {
    await this.ensureInitialized();
    return await this.getString('facebook_pixel_id', '');
  }

  /**
   * التحقق من تفعيل التخزين المؤقت
   */
  async isCacheEnabled(): Promise<boolean> {
    await this.ensureInitialized();
    return await this.getBoolean('enable_cache', true);
  }

  /**
   * الحصول على مدة التخزين المؤقت (بالثواني)
   */
  async getCacheDuration(): Promise<number> {
    await this.ensureInitialized();
    return await this.getNumber('cache_duration', 3600);
  }

 

  /**
   * الحصول على عدد العناصر لكل صفحة في لوحة التحكم
   */
  async getAdminItemsPerPage(): Promise<number> {
    await this.ensureInitialized();
    return await this.getNumber('admin_items_per_page', 50);
  }
}




// تصدير instance واحد فقط (Singleton)
export default new SettingsService();