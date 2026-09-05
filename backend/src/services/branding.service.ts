// backend/src/services/branding.service.ts
//
// شارة «انضم لنا» على واجهات التجّار — حلقة نموّ لا زينة.
//
// كل قائمة على خطة مجانية تعرّف زبائنها بالمنصة، وبعضهم تجّار. هذا أرخص
// قناة اكتساب متاحة لمنصة بلا ميزانية تسويق.
//
// وهي في الوقت نفسه **سبب ترقية**: التاجر الذي يريد واجهة بلا شعار غريب
// يدفع ليخفيها. لذلك الشرط واحد لا شرطان: من يملك حق `branding_removal`
// لا شارة عنده — سواء جاءه الحق من خطته (٩$ فما فوق) أو اشتراه مفرداً وهو
// على المجانية. توزيع المنطق على شرطين كان سيجعل الميزة المشتراة بلا أثر
// على المجانية، وهي أهمّ حالاتها.

import { businessHasEntitlement, BusinessType } from './entitlement.service';

/** رمز الميزة — يُطابق صف Feature وبوابة الخطة hasBrandingRemoval */
export const BRANDING_REMOVAL_FEATURE = 'branding_removal';

/**
 * هل تظهر الشارة على واجهة هذا النشاط؟
 *
 * الفشل يُظهرها: شارة زائدة عند عطل عابر أهون من إخفاء ما يدفع التاجر
 * ثمنه — وحُكم «لا يملك الميزة» هو الحالة الافتراضية الصحيحة.
 */
export const shouldShowPlatformBadge = async (
  businessId: string,
  businessType: BusinessType
): Promise<boolean> => {
  try {
    return !(await businessHasEntitlement(businessId, businessType, BRANDING_REMOVAL_FEATURE));
  } catch (error) {
    console.error('تعذّر فحص حق إخفاء الشارة:', error);
    return true;
  }
};

export default { BRANDING_REMOVAL_FEATURE, shouldShowPlatformBadge };
