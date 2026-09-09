// backend/src/controllers/restaurantController.ts
import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { validatePaymentSettings } from '../services/payment.service';
import { validateLanguageUpdate } from '../services/language.service';
import { validateCurrencyUpdate, resolveCurrencySettings } from '../services/currency.service';
import fs from 'fs';
import path from 'path';
import slugify from '../utils/slugify';
import bcrypt from 'bcrypt';
import r2ImagesService from '../services/r2ImagesService';
import { buildBranchSummary, getLinkedBranches } from '../services/businessBranch.service';
import { renameStorefront } from '../services/storefrontIdentity.service';

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

    const ownerUserId = req.user?.role === 'super_admin' ? (req.body.userId || undefined) : req.user?.id;
    if (req.user?.role !== 'super_admin' && ownerUserId) {
      const currentRestaurant = req.user?.restaurantId
        ? await prisma.restaurant.findUnique({
            where: { id: req.user.restaurantId },
            select: { userId: true, plan: { select: { maxRestaurants: true } } }
          })
        : null;

      const branchOwnerId = currentRestaurant?.userId || ownerUserId;
      if (branchOwnerId) {
        const currentPlanLimit = currentRestaurant?.plan?.maxRestaurants ?? 1;
        const currentBranchesCount = await prisma.restaurant.count({ where: { userId: branchOwnerId } });

        if (currentBranchesCount >= currentPlanLimit) {
          res.status(403).json({
            success: false,
            error: `الخطة الحالية تسمح بإنشاء ${currentPlanLimit} فرع فقط. يرجى الترقية لإضافة فرع جديد`,
            requiresUpgrade: true,
            limitType: 'maxRestaurants',
            current: currentBranchesCount,
            limit: currentPlanLimit
          });
          return;
        }
      }
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
        userId: ownerUserId,
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

    const linkedBranches = await getLinkedBranches('restaurant', restaurant.userId || req.user?.id, restaurant.id);

    console.log('✅ Restaurant found:', restaurant.id);

    res.json({
      success: true,
      data: {
        ...restaurant,
        plan,
        linkedBranches,
        // سعر الصرف عام للمنصّة ولا يملكه التاجر — بدونه لا تعرف صفحة
        // الإعدادات لماذا الدولار غير متاح، فتعرض خياراً يفشل عند الحفظ
        currencySettings: await resolveCurrencySettings(restaurant),
        ...buildBranchSummary(restaurant)
      }
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

    const linkedBranches = await getLinkedBranches('restaurant', restaurant.userId || req.user?.id, restaurant.id);

    res.json({
      success: true,
      data: {
        ...restaurant,
        plan,
        linkedBranches,
        // سعر الصرف عام للمنصّة ولا يملكه التاجر — بدونه لا تعرف صفحة
        // الإعدادات لماذا الدولار غير متاح، فتعرض خياراً يفشل عند الحفظ
        currencySettings: await resolveCurrencySettings(restaurant),
        ...buildBranchSummary(restaurant)
      }
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
      subdomain, customDomain, isActive, deliverySettings,
      paymentSettings, currency, enabledCurrencies, language, enabledLanguages,
      pwaShortName, nameEn, descriptionEn
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
    // الاسم والوصف بالإنجليزية — الفراغ `null` فيرتدّ العرض إلى العربية
    if (nameEn !== undefined) updateData.nameEn = String(nameEn || '').trim() || null;
    if (descriptionEn !== undefined) {
      updateData.descriptionEn = String(descriptionEn || '').trim() || null;
    }
    // الاسم القصير: الفراغ يعني «عُد إلى الاسم الكامل» لا نصّاً فارغاً
    if (pwaShortName !== undefined) {
      const trimmed = String(pwaShortName || '').trim().slice(0, 24);
      updateData.pwaShortName = trimmed || null;
    }
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
    
    if (deliverySettings !== undefined) updateData.deliverySettings = deliverySettings;

    // ===== الدفع =====
    if (paymentSettings !== undefined) {
      const result = validatePaymentSettings(paymentSettings);
      if (!result.ok) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      updateData.paymentSettings = result.value;
    }

    // ===== العملة =====
    // الأسعار تُخزَّن بالليرة؛ هذا الحقل عملة **العرض** لا التخزين.
    //
    // التاجر يختار ما يُعرض: الليرة وحدها، أو الدولار وحده، أو الاثنين
    // ويترك الزبون يبدّل — وهي الحاجة الفعلية في سوقٍ يتعامل الناس فيه
    // بالعملتين معاً.
    if (currency !== undefined || enabledCurrencies !== undefined) {
      const currencyResult = await validateCurrencyUpdate({
        defaultCurrency: currency,
        enabledCurrencies: enabledCurrencies ?? restaurant.enabledCurrencies
      });
      if (!currencyResult.ok) {
        res.status(400).json({
          success: false,
          error: currencyResult.error,
          needsExchangeRate: currencyResult.needsExchangeRate === true
        });
        return;
      }
      updateData.currency = currencyResult.defaultCurrency;
      updateData.enabledCurrencies = currencyResult.enabledCurrencies;
    }

    // ===== اللغات =====
    if (language !== undefined || enabledLanguages !== undefined) {
      const businessId = restaurant.id;
      const result = await validateLanguageUpdate(businessId, 'restaurant', {
        defaultLanguage: language,
        enabledLanguages: enabledLanguages ?? restaurant.enabledLanguages
      });
      if (!result.ok) {
        res.status(result.requiresUpgrade ? 403 : 400).json({
          success: false,
          error: result.error,
          requiresUpgrade: result.requiresUpgrade === true
        });
        return;
      }
      updateData.language = result.defaultLanguage;
      updateData.enabledLanguages = result.enabledLanguages;
    }
    if (customDomain !== undefined && req.user?.role === 'super_admin') updateData.customDomain = customDomain;
    if (isActive !== undefined && req.user?.role === 'super_admin') updateData.isActive = isActive;
    
    // معالجة الإحداثيات - تحويلها إلى Float أو null
    if (latitude !== undefined) {
      updateData.latitude = latitude === '' || latitude === null ? null : parseFloat(latitude);
    }
    if (longitude !== undefined) {
      updateData.longitude = longitude === '' || longitude === null ? null : parseFloat(longitude);
    }
    
    // اسم الواجهة: العمودان معاً، وبفحص تفرّد عبر المطاعم والمتاجر.
    //
    // كان يكتب `subdomain` وحده بفحص داخل جدول المطاعم فقط — فيبقى `slug`
    // قديماً ويعمل الرابطان، ويمكن أن يتصادم مع متجر يحمل الاسم نفسه.
    const handleInput = req.body?.slug ?? subdomain;
    if (handleInput !== undefined && req.user?.role === 'super_admin') {
      const renamed = await renameStorefront('restaurant', restaurant.id, handleInput);
      if (!renamed.ok) {
        res.status(renamed.status || 400).json({ success: false, error: renamed.error });
        return;
      }
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



// backend/src/controllers/restaurantController.ts

// أضف هذه الدوال في نهاية الملف (قبل التصدير)

// ==================== دوال الفروع للمطاعم ====================

// جلب جميع منتجات الفروع المرتبطة
export const getAllBranchesMenuItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    // جلب جميع المطاعم المرتبطة بنفس المالك
    const linkedRestaurants = await prisma.restaurant.findMany({
      where: { userId: restaurant.userId, id: { not: restaurantId } }
    });

    const allMenuItems: any[] = [];

    // جلب أطباق المطعم الحالي
    const currentMenuItems = await prisma.menuItem.findMany({
      where: { restaurantId, isAvailable: true }
    });
    allMenuItems.push(...currentMenuItems.map(item => ({ ...item, branchName: restaurant.name, branchId: restaurant.id })));

    // جلب أطباق الفروع الأخرى
    for (const branch of linkedRestaurants) {
      const menuItems = await prisma.menuItem.findMany({
        where: { restaurantId: branch.id, isAvailable: true }
      });
      allMenuItems.push(...menuItems.map(item => ({ ...item, branchName: branch.name, branchId: branch.id })));
    }

    res.json({ success: true, menuItems: allMenuItems });
  } catch (error) {
    console.error('Error fetching all branches menu items:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الأطباق' });
  }
};

// تحديث إعداد عرض جميع أطباق الفروع
export const updateShowAllBranchesMenuItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { showAllBranchesMenuItems } = req.body;
    
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { showAllBranchesMenuItems: showAllBranchesMenuItems === true }
    });

    res.json({ success: true, data: { showAllBranchesMenuItems: updatedRestaurant.showAllBranchesMenuItems } });
  } catch (error) {
    console.error('Error updating show all branches menu items:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعداد' });
  }
};

// إنشاء فرع مطعم جديد
export const createRestaurantBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parentRestaurantId = await getRestaurantId(req);
    if (!parentRestaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم الرئيسي غير موجود' });
      return;
    }

    const parentRestaurant = await prisma.restaurant.findUnique({ 
      where: { id: parentRestaurantId },
      include: { plan: true }
    });
    if (!parentRestaurant) {
      res.status(404).json({ success: false, error: 'المطعم الرئيسي غير موجود' });
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

    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existingUser) {
      res.status(400).json({ success: false, error: 'البريد الإلكتروني مستخدم بالفعل' });
      return;
    }

    const ownerUserId = parentRestaurant.userId;
    if (!ownerUserId) {
      res.status(400).json({ success: false, error: 'لا يمكن تحديد مالك المطعم' });
      return;
    }

    const currentPlanLimit = parentRestaurant.plan?.maxRestaurants ?? 1;
    const currentBranchesCount = await prisma.restaurant.count({ where: { userId: ownerUserId } });

    if (currentBranchesCount >= currentPlanLimit) {
      res.status(403).json({
        success: false,
        error: `الخطة الحالية تسمح بإنشاء ${currentPlanLimit} فرع فقط. يرجى الترقية لإضافة فرع جديد`,
        requiresUpgrade: true,
        limitType: 'maxRestaurants',
        current: currentBranchesCount,
        limit: currentPlanLimit
      });
      return;
    }

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.restaurant.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    let subdomain = baseSlug;
    let subdomainCounter = 1;
    while (await prisma.restaurant.findFirst({ where: { subdomain } })) {
      subdomain = `${baseSlug}-${subdomainCounter++}`;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const branchUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        password: hashedPassword,
        phone: phone || null,
        role: 'owner',
        isEmailVerified: true,
      }
    });

    const branchRestaurant = await prisma.restaurant.create({
      data: {
        name: name.trim(),
        slug,
        subdomain,
        email: email.trim(),
        phone: phone || null,
        userId: branchUser.id,
        planId: parentRestaurant.planId,
        primaryColor: parentRestaurant.primaryColor,
        secondaryColor: parentRestaurant.secondaryColor,
        backgroundColor: parentRestaurant.backgroundColor,
        cardColor: parentRestaurant.cardColor,
        surfaceColor: parentRestaurant.surfaceColor,
        textColor: parentRestaurant.textColor,
        mutedColor: parentRestaurant.mutedColor,
        accentColor: parentRestaurant.accentColor,
        fontFamily: parentRestaurant.fontFamily,
        isActive: true
      }
    });

    await prisma.user.update({
      where: { id: branchUser.id },
      data: { restaurantId: branchRestaurant.id }
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء فرع المطعم بنجاح',
      data: branchRestaurant
    });
  } catch (error) {
    if (error instanceof Error && (error as any)?.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'لا يمكن إنشاء فرع جديد قبل إزالة قيد التفرد من قاعدة البيانات',
      });
      return;
    }
    console.error('Error creating restaurant branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفرع' });
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
        isActive: true,
        isEmailVerified: true
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
