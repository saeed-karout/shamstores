// backend/src/services/cloudflareImagesService.ts
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { prisma } from '../server';

export interface CloudflareImage {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
  meta?: Record<string, any>;
}

export interface UploadOptions {
  type: string;
  id?: string;
  subType?: string;
  uploaderId?: string;
}

class CloudflareImagesService {
  private accountId: string;
  private apiToken: string;
  private apiUrl: string;
  private deliveryUrl: string;
  private variant: string;

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN || '';
    this.apiUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1`;
    this.deliveryUrl = process.env.CLOUDFLARE_IMAGES_DELIVERY_URL || '';
    this.variant = process.env.CLOUDFLARE_IMAGES_VARIANT || 'public';
    
    if (!this.accountId || !this.apiToken) {
      console.warn('⚠️ Cloudflare Images credentials not configured. Using local storage fallback.');
    }
  }

  /**
   * استخراج ID الصورة من URL
   */
  extractImageIdFromUrl(url: string): string | null {
    const match = url.match(/imagedelivery\.net\/[^/]+\/([^/?]+)/);
    return match ? match[1] : null;
  }

  /**
   * رفع صورة إلى Cloudflare Images
   */
  async uploadImage(
    file: Express.Multer.File,
    options: UploadOptions
  ): Promise<{ id: string; url: string; variants: string[] }> {
    try {
      const formData = new FormData();
      
      // إضافة الملف
      formData.append('file', fs.createReadStream(file.path), {
        filename: `${options.type}_${options.id || 'temp'}_${options.subType || Date.now()}.${file.mimetype.split('/')[1]}`
      });
      
      // إضافة metadata
      const metadata = {
        type: options.type,
        businessId: options.id,
        subType: options.subType,
        uploaderId: options.uploaderId,
        uploadedAt: new Date().toISOString()
      };
      formData.append('metadata', JSON.stringify(metadata));
      
      const response = await axios.post(this.apiUrl, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          ...formData.getHeaders()
        }
      });
      
      if (response.data.success && response.data.result) {
        const image = response.data.result;
        
        // حذف الملف المؤقت
        try {
          fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting temp file:', err);
          });
        } catch (e) {}
        
        const imageUrl = `${this.deliveryUrl}/${image.id}/${this.variant}`;
        
        return {
          id: image.id,
          url: imageUrl,
          variants: image.variants || []
        };
      }
      
      throw new Error('Cloudflare API returned unsuccessful response');
    } catch (error) {
      console.error('Error uploading to Cloudflare:', error);
      throw new Error('فشل رفع الصورة إلى Cloudflare');
    }
  }

  /**
   * الحصول على URL الصورة من Cloudflare
   */
  getImageUrl(imageId: string, variant?: string): string {
    return `${this.deliveryUrl}/${imageId}/${variant || this.variant}`;
  }

  /**
   * الحصول على URL محسن للصورة (مع تغيير الحجم)
   */
  getOptimizedUrl(imageId: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
    fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  } = {}): string {
    let url = `${this.deliveryUrl}/${imageId}`;
    
    const params: string[] = [];
    if (options.width) params.push(`w=${options.width}`);
    if (options.height) params.push(`h=${options.height}`);
    if (options.quality) params.push(`q=${options.quality}`);
    if (options.format) params.push(`f=${options.format}`);
    if (options.fit) params.push(`fit=${options.fit}`);
    
    if (params.length > 0) {
      url += `/${params.join(',')}`;
    } else {
      url += `/${this.variant}`;
    }
    
    return url;
  }

  /**
   * حذف صورة من Cloudflare
   */
  async deleteImage(imageId: string): Promise<boolean> {
    try {
      const response = await axios.delete(`${this.apiUrl}/${imageId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });
      
      return response.data.success;
    } catch (error) {
      console.error('Error deleting image from Cloudflare:', error);
      return false;
    }
  }

  /**
   * حذف صورة بواسطة URL
   */
  async deleteImageByUrl(imageUrl: string): Promise<boolean> {
    const imageId = this.extractImageIdFromUrl(imageUrl);
    if (imageId) {
      return this.deleteImage(imageId);
    }
    return false;
  }
}

export default new CloudflareImagesService();