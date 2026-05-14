/**
 * دالة مساعدة للحصول على مسار الصورة الصحيح
 * @param imagePath - مسار الصورة من قاعدة البيانات
 * @returns المسار الكامل للصورة
 */
export const getImageUrl = (imagePath?: string): string => {
    if (!imagePath) return '';

    // روابط Cloudflare أو أي CDN خارجي
    if (/^(https?:)?\/\//i.test(imagePath) || imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
      return imagePath;
    }

    const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

    // تنظيف المسار من أي تكرار للمسارات المحلية القديمة
    const cleanPath = imagePath
      .replace(/^\/+|\/+$/g, '')
      .replace(/\\/g, '/')
      .replace(/^api[\/\\]/, '')
      .replace(/^uploads[\/\\]/, '')
      .replace(/^uploads[\/\\]uploads[\/\\]/, '');

    return `${baseUrl}/uploads/${cleanPath}`;
  };
  
  /**
   * دالة للحصول على مسار الصورة الكامل (للاستخدام المباشر)
   */
export const getFullImageUrl = (imagePath?: string): string => {
    return getImageUrl(imagePath);
  };
  
  /**
   * دالة مساعدة للحصول على مسار الصورة من base64
   */
  export const getBase64Image = (base64Data?: string): string => {
    if (!base64Data) return '';
    return `data:image/png;base64,${base64Data}`;
  };
  
  /**
   * دالة لتنظيف مسار الصورة للتخزين
   */
  export const cleanImagePath = (imagePath?: string): string => {
    if (!imagePath) return '';
    
    return imagePath
      .replace(/^\/+|\/+$/g, '')
      .replace(/\\/g, '/')
      .replace(/^api[\/\\]/, '')
      .replace(/^uploads[\/\\]/, '')
      .replace(/^uploads[\/\\]uploads[\/\\]/, '');
  };
