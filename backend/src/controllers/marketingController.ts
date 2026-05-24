// backend/src/controllers/marketingController.ts

import { Request, Response } from 'express'; 
import { AuthRequest } from '../types';
import { prisma } from '../server';

type MarketingBusinessType = 'restaurant' | 'store';
type MarketingSectionType = 'announcement' | 'banner' | 'offer';

const DEFAULT_SECTION_ORDER: MarketingSectionType[] = ['announcement', 'banner', 'offer'];
const ALLOWED_SECTION_TYPES = new Set<MarketingSectionType>(DEFAULT_SECTION_ORDER);
const DISABLE_PUBLIC_ADS_FEATURE_CODE = 'disable_public_ads';

interface MarketingPayload {
  sectionOrder: MarketingSectionType[];
  announcements: any[];
  banners: any[];
  offers: any[];
}

const isMarketingSectionType = (value: unknown): value is MarketingSectionType =>
  typeof value === 'string' && ALLOWED_SECTION_TYPES.has(value as MarketingSectionType);

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid date value');
  return parsed;
};

const normalizeSectionOrder = (value: unknown): MarketingSectionType[] | null => {
  if (!Array.isArray(value)) return null;
  const sanitized = value.filter(isMarketingSectionType) as MarketingSectionType[];
  if (sanitized.length !== DEFAULT_SECTION_ORDER.length) return null;
  const unique = new Set(sanitized);
  if (unique.size !== DEFAULT_SECTION_ORDER.length) return null;
  return sanitized;
};

const resolveBusinessContext = (
  req: AuthRequest
): { businessType: MarketingBusinessType; businessId: string } | null => {
  const rawType = (req.query.businessType ?? req.body?.businessType) as unknown;
  const rawId = (req.query.businessId ?? req.body?.businessId) as unknown;

  const businessType =
    rawType === 'restaurant' || rawType === 'store'
      ? (rawType as MarketingBusinessType)
      : null;
  const businessId = normalizeString(rawId);

  if (!businessType || !businessId) return null;
  return { businessType, businessId };
};

const ensureScheduleIsValid = (startAt: Date | null, endAt: Date | null): void => {
  if (startAt && endAt && startAt > endAt) {
    throw new Error('startAt must be before endAt');
  }
};


export const getPublicMarketingData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { businessType, businessId } = req.query;
    
    console.log('📢 getPublicMarketingData - businessType:', businessType, 'businessId:', businessId);
    
    if (!businessType || !businessId) {
      res.status(400).json({ 
        success: false, 
        error: 'businessType و businessId مطلوبان' 
      });
      return;
    }
    
    // التحقق من صحة النوع
    if (businessType !== 'restaurant' && businessType !== 'store') {
      res.status(400).json({ 
        success: false, 
        error: 'businessType يجب أن يكون restaurant أو store' 
      });
      return;
    }
    
    const now = new Date();
    
    // جلب إعدادات الأقسام
    const settings = await prisma.marketingSettings.findFirst({
      where: {
        businessType: businessType as any,
        businessId: businessId as string
      }
    });
    
    // جلب الأقسام النشطة
    const sections = await prisma.marketingSection.findMany({
      where: {
        businessType: businessType as any,
        businessId: businessId as string,
        isActive: true,
        AND: [
          {
            OR: [
              { startAt: null },
              { startAt: { lte: now } }
            ]
          },
          {
            OR: [
              { endAt: null },
              { endAt: { gte: now } }
            ]
          }
        ]
      },
      orderBy: [
        { sectionType: 'asc' },
        { sortOrder: 'asc' }
      ]
    });
    
    const sectionOrder = (settings?.sectionOrder as any) || ['announcement', 'banner', 'offer'];
    
    res.json({
      success: true,
      data: {
        sectionOrder,
        sections
      }
    });
  } catch (error) {
    console.error('Error fetching public marketing data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'حدث خطأ في جلب البيانات التسويقية' 
    });
  }
};

// ✅ التحقق من ميزة إخفاء الإعلانات (للمطاعم/المتاجر المدفوعة)
const isPublicAdsDisabled = async (
  businessType: MarketingBusinessType,
  businessId: string
): Promise<boolean> => {
  try {
    const now = new Date();
    const disabledFeature = await prisma.businessFeature.findFirst({
      where: {
        businessType,
        businessId,
        featureCode: DISABLE_PUBLIC_ADS_FEATURE_CODE,
        isEnabled: true,
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: now } }
            ]
          }
        ]
      }
    });

    return !!disabledFeature;
  } catch (error) {
    console.error('Error checking disable_public_ads feature:', error);
    return false;
  }
};



// ✅ جلب إعدادات التسويق للمالك (مع فلترة البانرات والعروض فقط)
export const getMarketingSettingsForOwner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const [settings, sections] = await Promise.all([
      prisma.marketingSettings.findFirst({
        where: context
      }),
      prisma.marketingSection.findMany({
        where: {
          ...context,
          sectionType: { in: ['banner', 'offer'] }
        },
        orderBy: [
          { sectionType: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'desc' }
        ]
      })
    ]);

    res.json({
      success: true,
      data: {
        sectionOrder: normalizeSectionOrder(settings?.sectionOrder as any) || DEFAULT_SECTION_ORDER,
        sections
      }
    });
  } catch (error) {
    console.error('Error getting marketing settings for owner:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات التسويق' });
  }
};

// ✅ إنشاء قسم تسويق للمالك (فقط banner و offer)
export const createMarketingSectionForOwner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const sectionType = req.body?.sectionType as MarketingSectionType;
    
    if (!sectionType || !['banner', 'offer'].includes(sectionType)) {
      res.status(400).json({ success: false, error: 'نوع القسم غير صالح. يمكن إضافة بانرات وعروض فقط.' });
      return;
    }

    const title = normalizeString(req.body?.title);
    const titleEn = normalizeString(req.body?.titleEn);
    const description = normalizeString(req.body?.description);
    const descriptionEn = normalizeString(req.body?.descriptionEn);

    if (!title && !titleEn && !description && !descriptionEn) {
      res.status(400).json({ success: false, error: 'أدخل عنواناً أو وصفاً على الأقل' });
      return;
    }

    const startAt = parseDate(req.body?.startAt);
    const endAt = parseDate(req.body?.endAt);
    ensureScheduleIsValid(startAt, endAt);

    const section = await prisma.marketingSection.create({
      data: {
        businessType: context.businessType,
        businessId: context.businessId,
        sectionType,
        title,
        titleEn,
        description,
        descriptionEn,
        imageUrl: normalizeString(req.body?.imageUrl),
        linkUrl: normalizeString(req.body?.linkUrl),
        isActive: req.body?.isActive !== undefined ? Boolean(req.body.isActive) : true,
        sortOrder: Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0,
        startAt,
        endAt
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء العنصر التسويقي بنجاح',
      data: section
    });
  } catch (error: any) {
    console.error('Error creating marketing section for owner:', error);
    if (error?.message === 'Invalid date value' || error?.message === 'startAt must be before endAt') {
      res.status(400).json({ success: false, error: 'تواريخ الجدولة غير صالحة' });
      return;
    }
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء العنصر التسويقي' });
  }
};

// ✅ جلب إعدادات التسويق (للسوبر أدمن والمالك)
export const getMarketingSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const [settings, sections] = await Promise.all([
      prisma.marketingSettings.findFirst({
        where: context
      }),
      prisma.marketingSection.findMany({
        where: {
          ...context,
          // ✅ السوبر أدمن يرى كل الأقسام (بما فيها الإعلانات)
          // ✅ المالك يرى فقط البانرات والعروض
          ...(req.user?.role !== 'super_admin' && {
            sectionType: { in: ['banner', 'offer'] }
          })
        },
        orderBy: [
          { sectionType: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'desc' }
        ]
      })
    ]);

    res.json({
      success: true,
      data: {
        sectionOrder: normalizeSectionOrder(settings?.sectionOrder as any) || DEFAULT_SECTION_ORDER,
        sections
      }
    });
  } catch (error) {
    console.error('Error getting marketing settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات التسويق' });
  }
};

// ✅ تحديث ترتيب الأقسام
export const updateMarketingSectionOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const normalizedOrder = normalizeSectionOrder(req.body?.sectionOrder);
    if (!normalizedOrder) {
      res.status(400).json({ success: false, error: 'ترتيب الأقسام غير صالح' });
      return;
    }

    const existing = await prisma.marketingSettings.findFirst({
      where: context
    });

    if (existing) {
      await prisma.marketingSettings.update({
        where: { id: existing.id },
        data: { sectionOrder: normalizedOrder as any }
      });
    } else {
      await prisma.marketingSettings.create({
        data: {
          businessType: context.businessType,
          businessId: context.businessId,
          sectionOrder: normalizedOrder as any
        }
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث ترتيب الأقسام بنجاح',
      data: { sectionOrder: normalizedOrder }
    });
  } catch (error) {
    console.error('Error updating marketing section order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث ترتيب الأقسام' });
  }
};

// ✅ إنشاء قسم تسويق (للسوبر أدمن يمكنه إنشاء إعلانات)
export const createMarketingSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const sectionType = req.body?.sectionType as MarketingSectionType;
    if (!isMarketingSectionType(sectionType)) {
      res.status(400).json({ success: false, error: 'نوع القسم غير صالح' });
      return;
    }

    // ✅ السوبر أدمن فقط يمكنه إنشاء إعلانات (announcement)
    if (sectionType === 'announcement' && req.user?.role !== 'super_admin') {
      res.status(403).json({ 
        success: false, 
        error: 'غير مسموح. الإعلانات العامة يضيفها المدير فقط.' 
      });
      return;
    }

    // ✅ المالك يمكنه إضافة بانرات وعروض فقط
    if (req.user?.role !== 'super_admin' && !['banner', 'offer'].includes(sectionType)) {
      res.status(403).json({ 
        success: false, 
        error: 'غير مسموح. يمكنك إضافة بانرات وعروض فقط.' 
      });
      return;
    }

    const title = normalizeString(req.body?.title);
    const titleEn = normalizeString(req.body?.titleEn);
    const description = normalizeString(req.body?.description);
    const descriptionEn = normalizeString(req.body?.descriptionEn);

    if (!title && !titleEn && !description && !descriptionEn) {
      res.status(400).json({ success: false, error: 'أدخل عنواناً أو وصفاً على الأقل' });
      return;
    }

    const startAt = parseDate(req.body?.startAt);
    const endAt = parseDate(req.body?.endAt);
    ensureScheduleIsValid(startAt, endAt);

    const section = await prisma.marketingSection.create({
      data: {
        businessType: context.businessType,
        businessId: context.businessId,
        sectionType,
        title,
        titleEn,
        description,
        descriptionEn,
        imageUrl: normalizeString(req.body?.imageUrl),
        linkUrl: normalizeString(req.body?.linkUrl),
        isActive: req.body?.isActive !== undefined ? Boolean(req.body.isActive) : true,
        sortOrder: Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0,
        startAt,
        endAt
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء العنصر التسويقي بنجاح',
      data: section
    });
  } catch (error: any) {
    console.error('Error creating marketing section:', error);
    if (error?.message === 'Invalid date value' || error?.message === 'startAt must be before endAt') {
      res.status(400).json({ success: false, error: 'تواريخ الجدولة غير صالحة' });
      return;
    }
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء العنصر التسويقي' });
  }
};

// ✅ تحديث قسم تسويق
export const updateMarketingSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const { id } = req.params;
    const section = await prisma.marketingSection.findFirst({
      where: { ...context, id }
    });

    if (!section) {
      res.status(404).json({ success: false, error: 'العنصر التسويقي غير موجود' });
      return;
    }

    // ✅ المالك لا يمكنه تعديل الإعلانات (announcement)
    if (section.sectionType === 'announcement' && req.user?.role !== 'super_admin') {
      res.status(403).json({ 
        success: false, 
        error: 'غير مسموح. الإعلانات العامة يعدلها المدير فقط.' 
      });
      return;
    }

    const updateData: Record<string, any> = {};

    if (req.body?.sectionType !== undefined) {
      if (!isMarketingSectionType(req.body.sectionType)) {
        res.status(400).json({ success: false, error: 'نوع القسم غير صالح' });
        return;
      }
      updateData.sectionType = req.body.sectionType;
    }

    if (req.body?.title !== undefined) updateData.title = normalizeString(req.body.title);
    if (req.body?.titleEn !== undefined) updateData.titleEn = normalizeString(req.body.titleEn);
    if (req.body?.description !== undefined) updateData.description = normalizeString(req.body.description);
    if (req.body?.descriptionEn !== undefined) updateData.descriptionEn = normalizeString(req.body.descriptionEn);
    if (req.body?.imageUrl !== undefined) updateData.imageUrl = normalizeString(req.body.imageUrl);
    if (req.body?.linkUrl !== undefined) updateData.linkUrl = normalizeString(req.body.linkUrl);
    if (req.body?.isActive !== undefined) updateData.isActive = Boolean(req.body.isActive);
    if (req.body?.sortOrder !== undefined) {
      updateData.sortOrder = Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0;
    }

    let startAt = section.startAt;
    let endAt = section.endAt;

    if (req.body?.startAt !== undefined) {
      startAt = parseDate(req.body.startAt);
      updateData.startAt = startAt;
    }
    if (req.body?.endAt !== undefined) {
      endAt = parseDate(req.body.endAt);
      updateData.endAt = endAt;
    }
    ensureScheduleIsValid(startAt, endAt);

    await prisma.marketingSection.update({
      where: { id: section.id },
      data: updateData
    });

    const updatedSection = await prisma.marketingSection.findUnique({
      where: { id: section.id }
    });

    res.json({
      success: true,
      message: 'تم تحديث العنصر التسويقي بنجاح',
      data: updatedSection
    });
  } catch (error: any) {
    console.error('Error updating marketing section:', error);
    if (error?.message === 'Invalid date value' || error?.message === 'startAt must be before endAt') {
      res.status(400).json({ success: false, error: 'تواريخ الجدولة غير صالحة' });
      return;
    }
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث العنصر التسويقي' });
  }
};

// ✅ حذف قسم تسويق
export const deleteMarketingSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const { id } = req.params;
    const section = await prisma.marketingSection.findFirst({
      where: { ...context, id }
    });

    if (!section) {
      res.status(404).json({ success: false, error: 'العنصر التسويقي غير موجود' });
      return;
    }

    // ✅ المالك لا يمكنه حذف الإعلانات (announcement)
    if (section.sectionType === 'announcement' && req.user?.role !== 'super_admin') {
      res.status(403).json({ 
        success: false, 
        error: 'غير مسموح. الإعلانات العامة يحذفها المدير فقط.' 
      });
      return;
    }

    await prisma.marketingSection.delete({
      where: { id: section.id }
    });

    res.json({
      success: true,
      message: 'تم حذف العنصر التسويقي بنجاح'
    });
  } catch (error) {
    console.error('Error deleting marketing section:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف العنصر التسويقي' });
  }
};

// ✅ ميزة إخفاء الإعلانات العامة (للمطاعم/المتاجر المدفوعة)
export const toggleDisablePublicAds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const { isEnabled, expiresAt } = req.body;
    const featureCode = DISABLE_PUBLIC_ADS_FEATURE_CODE;

    const existingFeature = await prisma.businessFeature.findFirst({
      where: {
        businessType: context.businessType,
        businessId: context.businessId,
        featureCode
      }
    });

    if (existingFeature) {
      await prisma.businessFeature.update({
        where: { id: existingFeature.id },
        data: {
          isEnabled: isEnabled ?? !existingFeature.isEnabled,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        }
      });
    } else {
      await prisma.businessFeature.create({
        data: {
          businessType: context.businessType,
          businessId: context.businessId,
          featureCode,
          isEnabled: isEnabled ?? true,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        }
      });
    }

    res.json({
      success: true,
      message: `تم ${isEnabled ? 'تفعيل' : 'إلغاء'} إخفاء الإعلانات العامة بنجاح`
    });
  } catch (error) {
    console.error('Error toggling disable public ads:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات الإعلانات' });
  }
};

// ✅ جلب حالة ميزة إخفاء الإعلانات
export const getDisablePublicAdsStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const feature = await prisma.businessFeature.findFirst({
      where: {
        businessType: context.businessType,
        businessId: context.businessId,
        featureCode: DISABLE_PUBLIC_ADS_FEATURE_CODE
      }
    });

    res.json({
      success: true,
      data: {
        isEnabled: feature?.isEnabled || false,
        expiresAt: feature?.expiresAt || null
      }
    });
  } catch (error) {
    console.error('Error getting disable public ads status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات الإعلانات' });
  }
};