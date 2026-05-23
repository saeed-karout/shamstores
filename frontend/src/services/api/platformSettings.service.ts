// frontend/src/services/api/platformSettings.service.ts
import api from './client';

export const platformSettingsApi = {
  // جلب جميع الإعدادات (للسوبر أدمن)
  getAll: () => api.get('/platform-settings'),
  
  // جلب إعدادات SEO فقط
  getSeo: () => api.get('/platform-settings/seo'),
  
  // جلب الإعدادات العامة (للواجهة الأمامية)
  getPublic: () => api.get('/platform-settings/public'),
  
  // تحديث إعداد واحد
  update: (key: string, value: any) => api.put(`/platform-settings/${key}`, { value }),
  
  // تحديث عدة إعدادات
  updateMultiple: (settings: Record<string, any>) => 
    api.put('/platform-settings/multiple/update', { settings }),
};