// backend/src/services/affiliate.service.ts
//
// إسناد الطلبات إلى المسوّقين، وحساب العمولة.
//
// **القاعدة التي تحكم كل ما هنا: العمولة مالٌ حقيقي.** فكل قرار يميل إلى
// جانب الحذر — تُجمَّد النسبة وقت الإسناد، ولا تُستحقّ قبل اكتمال الطلب،
// وتسقط عند الإلغاء، ولا يُسنَد الطلب مرّتين مهما تكرّر النداء.

import prisma from './prisma';

export type BusinessType = 'restaurant' | 'store';

/** أحرف بلا التباس: لا صفر ولا O، ولا واحد ولا I ولا L */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * رمزٌ يُملى بالهاتف ويُكتب بلا خطأ.
 *
 * ستّة أحرف من أبجدية بلا حروفٍ متشابهة: المسوّق يقرأ رمزه لزبونٍ على
 * الهاتف، و`0` و`O` في رمزٍ واحد تعني بيعةً تُسنَد لغيره أو لا تُسنَد أصلاً.
 */
export const generateCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    const taken = await prisma.affiliate.findUnique({ where: { code }, select: { id: true } });
    if (!taken) return code;
  }
  // الاحتمال ضئيل جداً، لكن رميةً صريحة خيرٌ من رمزٍ مكرّر يخلط عمولتين
  throw new Error('تعذّر توليد رمز فريد');
};

/** الحالات التي يُعدّ عندها الطلب مكتملاً فتُستحقّ العمولة */
const COMPLETED = ['delivered', 'served'] as const;
const CANCELLED = ['cancelled'] as const;

export interface AttributeInput {
  code: string;
  orderId: string;
  businessId: string;
  businessType: BusinessType;
  /** المشتري — لمنع المسوّق من إحالة نفسه */
  buyerUserId?: string | null;
  /** أساس العمولة: المنتجات بعد الخصم، بلا رسوم توصيل */
  baseAmount: number;
}

export interface AttributeResult {
  ok: boolean;
  reason?: string;
  commission?: number;
}

/**
 * يسند طلباً إلى مسوّق.
 *
 * **لا يرمي أبداً**: الإسناد أثرٌ جانبي لإنشاء الطلب، وفشلُه لا يجوز أن
 * يُفشل الطلب — زبونٌ يرى «تعذّر إنشاء الطلب» بسبب رمز إحالة خاطئ خسارةٌ
 * أكبر بكثير من عمولةٍ ضاعت.
 */
export const attributeOrder = async (input: AttributeInput): Promise<AttributeResult> => {
  try {
    const code = String(input.code || '').trim().toUpperCase();
    if (!code) return { ok: false, reason: 'no-code' };

    const affiliate = await prisma.affiliate.findUnique({ where: { code } });

    // الرمز يجب أن يتبع نفس النشاط: رمزُ مسوّقِ متجرٍ آخر لا يُسنَد هنا
    if (
      !affiliate ||
      !affiliate.isActive ||
      affiliate.businessId !== input.businessId ||
      affiliate.businessType !== input.businessType
    ) {
      return { ok: false, reason: 'invalid-code' };
    }

    // الإحالة الذاتية: مسوّقٌ يشتري برمزه يخصم من التاجر بلا أن يجلب زبوناً
    if (affiliate.userId && input.buyerUserId && affiliate.userId === input.buyerUserId) {
      return { ok: false, reason: 'self-referral' };
    }

    const base = Math.max(0, Number(input.baseAmount) || 0);
    if (base <= 0) return { ok: false, reason: 'zero-base' };

    // النسبة تُنسخ لا تُشار إليها: تعديلها لاحقاً لا يعيد حساب ما استُحقّ
    const rate = Number(affiliate.commissionRate) || 0;
    const commission = Math.round(base * (rate / 100) * 100) / 100;

    await prisma.affiliateReferral.create({
      data: {
        affiliateId: affiliate.id,
        orderId: input.orderId,
        baseAmount: base,
        commissionRate: rate,
        commission,
        status: 'pending'
      }
    });

    return { ok: true, commission };
  } catch (error) {
    // القيد الفريد على `orderId` يمنع الإسناد المزدوج — وبلوغه ليس عطلاً
    const code = (error as { code?: string })?.code;
    if (code === 'P2002') return { ok: false, reason: 'already-attributed' };
    console.error('attributeOrder failed:', error);
    return { ok: false, reason: 'error' };
  }
};

/**
 * يزامن حالة العمولة مع حالة الطلب.
 *
 * **العمولة لا تُستحقّ قبل اكتمال الطلب، وتسقط عند إلغائه.** بدون هذا
 * يدفع التاجر عمولةً على طلبٍ أُلغي — وهو أسرع طريق إلى إغلاق البرنامج كلّه.
 *
 * والمدفوعة لا تُمَسّ: مالٌ خرج فعلاً لا يُلغى بتغيير حالةٍ متأخّر.
 */
export const syncReferralStatus = async (
  orderId: string,
  orderStatus: string
): Promise<void> => {
  try {
    const referral = await prisma.affiliateReferral.findUnique({
      where: { orderId },
      select: { id: true, status: true }
    });
    if (!referral || referral.status === 'paid') return;

    let next: string | null = null;
    if ((COMPLETED as readonly string[]).includes(orderStatus)) next = 'approved';
    else if ((CANCELLED as readonly string[]).includes(orderStatus)) next = 'cancelled';

    if (next && next !== referral.status) {
      await prisma.affiliateReferral.update({ where: { id: referral.id }, data: { status: next } });
    }
  } catch (error) {
    console.error('syncReferralStatus failed:', error);
  }
};

/** زيارة وصلت برابط المسوّق — تقيس جهده حتى قبل أوّل بيعة */
export const trackClick = async (code: string): Promise<boolean> => {
  try {
    const result = await prisma.affiliate.updateMany({
      where: { code: String(code || '').trim().toUpperCase(), isActive: true },
      data: { clicks: { increment: 1 } }
    });
    return result.count > 0;
  } catch {
    return false;
  }
};

export interface AffiliateStats {
  orders: number;
  approved: number;
  pending: number;
  cancelled: number;
  sales: number;
  commissionEarned: number;
  commissionPaid: number;
  commissionDue: number;
}

/** إحصاءات مسوّق — تُحسب من الإحالات لا تُخزَّن، فلا تتباعد عن مصدرها */
export const statsFor = async (affiliateId: string): Promise<AffiliateStats> => {
  const rows = await prisma.affiliateReferral.findMany({
    where: { affiliateId },
    select: { status: true, baseAmount: true, commission: true }
  });

  const stats: AffiliateStats = {
    orders: rows.length,
    approved: 0,
    pending: 0,
    cancelled: 0,
    sales: 0,
    commissionEarned: 0,
    commissionPaid: 0,
    commissionDue: 0
  };

  for (const row of rows) {
    const commission = Number(row.commission) || 0;
    if (row.status === 'cancelled') {
      stats.cancelled += 1;
      continue;
    }

    stats.sales += Number(row.baseAmount) || 0;

    if (row.status === 'pending') stats.pending += 1;
    if (row.status === 'approved') {
      stats.approved += 1;
      stats.commissionEarned += commission;
      // المستحقّ = ما اكتمل ولم يُدفع. المعلّق ليس مستحقاً بعد.
      stats.commissionDue += commission;
    }
    if (row.status === 'paid') {
      stats.approved += 1;
      stats.commissionEarned += commission;
      stats.commissionPaid += commission;
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  stats.sales = round(stats.sales);
  stats.commissionEarned = round(stats.commissionEarned);
  stats.commissionPaid = round(stats.commissionPaid);
  stats.commissionDue = round(stats.commissionDue);

  return stats;
};

export default { generateCode, attributeOrder, syncReferralStatus, trackClick, statsFor };
