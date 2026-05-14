// backend/src/controllers/restaurantController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import Restaurant from '../models/Restaurant';
import User from '../models/User';
import Plan from '../models/Plan';
import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import slugify from '../utils/slugify';
import cloudflareImagesService from '../services/cloudflareImagesService';

// دالة مساعدة لإنشاء subdomain فريد
const generateUniqueSubdomain = async (baseSubdomain: string, excludeId?: string): Promise<string> => {
  let subdomain = baseSubdomain;
  let counter = 1;
  
  // تنظيف الـ subdomain (أحرف صغيرة، أرقام، شرطات)
  subdomain = subdomain
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  while (true) {
    const where: any = { subdomain };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    
    const existing = await Restaurant.findOne({ where });
    if (!existing) {
      break;
    }
    
    subdomain = `${baseSubdomain}-${counter}`;
    counter++;
  }
  
  return subdomain;
};

// ==================== دوال مساعدة ====================

const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    if (targetRestaurantId) {
      return targetRestaurantId;
    }
    const restaurants = await Restaurant.findAll({ limit: 1 });
    if (restaurants.length > 0) {
      return restaurants[0].id;
    }
    return null;
  }
  return req.user?.restaurantId || null;
};

const deleteLegacyLocalImage = (imagePath?: string): void => {
  if (!imagePath || /^https?:\/\//i.test(imagePath)) {
    return;
  }

  const cleanPath = imagePath.replace(/^\/+|\/+$/g, '').replace(/^uploads[\\\/]/, '');
  const fullPath = path.join(process.cwd(), 'uploads', cleanPath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
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
    
    // إنشاء slug و subdomain من الاسم
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let subdomain = baseSlug;
    let counter = 1;
    
    // التأكد من uniqueness للـ slug
    while (await Restaurant.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
    }
    
    // التأكد من uniqueness للـ subdomain
    subdomain = await generateUniqueSubdomain(baseSlug);
    
    const restaurant = await Restaurant.create({
      name,
      email,
      phone,
      slug,
      subdomain,
      planId: '11111111-1111-1111-1111-111111111111',
      isActive: true,
      ...otherData
    } as any);
    
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
    
    let restaurant: Restaurant | null = null;
    
    if (req.user?.role === 'super_admin') {
      const restaurants = await Restaurant.findAll({
        limit: 1,
        include: [{ model: Plan, as: 'plan' }]
      });
      
      if (restaurants.length > 0) {
        restaurant = restaurants[0];
        console.log('✅ Super admin fetching first restaurant:', restaurant.id);
      } else {
        console.log('⚠️ No restaurants found, creating default restaurant...');
        
        const baseSlug = 'my-restaurant';
        const slug = baseSlug;
        const subdomain = await generateUniqueSubdomain(baseSlug);
        
        const defaultRestaurant = await Restaurant.create({
          name: 'مطعمي',
          slug: slug,
          subdomain: subdomain,
          email: req.user?.email || 'admin@example.com',
          phone: '',
          planId: '11111111-1111-1111-1111-111111111111',
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          backgroundColor: '#FFFFFF',
          textColor: '#000000',
          fontFamily: 'Cairo'
        } as any);
        
        restaurant = defaultRestaurant;
        console.log('✅ Created default restaurant:', restaurant.id);
      }
    } 
    else if (req.user?.restaurantId) {
      restaurant = await Restaurant.findByPk(req.user.restaurantId, {
        include: [{ model: Plan, as: 'plan' }]
      });
    }
    
    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }

    console.log('✅ Restaurant found:', restaurant.id);

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('خطأ في جلب بيانات المطعم:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const getRestaurantById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { identifier } = req.params;
    
    let restaurant: Restaurant | null = null;
    
    if (identifier) {
      restaurant = await Restaurant.findOne({
        where: {
          [Op.or]: [
            { slug: identifier },
            { subdomain: identifier },
            { id: identifier }
          ]
        },
        include: [{ model: Plan, as: 'plan' }]
      });
    }

    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('خطأ في جلب المطعم:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
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
      latitude, longitude, primaryColor, secondaryColor,
      backgroundColor, textColor, fontFamily, templateId,
      metaTitle, metaDescription, subdomain, customDomain,
      deliverySettings
    } = req.body;

    let restaurant: Restaurant | null = null;
    
    if (req.user?.role === 'super_admin') {
      const restaurants = await Restaurant.findAll({ limit: 1 });
      
      if (restaurants.length > 0) {
        restaurant = restaurants[0];
        console.log('✅ Super admin updating first restaurant:', restaurant.id);
      } else {
        console.log('⚠️ No restaurants found, creating default restaurant...');
        
        const baseSlug = 'my-restaurant';
        const slug = baseSlug;
        const newSubdomain = await generateUniqueSubdomain(baseSlug);
        
        restaurant = await Restaurant.create({
          name: name || 'مطعمي',
          slug: slug,
          subdomain: newSubdomain,
          email: email || req.user?.email || 'admin@example.com',
          phone: phone || '',
          planId: '11111111-1111-1111-1111-111111111111',
          primaryColor: primaryColor || '#3B82F6',
          secondaryColor: secondaryColor || '#10B981',
          backgroundColor: backgroundColor || '#FFFFFF',
          textColor: textColor || '#000000',
          fontFamily: fontFamily || 'Cairo'
        } as any);
        
        console.log('✅ Created default restaurant:', restaurant.id);
      }
    } 
    else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurant = await Restaurant.findByPk(req.user.restaurantId);
    }
    else {
      res.status(403).json({ 
        success: false,
        error: 'ليس لديك صلاحية لتحديث بيانات المطعم' 
      });
      return;
    }
    
    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
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
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
    if (textColor !== undefined) updateData.textColor = textColor;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
    if (templateId !== undefined) updateData.templateId = templateId;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (customDomain !== undefined && req.user?.role === 'super_admin') updateData.customDomain = customDomain;
    
    // ✅ تحديث subdomain (للسوبر أدمن فقط)
    if (subdomain !== undefined && req.user?.role === 'super_admin') {
      const uniqueSubdomain = await generateUniqueSubdomain(subdomain, restaurant.id);
      updateData.subdomain = uniqueSubdomain;
    }
    
    // معالجة deliverySettings
    if (deliverySettings !== undefined) {
      if (typeof deliverySettings === 'object' && deliverySettings !== null) {
        const cleanSettings = {
          enableDelivery: deliverySettings.enableDelivery ?? true,
          baseFee: Number(deliverySettings.baseFee) || 200,
          feePerKm: Number(deliverySettings.feePerKm) || 30,
          minDistance: Number(deliverySettings.minDistance) || 5,
          maxDistance: Number(deliverySettings.maxDistance) || 20,
          freeDeliveryAbove: Number(deliverySettings.freeDeliveryAbove) || 200,
          estimatedTime: Number(deliverySettings.estimatedTime) || 15
        };
        updateData.deliverySettings = JSON.stringify(cleanSettings);
        console.log('📦 Saving delivery settings:', cleanSettings);
      } else if (typeof deliverySettings === 'string') {
        try {
          const parsed = JSON.parse(deliverySettings);
          updateData.deliverySettings = JSON.stringify(parsed);
        } catch {
          updateData.deliverySettings = deliverySettings;
        }
      }
    }

    console.log('📝 Update data keys:', Object.keys(updateData));

    await restaurant.update(updateData);

    const updatedRestaurant = await Restaurant.findByPk(restaurant.id, {
      include: [{ model: Plan, as: 'plan' }]
    });

    console.log('✅ Restaurant updated successfully:', restaurant.id);

    res.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      data: updatedRestaurant
    });
  } catch (error) {
    console.error('❌ خطأ في تحديث بيانات المطعم:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث البيانات' 
    });
  }
};





export const getDeliverySettings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // الحصول على restaurantId
    let restaurantId: string | null = null;
    
    if (req.user?.role === 'super_admin') {
      const restaurants = await Restaurant.findAll({ limit: 1 });
      if (restaurants.length > 0) {
        restaurantId = restaurants[0].id;
      }
    } else if (req.user?.restaurantId) {
      restaurantId = req.user.restaurantId;
    }
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }
    
    const restaurant = await Restaurant.findByPk(restaurantId, {
      attributes: ['deliverySettings']
    });
    
    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }
    
    let settings = restaurant.deliverySettings;
    
    // إذا كان string، قم بتحليله
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
      } catch {
        settings = {
          enableDelivery: true,
          baseFee: 200,
          feePerKm: 30,
          minDistance: 5,
          maxDistance: 20,
          freeDeliveryAbove: 200,
          estimatedTime: 15
        };
      }
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting delivery settings:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب إعدادات التوصيل' 
    });
  }
};

// ==================== دوال رفع الصور ====================

export const uploadCover = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('📸 Upload cover request received');
    
    if (!req.file) {
      res.status(400).json({ 
        success: false,
        error: 'لم يتم رفع أي ملف' 
      });
      return;
    }

    let restaurant: Restaurant | null = null;
    
    if (req.user?.role === 'super_admin') {
      const restaurants = await Restaurant.findAll({ limit: 1 });
      
      if (restaurants.length > 0) {
        restaurant = restaurants[0];
      } else {
        restaurant = await Restaurant.create({
          name: 'مطعمي',
          slug: 'my-restaurant',
          email: req.user?.email || 'admin@example.com',
          phone: '',
          planId: '11111111-1111-1111-1111-111111111111',
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          backgroundColor: '#FFFFFF',
          textColor: '#000000',
          fontFamily: 'Cairo'
        } as any);
      }
    } 
    else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurant = await Restaurant.findByPk(req.user.restaurantId);
    }
    else {
      res.status(403).json({ 
        success: false,
        error: 'ليس لديك صلاحية لرفع الصور' 
      });
      return;
    }

    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }

    if (restaurant.coverImage) {
      try {
        await cloudflareImagesService.deleteImageByUrl(restaurant.coverImage);
      } catch (deleteError) {
        console.error('Failed to delete old restaurant cover from Cloudflare:', deleteError);
        deleteLegacyLocalImage(restaurant.coverImage);
      }
    }

    const uploadedImage = await cloudflareImagesService.uploadImage(req.file, {
      type: 'restaurants',
      id: restaurant.id,
      subType: 'cover',
      uploaderId: req.user?.id
    });

    await restaurant.update({ coverImage: uploadedImage.url });

    res.json({
      success: true,
      data: { coverImage: uploadedImage.url },
      message: 'تم رفع صورة الغلاف بنجاح'
    });
  } catch (error) {
    console.error('خطأ في رفع صورة الغلاف:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في رفع صورة الغلاف' 
    });
  }
};

export const uploadLogo = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('📸 Upload logo request received');
    
    if (!req.file) {
      res.status(400).json({ 
        success: false,
        error: 'لم يتم رفع أي ملف' 
      });
      return;
    }

    let restaurant: Restaurant | null = null;
    
    if (req.user?.role === 'super_admin') {
      const restaurants = await Restaurant.findAll({ limit: 1 });
      
      if (restaurants.length > 0) {
        restaurant = restaurants[0];
      } else {
        restaurant = await Restaurant.create({
          name: 'مطعمي',
          slug: 'my-restaurant',
          email: req.user?.email || 'admin@example.com',
          phone: '',
          planId: '11111111-1111-1111-1111-111111111111',
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          backgroundColor: '#FFFFFF',
          textColor: '#000000',
          fontFamily: 'Cairo'
        } as any);
      }
    } 
    else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurant = await Restaurant.findByPk(req.user.restaurantId);
    }
    else {
      res.status(403).json({ 
        success: false,
        error: 'ليس لديك صلاحية لرفع الصور' 
      });
      return;
    }

    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }

    if (restaurant.logo) {
      try {
        await cloudflareImagesService.deleteImageByUrl(restaurant.logo);
      } catch (deleteError) {
        console.error('Failed to delete old restaurant logo from Cloudflare:', deleteError);
        deleteLegacyLocalImage(restaurant.logo);
      }
    }

    const uploadedImage = await cloudflareImagesService.uploadImage(req.file, {
      type: 'restaurants',
      id: restaurant.id,
      subType: 'logo',
      uploaderId: req.user?.id
    });

    await restaurant.update({ logo: uploadedImage.url });

    res.json({
      success: true,
      data: { logo: uploadedImage.url },
      message: 'تم رفع الشعار بنجاح'
    });
  } catch (error) {
    console.error('خطأ في رفع الشعار:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في رفع الشعار' 
    });
  }
};

// ==================== دوال الموظفين ====================

export const getStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    let restaurantId: string | undefined;
    
    if (req.user?.role === 'super_admin') {
      const targetRestaurantId = req.query.restaurantId as string;
      
      if (targetRestaurantId) {
        restaurantId = targetRestaurantId;
      } else {
        const restaurants = await Restaurant.findAll({ limit: 1 });
        if (restaurants.length > 0) {
          restaurantId = restaurants[0].id;
        }
      }
    } 
    else if (req.user?.restaurantId) {
      restaurantId = req.user.restaurantId;
    }
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const staff = await User.findAll({
      where: { 
        restaurantId: restaurantId,
        role: 'staff'
      },
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('خطأ في جلب الموظفين:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const addStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password, phone, permissions } = req.body;

    let restaurantId: string | undefined;
    
    if (req.user?.role === 'super_admin') {
      const targetRestaurantId = req.body.restaurantId;
      
      if (targetRestaurantId) {
        restaurantId = targetRestaurantId;
      } else {
        const restaurants = await Restaurant.findAll({ limit: 1 });
        if (restaurants.length > 0) {
          restaurantId = restaurants[0].id;
        }
      }
    } 
    else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurantId = req.user.restaurantId;
    }
    else {
      res.status(403).json({ 
        success: false,
        error: 'ليس لديك صلاحية لإضافة موظفين' 
      });
      return;
    }

    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ 
        success: false,
        error: 'البريد الإلكتروني موجود بالفعل' 
      });
      return;
    }

    const staff = await User.create({
      name,
      email,
      password,
      phone,
      role: 'staff',
      restaurantId: restaurantId,
      permissions: permissions || {}
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة الموظف بنجاح',
      data: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        permissions: staff.permissions
      }
    });
  } catch (error) {
    console.error('خطأ في إضافة الموظف:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إضافة الموظف' 
    });
  }
};

export const updateStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phone, permissions, isActive } = req.body;

    let restaurantId: string | undefined;
    
    if (req.user?.role === 'super_admin') {
      const targetRestaurantId = req.body.restaurantId;
      
      if (targetRestaurantId) {
        restaurantId = targetRestaurantId;
      } else {
        const restaurants = await Restaurant.findAll({ limit: 1 });
        if (restaurants.length > 0) {
          restaurantId = restaurants[0].id;
        }
      }
    } 
    else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurantId = req.user.restaurantId;
    }
    else {
      res.status(403).json({ 
        success: false,
        error: 'ليس لديك صلاحية لتحديث بيانات الموظفين' 
      });
      return;
    }

    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const staff = await User.findOne({
      where: { 
        id,
        restaurantId: restaurantId,
        role: 'staff'
      }
    });

    if (!staff) {
      res.status(404).json({ 
        success: false,
        error: 'الموظف غير موجود' 
      });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (permissions) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;

    await staff.update(updateData);

    res.json({
      success: true,
      message: 'تم تحديث بيانات الموظف بنجاح',
      data: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        permissions: staff.permissions,
        isActive: staff.isActive
      }
    });
  } catch (error) {
    console.error('خطأ في تحديث بيانات الموظف:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث البيانات' 
    });
  }
};

export const deleteStaff = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    let restaurantId: string | undefined;
    
    if (req.user?.role === 'super_admin') {
      const targetRestaurantId = req.query.restaurantId as string;
      
      if (targetRestaurantId) {
        restaurantId = targetRestaurantId;
      } else {
        const restaurants = await Restaurant.findAll({ limit: 1 });
        if (restaurants.length > 0) {
          restaurantId = restaurants[0].id;
        }
      }
    } 
    else if (req.user?.restaurantId && req.user?.role === 'owner') {
      restaurantId = req.user.restaurantId;
    }
    else {
      res.status(403).json({ 
        success: false,
        error: 'ليس لديك صلاحية لحذف الموظفين' 
      });
      return;
    }

    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const staff = await User.findOne({
      where: { 
        id,
        restaurantId: restaurantId,
        role: 'staff'
      }
    });

    if (!staff) {
      res.status(404).json({ 
        success: false,
        error: 'الموظف غير موجود' 
      });
      return;
    }

    await staff.destroy();

    res.json({
      success: true,
      message: 'تم حذف الموظف بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف الموظف:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في حذف الموظف' 
    });
  }
};
