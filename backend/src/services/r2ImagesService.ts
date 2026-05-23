// backend/src/services/r2ImagesService.ts

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

export type ImageEntity = 
  | 'restaurants'
  | 'stores'
  | 'menu-items'
  | 'products'
  | 'drivers'
  | 'categories'
  | 'users'
  | 'advertisements'
  | 'orders';

export interface UploadOptions {
  entity: ImageEntity;
  entityId: string;
  subType?: 'logo' | 'cover' | 'avatar' | 'icon' | 'gallery' | 'menu' | 'product' | 'receipt';
  index?: number;
}

class R2ImagesService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME!;
    this.publicUrl = process.env.R2_PUBLIC_URL!;
    
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  private generateImagePath(options: UploadOptions, ext: string): string {
    const { entity, entityId, subType, index } = options;
    const timestamp = Date.now();
    
    let folder = '';
    let fileName = '';
    
    switch (entity) {
      case 'restaurants':
        folder = `restaurants/${entityId}`;
        fileName = subType === 'logo' ? 'logo' : subType === 'cover' ? 'cover' : `image_${timestamp}`;
        break;
        
      case 'stores':
        folder = `stores/${entityId}`;
        fileName = subType === 'logo' ? 'logo' : subType === 'cover' ? 'cover' : `image_${timestamp}`;
        break;
        
      case 'menu-items':
        folder = `restaurants/${entityId}/menu-items`;
        fileName = `item_${timestamp}`;
        break;
        
      case 'products':
        folder = `stores/${entityId}/products`;
        fileName = `product_${timestamp}`;
        break;
        
      case 'drivers':
        folder = `drivers/${entityId}`;
        fileName = subType === 'avatar' ? 'avatar' : `image_${timestamp}`;
        break;
        
      case 'categories':
        folder = `categories/${entityId}`;
        fileName = subType === 'icon' ? 'icon' : `image_${timestamp}`;
        break;
        
      case 'users':
        folder = `users/${entityId}`;
        fileName = subType === 'avatar' ? 'avatar' : `image_${timestamp}`;
        break;
        
      case 'advertisements':
        folder = `advertisements/${entityId}`;
        fileName = `ad_${timestamp}`;
        break;
        
      case 'orders':
        folder = `orders/${entityId}`;
        fileName = subType === 'receipt' ? 'receipt' : `image_${timestamp}`;
        break;
        
      default:
        folder = `misc/${entity}`;
        fileName = `file_${timestamp}`;
    }
    
    const suffix = index !== undefined ? `_${index}` : '';
    const fullPath = `${folder}/${fileName}${suffix}${ext}`;
    
    console.log(`📁 Generated path: ${fullPath}`);
    return fullPath;
  }

  async uploadImage(
    file: Express.Multer.File,
    options: UploadOptions
  ): Promise<{ id: string; url: string; variants: string[]; path: string }> {
    try {
      const ext = path.extname(file.originalname);
      const filePath = this.generateImagePath(options, ext);
      
      const fileContent = fs.readFileSync(file.path);
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
        Body: fileContent,
        ContentType: file.mimetype,
      });
      
      await this.s3Client.send(command);
      
      // حذف الملف المؤقت
      try { fs.unlinkSync(file.path); } catch(e) {}
      
      const imageUrl = `${this.publicUrl}/${filePath}`;
      
      console.log(`✅ Image uploaded: ${imageUrl}`);
      
      return {
        id: filePath,
        url: imageUrl,
        variants: [imageUrl],
        path: filePath,
      };
    } catch (error) {
      console.error('Error uploading to R2:', error);
      throw new Error('فشل رفع الصورة');
    }
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    options: Omit<UploadOptions, 'index'>
  ): Promise<{ images: Array<{ id: string; url: string; order: number }> }> {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const result = await this.uploadImage(files[i], { ...options, index: i });
      results.push({
        id: result.id,
        url: result.url,
        order: i,
      });
    }
    
    return { images: results };
  }

  async deleteImage(imageId: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: imageId,
      });
      
      await this.s3Client.send(command);
      console.log(`✅ Image deleted: ${imageId}`);
      return true;
    } catch (error) {
      console.error('Error deleting from R2:', error);
      return false;
    }
  }

  async deleteImageByUrl(imageUrl: string): Promise<boolean> {
    try {
      const urlParts = imageUrl.split('.r2.dev/');
      if (urlParts.length > 1) {
        const imageId = urlParts[1];
        return this.deleteImage(imageId);
      }
      return false;
    } catch (error) {
      console.error('Error deleting image by URL:', error);
      return false;
    }
  }
}

export default new R2ImagesService();