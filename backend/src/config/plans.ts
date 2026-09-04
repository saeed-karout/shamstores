// backend/src/config/plans.ts
//
// تعريف خطط الاشتراك — مصدر واحد يقرأ منه بذر الإقلاع وأداة الإدارة معاً.
// تكرارهما في مكانين كان يعني خططاً تتباعد بلا أن ينتبه أحد.
//
// الأسعار **بالدولار وحدة حساب** لا بالليرة — راجع services/planPricing.service.ts.
// التاجر يرى ويدفع بالليرة عبر سعر الصرف الموحّد؛ التخزين بالدولار يمنع
// تآكل الإيراد مع انزلاق العملة بلا أن ينتبه أحد.
// 
// الإسفين بين المجانية والمدفوعة هو **الطلبات أونلاين**، لا عدد الأصناف:
// المجانية تستبدل القائمة المطبوعة (وهذا ألم حقيقي يدفع التاجر للتسجيل)،
// والمدفوعة تفتح ما يجلب له دخلاً إضافياً. حصر المجانية بعدد أصناف مهين
// يطرد التاجر قبل أن يجرّب؛ وفتح الطلبات مجاناً يلغي سبب الترقية.
// 
// ⚠️ هذه الأرقام **فرضية** لم تُختبر على تجّار حقيقيين بعد. راجع القسم ٩
// من دراسة الجدوى: لا تُثبِّتها قبل عرضها على عشرة تجّار.

export interface PlanSeed {
  id: string;
  name: string;
  slug: string;
  price: number;
  maxRestaurants: number;
  maxStores: number;
  maxUsers: number;
  maxMenuItems: number;
  maxProducts: number;
  maxOrders: number;
  isActive: boolean;
  position: number;
  isPopular?: boolean;
  hasTableQr?: boolean;
  hasWhatsapp?: boolean;
  hasOnlineOrders?: boolean;
  hasCoupons?: boolean;
  hasPromotions?: boolean;
  hasAnalytics?: boolean;
  hasCustomDomain?: boolean;
  hasMultiLanguage?: boolean;
  hasBrandingRemoval?: boolean;
  description: string;
}

export const PLAN_SEEDS: PlanSeed[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'free',
        slug: 'free',
        price: 0,
        maxRestaurants: 1,
        maxStores: 1,
        maxUsers: 2,
        maxMenuItems: 10,
        maxProducts: 10,
        maxOrders: 0,
        isActive: true,
        position: 1,
        hasTableQr: true,
        hasWhatsapp: true,
        hasOnlineOrders: false,
        hasCoupons: false,
        hasAnalytics: false,
        hasCustomDomain: false,
        hasMultiLanguage: false,
        hasBrandingRemoval: false,
        description: 'قائمة رقمية ورمز QR للطاولات — بديل مجاني عن القائمة المطبوعة، حتى ١٠ أصناف'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'basic',
        slug: 'basic',
        price: 4,
        maxRestaurants: 1,
        maxStores: 1,
        maxUsers: 5,
        maxMenuItems: 100,
        maxProducts: 100,
        maxOrders: 500,
        isActive: true,
        position: 2,
        isPopular: true,
        hasTableQr: true,
        hasWhatsapp: true,
        hasOnlineOrders: true,
        hasCoupons: true,
        hasPromotions: true,
        hasAnalytics: false,
        hasCustomDomain: false,
        hasMultiLanguage: false,
        hasBrandingRemoval: false,
        description: 'طلبات أونلاين وكوبونات — الخطوة الأولى نحو دخل إضافي'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'pro',
        slug: 'pro',
        price: 9,
        maxRestaurants: 1,
        maxStores: 1,
        maxUsers: 15,
        maxMenuItems: 500,
        maxProducts: 500,
        maxOrders: 3000,
        isActive: true,
        position: 3,
        hasTableQr: true,
        hasWhatsapp: true,
        hasOnlineOrders: true,
        hasCoupons: true,
        hasPromotions: true,
        hasAnalytics: true,
        hasCustomDomain: false,
        hasMultiLanguage: false,
        hasBrandingRemoval: true,
        description: 'توصيل وسائقون وتحليلات، وبلا علامة المنصة على متجرك'
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'enterprise',
        slug: 'enterprise',
        price: 19,
        maxRestaurants: 10,
        maxStores: 10,
        maxUsers: 100,
        maxMenuItems: 999999,
        maxProducts: 999999,
        maxOrders: 999999,
        isActive: true,
        position: 4,
        hasTableQr: true,
        hasWhatsapp: true,
        hasOnlineOrders: true,
        hasCoupons: true,
        hasPromotions: true,
        hasAnalytics: true,
        hasCustomDomain: true,
        hasMultiLanguage: true,
        hasBrandingRemoval: true,
        description: 'فروع متعددة، نطاق خاص بك، وتعدّد اللغات'
      }
];

export default PLAN_SEEDS;
