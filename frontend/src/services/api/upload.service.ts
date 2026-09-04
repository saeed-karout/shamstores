// frontend/src/services/api/upload.service.ts
import { apiClient } from './client';
import { getOptimizedImageUrl } from '../../utils/imageHelpers';

export interface UploadOptions {
  type?: string;
  id?: string;
  subType?: string;
}

/**
 * شكل ما يُرجعه الخادم فعلاً من POST /api/upload.
 *
 * كان معلَناً هنا بحقل `url` لا وجود له في الاستجابة — الخادم يُرجع
 * `imageUrl`. أي مستدعٍ يثق بالنوع ويقرأ `.url` كان يحصل على undefined.
 */
export interface UploadedImage {
  imageUrl: string;
  imageId: string;
  fullUrl?: string;
}

export interface UploadedVideo {
  url: string;
  key: string;
}

/** يجب أن تطابق ALLOWED_VIDEO_TYPES في الخادم */
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/** الحد الأقصى للفيديو — نفس قيمة R2_MAX_VIDEO_MB في الخادم */
export const MAX_VIDEO_MB = Number(import.meta.env.VITE_MAX_VIDEO_MB || 100);

/** رفع الملف إلى R2 عبر رابط موقّع، مع تقدّم حقيقي. axios لا يلزمنا هنا: طلب خام بلا اعتماديات. */
const putToR2 = (uploadUrl: string, file: File, onProgress?: (percent: number) => void): Promise<void> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`فشل الرفع إلى التخزين (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('تعذّر الاتصال بخدمة التخزين'));
    xhr.onabort = () => reject(new Error('أُلغي الرفع'));

    xhr.send(file);
  });

class UploadService {
  /**
   * رفع صورة واحدة
   */
  async uploadImage(file: File, options: UploadOptions = {}): Promise<UploadedImage> {
    return apiClient.uploadImage(file, options.type, options.id, options.subType);
  }

  /**
   * رفع عدة صور
   */
  async uploadMultipleImages(files: File[], options: UploadOptions = {}): Promise<UploadedImage[]> {
    const result = await apiClient.uploadMultipleImages(files, options.type, options.id, options.subType);
    return result.images || [];
  }

  /**
   * رفع فيديو.
   * المسار الافتراضي: رابط موقّع → رفع مباشر إلى R2 → تأكيد.
   * الملف لا يمر بخادم Heroku، فلا تحدّه مهلة الـ 30 ثانية ولا قرص الدينو المؤقت.
   * إن فشل الرفع المباشر (CORS غير مضبوط على الحاوية مثلاً) نعيد المحاولة عبر الخادم
   * للمقاطع الصغيرة فقط.
   */
  async uploadVideo(
    file: File,
    options: UploadOptions = {},
    onProgress?: (percent: number) => void
  ): Promise<UploadedVideo> {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      throw new Error('صيغة الفيديو غير مدعومة. الصيغ المسموحة: MP4 أو WEBM أو MOV.');
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      throw new Error(`حجم الفيديو كبير جداً. الحد الأقصى ${MAX_VIDEO_MB} ميغابايت.`);
    }

    const presigned = await apiClient.createVideoUploadUrl({
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      type: options.type,
      id: options.id,
      subType: options.subType || 'video'
    });

    try {
      await putToR2(presigned.uploadUrl, file, onProgress);
    } catch (error) {
      console.warn('⚠️ فشل الرفع المباشر إلى R2، جارٍ المحاولة عبر الخادم:', error);
      const fallback = await apiClient.uploadVideoViaServer(
        file,
        options.type,
        options.id,
        options.subType || 'video'
      );
      onProgress?.(100);
      return { url: fallback.videoUrl, key: fallback.key };
    }

    const completed = await apiClient.completeVideoUpload({
      key: presigned.key,
      type: options.type,
      id: options.id,
      subType: options.subType || 'video',
      originalName: file.name
    });

    onProgress?.(100);
    return { url: completed.videoUrl, key: completed.key };
  }

  /**
   * حذف فيديو (نفس مسار حذف الصور — كلاهما كائن في R2)
   */
  async deleteVideo(videoUrl: string, key?: string): Promise<void> {
    return apiClient.deleteImage(videoUrl, key);
  }

  /**
   * حذف صورة
   */
  async deleteImage(imageUrl: string, imageId?: string): Promise<void> {
    return apiClient.deleteImage(imageUrl, imageId);
  }

  /**
   * جلب صور النشاط التجاري
   */
  async getBusinessImages(): Promise<any[]> {
    return apiClient.getBusinessImages();
  }

  /**
   * الحصول على رابط صورة محسن
   */
  getOptimizedUrl(url: string, options?: { width?: number; height?: number; quality?: number; format?: string }): string {
    return getOptimizedImageUrl(url, options);
  }
}

export const uploadService = new UploadService();
export default uploadService;