// backend/src/controllers/uploadController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import fs from 'fs';
import path from 'path';
import r2ImagesService from '../services/r2ImagesService';
import prisma from '../services/prisma';
import { cleanupTempFile } from '../middleware/upload';

type ImageSubType = 'logo' | 'cover' | 'avatar' | 'icon' | 'gallery' | 'menu' | 'product' | 'receipt';

const normalizeBusinessType = (req: AuthRequest): string => {
  if (req.user?.restaurantId) return 'restaurant';
  if (req.user?.storeId) return 'store';
  return 'unknown';
};

const resolveBusinessId = (req: AuthRequest, rawId?: string): string | null => {
  const directId = rawId?.trim();
  if (directId) return directId;
  return req.user?.restaurantId || req.user?.storeId || null;
};

const getValidSubType = (subType: string): ImageSubType => {
  const validSubTypes: ImageSubType[] = ['logo', 'cover', 'avatar', 'icon', 'gallery', 'menu', 'product', 'receipt'];
  if (validSubTypes.includes(subType as ImageSubType)) {
    return subType as ImageSubType;
  }
  return 'gallery'; // القيمة الافتراضية
};

const getValidEntity = (type: string): any => {
  const validEntities = ['restaurants', 'stores', 'menu-items', 'products', 'drivers', 'categories', 'users', 'advertisements', 'orders'];
  if (validEntities.includes(type)) {
    return type;
  }
  return 'misc';
};

const saveImageRecord = async (
  req: AuthRequest,
  file: Express.Multer.File,
  imageUrl: string,
  provider: string,
  type: string,
  subType: string,
  explicitBusinessId?: string,
  storageImageId?: string
): Promise<void> => {
  await prisma.image.create({
    data: {
      userId: req.user?.id || null,
      businessType: normalizeBusinessType(req),
      businessId: resolveBusinessId(req, explicitBusinessId) || null,
      uploadType: type,
      subType: subType,
      provider: provider as any,
      imageUrl: imageUrl,
      cloudflareImageId: storageImageId || null,
      originalName: file.originalname || null,
      mimeType: file.mimetype || null,
      sizeBytes: file.size || null
    }
  });
};

/**
 * رفع صورة واحدة إلى R2
 */
export const uploadImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  let tempFilePath: string | null = null;
  
  try {
    if (!req.file) {
      res.status(400).json({ 
        success: false,
        error: 'لم يتم رفع أي ملف' 
      });
      return;
    }
    
    tempFilePath = req.file.path;
    const { type = 'misc', id, subType = 'gallery' } = req.body;
    
    console.log('📸 Uploading image to R2:', { type, id, subType, filename: req.file.originalname });
    
    // ✅ رفع إلى R2 مع تحويل الأنواع إلى القيم الصحيحة
    const uploadedImage = await r2ImagesService.uploadImage(req.file, {
      entity: getValidEntity(String(type)),
      entityId: id ? String(id) : req.user?.id || 'unknown',
      subType: getValidSubType(String(subType))
    });

    console.log('✅ Image uploaded to R2:', uploadedImage.id);

    // حفظ السجل في قاعدة البيانات
    await saveImageRecord(
      req,
      req.file,
      uploadedImage.url,
      'r2',
      String(type || 'general'),
      String(subType || 'images'),
      id ? String(id) : undefined,
      uploadedImage.id
    );

    // تنظيف الملف المؤقت
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }

    res.json({
      success: true,
      data: {
        imageUrl: uploadedImage.url,
        imageId: uploadedImage.id,
        fullUrl: uploadedImage.url
      },
      message: 'تم رفع الصورة بنجاح'
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    
    // تنظيف الملف المؤقت في حالة الخطأ
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }
    
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في رفع الصورة. يرجى المحاولة مرة أخرى.' 
    });
  }
};

/**
 * رفع عدة صور إلى R2
 */
export const uploadMultipleImages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const tempFiles: string[] = [];
  
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ 
        success: false,
        error: 'لم يتم رفع أي ملفات' 
      });
      return;
    }

    const uploadedImages: any[] = [];
    const { type = 'misc', id, subType = 'gallery' } = req.body;

    for (const file of files) {
      tempFiles.push(file.path);
      
      // ✅ رفع إلى R2
      const uploadedImage = await r2ImagesService.uploadImage(file, {
        entity: getValidEntity(String(type)),
        entityId: id ? String(id) : req.user?.id || 'unknown',
        subType: getValidSubType(String(subType))
      });

      await saveImageRecord(
        req,
        file,
        uploadedImage.url,
        'r2',
        String(type || 'general'),
        String(subType || 'images'),
        id ? String(id) : undefined,
        uploadedImage.id
      );

      uploadedImages.push({
        url: uploadedImage.url,
        id: uploadedImage.id
      });
    }

    // تنظيف الملفات المؤقتة
    tempFiles.forEach(file => cleanupTempFile(file));

    res.json({
      success: true,
      data: {
        images: uploadedImages
      },
      message: `تم رفع ${uploadedImages.length} صورة بنجاح`
    });
  } catch (error) {
    console.error('❌ Error uploading multiple images:', error);
    
    // تنظيف الملفات المؤقتة في حالة الخطأ
    tempFiles.forEach(file => cleanupTempFile(file));
    
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في رفع الصور. يرجى المحاولة مرة أخرى.' 
    });
  }
};

/**
 * حذف صورة من R2
 */
export const deleteImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { imageUrl, imageId } = req.body;

    let idToDelete = imageId;
    if (!idToDelete && imageUrl) {
      // استخراج معرف الصورة من URL لـ R2
      const urlParts = imageUrl.split('.r2.dev/');
      if (urlParts.length > 1) {
        idToDelete = urlParts[1];
      }
    }

    if (idToDelete) {
      // ✅ حذف من R2
      await r2ImagesService.deleteImage(idToDelete);
      
      // حذف السجل من قاعدة البيانات
      await prisma.image.deleteMany({
        where: { cloudflareImageId: idToDelete }
      });
      
      console.log('✅ Image deleted from R2:', idToDelete);
    }

    res.json({
      success: true,
      message: 'تم حذف الصورة بنجاح'
    });
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في حذف الصورة' 
    });
  }
};

/**
 * جلب صور النشاط التجاري
 */
export const getBusinessImages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const businessType = normalizeBusinessType(req);
    const businessId = resolveBusinessId(req);
    
    if (!businessId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف النشاط التجاري غير موجود' 
      });
      return;
    }

    const images = await prisma.image.findMany({
      where: {
        businessType,
        businessId
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    console.error('Error fetching business images:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الصور' 
    });
  }
};