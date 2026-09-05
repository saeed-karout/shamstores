// backend/src/services/entitlement.service.ts
//
// مصدر واحد لسؤال «هل يملك هذا النشاط هذه الميزة؟».
//
// كان الجواب موزّعاً على مسارين لا يتحدّثان:
//   - middleware/checkPlan.ts يقرأ بوابات الخطة (plan.hasMultiLanguage ...)
//   - services/feature.service.ts يقرأ BusinessFeature المُسندة لكل نشاط
// فميزة ممنوحة كإضافة مدفوعة لا تراها بوابة الخطة، والعكس. هذه الوحدة تجمع
// المصدرين في جواب واحد.

import prisma from './prisma';

/** يوحّد صيغ الرموز: hasMultiLanguage / multi-language / multi_language → multi_language */
export const normalizeFeatureCode = (code: string): string => {
  const normalized = code
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
  return normalized.startsWith('has_') ? normalized.slice(4) : normalized;
};

/** رموز الميزات التي تمنحها خطة ما، من البوابات المنطقية ومن حقل features الحر. */
export const getPlanFeatureCodes = (plan: any): string[] => {
  const features: string[] = [];

  if (plan?.hasWhatsapp) features.push('whatsapp');
  if (plan?.hasOnlineOrders) features.push('online_orders');
  if (plan?.hasCustomDomain) features.push('custom_domain');
  if (plan?.hasAnalytics) features.push('analytics');
  if (plan?.hasTableQr) features.push('table_qr');
  if (plan?.hasMultiLanguage) features.push('multi_language');
  if (plan?.hasPromotions) features.push('promotions');
  if (plan?.hasCoupons) features.push('coupons');
  // إخفاء شارة المنصة — تمنحه الخطط الأعلى، ويُشترى مفرداً في الأدنى
  if (plan?.hasBrandingRemoval) features.push('branding_removal');

  if (plan?.features) {
    try {
      let parsed = plan.features;
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (Array.isArray(parsed)) features.push(...parsed.map((f) => String(f)));
    } catch (error) {
      console.error('Error parsing plan features:', error);
    }
  }

  return features;
};

export type BusinessType = 'restaurant' | 'store';

/**
 * هل يملك النشاط هذه الميزة — من خطته أو كإضافة مُسندة إليه؟
 *
 * الإسناد المباشر يُفحص أولاً لأنه قد يكون منحاً استثنائياً أو شراءً منفصلاً،
 * ولأنه يحمل تاريخ انتهاء. ثم بوابات الخطة.
 */
export const businessHasEntitlement = async (
  businessId: string,
  businessType: BusinessType,
  featureCode: string
): Promise<boolean> => {
  const code = normalizeFeatureCode(featureCode);

  const assigned = await prisma.businessFeature.findFirst({
    where: {
      businessId,
      businessType,
      featureCode: code,
      isEnabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }]
    }
  });
  if (assigned) return true;

  const business =
    businessType === 'restaurant'
      ? await prisma.restaurant.findUnique({ where: { id: businessId }, select: { plan: true } })
      : await prisma.store.findUnique({ where: { id: businessId }, select: { plan: true } });

  if (!business?.plan) return false;

  return getPlanFeatureCodes(business.plan).map(normalizeFeatureCode).includes(code);
};

export default { normalizeFeatureCode, getPlanFeatureCodes, businessHasEntitlement };
