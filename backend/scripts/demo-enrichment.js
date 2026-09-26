// backend/scripts/demo-enrichment.js
//
// إثراء حسابات العرض بعد إنشائها: محتوى تسويقي (بانرات، عروض، إعلان)،
// وصور متعدّدة لكل منتج وصنف، وربط قيم «اللون» بصورها، وحسوماتٌ تملأ
// قسم «الحسومات» في الواجهة.
//
// **منفصلٌ عن seed-demo-businesses.js لأنه يعمل على أنشطةٍ موجودة أصلاً.**
// أنشطة العرض منشورةٌ في الإنتاج ويُرسل روابطها لعملاء، فحذفها وإعادة
// إنشائها (--reset) يُبطل كل رابطٍ أُرسل ويمسح طلبات العرض. الإثراء يضيف
// ولا يحذف، ويمكن تكراره بلا أثرٍ مضاعف:
//   • الصور تُدمج بلا تكرار — الغلاف يبقى أولاً فلا تتغيّر البطاقات.
//   • قيم اللون تُضاف مجموعةً في آخر الخيارات إن لم توجد، وإلا تُربط صورها.
//   • الحسم يُكتب فقط إن لم يكن للمنتج سعرٌ أصليّ أعلى — لا يُراكَم.
//   • الأقسام التسويقية تُعرَّف بعنوانها: موجودٌ يُحدَّث، ومفقودٌ يُنشأ.
//
// الصور من Unsplash، فُحص كل رابط (HTTP 200) ونُظر إلى كل صورة قبل
// اختيارها. الاستعلامات متتالية لا متوازية: قاعدة الإنتاج تتّسع لعشرة
// اتصالات فقط.

const img = (id, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;
const wide = (id) => img(id, 1600);

// ===== صورٌ إضافية — كلها فُحصت =====
const P = {
  // مطبخ
  pizzaBasil: '1574071318508-1cdbab80d002',
  pizzaClose: '1571997478779-2adcbbe9ab2f',
  pizzaSlices: '1590947132387-155cc02f3212',
  pizzaGreens: '1593560708920-61dd98c46a4e',
  pizzaTomato: '1595854341625-f33ee10dbf94',
  pizzaSausage: '1604382354936-07c5d9983bd3',
  burgerSalad: '1512152272829-e3139592d56f',
  burgerBacon: '1550317138-10000687a72b',
  burgerBasket: '1551782450-a2132b4ba21d',
  burgerStack: '1553979459-d2229ba7433b',
  burgerFries: '1561758033-d89a9ad46330',
  burgerClassic: '1571091718767-18b5b1457add',
  burgerDouble: '1572802419224-296b0aeee0d9',
  burgerDark: '1586190848861-99aa4a171e90',
  burgerRustic: '1596662951482-0c4ba74a6df6',
  ribsBoard: '1529193591184-b1d58069ecdd',
  steakFork: '1529692236671-f1f6cf9683ba',
  steakSliced: '1558030006-450675393462',
  steakFries: '1600891964092-4316c288032e',
  shawarmaPlate: '1561651823-34feb02250e4',
  chickenBreast: '1598515214211-89d3c73ae83b',
  kebabSkewers: '1603360946369-dc9bb6258143',
  chickenTikka: '1604908176997-125f25cc6f3d',
  chickenLegs: '1610057099443-fde8c4d50f91',
  shawarmaWrap: '1633321702518-7feccafb94d5',
  bowtiePasta: '1473093295043-cdd812d0e601',
  riceLemon: '1512058564366-18510be2db19',
  tomatoSoup: '1547592166-23ac45744acd',
  veggiePlate: '1547592180-85f173990554',
  fettuccine: '1551183053-bf91a1d81141',
  pennePlate: '1555949258-eb67b1ef0ceb',
  biryaniPot: '1563379091339-03b21ab4a4f8',
  biryaniPlate: '1589302168068-964664d93dc0',
  pumpkinSoup: '1604152135912-04a022e23696',
  carbonara: '1612874742237-6526221588e3',
  salmonPlate: '1467003909585-2f8a72700288',
  jarSalad: '1505576399279-565b52d4ac71',
  chickpeaBowl: '1511690656952-34342bb7c2f2',
  colorSalad: '1540420773420-3366772f4999',
  tomatoSalad: '1592417817098-8fd3d9eb14a5',
  subSandwich: '1509722747041-616f39b57569',
  berryLemonade: '1497534446932-c925b458314e',
  mojitoGlass: '1513558161293-cdaf765ed2fd',
  orangeJuice: '1534353473418-4cfa6c56fd38',
  freakshake: '1541658016709-82535e94bc69',
  cocktails: '1551024709-8f23befc6f87',
  oreoShake: '1572490122747-3968b75cc699',
  strawberryShake: '1579954115545-a95591f28bfc',
  cappuccinoBlue: '1485808191679-5f86510681a2',
  espressoTools: '1497935586351-b67a49e012bf',
  latteCup: '1534778101976-62847782c213',
  lattePour: '1541167760496-1628856ab772',
  latteGlass: '1570968915860-54d5c301fa9f',
  latteTop: '1572442388796-11668a67e53d',
  icedLatte: '1578314675249-a6910f80cc4e',
  waffleBerries: '1459789034005-ba29c5783491',
  sprinkleCake: '1464349095431-e9a21285b5f3',
  mintCupcakes: '1486427944299-d1955d23e34d',
  popsicles: '1488900128323-21503983a07e',
  cookiesClose: '1499636136210-6f4ee915583e',
  iceCreamCones: '1501443762994-82bd5dace89a',
  donutsMix: '1527515545081-5db817172677',
  pinkDonuts: '1533910534207-90f31029a78e',
  strawberryCake: '1535141192574-5d4897c12636',
  donutStack: '1551106652-a5bcf4b29ab6',
  wafflesPlain: '1562376552-0d160a2f238d',
  layerCake: '1571115177098-24ec42ed204d',
  tiramisu: '1571877227200-a0d98ea607e9',
  chocoCupcake: '1587668178277-295251f900ce',
  krispies: '1590080875515-8a3a8dc5735e',
  cherryCupcake: '1599785209707-a456fc1337bb',
  brownieStack: '1606313564200-e75d5e30476c',
  chocoBark: '1607920591413-4ec007e70023',
  redVelvet: '1614707267537-b85aaf00c4b7',
  breakfastBowl: '1494390248081-4e521a5940db',
  breakfastTable: '1504754524776-8f4f37790ca0',
  pancakeBerries: '1506084868230-bb9d95c24759',
  eggToast: '1525351484163-7529414344d8',
  pancakeRed: '1528207776546-365bb710ee93',
  avocadoEgg: '1541519227354-08fa5d50c44d',
  pancakeSyrup: '1554520735-0a6b8b6ce8b7',
  avocadoSlices: '1588137378633-dea1336ce1e2',
  // أزياء
  dressWhite: '1515372039744-b8f02a3ae446',
  dressBlue: '1539008835657-9e8e9680c956',
  dressRedFloral: '1572804013309-59a88b7e92f1',
  orangeSweater: '1578587018452-892bacefd3f2',
  blackTeeSkull: '1503341504253-dff4815485f1',
  whiteTeeClose: '1529374255404-311a2a4f1fd9',
  denimJacket: '1544923246-77307dd654cb',
  redHoodie: '1548126032-079a0fb0099d',
  leatherJacket: '1551028719-00167b16eac5',
  greyHoodie: '1556821840-3a63f95609a7',
  teeColors: '1562157873-818bc0726f68',
  printedTee: '1576566588028-4147f3842f27',
  blackTeeHanger: '1583743814966-8936f5b7be1a',
  blackTeePrint: '1618354691438-25bc04584c23',
  whiteTeeFlat: '1620799139507-2a76f79a2f4d',
  greySweatpants: '1506629082955-511b1aa562c8',
  stripedTrousers: '1509631179647-0177331693ae',
  beigeTrousers: '1594633312681-425c7b97ccd1',
  sneakerOnFoot: '1460353581641-37baddab0fa2',
  whiteHighTops: '1512374382149-233c42b6a83b',
  burgundyLow: '1525966222134-fcfa99b8ae77',
  blackLeatherSneaker: '1543508282-6319a3e2621f',
  brownSneakerSide: '1549298916-f52d724204b4',
  redBlackHighs: '1556906781-9a412961c28c',
  whiteOrangeRunner: '1600185365926-3a2ce3cdb9eb',
  whiteLeatherSneaker: '1600269452121-4f2416e55c28',
  voltRunner: '1606107557195-0e29a4b5b4aa',
  whiteCourtShoe: '1608231387042-66d1773070a5',
  sunglassesBeach: '1473496169904-658ba7c44d8a',
  sunglassesLight: '1508296695146-257a814070b4',
  sunglassesCase: '1509695507497-903c140c43b0',
  backpackOlive: '1547949003-9792a18a2601',
  bagQuilted: '1548036328-c9fa89d128fa',
  bagPink: '1566150905458-1bf1fc113f0d',
  clearGlasses: '1574258495973-f010dfbb5371',
  sunglassesSand: '1577803645773-f96470509666',
  backpackBlack: '1581605405669-fcdf81165afa',
  bagTeal: '1594223274512-ad4803739b7c',
  walletHand: '1606503825008-909a67e63c3d',
  backpackLeather: '1622560480605-d83c853bc5c3',
  backpackLeatherSide: '1622560480654-d96214fdc887',
  // إلكترونيات
  phoneFront: '1580910051074-3eb694886505',
  phoneWhite: '1591337676887-a217a6970a8a',
  phoneProGrey: '1592750475338-74b7b21085ab',
  phoneProSilver: '1574944985070-8f3ebc6b79d2',
  phoneGreen: '1616348436168-de43ad0db179',
  phonesPair: '1663499482523-1c0c1bae4ce1',
  phoneBlue: '1678652197831-2d180705cd2c',
  laptopCafe: '1484788984921-03950022c9ef',
  laptopGlow: '1525547719571-a2d4ac8945e2',
  macbookDesk: '1541807084-5c52b6b3adef',
  laptopDell: '1588872657578-7efd1f1555ed',
  laptopXps: '1593642632823-8f785ba67e45',
  macbookSilver: '1611186871348-b1ce696e52c9',
  headphonesSilver: '1484704849700-f032a568e944',
  headphonesDark: '1487215078519-e21cc028cb29',
  headphonesGrey: '1546435770-a3e426bf472b',
  headphonesWired: '1572536147248-ac59a8abfa4b',
  earbudsCases: '1590658268037-6bf12165a8df',
  earbudsBlack: '1598331668826-20cecc596b86',
  earbudsWhite: '1600294037681-c80b4cb5b434',
  headphonesPink: '1613040809024-b4ef7ba99bc3',
  headphonesBlack: '1618366712010-f4ae9c647dcb',
  smartWatchWrist: '1434493789847-2f02dc6ca35d',
  watchBlackDial: '1508685096489-7aacd43bd3b1',
  smartWatchBlack: '1551816230-ef5deaed4a26',
  fitnessBand: '1575311373937-040b8e1fd5b6',
  smartWatchWhite: '1579586337278-3befd40fd17a',
  squareWatch: '1617043786394-f977fa12eddf',
  tvRoom: '1461151304267-38535e780c79',
  instaxCamera: '1495707902641-75cac588d2e9',
  silverCamera: '1510127034890-ba27508e9f1c',
  tvRemote: '1522869635100-9f4c5e86aa37',
  tvSmartUi: '1593784991095-a205069470b6',
  // تجميل
  perfumeBlue: '1523293182086-7651a899d37f',
  perfumeGold: '1588405748880-12d1d2a59f75',
  perfumeRoses: '1592945403244-b3fbafd7f539',
  perfumeNoir: '1594035910387-fea47794261f',
  perfumeShelf: '1615634260167-c8cdede054de',
  perfumeWhite: '1619994403073-2cec844b8e63',
  makeupModel: '1487412947147-5cebf100ffc2',
  makeupFlatlay: '1512496015851-a90fb38ba796',
  brushesFlatlay: '1522338242992-e1a54906a8da',
  skincareSet: '1571781926291-c477ebfd024b',
  paletteHand: '1583241800698-e8ab01830a07',
  paletteOpen: '1596704017254-9b121068fb31',
  skincareFlatlay: '1598440947619-2c35fc9aa908',
  creamTube: '1620916566398-39f1143ab7be',
  // بانرات
  tableFlatlay: '1424847651672-bf20a4b0982b',
  shopInterior: '1441986300917-64674bd600d8',
  clothesRackBeige: '1445205170230-053b83016050',
  techFlatlay: '1468495244123-6c6c332eeece',
  shoppingBags: '1483985988355-763728e1935b',
  clothesHangers: '1490481651871-ab68de25d43d',
  cafeSign: '1501339847302-ac426a4a7cbb',
  restaurantInterior: '1517248135467-4c7edcad34c4',
  workDesk: '1519389950473-47ba0277781c',
  cafeInterior: '1554118811-1e0d58224f24',
  knitRack: '1558769132-cb1aea458c5e',
  makeupFlowers: '1571875257727-256c39da42af'
};

// صور العرض الأصلية المستعملة هنا — من seed-demo-businesses.js
const O = {
  eggsBreakfast: '1533089860892-a7c6f0a88666',
  breakfastSpread: '1519676867240-f03562e64548',
  berryCups: '1488477181946-6428a0291777',
  salmonSalad: '1546069901-ba9599a7e63c',
  healthyBowl: '1512621776951-a57141f2eefd',
  dessertDonuts: '1551024601-bec78aea704b',
  grillTawook: '1555939594-58d7cb561ad1',
  latte: '1509042239860-f550ce710b93',
  laptopPro: '1517336714731-489689fd1ca8',
  headphonesPro: '1583394838336-acd977736f90',
  floralDress: '1496747611176-843222e1e57c',
  knitSweater: '1434389677669-e08b4cac3105',
  wideTrousers: '1515886657613-9f3515b0c78f',
  bomber: '1591047139829-d91aecb6caea',
  sweatshirt: '1620799140408-edc6dcb6d633',
  leatherSneaker: '1549298916-b41d501d3772',
  runningShoe: '1491553895911-0055eca6402d',
  backpack: '1553062407-98eeb64c6a62',
  phonePro: '1592899677977-9c10ca588bbd',
  classicPerfume: '1541643600914-78b084683601',
  noirPerfume: '1585386959984-a4155224a1ad'
};

/**
 * لكل منتجٍ/صنف (بالاسم الإنجليزي — ثابتٌ في البذر ولا يعرضه التاجر عادةً):
 *   extra    صورٌ تُضاف بعد الغلاف
 *   colors   قيم «اللون» وصورها — تُربط بالقيم الموجودة أو تُنشأ مجموعةً
 *   discount نسبة السعر الأصلي إلى الحالي (1.2 = حسمٌ نحو 17%)
 */
const ITEMS = {
  'demo-bayt-alsham': {
    'Shami breakfast': { extra: [P.breakfastTable, O.breakfastSpread, P.eggToast] },
    'Avocado toast': { extra: [P.avocadoSlices, P.avocadoEgg] },
    'Honey pancakes': { extra: [P.pancakeBerries, P.pancakeRed, P.pancakeSyrup] },
    'French toast': { extra: [P.breakfastTable, O.berryCups] },
    'Shish tawook': { extra: [P.kebabSkewers, P.chickenTikka, P.chickenBreast] },
    'Aleppo kebab': { extra: [P.kebabSkewers, P.shawarmaPlate] },
    'Lamb chops': { extra: [P.ribsBoard, P.chickenLegs] },
    'Beef steak': { extra: [P.steakFork, P.steakSliced, P.steakFries] },
    'Signature burger': { extra: [P.burgerClassic, P.burgerBasket, P.burgerRustic], discount: 1.2 },
    'Double burger': { extra: [P.burgerStack, P.burgerDouble, P.burgerBacon] },
    'Crispy chicken burger': { extra: [P.burgerDark, P.burgerFries] },
    'Arabic shawarma': { extra: [P.shawarmaWrap, P.shawarmaPlate, P.subSandwich], discount: 1.2 },
    Margherita: { extra: [P.pizzaBasil, P.pizzaTomato, P.pizzaClose], discount: 1.15 },
    'Veggie pizza': { extra: [P.pizzaGreens, P.pizzaSlices, P.pizzaSausage] },
    'Lamb kabsa': { extra: [P.riceLemon, P.biryaniPlate], discount: 1.15 },
    'Chicken biryani': { extra: [P.biryaniPot, P.biryaniPlate] },
    'Seafood pasta': { extra: [P.carbonara, P.fettuccine] },
    'Penne arrabbiata': { extra: [P.pennePlate, P.bowtiePasta] },
    'Salmon rice bowl': { extra: [P.salmonPlate, O.salmonSalad] },
    Fattoush: { extra: [P.tomatoSalad, P.colorSalad] },
    'Salmon salad': { extra: [P.salmonPlate, O.healthyBowl] },
    'Healthy bowl': { extra: [P.chickpeaBowl, P.veggiePlate, P.jarSalad] },
    'Lentil soup': { extra: [P.pumpkinSoup, P.tomatoSoup] },
    'Brownie & ice cream': { extra: [P.brownieStack, P.chocoBark] },
    'Berry cake': { extra: [P.strawberryCake, P.sprinkleCake] },
    'Cheesecake cup': { extra: [P.tiramisu, P.layerCake] },
    'Arabic ice cream': { extra: [P.iceCreamCones, P.popsicles] },
    Latte: { extra: [P.latteCup, P.lattePour, P.latteGlass] },
    Cappuccino: { extra: [P.cappuccinoBlue, P.latteTop, P.espressoTools] },
    Mojito: { extra: [P.mojitoGlass, P.berryLemonade, P.cocktails] },
    'Chocolate milkshake': { extra: [P.oreoShake, P.freakshake] }
  },
  'demo-lilac-cafe': {
    'Lilac latte': { extra: [P.lattePour, P.latteGlass, P.icedLatte], discount: 1.2 },
    Cappuccino: { extra: [P.cappuccinoBlue, P.latteTop, P.espressoTools] },
    'Fruit mojito': { extra: [P.berryLemonade, P.cocktails, P.orangeJuice] },
    Milkshake: { extra: [P.strawberryShake, P.oreoShake, P.freakshake] },
    'Chocolate cake': { extra: [P.chocoCupcake, P.chocoBark, P.layerCake], discount: 1.2 },
    'Fruit waffle': { extra: [P.waffleBerries, P.wafflesPlain], discount: 1.2 },
    Cupcake: { extra: [P.cherryCupcake, P.mintCupcakes, P.redVelvet] },
    Cookies: { extra: [P.cookiesClose, P.krispies] },
    Donuts: { extra: [P.pinkDonuts, P.donutsMix, P.donutStack] },
    'Strawberry cups': { extra: [P.strawberryCake, P.popsicles] },
    'Breakfast board': { extra: [P.breakfastTable, P.breakfastBowl, O.eggsBreakfast] },
    Pancakes: { extra: [P.pancakeBerries, P.pancakeSyrup] },
    'French toast': { extra: [P.waffleBerries, P.pancakeRed] }
  },
  'demo-yasmin-boutique': {
    'Floral summer dress': {
      extra: [P.dressRedFloral, P.dressBlue],
      colors: [['أبيض مورّد', O.floralDress], ['أحمر مورّد', P.dressRedFloral], ['أزرق سماوي', P.dressBlue]]
    },
    'Soft knit sweater': {
      extra: [P.orangeSweater, P.knitRack],
      colors: [['كريمي', O.knitSweater], ['برتقالي', P.orangeSweater]],
      discount: 1.25
    },
    'Wide-leg trousers': {
      extra: [P.stripedTrousers, P.beigeTrousers, P.greySweatpants],
      colors: [['أصفر', O.wideTrousers], ['أسود', P.stripedTrousers], ['بيج', P.beigeTrousers]]
    },
    'Bomber jacket': {
      extra: [P.leatherJacket, P.denimJacket],
      colors: [['نحاسي', O.bomber], ['أسود', P.leatherJacket], ['أزرق جينز', P.denimJacket]]
    },
    'White cotton tee': { extra: [P.whiteTeeFlat, P.whiteTeeClose] },
    'Black tee': { extra: [P.blackTeeHanger, P.blackTeePrint, P.blackTeeSkull] },
    Sweatshirt: {
      extra: [P.greyHoodie, P.redHoodie],
      colors: [['أبيض', O.sweatshirt], ['رمادي', P.greyHoodie], ['أحمر', P.redHoodie]]
    },
    'Classic tee': { extra: [P.teeColors, P.printedTee] },
    'Red sneakers': { extra: [P.burgundyLow, P.redBlackHighs] },
    'Leather sneakers': {
      extra: [P.brownSneakerSide, P.whiteLeatherSneaker, P.blackLeatherSneaker],
      colors: [['بني', O.leatherSneaker], ['أبيض', P.whiteLeatherSneaker], ['أسود', P.blackLeatherSneaker]]
    },
    'Running shoes': {
      extra: [P.voltRunner, P.whiteOrangeRunner, P.sneakerOnFoot],
      colors: [['أسود', O.runningShoe], ['فسفوري', P.voltRunner], ['أبيض وبرتقالي', P.whiteOrangeRunner]]
    },
    'Suede shoes': { extra: [P.whiteCourtShoe, P.whiteHighTops] },
    'Red handbag': { extra: [P.bagTeal, P.bagPink, P.bagQuilted] },
    Backpack: {
      extra: [P.backpackBlack, P.backpackLeather, P.backpackLeatherSide],
      colors: [['كحلي', O.backpack], ['أسود', P.backpackBlack], ['بني جلد', P.backpackLeather]],
      discount: 1.2
    },
    'Leather wallet': { extra: [P.walletHand, P.techFlatlay] },
    'Round glasses': { extra: [P.clearGlasses, P.sunglassesLight] },
    Sunglasses: { extra: [P.sunglassesBeach, P.sunglassesSand, P.sunglassesCase] }
  },
  'demo-techzone': {
    'iPhone 15': {
      extra: [P.phoneBlue, P.phoneGreen, P.phoneWhite],
      colors: [['أزرق', P.phoneBlue], ['أخضر', P.phoneGreen], ['أبيض', P.phoneWhite]]
    },
    'iPhone 14 Pro': {
      extra: [P.phoneProSilver, P.phoneProGrey, P.phoneFront],
      colors: [['أسود', O.phonePro], ['فضي', P.phoneProSilver], ['رمادي', P.phoneProGrey]]
    },
    'Business laptop': { extra: [P.laptopDell, P.laptopXps, P.laptopCafe] },
    'MacBook Air': {
      extra: [P.macbookSilver, P.macbookDesk, P.laptopGlow],
      colors: [['فضي', P.macbookSilver], ['رمادي', P.macbookDesk]]
    },
    'Wireless headphones': {
      extra: [P.headphonesBlack, P.headphonesGrey, P.headphonesPink],
      colors: [['أسود', P.headphonesBlack], ['رمادي', P.headphonesGrey], ['وردي', P.headphonesPink]],
      discount: 1.15
    },
    'Over-ear headphones': { extra: [P.headphonesDark, P.headphonesWired, P.headphonesSilver] },
    Earbuds: {
      extra: [P.earbudsWhite, P.earbudsBlack, P.earbudsCases],
      colors: [['أبيض', P.earbudsWhite], ['أسود', P.earbudsBlack]]
    },
    'Smart watch': { extra: [P.smartWatchWrist, P.smartWatchWhite, P.smartWatchBlack], discount: 1.12 },
    'Sport watch': { extra: [P.fitnessBand, P.squareWatch, P.watchBlackDial] },
    'Smart TV 55"': { extra: [P.tvRoom, P.tvSmartUi, P.tvRemote] },
    'Instant camera': { extra: [P.instaxCamera, P.silverCamera] }
  },
  'demo-lamsa-beauty': {
    'Classic perfume': { extra: [P.perfumeGold, P.perfumeRoses, P.perfumeShelf] },
    'Noir perfume': { extra: [P.perfumeNoir, P.perfumeBlue, P.perfumeWhite], discount: 1.15 },
    'Daily moisturizer': { extra: [P.creamTube, P.skincareSet, P.skincareFlatlay] },
    'Eyeshadow palette': { extra: [P.paletteHand, P.paletteOpen, P.makeupFlatlay], discount: 1.2 },
    'Makeup brushes set': { extra: [P.brushesFlatlay, P.makeupModel] }
  }
};

/**
 * المحتوى التسويقي — `link` اسمٌ إنجليزيّ لمنتجٍ يُفتح عند النقر.
 *
 * بلا مبالغ مكتوبة في النصوص: الأسعار تتبدّل مع سعر الصرف وإعادة
 * التقويم، ونصٌّ يقول «55 ألفاً» يصير كاذباً في اليوم التالي. النسب
 * والأيام لا تتقادم.
 */
const MARKETING = {
  'demo-bayt-alsham': {
    announcement: {
      title: 'توصيل مجاني هذا الأسبوع',
      description: 'التوصيل مجاني داخل أبو رمانة والمالكي والمزة لكل الطلبات حتى نهاية الأسبوع.'
    },
    banners: [
      { title: 'فطور الجمعة الشامي', description: 'فطورٌ بلديّ كامل كل جمعة من 8 صباحاً حتى 12 ظهراً — فول وفتّة ومناقيش طازجة.', image: P.breakfastTable, link: 'Shami breakfast' },
      { title: 'مشاوي على الفحم كل مساء', description: 'شيش طاووق وكباب حلبي يُشويان أمامك — اطلبها ساخنة إلى بابك.', image: P.kebabSkewers, link: 'Shish tawook' },
      { title: 'سهرة العائلة في بيت الشام', description: 'صالةٌ تتّسع لأربعين شخصاً وجلسات خارجية — احجز طاولتك عبر الواتساب.', image: P.restaurantInterior }
    ],
    offers: [
      { title: 'عروض الأسبوع: برغر وشاورما وبيتزا', description: 'خصمٌ حتى 17% على برغر بيت الشام والشاورما العربي والمارغريتا والكبسة — لفترة محدودة.', image: P.burgerBasket, link: 'Signature burger' },
      { title: 'كود BAYT10 لطلبك الأول', description: 'اكتب الكود BAYT10 عند إتمام الطلب واحصل على خصم 10% على كامل الفاتورة.', image: P.tableFlatlay }
    ]
  },
  'demo-lilac-cafe': {
    announcement: {
      title: 'أمسية موسيقى هادئة كل خميس',
      description: 'عزفٌ حيّ على العود من الساعة 7 مساءً — احجز طاولتك مبكراً.'
    },
    banners: [
      { title: 'لاتيه اللافندر — توقيع ليلك', description: 'شراب لافندر نحضّره في المقهى مع إسبريسو مزدوج وحليب مخفوق.', image: P.lattePour, link: 'Lilac latte' },
      { title: 'حلويات تُخبز كل صباح', description: 'كيك الشوكولا والوافل والكب كيك — طازجة من فرننا يومياً.', image: P.strawberryCake, link: 'Chocolate cake' },
      { title: 'ركنٌ هادئ للعمل والقراءة', description: 'إنترنت سريع ومقابس عند كل طاولة — قهوتك الثانية علينا قبل الظهر.', image: P.cafeInterior }
    ],
    offers: [
      { title: 'قهوتك الثانية بنصف السعر', description: 'كل يوم من 8 إلى 11 صباحاً على جميع مشروبات الإسبريسو.', image: P.latteTop, link: 'Cappuccino' },
      { title: 'كود LILAC15 على طلبات الاستلام', description: 'خصم 15% حين تطلب مسبقاً وتستلم من المقهى — بلا انتظار.', image: P.mintCupcakes }
    ]
  },
  'demo-yasmin-boutique': {
    announcement: {
      title: 'توصيل لكل المحافظات خلال 48 ساعة',
      description: 'والتبديل مجاني خلال 7 أيام إن لم يناسبك المقاس.'
    },
    banners: [
      { title: 'تشكيلة الخريف وصلت', description: 'كنزات صوف وجاكيتات بألوان الموسم — كميات محدودة من كل مقاس.', image: P.knitRack, link: 'Soft knit sweater' },
      { title: 'فستان الصيف بثلاثة ألوان', description: 'الفستان المورّد الأكثر طلباً صار بالأبيض والأحمر والأزرق السماوي.', image: P.dressRedFloral, link: 'Floral summer dress' },
      { title: 'إكسسوارات تكمّل إطلالتك', description: 'حقائب ونظارات ومحافظ جلد مختارة بعناية.', image: P.shopInterior }
    ],
    offers: [
      { title: 'عروض الأسبوع: حتى 25% على الشتويّات', description: 'الكنزة الصوف والسويت شيرت وحقيبة الظهر بأسعار مخفّضة حتى نفاد الكمية.', image: P.clothesRackBeige, link: 'Soft knit sweater' },
      { title: 'كود YASMIN20 لأول طلب', description: 'خصم 20% على طلبك الأول من البوتيك — اكتبه في خانة الكوبون عند الدفع.', image: P.shoppingBags }
    ]
  },
  'demo-techzone': {
    announcement: {
      title: 'تقسيط حتى 6 أشهر بلا فوائد',
      description: 'على الهواتف والحواسيب — اسأل عن التفاصيل عبر الواتساب.'
    },
    banners: [
      { title: 'آيفون 15 بكل ألوانه', description: 'أزرق، أخضر، أبيض — أصلي بكفالة سنة كاملة وتوصيل في اليوم نفسه.', image: P.phoneBlue, link: 'iPhone 15' },
      { title: 'صوتٌ بلا ضجيج', description: 'سماعات لاسلكية بعزلٍ نشط للضوضاء — بخصم لفترة محدودة.', image: P.headphonesBlack, link: 'Wireless headphones' },
      { title: 'جهّز مكتبك من تك زون', description: 'لابتوبات للعمل والدراسة وإكسسوارات أصلية بكفالة.', image: P.workDesk, link: 'Business laptop' }
    ],
    offers: [
      { title: 'عروض الأسبوع على الساعات والصوتيات', description: 'خصم على الساعة الذكية والسماعات اللاسلكية وشاشة 55 إنش — الكمية محدودة.', image: P.smartWatchWhite, link: 'Smart watch' },
      { title: 'كود TECH5: خصم إضافي 5%', description: 'يُطبَّق فوق الأسعار المخفّضة — اكتبه عند إتمام الطلب.', image: P.techFlatlay }
    ]
  },
  'demo-lamsa-beauty': {
    announcement: {
      title: 'عيّنة عطر مجانية مع كل طلب',
      description: 'هذا الأسبوع فقط — وتغليف الهدايا مجاني دائماً.'
    },
    banners: [
      { title: 'عطورٌ أصلية بتغليف هدايا مجاني', description: 'تشكيلة عطور شرقية وزهرية — اختر الحجم واترك لنا التغليف.', image: P.perfumeShelf, link: 'Classic perfume' },
      { title: 'روتين العناية اليومي', description: 'مرطّب وسيروم وغسول مختارة لكل أنواع البشرة.', image: P.skincareFlatlay, link: 'Daily moisturizer' },
      { title: 'مكياج السهرة', description: 'باليتات ظلال وفرش احترافية — إطلالة كاملة في طلب واحد.', image: P.makeupFlowers, link: 'Eyeshadow palette' }
    ],
    offers: [
      { title: 'اشترِ عطرين والثالث بنصف السعر', description: 'على كل العطور بحجم 50ml — يُطبَّق الخصم عند تأكيد الطلب.', image: P.perfumeRoses, link: 'Noir perfume' },
      { title: 'كود LAMSA10 لطلبك الأول', description: 'خصم 10% على مستحضرات العناية والمكياج.', image: P.makeupFlatlay }
    ]
  }
};

/** كل روابط الصور التي يستعملها الإثراء — لفحصها قبل الكتابة */
const allImageUrls = () => {
  const urls = new Set();
  Object.values(ITEMS).forEach((items) =>
    Object.values(items).forEach((spec) => {
      (spec.extra || []).forEach((id) => urls.add(img(id)));
      (spec.colors || []).forEach(([, id]) => urls.add(img(id)));
    })
  );
  Object.values(MARKETING).forEach((m) => [...m.banners, ...m.offers].forEach((s) => urls.add(wide(s.image))));
  return [...urls];
};

// ===== الكتابة =====

const asArray = (raw) => {
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [raw];
    } catch {
      return [raw];
    }
  }
  return [];
};

const asGroups = (raw) => {
  const list = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : raw;
  return Array.isArray(list) ? JSON.parse(JSON.stringify(list)) : [];
};

/** سعرٌ أصليّ بأرقامٍ مستديرة — «57,600» يبدو حساباً لا سعراً */
const niceUp = (value) => {
  if (!(value > 0)) return value;
  const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(value)) - 1));
  return Math.ceil(value / step) * step;
};

const COLOR_GROUP = 'اللون';

/**
 * يُثري نشاط عرضٍ واحداً. يعيد ملخّص ما تغيّر (أو ما سيتغيّر في المعاينة).
 *
 * `business` هو تعريف النشاط من seed-demo-businesses.js — منه نأخذ الـ slug
 * والبريد والكوبون، فلا يمسّ الإثراء نشاطاً ليس من أنشطة العرض.
 */
async function enrichBusiness(prisma, business, { apply }) {
  const isRestaurant = business.type === 'restaurant';
  const itemSpecs = ITEMS[business.slug] || {};
  const marketing = MARKETING[business.slug];
  const summary = { images: 0, colors: 0, discounts: 0, sectionsCreated: 0, sectionsUpdated: 0, coupon: '—' };

  const biz = isRestaurant
    ? await prisma.restaurant.findUnique({ where: { slug: business.slug }, select: { id: true, email: true, slug: true } })
    : await prisma.store.findUnique({ where: { slug: business.slug }, select: { id: true, email: true, slug: true } });
  if (!biz) return { skipped: 'غير موجود — أنشئه أولاً بـ --apply' };
  // حارسٌ ثانٍ فوق الـ slug: نشاطٌ حجز slug العرض وبريده ليس بريد العرض ليس لنا
  if (biz.email && biz.email.toLowerCase() !== business.email.toLowerCase()) {
    return { skipped: `بريده ${biz.email} لا يطابق بريد العرض — لم يُلمس` };
  }

  // ----- المنتجات والأصناف -----
  const items = isRestaurant
    ? await prisma.menuItem.findMany({
        where: { restaurantId: biz.id },
        select: { id: true, nameEn: true, price: true, originalPrice: true, priceUsd: true, originalPriceUsd: true, image: true, images: true, options: true }
      })
    : await prisma.product.findMany({
        where: { storeId: biz.id },
        select: { id: true, nameEn: true, price: true, originalPrice: true, priceUsd: true, originalPriceUsd: true, imageUrl: true, images: true, options: true }
      });

  const idsByName = new Map(items.map((it) => [it.nameEn, it.id]));

  for (const item of items) {
    const spec = itemSpecs[item.nameEn];
    if (!spec) continue;
    const data = {};

    // الغلاف أولاً دائماً — البطاقة تعرض images[0] ولا يجب أن تتغيّر
    const cover = (isRestaurant ? item.image : item.imageUrl) || asArray(item.images)[0] || null;
    const current = asArray(item.images);
    const wanted = [
      ...(cover ? [cover] : []),
      ...current,
      ...(spec.extra || []).map((id) => img(id)),
      ...(spec.colors || []).map(([, id]) => img(id))
    ];
    const merged = [...new Set(wanted)];
    if (merged.length !== current.length || merged.some((url, i) => url !== current[i])) {
      data.images = merged;
      summary.images++;
    }

    if (spec.colors && !isRestaurant) {
      const groups = asGroups(item.options);
      let group = groups.find((g) => g && g.name === COLOR_GROUP);
      let changed = false;
      if (!group) {
        // في آخر الخيارات: أول مجموعةٍ مفردة تُملأ في عمود «المقاس» من
        // الطلب، ولو سبقها اللون لصار المقاس سطراً إضافياً في الفاتورة
        group = { name: COLOR_GROUP, type: 'single', required: true, values: [] };
        groups.push(group);
        changed = true;
      }
      for (const [label, id] of spec.colors) {
        const url = img(id);
        const value = group.values.find((v) => v && v.label === label);
        if (!value) {
          group.values.push({ label, priceDelta: 0, image: url });
          changed = true;
        } else if (value.image !== url) {
          value.image = url;
          changed = true;
        }
      }
      if (changed) {
        data.options = groups;
        summary.colors++;
      }
    }

    // حسمٌ واحد لا يتراكم: سعرٌ أصليّ أعلى من الحالي يعني أن الحسم موجود
    if (spec.discount && !(item.originalPrice > item.price)) {
      data.originalPrice = niceUp(item.price * spec.discount);
      if (item.priceUsd > 0) data.originalPriceUsd = Math.round(item.priceUsd * spec.discount * 100) / 100;
      summary.discounts++;
    }

    if (apply && Object.keys(data).length > 0) {
      if (isRestaurant) await prisma.menuItem.update({ where: { id: item.id }, data });
      else await prisma.product.update({ where: { id: item.id }, data });
    }
  }

  // ----- التسويق -----
  if (marketing) {
    const businessType = isRestaurant ? 'restaurant' : 'store';
    const linkFor = (nameEn) => {
      const id = nameEn && idsByName.get(nameEn);
      if (!id) return null;
      return isRestaurant ? `/${biz.slug}/item/${id}` : `/${biz.slug}/product/${id}`;
    };
    const rows = [
      { sectionType: 'announcement', sortOrder: 0, ...marketing.announcement },
      ...marketing.banners.map((s, i) => ({ sectionType: 'banner', sortOrder: i, ...s })),
      ...marketing.offers.map((s, i) => ({ sectionType: 'offer', sortOrder: i, ...s }))
    ];

    for (const row of rows) {
      const fields = {
        title: row.title,
        description: row.description,
        imageUrl: row.image ? wide(row.image) : null,
        linkUrl: linkFor(row.link),
        isActive: true,
        sortOrder: row.sortOrder
      };
      const existing = await prisma.marketingSection.findFirst({
        where: { businessType, businessId: biz.id, sectionType: row.sectionType, title: row.title },
        select: { id: true }
      });
      if (existing) {
        summary.sectionsUpdated++;
        if (apply) await prisma.marketingSection.update({ where: { id: existing.id }, data: fields });
      } else {
        summary.sectionsCreated++;
        if (apply) await prisma.marketingSection.create({ data: { businessType, businessId: biz.id, sectionType: row.sectionType, ...fields } });
      }
    }

    const settings = await prisma.marketingSettings.findFirst({ where: { businessId: biz.id }, select: { id: true } });
    if (!settings && apply) {
      await prisma.marketingSettings.create({
        data: { businessType, businessId: biz.id, sectionOrder: ['announcement', 'banner', 'offer'] }
      });
    }
  }

  // ----- الكوبون: موجودٌ ونشِط وغير منتهٍ -----
  if (business.coupon) {
    const key = isRestaurant ? 'restaurantId' : 'storeId';
    const coupon = await prisma.coupon.findUnique({ where: { code: business.coupon.code } });
    if (!coupon) {
      summary.coupon = `سيُنشأ ${business.coupon.code}`;
      if (apply) await prisma.coupon.create({ data: { ...business.coupon, isActive: true, [key]: biz.id } });
    } else if (coupon[key] !== biz.id) {
      // الرمز فريدٌ على المنصّة — ونشاطٌ آخر يملكه فلا نمسّه
      summary.coupon = `${business.coupon.code} يملكه نشاطٌ آخر — تُرك`;
    } else if (!coupon.isActive || (coupon.endDate && coupon.endDate < new Date())) {
      summary.coupon = `${business.coupon.code} يُعاد تفعيله`;
      if (apply) await prisma.coupon.update({ where: { id: coupon.id }, data: { isActive: true, endDate: null } });
    } else {
      summary.coupon = `${business.coupon.code} نشِط`;
    }
  }

  return summary;
}

module.exports = { enrichBusiness, allImageUrls };
