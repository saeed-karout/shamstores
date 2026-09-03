// frontend/src/utils/imageHelpers.ts

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
}

// ✅ استخدم المتغير البيئي بدلاً من الرابط الثابت
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-0f129677a5514faaad5ee813ca483811.r2.dev';
const CLOUDFLARE_DELIVERY_URL = 'https://imagedelivery.net/AS_DZ3xmdS7tL6SgO2AGxA';
const DEFAULT_VARIANT = 'public';

/**
 * الحصول على رابط صورة محسن (للاستخدام في upload.service)
 */
export const getOptimizedImageUrl = (url: string, options?: ImageOptions): string => {
  return getImageUrl(url, options);
};

/**
 * الحصول على رابط الصورة (يدعم R2 والروابط المحلية)
 */
export const getImageUrl = (url: string, options?: ImageOptions): string => {
  // التحقق من وجود URL
  if (!url) return '';
  
  console.log('🖼️ getImageUrl input:', url);
  
  // ✅ إذا كان الرابط من R2 (يحتوي على .r2.dev)
  if (url.includes('.r2.dev')) {
    // إذا كان الرابط يستخدم الـ hash الصحيح، نرجعه كما هو
    if (url.includes(R2_PUBLIC_URL)) {
      console.log('✅ R2 image with correct hash:', url);
      return url;
    }
    
    // إذا كان الرابط يستخدم hash قديم، نستبدله بالـ hash الصحيح
    if (url.includes('pub-06055d0a5a3f4bc41727965ba16a5185')) {
      const newUrl = url.replace('pub-06055d0a5a3f4bc41727965ba16a5185', 'pub-0f129677a5514faaad5ee813ca483811');
      console.log('🔄 Replaced old R2 hash with new one:', newUrl);
      return newUrl;
    }
    
    return url;
  }
  
  // ✅ إذا كان الرابط من Cloudflare Images
  if (url.includes('imagedelivery.net')) {
    return getOptimizedCloudflareUrl(url, options);
  }
  
  // ✅ إذا كان الرابط مطلقاً (http/https)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('✅ Absolute URL detected:', url);
    return url;
  }
  
  // ✅ الروابط المحلية (خلال التطوير) - صورة جديدة لم تُرفع بعد
  if (url.startsWith('/uploads/')) {
    const configuredApi = import.meta.env.VITE_API_URL as string | undefined;
    const baseUrl = configuredApi
      ? configuredApi.replace(/\/api\/?$/, '')
      : typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? window.location.origin
      : 'http://localhost:5000';
    const fullUrl = `${baseUrl}${url}`;
    console.log('🔄 Local URL converted:', fullUrl);
    return fullUrl;
  }
  
  // ✅ إذا كان المسار نسبي (مخزن في R2 لكن بدون域名)
  if (!url.startsWith('http') && url.includes('restaurants/')) {
    const fullUrl = `${R2_PUBLIC_URL}/${url}`;
    console.log('🔄 Relative path converted to R2:', fullUrl);
    return fullUrl;
  }
  
  console.log('⚠️ Unknown URL format:', url);
  return url;
};

/**
 * تحسين روابط Cloudflare Images
 */
const getOptimizedCloudflareUrl = (url: string, options?: ImageOptions): string => {
  if (!options || (!options.width && !options.quality && !options.format)) {
    return url;
  }
  
  // استخراج ID الصورة
  const match = url.match(/imagedelivery\.net\/[^/]+\/([^/?]+)/);
  if (!match) return url;
  
  const imageId = match[1];
  
  let optimizedUrl = `${CLOUDFLARE_DELIVERY_URL}/${imageId}`;
  
  const params: string[] = [];
  if (options.width) params.push(`w=${options.width}`);
  if (options.height) params.push(`h=${options.height}`);
  if (options.quality) params.push(`q=${options.quality}`);
  if (options.format) params.push(`f=${options.format}`);
  if (options.fit) params.push(`fit=${options.fit}`);
  
  if (params.length > 0) {
    optimizedUrl += `/${params.join(',')}`;
  } else {
    optimizedUrl += `/${DEFAULT_VARIANT}`;
  }
  
  return optimizedUrl;
};

/**
 * صورة مصغرة
 */
export const getThumbnailUrl = (url: string): string => {
  return getImageUrl(url);
};

/**
 * صورة متوسطة
 */
export const getMediumImageUrl = (url: string): string => {
  return getImageUrl(url);
};

/**
 * صورة كبيرة
 */
export const getLargeImageUrl = (url: string): string => {
  return getImageUrl(url);
};

/**
 * صورة WebP محسنة
 */
export const getWebpImageUrl = (url: string, width?: number): string => {
  return getImageUrl(url, { width, format: 'webp', quality: 85 });
};

/**
 * التحقق مما إذا كان الرابط من R2
 */
export const isR2Image = (url: string): boolean => {
  return url?.includes('.r2.dev') || false;
};

/**
 * التحقق مما إذا كان الرابط من Cloudflare Images
 */
export const isCloudflareImage = (url: string): boolean => {
  return url?.includes('imagedelivery.net') || false;
};

/**
 * استخراج ID الصورة من URL (Cloudflare Images)
 */
export const extractImageId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/imagedelivery\.net\/[^/]+\/([^/?]+)/);
  return match ? match[1] : null;
};

/**
 * إصلاح روابط R2 القديمة (للاستخدام في حال وجود بيانات قديمة)
 */
export const fixR2Url = (url: string): string => {
  if (!url) return '';
  if (url.includes('pub-06055d0a5a3f4bc41727965ba16a5185')) {
    return url.replace('pub-06055d0a5a3f4bc41727965ba16a5185', 'pub-0f129677a5514faaad5ee813ca483811');
  }
  return url;
};