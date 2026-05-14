// backend/src/services/settingsService.ts

import ExtendedPlatformSetting from '../models/ExtendedPlatformSetting';

class SettingsService {
  private cache: Map<string, any> = new Map();
  private cacheTimeout = 5 * 60 * 1000;
  private lastFetch: number = 0;

  async getSetting(key: string, defaultValue: any = null): Promise<any> {
    if (Date.now() - this.lastFetch < this.cacheTimeout && this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const setting = await ExtendedPlatformSetting.findOne({
      where: { key_name: key }
    });
    
    const value = setting ? setting.value : defaultValue;
    this.cache.set(key, value);
    return value;
  }

  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.getSetting(key, defaultValue);
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.getSetting(key, defaultValue);
    return Number(value);
  }

  async getString(key: string, defaultValue: string = ''): Promise<string> {
    const value = await this.getSetting(key, defaultValue);
    return String(value);
  }

  async refreshCache(): Promise<void> {
    const allSettings = await ExtendedPlatformSetting.findAll();
    this.cache.clear();
    allSettings.forEach(setting => {
      this.cache.set(setting.key_name, setting.value);
    });
    this.lastFetch = Date.now();
  }
}

export default new SettingsService();