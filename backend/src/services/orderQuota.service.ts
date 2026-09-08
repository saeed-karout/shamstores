// backend/src/services/orderQuota.service.ts
//
// حصّة الطلبات الشهرية — الحدّ الذي كان مكتوباً ولا يُطبَّق.
//
// `maxOrders` موجود في جدول الخطط منذ البداية، و`PlanService.checkBusinessLimit`
// مكتوبة لفحصه — ولا تُستدعى من أي مكان. فكان الرقم واجهةً لا حكماً: خطة
// بخمسمئة طلب تقبل خمسة آلاف، وخطة بصفر تقبل كل شيء.
//
// **وحساب الاستهلاك كان تراكمياً لا شهرياً**: `getCurrentUsage` تعدّ كل طلبات
// النشاط منذ إنشائه. حدّ شهري يُقاس بعدّاد لا يُصفَّر يعني أن التاجر يبلغ
// السقف مرة واحدة ثم لا يخرج منه أبداً مهما دفع. هنا العدّ من أول الشهر
// الميلادي الجاري.
//
// ولا يُحسب إلا ما طلبه زبون فعلاً: الطلبات الملغاة لا تُحمّل على الحصّة —
// إلغاء طلب خطأً لا يجوز أن يستهلك من رصيد التاجر.

import prisma from './prisma';
import { OrderStatus } from '@prisma/client';

export type BusinessType = 'restaurant' | 'store';

/**
 * حالات لا تُحمَّل على الحصّة.
 *
 * ⚠️ `Order.status` **enum** في Prisma لا نصّ حر. قيمة خارج
 * `enum OrderStatus` تُسقط الاستعلام كله بخطأ تحقّق — لا تُتجاهَل بصمت.
 * وهذا ما حدث: `'rejected'` لا وجود له في التعداد، فكانت بطاقة الخطة
 * تردّ 500 لكل تاجر. أي إضافة هنا تُقابَل بعضو في التعداد أولاً.
 */
const UNCOUNTED_STATUSES: OrderStatus[] = ['cancelled'];

export interface OrderQuota {
  /** سقف الشهر — `null` يعني بلا حدّ */
  limit: number | null;
  used: number;
  remaining: number | null;
  /** متى يُصفَّر العدّاد */
  resetsAt: string;
  planName: string;
  /** بلغ السقف؟ */
  exceeded: boolean;
}

/** ما يُعدّ «بلا حدّ» — الخطة العليا تضع رقماً كبيراً لا لانهاية */
const UNLIMITED_THRESHOLD = 100000;

const startOfMonth = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const startOfNextMonth = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
};

const loadPlan = async (businessId: string, businessType: BusinessType) => {
  const business =
    businessType === 'restaurant'
      ? await prisma.restaurant.findUnique({ where: { id: businessId }, select: { plan: true } })
      : await prisma.store.findUnique({ where: { id: businessId }, select: { plan: true } });
  return business?.plan || null;
};

/** عدد طلبات الشهر الجاري المحمّلة على الحصّة */
export const countMonthlyOrders = async (
  businessId: string,
  businessType: BusinessType
): Promise<number> =>
  prisma.order.count({
    where: {
      [businessType === 'restaurant' ? 'restaurantId' : 'storeId']: businessId,
      createdAt: { gte: startOfMonth() },
      status: { notIn: UNCOUNTED_STATUSES },
      // بيع الكاشير خارج الحصّة: هو إضافة مدفوعة وحدها، وخصمُه من حصّة
      // الطلبات الإلكترونية تحصيلٌ مرّتين. ومحلٌّ يبيع مئتي بيعة يومياً
      // كان سيستهلك أي خطة في يومٍ واحد فيصير الكاشير غير قابل للاستعمال.
      orderSource: { not: 'pos' }
    } as any
  });

export const getOrderQuota = async (
  businessId: string,
  businessType: BusinessType
): Promise<OrderQuota> => {
  const plan = await loadPlan(businessId, businessType);
  const used = await countMonthlyOrders(businessId, businessType);

  const rawLimit = plan?.maxOrders ?? 0;
  const limit = rawLimit >= UNLIMITED_THRESHOLD ? null : rawLimit;

  return {
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    resetsAt: startOfNextMonth().toISOString(),
    planName: plan?.name || 'free',
    exceeded: limit !== null && used >= limit
  };
};

export interface QuotaCheck {
  allowed: boolean;
  error?: string;
  quota?: OrderQuota;
}

/**
 * هل يُسمح بطلب جديد الآن؟
 *
 * الفشل يسمح: عطل في قراءة الخطة يجب ألّا يمنع زبوناً من الشراء. خسارة
 * طلب أفدح من تجاوز الحصّة بطلب.
 */
export const canAcceptOrder = async (
  businessId: string,
  businessType: BusinessType
): Promise<QuotaCheck> => {
  try {
    const quota = await getOrderQuota(businessId, businessType);
    if (!quota.exceeded) return { allowed: true, quota };

    return {
      allowed: false,
      quota,
      // الرسالة يقرأها **الزبون** لا التاجر: لا تلمه ولا تكشف خطة المتجر
      error:
        'هذا المتجر لا يستقبل طلبات جديدة حالياً. تواصل معه مباشرةً عبر الهاتف أو واتساب.'
    };
  } catch (error) {
    console.error('تعذّر فحص حصّة الطلبات:', error);
    return { allowed: true };
  }
};

export default { getOrderQuota, canAcceptOrder, countMonthlyOrders };
