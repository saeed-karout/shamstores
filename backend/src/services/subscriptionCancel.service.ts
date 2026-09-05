// backend/src/services/subscriptionCancel.service.ts
//
// إلغاء اشتراك — مسار واحد يستخدمه المالك والسوبر أدمن معاً.
//
// المسار القديم كان يكتب مرتين بلا معاملة: يقلب حالة الاشتراك ثم يخفّض
// الخطة. فشل الثانية يترك اشتراكاً ملغى وخطة مدفوعة سارية، وفشل الأولى
// يترك خطة مخفَّضة واشتراكاً يبدو نشطاً. الحالتان تحتاجان تدخّلاً يدوياً
// لاكتشافهما.
//
// ولم يكن للسوبر أدمن مسار إلغاء إطلاقاً: قبول خاطئ لا رجعة عنه.

import prisma from './prisma';
import { notifyUser } from './notification.service';

/** الخطة المجانية — وجهة التخفيض حين لا اشتراك آخر قائم */
export const FREE_PLAN_ID = '11111111-1111-1111-1111-111111111111';

export interface CancelResult {
  ok: boolean;
  error?: string;
  subscriptionId?: string;
  /** الخطة التي عاد إليها النشاط */
  revertedToPlanId?: string;
}

/**
 * الخطة التي يعود إليها النشاط بعد الإلغاء.
 *
 * لا نخفّض إلى المجانية أعمى: نشاط له اشتراك آخر قائم يعود إليه. التخفيض
 * الأعمى كان سيُسقط تاجراً يملك اشتراكين إلى المجانية بإلغاء أحدهما.
 */
const resolveTargetPlan = async (
  businessType: string,
  businessId: string,
  excludeSubscriptionId: string
): Promise<string> => {
  const other = await prisma.subscription.findFirst({
    where: {
      businessType,
      businessId,
      status: 'active',
      id: { not: excludeSubscriptionId },
      endDate: { gt: new Date() }
    },
    orderBy: { endDate: 'desc' }
  });

  return other?.planId || FREE_PLAN_ID;
};

/** يجد مالك النشاط لإبلاغه — تغيير خطته قرار يخصّه */
const findBusinessOwner = async (businessType: string, businessId: string): Promise<string | null> => {
  if (businessType === 'restaurant') {
    const row = await prisma.restaurant.findUnique({ where: { id: businessId }, select: { userId: true } });
    return row?.userId || null;
  }
  const row = await prisma.store.findUnique({ where: { id: businessId }, select: { userId: true } });
  return row?.userId || null;
};

export interface CancelOptions {
  /** من نفّذ الإلغاء — يُسجَّل في الملاحظات */
  actorLabel: string;
  reason?: string;
  /** حين يُمرَّر، يُرفض الإلغاء إن لم يكن الاشتراك لهذا النشاط */
  restrictToBusiness?: { type: string; id: string };
}

export const cancelSubscription = async (
  subscriptionId: string,
  options: CancelOptions
): Promise<CancelResult> => {
  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });

  if (!subscription) {
    return { ok: false, error: 'الاشتراك غير موجود' };
  }

  // المالك يلغي اشتراكه وحده؛ السوبر أدمن بلا قيد
  if (
    options.restrictToBusiness &&
    (subscription.businessType !== options.restrictToBusiness.type ||
      subscription.businessId !== options.restrictToBusiness.id)
  ) {
    return { ok: false, error: 'الاشتراك غير موجود' };
  }

  if (subscription.status !== 'active') {
    return { ok: false, error: `الاشتراك ${subscription.status === 'cancelled' ? 'ملغى مسبقاً' : 'غير نشط'}` };
  }

  const targetPlanId = await resolveTargetPlan(
    subscription.businessType,
    subscription.businessId,
    subscription.id
  );

  const note = [
    subscription.notes,
    `أُلغي بواسطة ${options.actorLabel} في ${new Date().toISOString()}`,
    options.reason ? `السبب: ${options.reason}` : null
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 900);

  // الكتابتان معاً أو لا شيء
  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled', notes: note }
    }),
    subscription.businessType === 'restaurant'
      ? prisma.restaurant.update({ where: { id: subscription.businessId }, data: { planId: targetPlanId } })
      : prisma.store.update({ where: { id: subscription.businessId }, data: { planId: targetPlanId } })
  ]);

  // خارج المعاملة عمداً: فشل الإشعار لا يجوز أن يتراجع عن إلغاء تمّ
  const ownerId = await findBusinessOwner(subscription.businessType, subscription.businessId);
  await notifyUser(ownerId, {
    type: 'subscription',
    event: 'subscription.cancelled',
    title: 'أُلغي اشتراكك',
    message: options.reason
      ? `خطة ${subscription.planName} أُلغيت. السبب: ${options.reason}`
      : `خطة ${subscription.planName} أُلغيت وعاد نشاطك إلى الخطة السابقة.`,
    link: '/plans',
    entityId: subscription.id
  });

  return { ok: true, subscriptionId: subscription.id, revertedToPlanId: targetPlanId };
};

export default { FREE_PLAN_ID, cancelSubscription };
