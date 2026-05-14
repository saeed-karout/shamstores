// backend/src/controllers/uploadController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import fs from 'fs';
import path from 'path';
import cloudflareImagesService from '../services/cloudflareImagesService';
import Image, { ImageBusinessType, ImageProvider } from '../models/Image';

const normalizeBusinessType = (req: AuthRequest): ImageBusinessType => {
  if (req.user?.restaurantId) return 'restaurant';
  if (req.user?.storeId) return 'store';
  return 'unknown';
};

const resolveBusinessId = (req: AuthRequest, rawId?: string): string | null => {
  const directId = rawId?.trim();
  if (directId) return directId;

  return req.user?.restaurantId || req.user?.storeId || null;
};

const toPersistedImageUrl = (imageUrl: string): string => {
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const baseUrl = (process.env.BASE_URL || '').replace(/\/+$/, '');
  const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

const saveImageRecord = async (
  req: AuthRequest,
  file: Express.Multer.File,
  imageUrl: string,
  provider: ImageProvider,
  type: string,
  subType: string,
  explicitBusinessId?: string,
  cloudflareImageId?: string
): Promise<void> => {
  // If provider is cloudflare but no id provided, try to extract it from the URL
  if (provider === 'cloudflare' && !cloudflareImageId) {
    try {
      const extracted = cloudflareImagesService.extractImageIdFromUrl(imageUrl);
      cloudflareImageId = extracted || undefined;
    } catch (err) {
      // ignore extraction errors
    }
  }

  await Image.create({
    userId: req.user?.id || null,
    businessType: normalizeBusinessType(req),
    businessId: resolveBusinessId(req, explicitBusinessId) || null,
    uploadType: type,
    subType,
    provider,
    imageUrl: toPersistedImageUrl(imageUrl),
    cloudflareImageId: cloudflareImageId || null,
    originalName: file.originalname || null,
    mimeType: file.mimetype || null,
    sizeBytes: typeof file.size === 'number' ? file.size : file.buffer?.length || null
  });
};

export const uploadImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ 
        success: false,
        error: 'لم يتم رفع أي ملف' 
      });
      return;
    }
    
    const { type = 'general', id, subType = 'images' } = req.body;
    // try Cloudflare first, fall back to local storage on known service-limit errors
    let uploadedImageUrl: string;
    let provider: ImageProvider = 'cloudflare';
    let cloudflareImageId: string | undefined;
    try {
      const uploadedImage = await cloudflareImagesService.uploadImage(req.file, {
        type: String(type),
        id: id ? String(id) : undefined,
        subType: String(subType),
        uploaderId: req.user?.id
      });

      uploadedImageUrl = uploadedImage.url;
      cloudflareImageId = uploadedImage.id;
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      const isServiceLimit = /service limit|reached a service limit|quota/i.test(msg);

      if (!isServiceLimit) throw err;

      console.warn('Cloudflare limit reached, saving upload locally');

      const saveDir = path.join(process.cwd(), 'uploads', String(type || 'general'), String(subType || 'images'));
      fs.mkdirSync(saveDir, { recursive: true });

      const safeName = (req.file.originalname || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filename = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${safeName}`;
      const fullPath = path.join(saveDir, filename);

      fs.writeFileSync(fullPath, req.file.buffer);

      uploadedImageUrl = `/uploads/${String(type || 'general')}/${String(subType || 'images')}/${filename}`;
      provider = 'local';
    }

    await saveImageRecord(
      req,
      req.file,
      uploadedImageUrl,
      provider,
      String(type || 'general'),
      String(subType || 'images'),
      id ? String(id) : undefined,
      cloudflareImageId
    );

    res.json({
      success: true,
      data: {
        imageUrl: uploadedImageUrl,
        fullUrl: toPersistedImageUrl(uploadedImageUrl),
        provider
      },
      message: 'تم رفع الصورة بنجاح'
    });
  } catch (error) {
    console.error('خطأ في رفع الصورة:', error);

    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في رفع الصورة' 
    });
  }
};

export const deleteImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { imagePath } = req.body;

    if (!imagePath) {
      res.status(400).json({ 
        success: false,
        error: 'مسار الصورة مطلوب' 
      });
      return;
    }

    if (/^https?:\/\//i.test(imagePath)) {
      await cloudflareImagesService.deleteImageByUrl(imagePath);
    } else {
      // دعم المسارات القديمة المخزنة محلياً
      const cleanPath = imagePath.replace(/^\/+|\/+$/g, '').replace(/^uploads[\\\/]/, '');
      const fullPath = path.join(process.cwd(), 'uploads', cleanPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    res.json({
      success: true,
      message: 'تم حذف الصورة بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف الصورة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في حذف الصورة' 
    });
  }
};

// دالة لرفع عدة صور
export const uploadMultipleImages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ 
        success: false,
        error: 'لم يتم رفع أي ملفات' 
      });
      return;
    }

    const uploadedImages: string[] = [];
    const { type = 'general', id, subType = 'images' } = req.body;

    for (const file of files) {
      let provider: ImageProvider = 'cloudflare';
      let cloudflareImageId: string | undefined;
      let uploadedUrl: string;

      try {
        const uploadedImage = await cloudflareImagesService.uploadImage(file, {
          type: String(type),
          id: id ? String(id) : undefined,
          subType: String(subType),
          uploaderId: req.user?.id
        });

        uploadedUrl = uploadedImage.url;
        cloudflareImageId = uploadedImage.id;
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        const isServiceLimit = /service limit|reached a service limit|quota/i.test(msg);
        if (!isServiceLimit) throw err;

        console.warn('Cloudflare limit reached, saving upload locally (multiple)');

        const saveDir = path.join(process.cwd(), 'uploads', String(type || 'general'), String(subType || 'images'));
        fs.mkdirSync(saveDir, { recursive: true });

        const safeName = (file.originalname || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filename = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${safeName}`;
        const fullPath = path.join(saveDir, filename);

        fs.writeFileSync(fullPath, file.buffer);

        uploadedUrl = `/uploads/${String(type || 'general')}/${String(subType || 'images')}/${filename}`;
        provider = 'local';
      }

      await saveImageRecord(
        req,
        file,
        uploadedUrl,
        provider,
        String(type || 'general'),
        String(subType || 'images'),
        id ? String(id) : undefined,
        cloudflareImageId
      );

      uploadedImages.push(uploadedUrl);
    }

    res.json({
      success: true,
      data: {
        images: uploadedImages
      },
      message: `تم رفع ${uploadedImages.length} صورة بنجاح`
    });
  } catch (error) {
    console.error('خطأ في رفع الصور:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في رفع الصور' 
    });
  }
};
