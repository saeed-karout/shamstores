// frontend/src/services/seo.service.ts

import api from './api';

export interface SeoSettings {
  seo_title: string;
  seo_title_en: string;
  seo_description: string;
  seo_description_en: string;
  seo_keywords: string;
  seo_author: string;
  seo_robots: string;
  seo_canonical_url: string;
  og_title: string;
  og_title_en: string;
  og_description: string;
  og_description_en: string;
  og_image: string;
  og_type: string;
  twitter_card: string;
  twitter_title: string;
  twitter_title_en: string;
  twitter_description: string;
  twitter_description_en: string;
  twitter_image: string;
  schema_org_type: string;
  schema_org_name: string;
  schema_org_name_en: string;
  schema_org_description: string;
  schema_org_description_en: string;
  schema_org_rating_value: string;
  schema_org_rating_count: string;
  alternate_languages: string[];
}

class SeoService {
  async getSeoSettings(): Promise<SeoSettings> {
    const settings = await api.get('/platform-settings');
    const seoGroup = settings.data?.seo || [];
    
    const seoSettings: any = {};
    seoGroup.forEach((setting: any) => {
      let value = setting.value;
      if (setting.type === 'boolean') {
        value = value === 'true';
      } else if (setting.type === 'number') {
        value = Number(value);
      } else if (setting.type === 'array') {
        try {
          value = JSON.parse(value);
        } catch {
          value = [];
        }
      }
      seoSettings[setting.key_name] = value;
    });
    
    return seoSettings as SeoSettings;
  }
  
  async updateSeoSettings(settings: Partial<SeoSettings>): Promise<void> {
    await api.put('/platform-settings', { settings });
  }
  
  getMetaTags(seoSettings: SeoSettings, language: 'ar' | 'en' = 'ar'): string {
    const isArabic = language === 'ar';
    
    return `
      <!-- Primary Meta Tags -->
      <title>${isArabic ? seoSettings.seo_title : seoSettings.seo_title_en}</title>
      <meta name="title" content="${isArabic ? seoSettings.seo_title : seoSettings.seo_title_en}" />
      <meta name="description" content="${isArabic ? seoSettings.seo_description : seoSettings.seo_description_en}" />
      <meta name="keywords" content="${seoSettings.seo_keywords}" />
      <meta name="author" content="${seoSettings.seo_author}" />
      <meta name="robots" content="${seoSettings.seo_robots}" />
      <link rel="canonical" href="${seoSettings.seo_canonical_url}" />
      
      <!-- Open Graph / Facebook -->
      <meta property="og:type" content="${seoSettings.og_type}" />
      <meta property="og:url" content="${seoSettings.seo_canonical_url}" />
      <meta property="og:title" content="${isArabic ? seoSettings.og_title : seoSettings.og_title_en}" />
      <meta property="og:description" content="${isArabic ? seoSettings.og_description : seoSettings.og_description_en}" />
      <meta property="og:image" content="${seoSettings.og_image}" />
      
      <!-- Twitter -->
      <meta property="twitter:card" content="${seoSettings.twitter_card}" />
      <meta property="twitter:url" content="${seoSettings.seo_canonical_url}" />
      <meta property="twitter:title" content="${isArabic ? seoSettings.twitter_title : seoSettings.twitter_title_en}" />
      <meta property="twitter:description" content="${isArabic ? seoSettings.twitter_description : seoSettings.twitter_description_en}" />
      <meta property="twitter:image" content="${seoSettings.twitter_image}" />
      
      <!-- Alternate languages -->
      ${seoSettings.alternate_languages?.map(lang => 
        `<link rel="alternate" href="${seoSettings.seo_canonical_url}${lang === 'ar' ? '' : '/en'}" hreflang="${lang}" />`
      ).join('\n      ')}
    `;
  }
  
  getSchemaOrg(seoSettings: SeoSettings, language: 'ar' | 'en' = 'ar'): string {
    const isArabic = language === 'ar';
    
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": seoSettings.schema_org_type,
      "name": isArabic ? seoSettings.schema_org_name : seoSettings.schema_org_name_en,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": isArabic ? seoSettings.schema_org_description : seoSettings.schema_org_description_en,
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "SAR"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": seoSettings.schema_org_rating_value,
        "ratingCount": seoSettings.schema_org_rating_count
      }
    });
  }
}

export default new SeoService();