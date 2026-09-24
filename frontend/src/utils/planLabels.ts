// frontend/src/utils/planLabels.ts
//
// أسماء الخطط بالعربية — مصدرٌ واحد.
//
// كانت خمس خرائط متفرّقة (الرئيسية، لوحة الأدمن، بطاقة الخطة، الشريط
// الجانبي، صفحة الخطط) وكلٌّ يسمّي `basic` باسم: «الأساسية» هنا و«الانطلاقة»
// هناك. فيرى التاجر اسماً في صفحة الأسعار واسماً آخر في لوحته بعد الدفع.
//
// الخطة غير المعروفة تُعرض باسمها المخزَّن: خطةٌ أنشأها الأدمن من لوحته
// لا تظهر فارغة.

export const PLAN_LABELS: Record<string, string> = {
  free: 'المجانية',
  basic: 'الانطلاقة',
  pos: 'الكاشير',
  pro: 'النموّ',
  business: 'الأعمال',
  enterprise: 'المؤسسات'
};

export const planLabel = (plan?: { name?: string | null; slug?: string | null } | string | null): string => {
  if (!plan) return '';
  const key = typeof plan === 'string' ? plan : plan.slug || plan.name || '';
  return PLAN_LABELS[key] || (typeof plan === 'string' ? plan : plan.name || key);
};

/**
 * خططٌ بمستوى «النموّ» فما فوق — تُخفى عندها إعلانات المنصّة وتُفتح
 * شاشاتٌ كانت تُفحص باسم `pro` وحده.
 *
 * بالاسم لا بالسعر: الأدمن قد يخفّض سعر خطةٍ لعرضٍ مؤقّت، ولا يعني ذلك
 * أنها نزلت مستوى.
 */
export const PRO_TIER_PLANS = new Set(['pro', 'business', 'enterprise']);
