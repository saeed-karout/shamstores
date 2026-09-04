// backend/src/services/planPricing.service.ts
//
// تسعير الاشتراكات.
//
// **`Plan.price` بالدولار وحدة حساب، لا سعراً يُحصَّل بالدولار.**
//
// السبب: الليرة تنزلق، والاشتراك التزام شهري متكرر. لو خزّنّا السعر بالليرة
// لتآكل الإيراد بين شهر وآخر بلا أن ينتبه أحد، ولاضطررت إلى تعديل كل خطة
// يدوياً مع كل تحرّك. تخزينه بالدولار يجعل القيمة ثابتة، والعرض بالليرة
// يجري عند القراءة بسعر الصرف الموحّد الذي يضبطه السوبر أدمن.
//
// التاجر يرى سعراً بالليرة ويدفع بالليرة. الدولار لا يظهر له إطلاقاً ما لم
// يختر عرض واجهته به.

import { getUsdRate } from './currency.service';

/** العملة التي تُقاس بها أسعار الخطط داخلياً */
export const PLAN_PRICE_CURRENCY = 'USD';

export interface PlanPriceView {
  /** القيمة المخزّنة — دولار */
  amountUsd: number;
  /** ما يُعرض للتاجر — ليرة سورية، أو null إن لم يُضبط سعر صرف */
  amountSyp: number | null;
  /** سعر الصرف المستخدم في هذا الحساب، للشفافية */
  usdRate: number | null;
  /** خطة مجانية — لا تحتاج سعر صرف لعرضها */
  isFree: boolean;
}

/**
 * تقريب سعر الاشتراك إلى رقم يقوله التاجر بلا تردّد.
 *
 * «١٢٧٬٤٣٨ ل.س» رقم يوحي بآلة حاسبة لا بسعر. نقرّبه إلى أقرب ألف تحت
 * مئة ألف، وإلى أقرب خمسة آلاف فوقها — فيبقى قريباً من القيمة الحقيقية
 * ويُقرأ كسعر مقصود.
 */
export const roundSypPrice = (amount: number): number => {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const step = amount >= 100_000 ? 5_000 : 1_000;
  return Math.round(amount / step) * step;
};

/** يحوّل سعر خطة واحدة إلى ما يُعرض للتاجر. */
export const buildPlanPrice = (priceUsd: number, usdRate: number | null): PlanPriceView => {
  const amountUsd = Number.isFinite(priceUsd) ? priceUsd : 0;

  if (amountUsd <= 0) {
    return { amountUsd: 0, amountSyp: 0, usdRate, isFree: true };
  }

  return {
    amountUsd,
    // بلا سعر صرف لا نخترع رقماً بالليرة — الواجهة تعرض «تواصل معنا» بدله
    amountSyp: usdRate ? roundSypPrice(amountUsd * usdRate) : null,
    usdRate,
    isFree: false
  };
};

/** يُلحق عرض السعر بقائمة خطط قادمة من قاعدة البيانات. */
export const withDisplayPrices = async <T extends { price: number }>(
  plans: T[]
): Promise<Array<T & { pricing: PlanPriceView }>> => {
  const usdRate = await getUsdRate();
  return plans.map((plan) => ({ ...plan, pricing: buildPlanPrice(plan.price, usdRate) }));
};

export default { PLAN_PRICE_CURRENCY, roundSypPrice, buildPlanPrice, withDisplayPrices };
