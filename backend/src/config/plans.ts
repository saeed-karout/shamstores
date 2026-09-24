// backend/src/config/plans.ts
//
// تعريف خطط الاشتراك — مصدر واحد يقرأ منه بذر الإقلاع وأداة الإدارة معاً.
// تكرارهما في مكانين كان يعني خططاً تتباعد بلا أن ينتبه أحد.
//
// الأسعار **بالدولار وحدة حساب** لا بالليرة — راجع services/planPricing.service.ts.
// التاجر يرى ويدفع بالليرة عبر سعر الصرف الموحّد؛ التخزين بالدولار يمنع
// تآكل الإيراد مع انزلاق العملة بلا أن ينتبه أحد.
// 
// الإسفين بين المجانية والمدفوعة هو **حجم الطلبات** لا القدرة عليها.
//
// كان المنع كاملاً: صفر طلبات في المجانية. فكان التاجر يُطالَب بالدفع
// مقابل ميزة لم يرَ منها شيئاً — لا كيف يصله الطلب ولا كيف يديره. خمسة
// طلبات شهرياً تكفي ليجرّب ولا تكفي ليكتفي.
//
// ومن تجاوز الخمسة فقد أثبت أن الميزة تنفعه — وهذه لحظة الترقية الصحيحة،
// لا لحظة التسجيل. حصر المجانية بعدد أصناف مهين يطرد التاجر قبل أن يجرّب.
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
  /**
   * رموز ميزاتٍ لا بوابة منطقية لها في الجدول — `pos` و`affiliate` و`pwa`.
   *
   * `getPlanFeatureCodes` يقرأ هذا الحقل مع البوابات، فخطةٌ تذكر `pos` هنا
   * تفتح مسارات الكاشير بلا شراء الإضافة منفردة.
   */
  features?: string[];
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
        maxUsers: 3,
        // خمسون صنفاً: قائمة مطعمٍ صغير كاملة، لا عيّنة منها. عشرةٌ كانت
        // تُجبر التاجر على الاختيار بين منتجاته قبل أن يرى المنصّة تعمل.
        maxMenuItems: 50,
        maxProducts: 50,
        // ثلاثون طلباً شهرياً.
        //
        // كانت خمسة — أي يومٌ واحد لمحلٍّ صغير. فيصطدم التاجر بالسقف قبل أن
        // يعرف هل المنصّة تناسبه، ويغادر بلا رأي. القيد يبيع حين يأتي
        // **بعد** أن يلمس التاجر القيمة لا قبلها.
        //
        // وثلاثون مقصودة لا اعتباطية: أعلى من المنافس (٢٥) بفارقٍ يُذكر في
        // التسويق، وأدنى من `basic` (٢٥٠) بثمانية أضعاف — فمن تجاوزها يجد
        // الترقية بأربعة دولارات بديهية.
        //
        // والحدّ شهري لا تراكمي: راجع orderQuota.service.
        maxOrders: 30,
        isActive: true,
        position: 1,
        hasTableQr: true,
        hasWhatsapp: true,
        // ⚠️ صار الإسفين **حجماً** لا **قدرة**: المجانية تستقبل الطلبات
        // وتديرها، لكن خمسة فقط في الشهر. من تجاوزها فقد وجد الميزة نافعة،
        // وهذا أقنع من منعه من رؤيتها أصلاً.
        hasOnlineOrders: true,
        hasCoupons: false,
        hasAnalytics: false,
        hasCustomDomain: false,
        hasMultiLanguage: false,
        hasBrandingRemoval: false,
        description: 'قائمة رقمية ورمز QR للطاولات، وحتى ٥٠ صنفاً و٣٠ طلباً شهرياً للتجربة'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'basic',
        slug: 'basic',
        price: 4,
        maxRestaurants: 1,
        maxStores: 1,
        // حدودٌ خُفّضت عن ١٠٠ صنف و٢٥٠ طلباً و٥ مستخدمين: السلّم كان مسطّحاً —
        // من يدفع ٤$ يأخذ ما يكفي أغلب المحلّات فلا يجد سبباً للترقية أبداً
        maxUsers: 3,
        maxMenuItems: 80,
        maxProducts: 80,
        maxOrders: 150,
        isActive: true,
        position: 2,
        hasTableQr: true,
        hasWhatsapp: true,
        hasOnlineOrders: true,
        hasCoupons: true,
        hasPromotions: true,
        hasAnalytics: false,
        hasCustomDomain: false,
        hasMultiLanguage: false,
        hasBrandingRemoval: false,
        description: '١٥٠ طلباً شهرياً و٨٠ صنفاً وكوبونات — الخطوة الأولى نحو دخل إضافي'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'pro',
        slug: 'pro',
        price: 9,
        maxRestaurants: 1,
        maxStores: 1,
        // خُفّضت عن ٥٠٠ صنف و٣٠٠٠ طلب و١٥ مستخدماً: «الأعمال» بـ١٤$ لم تكن
        // تعطي النامي شيئاً لا يجده هنا بتسعة
        maxUsers: 8,
        maxMenuItems: 300,
        maxProducts: 300,
        maxOrders: 1000,
        isActive: true,
        position: 4,
        hasTableQr: true,
        hasWhatsapp: true,
        hasOnlineOrders: true,
        hasCoupons: true,
        hasPromotions: true,
        hasAnalytics: true,
        hasCustomDomain: false,
        hasMultiLanguage: false,
        hasBrandingRemoval: true,
        description: '١٠٠٠ طلب شهرياً و٣٠٠ صنف، وتحليلات، وبلا علامة المنصة على متجرك'
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
        position: 6,
        hasTableQr: true,
        hasWhatsapp: true,
        hasOnlineOrders: true,
        hasCoupons: true,
        hasPromotions: true,
        hasAnalytics: true,
        hasCustomDomain: true,
        hasMultiLanguage: true,
        hasBrandingRemoval: true,
        // أعلى خطة تشمل كل شيء — تاجرٌ يدفع أعلى سعر ثمّ يُطالَب بشراء
        // الكاشير منفرداً يشعر أنه خُدع
        features: ['pos', 'affiliate', 'pwa'],
        description: 'فروع متعددة، نطاق خاص بك، وتعدّد اللغات — وكل الإضافات مشمولة'
      },

      // ─────────────────────────────────────────────────────────────────
      // خطّتان أُضيفتا بعد الأربع الأولى.
      //
      // **الكاشير** لمحلٍّ يبيع من الرفّ أوّلاً ومن الإنترنت ثانياً: كان
      // صاحبه يحتاج `pro` ليحصل على التقارير ثمّ يشتري الكاشير فوقها، فيدفع
      // ١٣$ لما يحتاج نصفه. هنا يدفع ٧$ لما يحتاجه كلّه — مخزونٌ واسع
      // وكاشير وتقارير — ويترك التوصيل والهوية الكاملة لمن يريدهما.
      //
      // **الأعمال** تسدّ الفجوة بين ٩$ و١٩$: من كبر عن «النموّ» ولا يملك
      // عشرة فروع كان يُدفع إلى «المؤسسات» أو يبقى. وهي تجمع الإضافات التي
      // يشتريها النامون عادةً (كاشير ومسوّقون وتطبيق ولغتان) بأقلّ من ثمنها
      // منفردةً — ٩$ + ١٣$ إضافات = ٢٢$ مقابل ١٤$. هذا هو الحافز.
      // ─────────────────────────────────────────────────────────────────
      {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'pos',
        slug: 'pos',
        price: 7,
        maxRestaurants: 1,
        maxStores: 1,
        maxUsers: 5,
        maxMenuItems: 400,
        maxProducts: 400,
        maxOrders: 600,
        isActive: true,
        position: 3,
        hasTableQr: true,
        hasWhatsapp: true,
        hasOnlineOrders: true,
        hasCoupons: true,
        hasPromotions: false,
        hasAnalytics: true,
        hasCustomDomain: false,
        hasMultiLanguage: false,
        hasBrandingRemoval: false,
        features: ['pos'],
        description: 'كاشير بالباركود لمحلّك، ومخزون حتى ٤٠٠ منتج، وتقارير المبيعات — مع متجرك الإلكتروني'
      },
      {
        id: '66666666-6666-6666-6666-666666666666',
        name: 'business',
        slug: 'business',
        price: 14,
        maxRestaurants: 3,
        maxStores: 3,
        maxUsers: 30,
        maxMenuItems: 2000,
        maxProducts: 2000,
        maxOrders: 10000,
        isActive: true,
        position: 5,
        isPopular: true,
        hasTableQr: true,
        hasWhatsapp: true,
        hasOnlineOrders: true,
        hasCoupons: true,
        hasPromotions: true,
        hasAnalytics: true,
        hasCustomDomain: false,
        hasMultiLanguage: true,
        hasBrandingRemoval: true,
        features: ['pos', 'affiliate', 'pwa'],
        description: 'ثلاثة فروع، كاشير ومسوّقون بالعمولة وتطبيق باسمك وواجهة بلغتين — بأقلّ من ثمنها منفردة'
      }
];

export default PLAN_SEEDS;
