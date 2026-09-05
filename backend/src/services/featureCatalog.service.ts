// backend/src/services/featureCatalog.service.ts
//
// كتالوج الميزات كما يراه التاجر: ما يملكه، وما تمنحه خطته، وما يستطيع شراءه.
//
// كانت الميزات المفردة موجودة في قاعدة البيانات وبلا طريق إليها: التاجر لا
// يرى قائمتها، ولا يستطيع طلب واحدة، والإسناد يدوي من السوبر أدمن وحده.
// فبقيت البنية كلها بلا استعمال — ومعها فرصة بيع أرخص من الترقية الكاملة.
//
// المصدر الوحيد لسؤال «هل يملكها؟» هو entitlement.service كي لا تختلف
// إجابة هذه الشاشة عن إجابة الحارس الذي يفتح الميزة فعلاً.

import prisma from './prisma';
import { getPlanFeatureCodes, normalizeFeatureCode, BusinessType } from './entitlement.service';
import { buildPlanPrice, PlanPriceView } from './planPricing.service';
import { getUsdRate } from './currency.service';

export interface CatalogFeature {
  code: string;
  name: string;
  description: string | null;
  group: string;
  price: number;
  isOneTime: boolean;
  pricing: PlanPriceView;
  /** تمنحها الخطة الحالية */
  includedInPlan: boolean;
  /** مُسندة لهذا النشاط كإضافة */
  assigned: boolean;
  /** متاحة له الآن بأي سبب */
  active: boolean;
  expiresAt: Date | null;
  /** طلب معلّق لهذه الميزة */
  pendingRequest: boolean;
  /** يمكن طلب شرائها الآن */
  purchasable: boolean;
}

export const getFeatureCatalog = async (
  businessId: string,
  businessType: BusinessType
): Promise<CatalogFeature[]> => {
  const [features, business, assignments, pendingRequests, usdRate] = await Promise.all([
    prisma.feature.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } }),
    businessType === 'restaurant'
      ? prisma.restaurant.findUnique({ where: { id: businessId }, select: { plan: true } })
      : prisma.store.findUnique({ where: { id: businessId }, select: { plan: true } }),
    prisma.businessFeature.findMany({ where: { businessId, businessType, isEnabled: true } }),
    prisma.featureRequest.findMany({ where: { businessId, businessType, status: 'pending' } }),
    getUsdRate()
  ]);

  const planCodes = new Set(getPlanFeatureCodes(business?.plan).map(normalizeFeatureCode));

  // الإسناد المنتهي لا يُحتسب ملكاً — وإلا بقيت الميزة تبدو مملوكة بعد انقضائها
  const now = new Date();
  const assignedByCode = new Map(
    assignments
      .filter((a) => !a.expiresAt || a.expiresAt >= now)
      .map((a) => [normalizeFeatureCode(a.featureCode), a])
  );

  const pendingByCode = new Set(pendingRequests.map((r) => normalizeFeatureCode(r.featureCode)));

  return features.map((feature) => {
    const code = normalizeFeatureCode(feature.code);
    const includedInPlan = planCodes.has(code);
    const assignment = assignedByCode.get(code);
    const assigned = !!assignment;
    const active = includedInPlan || assigned;
    const pendingRequest = pendingByCode.has(code);

    return {
      code: feature.code,
      name: feature.name,
      description: feature.description,
      group: feature.group,
      price: feature.price,
      isOneTime: feature.isOneTime,
      pricing: buildPlanPrice(feature.price, usdRate),
      includedInPlan,
      assigned,
      active,
      expiresAt: assignment?.expiresAt || null,
      pendingRequest,
      // ميزة مجانية لا تُشترى، ومملوكة لا تُشترى مجدداً، ومطلوبة لا تُطلب مرتين
      purchasable: !active && !pendingRequest && feature.price > 0
    };
  });
};

export default { getFeatureCatalog };
