// backend/src/controllers/storeController.ts

import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { UserService } from '../services/user.service';
import prisma from '../services/prisma';
import bcrypt from 'bcrypt';
import r2ImagesService from '../services/r2ImagesService';
import slugify from '../utils/slugify';
import fs from 'fs';
import path from 'path';
import { buildBranchSummary, getLinkedBranches } from '../services/businessBranch.service';

// ==================== دوال مساعدة ====================

const deleteLegacyLocalImage = (imagePath?: string): void => {
  if (!imagePath || /^https?:\/\//i.test(imagePath)) return;
  const cleanPath = imagePath.replace(/^\/+|\/+$/g, '').replace(/^uploads[\\\/]/, '');
  const fullPath = path.join(process.cwd(), 'uploads', cleanPath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
};

const generateUniqueStoreSlug = async (baseSlug: string, excludeId?: string): Promise<string> => {
  let slug = baseSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  let counter = 1;
  let uniqueSlug = slug;

  while (true) {
    const where: any = {
      OR: [
        { slug: uniqueSlug },
        { subdomain: uniqueSlug },
      ]
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await prisma.store.findFirst({ where });
    if (!existing) break;

    uniqueSlug = `${slug}-${counter++}`;
  }

  return uniqueSlug;
};

const getStoreId = async (req: AuthRequest): Promise<string | null> => {
  try {
    const storeIdFromParams = req.params.storeId;
    if (storeIdFromParams) {
      if (req.user?.role === 'super_admin') return storeIdFromParams;
      if (req.user?.storeId === storeIdFromParams) return storeIdFromParams;
      if (req.user?.role === 'staff' && req.user?.storeId === storeIdFromParams) return storeIdFromParams;
      if (req.user?.role === 'owner' && req.user?.id) {
        const ownedStore = await prisma.store.findFirst({
          where: { id: storeIdFromParams, userId: req.user.id },
          select: { id: true }
        });
        if (ownedStore) return ownedStore.id;
      }
    }
    if (req.user?.role === 'super_admin') {
      const targetStoreId = req.query.storeId as string || req.body.storeId;
      if (targetStoreId) return targetStoreId;
      const stores = await prisma.store.findMany({ take: 1 });
      return stores.length > 0 ? stores[0].id : null;
    }
    if (req.user?.role === 'owner' && req.user?.id) {
      const targetStoreId = req.query.storeId as string || req.body.storeId;
      if (targetStoreId && targetStoreId !== req.user.storeId) {
        const ownedStore = await prisma.store.findFirst({
          where: { id: targetStoreId, userId: req.user.id },
          select: { id: true }
        });
        if (ownedStore) return ownedStore.id;
      }
    }
    return req.user?.storeId || null;
  } catch (error) {
    console.error('Error in getStoreId:', error);
    return null;
  }
};

// ==================== رفع الصور باستخدام R2 ====================

export const uploadStoreLogo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('📸 Upload store logo request received');

    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف' });
      return;
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }

    // حذف الصورة القديمة من R2
    if (store.logo) {
      try {
        await r2ImagesService.deleteImageByUrl(store.logo);
      } catch (deleteError) {
        console.error('Failed to delete old store logo from R2:', deleteError);
      }
    }

    // رفع الصورة الجديدة إلى R2
    const uploadedImage = await r2ImagesService.uploadImage(req.file, {
      entity: 'stores',
      entityId: store.id,
      subType: 'logo'
    });

    // تحديث قاعدة البيانات
    await prisma.store.update({
      where: { id: store.id },
      data: { logo: uploadedImage.url }
    });

    res.json({
      success: true,
      message: 'تم رفع الشعار بنجاح',
      data: { logoUrl: uploadedImage.url, imageId: uploadedImage.id }
    });
  } catch (error) {
    console.error('Error uploading store logo:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في رفع الشعار' });
  }
};

export const uploadStoreCover = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('📸 Upload store cover request received');

    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف' });
      return;
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }

    // حذف الصورة القديمة من R2
    if (store.coverImage) {
      try {
        await r2ImagesService.deleteImageByUrl(store.coverImage);
      } catch (deleteError) {
        console.error('Failed to delete old store cover from R2:', deleteError);
      }
    }

    // رفع الصورة الجديدة إلى R2
    const uploadedImage = await r2ImagesService.uploadImage(req.file, {
      entity: 'stores',
      entityId: store.id,
      subType: 'cover'
    });

    // تحديث قاعدة البيانات
    await prisma.store.update({
      where: { id: store.id },
      data: { coverImage: uploadedImage.url }
    });

    res.json({
      success: true,
      message: 'تم رفع صورة الغلاف بنجاح',
      data: { coverUrl: uploadedImage.url, imageId: uploadedImage.id }
    });
  } catch (error) {
    console.error('Error uploading store cover:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في رفع صورة الغلاف' });
  }
};

export const removeStoreLogo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }

    if (store.logo) {
      await r2ImagesService.deleteImageByUrl(store.logo);
    }

    await prisma.store.update({
      where: { id: store.id },
      data: { logo: null }
    });

    res.json({ success: true, message: 'تم إزالة الشعار بنجاح' });
  } catch (error) {
    console.error('Error removing store logo:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إزالة الشعار' });
  }
};

export const removeStoreCover = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }

    if (store.coverImage) {
      await r2ImagesService.deleteImageByUrl(store.coverImage);
    }

    await prisma.store.update({
      where: { id: store.id },
      data: { coverImage: null }
    });

    res.json({ success: true, message: 'تم إزالة صورة الغلاف بنجاح' });
  } catch (error) {
    console.error('Error removing store cover:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إزالة صورة الغلاف' });
  }
};

// ==================== ملف المتجر ====================

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const store = await prisma.store.findUnique({ 
      where: { id: storeId },
      include: { plan: true }
    });
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    const linkedBranches = await getLinkedBranches('store', store.userId, store.id);
    res.json({ success: true, data: { ...store, linkedBranches, ...buildBranchSummary(store) } });
  } catch (error) {
    console.error('Error getting store profile:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات المتجر' });
  }
};

export const createStoreBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    const { name, email, password, phone } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'اسم الفرع مطلوب' });
      return;
    }

    if (!email || !email.trim()) {
      res.status(400).json({ success: false, error: 'البريد الإلكتروني مطلوب' });
      return;
    }

    if (!password || !password.trim()) {
      res.status(400).json({ success: false, error: 'كلمة المرور مطلوبة' });
      return;
    }

    const existingUser = await UserService.findByEmail(email.trim());
    if (existingUser) {
      res.status(400).json({ success: false, error: 'البريد الإلكتروني مستخدم بالفعل' });
      return;
    }

    const currentStore = await prisma.store.findUnique({
      where: { id: storeId },
      include: { plan: true }
    });

    if (!currentStore) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }

    const ownerUserId = currentStore.userId || req.user?.id;
    if (!ownerUserId) {
      res.status(400).json({ success: false, error: 'لا يمكن تحديد مالك المتجر' });
      return;
    }

    const currentPlanLimit = currentStore.plan?.maxStores ?? 1;
    const currentBranchesCount = await prisma.store.count({ where: { userId: ownerUserId } });

    if (currentBranchesCount >= currentPlanLimit) {
      res.status(403).json({
        success: false,
        error: `الخطة الحالية تسمح بإنشاء ${currentPlanLimit} فرع فقط. يرجى الترقية لإضافة فرع جديد`,
        requiresUpgrade: true,
        limitType: 'maxStores',
        current: currentBranchesCount,
        limit: currentPlanLimit
      });
      return;
    }

    const baseSlug = slugify(name);
    const slug = await generateUniqueStoreSlug(baseSlug);
    const subdomain = await generateUniqueStoreSlug(baseSlug);

    const branchPasswordHash = await bcrypt.hash(password, 10);

    const { store, branchUser } = await prisma.$transaction(async (tx) => {
      const createdStore = await tx.store.create({
        data: {
          name: name.trim(),
          email: email.trim(),
          phone: phone || null,
          slug,
          subdomain,
          planId: currentStore.planId,
          userId: ownerUserId,
          isActive: true,
          primaryColor: currentStore.primaryColor,
          secondaryColor: currentStore.secondaryColor,
          backgroundColor: currentStore.backgroundColor,
          cardColor: currentStore.cardColor,
          surfaceColor: currentStore.surfaceColor,
          textColor: currentStore.textColor,
          mutedColor: currentStore.mutedColor,
          accentColor: currentStore.accentColor,
          fontFamily: currentStore.fontFamily,
        }
      });

      const createdUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.trim(),
          password: branchPasswordHash,
          phone: phone || null,
          role: 'owner',
          storeId: createdStore.id,
          isEmailVerified: true,
        }
      });

      return { store: createdStore, branchUser: createdUser };
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفرع بنجاح',
      data: {
        ...store,
        branchUser: {
          id: branchUser.id,
          name: branchUser.name,
          email: branchUser.email,
          role: branchUser.role,
          storeId: branchUser.storeId,
        }
      }
    });
  } catch (error) {
    if (error instanceof Error && (error as any)?.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'لا يمكن إنشاء فرع جديد قبل إزالة قيد التفرد من قاعدة البيانات',
      });
      return;
    }
    console.error('Error creating store branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفرع' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const { 
      name, email, phone, address, description, 
      primaryColor, secondaryColor, 
      backgroundColor, cardColor, surfaceColor,
      textColor, mutedColor, accentColor, fontFamily,
      latitude, longitude, timezone, currency, language,
      whatsapp, instagram, facebook, tiktok,
      deliverySettings, paymentSettings, notificationSettings,
      isActive 
    } = req.body;
    
    console.log('🎨 Updating store colors:', {
      primaryColor, secondaryColor,
      backgroundColor, cardColor, surfaceColor,
      textColor, mutedColor, accentColor,
      fontFamily
    });
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    
    // ✅ جميع ألوان المتجر
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
    if (cardColor !== undefined) updateData.cardColor = cardColor;
    if (surfaceColor !== undefined) updateData.surfaceColor = surfaceColor;
    if (textColor !== undefined) updateData.textColor = textColor;
    if (mutedColor !== undefined) updateData.mutedColor = mutedColor;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
    
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (currency !== undefined) updateData.currency = currency;
    if (language !== undefined) updateData.language = language;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (instagram !== undefined) updateData.instagram = instagram;
    if (facebook !== undefined) updateData.facebook = facebook;
    if (tiktok !== undefined) updateData.tiktok = tiktok;
    if (deliverySettings !== undefined) updateData.deliverySettings = deliverySettings;
    if (paymentSettings !== undefined) updateData.paymentSettings = paymentSettings;
    if (notificationSettings !== undefined) updateData.notificationSettings = notificationSettings;
    if (isActive !== undefined && req.user?.role === 'super_admin') updateData.isActive = isActive;
    
    const updatedStore = await prisma.store.update({ 
      where: { id: storeId }, 
      data: updateData,
      include: { plan: true }
    });

    const linkedBranches = await getLinkedBranches('store', updatedStore.userId, updatedStore.id);
    
    console.log('✅ Store updated with colors:', {
      primaryColor: updatedStore.primaryColor,
      backgroundColor: updatedStore.backgroundColor,
      cardColor: updatedStore.cardColor
    });
    
    res.json({ success: true, message: 'تم تحديث المتجر بنجاح', data: { ...updatedStore, linkedBranches, ...buildBranchSummary(updatedStore) } });
  } catch (error) {
    console.error('Error updating store profile:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المتجر' });
  }
};

// ==================== المنتجات ====================

export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const products = await prisma.product.findMany({ 
      where: { storeId }, 
      include: { category: true },
      orderBy: { createdAt: 'desc' } 
    });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتجات' });
  }
};

export const getProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const product = await prisma.product.findFirst({ 
      where: { id, storeId },
      include: { category: true }
    });
    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتج' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const { name, nameEn, sku, description, price, cost, stock, imageUrl, categoryId, isAvailable, unit } = req.body;
    
    if (!name) {
      res.status(400).json({ success: false, error: 'اسم المنتج مطلوب' });
      return;
    }
    if (!sku) {
      res.status(400).json({ success: false, error: 'SKU مطلوب' });
      return;
    }
    if (!price || price <= 0) {
      res.status(400).json({ success: false, error: 'سعر المنتج مطلوب ويجب أن يكون أكبر من 0' });
      return;
    }
    
    const product = await prisma.product.create({
      data: {
        storeId,
        name,
        nameEn: nameEn || null,
        sku,
        description: description || null,
        price: parseFloat(price),
        cost: cost ? parseFloat(cost) : null,
        stock: stock || 0,
        imageUrl: imageUrl || null,
        categoryId: categoryId || null,
        isAvailable: isAvailable !== false,
        unit: unit || 'piece',
        reservedStock: 0,
        minStockLevel: 5
      },
      include: { category: true }
    });
    
    res.status(201).json({ success: true, message: 'تم إنشاء المنتج بنجاح', data: product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء المنتج' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const product = await prisma.product.findFirst({ where: { id, storeId } });
    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    
    const { name, nameEn, sku, description, price, cost, stock, imageUrl, categoryId, isAvailable, unit } = req.body;
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (sku !== undefined) updateData.sku = sku;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (cost !== undefined) updateData.cost = cost ? parseFloat(cost) : null;
    if (stock !== undefined) updateData.stock = stock;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (unit !== undefined) updateData.unit = unit;
    
    const updatedProduct = await prisma.product.update({ 
      where: { id }, 
      data: updateData,
      include: { category: true }
    });
    
    res.json({ success: true, message: 'تم تحديث المنتج بنجاح', data: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المنتج' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const product = await prisma.product.findFirst({ where: { id, storeId } });
    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    
    await prisma.product.delete({ where: { id } });
    
    res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المنتج' });
  }
};

// ==================== الفئات ====================

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const categories = await prisma.category.findMany({ 
      where: { storeId, isActive: true }, 
      include: { products: { take: 5 } },
      orderBy: { position: 'asc' } 
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفئات' });
  }
};

export const getCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const category = await prisma.category.findFirst({ 
      where: { id, storeId },
      include: { products: true }
    });
    if (!category) {
      res.status(404).json({ success: false, error: 'الفئة غير موجودة' });
      return;
    }
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفئة' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const { name, nameEn, description, image, position } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'اسم الفئة مطلوب' });
      return;
    }
    
    const category = await prisma.category.create({
      data: { 
        storeId, 
        name, 
        nameEn: nameEn || null,
        description: description || null,
        image: image || null,
        position: position || 0,
        isActive: true 
      }
    });
    
    res.status(201).json({ success: true, message: 'تم إنشاء الفئة بنجاح', data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفئة' });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const category = await prisma.category.findFirst({ where: { id, storeId } });
    if (!category) {
      res.status(404).json({ success: false, error: 'الفئة غير موجودة' });
      return;
    }
    
    const { name, nameEn, description, image, position, isActive } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (position !== undefined) updateData.position = position;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updatedCategory = await prisma.category.update({ where: { id }, data: updateData });
    
    res.json({ success: true, message: 'تم تحديث الفئة بنجاح', data: updatedCategory });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الفئة' });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const category = await prisma.category.findFirst({ where: { id, storeId } });
    if (!category) {
      res.status(404).json({ success: false, error: 'الفئة غير موجودة' });
      return;
    }
    
    const productsCount = await prisma.product.count({ where: { categoryId: id, storeId } });
    if (productsCount > 0) {
      res.status(400).json({ success: false, error: `لا يمكن حذف الفئة لأنها تحتوي على ${productsCount} منتج` });
      return;
    }
    
    await prisma.category.delete({ where: { id } });
    
    res.json({ success: true, message: 'تم حذف الفئة بنجاح' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الفئة' });
  }
};

// ==================== المخزون ====================

export const getInventoryStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const products = await prisma.product.findMany({ where: { storeId } });
    
    const lowStockThreshold = 10;
    const lowStock = products.filter(p => p.stock <= lowStockThreshold && p.stock > 0).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + ((Number(p.price) || 0) * (p.stock || 0)), 0);
    
    res.json({
      success: true,
      data: {
        totalProducts: products.length,
        lowStock,
        outOfStock,
        totalStock,
        totalValue,
        lowStockThreshold
      }
    });
  } catch (error) {
    console.error('Error getting inventory stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات المخزون' });
  }
};

export const updateInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { productId } = req.params;
    const { quantity, type = 'set', reason } = req.body;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    if (quantity === undefined || quantity < 0) {
      res.status(400).json({ success: false, error: 'الكمية مطلوبة ويجب أن تكون أكبر من أو تساوي 0' });
      return;
    }
    
    const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    
    let oldStock = product.stock;
    let newStock = oldStock;
    switch (type) {
      case 'add': newStock = oldStock + quantity; break;
      case 'subtract': newStock = Math.max(0, oldStock - quantity); break;
      case 'set': newStock = quantity; break;
      default: newStock = quantity;
    }
    
    const updatedProduct = await prisma.product.update({ 
      where: { id: productId }, 
      data: { stock: newStock, isAvailable: newStock > 0 } 
    });
    
    // تسجيل حركة المخزون
    if (newStock !== oldStock) {
      await prisma.inventoryMovement.create({
        data: {
          productId: productId,
          quantity: newStock - oldStock,
          type: 'adjustment',
          reason: reason || `تعديل المخزون من ${oldStock} إلى ${newStock}`,
          referenceType: 'adjustment'
        }
      });
    }
    
    res.json({ 
      success: true, 
      message: 'تم تحديث المخزون بنجاح', 
      data: { productId, oldStock, newStock, difference: newStock - oldStock } 
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المخزون' });
  }
};

// ==================== طلبات المتجر ====================

export const getStoreOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const { status, limit = 50, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const where: any = { storeId };
    if (status && status !== 'all') where.status = status;
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { take: 5 }, creator: true },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: offset
      }),
      prisma.order.count({ where })
    ]);
    
    res.json({ 
      success: true, 
      data: orders,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('Error getting store orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلبات' });
  }
};

export const getStoreOrderStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const [totalOrders, todayOrders, pendingOrders, preparingOrders, weeklyOrders] = await Promise.all([
      prisma.order.count({ where: { storeId } }),
      prisma.order.count({ where: { storeId, createdAt: { gte: today } } }),
      prisma.order.count({ where: { storeId, status: 'pending' } }),
      prisma.order.count({ where: { storeId, status: 'preparing' } }),
      prisma.order.count({ where: { storeId, createdAt: { gte: weekAgo } } })
    ]);
    
    const totalSalesAgg = await prisma.order.aggregate({
      where: { storeId, status: 'delivered' },
      _sum: { total: true }
    });
    
    const todaySalesAgg = await prisma.order.aggregate({
      where: { storeId, createdAt: { gte: today }, status: 'delivered' },
      _sum: { total: true }
    });
    
    res.json({
      success: true,
      data: {
        totalOrders: totalOrders || 0,
        todayOrders: todayOrders || 0,
        pendingOrders: pendingOrders || 0,
        preparingOrders: preparingOrders || 0,
        weeklyOrders: weeklyOrders || 0,
        totalSales: (totalSalesAgg._sum.total as number) || 0,
        todaySales: (todaySalesAgg._sum.total as number) || 0
      }
    });
  } catch (error) {
    console.error('Error getting store order stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات الطلبات' });
  }
};

export const getStoreOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const order = await prisma.order.findFirst({ 
      where: { id, storeId },
      include: { items: true, creator: true, driver: true }
    });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلب' });
  }
};

export const updateStoreOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    const { status } = req.body;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const order = await prisma.order.findFirst({ where: { id, storeId } });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    const updatedOrder = await prisma.order.update({ 
      where: { id }, 
      data: { status, ...(status === 'completed' ? { completedAt: new Date() } : {}) } 
    });
    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الطلب' });
  }
};

export const getTopProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    
    const orderItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { product: { storeId } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });
    
    const productIds = orderItems.filter(item => item.productId).map(item => item.productId!);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, storeId },
      include: { category: true }
    });
    
    const topProducts = products.map(product => ({
      ...product,
      totalSold: orderItems.find(item => item.productId === product.id)?._sum.quantity || 0
    })).sort((a, b) => b.totalSold - a.totalSold);
    
    res.json({ success: true, data: topProducts });
  } catch (error) {
    console.error('Error getting top products:', error);
    res.json({ success: true, data: [] });
  }
};

// ==================== إعدادات المتجر ====================

export const getStoreSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    res.json({ success: true, data: store });
  } catch (error) {
    console.error('Error getting store settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعدادات' });
  }
};

export const updateSubdomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const { subdomain } = req.body;
    if (!subdomain) {
      res.status(400).json({ success: false, error: 'الـ subdomain مطلوب' });
      return;
    }
    
    const existingStore = await prisma.store.findFirst({
      where: { subdomain: subdomain.toLowerCase(), id: { not: storeId } }
    });
    if (existingStore) {
      res.status(400).json({ success: false, error: 'هذا الـ subdomain مستخدم بالفعل' });
      return;
    }
    
    const updatedStore = await prisma.store.update({ 
      where: { id: storeId }, 
      data: { subdomain: subdomain.toLowerCase() } 
    });
    res.json({ success: true, message: 'تم تحديث الـ subdomain بنجاح', data: { subdomain: updatedStore.subdomain } });
  } catch (error) {
    console.error('Error updating subdomain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الـ subdomain' });
  }
};

// ==================== إعدادات المتجر المتقدمة ====================

export const updateGeneralSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const { name, email, phone, address, description, timezone, currency, language } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (currency !== undefined) updateData.currency = currency;
    if (language !== undefined) updateData.language = language;
    const updatedStore = await prisma.store.update({ where: { id: storeId }, data: updateData });
    res.json({ success: true, message: 'تم تحديث الإعدادات العامة', data: updatedStore });
  } catch (error) {
    console.error('Error updating general settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعدادات العامة' });
  }
};

export const updateDesignSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const { primaryColor, secondaryColor, backgroundColor, textColor, fontFamily } = req.body;
    const updateData: any = {};
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
    if (textColor !== undefined) updateData.textColor = textColor;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
    const updatedStore = await prisma.store.update({ where: { id: storeId }, data: updateData });
    res.json({ success: true, message: 'تم تحديث إعدادات التصميم', data: updatedStore });
  } catch (error) {
    console.error('Error updating design settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات التصميم' });
  }
};

export const updateDeliverySettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const deliverySettings = req.body;
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: { deliverySettings: deliverySettings as any }
    });
    res.json({ success: true, message: 'تم تحديث إعدادات التوصيل', data: updatedStore.deliverySettings });
  } catch (error) {
    console.error('Error updating delivery settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات التوصيل' });
  }
};

export const updateSocialSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const { whatsapp, instagram, facebook, tiktok } = req.body;
    const updateData: any = {};
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (instagram !== undefined) updateData.instagram = instagram;
    if (facebook !== undefined) updateData.facebook = facebook;
    if (tiktok !== undefined) updateData.tiktok = tiktok;
    const updatedStore = await prisma.store.update({ where: { id: storeId }, data: updateData });
    res.json({ success: true, message: 'تم تحديث إعدادات التواصل الاجتماعي', data: updatedStore });
  } catch (error) {
    console.error('Error updating social settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات التواصل' });
  }
};

export const updatePaymentSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const paymentSettings = req.body;
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: { paymentSettings: paymentSettings as any }
    });
    res.json({ success: true, message: 'تم تحديث إعدادات الدفع', data: updatedStore.paymentSettings });
  } catch (error) {
    console.error('Error updating payment settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات الدفع' });
  }
};

export const updateNotificationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const notificationSettings = req.body;
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: { notificationSettings: notificationSettings as any }
    });
    res.json({ success: true, message: 'تم تحديث إعدادات الإشعارات', data: updatedStore.notificationSettings });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات الإشعارات' });
  }
};

// ==================== إعدادات الدومين ====================

export const getDnsSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    const verificationCode = store?.customDomainVerificationCode || `verify-${Math.random().toString(36).substring(2, 15)}`;
    
    if (!store?.customDomainVerificationCode) {
      await prisma.store.update({
        where: { id: storeId },
        data: { customDomainVerificationCode: verificationCode }
      });
    }
    
    res.json({
      success: true,
      data: {
        targetDomain: `${store?.subdomain}.shamstores.com`,
        verificationCode: verificationCode,
        instructions: {
          cname: { name: 'www', value: `${store?.subdomain}.shamstores.com`, ttl: 3600 },
          txt: { name: '@', value: `verification=${verificationCode}`, ttl: 3600 }
        }
      }
    });
  } catch (error) {
    console.error('Error getting DNS settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات DNS' });
  }
};

export const verifyCustomDomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { customDomain } = req.body;
    if (!storeId || !customDomain) {
      res.status(400).json({ success: false, error: 'بيانات غير مكتملة' });
      return;
    }
    
    // تحديث الدومين كـ مفعل (في بيئة التطوير، نفعله مباشرة)
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        customDomain: customDomain,
        customDomainVerified: true,
        customDomainVerifiedAt: new Date()
      }
    });
    
    res.json({ success: true, verified: true, message: 'تم التحقق من الدومين وتفعيله بنجاح', data: { customDomain: updatedStore.customDomain } });
  } catch (error) {
    console.error('Error verifying custom domain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في التحقق من الدومين' });
  }
};

export const removeCustomDomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        customDomain: null,
        customDomainVerified: false,
        customDomainVerifiedAt: null
      }
    });
    res.json({ success: true, message: 'تم إزالة الدومين المخصص بنجاح', data: updatedStore });
  } catch (error) {
    console.error('Error removing custom domain:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إزالة الدومين' });
  }
};

// ==================== دوال السائقين والموظفين والكوبونات ====================

export const getStoreDrivers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const drivers = await prisma.driver.findMany({
      where: { storeId },
      include: { user: { select: { name: true, email: true, phone: true } } }
    });
    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error('Error getting store drivers:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب السائقين' });
  }
};

export const createStoreDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const { name, email, phone, password, vehicleType, vehiclePlate } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' });
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name, email, password: hashedPassword, phone, role: 'delivery_driver', storeId, isActive: true
      }
    });
    const driver = await prisma.driver.create({
      data: {
        userId: user.id, storeId, vehicleType, vehiclePlate, isActive: true, isOnline: false, totalDeliveries: 0, rating: 5.0, totalEarnings: 0
      }
    });
    res.status(201).json({ success: true, message: 'تم إنشاء السائق بنجاح', data: driver });
  } catch (error) {
    console.error('Error creating store driver:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء السائق' });
  }
};

export const getStoreCoupons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const coupons = await prisma.coupon.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: coupons });
  } catch (error) {
    console.error('Error getting store coupons:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الكوبونات' });
  }
};

export const createStoreCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const { code, discountType, discountValue, minOrderAmount, startDate, endDate, usageLimit } = req.body;
    if (!code || !discountType || !discountValue) {
      res.status(400).json({ success: false, error: 'رمز الكوبون ونوع الخصم وقيمته مطلوبة' });
      return;
    }
    const coupon = await prisma.coupon.create({
      data: {
        storeId, code: code.toUpperCase(), discountType, discountValue: parseFloat(discountValue), minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null, startDate: startDate ? new Date(startDate) : new Date(), endDate: endDate ? new Date(endDate) : null, usageLimit: usageLimit || null, isActive: true
      }
    });
    res.status(201).json({ success: true, message: 'تم إنشاء الكوبون بنجاح', data: coupon });
  } catch (error) {
    console.error('Error creating store coupon:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الكوبون' });
  }
};

export const updateStoreCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const coupon = await prisma.coupon.findFirst({ where: { id, storeId } });
    if (!coupon) {
      res.status(404).json({ success: false, error: 'الكوبون غير موجود' });
      return;
    }
    const { code, discountType, discountValue, minOrderAmount, startDate, endDate, usageLimit, isActive } = req.body;
    const updateData: any = {};
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = parseFloat(discountValue);
    if (minOrderAmount !== undefined) updateData.minOrderAmount = minOrderAmount ? parseFloat(minOrderAmount) : null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    const updatedCoupon = await prisma.coupon.update({ where: { id }, data: updateData });
    res.json({ success: true, message: 'تم تحديث الكوبون بنجاح', data: updatedCoupon });
  } catch (error) {
    console.error('Error updating store coupon:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الكوبون' });
  }
};

export const deleteStoreCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const coupon = await prisma.coupon.findFirst({ where: { id, storeId } });
    if (!coupon) {
      res.status(404).json({ success: false, error: 'الكوبون غير موجود' });
      return;
    }
    await prisma.coupon.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الكوبون بنجاح' });
  } catch (error) {
    console.error('Error deleting store coupon:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الكوبون' });
  }
};

export const getStoreStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const staff = await prisma.user.findMany({
      where: { storeId, role: 'staff' },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, permissions: true, createdAt: true }
    });
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error getting store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الموظفين' });
  }
};

export const getStoreStaffDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const staff = await prisma.user.findFirst({
      where: { id, storeId, role: 'staff' },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, permissions: true, createdAt: true }
    });
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error getting store staff details:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات الموظف' });
  }
};

export const updateStoreStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const staff = await prisma.user.findFirst({ where: { id, storeId, role: 'staff' } });
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    const { name, email, phone, permissions } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (permissions !== undefined) updateData.permissions = permissions;
    const updatedStaff = await prisma.user.update({ where: { id }, data: updateData });
    res.json({ success: true, message: 'تم تحديث بيانات الموظف', data: updatedStaff });
  } catch (error) {
    console.error('Error updating store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الموظف' });
  }
};

export const toggleStoreStaffStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const staff = await prisma.user.findFirst({ where: { id, storeId, role: 'staff' } });
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    const updatedStaff = await prisma.user.update({ where: { id }, data: { isActive: !staff.isActive } });
    res.json({ success: true, message: `تم ${updatedStaff.isActive ? 'تفعيل' : 'تعطيل'} الموظف بنجاح` });
  } catch (error) {
    console.error('Error toggling store staff status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تغيير حالة الموظف' });
  }
};

export const deleteStoreStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const staff = await prisma.user.findFirst({ where: { id, storeId, role: 'staff' } });
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الموظف بنجاح' });
  } catch (error) {
    console.error('Error deleting store staff:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الموظف' });
  }
};

export const updateStoreStaffPermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    const { permissions } = req.body;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }
    const staff = await prisma.user.findFirst({ where: { id, storeId, role: 'staff' } });
    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }
    const updatedStaff = await prisma.user.update({ where: { id }, data: { permissions: permissions || {} } });
    res.json({ success: true, message: 'تم تحديث صلاحيات الموظف', data: updatedStaff.permissions });
  } catch (error) {
    console.error('Error updating staff permissions:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الصلاحيات' });
  }
};

// ==================== الدوال العامة (Public Routes) ====================

export const getPublicStore = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const store = await prisma.store.findFirst({
      where: { 
        OR: [{ slug }, { subdomain: slug }], 
        isActive: true 
      },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          include: {
            products: {
              where: { isAvailable: true },
              orderBy: { sortOrder: 'asc' },
              take: 50
            }
          }
        },
        products: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
          take: 100
        },
        plan: true
      }
    });
    
    if (!store) {
      return res.status(404).json({ success: false, error: 'المتجر غير موجود' });
    }
    
    // ✅ إرجاع جميع حقول المتجر بما فيها الألوان
    res.json({ 
      success: true, 
      data: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        subdomain: store.subdomain,
        type: 'store',
        logo: store.logo,
        coverImage: store.coverImage,
        description: store.description,
        address: store.address,
        phone: store.phone,
        email: store.email,
        whatsapp: store.whatsapp,
        instagram: store.instagram,
        facebook: store.facebook,
        tiktok: store.tiktok,
        latitude: store.latitude,
        longitude: store.longitude,
        // ✅ جميع ألوان المتجر
        primaryColor: store.primaryColor,
        secondaryColor: store.secondaryColor,
        backgroundColor: store.backgroundColor,
        cardColor: store.cardColor,
        surfaceColor: store.surfaceColor,
        textColor: store.textColor,
        mutedColor: store.mutedColor,
        accentColor: store.accentColor,
        fontFamily: store.fontFamily,
        // ✅ إعدادات أخرى
        deliverySettings: store.deliverySettings,
        paymentSettings: store.paymentSettings,
        notificationSettings: store.notificationSettings,
        timezone: store.timezone,
        currency: store.currency,
        language: store.language,
        isActive: store.isActive,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
        // ✅ الفئات والمنتجات
        categories: store.categories,
        products: store.products,
        plan: store.plan
      }
    });
  } catch (error) {
    console.error('Error getting public store:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات المتجر' });
  }
};

export const getPublicProduct = async (req: Request, res: Response) => {
  try {
    const { slug, productId } = req.params;
    const store = await prisma.store.findFirst({ where: { OR: [{ slug }, { subdomain: slug }], isActive: true } });
    if (!store) return res.status(404).json({ success: false, error: 'المتجر غير موجود' });
    const product = await prisma.product.findFirst({ 
      where: { id: productId, storeId: store.id, isAvailable: true },
      include: { category: true }
    });
    if (!product) return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error getting public product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتج' });
  }
};

export const getPublicProducts = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const store = await prisma.store.findFirst({ where: { OR: [{ slug }, { subdomain: slug }], isActive: true } });
    if (!store) return res.status(404).json({ success: false, error: 'المتجر غير موجود' });
    const products = await prisma.product.findMany({ 
      where: { storeId: store.id, isAvailable: true },
      include: { category: true },
      take: 100,
      orderBy: { sortOrder: 'asc' }
    });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error getting public products:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتجات' });
  }
};

export const getPublicCategories = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const store = await prisma.store.findFirst({ where: { OR: [{ slug }, { subdomain: slug }], isActive: true } });
    if (!store) return res.status(404).json({ success: false, error: 'المتجر غير موجود' });
    const categories = await prisma.category.findMany({ 
      where: { storeId: store.id, isActive: true },
      include: { products: { where: { isAvailable: true }, take: 10 } },
      orderBy: { position: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error getting public categories:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفئات' });
  }
};

export const getPublicRelatedProducts = async (req: Request, res: Response) => {
  try {
    const { slug, productId } = req.params;
    const store = await prisma.store.findFirst({ where: { OR: [{ slug }, { subdomain: slug }], isActive: true } });
    if (!store) return res.status(404).json({ success: false, error: 'المتجر غير موجود' });
    const currentProduct = await prisma.product.findFirst({ where: { id: productId, storeId: store.id } });
    const relatedProducts = await prisma.product.findMany({
      where: { 
        storeId: store.id, 
        id: { not: productId }, 
        isAvailable: true,
        ...(currentProduct?.categoryId && { categoryId: currentProduct.categoryId })
      },
      take: 4,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: relatedProducts });
  } catch (error) {
    console.error('Error getting related products:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتجات المشابهة' });
  }
};

// تصدير جميع الدوال
export default {
  getPublicStore,
  getPublicProduct,
  getPublicProducts,
  getPublicCategories,
  getPublicRelatedProducts,
  getProfile,
  updateProfile,
  uploadStoreLogo,
  uploadStoreCover,
  removeStoreLogo,
  removeStoreCover,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventoryStats,
  updateInventory,
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getStoreOrders,
  getStoreOrderStats,
  getStoreOrderById,
  updateStoreOrderStatus,
  getTopProducts,
  getStoreSettings,
  updateSubdomain,
  updateGeneralSettings,
  updateDesignSettings,
  updateDeliverySettings,
  updateSocialSettings,
  updatePaymentSettings,
  updateNotificationSettings,
  getDnsSettings,
  verifyCustomDomain,
  removeCustomDomain,
  getStoreDrivers,
  createStoreDriver,
  getStoreCoupons,
  createStoreCoupon,
  updateStoreCoupon,
  deleteStoreCoupon,
  getStoreStaff,
  getStoreStaffDetails,
  updateStoreStaff,
  toggleStoreStaffStatus,
  deleteStoreStaff,
  updateStoreStaffPermissions
};