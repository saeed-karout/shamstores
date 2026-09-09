// backend/src/services/shipping.service.ts
//
// حساب أجرة التوصيل أو الشحن، وقرارُ من يُسلّم.
//
// **الحساب على الخادم لا في المتصفّح.** الأجرة تدخل في مبلغ الطلب، وحسابُها
// في الواجهة يعني أن زبوناً يعدّل الرقم في أدوات المطوّر فيدفع صفراً. ما
// يُرسَل من الواجهة اختيارُ محافظةٍ فقط؛ والباقي يُحسَب هنا.

import prisma from './prisma';
import { GOVERNORATES, isGovernorate, DeliveryMode } from '../config/syria';

export type BusinessType = 'restaurant' | 'store';

export interface ZoneInput {
  governorate: string;
  fee: number;
  freeOverAmount?: number | null;
  estimatedDays?: number | null;
  deliveryMode: DeliveryMode;
  isActive: boolean;
}

export interface ZoneRow extends ZoneInput {
  name: string;
  /** الاسم الإنجليزي — موجودٌ في `config/syria.ts` وكان يُسقَط هنا، فتظهر
   *  «دمشق» داخل سلّةٍ إنجليزية بالكامل */
  nameEn: string;
  configured: boolean;
}

/**
 * كل المحافظات ومعها ما ضبطه التاجر.
 *
 * **الأربع عشرة كلّها لا المضبوطة وحدها:** شاشةٌ تعرض ما ضُبط فقط تترك
 * التاجر لا يعرف ما نسيه — والمنسيّ محافظةٌ لا يستطيع الزبون الطلب إليها.
 */
export const listZones = async (
  businessId: string,
  businessType: BusinessType
): Promise<ZoneRow[]> => {
  const saved = await prisma.shippingZone.findMany({ where: { businessId, businessType } });
  const byCode = new Map(saved.map((z) => [z.governorate, z]));

  return GOVERNORATES.map((g) => {
    const row = byCode.get(g.code);
    return {
      governorate: g.code,
      name: g.name,
      nameEn: g.nameEn,
      fee: row ? Number(row.fee) : 0,
      freeOverAmount: row?.freeOverAmount ?? null,
      estimatedDays: row?.estimatedDays ?? null,
      deliveryMode: (row?.deliveryMode === 'driver' ? 'driver' : 'shipping') as DeliveryMode,
      isActive: row ? row.isActive : false,
      configured: Boolean(row)
    };
  });
};

/** المناطق المفعّلة وحدها — هذه ما يراه الزبون عند الدفع */
export const listActiveZones = async (businessId: string, businessType: BusinessType) => {
  const rows = await listZones(businessId, businessType);
  return rows.filter((z) => z.isActive);
};

const clampNumber = (value: unknown, min: number, max: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

/**
 * يحفظ المناطق دفعةً واحدة.
 *
 * **دفعةً لا صفّاً صفّاً:** التاجر يضبط أربع عشرة محافظة في جلسةٍ واحدة،
 * وحفظُ كلٍّ على حدة يعني أربعة عشر نداءً وحالةً وسطى إن انقطع بينها.
 */
export const saveZones = async (
  businessId: string,
  businessType: BusinessType,
  incoming: unknown
): Promise<ZoneRow[]> => {
  const rows = Array.isArray(incoming) ? incoming : [];

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const zone = raw as Record<string, unknown>;
    const code = String(zone.governorate || '');
    if (!isGovernorate(code)) continue;

    const fee = clampNumber(zone.fee, 0, 10_000_000);
    const isActive = zone.isActive === true;
    const deliveryMode = zone.deliveryMode === 'driver' ? 'driver' : 'shipping';

    // الصفر يعني «لا حدّ» لا «كل شيء مجاني»: تاجرٌ يترك الحقل فارغاً
    // يقصد ألّا يوجد شحن مجاني، ولو خُزّن صفراً لصار كل طلبٍ مجانياً
    const rawFree = zone.freeOverAmount;
    const freeOverAmount =
      rawFree === null || rawFree === undefined || rawFree === '' || Number(rawFree) <= 0
        ? null
        : clampNumber(rawFree, 1, 10_000_000);

    const rawDays = zone.estimatedDays;
    const estimatedDays =
      rawDays === null || rawDays === undefined || rawDays === '' || Number(rawDays) <= 0
        ? null
        : Math.round(clampNumber(rawDays, 1, 60));

    await prisma.shippingZone.upsert({
      where: {
        businessId_businessType_governorate: { businessId, businessType, governorate: code }
      },
      update: { fee, freeOverAmount, estimatedDays, deliveryMode, isActive },
      create: {
        businessId,
        businessType,
        governorate: code,
        fee,
        freeOverAmount,
        estimatedDays,
        deliveryMode,
        isActive
      }
    });
  }

  return listZones(businessId, businessType);
};

export interface QuoteResult {
  ok: boolean;
  error?: string;
  fee: number;
  deliveryMode: DeliveryMode;
  estimatedDays: number | null;
  freeApplied: boolean;
}

/**
 * أجرة محافظةٍ لطلبٍ بمبلغٍ معيّن.
 *
 * **المبلغ المقارَن هو مجموع الأصناف بعد الخصم — لا الإجمالي.** لو قُورن
 * بالإجمالي لدخلت الأجرة في حساب نفسها: طلبٌ بـ٩٥ ألفاً وأجرة ١٠ يصير
 * ١٠٥ فيتجاوز حدّ المئة، فيصير مجانياً، فيعود ٩٥ — حلقةٌ لا قرار فيها.
 */
export const quote = async (
  businessId: string,
  businessType: BusinessType,
  governorate: string,
  itemsSubtotal: number
): Promise<QuoteResult> => {
  const fallback: QuoteResult = {
    ok: false,
    fee: 0,
    deliveryMode: 'shipping',
    estimatedDays: null,
    freeApplied: false
  };

  if (!isGovernorate(governorate)) {
    return { ...fallback, error: 'المحافظة غير معروفة' };
  }

  const row = await prisma.shippingZone.findUnique({
    where: {
      businessId_businessType_governorate: { businessId, businessType, governorate }
    }
  });

  // **غير المضبوطة تُرفض ولا تُسعَّر بصفر:** الصفر يعني توصيلاً مجانياً إلى
  // محافظةٍ لا يخدمها التاجر — فيصله طلبٌ لا يستطيع تسليمه
  if (!row || !row.isActive) {
    return { ...fallback, error: 'المتجر لا يوصّل إلى هذه المحافظة' };
  }

  const threshold = row.freeOverAmount;
  const freeApplied = threshold !== null && threshold !== undefined && itemsSubtotal >= Number(threshold);

  return {
    ok: true,
    fee: freeApplied ? 0 : Number(row.fee) || 0,
    deliveryMode: (row.deliveryMode === 'driver' ? 'driver' : 'shipping') as DeliveryMode,
    estimatedDays: row.estimatedDays ?? null,
    freeApplied
  };
};

export default { listZones, listActiveZones, saveZones, quote };
