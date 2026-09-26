// backend/src/services/aiQuota.service.ts
//
// حصص مساعد الذكاء الاصطناعي لكل نشاط.
//
// **كلّ استدعاءٍ يكلّف مالاً حقيقياً** بالدولار، والخطة المجانية لا تدرّ
// شيئاً. فالحصّة ليست قيداً تسويقياً فقط بل سقف كلفة: لا يستطيع حسابٌ
// مجانيّ واحد أن يحرق ميزانية الشهر بسكربت.
//
// **الاستيراد للجميع، والمجانية مرّة واحدة.** «متجرك جاهز من صفحتك» هو ما
// يُقنع التاجر الجديد أن المنصّة تستحقّ وقته — منعه عن المجانية يقتل الميزة
// عند من تنفعه أكثر. فعشرون صورة تكفي لبناء المتجر الأوّل، مرّةً في العمر.
// ومن دفع يستورد يومياً لأن كتالوجه يتجدّد.
//
// **والوصف للمدفوعة** (أو لمن اشترى الإضافة `ai_writer`): هو تحسينٌ لمتجرٍ
// قائم لا بابُ دخول، ويُستعمل منتجاً منتجاً — فيتراكم استهلاكه.

import prisma from './prisma';
import { businessHasEntitlement, BusinessType } from './entitlement.service';

export type AiKind = 'import' | 'describe';

/** الأرقام في مكانٍ واحد — تُعرض في الواجهة وجدول المقارنة كما هي */
export const AI_LIMITS = {
  /** صور يحلّلها الاستيراد: مرّة واحدة للمجانية */
  importFreeLifetime: 20,
  /** صور يحلّلها الاستيراد يومياً للخطط المدفوعة */
  importPaidDaily: 100,
  /** أوصاف يكتبها المساعد يومياً للخطط المدفوعة */
  describePaidDaily: 100
} as const;

/** رمز الإضافة التي تفتح كاتب الوصف لخطةٍ لا تشمله */
export const AI_WRITER_FEATURE = 'ai_writer';

export interface QuotaState {
  allowed: boolean;
  /** lifetime: مرّة واحدة — day: تتجدّد منتصف الليل بتوقيت الخادم */
  period: 'lifetime' | 'day';
  limit: number;
  used: number;
  remaining: number;
  /** لماذا مُنع — لتعرض الواجهة الترقية لا رسالة خطأ */
  reason?: 'plan' | 'quota';
}

export interface BusinessPlanInfo {
  id: string;
  type: BusinessType;
  name: string | null;
  isPaid: boolean;
  maxItems: number | null;
}

/** النشاط ومدى خطّته — الاستيراد يحتاج حدّ المنتجات، والحصّة تحتاج «مدفوعة؟» */
export const loadBusinessPlan = async (type: BusinessType, id: string): Promise<BusinessPlanInfo | null> => {
  const planSelect = { select: { name: true, slug: true, price: true, maxMenuItems: true, maxProducts: true } };
  const business =
    type === 'restaurant'
      ? await prisma.restaurant.findUnique({ where: { id }, select: { id: true, name: true, plan: planSelect } })
      : await prisma.store.findUnique({ where: { id }, select: { id: true, name: true, plan: planSelect } });
  if (!business) return null;

  const plan: any = (business as any).plan;
  // القاعدة نفسها في checkPlan.isFreePlan: السعر صفر أو اسم «free»
  const isPaid = !!plan && (plan.price || 0) > 0 && plan.slug !== 'free' && plan.name !== 'free';
  const maxItems = plan ? (type === 'restaurant' ? plan.maxMenuItems : plan.maxProducts) ?? null : null;

  return { id: business.id, type, name: (business as any).name ?? null, isPaid, maxItems };
};

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const sumUnits = async (business: BusinessPlanInfo, kind: AiKind, since?: Date): Promise<number> => {
  const result = await prisma.aiUsage.aggregate({
    _sum: { units: true },
    where: {
      businessType: business.type,
      businessId: business.id,
      kind,
      ...(since ? { createdAt: { gte: since } } : {})
    }
  });
  return result._sum.units ?? 0;
};

const state = (period: QuotaState['period'], limit: number, used: number, planAllowed = true): QuotaState => {
  const remaining = Math.max(0, limit - used);
  if (!planAllowed) return { allowed: false, period, limit, used, remaining: 0, reason: 'plan' };
  return { allowed: remaining > 0, period, limit, used, remaining, ...(remaining > 0 ? {} : { reason: 'quota' as const }) };
};

export const getImportQuota = async (business: BusinessPlanInfo): Promise<QuotaState> => {
  if (business.isPaid) {
    return state('day', AI_LIMITS.importPaidDaily, await sumUnits(business, 'import', startOfToday()));
  }
  return state('lifetime', AI_LIMITS.importFreeLifetime, await sumUnits(business, 'import'));
};

export const getDescribeQuota = async (business: BusinessPlanInfo): Promise<QuotaState> => {
  const entitled =
    business.isPaid || (await businessHasEntitlement(business.id, business.type, AI_WRITER_FEATURE));
  const used = entitled ? await sumUnits(business, 'describe', startOfToday()) : 0;
  return state('day', AI_LIMITS.describePaidDaily, used, entitled);
};

/**
 * يسجّل الاستهلاك **بعد** نجاح الاستدعاء.
 *
 * التسجيل قبله يعني أن صورةً فشل تحليلها لمهلةٍ أو عطلٍ عندنا تأكل من
 * حصّة التاجر المجانية التي لا تتجدّد — فيدفع ثمن خطئنا.
 */
export const recordAiUsage = async (
  business: BusinessPlanInfo,
  kind: AiKind,
  units: number,
  extra: { userId?: string | null; inputTokens?: number; outputTokens?: number } = {}
): Promise<void> => {
  try {
    await prisma.aiUsage.create({
      data: {
        businessType: business.type,
        businessId: business.id,
        kind,
        units,
        userId: extra.userId ?? null,
        inputTokens: extra.inputTokens ?? null,
        outputTokens: extra.outputTokens ?? null
      }
    });
  } catch (error) {
    // فشل التسجيل لا يُسقط ردّاً دفعنا ثمنه — يُسجَّل للمطوّر فقط
    console.error('[ai] تعذّر تسجيل الاستهلاك:', error);
  }
};

export default { AI_LIMITS, AI_WRITER_FEATURE, loadBusinessPlan, getImportQuota, getDescribeQuota, recordAiUsage };
