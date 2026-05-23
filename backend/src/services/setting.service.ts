// backend/src/services/setting.service.ts

import prisma from './prisma';

export class SettingService {
  private static cache = new Map<string, any>();

  // ==================== الدوال الأساسية ====================

  static async getSetting(keyName: string) {
    const setting = await prisma.extendedPlatformSetting.findUnique({
      where: { keyName }
    });
    return setting;
  }

  static async setSetting(keyName: string, value: any, type: string = 'string', group: string = 'general') {
    return prisma.extendedPlatformSetting.upsert({
      where: { keyName },
      update: { value: String(value), type: type as any, settingGroup: group as any },
      create: {
        keyName,
        value: String(value),
        type: type as any,
        settingGroup: group as any
      }
    });
  }

  static async getAllSettings() {
    return prisma.extendedPlatformSetting.findMany();
  }

  static async getSettingsByGroup(group: string) {
    return prisma.extendedPlatformSetting.findMany({
      where: { settingGroup: group as any }
    });
  }

  static async deleteSetting(keyName: string) {
    return prisma.extendedPlatformSetting.delete({ where: { keyName } });
  }

  static async getPublicSettings() {
    const allSettings = await prisma.extendedPlatformSetting.findMany({
      where: { isPublic: true }
    });
    return allSettings;
  }

  // ==================== دوال مساعدة لاستخراج القيم ====================

  static async getSettingValue(keyName: string, defaultValue: any = null) {
    const setting = await this.getSetting(keyName);
    if (!setting) return defaultValue;
    
    switch (setting.type) {
      case 'number':
        return Number(setting.value);
      case 'boolean':
        return setting.value === 'true';
      case 'json':
        try {
          return JSON.parse(setting.value);
        } catch {
          return defaultValue;
        }
      case 'array':
        try {
          return JSON.parse(setting.value);
        } catch {
          return defaultValue;
        }
      default:
        return setting.value;
    }
  }

  // ✅ دالة getBoolean (مطلوبة لـ authController)
  static async getBoolean(keyName: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.getSettingValue(keyName, defaultValue);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value === 'true' || value === '1' || value === 'yes' || value === 'on';
    }
    return !!value;
  }

  // ✅ دالة getNumber (مطلوبة لـ authController)
  static async getNumber(keyName: string, defaultValue: number = 0): Promise<number> {
    const value = await this.getSettingValue(keyName, defaultValue);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  // ✅ دالة getString (مطلوبة لـ authController)
  static async getString(keyName: string, defaultValue: string = ''): Promise<string> {
    const value = await this.getSettingValue(keyName, defaultValue);
    return String(value);
  }

  // ✅ دالة getJSON (للقيم من نوع JSON)
  static async getJSON(keyName: string, defaultValue: any = null): Promise<any> {
    const setting = await this.getSetting(keyName);
    if (!setting) return defaultValue;
    if (setting.type === 'json') {
      try {
        return JSON.parse(setting.value);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  // ✅ دالة updateSetting (لتحديث إعداد)
  static async updateSetting(keyName: string, value: any, description?: string) {
    const existing = await this.getSetting(keyName);
    if (!existing) {
      return this.setSetting(keyName, value, 'string', 'general');
    }
    
    return prisma.extendedPlatformSetting.update({
      where: { keyName },
      data: {
        value: String(value),
        description: description || existing.description
      }
    });
  }

  // ✅ دالة updateMultipleSettings (لتحديث عدة إعدادات دفعة واحدة)
  static async updateMultipleSettings(settings: Record<string, any>) {
    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      const result = await this.updateSetting(key, value);
      results.push(result);
    }
    return results;
  }

  // ✅ دالة لإعادة تعيين الكاش
  static clearCache() {
    this.cache.clear();
  }

  // ✅ دالة للحصول على إعداد platform name
  static async getPlatformName(): Promise<string> {
    const isArabic = true; // يمكن تعديلها حسب اللغة
    if (isArabic) {
      return await this.getString('site_name', 'شام ستورز');
    } else {
      return await this.getString('site_name_en', 'Sham Stores');
    }
  }

  // ✅ دالة للحصول على شعار المنصة
  static async getPlatformLogo(): Promise<string | null> {
    const logo = await this.getString('site_logo', '');
    return logo || null;
  }

  // ✅ دالة للحصول على ألوان المنصة
  static async getPlatformColors(): Promise<{ primary: string; secondary: string }> {
    const primary = await this.getString('primary_color', '#C8E235');
    const secondary = await this.getString('secondary_color', '#10B981');
    return { primary, secondary };
  }

  // ✅ دالة للتحقق من وضع الصيانة
  static async isMaintenanceMode(): Promise<boolean> {
    return await this.getBoolean('maintenance_mode', false);
  }

  // ✅ دالة للتحقق من السماح بالتسجيل
  static async isRegistrationAllowed(): Promise<boolean> {
    return await this.getBoolean('allow_registration', true);
  }

  // ✅ دالة للتحقق من الحاجة لتأكيد البريد الإلكتروني
  static async requireEmailVerification(): Promise<boolean> {
    return await this.getBoolean('require_email_verification', false);
  }

  // ✅ دالة للحصول على الحد الأقصى لمحاولات الدخول
  static async getMaxLoginAttempts(): Promise<number> {
    return await this.getNumber('max_login_attempts', 5);
  }

  // ✅ دالة للحصول على مدة الجلسة (بالدقائق)
  static async getSessionTimeout(): Promise<number> {
    return await this.getNumber('session_timeout_minutes', 720);
  }

  // ✅ دالة للحصول على طرق الدفع المتاحة
  static async getPaymentMethods(): Promise<string[]> {
    const methods = await this.getJSON('payment_methods', ['cash', 'card', 'online']);
    return Array.isArray(methods) ? methods : ['cash', 'card', 'online'];
  }

  // ✅ دالة للحصول على القيمة مع إمكانية تحديد النوع الافتراضي
  static async getSettingTyped(keyName: string, type: 'string' | 'number' | 'boolean' | 'json', defaultValue: any = null) {
    switch (type) {
      case 'boolean':
        return this.getBoolean(keyName, defaultValue);
      case 'number':
        return this.getNumber(keyName, defaultValue);
      case 'json':
        return this.getJSON(keyName, defaultValue);
      default:
        return this.getString(keyName, defaultValue);
    }
  }
}

export default SettingService;