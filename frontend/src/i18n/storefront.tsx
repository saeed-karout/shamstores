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
  // ---------- الدفع ----------
  'طريقة الدفع': 'Payment method',
  'نقداً عند الاستلام': 'Cash on delivery',
  'شام كاش': 'Sham Cash',
  'حوّل الإجمالي إلى محفظة شام كاش التالية، وسيؤكّد المتجر الدفع عند استلامه:': 'Transfer the total to this Sham Cash wallet. The shop will confirm payment once received:',
  'نسخ': 'Copy',
  'تم النسخ': 'Copied',
  'باسم': 'Name',

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
  'الأقسام الفرعية': 'Subcategories',
  'تصفية': 'Filter',

  // إتاحة الوصول — أوّل ما يبلغه قارئ الشاشة
  'تخطَّ إلى المحتوى': 'Skip to content',

  'شكراً لتقييمك': 'Thank you for your review',
  'تعذّر إرسال التقييم': 'Could not send the review',
  'تعذّر حفظ تقييم المنتج': 'Could not save the product review',

  'تمت الإضافة': 'Added',
  'مشاركة واتساب': 'Share on WhatsApp',
  'تم نسخ الرابط': 'Link copied',
  'المنتج غير متوفر في المخزون': 'This product is out of stock',
  'الكمية المتاحة محدودة': 'Available quantity is limited',

  // ===== صفحة الحساب =====
  'رجوع': 'Back',
  'تغيير صورة الحساب': 'Change account photo',
  'اختر ملف صورة': 'Choose an image file',
  'اضغط «حفظ» لتثبيت الصورة': 'Press “Save” to keep the photo',
  'الاسم الكامل': 'Full name',
  'يظهر للمتجر عند طلبك، ويُستخدم للتواصل بشأن طلباتك.':
    'Shown to the store with your order, and used to contact you about it.',
  'نوع الحساب': 'Account type',
  'بيانات ثابتة': 'Fixed details',
  'حفظ التغييرات': 'Save changes',
  'جارٍ الحفظ…': 'Saving…',
  'لا تغييرات': 'No changes',
  'تم حفظ بياناتك': 'Your details were saved',
  'تعذّر حفظ البيانات': 'Could not save your details',
  'تعذّر رفع الصورة': 'Could not upload the photo',
  'تعذّر تحميل بيانات حسابك': 'Could not load your account details',
  'مدير المنصة': 'Platform admin',
  'صاحب نشاط': 'Business owner',
  'موظف': 'Staff',
  'مندوب توصيل': 'Delivery courier',
  'زبون': 'Customer',

  // ===== صفحة تتبّع الطلب =====
  'تتبع الطلب': 'Track order',
  'جاري تحميل معلومات الطلب...': 'Loading order details…',
  'الطلب غير موجود': 'Order not found',
  'العودة إلى الرئيسية': 'Back to home',
  'حالة الطلب': 'Order status',
  'رقم الطلب': 'Order number',
  'تاريخ الطلب:': 'Order date:',
  'الوقت المتوقع:': 'Estimated time:',
  'وقت التوصيل:': 'Delivery time:',
  'المنتجات المطلوبة': 'Ordered items',
  'فتح في خرائط جوجل': 'Open in Google Maps',
  'معلومات المندوب': 'Courier details',
  'موقع المندوب يتم تحديثه تلقائياً': 'The courier location updates automatically',
  'معلومات إضافية': 'Additional details',
  'الاسم:': 'Name:',
  'الهاتف:': 'Phone:',
  'حالة الدفع:': 'Payment status:',
  'طريقة الدفع:': 'Payment method:',
  'غير مدفوع': 'Unpaid',
  '(سيتم الدفع عند الاستلام)': '(payable on delivery)',
  'كاش': 'Cash',
  'بطاقة': 'Card',
  'أونلاين': 'Online',
  'تم الشحن': 'Shipped',
  'تم التوصيل': 'Delivered',
  'تم الاستلام': 'Received',
  'تحديث البيانات': 'Refresh',
  'منتج': 'Product',

  // ===== صفحة المنتج =====
  'العودة إلى المتجر': 'Back to store',
  'تصفّح المتجر': 'Browse the store',
  'المنتج غير موجود': 'Product not found',
  'عذراً، المنتج الذي تبحث عنه غير موجود': 'Sorry, the product you are looking for does not exist',
  'غير متاح حالياً': 'is currently unavailable',
  'هذا المنتج غير متاح حالياً': 'This product is currently unavailable',
  'أوقفه المتجر مؤقتاً. رابطك صحيح — تصفّح بقية المنتجات أو تواصل مع المتجر للسؤال عن عودته.':
    'The store paused it temporarily. Your link is correct — browse the other products, or contact the store to ask when it returns.',
  'لا توجد صورة': 'No image',
  'خصم': 'Off',
  'وفّر': 'Save',
  'نفد من المخزون': 'Out of stock',
  'الوصف': 'Description',
  'الحالة:': 'Status:',
  'متوفر': 'In stock',
  'الكمية المتاحة:': 'Available quantity:',
  'قطعة': 'pcs',
  'الكمية:': 'Quantity:',
  'الحد الأقصى:': 'Maximum:',
  'معلومات المتجر': 'Store information',
  'هاتف:': 'Phone:',
  'واتساب:': 'WhatsApp:',
  'وقت التوصيل المتوقع:': 'Estimated delivery time:',
  'دقيقة': 'minutes',
  'توصيل مجاني للطلبات فوق': 'Free delivery on orders above',
  'نسخ الرابط': 'Copy link',
  'منتجات قد تعجبك': 'You may also like',

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
  'الطلب من الطاولة': 'Ordering from table',
  'شحن': 'Shipping',
  'اختر المحافظة…': 'Choose a governorate…',
  'المحافظة': 'Governorate',
  // العنوان المنظَّم — components/storefront/DeliveryAddressFields.tsx
  'اختر المنطقة…': 'Choose an area…',
  'المنطقة': 'Area',
  'مجاني فوق': 'Free over',
  'خلال': 'within',
  'يوم': 'days',
  'البناء': 'Building',
  'الطابق': 'Floor',
  'أقرب نقطة دالّة': 'Nearest landmark',
  'مثال: جانب صيدلية الشفاء، مقابل الجامع': 'e.g. next to Al-Shifa pharmacy, opposite the mosque',
  'اسم أو رقم البناء': 'Building name or number',
  'مثال: الثالث': 'e.g. 3rd',
  'الموقع على الخريطة (اختياري)': 'Location on map (optional)',

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
  'عروض خاصة': 'Special offers',
  'عرض التفاصيل': 'View details',
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
  'الصورة': 'Image',
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
  'إغلاق': 'Close',

  // ---------- التعليقات على المنتج والوجبة ----------
  'التعليقات': 'Comments',
  'ردّ المتجر': 'Store reply',
  'ردّ المطعم': 'Restaurant reply',
  'اسأل عن المنتج أو شارك رأيك…': 'Ask about this product or share your thoughts…',
  'اسأل عن الوجبة أو شارك رأيك…': 'Ask about this dish or share your thoughts…',
  'اكتب تعليقك': 'Write your comment',
  'تعلّق باسم': 'Commenting as',
  'يظهر اسمك مع التعليق': 'Your name appears with the comment',
  'نشر': 'Post',
  'جارٍ النشر…': 'Posting…',
  'نُشر تعليقك': 'Your comment was posted',
  'اكتب اسمك ليظهر مع تعليقك': 'Enter your name to post',
  'تعذّر نشر التعليق، حاول مجدداً': 'Could not post the comment. Please try again',
  'لا تعليقات بعد': 'No comments yet',
  'كن أوّل من يسأل عن هذا المنتج.': 'Be the first to ask about this product.',
  'كن أوّل من يسأل عن هذه الوجبة.': 'Be the first to ask about this dish.',
  'عرض المزيد': 'Show more',
  'تعذّر تحميل المزيد': 'Could not load more',
  'سجّل الدخول لتعلّق': 'Sign in to comment',
  'التعليق والتفاعل للزبائن المسجّلين — يظهر اسم حسابك مع ما تكتبه.': 'Commenting and reacting are for signed-in customers — your account name appears with what you write.',
  'سجّل الدخول لتتفاعل مع التعليقات': 'Sign in to react to comments',
  'أعجبني': 'Like',
  'لم يعجبني': 'Dislike',
  'تعذّر حفظ تفاعلك': 'Could not save your reaction',
  'ترتيب التعليقات': 'Sort comments',
  'الأكثر إعجاباً': 'Most liked',
  'أضف اسمك في صفحة حسابك ليظهر مع تعليقك': 'Add your name in your account page to comment',

  // اللغة والعملة في زرٍّ واحد
  'اللغة والعملة': 'Language & currency',
  'لغة العرض': 'Display language',
  'اللغة': 'Language',
  'عرض الأسعار بـ': 'Show prices in',
  'ليرة سورية': 'Syrian pound',
  'دولار أمريكي': 'US dollar',

  // الأقسام الفرعية
  'تسوّق داخل': 'Shop in',
  'أقسام': 'sections',

  // البحث العميق
  'نتيجة': 'results',
  'جارٍ البحث في الأسماء والرموز والأوصاف…': 'Searching names, SKUs and descriptions…',
  'بحثٌ في الاسم والوصف وSKU والمقاسات': 'searching name, description, SKU and sizes',
  'لا توجد منتجات تطابق بحثك — جرّب كلمةً أقصر أو رمز المنتج (SKU)':
    'No products match — try a shorter word or the product SKU',

  // فترة الانتقال بعد حذف صفرَي الليرة — المقابل القديم تحت السعر
  'ل.س قديمة': 'old SYP',
  'بالليرة القديمة': 'In old Syrian pounds',

  // «قريباً» و«أعلمني حين يتوفّر»
  'قريباً': 'Coming soon',
  'قريباً — كن أوّل من يعلم': 'Coming soon — be the first to know',
  'نفدت الكمية — نُعلمك حين يعود': 'Sold out — we will let you know when it is back',
  'يتوفّر المتوقّع:': 'Expected:',
  'سُجّل رقمك — سيتواصل معك المتجر حين يتوفّر.': 'Your number is saved — the store will contact you when it is available.',
  'سنُعلمك فور توفّره.': 'We will notify you as soon as it is available.',
  'ينتظرونه معك': 'waiting with you',
  'جارٍ التسجيل…': 'Saving…',
  'أعلمني حين يتوفّر': 'Notify me when available',
  'بريدك الإلكتروني أو رقم هاتفك': 'Your email or phone number',
  'أعلمني': 'Notify me',
  'اكتب بريدك أو رقم هاتفك': 'Enter your email or phone number',
  'تعذّر تسجيل طلبك الآن': 'Could not save your request right now',

  // ---------- الشبكة الضعيفة ووضع توفير البيانات ----------
  'أنت غير متصل — الأسعار قد تكون قديمة': "You're offline — prices may be out of date",
  'الاتصال ضعيف — نعرض آخر نسخة محفوظة والأسعار قد تكون قديمة': 'Weak connection — showing the last saved copy; prices may be out of date',
  'تحديث': 'Refresh',
  'إيقاف': 'Turn off',
  'وضع توفير البيانات مفعّل تلقائياً لأن الشبكة بطيئة: صور أصغر وبلا حركة': 'Data saver is on because your network is slow: smaller images, no animations',
  'وضع توفير البيانات مفعّل: صور أصغر وبلا حركة': 'Data saver is on: smaller images, no animations',
  'الإنترنت بطيء أو الباقة محدودة؟': 'Slow internet or limited data?',
  'فعّل وضع توفير البيانات': 'Turn on data saver',
  'أنت غير متصل — إتمام الطلب يحتاج اتصالاً بالإنترنت. سلّتك محفوظة، أكمل حين يعود الاتصال.':
    "You're offline — placing an order needs an internet connection. Your cart is saved; finish when you're back online.",
  'لا اتصال بالإنترنت — لم يُرسل طلبك. سلّتك محفوظة، أعد المحاولة حين يعود الاتصال.':
    'No internet connection — your order was not sent. Your cart is saved; try again when you are back online.',

  // «تاجر موثّق»
  'تاجر موثّق': 'Verified merchant',
  'تاجر موثّق — تحقّقت شام ستورز من هويته': 'Verified merchant — identity checked by ShamStores',
  'تحقّقت شام ستورز من هوية صاحب هذا النشاط عبر وثيقة رسمية (هوية شخصية أو سجلّ تجاري) ورقم هاتف فعّال.':
    'ShamStores has checked the identity of this business owner using an official document (ID card or commercial registration) and an active phone number.',
  'وراء هذا المتجر شخصٌ أو شركة حقيقية معروفة لدينا.': 'A real person or company known to us is behind this store.',
  'إن واجهتك مشكلة في طلب، يمكننا الوصول إلى صاحبه.': 'If something goes wrong with an order, we can reach the owner.',
  'الشارة لا تعني ضماناً لجودة المنتجات — اقرأ التقييمات واسأل قبل الشراء.':
    'The badge is not a guarantee of product quality — read reviews and ask before you buy.',
  // ---------- إضافات إتمام الطلب: واتساب، المعاينة، هدايا المغتربين، العربون ----------
  'تمّ تسجيل طلبك': 'Order placed',
  'أرسل الطلب للتاجر على واتساب': 'Send the order to the shop on WhatsApp',
  'طلبك وصل المتجر فعلاً — الرسالة نسخةٌ تسرّع التواصل.': 'The shop already has your order — the message just speeds things up.',
  'تتبّع طلبك': 'Track your order',
  'انسخ رابط التتبّع': 'Copy tracking link',
  'معاينة قبل الدفع': 'Inspect before you pay',
  'افحص طلبك عند الاستلام، وادفع فقط إن كان كما طلبت.': 'Check your order on delivery and pay only if it is what you ordered.',
  'معاينة قبل الدفع: افحص طلبك عند الاستلام، وادفع فقط إن كان كما طلبت.': 'Inspect before you pay: check your order on delivery and pay only if it is what you ordered.',
  'اشترِ لأهلك في سوريا': 'Buy for your family in Syria',
  'أنت في الخارج؟ اطلب لهم من هنا وادفع أنت — ونوصل الهدية إلى بابهم.': 'Living abroad? Order for them here and pay yourself — we deliver the gift to their door.',
  'أضف ما تريد إهداءه إلى السلة، ثمّ أكمل الطلب كهدية': 'Add what you want to gift to the cart, then check out as a gift',
  'هذا الطلب هدية — أنا خارج سوريا': 'This order is a gift — I live outside Syria',
  'تدفع أنت من الخارج، ونوصله لأهلك في سوريا.': 'You pay from abroad; we deliver to your family in Syria.',
  'بياناتك (الدافع)': 'Your details (payer)',
  'اسم الدافع': "Payer's name",
  'رقم الدافع مع رمز الدولة': "Payer's phone with country code",
  'بريدك الإلكتروني (اختياري) — نرسل لك تأكيد الدفع': 'Your email (optional) — we will confirm your payment',
  'رسالة تُرفق بالهدية (اختياري)': 'Gift message (optional)',
  'أخفِ الأسعار عن المستلم': 'Hide prices from the recipient',
  'اكتب بيانات المستلم وعنوانه في سوريا أدناه. بعد الطلب تظهر لك تعليمات الدفع، ولا يُجهَّز الطلب قبل أن يؤكّد المتجر وصول دفعتك.':
    "Enter the recipient's details and address in Syria below. Payment instructions appear after you order, and the order is prepared only once the shop confirms your payment.",
  'بيانات المستلم في سوريا': 'Recipient in Syria',
  'رقم مستلم سوري': 'Syrian recipient number',
  'طلب هدية — بانتظار دفعتك': 'Gift order — awaiting your payment',
  'ادفع': 'Pay',
  'حسب تعليمات المتجر، ولن يُجهَّز الطلب قبل تأكيد وصول دفعتك:': "following the shop's instructions. The order is prepared once your payment is confirmed:",
  'أرسل صورة إيصال التحويل للمتجر على واتساب مع رقم الطلب.': 'Send a photo of the transfer receipt to the shop on WhatsApp with your order number.',
  'هدية لك': 'A gift for you',
  'أرسل لك أحد أحبّائك هذه الهدية.': 'Someone who loves you sent you this gift.',
  'بانتظار تأكيد الدفعة — يبدأ التجهيز فور وصولها.': 'Awaiting payment confirmation — preparation starts as soon as it arrives.',
  'بعض المنتجات تتطلّب عربوناً': 'Some items need a deposit',
  'يُدفع مسبقاً، والباقي عند الاستلام. تظهر طريقة الدفع بعد تأكيد الطلب.': 'paid upfront, the rest on delivery. Payment details appear after you place the order.',
  'العربون المطلوب الآن': 'Deposit due now',
  'المتبقّي عند الاستلام': 'Remaining on delivery',
  'والمتبقّي عند الاستلام': 'remaining on delivery',
  'يؤكّد المتجر استلام العربون ثمّ يجهّز طلبك.': 'The shop confirms the deposit, then prepares your order.',
  'عربون': 'Deposit',
  'والباقي عند الاستلام': 'rest on delivery',
  'العربون': 'Deposit',
  'مستلم': 'Received',
  'بانتظار الدفع': 'Awaiting payment',
  'جدول الأقساط': 'Installment plan',
  'القسط': 'Installment',
  'مستحقّ': 'Due',

  // بيانات صاحب الحساب في السلّة، والكوبون للمسجّلين
  'يُرسَل الطلب باسم حسابك': 'Ordering with your account details',
  'بيانات أخرى': 'Use other details',
  'الكوبونات للمسجّلين — سجّل الدخول لتستخدم كود الخصم': 'Coupons are for signed-in customers — sign in to use a discount code'
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
