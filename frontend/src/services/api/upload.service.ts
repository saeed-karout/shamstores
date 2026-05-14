// frontend/src/services/api/upload.service.ts

import apiClient from './client';

export interface UploadResponse {
  imageUrl: string;
  publicId?: string;
  size?: number;
  format?: string;
}

export type UploadType = 
  | 'restaurant_logo'
  | 'restaurant_cover'
  | 'menu_item'
  | 'store_logo'
  | 'store_cover'
  | 'product'
  | 'category'
  | 'coupon'
  | 'marketing'
  | 'user_avatar'
  | 'general';

class UploadService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

  private validateFile(file: File): void {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('نوع الملف غير مدعوم. يرجى رفع صورة من نوع JPG, PNG, أو WEBP');
    }
    
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`حجم الملف كبير جداً. الحد الأقصى هو ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
  }

  async uploadImage(file: File, type: UploadType = 'general'): Promise<UploadResponse> {
    this.validateFile(file);
    return apiClient.upload('/upload', file, type);
  }

  async uploadMultipleImages(files: File[], type: UploadType = 'general'): Promise<UploadResponse[]> {
    const promises = files.map(file => this.uploadImage(file, type));
    return Promise.all(promises);
  }

  async uploadBase64Image(base64: string, type: UploadType = 'general'): Promise<UploadResponse> {
    // Convert base64 to blob
    const blob = this.base64ToBlob(base64);
    const file = new File([blob], `image_${Date.now()}.png`, { type: 'image/png' });
    return this.uploadImage(file, type);
  }

  private base64ToBlob(base64: string): Blob {
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 string');
    }
    
    const contentType = matches[1];
    const base64Data = matches[2];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  async deleteImage(imageUrl: string): Promise<void> {
    // Extract public ID from URL if needed
    const publicId = this.extractPublicIdFromUrl(imageUrl);
    if (publicId) {
      return apiClient.delete(`/upload/${publicId}`);
    }
  }

  private extractPublicIdFromUrl(url: string): string | null {
    // Example: https://cloudinary.com/.../upload/v123456/menu/item_123.jpg
    const matches = url.match(/\/([^\/]+)\.[a-z]{3,4}$/);
    return matches ? matches[1] : null;
  }

  // Helper method to compress image before upload
  async compressAndUpload(file: File, type: UploadType = 'general', maxWidth = 1200): Promise<UploadResponse> {
    const compressed = await this.compressImage(file, maxWidth);
    return this.uploadImage(compressed, type);
  }

  private async compressImage(file: File, maxWidth: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.8
          );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  }
}

export const uploadService = new UploadService();