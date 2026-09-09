// frontend/src/i18n/storefront.tsx
//
// ترجمة نصوص واجهة الزبون.
//
// **المفتاح هو النصّ العربي نفسه لا رمزٌ مخترَع.**
//
// السبب عمليّ: هذه ترجمةٌ لاحقة لواجهةٍ مكتوبة بالعربية أصلاً في مئة موضع.
// ولو كان المفتاح رمزاً (`cart.empty`) لوجب اختراع تسعين رمزاً وربطُ كلٍّ
// منها بموضعه — وأي خطأٍ في الربط يعطي مفتاحاً خاماً على الشاشة. أمّا
// النصّ العربي فمفتاحٌ موجودٌ سلفاً، والمفقود منه يرتدّ إلى العربية —
// وهي أسوأ حالةٍ مقبولة، لا نصٌّ مكسور.
//
// **ثمنه:** تعديل الصياغة العربية يُسقط الترجمة إلى الارتداد بصمت. لذلك
// يُحذَّر في وضع التطوير عند كل نصٍّ غير مترجَم.

import React, { createContext, useCallback, useContext, useMemo } from 'react';

export type StoreLang = 'ar' | 'en';

/**
 * القاموس.
 *
 * الترجمة **قصيرة كما يليق بواجهة**: «Checkout» لا «Confirm the order»،
 * فالأزرار تُقرأ بنظرة لا تُقرأ جملةً.
 */
const EN: Record<string, string> = {
  // ---------- نوع الطلب والسلّة ----------
  'في المطعم': 'Dine-in',
  'استلام': 'Pickup',
  'توصيل': 'Delivery',
  'نوع الطلب': 'Order type',
  'السلة فارغة': 'Your cart is empty',
  'سلتك فارغة': 'Your cart is empty',
  'تصفّح القائمة وأضف ما يعجبك': 'Browse the menu and add what you like',
  'إفراغ السلة': 'Clear cart',
  'عرض السلة': 'View cart',

  // ---------- بيانات الزبون ----------
  'بياناتك': 'Your details',
  'الاسم': 'Name',
  'اسمك': 'Your name',
  'رقم الهاتف': 'Phone number',
  'عنوان التوصيل': 'Delivery address',
  'الحي، الشارع، أقرب معلم...': 'Neighborhood, street, nearest landmark…',
  'ملاحظات على الطلب': 'Order notes',
  'أي ملاحظة إضافية...': 'Any additional note…',

  // ---------- الكوبون والحساب ----------
  'كوبون خصم': 'Discount coupon',
  'أدخل الكود': 'Enter code',
  'تطبيق الكوبون': 'Apply coupon',
  'تطبيق': 'Apply',
  'إزالة': 'Remove',
  'كوبون غير صالح': 'Invalid coupon',
  'المجموع الفرعي': 'Subtotal',
  'الخصم': 'Discount',
  'رسوم التوصيل': 'Delivery fee',
  'مجاني': 'Free',
  'الإجمالي': 'Total',
  'تأكيد الطلب': 'Place order',
  'جاري إرسال الطلب...': 'Sending your order…',

  // ---------- رسائل النتيجة ----------
  'الاسم ورقم الهاتف مطلوبان': 'Name and phone number are required',
  'حدّد موقع التوصيل أو اكتب العنوان': 'Pick a delivery location or type the address',
  'عنوان التوصيل مطلوب': 'Delivery address is required',
  'تم إرسال طلبك — يتابعه المتجر الآن 🎉': 'Order sent — the store is on it 🎉',
  'تم إرسال طلبك بنجاح 🎉': 'Your order was sent 🎉',
  'تعذّر إرسال الطلب، حاول مجدداً': 'Could not send the order. Please try again',
  'سجّل دخولك لإتمام الطلب ومتابعته': 'Sign in to place and track your order',

  // ---------- البحث والترتيب ----------
  'بحث': 'Search',
  'ترتيب': 'Sort',
  'ترتيب حسب': 'Sort by',
  'ترتيب المنتجات': 'Sort products',
  'نتائج البحث': 'Search results',
  'لا توجد نتائج': 'No results',
  'إغلاق البحث': 'Close search',
  'ابحث عن منتج...': 'Search for a product…',
  'ابحث عن صنف...': 'Search for an item…',
  'ابحث في القائمة...': 'Search the menu…',
  'اكتب اسم الصنف الذي تبحث عنه': 'Type the name of the item you want',
  'المقترح': 'Recommended',
  'الأكثر تخفيضاً': 'Biggest discount',
  'السعر: من الأقل': 'Price: low to high',
  'السعر: من الأعلى': 'Price: high to low',
  'الأحدث': 'Newest',

  // ---------- الأقسام والحالات الفارغة ----------
  'العروض': 'Offers',
  'المنتجات': 'Products',
  'كل المنتجات': 'All products',
  'منتجات أخرى': 'Other products',
  'أصناف أخرى': 'Other items',
  'لا توجد منتجات تطابق بحثك': 'No products match your search',
  'لا توجد أصناف تطابق بحثك': 'No items match your search',
  'لا عروض حالياً': 'No offers right now',
  'لا توجد منتجات متاحة حالياً': 'No products available right now',
  'لا توجد أصناف متاحة حالياً': 'No items available right now',

  // ---------- المفضّلة والشارات ----------
  'المفضلة': 'Favorites',
  'لم تضف شيئاً بعد.': 'You have not added anything yet.',
  'اضغط ♡ على أي منتج ليظهر هنا.': 'Tap ♡ on any product to see it here.',
  'إضافة إلى المفضلة': 'Add to favorites',
  'إزالة من المفضلة': 'Remove from favorites',
  'الأكثر طلباً': 'Best seller',
  'جديد': 'New',
  'خيارات': 'Options',
  'غير متوفر': 'Unavailable',

  // ---------- الحساب ----------
  'حسابي': 'My account',
  'حسابك': 'Your account',
  'بياناتي': 'My profile',
  'طلباتي': 'My orders',
  // ===== الموقع على الخريطة =====
  'موقعي الحالي': 'My current location',
  'اختر من الخريطة': 'Pick on the map',
  'إخفاء الخريطة': 'Hide map',
  'جارٍ تحديد موقعك…': 'Locating you…',
  'تعذّر تحديد الموقع. استخدم الخريطة.': 'Could not get your location. Use the map.',
  'تعذّر تحديد الموقع — الإشارة ضعيفة. جرّب الخريطة.':
    'Could not get your location — weak signal. Try the map.',
  'انتهت مهلة تحديد الموقع. جرّب مجدداً أو استخدم الخريطة.':
    'Locating timed out. Try again or use the map.',
  'رفضتَ إذن الموقع. فعّله من إعدادات المتصفح أو ضع الدبّوس يدوياً.':
    'You denied location access. Enable it in your browser settings, or drop the pin manually.',

  // ===== خيارات المنتج =====
  'يمكن اختيار أكثر من واحد': 'more than one can be selected',
  'اختر': 'Choose',
  'أضف إلى السلة': 'Add to cart',

  // ===== السلة وإتمام الطلب =====
  'أكمل': 'Complete',
  'طلب من الطاولة رقم': 'Order from table',
  'شحن': 'Shipping',
  'اختر المحافظة…': 'Choose a governorate…',
  'المحافظة': 'Governorate',

  // ===== حالات الطلب =====
  // النصّ نفسه يظهر شارةً في «طلباتي» وسطراً في شريط التقدّم، فمدخلٌ واحد
  // يكفي الاثنين — والقاموس مفهرَسٌ بالعربية فلا يتكرّر
  'قيد الانتظار': 'Pending',
  'قيد التحضير': 'Preparing',
  'قيد التجهيز': 'Being prepared',
  'جاهز': 'Ready',
  'في الطريق': 'On the way',
  'تمّ التسليم': 'Delivered',
  'مكتمل': 'Completed',
  'ملغي': 'Cancelled',
  'مدفوع': 'Paid',
  'يُدفع عند الاستلام': 'Pay on delivery',
  'يُطبخ الآن': 'Being cooked now',
  'جاهز للاستلام أو التوصيل': 'Ready for pickup or delivery',
  'جاهز للشحن': 'Ready to ship',
  'بالهناء والشفاء': 'Enjoy your meal',
  'وصل الطلب': 'Order arrived',
  'بانتظار تأكيد المتجر': 'Awaiting store confirmation',
  'بانتظار تأكيد المطعم': 'Awaiting restaurant confirmation',
  'بانتظار المندوب': 'Awaiting the courier',
  'المندوب خرج بالطلب': 'The courier is out with your order',
  'في الطريق إليك': 'On its way to you',
  'يُجهَّز ويُغلَّف': 'Being prepared and packed',
  'وصل طلبك': 'Your order has arrived',

  // ===== شاشة «طلباتي» =====
  'جاري التحميل...': 'Loading…',
  'كل طلباتي': 'All my orders',
  'لا طلبات بعد': 'No orders yet',
  'سيظهر طلبك هنا فور إرساله.': 'Your order will appear here as soon as you place it.',
  'كيف كانت تجربتك؟': 'How was your experience?',
  'تقييم الطلب': 'Rate the order',
  'تقييم المنتجات': 'Rate the products',
  'تقييم المندوب': 'Rate the courier',
  'جاري الإرسال...': 'Sending…',
  'أرسل التقييم': 'Send review',
  'قيّم ما اشتريت': 'Rate what you bought',
  'رأيك يظهر لمن يفكّر بشراء نفس المنتج. يُحفظ فور اختيارك.':
    'Your review is shown to anyone considering the same product. It saves as soon as you pick.',
  'شكراً — سجّلنا تقييمك لهذا الطلب.': 'Thank you — your review for this order is recorded.',
  'صنف': 'Item',
  'أُلغي هذا الطلب. تواصل مع': 'This order was cancelled. Contact the',
  'إن كان ذلك غير': 'if that was unexpected',
  'المتجر': 'store',
  'المطعم': 'restaurant',

  // قالب «صفحة أقسام»
  'تسوّق حسب الفئة': 'Shop by category',
  'عرض الكل': 'View all',
  'من نحن': 'About us',
  'وصل حديثاً': 'New arrivals',
  'الحسومات': 'On sale',
  'الأكثر مبيعاً': 'Best sellers',
  'تسجيل الدخول': 'Sign in',
  'تسجيل الدخول (اختياري)': 'Sign in (optional)',
  'تسجيل الخروج': 'Sign out',
  'يمكنك الطلب كضيف بلا حساب. الحساب يحفظ طلباتك ويتيح تتبّعها.':
    'You can order as a guest. An account saves your orders and lets you track them.',

  // ---------- التواصل والأخطاء ----------
  'اتصال': 'Call',
  'واتساب': 'WhatsApp',
  'العودة إلى الأعلى': 'Back to top',
  'هذا المتجر غير موجود أو تم إيقافه': 'This store does not exist or has been disabled',
  'هذا المطعم غير موجود أو تم إيقافه': 'This restaurant does not exist or has been disabled',
  'تعذّر تحميل بيانات المتجر': 'Could not load the store',
  'تعذّر تحميل بيانات المطعم': 'Could not load the restaurant',
  'تأكد من صحة الرابط أو تواصل مع المتجر.': 'Check the link or contact the store.',
  'تأكد من صحة الرابط أو تواصل مع المطعم.': 'Check the link or contact the restaurant.',
  'بيانات غير صالحة': 'Invalid data',

  // ---------- التذييل ----------
  'القائمة': 'Menu',
  'الطلبات': 'Orders',
  'تواصل معنا': 'Contact us',
  'عن الشركة': 'About',
  'سياسة الخصوصية': 'Privacy policy',
  'الشروط والأحكام': 'Terms & conditions',
  'الأسئلة الشائعة': 'FAQ',
  'روابط سريعة': 'Quick links',
  'معلومات': 'Information',
  'النشرة البريدية': 'Newsletter',
  'اشترك ليصلك كل جديد عن العروض والمنتجات': 'Subscribe for offers and new products',
  'بريدك الإلكتروني': 'Your email',
  'اشتراك': 'Subscribe',
  'شكراً للاشتراك في النشرة البريدية': 'Thanks for subscribing',

  // ---------- الشريط والأقسام ----------
  'ابحث في المنتجات…': 'Search products…',
  'ابحث في المنتجات': 'Search products',
  'السلة': 'Cart',
  'أقسام المتجر': 'Store sections',
  'أقسام القائمة': 'Menu sections',
  'الكل': 'All',
  'عملة العرض': 'Display currency',
  'عروض وإعلانات': 'Offers and announcements',
  'الشريحة السابقة': 'Previous slide',
  'الشريحة التالية': 'Next slide',

  // ---------- المنتج وخياراته ----------
  'إضافة إلى السلة': 'Add to cart',
  'الحجم': 'Size',
  'الإضافات': 'Add-ons',
  'مطلوب': 'Required',
  'اختياري': 'Optional',
  '· يمكن اختيار أكثر من واحد': '· You may pick more than one',
  'الكمية': 'Quantity',
  'ملاحظات': 'Notes',
  'مثال: بدون بصل، حار قليلاً...': 'e.g. no onions, a little spicy…',
  'نفدت الكمية': 'Out of stock',
  'إزالة من السلة': 'Remove from cart',
  'إنقاص الكمية': 'Decrease quantity',
  'زيادة الكمية': 'Increase quantity',
  'آراء المشترين': 'Customer reviews',

  // ---------- معرض الصور ----------
  'لا توجد صورة لهذا المنتج': 'No image for this product',
  'تكبير الصورة': 'Zoom image',
  'الصورة السابقة': 'Previous image',
  'الصورة التالية': 'Next image',
  'إغلاق العرض المكبّر': 'Close zoom',

  // ---------- الموقع ----------
  'جارٍ تحميل الخريطة…': 'Loading map…',
  'تم تحديد موقعك': 'Location set',
  'الموقع محدَّد': 'Location selected',
  'اضغط على الخريطة أو اسحب الدبّوس لضبط الموقع بدقة':
    'Tap the map or drag the pin to set the exact spot',
  'حدّد موقعك ليصل السائق إليك بدقة. العنوان المكتوب وحده قد لا يكفي.':
    'Set your location so the driver finds you. A written address alone may not be enough.',
  'متصفحك لا يدعم تحديد الموقع. اختر من الخريطة.':
    'Your browser does not support location. Pick on the map.',

  // ---------- تنبيهات الطلب ----------
  'تابع طلبك أولاً بأول': 'Follow your order live',
  'يصلك تنبيه فور تغيّر حالة طلبك — بلا أن تُبقي هذه الصفحة مفتوحة.':
    'Get an alert the moment your order changes — without keeping this page open.',
  'عبر تيليجرام': 'Via Telegram',
  'تيليجرام مُفعّل': 'Telegram enabled',
  'إشعار المتصفّح': 'Browser notifications',
  'الإشعارات مُفعّلة': 'Notifications enabled',
  'أرغب أيضاً بمعرفة العروض والخصومات. يمكنك الإلغاء من أي رسالة.':
    'Also send me offers and discounts. You can unsubscribe from any message.',
  'سيصلك تحديث طلبك أولاً بأول': 'You will get order updates as they happen',
  'تعذّر تفعيل الإشعارات': 'Could not enable notifications',
  'تعذّر التفعيل': 'Could not enable',

  // ---------- التثبيت ----------
  'ثبّت المتجر': 'Install the store',
  'تثبيت التطبيق': 'Install app',
  'خطوتان فقط — ولتصلك إشعارات طلبك': 'Two steps only — and you get order alerts',
  'يفتح بضغطة، وتصلك إشعارات طلبك': 'Opens in one tap, with order alerts',
  'التثبيت على iPhone': 'Installing on iPhone',
  'اضغط زرّ المشاركة في شريط سفاري بالأسفل': 'Tap the Share button in the Safari bar below',
  'اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة»': 'Choose "Add to Home Screen", then "Add"',
  'بعدها افتح المتجر من الأيقونة الجديدة، وفعّل الإشعارات من داخله.':
    'Then open the store from the new icon and enable notifications inside it.',
  'التثبيت من المتصفّح': 'Install from the browser',
  'متصفّحك لم يتح نافذة التثبيت التلقائية الآن. تستطيع تثبيته يدوياً:':
    'Your browser did not offer the automatic install dialog. You can install it manually:',
  'افتح قائمة المتصفّح (⋮) في الأعلى': 'Open the browser menu (⋮) at the top',
  'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»':
    'Choose "Install app" or "Add to Home Screen"',
  'إن لم تجد الخيار، جرّب فتح المتجر في متصفّح Chrome.':
    'If you cannot find it, try opening the store in Chrome.',
  'فهمت': 'Got it',

  // ---------- التثبيت ----------
  'تثبيت': 'Install',
  'إغلاق': 'Close'
};

export interface StorefrontI18n {
  lang: StoreLang;
  dir: 'rtl' | 'ltr';
  /** يترجم نصّاً عربياً — ويرتدّ إليه حين لا ترجمة له */
  t: (arabic: string) => string;
}

const Context = createContext<StorefrontI18n>({
  lang: 'ar',
  dir: 'rtl',
  t: (arabic) => arabic
});

const missing = new Set<string>();

/**
 * يبني دالّة الترجمة بلا سياق.
 *
 * **لمن يقع فوق المزوّد:** الصفحة نفسها تُنشئ المزوّد لأبنائها، فلا تراه
 * هي. ولو استعملت `useT` لعادت بالعربية دائماً بينما أبناؤها بالإنجليزية —
 * واجهةٌ نصفها مترجَم، وهو أسوأ من واحدةٍ غير مترجَمة.
 */
export const makeT = (lang: StoreLang) => (arabic: string): string => {
  if (lang !== 'en') return arabic;
  const translated = EN[arabic];
  if (translated) return translated;
  if (import.meta.env.DEV && !missing.has(arabic)) {
    missing.add(arabic);
    console.warn('[i18n] نصّ غير مترجَم:', arabic);
  }
  return arabic;
};

export const StorefrontI18nProvider: React.FC<{
  lang: StoreLang;
  children: React.ReactNode;
}> = ({ lang, children }) => {
  // التحذير مرّةً لكل نصّ: الحلقات تعيد رسم البطاقات عشرات المرّات،
  // وتحذيرٌ لكل رسمة يُغرق وحدة التحكّم فلا يُقرأ أيّها
  const t = useCallback(makeT(lang), [lang]);

  const value = useMemo<StorefrontI18n>(
    () => ({ lang, dir: lang === 'en' ? 'ltr' : 'rtl', t }),
    [lang, t]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

/**
 * `t` في أي مكوّنٍ داخل الواجهة.
 *
 * **سياقٌ لا تمرير خصائص:** النصوص موزّعة على عشرة مكوّنات متداخلة، وتمرير
 * اللغة عبرها كان يعني تعديل كلٍّ منها — وتذكّرَ ذلك في كل مكوّنٍ جديد.
 * والقيمة الافتراضية تُرجع العربية، فمكوّنٌ خارج المزوّد يعمل ولا ينكسر.
 */
export const useT = (): StorefrontI18n => useContext(Context);

export default useT;
