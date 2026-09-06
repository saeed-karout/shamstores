// backend/src/controllers/financeController.ts
//
// القسم المالي — الطلبات بأرقامها، لا عدداً ومجموعاً فقط.
//
// التاجر لا يسأل «كم طلباً؟» بل «كم ربحت، وكم عاد إليّ». وذلك يحتاج ثلاثة
// أرقام لا يملكها أي مسار قائم: التكلفة، والربح، والمرتجع.
//
// الحساب كلّه في services/finance.service.ts — هنا حدود الصلاحية والمدى.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { getOrdersFinance, BusinessType } from '../services/finance.service';

/** النشاط الذي يملكه المستخدم — لا يُقبل أي معرّف من العميل */
const getOwnedBusiness = async (
  req: AuthRequest
): Promise<{ id: string; type: BusinessType } | null> => {
  const userId = req.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, storeId: true }
  });
  if (!user) return null;

  if (user.restaurantId) return { id: user.restaurantId, type: 'restaurant' };
  if (user.storeId) return { id: user.storeId, type: 'store' };

  const restaurant = await prisma.restaurant.findFirst({ where: { userId }, select: { id: true } });
  if (restaurant) return { id: restaurant.id, type: 'restaurant' };

  const store = await prisma.store.findFirst({ where: { userId }, select: { id: true } });
  if (store) return { id: store.id, type: 'store' };

  return null;
};

/**
 * المدى الافتراضي: الشهر الجاري.
 *
 * مدىً مفتوح يعني تحميل تاريخ التاجر كلّه لحساب رقمين. والتاجر الذي يفتح
 * الصفحة يسأل عن شهره، لا عن سنته الأولى.
 */
const parseRange = (req: AuthRequest): { from: Date; to: Date } => {
  const now = new Date();

  const rawFrom = typeof req.query.from === 'string' ? new Date(req.query.from) : null;
  const rawTo = typeof req.query.to === 'string' ? new Date(req.query.to) : null;

  const from =
    rawFrom && !isNaN(rawFrom.getTime())
      ? rawFrom
      : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const to = rawTo && !isNaN(rawTo.getTime()) ? rawTo : now;

  // نهاية اليوم حين يرسل العميل تاريخاً بلا وقت، وإلا سقط طلبات اليوم نفسه
  if (rawTo && !isNaN(rawTo.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to))) {
    to.setHours(23, 59, 59, 999);
  }

  return { from, to };
};

// ==================== GET /api/finance/orders ====================

export const getFinanceOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getOwnedBusiness(req);
    if (!business) {
      res.status(404).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });
      return;
    }

    const { from, to } = parseRange(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

    const result = await getOrdersFinance(business.id, business.type, {
      from,
      to,
      includeCancelled: req.query.includeCancelled === 'true',
      onlyReturned: req.query.onlyReturned === 'true',
      skip: (page - 1) * limit,
      take: limit
    });

    res.json({
      success: true,
      data: {
        businessType: business.type,
        range: { from, to },
        summary: result.summary,
        summaryTruncated: result.summaryTruncated,
        orders: result.rows,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('خطأ في جلب التقرير المالي:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب التقرير المالي' });
  }
};

// ==================== POST /api/finance/orders/:id/return ====================

/**
 * تسجيل مرتجع.
 *
 * لا يغيّر حالة الطلب: البضاعة سُلّمت فعلاً ثم عادت، ودمج الأمرين في
 * `status` كان سيمحو أن التسليم حدث — وهو ما يميّز المرتجع عن الإلغاء.
 */
export const recordReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getOwnedBusiness(req);
    if (!business) {
      res.status(404).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });
      return;
    }

    const { id } = req.params;
    const where: any =
      business.type === 'restaurant'
        ? { id, restaurantId: business.id }
        : { id, storeId: business.id };

    const order = await prisma.order.findFirst({ where });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    const raw = req.body?.amount;
    // بلا مبلغ: الطلب كلّه مرتجع — وهي الحالة الأغلب
    const amount = raw === undefined || raw === null || raw === '' ? order.total : Number(raw);

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, error: 'مبلغ المرتجع غير صالح' });
      return;
    }
    if (amount > order.total) {
      res.status(400).json({ success: false, error: 'مبلغ المرتجع أكبر من إجمالي الطلب' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        returnedAt: new Date(),
        returnAmount: amount,
        returnReason: typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null
      }
    });

    res.json({
      success: true,
      message: 'تم تسجيل المرتجع',
      data: {
        id: updated.id,
        returnedAt: updated.returnedAt,
        returnAmount: updated.returnAmount,
        returnReason: updated.returnReason
      }
    });
  } catch (error) {
    console.error('خطأ في تسجيل المرتجع:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل المرتجع' });
  }
};

// ==================== DELETE /api/finance/orders/:id/return ====================

/** تراجعٌ عن تسجيل خاطئ — لا حذف للطلب */
export const cancelReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getOwnedBusiness(req);
    if (!business) {
      res.status(404).json({ success: false, error: 'لا يوجد مطعم أو متجر مرتبط بحسابك' });
      return;
    }

    const { id } = req.params;
    const where: any =
      business.type === 'restaurant'
        ? { id, restaurantId: business.id }
        : { id, storeId: business.id };

    const order = await prisma.order.findFirst({ where });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    await prisma.order.update({
      where: { id },
      data: { returnedAt: null, returnAmount: null, returnReason: null }
    });

    res.json({ success: true, message: 'تم إلغاء تسجيل المرتجع' });
  } catch (error) {
    console.error('خطأ في إلغاء المرتجع:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إلغاء المرتجع' });
  }
};

export default { getFinanceOrders, recordReturn, cancelReturn };
