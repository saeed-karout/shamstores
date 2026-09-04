// backend/src/controllers/publicController.ts

import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { buildBranchSummary, getLinkedBranches } from '../services/businessBranch.service';
import { getPublicPaymentOptions } from '../services/payment.service';
import { getPublicImages } from '../services/media.service';
import { resolveLanguageSettings } from '../services/language.service';
import { getCurrencyContext } from '../services/currency.service';
import {
  normalizeDomain,
  resolveBusinessByCustomDomain,
  extractSubdomainFromHost
} from '../services/domain.service';

// ==================== جلب بيانات المطعم/المتجر (باستخدام slug) ====================

export const getBusinessBySlug = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
     const rawIdentifier = req.params.identifier;
    
    // ✅ قائمة المسارات التي يجب تجاهلها وتمريرها إلى React Router
    const legalPaths = ['terms', 'privacy', 'about', 'faq', 'contact', 'favicon.ico'];
    
    if (legalPaths.includes(rawIdentifier)) {
      // ✅ بدلاً من 404، أعد 200 مع flag يخبر React Router بالتعامل مع الصفحة
      res.status(200).json({ 
        success: false, 
        isLegalPage: true,
        error: 'هذه صفحة قانونية، يرجى التعامل معها عبر React Router' 
      });
      return;
    }
    // إذا كان المعرّف نطاقاً كاملاً (زائر قادم من دومين مخصص) نحوّله إلى slug
    let identifier = rawIdentifier;
    if (rawIdentifier.includes('.')) {
      const byDomain = await resolveBusinessByCustomDomain(rawIdentifier);
      if (byDomain) {
        identifier = byDomain.slug;
      } else {
        const sub = extractSubdomainFromHost(rawIdentifier);
        if (sub) identifier = sub;
      }
    }

    // البحث في المطاعم أولاً (بـ slug أو subdomain أو دومين مخصص موثّق)
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { subdomain: identifier }
        ],
        isActive: true
      },
      include: {
        plan: true
      }
    });
    
    if (restaurant) {
      const [categories, menuItems] = await Promise.all([
        prisma.category.findMany({
          where: { restaurantId: restaurant.id, isActive: true },
          orderBy: { position: 'asc' }
        }),
        prisma.menuItem.findMany({
          where: { restaurantId: restaurant.id, isAvailable: true },
          orderBy: { position: 'asc' }
        })
      ]);
      
      const linkedBranches = await getLinkedBranches('restaurant', restaurant.userId, restaurant.id);

      res.json({
        success: true,
        data: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          subdomain: restaurant.subdomain,
          customDomain: restaurant.customDomainVerified ? restaurant.customDomain : null,
          type: 'restaurant',
          logo: restaurant.logo,
          coverImage: restaurant.coverImage,
          description: restaurant.description,
          address: restaurant.address,
          phone: restaurant.phone,
          whatsapp: restaurant.whatsapp,
          email: restaurant.email,
          instagram: restaurant.instagram,
          facebook: restaurant.facebook,
          tiktok: restaurant.tiktok,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          // ✅ جميع ألوان المطعم
          primaryColor: restaurant.primaryColor,
          secondaryColor: restaurant.secondaryColor,
          backgroundColor: restaurant.backgroundColor,
          cardColor: restaurant.cardColor,
          surfaceColor: restaurant.surfaceColor,
          textColor: restaurant.textColor,
          mutedColor: restaurant.mutedColor,
          accentColor: restaurant.accentColor,
          fontFamily: restaurant.fontFamily,
          // ✅ إعدادات إضافية
          deliverySettings: restaurant.deliverySettings,
          timezone: restaurant.timezone,
          currency: restaurant.currency,
          language: restaurant.language,
          // طرق الدفع المفعّلة فقط، وبلا رقم المحفظة ما لم تكن مُفعّلة
          paymentOptions: getPublicPaymentOptions(restaurant.paymentSettings),
          languageSettings: await resolveLanguageSettings(restaurant, 'restaurant'),
          currencyContext: await getCurrencyContext(restaurant.currency),
          isActive: restaurant.isActive,
          createdAt: restaurant.createdAt,
          updatedAt: restaurant.updatedAt,
          plan: restaurant.plan,
          branchLabel: buildBranchSummary(restaurant).linkLabel,
          branchLinkType: buildBranchSummary(restaurant).linkType,
          linkedBranches,
          categories,
          menuItems
        }
      });
      return;
    }
    
    // البحث في المتاجر
    const store = await prisma.store.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { subdomain: identifier }
        ],
        isActive: true
      },
      include: {
        plan: true
      }
    });
    
    if (store) {
      const [categories, products] = await Promise.all([
        prisma.category.findMany({
          where: { storeId: store.id, isActive: true },
          orderBy: { position: 'asc' }
        }),
        prisma.product.findMany({
          where: { storeId: store.id, isAvailable: true },
          orderBy: { sortOrder: 'asc' }
        })
      ]);
      
      const linkedBranches = await getLinkedBranches('store', store.userId, store.id);

      res.json({
        success: true,
        data: {
          id: store.id,
          name: store.name,
          slug: store.slug,
          subdomain: store.subdomain,
          customDomain: store.customDomainVerified ? store.customDomain : null,
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
          // ✅ إعدادات إضافية
          deliverySettings: store.deliverySettings,
          // كان يُرسل paymentSettings خاماً: رقم المحفظة والملاحظات الداخلية
          // لأي زائر، حتى وطريقة الدفع مطفأة. هذه البنية تكشف المسموح فقط.
          paymentOptions: getPublicPaymentOptions(store.paymentSettings),
          notificationSettings: store.notificationSettings,
          timezone: store.timezone,
          currency: store.currency,
          language: store.language,
          languageSettings: await resolveLanguageSettings(store, 'store'),
          currencyContext: await getCurrencyContext(store.currency),
          isActive: store.isActive,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt,
          plan: store.plan,
          branchLabel: buildBranchSummary(store).linkLabel,
          branchLinkType: buildBranchSummary(store).linkType,
          linkedBranches,
          categories,
          products
        }
      });
      return;
    }
    res.status(404).json({ success: false, error: 'النشاط التجاري غير موجود' });
  } catch (error) {
    console.error('Error getting business:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const createContactMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!name || !email || !message) {
      res.status(400).json({ success: false, error: 'الاسم والبريد والرسالة مطلوبة' });
      return;
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject: subject || 'رسالة تواصل جديدة',
        message,
        status: 'new'
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إرسال رسالتك بنجاح',
      data: contactMessage
    });
  } catch (error) {
    console.error('Error creating contact message:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال الرسالة' });
  }
};

// ==================== جلب بيانات الطاولة (باستخدام ID فقط) ====================

export const getTableById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { tableId } = req.params;
    
    const table = await prisma.table.findFirst({
      where: { id: tableId, isActive: true }
    });
    
    if (!table) {
      res.status(404).json({ success: false, error: 'الطاولة غير موجودة' });
      return;
    }
    
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: table.restaurantId }
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    const categories = await prisma.category.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: { position: 'asc' }
    });
    
    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id, isAvailable: true },
      orderBy: { position: 'asc' }
    });
    
    res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          logo: restaurant.logo,
          primaryColor: restaurant.primaryColor,
          secondaryColor: restaurant.secondaryColor,
          backgroundColor: restaurant.backgroundColor,
          cardColor: restaurant.cardColor,
          surfaceColor: restaurant.surfaceColor,
          textColor: restaurant.textColor,
          mutedColor: restaurant.mutedColor,
          accentColor: restaurant.accentColor,
          fontFamily: restaurant.fontFamily
        },
        table: {
          id: table.id,
          name: table.name,
          seats: table.seats,
          qrCode: table.qrCode
        },
        categories,
        menuItems
      }
    });
  } catch (error) {
    console.error('Error getting table:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات الطاولة' });
  }
};

// ==================== جلب بيانات المنتج (باستخدام ID فقط) ====================

export const getProductById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;
    
    const product = await prisma.product.findFirst({
      where: { id: productId, isAvailable: true }
    });
    
    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }
    
    const store = await prisma.store.findUnique({
      where: { id: product.storeId }
    });
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const category = product.categoryId ? await prisma.category.findUnique({
      where: { id: product.categoryId }
    }) : null;
    
    res.json({
      success: true,
      data: {
        store: {
          id: store.id,
          name: store.name,
          slug: store.slug,
          logo: store.logo,
          primaryColor: store.primaryColor,
          secondaryColor: store.secondaryColor,
          backgroundColor: store.backgroundColor,
          cardColor: store.cardColor,
          surfaceColor: store.surfaceColor,
          textColor: store.textColor,
          mutedColor: store.mutedColor,
          accentColor: store.accentColor,
          fontFamily: store.fontFamily
        },
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          description: product.description,
          price: product.price,
          stock: product.stock,
          // ملاحظة: `cost` لا يخرج هنا إطلاقاً — هامش ربح التاجر ليس
          // معلومة عامة.
          nameEn: product.nameEn,
          unit: product.unit,
          imageUrl: product.imageUrl,
          // مصفوفة مضمونة: المنتجات القديمة بصورة مفردة تعود بها هنا
          images: getPublicImages(product, 'imageUrl'),
          isAvailable: product.isAvailable,
          // إشارة توفّر جاهزة للعرض بدل أن تعيد الواجهة اشتقاقها
          inStock: product.isAvailable && product.stock > 0,
          category: category?.name || null,
          currency: store.currency,
          currencyContext: await getCurrencyContext(store.currency)
        }
      }
    });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات المنتج' });
  }
};

// ==================== جلب طبق محدد (باستخدام ID) ====================

export const getMenuItemById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { itemId } = req.params;
    
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: itemId, isAvailable: true }
    });
    
    if (!menuItem) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }
    
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: menuItem.restaurantId }
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    const category = menuItem.categoryId ? await prisma.category.findUnique({
      where: { id: menuItem.categoryId }
    }) : null;
    
    res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          logo: restaurant.logo,
          primaryColor: restaurant.primaryColor,
          secondaryColor: restaurant.secondaryColor,
          backgroundColor: restaurant.backgroundColor,
          cardColor: restaurant.cardColor,
          surfaceColor: restaurant.surfaceColor,
          textColor: restaurant.textColor,
          mutedColor: restaurant.mutedColor,
          accentColor: restaurant.accentColor,
          fontFamily: restaurant.fontFamily
        },
        menuItem: {
          id: menuItem.id,
          name: menuItem.name,
          description: menuItem.description,
          price: menuItem.price,
          image: menuItem.image,
          isAvailable: menuItem.isAvailable,
          category: category?.name || null
        }
      }
    });
  } catch (error) {
    console.error('Error getting menu item:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات العنصر' });
  }
};

// ==================== جلب فئات المطعم ====================

export const getCategoriesBySlug = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug }
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    const categories = await prisma.category.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: { position: 'asc' }
    });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفئات' });
  }
};

// ==================== جلب أطباق المطعم ====================

export const getMenuItemsBySlug = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug }
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id, isAvailable: true },
      orderBy: { position: 'asc' }
    });
    
    res.json({
      success: true,
      data: menuItems
    });
  } catch (error) {
    console.error('Error getting menu items:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الأطباق' });
  }
};

// ==================== جلب منتجات المتجر ====================

export const getProductsBySlug = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    
    const store = await prisma.store.findUnique({
      where: { slug }
    });
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }
    
    const products = await prisma.product.findMany({
      where: { storeId: store.id, isAvailable: true },
      orderBy: { sortOrder: 'asc' }
    });
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتجات' });
  }
};

// ==================== جلب طبق محدد (باستخدام ShareToken) ====================

export const getMenuItemByShareToken = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { shareToken } = req.params;
    
    const menuItem = await prisma.menuItem.findFirst({
      where: { 
        id: shareToken,
        isAvailable: true 
      }
    });
    
    if (!menuItem) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }
    
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: menuItem.restaurantId }
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }
    
    const category = menuItem.categoryId ? await prisma.category.findUnique({
      where: { id: menuItem.categoryId }
    }) : null;
    
    res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          logo: restaurant.logo,
          primaryColor: restaurant.primaryColor,
          secondaryColor: restaurant.secondaryColor,
          backgroundColor: restaurant.backgroundColor,
          cardColor: restaurant.cardColor,
          surfaceColor: restaurant.surfaceColor,
          textColor: restaurant.textColor,
          mutedColor: restaurant.mutedColor,
          accentColor: restaurant.accentColor,
          fontFamily: restaurant.fontFamily
        },
        menuItem: {
          id: menuItem.id,
          name: menuItem.name,
          description: menuItem.description,
          price: menuItem.price,
          image: menuItem.image,
          isAvailable: menuItem.isAvailable,
          category: category?.name || null
        }
      }
    });
  } catch (error) {
    console.error('Error getting menu item by token:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب بيانات العنصر' });
  }
};

// ==================== حل النطاق المخصص إلى معرّف نشاط تجاري ====================

/**
 * GET /api/public/resolve-host?host=mystore.com
 *
 * تستخدمه الواجهة عندما يصل زائر عبر نطاق مخصص: لا يوجد slug في الرابط
 * ولا subdomain يمكن استخراجه، فنسأل الخادم عن النشاط التجاري لهذا المضيف.
 * يقرأ بيانات عامة فقط ولا يكشف أي نشاط غير موثّق أو غير نشط.
 */
export const resolveHost = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryHost = typeof req.query.host === 'string' ? req.query.host : '';
    const headerHost = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    const host = normalizeDomain(queryHost || headerHost);

    if (!host) {
      res.status(400).json({ success: false, error: 'المضيف غير محدد' });
      return;
    }

    const business = await resolveBusinessByCustomDomain(host);
    if (business) {
      res.json({
        success: true,
        data: {
          identifier: business.slug,
          slug: business.slug,
          subdomain: business.subdomain,
          type: business.type,
          source: 'custom_domain'
        }
      });
      return;
    }

    const subdomain = extractSubdomainFromHost(host);
    if (subdomain) {
      res.json({
        success: true,
        data: { identifier: subdomain, slug: null, subdomain, type: null, source: 'subdomain' }
      });
      return;
    }

    res.status(404).json({ success: false, error: 'لا يوجد نشاط تجاري مرتبط بهذا النطاق' });
  } catch (error) {
    console.error('Error resolving host:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديد النطاق' });
  }
};
