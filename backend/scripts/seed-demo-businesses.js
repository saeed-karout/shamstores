// backend/scripts/seed-demo-businesses.js
//
// حساباتُ عرضٍ كاملة لتُعرض على العملاء: مطعمٌ ومقهى بقائمةٍ رقمية، وثلاثة
// متاجر (أزياء، إلكترونيات، عطور وتجميل) — لكلٍّ منها قالبٌ ولوحة ألوانٍ
// مختلفة ليرى العميل تنوّع الواجهات، وطلباتٌ على مدى أسبوع لتمتلئ لوحة
// التحكّم بأرقامٍ ورسم.
//
// الصور من Unsplash (روابط مباشرة، فُحصت واحدةً واحدة).
//
// آمن للتكرار: النشاط الموجود بالـ slug نفسه يُتخطّى. `--reset` يحذف
// أنشطة العرض (بياناتها كلّها) ثم يعيد إنشاءها.
//
//   node scripts/seed-demo-businesses.js                  # معاينة بلا كتابة
//   node scripts/seed-demo-businesses.js --apply          # إنشاء ما ليس موجوداً
//   node scripts/seed-demo-businesses.js --apply --reset  # حذفٌ وإعادة إنشاء

const { prepareDatabaseUrl } = require('./db-env');

prepareDatabaseUrl();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const RESET = process.argv.includes('--reset');

/** كلمة مرور كلّ حسابات العرض — تُعطى للعميل ليجرّب اللوحة بنفسه */
const DEMO_PASSWORD = 'ShamDemo2026';

const img = (id, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const I = {
  spread: '1504674900247-0877df9cc836',
  salmonSalad: '1546069901-ba9599a7e63c',
  pizza: '1565299624946-b28f40a0ae38',
  burger: '1568901346375-23c9450c58cd',
  healthyBowl: '1512621776951-a57141f2eefd',
  fattoush: '1540189549336-e6e99c3679fe',
  tawook: '1555939594-58d7cb561ad1',
  shawarma: '1529006557810-274b9b2fc783',
  kebab: '1599487488170-d11ec9c172f0',
  donuts: '1551024601-bec78aea704b',
  berryCups: '1488477181946-6428a0291777',
  latte: '1509042239860-f550ce710b93',
  cappuccino: '1495474472287-4d71bcdd2085',
  mojito: '1544145945-f90425340c7e',
  penne: '1621996346565-e3dbc646d9a9',
  seafoodPasta: '1563379926898-05f4575a45d8',
  veggiePizza: '1513104890138-7c749659a591',
  avocadoToast: '1482049016688-2d3e1b311543',
  eggsBreakfast: '1533089860892-a7c6f0a88666',
  salmonBowl: '1559847844-5315695dadae',
  milkshake: '1577805947697-89e18249d767',
  ribs: '1544025162-d76694265947',
  steak: '1432139555190-58524dae6a55',
  clothesRack: '1523381210434-271e8be1f52b',
  redSneaker: '1542291026-7eec264c27ff',
  leatherSneaker: '1549298916-b41d501d3772',
  sportWatch: '1523275335684-37898b6baf30',
  headphones: '1505740420928-5e560c06d30e',
  instantCamera: '1526170375885-4d8ecf77b99f',
  sunglasses: '1572635196237-14b3f281503f',
  runningShoe: '1491553895911-0055eca6402d',
  knitSweater: '1434389677669-e08b4cac3105',
  wideTrousers: '1515886657613-9f3515b0c78f',
  floralDress: '1496747611176-843222e1e57c',
  bomber: '1591047139829-d91aecb6caea',
  whiteTee: '1521572163474-6864f9cf17ab',
  foldedClothes: '1556905055-8f358a7a47b2',
  backpack: '1553062407-98eeb64c6a62',
  handbag: '1584917865442-de89df76afd3',
  roundGlasses: '1511499767150-a48a237f0083',
  smartWatch: '1546868871-7041f2a55e12',
  noirPerfume: '1585386959984-a4155224a1ad',
  classicPerfume: '1541643600914-78b084683601',
  skincare: '1556228720-195a672e8a03',
  facial: '1570172619644-dfd03ed5d881',
  palette: '1522335789203-aabd1fc54bc9',
  brushes: '1596462502278-27bfdc403348',
  phone: '1511707171634-5f897ff02aa9',
  phonePro: '1592899677977-9c10ca588bbd',
  laptop: '1496181133206-80ce9b88a853',
  laptopPro: '1517336714731-489689fd1ca8',
  headphonesPro: '1583394838336-acd977736f90',
  earbuds: '1606220588913-b3aacb4d2f46',
  tv: '1593359677879-a4bb92f829d1',
  breakfastSpread: '1519676867240-f03562e64548',
  diningRoom: '1414235077428-338989a2e8c0',
  restaurantHall: '1555396273-367ea4eb4db5',
  terrace: '1559339352-11d035aa65de',
  pancakes: '1567620905732-2d1ec7ab7445',
  frenchToast: '1484723091739-30a097e8f929',
  iceCream: '1497034825429-c343d7c6a68f',
  doubleBurger: '1550547660-d9450f859349',
  chickenBurger: '1606755962773-d324e0a13086',
  kabsa: '1603133872878-684f208fb84b',
  biryani: '1631515243349-e0cb75fb8d3a',
  lentilSoup: '1476718406336-bb5a9690ee2a',
  brownie: '1624353365286-3f8d62daad51',
  cupcake: '1576618148400-f54bed99fcfd',
  cookies: '1558961363-fa8fdf82db35',
  berryCake: '1565958011703-44f9829ba187',
  chocolateCake: '1578985545062-69928b1d9587',
  trifle: '1563805042-7684c019e1cb',
  waffle: '1587314168485-3236d6710814',
  suedeShoe: '1560343090-f0409e92791a',
  classicTee: '1581655353564-df123a1eb820',
  sweatshirt: '1620799140408-edc6dcb6d633',
  blackTee: '1618354691373-d851c5c3a990',
  wallet: '1627123424574-724758594e93'
};

const PALETTES = {
  'sham-light': ['#084835', '#C07CDF', '#F6F8F5', '#FFFFFF', '#EEF3EF', '#10231B', '#647870', '#084835'],
  royal: ['#6C2E96', '#C07CDF', '#FAF6FD', '#FFFFFF', '#F1E8F8', '#24122F', '#7E6B8A', '#7A3BA8'],
  mono: ['#141312', '#8A8378', '#FAF8F4', '#FFFFFF', '#F0ECE5', '#111111', '#77736D', '#111111'],
  ocean: ['#0B4A86', '#2B8FE0', '#F1F7FC', '#FFFFFF', '#E4EFF8', '#0B2033', '#5F768A', '#0F5FA8'],
  rose: ['#B62A5D', '#F07AA4', '#FFF5F8', '#FFFFFF', '#FCE6EE', '#33101D', '#8D6877', '#C2386B']
};
const colors = (key) => {
  const [primaryColor, secondaryColor, backgroundColor, cardColor, surfaceColor, textColor, mutedColor, accentColor] = PALETTES[key];
  return { primaryColor, secondaryColor, backgroundColor, cardColor, surfaceColor, textColor, mutedColor, accentColor };
};

// ===== خيارات مشتركة =====
const size = (name, values) => ({ name, type: 'single', required: true, values: values.map(([label, priceDelta]) => ({ label, priceDelta })) });
const extras = (name, values) => ({ name, type: 'multi', required: false, values: values.map(([label, priceDelta]) => ({ label, priceDelta })) });
const CLOTH_SIZES = size('المقاس', [['S', 0], ['M', 0], ['L', 0], ['XL', 0]]);
const SHOE_SIZES = size('المقاس', [['40', 0], ['41', 0], ['42', 0], ['43', 0], ['44', 0]]);
const BURGER_EXTRAS = extras('إضافات', [['جبنة شيدر إضافية', 5000], ['بيض مقلي', 4000], ['هالبينو', 3000]]);
const COFFEE_OPTS = [size('الحجم', [['صغير', 0], ['وسط', 4000], ['كبير', 7000]]), extras('إضافات', [['شوت إسبريسو إضافي', 5000], ['حليب شوفان', 4000], ['كراميل', 3000]])];

// ===== الأنشطة =====
const BUSINESSES = [
  {
    type: 'restaurant',
    slug: 'demo-bayt-alsham',
    name: 'بيت الشام',
    nameEn: 'Bayt Al Sham',
    email: 'demo.restaurant@shamstores.com',
    owner: 'سامر الحلبي',
    phone: '0944123456',
    whatsapp: '963944123456',
    address: 'دمشق — أبو رمانة، شارع الجلاء',
    description: 'مطبخٌ شاميّ أصيل بلمسةٍ عصرية: فطورٌ بلديّ، مشاوٍ على الفحم، وحلوياتٌ تُحضَّر كلّ صباح.',
    descriptionEn: 'Authentic Damascene kitchen with a modern touch.',
    instagram: 'https://instagram.com/shamstores',
    logo: img(I.spread, 300),
    cover: img(I.restaurantHall, 1600),
    palette: 'sham-light',
    design: { preset: 'modern', shell: 'classic', card: 'standard', nav: 'floating' },
    tables: 12,
    coupon: { code: 'BAYT10', discountType: 'percentage', discountValue: 10 },
    categories: [
      {
        name: 'الفطور', nameEn: 'Breakfast', image: I.eggsBreakfast,
        items: [
          ['فطور شامي', 'Shami breakfast', 'بيض بلدي، لبنة، زيتون، خضار موسمية وخبز صاج طازج.', 45000, I.eggsBreakfast, { popular: true }],
          ['توست أفوكادو مع بيض', 'Avocado toast', 'خبز محمّص، أفوكادو مهروس، بيضتان وبذور السمسم.', 38000, I.avocadoToast],
          ['بان كيك بالعسل', 'Honey pancakes', 'ثلاث طبقات بان كيك مع عسل جبلي وزبدة.', 32000, I.pancakes, { new: true }],
          ['فرنش توست بالفواكه', 'French toast', 'خبز بريوش مع موز وتوت وقطر القيقب.', 34000, I.frenchToast]
        ]
      },
      {
        name: 'المشاوي', nameEn: 'Grills', image: I.tawook,
        items: [
          ['شيش طاووق', 'Shish tawook', 'صدر دجاج متبّل باللبن والثوم، مع بطاطا وثومية.', 55000, I.tawook, { popular: true, options: [size('الكمية', [['نصف كيلو', 0], ['كيلو', 45000]])] }],
          ['كباب حلبي', 'Aleppo kebab', 'لحم غنم مفروم مع بهارات حلبية على الفحم.', 60000, I.kebab, { options: [size('الكمية', [['نصف كيلو', 0], ['كيلو', 50000]])] }],
          ['ريش غنم مشوية', 'Lamb chops', 'ريش غنم طرية مع خضار مشوية وصوص خاص.', 120000, I.ribs],
          ['ستيك لحم مع بطاطا', 'Beef steak', 'ستيك مشويّ حسب الرغبة مع بطاطا مهروسة.', 135000, I.steak, { options: [size('درجة الاستواء', [['نصف استواء', 0], ['متوسط', 0], ['مستوٍ تماماً', 0]])] }]
        ]
      },
      {
        name: 'البرغر والسندويش', nameEn: 'Burgers & sandwiches', image: I.burger,
        items: [
          ['برغر بيت الشام', 'Signature burger', 'لحم بقري ١٨٠غ، شيدر، بصل مكرمل وصوص البيت.', 42000, I.burger, { popular: true, options: [BURGER_EXTRAS] }],
          ['دبل برغر', 'Double burger', 'قطعتا لحم مع جبنة مضاعفة ومخلل.', 58000, I.doubleBurger, { options: [BURGER_EXTRAS] }],
          ['برغر دجاج مقرمش', 'Crispy chicken burger', 'صدر دجاج مقرمش مع كول سلو وصوص حار.', 38000, I.chickenBurger, { options: [BURGER_EXTRAS] }],
          ['شاورما عربي', 'Arabic shawarma', 'شاورما دجاج مقطّعة مع بطاطا وثومية ومخلل.', 30000, I.shawarma, { popular: true }]
        ]
      },
      {
        name: 'البيتزا', nameEn: 'Pizza', image: I.pizza,
        items: [
          ['بيتزا مارغريتا', 'Margherita', 'صلصة طماطم، موزاريلا طازجة وريحان.', 48000, I.pizza, { options: [size('الحجم', [['وسط', 0], ['كبير', 15000], ['عائلي', 28000]])] }],
          ['بيتزا خضار', 'Veggie pizza', 'فليفلة، فطر، زيتون، ذرة وجبنة.', 52000, I.veggiePizza, { options: [size('الحجم', [['وسط', 0], ['كبير', 15000], ['عائلي', 28000]])] }]
        ]
      },
      {
        name: 'الأطباق الرئيسية', nameEn: 'Main dishes', image: I.kabsa,
        items: [
          ['كبسة لحم', 'Lamb kabsa', 'أرز بسمتي بالبهارات مع لحم غنم ومكسرات.', 75000, I.kabsa, { popular: true }],
          ['برياني دجاج', 'Chicken biryani', 'أرز برياني متبّل مع دجاج وزبادي.', 65000, I.biryani],
          ['باستا ثمار البحر', 'Seafood pasta', 'سباغيتي مع قريدس وحبّار بصلصة الطماطم.', 85000, I.seafoodPasta, { new: true }],
          ['بيني أرابياتا', 'Penne arrabbiata', 'بيني بصلصة طماطم حارة وبارميزان.', 40000, I.penne],
          ['سلمون مع أرز', 'Salmon rice bowl', 'فيليه سلمون مشويّ مع أرز وخضار.', 110000, I.salmonBowl]
        ]
      },
      {
        name: 'السلطات والشوربات', nameEn: 'Salads & soups', image: I.fattoush,
        items: [
          ['فتوش', 'Fattoush', 'خضار طازجة، خبز محمّص ودبس رمان.', 22000, I.fattoush, { popular: true }],
          ['سلطة سلمون', 'Salmon salad', 'سلمون مدخّن، خضار ورقية وصوص الليمون.', 48000, I.salmonSalad],
          ['بول صحي', 'Healthy bowl', 'كينوا، حمص، أفوكادو وخضار مشوية.', 36000, I.healthyBowl],
          ['شوربة عدس', 'Lentil soup', 'عدس أحمر مع كمون وليمون وخبز محمّص.', 15000, I.lentilSoup]
        ]
      },
      {
        name: 'الحلويات', nameEn: 'Desserts', image: I.brownie,
        items: [
          ['براونيز مع بوظة', 'Brownie & ice cream', 'براونيز ساخن مع بوظة الفانيلا.', 28000, I.brownie, { popular: true }],
          ['كيك التوت', 'Berry cake', 'كيك إسفنجي بكريمة وتوت طازج.', 26000, I.berryCake],
          ['تشيز كيك بالكأس', 'Cheesecake cup', 'طبقات بسكويت وكريمة جبن وصلصة الشوكولا.', 24000, I.trifle],
          ['بوظة عربية', 'Arabic ice cream', 'بوظة بالقشطة والفستق الحلبي.', 15000, I.iceCream]
        ]
      },
      {
        name: 'المشروبات', nameEn: 'Drinks', image: I.mojito,
        items: [
          ['لاتيه', 'Latte', 'إسبريسو مع حليب مبخّر.', 16000, I.latte, { options: COFFEE_OPTS }],
          ['كابتشينو', 'Cappuccino', 'إسبريسو مع رغوة حليب كثيفة.', 15000, I.cappuccino, { options: COFFEE_OPTS }],
          ['موهيتو', 'Mojito', 'نعناع، ليمون وصودا — بنكهات متعددة.', 20000, I.mojito, { options: [size('النكهة', [['كلاسيك', 0], ['فراولة', 3000], ['باشن فروت', 3000]])] }],
          ['ميلك شيك شوكولا', 'Chocolate milkshake', 'بوظة شوكولا مع حليب وكريمة.', 24000, I.milkshake]
        ]
      }
    ]
  },
  {
    type: 'restaurant',
    slug: 'demo-lilac-cafe',
    name: 'مقهى ليلك',
    nameEn: 'Lilac Café',
    email: 'demo.cafe@shamstores.com',
    owner: 'ريم العطار',
    phone: '0933556677',
    whatsapp: '963933556677',
    address: 'حلب — الفرقان، قرب دوّار الجامعة',
    description: 'قهوةٌ مختصّة وحلوياتٌ منزلية في جلسةٍ هادئة. الطلب من الطاولة أو استلامٌ سريع.',
    descriptionEn: 'Specialty coffee and homemade desserts.',
    instagram: 'https://instagram.com/shamstores',
    logo: img(I.latte, 300),
    cover: img(I.terrace, 1600),
    palette: 'royal',
    design: { preset: 'bold', shell: 'classic', card: 'overlay', nav: 'solid' },
    tables: 8,
    coupon: { code: 'LILAC15', discountType: 'percentage', discountValue: 15 },
    categories: [
      {
        name: 'القهوة', nameEn: 'Coffee', image: I.latte,
        items: [
          ['لاتيه ليلك', 'Lilac latte', 'لاتيه بشراب اللافندر — توقيع المقهى.', 18000, I.latte, { popular: true, new: true, options: COFFEE_OPTS }],
          ['كابتشينو', 'Cappuccino', 'إسبريسو مزدوج مع رغوة حليب.', 15000, I.cappuccino, { options: COFFEE_OPTS }]
        ]
      },
      {
        name: 'مشروبات باردة', nameEn: 'Cold drinks', image: I.mojito,
        items: [
          ['موهيتو فواكه', 'Fruit mojito', 'نعناع، ليمون، وفواكه موسمية.', 20000, I.mojito],
          ['ميلك شيك', 'Milkshake', 'شوكولا، فانيلا أو فراولة.', 22000, I.milkshake, { options: [size('النكهة', [['شوكولا', 0], ['فانيلا', 0], ['فراولة', 0]])] }]
        ]
      },
      {
        name: 'الحلويات', nameEn: 'Desserts', image: I.chocolateCake,
        items: [
          ['كيك الشوكولا', 'Chocolate cake', 'كيك شوكولا بلجيكية بطبقات الغاناش.', 26000, I.chocolateCake, { popular: true }],
          ['وافل بالفواكه', 'Fruit waffle', 'وافل بلجيكي مع فراولة وكريمة.', 24000, I.waffle],
          ['كب كيك', 'Cupcake', 'كب كيك الفانيلا بكريمة الزبدة.', 9000, I.cupcake],
          ['كوكيز', 'Cookies', 'كوكيز بقطع الشوكولا — ٣ قطع.', 12000, I.cookies],
          ['دونات', 'Donuts', 'دونات مزيّنة بنكهات متعددة.', 8000, I.donuts],
          ['كاسات الفراولة', 'Strawberry cups', 'كريمة خفيفة مع فراولة طازجة.', 18000, I.berryCups]
        ]
      },
      {
        name: 'فطور خفيف', nameEn: 'Light breakfast', image: I.breakfastSpread,
        items: [
          ['صينية فطور', 'Breakfast board', 'تشكيلة أجبان، مربّيات، بيض وكرواسون.', 42000, I.breakfastSpread, { popular: true }],
          ['بان كيك', 'Pancakes', 'بان كيك مع عسل وزبدة.', 28000, I.pancakes],
          ['فرنش توست', 'French toast', 'بريوش محمّص مع فواكه.', 30000, I.frenchToast]
        ]
      }
    ]
  },
  {
    type: 'store',
    slug: 'demo-yasmin-boutique',
    name: 'بوتيك ياسمين',
    nameEn: 'Yasmin Boutique',
    email: 'demo.fashion@shamstores.com',
    owner: 'ياسمين الخطيب',
    phone: '0955778899',
    whatsapp: '963955778899',
    address: 'دمشق — الشعلان، شارع الحمرا',
    description: 'أزياءٌ عصرية للنساء والرجال: قطع مختارة بعناية، مقاسات كاملة، وتوصيل لكل المحافظات.',
    descriptionEn: 'Curated modern fashion for women and men.',
    instagram: 'https://instagram.com/shamstores',
    logo: img(I.foldedClothes, 300),
    cover: img(I.clothesRack, 1600),
    palette: 'mono',
    design: { preset: 'minimal', shell: 'boutique', card: 'standard', product: 'split', nav: 'minimal' },
    coupon: { code: 'YASMIN20', discountType: 'percentage', discountValue: 20 },
    categories: [
      {
        name: 'نسائي', nameEn: 'Women', image: I.floralDress,
        items: [
          ['فستان صيفي مورّد', 'Floral summer dress', 'فستان قطني خفيف بطبعة زهور، مناسب للنهار.', 185000, I.floralDress, { popular: true, original: 230000, options: [CLOTH_SIZES] }],
          ['كنزة صوف ناعمة', 'Soft knit sweater', 'كنزة صوف محبوكة بلون كريمي.', 140000, I.knitSweater, { options: [CLOTH_SIZES] }],
          ['بنطال واسع', 'Wide-leg trousers', 'بنطال بقصّة واسعة وخصر عالٍ.', 120000, I.wideTrousers, { options: [CLOTH_SIZES, size('اللون', [['أصفر', 0], ['أسود', 0], ['بيج', 0]])] }]
        ]
      },
      {
        name: 'رجالي', nameEn: 'Men', image: I.bomber,
        items: [
          ['جاكيت بومبر', 'Bomber jacket', 'جاكيت خفيف بسحّاب معدني.', 210000, I.bomber, { popular: true, options: [CLOTH_SIZES] }],
          ['تيشيرت قطني أبيض', 'White cotton tee', 'قطن مصري ١٠٠٪، قصّة مريحة.', 45000, I.whiteTee, { options: [CLOTH_SIZES] }],
          ['تيشيرت أسود', 'Black tee', 'قطن ثقيل بطباعة صغيرة.', 48000, I.blackTee, { options: [CLOTH_SIZES] }],
          ['سويت شيرت', 'Sweatshirt', 'قطن مبطّن بالصوف، مثالي للشتاء.', 95000, I.sweatshirt, { original: 120000, options: [CLOTH_SIZES] }],
          ['تيشيرت كلاسيك', 'Classic tee', 'تيشيرت أساسي بياقة دائرية.', 40000, I.classicTee, { options: [CLOTH_SIZES] }]
        ]
      },
      {
        name: 'أحذية', nameEn: 'Shoes', image: I.redSneaker,
        items: [
          ['حذاء رياضي أحمر', 'Red sneakers', 'خفيف ومريح للمشي اليومي.', 260000, I.redSneaker, { popular: true, options: [SHOE_SIZES] }],
          ['سنيكرز جلد', 'Leather sneakers', 'جلد طبيعي بنعلٍ مطاطي.', 290000, I.leatherSneaker, { options: [SHOE_SIZES] }],
          ['حذاء ركض', 'Running shoes', 'نعلٌ ماصّ للصدمات للجري.', 240000, I.runningShoe, { original: 300000, options: [SHOE_SIZES] }],
          ['حذاء سويد', 'Suede shoes', 'سويد أخضر بتصميم كلاسيكي.', 220000, I.suedeShoe, { options: [SHOE_SIZES] }]
        ]
      },
      {
        name: 'إكسسوارات', nameEn: 'Accessories', image: I.handbag,
        items: [
          ['حقيبة يد حمراء', 'Red handbag', 'جلد صناعي فاخر بحزام قابل للفك.', 175000, I.handbag, { popular: true }],
          ['حقيبة ظهر', 'Backpack', 'مقاومة للماء بجيب للابتوب.', 130000, I.backpack],
          ['محفظة جلد', 'Leather wallet', 'جلد طبيعي بثمانية جيوب للبطاقات.', 65000, I.wallet],
          ['نظارة دائرية', 'Round glasses', 'إطار معدني وعدسات حماية UV400.', 80000, I.roundGlasses],
          ['نظارة شمسية', 'Sunglasses', 'إطار أسود كلاسيكي.', 75000, I.sunglasses, { original: 95000 }]
        ]
      }
    ]
  },
  {
    type: 'store',
    slug: 'demo-techzone',
    name: 'تك زون',
    nameEn: 'Tech Zone',
    email: 'demo.electronics@shamstores.com',
    owner: 'مازن درويش',
    phone: '0966112233',
    whatsapp: '963966112233',
    address: 'حمص — شارع الدبلان',
    description: 'هواتف، حواسيب وإكسسوارات أصلية بكفالة سنة. تقسيط وتوصيل سريع.',
    descriptionEn: 'Original phones, laptops and accessories with warranty.',
    instagram: 'https://instagram.com/shamstores',
    logo: img(I.headphonesPro, 300),
    cover: img(I.laptopPro, 1600),
    palette: 'ocean',
    design: { preset: 'bold', shell: 'showcase', card: 'standard', product: 'immersive', nav: 'solid' },
    coupon: { code: 'TECH5', discountType: 'percentage', discountValue: 5 },
    categories: [
      {
        name: 'هواتف', nameEn: 'Phones', image: I.phone,
        items: [
          ['آيفون ١٥', 'iPhone 15', 'شاشة ٦٫١ إنش، كاميرا ٤٨ ميغابكسل، كفالة سنة.', 11500000, I.phone, { popular: true, options: [size('السعة', [['128GB', 0], ['256GB', 1200000], ['512GB', 2800000]])] }],
          ['آيفون ١٤ برو', 'iPhone 14 Pro', 'شاشة ProMotion وثلاث كاميرات.', 10200000, I.phonePro, { original: 11000000, options: [size('السعة', [['128GB', 0], ['256GB', 1200000]])] }]
        ]
      },
      {
        name: 'حواسيب', nameEn: 'Laptops', image: I.laptop,
        items: [
          ['لابتوب للأعمال', 'Business laptop', 'معالج i7، ذاكرة 16GB، SSD 512GB.', 9800000, I.laptop, { options: [size('الذاكرة', [['16GB', 0], ['32GB', 900000]])] }],
          ['ماك بوك إير', 'MacBook Air', 'شريحة M2، بطارية ١٨ ساعة.', 14500000, I.laptopPro, { popular: true }]
        ]
      },
      {
        name: 'صوتيات', nameEn: 'Audio', image: I.headphones,
        items: [
          ['سماعات لاسلكية', 'Wireless headphones', 'عزل ضوضاء نشط، بطارية ٣٠ ساعة.', 1650000, I.headphonesPro, { popular: true }],
          ['سماعات رأس', 'Over-ear headphones', 'صوت نقي وجهير عميق.', 850000, I.headphones, { original: 1100000 }],
          ['سماعات أذن', 'Earbuds', 'مقاومة للماء مع علبة شحن.', 690000, I.earbuds]
        ]
      },
      {
        name: 'ساعات ذكية', nameEn: 'Smart watches', image: I.smartWatch,
        items: [
          ['ساعة ذكية', 'Smart watch', 'قياس النبض والنوم، إشعارات الهاتف.', 3200000, I.smartWatch, { popular: true, options: [size('المقاس', [['41mm', 0], ['45mm', 300000]])] }],
          ['ساعة رياضية', 'Sport watch', 'GPS ومقاومة للماء حتى ٥٠ متراً.', 1400000, I.sportWatch]
        ]
      },
      {
        name: 'شاشات وكاميرات', nameEn: 'TVs & cameras', image: I.tv,
        items: [
          ['شاشة سمارت ٥٥ إنش', 'Smart TV 55"', 'دقة 4K ونظام أندرويد.', 6900000, I.tv, { original: 7800000 }],
          ['كاميرا فورية', 'Instant camera', 'تطبع الصورة فوراً — ١٠ أوراق هدية.', 1250000, I.instantCamera]
        ]
      }
    ]
  },
  {
    type: 'store',
    slug: 'demo-lamsa-beauty',
    name: 'لمسة للعطور والتجميل',
    nameEn: 'Lamsa Beauty',
    email: 'demo.beauty@shamstores.com',
    owner: 'لينا الشامي',
    phone: '0988445566',
    whatsapp: '963988445566',
    address: 'اللاذقية — شارع ٨ آذار',
    description: 'عطورٌ أصلية ومستحضرات عناية وتجميل مختارة — تغليف هدايا مجاني.',
    descriptionEn: 'Original perfumes, skincare and makeup.',
    instagram: 'https://instagram.com/shamstores',
    logo: img(I.classicPerfume, 300),
    cover: img(I.facial, 1600),
    palette: 'rose',
    design: { preset: 'modern', shell: 'landing', card: 'overlay', product: 'classic', nav: 'floating' },
    coupon: { code: 'LAMSA10', discountType: 'percentage', discountValue: 10 },
    categories: [
      {
        name: 'عطور', nameEn: 'Perfumes', image: I.classicPerfume,
        items: [
          ['عطر كلاسيك', 'Classic perfume', 'زهري دافئ بلمسة مسك — يدوم طويلاً.', 1350000, I.classicPerfume, { popular: true, options: [size('الحجم', [['50ml', 0], ['100ml', 450000]])] }],
          ['عطر نوار', 'Noir perfume', 'خشبي شرقي للمساء.', 1480000, I.noirPerfume, { options: [size('الحجم', [['50ml', 0], ['100ml', 450000]])] }]
        ]
      },
      {
        name: 'عناية بالبشرة', nameEn: 'Skincare', image: I.skincare,
        items: [
          ['كريم مرطّب يومي', 'Daily moisturizer', 'بحمض الهيالورونيك للبشرة الجافة.', 185000, I.skincare, { popular: true, original: 220000 }]
        ]
      },
      {
        name: 'مكياج', nameEn: 'Makeup', image: I.palette,
        items: [
          ['باليت ظلال عيون', 'Eyeshadow palette', '١٢ لوناً مطفياً ولامعاً.', 240000, I.palette, { popular: true }],
          ['طقم فرش مكياج', 'Makeup brushes set', '١٠ فرش ناعمة مع حقيبة.', 160000, I.brushes]
        ]
      }
    ]
  }
];

// ===== طلبات العرض =====
const CUSTOMERS = [
  ['أحمد الخطيب', '0932111222'], ['نور حداد', '0944333555'], ['محمد العلي', '0955666777'], ['سارة يوسف', '0966888999'],
  ['خالد النجار', '0933222444'], ['ليلى حسن', '0988111000'], ['عمر السيد', '0999555333'], ['هبة منصور', '0947123987']
];
const STATUS_MIX = ['pending', 'pending', 'preparing', 'ready', 'delivered', 'delivered', 'served', 'delivered', 'cancelled', 'delivered', 'served', 'preparing'];
const pick = (arr, i) => arr[i % arr.length];

const sku = (slug, i) => `${slug.replace('demo-', '').toUpperCase().replace(/-/g, '').slice(0, 6)}-${String(i + 1).padStart(3, '0')}`;

async function createBusiness(b, planId, passwordHash) {
  const isRestaurant = b.type === 'restaurant';
  const now = new Date();
  const yearLater = new Date(now.getTime() + 365 * 86400000);

  const user = await prisma.user.create({
    data: { name: b.owner, email: b.email, password: passwordHash, role: 'owner', phone: b.phone, isEmailVerified: true, isActive: true }
  });

  const common = {
    planId,
    name: b.name,
    nameEn: b.nameEn,
    slug: b.slug,
    subdomain: b.slug,
    email: b.email,
    phone: b.phone,
    whatsapp: b.whatsapp,
    address: b.address,
    description: b.description,
    descriptionEn: b.descriptionEn,
    instagram: b.instagram,
    logo: b.logo,
    coverImage: b.cover,
    userId: user.id,
    timezone: 'Asia/Damascus',
    currency: 'SYP',
    storefrontDesign: b.design,
    subscriptionStart: now,
    subscriptionEnd: yearLater,
    ...colors(b.palette)
  };
  const biz = isRestaurant ? await prisma.restaurant.create({ data: common }) : await prisma.store.create({ data: common });
  await prisma.user.update({ where: { id: user.id }, data: isRestaurant ? { restaurantId: biz.id } : { storeId: biz.id } });

  const items = [];
  let n = 0;
  for (const [ci, cat] of b.categories.entries()) {
    const category = await prisma.category.create({
      data: {
        name: cat.name,
        nameEn: cat.nameEn,
        image: img(cat.image, 600),
        position: ci,
        ...(isRestaurant ? { restaurantId: biz.id } : { storeId: biz.id })
      }
    });
    for (const [pi, [name, nameEn, description, price, image, extra = {}]] of cat.items.entries()) {
      const shared = {
        name,
        nameEn,
        description,
        price,
        originalPrice: extra.original || null,
        options: extra.options || undefined,
        isPopular: !!extra.popular,
        isAvailable: true,
        categoryId: category.id
      };
      const created = isRestaurant
        ? await prisma.menuItem.create({
            data: { ...shared, restaurantId: biz.id, image: img(image), isNew: !!extra.new, position: pi, preparationTime: 15, ordersCount: extra.popular ? 40 + pi * 7 : 8 + pi * 3 }
          })
        : await prisma.product.create({
            data: {
              ...shared,
              storeId: biz.id,
              sku: sku(b.slug, n),
              imageUrl: img(image),
              images: [img(image)],
              stock: pi === 1 && ci === 0 ? 3 : 12 + ((n * 7) % 30),
              sortOrder: n,
              ordersCount: extra.popular ? 25 + pi * 5 : 4 + pi * 2,
              ratingAvg: extra.popular ? 4.8 : 4.4,
              ratingCount: extra.popular ? 36 : 11
            }
          });
      items.push(created);
      n++;
    }
  }

  if (isRestaurant) {
    for (let t = 1; t <= b.tables; t++) {
      await prisma.table.create({ data: { restaurantId: biz.id, name: `طاولة ${t}`, seats: t % 3 === 0 ? 6 : 4, sortOrder: t } });
    }
  }

  await prisma.coupon.create({
    data: { ...b.coupon, isActive: true, ...(isRestaurant ? { restaurantId: biz.id } : { storeId: biz.id }) }
  });

  // اثنا عشر طلباً على مدى سبعة أيام — تمتلئ الرئيسية والرسم وشاشة الطلبات
  const tables = isRestaurant ? await prisma.table.findMany({ where: { restaurantId: biz.id }, select: { id: true } }) : [];
  const code = b.slug.replace('demo-', '').replace(/-/g, '').slice(0, 6).toUpperCase();
  for (let o = 0; o < 12; o++) {
    const [customerName, customerPhone] = pick(CUSTOMERS, o + b.slug.length);
    const lines = [pick(items, o * 3), pick(items, o * 5 + 1)].map((it, k) => ({ it, qty: k === 0 ? 1 + (o % 2) : 1 }));
    const subtotal = lines.reduce((s, l) => s + l.it.price * l.qty, 0);
    const deliveryFee = isRestaurant && o % 3 !== 0 ? 0 : 10000;
    const createdAt = new Date(now.getTime() - (o % 7) * 86400000 - (o * 97 % 600) * 60000);
    const status = pick(STATUS_MIX, o);
    const orderType = isRestaurant ? (o % 3 === 0 ? 'delivery' : 'dine_in') : 'delivery';
    await prisma.order.create({
      data: {
        orderNumber: `ORD-D${code}-${String(o + 1).padStart(2, '0')}`,
        ...(isRestaurant ? { restaurantId: biz.id } : { storeId: biz.id }),
        ...(orderType === 'dine_in' && tables.length ? { tableId: pick(tables, o).id } : {}),
        customerName,
        customerPhone,
        status,
        orderType,
        paymentMethod: o % 4 === 0 ? 'sham_cash' : 'cash',
        isPaid: ['delivered', 'served'].includes(status),
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        deliveryAddress: orderType === 'delivery' ? b.address.split('—')[0].trim() + ' — عنوان الزبون' : null,
        createdAt,
        items: {
          create: lines.map(({ it, qty }) => ({
            quantity: qty,
            price: it.price,
            ...(isRestaurant ? { menuItemId: it.id } : { productId: it.id })
          }))
        }
      }
    });
  }

  return { biz, items: items.length };
}

async function removeBusiness(b) {
  const isRestaurant = b.type === 'restaurant';
  const biz = isRestaurant
    ? await prisma.restaurant.findUnique({ where: { slug: b.slug }, select: { id: true } })
    : await prisma.store.findUnique({ where: { slug: b.slug }, select: { id: true } });
  const key = isRestaurant ? 'restaurantId' : 'storeId';
  if (biz) {
    const orders = await prisma.order.findMany({ where: { [key]: biz.id }, select: { id: true } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orders.map((o) => o.id) } } });
    await prisma.order.deleteMany({ where: { [key]: biz.id } });
    await prisma.coupon.deleteMany({ where: { [key]: biz.id } });
    if (isRestaurant) {
      await prisma.menuItem.deleteMany({ where: { restaurantId: biz.id } });
      await prisma.table.deleteMany({ where: { restaurantId: biz.id } });
    } else {
      await prisma.inventoryMovement.deleteMany({ where: { product: { storeId: biz.id } } });
      await prisma.productReview.deleteMany({ where: { product: { storeId: biz.id } } });
      await prisma.product.deleteMany({ where: { storeId: biz.id } });
    }
    await prisma.category.updateMany({ where: { [key]: biz.id }, data: { parentId: null } });
    await prisma.category.deleteMany({ where: { [key]: biz.id } });
    await prisma.user.updateMany({ where: { [key]: biz.id }, data: { [key]: null } });
    if (isRestaurant) await prisma.restaurant.delete({ where: { id: biz.id } });
    else await prisma.store.delete({ where: { id: biz.id } });
  }
  await prisma.user.deleteMany({ where: { email: b.email } });
}

(async () => {
  try {
    const plan =
      (await prisma.plan.findFirst({ where: { name: 'enterprise' } })) ||
      (await prisma.plan.findFirst({ orderBy: { price: 'desc' } }));
    if (!plan) throw new Error('لا خطط في القاعدة — شغّل بذر الخطط أولاً');

    console.log(APPLY ? `تنفيذ${RESET ? ' مع إعادة الإنشاء' : ''}:` : 'معاينة (بلا كتابة — أضف --apply للتنفيذ):');
    console.log(`الخطة: ${plan.name}\n`);

    const passwordHash = APPLY ? await bcrypt.hash(DEMO_PASSWORD, 10) : '';

    for (const b of BUSINESSES) {
      const existing =
        b.type === 'restaurant'
          ? await prisma.restaurant.findUnique({ where: { slug: b.slug }, select: { id: true } })
          : await prisma.store.findUnique({ where: { slug: b.slug }, select: { id: true } });
      const emailTaken = await prisma.user.findUnique({ where: { email: b.email }, select: { id: true } });
      const count = b.categories.reduce((s, c) => s + c.items.length, 0);
      const label = `${b.type === 'restaurant' ? 'مطعم' : 'متجر'} «${b.name}» /${b.slug} — ${b.categories.length} فئات، ${count} ${b.type === 'restaurant' ? 'طبقاً' : 'منتجاً'}`;

      if ((existing || emailTaken) && !RESET) {
        console.log(`• موجود — تُخطّي: ${label}`);
        continue;
      }
      if (!APPLY) {
        console.log(`• ${existing ? 'سيُعاد إنشاء' : 'سيُنشأ'}: ${label}`);
        continue;
      }
      if (existing || emailTaken) await removeBusiness(b);
      const { items } = await createBusiness(b, plan.id, passwordHash);
      console.log(`✓ أُنشئ: ${label} (${items} عنصراً، ١٢ طلباً)`);
    }

    console.log(`\nالدخول: البريد أعلاه، وكلمة المرور ${DEMO_PASSWORD}`);
    BUSINESSES.forEach((b) => console.log(`  ${b.email}  →  ${b.slug}`));
  } catch (err) {
    console.error('✗', err.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
