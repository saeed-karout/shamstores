// backend/src/controllers/affiliateController.ts
//
// إدارة المسوّقين بالعمولة — للتاجر.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import env from '../config/env';
import { generateCode, statsFor, trackClick, BusinessType } from '../services/affiliate.service';

const getBusiness = (req: AuthRequest): { id: string; type: BusinessType } | null => {
  if (req.user?.restaurantId) return { id: req.user.restaurantId, type: 'restaurant' };
  if (req.user?.storeId) return { id: req.user.storeId, type: 'store' };
  return null;
};

/** رابط المسوّق — يُنسخ ويُوزَّع كما هو */
const referralLink = async (
  businessId: string,
  businessType: BusinessType,
  code: string
): Promise<string> => {
  const business =
    businessType === 'restaurant'
      ? await prisma.restaurant.findUnique({ where: { id: businessId }, select: { slug: true, subdomain: true } })
      : await prisma.store.findUnique({ where: { id: businessId }, select: { slug: true, subdomain: true } });

  const base = env.CLIENT_URL || `https://${env.APP_DOMAIN}`;
  const handle = business?.subdomain || business?.slug || '';
  return `${base}/${handle}?ref=${code}`;
};

// ==================== القائمة ====================

export const listAffiliates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const affiliates = await prisma.affiliate.findMany({
      where: { businessId: business.id, businessType: business.type },
      orderBy: { createdAt: 'desc' }
    });

    const rows = await Promise.all(
      affiliates.map(async (affiliate) => ({
        id: affiliate.id,
        name: affiliate.name,
        phone: affiliate.phone,
        code: affiliate.code,
        commissionRate: affiliate.commissionRate,
        isActive: affiliate.isActive,
        clicks: affiliate.clicks,
        createdAt: affiliate.createdAt,
        link: await referralLink(business.id, business.type, affiliate.code),
        stats: await statsFor(affiliate.id)
      }))
    );

    const totals = rows.reduce(
      (acc, r) => ({
        sales: acc.sales + r.stats.sales,
        due: acc.due + r.stats.commissionDue,
        paid: acc.paid + r.stats.commissionPaid,
        orders: acc.orders + r.stats.approved
      }),
      { sales: 0, due: 0, paid: 0, orders: 0 }
    );

    res.json({
      success: true,
      data: {
        affiliates: rows,
        summary: {
          count: rows.length,
          active: rows.filter((r) => r.isActive).length,
          sales: Math.round(totals.sales * 100) / 100,
          commissionDue: Math.round(totals.due * 100) / 100,
          commissionPaid: Math.round(totals.paid * 100) / 100,
          orders: totals.orders
        }
      }
    });
  } catch (error) {
    console.error('listAffiliates failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب المسوّقين' });
  }
};

// ==================== الإنشاء والتعديل ====================

export const createAffiliate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 120) : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim().slice(0, 30) || null : null;
    const rate = Number(req.body?.commissionRate);

    if (!name) {
      res.status(400).json({ success: false, error: 'اسم المسوّق مطلوب' });
      return;
    }

    // حدٌّ عاقل لا تحكّم: نسبةٌ فوق الخمسين تعني أن التاجر يبيع بخسارة —
    // وأغلب من يكتبها أخطأ الخانة لا قصدها
    if (!Number.isFinite(rate) || rate <= 0 || rate > 50) {
      res.status(400).json({ success: false, error: 'نسبة العمولة يجب أن تكون بين 1 و 50' });
      return;
    }

    const code = await generateCode();

    const affiliate = await prisma.affiliate.create({
      data: {
        businessId: business.id,
        businessType: business.type,
        name,
        phone,
        code,
        commissionRate: Math.round(rate * 100) / 100,
        notes: typeof req.body?.notes === 'string' ? req.body.notes.slice(0, 500) : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'أُضيف المسوّق',
      data: {
        ...affiliate,
        link: await referralLink(business.id, business.type, code),
        stats: await statsFor(affiliate.id)
      }
    });
  } catch (error) {
    console.error('createAffiliate failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر إضافة المسوّق' });
  }
};

export const updateAffiliate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    // الشرط على النشاط ليس زائداً: بدونه يعدّل تاجرٌ مسوّق منافسه
    const existing = await prisma.affiliate.findFirst({
      where: { id: req.params.id, businessId: business.id, businessType: business.type },
      select: { id: true }
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'المسوّق غير موجود' });
      return;
    }

    const data: any = {};
    if (typeof req.body?.name === 'string' && req.body.name.trim()) data.name = req.body.name.trim().slice(0, 120);
    if (typeof req.body?.phone === 'string') data.phone = req.body.phone.trim().slice(0, 30) || null;
    if (typeof req.body?.isActive === 'boolean') data.isActive = req.body.isActive;

    if (req.body?.commissionRate !== undefined) {
      const rate = Number(req.body.commissionRate);
      if (!Number.isFinite(rate) || rate <= 0 || rate > 50) {
        res.status(400).json({ success: false, error: 'نسبة العمولة يجب أن تكون بين 1 و 50' });
        return;
      }
      // تسري على ما يأتي لا على ما مضى: الإحالات تحمل نسختها من النسبة
      data.commissionRate = Math.round(rate * 100) / 100;
    }

    const updated = await prisma.affiliate.update({ where: { id: existing.id }, data });
    res.json({ success: true, message: 'حُدِّث المسوّق', data: updated });
  } catch (error) {
    console.error('updateAffiliate failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تحديث المسوّق' });
  }
};

// ==================== الإحالات والدفع ====================

export const getReferrals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const referrals = await prisma.affiliateReferral.findMany({
      where: {
        affiliateId: req.params.id,
        affiliate: { businessId: business.id, businessType: business.type }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, baseAmount: true, commission: true, commissionRate: true,
        status: true, createdAt: true, paidAt: true,
        order: { select: { orderNumber: true, total: true, status: true } }
      }
    });

    res.json({ success: true, data: referrals });
  } catch (error) {
    console.error('getReferrals failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب الإحالات' });
  }
};

/**
 * تسجيل دفع العمولات المستحقّة.
 *
 * **`approved` وحدها تُدفع.** المعلّقة طلبٌ لم يكتمل، والملغاة سقطت —
 * ودفعُ أيّهما مالٌ يخرج بلا مقابل.
 */
export const markPaid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const affiliate = await prisma.affiliate.findFirst({
      where: { id: req.params.id, businessId: business.id, businessType: business.type },
      select: { id: true, name: true }
    });
    if (!affiliate) {
      res.status(404).json({ success: false, error: 'المسوّق غير موجود' });
      return;
    }

    const due = await prisma.affiliateReferral.aggregate({
      where: { affiliateId: affiliate.id, status: 'approved' },
      _sum: { commission: true },
      _count: { _all: true }
    });

    if (due._count._all === 0) {
      res.status(400).json({ success: false, error: 'لا عمولات مستحقّة للدفع' });
      return;
    }

    await prisma.affiliateReferral.updateMany({
      where: { affiliateId: affiliate.id, status: 'approved' },
      data: { status: 'paid', paidAt: new Date() }
    });

    res.json({
      success: true,
      message: `سُجّل دفع ${due._count._all} عمولة لـ${affiliate.name}`,
      data: { count: due._count._all, amount: Math.round((due._sum.commission || 0) * 100) / 100 }
    });
  } catch (error) {
    console.error('markPaid failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تسجيل الدفع' });
  }
};

// ==================== تتبّع الزيارة (عام) ====================

/**
 * يُنادى من الواجهة عند وصول زائر برابط إحالة.
 *
 * بلا مصادقة — الزائر ليس مسجّلاً. ويردّ دائماً بنجاح: عدّاد زيارات لا
 * يستحقّ أن يُظهر خطأً لزبونٍ يتصفّح.
 */
export const trackVisit = async (req: AuthRequest, res: Response): Promise<void> => {
  await trackClick(String(req.body?.code || ''));
  res.json({ success: true });
};

export default {
  listAffiliates,
  createAffiliate,
  updateAffiliate,
  getReferrals,
  markPaid,
  trackVisit
};
