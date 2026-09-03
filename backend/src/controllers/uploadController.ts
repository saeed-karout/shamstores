// backend/src/controllers/uploadController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import fs from 'fs';
import path from 'path';
import r2ImagesService from '../services/r2ImagesService';
import r2Service from '../services/r2Service';
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

    // المفتاح يُستخرج من الرابط العام — يعمل مع النطاق المخصص ومع r2.dev معاً،
    // ويشمل الفيديو لأن كليهما كائن واحد في نفس الحاوية.
    let idToDelete = imageId || (imageUrl ? r2Service.keyFromUrl(imageUrl) : null);

    if (idToDelete) {
      // ✅ حذف من R2
      await r2Service.deleteObject(idToDelete);
      
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
// ==================== الفيديو ====================

/**
 * تسجيل سجل وسائط دون ملف multer (يُستخدم بعد الرفع المباشر إلى R2).
 */
const saveMediaRecord = async (
  req: AuthRequest,
  params: {
    url: string;
    key: string;
    type: string;
    subType: string;
    originalName?: string;
    mimeType?: string;
    sizeBytes?: number;
    businessId?: string;
  }
): Promise<void> => {
  await prisma.image.create({
    data: {
      userId: req.user?.id || null,
      businessType: normalizeBusinessType(req),
      businessId: resolveBusinessId(req, params.businessId) || null,
      uploadType: params.type,
      subType: params.subType,
      provider: 'r2' as any,
      imageUrl: params.url,
      cloudflareImageId: params.key,
      originalName: params.originalName || null,
      mimeType: params.mimeType || null,
      sizeBytes: params.sizeBytes ?? null
    }
  });
};

/**
 * الخطوة 1 للفيديو: توليد رابط PUT موقّع يرفع عبره المتصفح الملف مباشرة إلى R2.
 * الملف لا يمر بالسيرفر إطلاقاً — لا مهلة H12 ولا ضغط على الدينو.
 */
export const createVideoUploadUrl = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!r2Service.isR2Configured()) {
      res.status(503).json({
        success: false,
        error: 'تخزين الوسائط غير مهيأ. راجع متغيرات R2 في إعدادات الخادم.'
      });
      return;
    }

    const { type = 'misc', id, subType = 'video', fileName, contentType, size } = req.body;

    const validationError = r2Service.validateVideo(
      String(contentType || ''),
      size === undefined ? undefined : Number(size)
    );
    if (validationError) {
      res.status(400).json({ success: false, error: validationError });
      return;
    }

    const entityId = id ? String(id) : resolveBusinessId(req) || req.user?.id || 'unknown';
    const key = r2Service.buildMediaKey({
      entity: getValidEntity(String(type)),
      entityId,
      subType: String(subType),
      kind: 'video',
      originalName: String(fileName || 'video'),
      ext: r2Service.ALLOWED_VIDEO_TYPES[String(contentType)]
    });

    const presigned = await r2Service.createPresignedUpload({
      key,
      contentType: String(contentType)
    });

    res.json({ success: true, data: presigned });
  } catch (error) {
    console.error('❌ Error creating video upload URL:', error);
    res.status(500).json({ success: false, error: 'تعذّر تجهيز رابط الرفع. حاول مرة أخرى.' });
  }
};

/**
 * الخطوة 2 للفيديو: تأكيد الرفع.
 * نتحقق من الكائن فعلياً في R2 (وجوده ونوعه وحجمه) قبل تسجيله — لا نثق بما يرسله العميل.
 * أي كائن يتجاوز الحد يُحذف فوراً بدل أن يبقى يستهلك تخزيناً بلا سجل.
 */
export const completeVideoUpload = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { key, type = 'misc', id, subType = 'video', originalName } = req.body;

    if (!key || typeof key !== 'string') {
      res.status(400).json({ success: false, error: 'مفتاح الملف مفقود' });
      return;
    }

    const head = await r2Service.headObject(key);
    if (!head) {
      res.status(404).json({ success: false, error: 'لم يتم العثور على الملف المرفوع' });
      return;
    }

    const validationError = r2Service.validateVideo(head.contentType, head.size);
    if (validationError) {
      await r2Service.deleteObject(key);
      res.status(400).json({ success: false, error: validationError });
      return;
    }

    const url = r2Service.publicUrlForKey(key);

    await saveMediaRecord(req, {
      url,
      key,
      type: String(type),
      subType: String(subType),
      originalName: originalName ? String(originalName) : undefined,
      mimeType: head.contentType,
      sizeBytes: head.size,
      businessId: id ? String(id) : undefined
    });

    res.json({
      success: true,
      data: { videoUrl: url, url, key, sizeBytes: head.size, mimeType: head.contentType },
      message: 'تم رفع الفيديو بنجاح'
    });
  } catch (error) {
    console.error('❌ Error completing video upload:', error);
    res.status(500).json({ success: false, error: 'تعذّر تأكيد رفع الفيديو' });
  }
};

/**
 * مسار احتياطي: رفع فيديو صغير عبر السيرفر.
 * يُستخدم فقط إن تعذّر الرفع المباشر (مثلاً CORS غير مضبوط على الحاوية بعد).
 */
export const uploadVideoDirect = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!r2Service.isR2Configured()) {
      res.status(503).json({
        success: false,
        error: 'تخزين الوسائط غير مهيأ. راجع متغيرات R2 في إعدادات الخادم.'
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف' });
      return;
    }

    const { type = 'misc', id, subType = 'video' } = req.body;

    const validationError = r2Service.validateVideo(req.file.mimetype, req.file.size);
    if (validationError) {
      res.status(400).json({ success: false, error: validationError });
      return;
    }

    const entityId = id ? String(id) : resolveBusinessId(req) || req.user?.id || 'unknown';
    const key = r2Service.buildMediaKey({
      entity: getValidEntity(String(type)),
      entityId,
      subType: String(subType),
      kind: 'video',
      originalName: req.file.originalname,
      ext: r2Service.ALLOWED_VIDEO_TYPES[req.file.mimetype]
    });

    const url = await r2Service.putObject({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype
    });

    await saveMediaRecord(req, {
      url,
      key,
      type: String(type),
      subType: String(subType),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      businessId: id ? String(id) : undefined
    });

    res.json({
      success: true,
      data: { videoUrl: url, url, key },
      message: 'تم رفع الفيديو بنجاح'
    });
  } catch (error) {
    console.error('❌ Error uploading video:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في رفع الفيديو' });
  }
};
