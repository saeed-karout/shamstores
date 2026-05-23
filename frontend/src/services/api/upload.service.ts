// frontend/src/services/api/upload.service.ts
import { apiClient } from './client';
import { getOptimizedImageUrl } from '../../utils/imageHelpers';

export interface UploadOptions {
  type?: string;
  id?: string;
  subType?: string;
}

export interface UploadedImage {
  url: string;
  imageId: string;
  fullUrl: string;
}

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