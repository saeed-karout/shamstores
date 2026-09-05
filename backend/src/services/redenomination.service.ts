// backend/src/services/redenomination.service.ts
//
// إعادة تقويم الليرة السورية — حذف صفرين.
//
// كل سعر مخزَّن بالعملة القديمة صار أكبر بمئة ضعف. وجبة سُجّلت 50,000 يجب
// أن تصير 500.
//
// **ثلاثة تمييزات تجعل القسمة العمياء كارثية:**
//
// 1. أسعار الخطط والاشتراكات والميزات **بالدولار** لا بالليرة (راجع
//    planPricing.service). قسمتها تُسقط اشتراك 4$ إلى 4 سنتات.
// 2. خصم الكوبون قد يكون **نسبة مئوية**: قسمة 20% تجعله 0.2%.
// 3. سعر الصرف نفسه يُقسَم — 12,987 ليرة قديمة للدولار تصير 130 جديدة.
//
// والعملية **لا تُعكس**: تنفيذها مرتين يقسم على عشرة آلاف. لذلك حارس دائم
// في إعدادات المنصة، ومعاينة إلزامية قبل أي كتابة.

import prisma from './prisma';
import SettingService from './setting.service';

/** عدد الأصفار المحذوفة */
export const DIVISOR = 100;

/** مفتاح الحارس — وجوده يعني أن الترحيل نُفِّذ */
export const APPLIED_KEY = 'syp_redenomination_applied_at';

export interface TableChange {
  table: string;
  field: string;
  rows: number;
  sampleBefore: number | null;
  sampleAfter: number | null;
}

export interface RedenominationPlan {
  alreadyApplied: string | null;
  changes: TableChange[];
  totalRows: number;
  /** حقول استُثنيت عمداً مع السبب */
  skipped: Array<{ field: string; reason: string }>;
}

/** الحقول التي تُقسَم — بالليرة قطعاً */
const SYP_FIELDS: Array<{ model: string; fields: string[] }> = [
  { model: 'menuItem', fields: ['price', 'originalPrice'] },
  { model: 'product', fields: ['price', 'originalPrice', 'cost'] },
  { model: 'order', fields: ['total', 'subtotal', 'discountAmount', 'deliveryFee'] },
  { model: 'orderItem', fields: ['price'] },
  { model: 'driver', fields: ['baseSalary', 'totalEarnings'] },
  { model: 'driverDelivery', fields: ['earnings'] },
  { model: 'driverEarning', fields: ['amount'] },
  { model: 'advertisement', fields: ['price'] },
  { model: 'coupon', fields: ['minOrderAmount'] }
];

/** حقول لا تُمَسّ، ولكلٍّ سبب صريح */
const SKIPPED = [
  { field: 'Plan.price', reason: 'بالدولار وحدة حساب — راجع planPricing.service' },
  { field: 'Subscription.price / totalPaid / discount', reason: 'منسوخة من سعر الخطة بالدولار' },
  { field: 'Feature.price', reason: 'تُسعَّر بالدولار كالخطط' },
  { field: 'Coupon.discountValue', reason: 'قد يكون نسبة مئوية — يُعالَج بشرط النوع' },
  { field: 'Driver.totalDeliveries', reason: 'عدّاد لا مبلغ' }
];

export const getAppliedAt = async (): Promise<string | null> => {
  const value = await SettingService.getString(APPLIED_KEY, '');
  return value || null;
};

/** يبني معاينة بلا أي كتابة. */
export const planRedenomination = async (): Promise<RedenominationPlan> => {
  const alreadyApplied = await getAppliedAt();
  const changes: TableChange[] = [];
  let totalRows = 0;

  for (const { model, fields } of SYP_FIELDS) {
    const delegate = (prisma as any)[model];
    if (!delegate?.count) continue;

    for (const field of fields) {
      const rows = await delegate.count({ where: { [field]: { gt: 0 } } });
      if (rows === 0) continue;

      const sample = await delegate.findFirst({
        where: { [field]: { gt: 0 } },
        select: { [field]: true },
        orderBy: { [field]: 'desc' }
      });
      const before = sample?.[field] ?? null;

      changes.push({
        table: model,
        field,
        rows,
        sampleBefore: before,
        sampleAfter: before === null ? null : Math.round((before / DIVISOR) * 100) / 100
      });
      totalRows += rows;
    }
  }

  // الكوبونات ذات الخصم الثابت وحدها
  const fixedCoupons = await prisma.coupon.count({
    where: { discountType: { not: 'percentage' }, discountValue: { gt: 0 } }
  });
  if (fixedCoupons > 0) {
    changes.push({
      table: 'coupon',
      field: 'discountValue (الثابت فقط)',
      rows: fixedCoupons,
      sampleBefore: null,
      sampleAfter: null
    });
    totalRows += fixedCoupons;
  }

  return { alreadyApplied, changes, totalRows, skipped: SKIPPED };
};

export interface ApplyResult {
  ok: boolean;
  error?: string;
  updated?: number;
  newUsdRate?: number | null;
}

/**
 * ينفّذ الترحيل. يرفض التكرار عبر الحارس.
 *
 * كل جدول في معاملة مستقلة لا معاملة واحدة عملاقة: خطة قاعدة البيانات
 * المجانية بعشرة اتصالات ومهلة قصيرة، ومعاملة تمسّ كل الصفوف دفعةً واحدة
 * تُرجَّح أن تنتهي مهلتها فتترك الترحيل نصفه.
 */
export const applyRedenomination = async (force = false): Promise<ApplyResult> => {
  const appliedAt = await getAppliedAt();
  if (appliedAt && !force) {
    return {
      ok: false,
      error: `الترحيل نُفِّذ مسبقاً في ${appliedAt}. تنفيذه مجدداً يقسم على عشرة آلاف.`
    };
  }

  let updated = 0;

  for (const { model, fields } of SYP_FIELDS) {
    const delegate = (prisma as any)[model];
    if (!delegate?.updateMany) continue;

    for (const field of fields) {
      const result = await delegate.updateMany({
        where: { [field]: { gt: 0 } },
        data: { [field]: { divide: DIVISOR } }
      });
      updated += result.count;
    }
  }

  // الكوبون: الثابت يُقسَم، والنسبة المئوية لا
  const coupons = await prisma.coupon.updateMany({
    where: { discountType: { not: 'percentage' }, discountValue: { gt: 0 } },
    data: { discountValue: { divide: DIVISOR } }
  });
  updated += coupons.count;

  // سعر الصرف: عدد الليرات للدولار يُقسَم هو الآخر
  const oldRate = await SettingService.getNumber('usd_exchange_rate', 0);
  let newUsdRate: number | null = null;
  if (oldRate > 0) {
    newUsdRate = Math.round((oldRate / DIVISOR) * 100) / 100;
    await SettingService.setSetting('usd_exchange_rate', newUsdRate, 'number', 'payment');
  }

  await SettingService.setSetting(APPLIED_KEY, new Date().toISOString(), 'string', 'payment');

  return { ok: true, updated, newUsdRate };
};

export default { DIVISOR, APPLIED_KEY, getAppliedAt, planRedenomination, applyRedenomination };
