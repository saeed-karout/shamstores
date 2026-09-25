// backend/src/services/publicProduct.service.ts
//
// منتج المتجر كما يراه الزائر — مرشّحٌ واحد لكل منافذ الواجهة العامة.
//
// **سعر الشراء لا يخرج.** كانت المنافذ العامة تُرجع صفوف Prisma كاملة، فيقرأ
// أيّ زائرٍ من أدوات المطوّر `cost` لكل منتج — أي هامش ربح التاجر على كل
// قطعة. خمسة منافذ كانت تفعل ذلك، ومنفذٌ واحد يحجبه؛ فالمرشّح هنا كي لا
// يكون الحجب قراراً يتذكّره كاتب كل منفذٍ جديد.
//
// و`soldOut` محسوب: مخزون المتجر متتبَّع دائماً (الطلب يُرفض تحت الكمية)،
// فالصفر «نفد» يُعرض بشارته بدل زرّ إضافةٍ ينتهي برفضٍ عند الدفع.

type RawProduct = {
  stock: number;
  comingSoon?: boolean;
  cost?: unknown;
  reservedStock?: unknown;
  maxStockLevel?: unknown;
};

export const toPublicProduct = <T extends RawProduct>(product: T) => {
  const { cost: _cost, reservedStock: _reserved, maxStockLevel: _max, ...visible } = product;
  // القادم ليس نافداً: شارته «قريباً» لا «Sold out»، وكلاهما لا يُطلب
  return { ...visible, soldOut: !product.comingSoon && product.stock <= 0 };
};

export default { toPublicProduct };
