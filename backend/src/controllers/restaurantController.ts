// backend/src/controllers/restaurantController.ts
import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import fs from 'fs';
import path from 'path';
import slugify from '../utils/slugify';
import bcrypt from 'bcrypt';
import r2ImagesService from '../services/r2ImagesService';

// دالة مساعدة لإنشاء subdomain فريد
const generateUniqueSubdomain = async (baseSubdomain: string, excludeId?: string): Promise<string> => {
  let subdomain = baseSubdomain
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  let counter = 1;
  let uniqueSubdomain = subdomain;
  
  while (true) {
    const where: any = { subdomain: uniqueSubdomain };
    if (excludeId) where.id = { not: excludeId };
    
    const existing = await prisma.restaurant.findFirst({ where });
    if (!existing) break;
    
    uniqueSubdomain = `${subdomain}-${counter++}`;
  }
  
  return uniqueSubdomain;
};

// دالة مساعدة للحصول على restaurantId
const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    if (targetRestaurantId) return targetRestaurantId;
    const restaurants = await prisma.restaurant.findMany({ take: 1 });
    if (restaurants.length > 0) return restaurants[0].id;
    return null;
  }
  return req.user?.restaurantId || null;
};

// حذف الصور المحلية القديمة
const deleteLegacyLocalImage = (imagePath?: string): void => {
  if (!imagePath || /^https?:\/\//i.test(imagePath)) return;
  const cleanPath = imagePath.replace(/^\/+|\/+$/g, '').replace(/^uploads[\\\/]/, '');
  const fullPath = path.join(process.cwd(), 'uploads', cleanPath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
};

// ==================== إنشاء مطعم جديد ====================

export const createRestaurant = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, email, phone, ...otherData } = req.body;
    
    if (!name) {
      res.status(400).json({ success: false, error: 'اسم المطعم مطلوب' });
      return;
    }
    
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;
    
    while (await prisma.restaurant.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }
    
    const subdomain = await generateUniqueSubdomain(baseSlug);
    
    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        slug,
        subdomain,
        planId: '11111111-1111-1111-1111-111111111111',
        isActive: true,
        ...otherData
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء المطعم بنجاح',
      data: restaurant
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء المطعم' });
  }
};

// ==================== دوال المطعم الأساسية ====================

export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('🔍 getProfile - User:', { 
      id: req.user?.id, 
      role: req.user?.role, 
      restaurantId: req.user?.restaurantId 
    });
    
    let restaurant = null;
    
    if (req.user?.role === 'super_admin') {
      const restaurants = await prisma.restaurant.findMany({
        take: 1
      });
      
      if (restaurants.length > 0) {
        restaurant = restaurants[0];
        console.log('✅ Super admin fetching first restaurant:', restaurant.id);
      } else {
        console.log('⚠️ No restaurants found, creating default restaurant...');
        
        const baseSlug = 'my-restaurant';
        const slug = baseSlug;
        const subdomain = await generateUniqueSubdomain(baseSlug);
        
        const defaultRestaurant = await prisma.restaurant.create({
          data: {
            name: 'مطعمي',
            slug,
            subdomain,
            email: req.user?.email || 'admin@example.com',
            phone: '',
            planId: '11111111-1111-1111-1111-111111111111',
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            isActive: true
          }
        });
        
        restaurant = defaultRestaurant;
        console.log('✅ Created default restaurant:', restaurant.id);
      }
    } 
    else if (req.user?.restaurantId) {
      restaurant = await prisma.restaurant.findUnique({
        where: { id: req.user.restaurantId }
      });
    }
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    // جلب الخطة بشكل منفصل
    let plan = null;
    if (restaurant.planId) {
      plan = await prisma.plan.findUnique({
        where: { id: restaurant.planId }
      });
    }

    console.log('✅ Restaurant found:', restaurant.id);

    res.json({
      success: true,
      data: { ...restaurant, plan }
    });
  } catch (error) {
    console.error('خطأ في جلب بيانات المطعم:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const getRestaurantById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { identifier } = req.params;
    
    let restaurant = null;
    
    if (identifier) {
      restaurant = await prisma.restaurant.findFirst({
        where: {
          OR: [
            { slug: identifier },
            { subdomain: identifier },
            { id: identifier }
          ]
        }
      });
    }

    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    // جلب الخطة بشكل منفصل
    let plan = null;
    if (restaurant.planId) {
      plan = await prisma.plan.findUnique({
        where: { id: restaurant.planId }
      });
    }

    res.json({
      success: true,
      data: { ...restaurant, plan }
    });
  } catch (error) {
    console.error('خطأ في جلب المطعم:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('📝 Update profile request received');
    console.log('📝 User role:', req.user?.role);
    console.log('📝 Request body keys:', Object.keys(req.body));

    const {
      name, email, phone, whatsapp, address, description,
      openingHours, instagram, facebook, tiktok,
      latitude, longitude, 
      primaryColor, secondaryColor, backgroundColor, cardColor, surfaceColor,
      textColor, mutedColor, accentColor, fontFamily,
      subdomain, customDomain, isActive, deliverySettings
    } = req.body;

    let restaurant = null;
    
    if (req.user?.role === 'super_admin') {
      const restaurants = await prisma.restaurant.findMany({ take: 1 });
      
      if (restaurants.length > 0) {
        restaurant = restaurants[0];
        console.log('✅ Super admin updating first restaurant:', restaurant.id);
      } else {
        console.log('⚠️ No restaurants found, creating default restaurant...');
        
        const baseSlug = 'my-restaurant';
        const slug = baseSlug;
        const newSubdomain = await generateUniqueSubdomain(baseSlug);
        
        restaurant = await prisma.restaurant.create({
          data: {
            name: name || 'مطعمي',
            slug,
            subdomain: newSubdomain,
            email: email || req.user?.email || 'admin@example.com',
            phone: phone || '',
            planId: '11111111-1111-1111-1111-111111111111',
            primaryColor: primaryColor || '#3B82F6',
            secondaryColor: secondaryColor || '#10B981',
            backgroundColor: backgroundColor || '#082E24',
            cardColor: cardColor || '#112E23',
            surfaceColor: surfaceColor || '#0F3D31',
            textColor: textColor || '#E8F5E9',
            mutedColor: mutedColor || '#9DC4AC',
            accentColor: accentColor || '#C8E235',
            fontFamily: fontFamily || 'Cairo',
            isActive: true
          }
        });
        
        console.log('✅ Created default restaurant:', restaurant.id);
      }
    } 
    else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurant = await prisma.restaurant.findUnique({
        where: { id: req.user.restaurantId }
      });
    }
    else {
      res.status(403).json({ success: false, error: 'ليس لديك صلاحية لتحديث بيانات المطعم' });
      return;
    }
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    console.log('✅ Found restaurant to update:', restaurant.id);

    const updateData: any = {};

    if (name !== undefined && name !== '') updateData.name = name;
    if (email !== undefined && email !== '' && req.user?.role === 'super_admin') updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (openingHours !== undefined) updateData.openingHours = openingHours;
    if (instagram !== undefined) updateData.instagram = instagram;
    if (facebook !== undefined) updateData.facebook = facebook;
    if (tiktok !== undefined) updateData.tiktok = tiktok;
    
    // ✅ جميع ألوان المطعم
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
    if (cardColor !== undefined) updateData.cardColor = cardColor;
    if (surfaceColor !== undefined) updateData.surfaceColor = surfaceColor;
    if (textColor !== undefined) updateData.textColor = textColor;
    if (mutedColor !== undefined) updateData.mutedColor = mutedColor;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
    
    if (deliverySettings !== undefined) updateData.deliverySettings = deliverySettings;
    if (customDomain !== undefined && req.user?.role === 'super_admin') updateData.customDomain = customDomain;
    if (isActive !== undefined && req.user?.role === 'super_admin') updateData.isActive = isActive;
    
    // معالجة الإحداثيات - تحويلها إلى Float أو null
    if (latitude !== undefined) {
      updateData.latitude = latitude === '' || latitude === null ? null : parseFloat(latitude);
    }
    if (longitude !== undefined) {
      updateData.longitude = longitude === '' || longitude === null ? null : parseFloat(longitude);
    }
    
    if (subdomain !== undefined && req.user?.role === 'super_admin') {
      const uniqueSubdomain = await generateUniqueSubdomain(subdomain, restaurant.id);
      updateData.subdomain = uniqueSubdomain;
    }

    // تصفية undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log('📝 Update data keys:', Object.keys(updateData));

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: updateData
    });

    console.log('✅ Restaurant updated successfully:', restaurant.id);

    // جلب الخطة بشكل منفصل
    let plan = null;
    if (updatedRestaurant.planId) {
      plan = await prisma.plan.findUnique({
        where: { id: updatedRestaurant.planId }
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      data: { ...updatedRestaurant, plan }
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث بيانات المطعم:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث البيانات' });
  }
};

export const getDeliverySettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    let restaurantId: string | null = null;
    
    if (req.user?.role === 'super_admin') {
      const restaurants = await prisma.restaurant.findMany({ take: 1 });
      if (restaurants.length > 0) restaurantId = restaurants[0].id;
    } else if (req.user?.restaurantId) {
      restaurantId = req.user.restaurantId;
    }
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }
    
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { deliverySettings: true }
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    let settings = restaurant.deliverySettings;
    
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
      } catch {
        settings = {
          enableDelivery: true,
          baseFee: 5,
          feePerKm: 2,
          minDistance: 1,
          maxDistance: 20,
          freeDeliveryAbove: 100,
          estimatedTime: 45
        };
      }
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting delivery settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات التوصيل' });
  }
};

// ==================== دوال رفع الصور باستخدام R2 ====================

export const uploadLogo = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('📸 Upload logo request received');
    
    if (!req.file) {
      res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف' });
      return;
    }

    let restaurant = null;
    
    if (req.user?.role === 'super_admin') {
      const restaurants = await prisma.restaurant.findMany({ take: 1 });
      if (restaurants.length > 0) {
        restaurant = restaurants[0];
      } else {
        const baseSlug = 'my-restaurant';
        const slug = baseSlug;
        const subdomain = await generateUniqueSubdomain(baseSlug);
        
        restaurant = await prisma.restaurant.create({
          data: {
            name: 'مطعمي',
            slug,
            subdomain,
            email: req.user?.email || 'admin@example.com',
            phone: '',
            planId: '11111111-1111-1111-1111-111111111111',
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            isActive: true
          }
        });
      }
    } 
    else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurant = await prisma.restaurant.findUnique({
        where: { id: req.user.restaurantId }
      });
    }
    else {
      res.status(403).json({ success: false, error: 'ليس لديك صلاحية لرفع الصور' });
      return;
    }

    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    // حذف الصورة القديمة من R2
    if (restaurant.logo) {
      try {
        const imageId = restaurant.logo.split('/').pop();
        if (imageId) {
          await r2ImagesService.deleteImage(imageId);
        }
      } catch (deleteError) {
        console.error('Failed to delete old restaurant logo from R2:', deleteError);
      }
    }

    // رفع الصورة الجديدة إلى R2
   const uploadedImage = await r2ImagesService.uploadImage(req.file, {
  entity: 'restaurants',
  entityId: restaurant.id,
  subType: 'logo'
});

    // تحديث قاعدة البيانات
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { logo: uploadedImage.url }
    });

    res.json({
      success: true,
      data: { 
        logo: uploadedImage.url,
        imageId: uploadedImage.id,
        variants: uploadedImage.variants
      },
      message: 'تم رفع الشعار بنجاح'
    });
  } catch (error) {
    console.error('خطأ في رفع الشعار:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في رفع الشعار' });
  }
};

export const uploadCover = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('📸 Upload cover request received');
    
    if (!req.file) {
      res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف' });
      return;
    }

    let restaurant = null;
    
    if (req.user?.role === 'super_admin') {
      const restaurants = await prisma.restaurant.findMany({ take: 1 });
      if (restaurants.length > 0) {
        restaurant = restaurants[0];
      } else {
        const baseSlug = 'my-restaurant';
        const slug = baseSlug;
        const subdomain = await generateUniqueSubdomain(baseSlug);
        
        restaurant = await prisma.restaurant.create({
          data: {
            name: 'مطعمي',
            slug,
            subdomain,
            email: req.user?.email || 'admin@example.com',
            phone: '',
            planId: '11111111-1111-1111-1111-111111111111',
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            isActive: true
          }
        });
      }
    } 
    else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurant = await prisma.restaurant.findUnique({
        where: { id: req.user.restaurantId }
      });
    }
    else {
      res.status(403).json({ success: false, error: 'ليس لديك صلاحية لرفع الصور' });
      return;
    }

    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    // حذف الصورة القديمة من R2
    if (restaurant.coverImage) {
      try {
        const imageId = restaurant.coverImage.split('/').pop();
        if (imageId) {
          await r2ImagesService.deleteImage(imageId);
        }
      } catch (deleteError) {
        console.error('Failed to delete old restaurant cover from R2:', deleteError);
      }
    }

    // رفع الصورة الجديدة إلى R2
   const uploadedImage = await r2ImagesService.uploadImage(req.file, {
  entity: 'restaurants',
  entityId: restaurant.id,
  subType: 'cover'
});

    // تحديث قاعدة البيانات
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { coverImage: uploadedImage.url }
    });

    res.json({
      success: true,
      data: { 
        coverImage: uploadedImage.url,
        imageId: uploadedImage.id,
        variants: uploadedImage.variants
      },
      message: 'تم رفع صورة الغلاف بنجاح'
    });
  } catch (error) {
    console.error('خطأ في رفع صورة الغلاف:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في رفع صورة الغلاف' });
  }
};

// ==================== دوال الموظفين ====================

export const getStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    let restaurantId: string | null = null;
    
    if (req.user?.role === 'super_admin') {
      const targetRestaurantId = req.query.restaurantId as string;
      if (targetRestaurantId) {
        restaurantId = targetRestaurantId;
      } else {
        const restaurants = await prisma.restaurant.findMany({ take: 1 });
        if (restaurants.length > 0) restaurantId = restaurants[0].id;
      }
    } else if (req.user?.restaurantId) {
      restaurantId = req.user.restaurantId;
    }
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const staff = await prisma.user.findMany({
      where: { restaurantId, role: 'staff' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('خطأ في جلب الموظفين:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const addStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password, phone, permissions } = req.body;

    let restaurantId: string | null = null;
    
    if (req.user?.role === 'super_admin') {
      const targetRestaurantId = req.body.restaurantId;
      if (targetRestaurantId) {
        restaurantId = targetRestaurantId;
      } else {
        const restaurants = await prisma.restaurant.findMany({ take: 1 });
        if (restaurants.length > 0) restaurantId = restaurants[0].id;
      }
    } else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurantId = req.user.restaurantId;
    } else {
      res.status(403).json({ success: false, error: 'ليس لديك صلاحية لإضافة موظفين' });
      return;
    }

    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, error: 'البريد الإلكتروني موجود بالفعل' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: 'staff',
        restaurantId,
        permissions: permissions || {},
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة الموظف بنجاح',
      data: staff
    });
  } catch (error) {
    console.error('خطأ في إضافة الموظف:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إضافة الموظف' });
  }
};

export const updateStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phone, permissions, isActive } = req.body;

    let restaurantId: string | null = null;
    
    if (req.user?.role === 'super_admin') {
      const targetRestaurantId = req.body.restaurantId;
      if (targetRestaurantId) {
        restaurantId = targetRestaurantId;
      } else {
        const restaurants = await prisma.restaurant.findMany({ take: 1 });
        if (restaurants.length > 0) restaurantId = restaurants[0].id;
      }
    } else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurantId = req.user.restaurantId;
    } else {
      res.status(403).json({ success: false, error: 'ليس لديك صلاحية لتحديث بيانات الموظفين' });
      return;
    }

    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const staff = await prisma.user.findFirst({
      where: { id, restaurantId, role: 'staff' }
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (permissions) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedStaff = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث بيانات الموظف بنجاح',
      data: updatedStaff
    });
  } catch (error) {
    console.error('خطأ في تحديث بيانات الموظف:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث البيانات' });
  }
};

export const deleteStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    let restaurantId: string | null = null;
    
    if (req.user?.role === 'super_admin') {
      const targetRestaurantId = req.query.restaurantId as string;
      if (targetRestaurantId) {
        restaurantId = targetRestaurantId;
      } else {
        const restaurants = await prisma.restaurant.findMany({ take: 1 });
        if (restaurants.length > 0) restaurantId = restaurants[0].id;
      }
    } else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurantId = req.user.restaurantId;
    } else {
      res.status(403).json({ success: false, error: 'ليس لديك صلاحية لحذف الموظفين' });
      return;
    }

    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const staff = await prisma.user.findFirst({
      where: { id, restaurantId, role: 'staff' }
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'الموظف غير موجود' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      message: 'تم حذف الموظف بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف الموظف:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الموظف' });
  }
};