// frontend/src/utils/planPrice.ts
//
// سعر الخطة كما يراه التاجر.
//
// `plan.price` بالدولار **وحدةَ حساب** (`backend/src/services/planPricing.service.ts`)،
// والخادم يرفق `pricing.amountSyp` محسوباً بسعر الصرف الموحّد. كانت صفحات
// الخطط تعرض الرقم الدولاريّ ملصقاً به «ر.س» — عملةٌ خاطئة ورقمٌ خاطئ معاً.

import { formatPrice } from './currency';

interface PricedPlan {
  price: number;
  pricing?: { amountUsd?: number; amountSyp?: number | null } | null;
}

/** تقريبٌ كالخادم: لأقرب ألف تحت المئة ألف، ولأقرب خمسة آلاف فوقها */
const roundSyp = (amount: number) => {
  const step = amount >= 100_000 ? 5_000 : 1_000;
  return Math.round(amount / step) * step;
};

/**
 * نصّ السعر بالليرة لمبلغٍ دولاريّ من هذه الخطة (سعر شهرٍ أو مجموع أشهر).
 * بلا سعر صرفٍ مضبوط يُعرض بالدولار صراحةً بدل رقمٍ مخترَع.
 */
export const planPriceText = (plan: PricedPlan, usd: number = plan.price): string => {
  if (!usd || usd <= 0) return 'مجاناً';
  const p = plan.pricing;
  if (p?.amountSyp && p.amountUsd) return formatPrice(roundSyp((usd * p.amountSyp) / p.amountUsd));
  return `$${Math.round(usd * 100) / 100}`;
};
