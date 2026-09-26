// backend/src/controllers/checkoutController.ts
//
// إضافات إتمام الطلب من جهة التاجر: الإعدادات، وتأكيد تحويل الهدية، واستلام
// العربون، وجدول الأقساط — ومن جهة الزبون: عرض التتبّع العامّ.
// الحساب كلّه في services/checkoutExtras.service.ts؛ هنا الصلاحيات والردود.

import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { getBusinessId } from '../middleware/auth';
import { emitOrderRealtimeEvent } from '../realtime/socket';
import {
  readCheckoutSettings,
  sanitizeCheckoutSettings,
  hasCheckoutEntitlement,
  GIFT_FEATURE,
  DEPOSIT_FEATURE,
  emailGiftPayer,
  publicTrackingView,
  amountDueOnDelivery,
  loadInstallments
} from '../services/checkoutExtras.service';

type Biz = { type: 'restaurant' | 'store'; id: string };

const business = (req: AuthRequest): Biz | null => {
  const own = getBusinessId(req);
  return own.type && own.id ? { type: own.type, id: own.id } : null;
};

/** طلبٌ يملكه هذا النشاط — وإلا عدّل تاجرٌ طلبات غيره بتبديل معرّف */
const ownedOrder = async (req: AuthRequest, biz: Biz): Promise<any> => {
  const order: any = await prisma.order.findFirst({
    where: { id: req.params.id, ...(biz.type === 'restaurant' ? { restaurantId: biz.id } : { storeId: biz.id }) }
  });
  if (order) order.installments = await loadInstallments(order.id);
  return order;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** بثّ التحديث للوحة ولصاحب الطلب — نفس قناة تغيّر الحالة */
const broadcast = (order: any, event: string) => {
  try {
    emitOrderRealtimeEvent({
      event,
      title: 'تحديث حالة الدفع',
      message: `تم تحديث الدفع للطلب ${order.orderNumber}`,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        isPaid: !!order.isPaid,
        total: Number(order.total),
        orderType: order.orderType,
        restaurantId: order.restaurantId || null,
        storeId: order.storeId || null,
        createdBy: order.createdBy || null,
        assignedDriverId: order.assignedDriverId || null
      }
    });
  } catch {
    /* البثّ أثرٌ جانبي */
  }
};

const extrasOf = (order: any) => ({
  id: order.id,
  inspectionAllowed: !!order.inspectionAllowed,
  isGift: !!order.isGift,
  giftPayerName: order.giftPayerName,
  giftPayerPhone: order.giftPayerPhone,
  giftPayerEmail: order.giftPayerEmail,
  giftMessage: order.giftMessage,
  giftHidePrices: !!order.giftHidePrices,
  paymentStatus: order.paymentStatus,
  paymentConfirmedAt: order.paymentConfirmedAt,
  depositAmount: order.depositAmount,
  depositPaidAt: order.depositPaidAt,
  remainingAmount: order.remainingAmount,
  isPaid: order.isPaid,
  total: order.total,
  installments: order.installments || [],
  amountDueOnDelivery: amountDueOnDelivery(order)
});

// ==================== الإعدادات ====================

export const getCheckoutSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const biz = business(req);
    if (!biz) {
      res.status(400).json({ success: false, error: 'لا يوجد نشاط مرتبط بحسابك' });
      return;
    }
    const row: any =
      biz.type === 'restaurant'
        ? await prisma.restaurant.findUnique({ where: { id: biz.id }, select: { checkoutSettings: true, whatsapp: true } as any })
        : await prisma.store.findUnique({ where: { id: biz.id }, select: { checkoutSettings: true, whatsapp: true } as any });
    const [gift, deposits] = await Promise.all([
      hasCheckoutEntitlement(biz.id, biz.type, GIFT_FEATURE),
      biz.type === 'store' ? hasCheckoutEntitlement(biz.id, biz.type, DEPOSIT_FEATURE) : Promise.resolve(false)
    ]);
    res.json({
      success: true,
      data: {
        settings: readCheckoutSettings(row?.checkoutSettings),
        entitlements: { gift, deposits },
        businessType: biz.type,
        // خطوة واتساب بلا رقم واتساب للمتجر لا تعمل — الواجهة تنبّه التاجر
        hasWhatsapp: !!row?.whatsapp
      }
    });
  } catch (error) {
    console.error('getCheckoutSettings failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب إعدادات إتمام الطلب' });
  }
};

export const updateCheckoutSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const biz = business(req);
    if (!biz) {
      res.status(400).json({ success: false, error: 'لا يوجد نشاط مرتبط بحسابك' });
      return;
    }
    const result = sanitizeCheckoutSettings(req.body?.settings ?? req.body);
    if (result.ok === false) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    // الإعداد يُحفظ ولو لم تشمله الخطة — لكنه لا يظهر للزبائن حتى الترقية
    // (publicCheckoutOptions). رفضُ الحفظ يُضيّع ما كتبه التاجر من تعليمات.
    const data: any = { checkoutSettings: result.value };
    if (biz.type === 'restaurant') await prisma.restaurant.update({ where: { id: biz.id }, data });
    else await prisma.store.update({ where: { id: biz.id }, data });
    res.json({ success: true, message: 'تم حفظ خيارات إتمام الطلب', data: result.value });
  } catch (error) {
    console.error('updateCheckoutSettings failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر حفظ الإعدادات' });
  }
};

// ==================== إضافات الطلب للتاجر ====================

export const getOrderExtras = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const biz = business(req);
    if (!biz) {
      res.status(400).json({ success: false, error: 'لا يوجد نشاط مرتبط بحسابك' });
      return;
    }
    const order = await ownedOrder(req, biz);
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    const installmentsAllowed =
      biz.type === 'store' ? await hasCheckoutEntitlement(biz.id, biz.type, DEPOSIT_FEATURE) : false;
    res.json({ success: true, data: { ...extrasOf(order), installmentsAllowed } });
  } catch (error) {
    console.error('getOrderExtras failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب تفاصيل الدفع' });
  }
};

/**
 * «تم استلام الدفعة» لطلب هدية — ينقله إلى المسار العادي.
 *
 * الحالة تبقى `pending` (قيد الانتظار) كأيّ طلبٍ جديد: التاجر يقبله ويجهّزه
 * كالمعتاد. ما يتغيّر أن الحارس في `updateOrderStatus` يرفع يده، وأن الطلب
 * صار مدفوعاً فلا يُحصَّل شيءٌ عند التسليم.
 */
export const confirmGiftPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const biz = business(req);
    if (!biz) {
      res.status(400).json({ success: false, error: 'لا يوجد نشاط مرتبط بحسابك' });
      return;
    }
    const order = await ownedOrder(req, biz);
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    if (order.paymentStatus !== 'awaiting_transfer') {
      res.status(400).json({ success: false, error: 'هذا الطلب لا ينتظر تحويلاً' });
      return;
    }
    const updated: any = await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'confirmed', paymentConfirmedAt: new Date(), isPaid: true } as any
    });
    updated.installments = await loadInstallments(updated.id);
    broadcast(updated, 'order.payment.updated');
    const emailed = await emailGiftPayer(updated.id, 'confirmed');
    res.json({ success: true, message: 'تم تأكيد استلام الدفعة', data: { ...extrasOf(updated), payerEmailed: emailed } });
  } catch (error) {
    console.error('confirmGiftPayment failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تأكيد الدفعة' });
  }
};

/** استلام العربون (شام كاش أو يداً بيد) — أو التراجع عنه إن ضُغط خطأً */
export const setDepositPaid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const biz = business(req);
    if (!biz) {
      res.status(400).json({ success: false, error: 'لا يوجد نشاط مرتبط بحسابك' });
      return;
    }
    const order = await ownedOrder(req, biz);
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    if (!(Number(order.depositAmount) > 0)) {
      res.status(400).json({ success: false, error: 'لا عربون على هذا الطلب' });
      return;
    }
    const paid = req.body?.paid !== false;
    const updated: any = await prisma.order.update({
      where: { id: order.id },
      data: {
        depositPaidAt: paid ? new Date() : null,
        paymentStatus: paid ? 'deposit_paid' : 'awaiting_deposit'
      } as any
    });
    updated.installments = await loadInstallments(updated.id);
    broadcast(updated, 'order.payment.updated');
    res.json({ success: true, message: paid ? 'تم تسجيل استلام العربون' : 'أُلغي تسجيل العربون', data: extrasOf(updated) });
  } catch (error) {
    console.error('setDepositPaid failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تحديث العربون' });
  }
};

/**
 * جدول الأقساط — يُستبدل كاملاً. المجموع يجب أن يساوي المتبقّي (أو الإجمالي
 * لطلبٍ بلا عربون): جدولٌ لا يغطّي المبلغ يعني ديناً ضائعاً لا يراه أحد.
 * قائمةٌ فارغة تحذف الجدول. ولا يُمسّ جدولٌ دُفع منه قسطٌ — التاريخ المالي
 * لا يُعاد كتابته.
 */
export const setInstallments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const biz = business(req);
    if (!biz) {
      res.status(400).json({ success: false, error: 'لا يوجد نشاط مرتبط بحسابك' });
      return;
    }
    if (biz.type !== 'store' || !(await hasCheckoutEntitlement(biz.id, biz.type, DEPOSIT_FEATURE))) {
      res.status(403).json({ success: false, error: 'الأقساط ضمن الخطط المدفوعة (النموّ فما فوق).' });
      return;
    }
    const order = await ownedOrder(req, biz);
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    if (order.status === 'cancelled') {
      res.status(400).json({ success: false, error: 'الطلب ملغى' });
      return;
    }
    if (order.isGift) {
      res.status(400).json({ success: false, error: 'طلب الهدية مدفوعٌ كاملاً مسبقاً — لا أقساط له.' });
      return;
    }
    if ((order.installments || []).some((i: any) => i.paidAt)) {
      res.status(400).json({ success: false, error: 'دُفع قسطٌ من هذا الجدول — لا يُعدَّل بعد ذلك.' });
      return;
    }

    const raw = Array.isArray(req.body?.installments) ? req.body.installments : null;
    if (!raw) {
      res.status(400).json({ success: false, error: 'جدول الأقساط مطلوب' });
      return;
    }
    if (raw.length > 24) {
      res.status(400).json({ success: false, error: 'الحدّ الأقصى 24 قسطاً' });
      return;
    }

    const rows: Array<{ dueDate: Date; amount: number }> = [];
    for (const r of raw) {
      const due = new Date(r?.dueDate);
      const amount = round2(Number(r?.amount));
      if (Number.isNaN(due.getTime())) {
        res.status(400).json({ success: false, error: 'تاريخ قسطٍ غير صالح' });
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ success: false, error: 'مبلغ كل قسط يجب أن يكون أكبر من صفر' });
        return;
      }
      rows.push({ dueDate: due, amount });
    }
    rows.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    if (rows.length > 0) {
      const target = Number(order.depositAmount) > 0 ? Number(order.remainingAmount) : Number(order.total);
      const sum = round2(rows.reduce((s, r) => s + r.amount, 0));
      // هامش ليرة واحدة لتقريب القسمة
      if (Math.abs(sum - target) > 1) {
        res.status(400).json({
          success: false,
          error: `مجموع الأقساط (${Math.round(sum).toLocaleString('en-US')}) يجب أن يساوي المبلغ المتبقّي (${Math.round(target).toLocaleString('en-US')}).`
        });
        return;
      }
    }

    await prisma.$transaction([
      prisma.orderInstallment.deleteMany({ where: { orderId: order.id } }),
      ...rows.map((r, i) =>
        prisma.orderInstallment.create({ data: { orderId: order.id, seq: i + 1, dueDate: r.dueDate, amount: r.amount } })
      )
    ]);
    const updated = await ownedOrder(req, biz);
    broadcast(updated, 'order.payment.updated');
    res.json({ success: true, message: rows.length ? 'تم حفظ جدول الأقساط' : 'حُذف جدول الأقساط', data: extrasOf(updated) });
  } catch (error) {
    console.error('setInstallments failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر حفظ جدول الأقساط' });
  }
};

/** قسطٌ مدفوع (أو التراجع). اكتمال الأقساط كلّها — والعربون إن وُجد — يجعل الطلب مدفوعاً */
export const setInstallmentPaid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const biz = business(req);
    if (!biz) {
      res.status(400).json({ success: false, error: 'لا يوجد نشاط مرتبط بحسابك' });
      return;
    }
    const order = await ownedOrder(req, biz);
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    const inst = (order.installments || []).find((i: any) => i.id === req.params.installmentId);
    if (!inst) {
      res.status(404).json({ success: false, error: 'القسط غير موجود' });
      return;
    }
    const paid = req.body?.paid !== false;
    await prisma.orderInstallment.update({ where: { id: inst.id }, data: { paidAt: paid ? new Date() : null } });

    const after = await ownedOrder(req, biz);
    // منطقيٌّ صريح: سلسلة `&&`/`||` تُعيد آخر قيمة (تاريخ الدفع) لا `true`
    const allPaid: boolean =
      after.installments.length > 0 &&
      after.installments.every((i: any) => !!i.paidAt) &&
      (!(Number(after.depositAmount) > 0) || !!after.depositPaidAt);
    let final = after;
    if (allPaid !== !!after.isPaid) {
      final = await prisma.order.update({ where: { id: after.id }, data: { isPaid: allPaid } as any });
      final.installments = after.installments;
    }
    broadcast(final, 'order.payment.updated');
    res.json({ success: true, message: paid ? 'تم تسجيل القسط مدفوعاً' : 'أُلغي تسجيل القسط', data: extrasOf(final) });
  } catch (error) {
    console.error('setInstallmentPaid failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تحديث القسط' });
  }
};

// ==================== التتبّع العامّ ====================

export const getPublicOrderTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.orderId || req.params.id || '');
    // cuid فقط — رقم الطلب القصير يُخمَّن، والمعرّف الطويل هو ما يجعل الرابط سرّاً
    if (!/^[a-z0-9]{20,40}$/i.test(id)) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    const view = await publicTrackingView(id);
    if (!view) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: view });
  } catch (error) {
    console.error('getPublicOrderTracking failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب الطلب' });
  }
};
