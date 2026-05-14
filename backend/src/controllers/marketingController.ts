import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../types';
import MarketingSection, { MarketingBusinessType, MarketingSectionType } from '../models/MarketingSection';
import MarketingSettings from '../models/MarketingSettings';
import BusinessFeature from '../models/BusinessFeature';

const DEFAULT_SECTION_ORDER: MarketingSectionType[] = ['announcement', 'banner', 'offer'];
const ALLOWED_SECTION_TYPES = new Set<MarketingSectionType>(DEFAULT_SECTION_ORDER);
const DISABLE_PUBLIC_ADS_FEATURE_CODE = 'disable_public_ads';

interface MarketingPayload {
  sectionOrder: MarketingSectionType[];
  announcements: MarketingSection[];
  banners: MarketingSection[];
  offers: MarketingSection[];
}

const isMarketingSectionType = (value: unknown): value is MarketingSectionType =>
  typeof value === 'string' && ALLOWED_SECTION_TYPES.has(value as MarketingSectionType);

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date value');
  }

  return parsed;
};

const normalizeSectionOrder = (value: unknown): MarketingSectionType[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const sanitized = value.filter(isMarketingSectionType) as MarketingSectionType[];
  if (sanitized.length !== DEFAULT_SECTION_ORDER.length) {
    return null;
  }

  const unique = new Set(sanitized);
  if (unique.size !== DEFAULT_SECTION_ORDER.length) {
    return null;
  }

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

  if (!businessType || !businessId) {
    return null;
  }

  return { businessType, businessId };
};

const buildSectionMap = (sections: MarketingSection[]) => {
  const grouped = {
    announcement: [] as MarketingSection[],
    banner: [] as MarketingSection[],
    offer: [] as MarketingSection[]
  };

  sections.forEach((section) => {
    grouped[section.sectionType].push(section);
  });

  return grouped;
};

const ensureScheduleIsValid = (startAt: Date | null, endAt: Date | null): void => {
  if (startAt && endAt && startAt > endAt) {
    throw new Error('startAt must be before endAt');
  }
};

const isPublicAdsDisabled = async (
  businessType: MarketingBusinessType,
  businessId: string
): Promise<boolean> => {
  try {
    const now = new Date();
    const disabledFeature = await BusinessFeature.findOne({
      where: {
        businessType,
        businessId,
        featureCode: DISABLE_PUBLIC_ADS_FEATURE_CODE,
        isEnabled: true
      }
    });

    if (!disabledFeature) {
      return false;
    }

    if (!disabledFeature.expiresAt) {
      return true;
    }

    return new Date(disabledFeature.expiresAt) >= now;
  } catch (error) {
    console.error('Error checking disable_public_ads feature:', error);
    return false;
  }
};

export const getPublicMarketingData = async (
  businessType: MarketingBusinessType,
  businessId: string
): Promise<MarketingPayload> => {
  try {
    const adsDisabled = await isPublicAdsDisabled(businessType, businessId);
    if (adsDisabled) {
      return {
        sectionOrder: DEFAULT_SECTION_ORDER,
        announcements: [],
        banners: [],
        offers: []
      };
    }

    const [settings, sections] = await Promise.all([
      MarketingSettings.findOne({
        where: { businessType, businessId }
      }),
      MarketingSection.findAll({
        where: {
          businessType,
          businessId,
          isActive: true,
          [Op.and]: [
            {
              [Op.or]: [{ startAt: null }, { startAt: { [Op.lte]: new Date() } }]
            },
            {
              [Op.or]: [{ endAt: null }, { endAt: { [Op.gte]: new Date() } }]
            }
          ]
        },
        order: [
          ['sectionType', 'ASC'],
          ['sortOrder', 'ASC'],
          ['createdAt', 'DESC']
        ]
      })
    ]);

    const grouped = buildSectionMap(sections);
    const sectionOrder = normalizeSectionOrder(settings?.sectionOrder) || DEFAULT_SECTION_ORDER;

    return {
      sectionOrder,
      announcements: grouped.announcement,
      banners: grouped.banner,
      offers: grouped.offer
    };
  } catch (error) {
    console.error('Error loading public marketing data:', error);
    return {
      sectionOrder: DEFAULT_SECTION_ORDER,
      announcements: [],
      banners: [],
      offers: []
    };
  }
};



// ✅ دالة لجلب إعدادات التسويق للمالك (مع فلترة البانرات والعروض فقط)
export const getMarketingSettingsForOwner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const [settings, sections] = await Promise.all([
      MarketingSettings.findOne({ where: context }),
      MarketingSection.findAll({
        where: {
          ...context,
          sectionType: { [Op.in]: ['banner', 'offer'] } // ✅ فقط البانرات والعروض
        },
        order: [
          ['sectionType', 'ASC'],
          ['sortOrder', 'ASC'],
          ['createdAt', 'DESC']
        ]
      })
    ]);

    res.json({
      success: true,
      data: {
        sectionOrder: normalizeSectionOrder(settings?.sectionOrder) || DEFAULT_SECTION_ORDER,
        sections
      }
    });
  } catch (error) {
    console.error('Error getting marketing settings for owner:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات التسويق' });
  }
};

// ✅ دالة لإنشاء قسم تسويق للمالك (مع التحقق من النوع)
export const createMarketingSectionForOwner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const sectionType = req.body?.sectionType as MarketingSectionType;
    
    // ✅ التحقق من أن نوع القسم مسموح للمالك (فقط banner و offer)
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

    const section = await MarketingSection.create({
      ...context,
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



export const getMarketingSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const [settings, sections] = await Promise.all([
      MarketingSettings.findOne({ where: context }),
      MarketingSection.findAll({
        where: {
          ...context,
          // ✅ إذا كان المستخدم مالك (وليس سوبر أدمن)، اعرض فقط البانرات والعروض
          ...(req.user?.role !== 'super_admin' && {
            sectionType: { [Op.in]: ['banner', 'offer'] }
          })
        },
        order: [
          ['sectionType', 'ASC'],
          ['sortOrder', 'ASC'],
          ['createdAt', 'DESC']
        ]
      })
    ]);

    res.json({
      success: true,
      data: {
        sectionOrder: normalizeSectionOrder(settings?.sectionOrder) || DEFAULT_SECTION_ORDER,
        sections
      }
    });
  } catch (error) {
    console.error('Error getting marketing settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إعدادات التسويق' });
  }
};

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

    const existing = await MarketingSettings.findOne({ where: context });
    if (existing) {
      await existing.update({ sectionOrder: normalizedOrder });
    } else {
      await MarketingSettings.create({
        ...context,
        sectionOrder: normalizedOrder
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

    if (req.user?.role !== 'super_admin') {
      // المالكين يمكنهم فقط إضافة بانرات وعروض
      if (!sectionType || !['banner', 'offer'].includes(sectionType)) {
        res.status(403).json({ 
          success: false, 
          error: 'غير مسموح. يمكنك إضافة بانرات وعروض فقط.' 
        });
        return;
      }
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

    const section = await MarketingSection.create({
      ...context,
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

export const updateMarketingSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const { id } = req.params;
    const section = await MarketingSection.findOne({
      where: { ...context, id }
    });

    if (!section) {
      res.status(404).json({ success: false, error: 'العنصر التسويقي غير موجود' });
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

    await section.update(updateData);

    res.json({
      success: true,
      message: 'تم تحديث العنصر التسويقي بنجاح',
      data: section
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

export const deleteMarketingSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = resolveBusinessContext(req);
    if (!context) {
      res.status(400).json({ success: false, error: 'بيانات النشاط التجاري غير مكتملة' });
      return;
    }

    const { id } = req.params;
    const deletedRows = await MarketingSection.destroy({
      where: { ...context, id },
      individualHooks: true
    });

    if (deletedRows === 0) {
      res.status(404).json({ success: false, error: 'العنصر التسويقي غير موجود' });
      return;
    }

    res.json({
      success: true,
      message: 'تم حذف العنصر التسويقي بنجاح'
    });
  } catch (error) {
    console.error('Error deleting marketing section:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف العنصر التسويقي' });
  }
};
