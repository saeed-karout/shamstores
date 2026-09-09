// frontend/src/utils/storefrontDesign.ts
//
// **شكل** واجهة المتجر — مقابل `storefrontTheme.ts` الذي يتولّى **لونها**.
//
// الفصل مقصود: التاجر يختار ألوانه مرّةً وقد لا يمسّها بعدها، أمّا الشكل
// (الاستدارات والظلال والكثافة وهيئة البطاقة) فقرارُ ذوقٍ يُجرَّب ويُبدَّل.
// وخلطهما في جدولٍ واحد من الحقول كان سيعني أربعة عشر حقلاً في شاشةٍ
// واحدة لا يفهم التاجر أثر أيٍّ منها.
//
// **البنية ثلاث طبقات:**
//   ١. قالب جاهز (`preset`) يضبط كل رموز الشكل دفعةً واحدة — وهو ما يختاره
//      أكثر التجّار ولا يتجاوزه.
//   ٢. تجاوزات فردية (`radii`, `shadow`, `density`) لمن يريد ضبطاً دقيقاً.
//   ٣. نماذج الهيكل (`card`, `product`, `nav`) — تغيّر ترتيب العناصر لا
//      قياساتها، فلا تُشتقّ من القالب بل تُختار بجانبه.
//
// كل ما ينتج عن هذا الملفّ متغيّرات CSS. فالمكوّن يكتب
// `borderRadius: sd.rCard` مرّةً واحدة، ويتبدّل شكله دون أن يُعاد بناؤه.

export type DesignPreset = 'modern' | 'minimal' | 'bold';

/**
 * هيكل الصفحة — **أكبر قرارٍ في القالب**، وأعلى من `nav` لا بجانبه.
 *
 *   • `classic`  — شريط علوي دائم، بانر، بلاطات أقسام، شبكة.
 *   • `boutique` — بلا شريط: هوية في الوسط، تواصل، بحث، شرائح أقسام.
 *   • `showcase` — غلاف يملأ الشاشة، أزرار طافية، أقسام بصورٍ عريضة.
 *   • `landing`  — صفحةٌ منسّقة: فئات، ثمّ صفوفٌ معنونة لكلٍّ «عرض الكل»،
 *                  ثمّ تعريفٌ بالمتجر. الشبكة الكاملة عند البحث فقط.
 *
 * و`nav` يخصّ `classic` وحده: البقيّة بلا شريطٍ يُنمَّط أصلاً.
 */
export type ShellVariant = 'classic' | 'boutique' | 'showcase' | 'landing';
export type CardVariant = 'standard' | 'overlay' | 'compact';
export type ProductVariant = 'classic' | 'split' | 'immersive';
export type NavVariant = 'solid' | 'floating' | 'minimal';
export type ShadowLevel = 'none' | 'soft' | 'strong';
export type Density = 'compact' | 'cozy' | 'roomy';

/** الاستدارات — بالبكسل، وكلٌّ منها مستقلّ عن الآخر عمداً */
export interface Radii {
  card: number;
  image: number;
  button: number;
  input: number;
  sheet: number;
  chip: number;
}

export interface StorefrontDesign {
  preset: DesignPreset;
  shell: ShellVariant;
  card: CardVariant;
  product: ProductVariant;
  nav: NavVariant;
  radii: Radii;
  shadow: ShadowLevel;
  density: Density;
  borderWidth: number;
}

/**
 * القوالب الثلاثة.
 *
 * ليست تدرّجاً لرقمٍ واحد: «بسيط» ليس «عصرياً» باستدارةٍ أقلّ، بل يستبدل
 * الظلّ بحدٍّ ويضغط الفراغات. ولذلك يحمل كلٌّ منها مجموعته كاملة.
 */
export const PRESETS: Record<
  DesignPreset,
  Omit<StorefrontDesign, 'preset' | 'shell' | 'card' | 'product' | 'nav'>
> = {
  // ناعمٌ ودافئ — الأقرب إلى تطبيقات التسوّق الحديثة
  modern: {
    radii: { card: 20, image: 16, button: 14, input: 13, sheet: 26, chip: 999 },
    shadow: 'soft',
    density: 'cozy',
    borderWidth: 1
  },
  // حادٌّ ونظيف — حدودٌ رفيعة بلا ظلال، يليق بالمتاجر ذات الصور الكثيفة
  minimal: {
    radii: { card: 6, image: 4, button: 8, input: 8, sheet: 14, chip: 6 },
    shadow: 'none',
    density: 'compact',
    borderWidth: 1
  },
  // جريءٌ منحنٍ — استدارات كبيرة وظلّ واضح، يليق بالمطاعم والحلويات
  bold: {
    radii: { card: 28, image: 24, button: 999, input: 18, sheet: 32, chip: 999 },
    shadow: 'strong',
    density: 'roomy',
    borderWidth: 0
  }
};

export const DEFAULT_DESIGN: StorefrontDesign = {
  preset: 'modern',
  shell: 'classic',
  card: 'standard',
  product: 'classic',
  nav: 'solid',
  ...PRESETS.modern
};

/** فراغات كل كثافة: [الفجوة، حشوة البطاقة، حشوة القسم] */
const DENSITY: Record<Density, [number, number, number]> = {
  compact: [8, 9, 12],
  cozy: [12, 12, 16],
  roomy: [16, 16, 22]
};

/**
 * الظلال.
 *
 * تُبنى بالأسود الشفّاف لا بلون التاجر: ظلٌّ ملوَّن على خلفيةٍ داكنة يبدو
 * هالةً لا عمقاً، وأكثر متاجر المنصّة داكن.
 */
const SHADOWS: Record<ShadowLevel, [string, string]> = {
  none: ['none', '0 2px 10px rgba(0,0,0,0.28)'],
  soft: ['0 2px 12px rgba(0,0,0,0.22)', '0 10px 30px rgba(0,0,0,0.38)'],
  strong: ['0 6px 22px rgba(0,0,0,0.38)', '0 18px 48px rgba(0,0,0,0.5)']
};

const PRESET_KEYS: DesignPreset[] = ['modern', 'minimal', 'bold'];
const SHELL_KEYS: ShellVariant[] = ['classic', 'boutique', 'showcase', 'landing'];
const CARD_KEYS: CardVariant[] = ['standard', 'overlay', 'compact'];
const PRODUCT_KEYS: ProductVariant[] = ['classic', 'split', 'immersive'];
const NAV_KEYS: NavVariant[] = ['solid', 'floating', 'minimal'];
const SHADOW_KEYS: ShadowLevel[] = ['none', 'soft', 'strong'];
const DENSITY_KEYS: Density[] = ['compact', 'cozy', 'roomy'];

const pick = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** يقصّ الاستدارة إلى مدىً معقول — قيمةٌ تالفة في القاعدة تُشوّه الصفحة كلّها */
const clampRadius = (value: unknown, fallback: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, 999);
};

/**
 * يحوّل ما هو مخزَّن — أيّاً كان شكله — إلى تصميمٍ كامل.
 *
 * **يقبل الناقص عمداً:** الحقل في القاعدة JSON، وقد يكون فارغاً لمتاجر
 * أُنشئت قبل الميزة، أو يحمل قالباً فقط بلا تجاوزات، أو قيماً من إصدارٍ
 * أقدم. فالقالب يملأ ما نقص، والقيمة التالفة تسقط إلى قيمة قالبها.
 */
export const resolveDesign = (raw?: unknown): StorefrontDesign => {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;

  const preset = pick(input.preset, PRESET_KEYS, DEFAULT_DESIGN.preset);
  const base = PRESETS[preset];
  const radii = (input.radii && typeof input.radii === 'object' ? input.radii : {}) as Record<string, unknown>;

  return {
    preset,
    shell: pick(input.shell, SHELL_KEYS, DEFAULT_DESIGN.shell),
    card: pick(input.card, CARD_KEYS, DEFAULT_DESIGN.card),
    product: pick(input.product, PRODUCT_KEYS, DEFAULT_DESIGN.product),
    nav: pick(input.nav, NAV_KEYS, DEFAULT_DESIGN.nav),
    radii: {
      card: clampRadius(radii.card, base.radii.card),
      image: clampRadius(radii.image, base.radii.image),
      button: clampRadius(radii.button, base.radii.button),
      input: clampRadius(radii.input, base.radii.input),
      sheet: clampRadius(radii.sheet, base.radii.sheet),
      chip: clampRadius(radii.chip, base.radii.chip)
    },
    shadow: pick(input.shadow, SHADOW_KEYS, base.shadow),
    density: pick(input.density, DENSITY_KEYS, base.density),
    borderWidth: Number.isFinite(Number(input.borderWidth))
      ? Math.min(Math.max(Number(input.borderWidth), 0), 4)
      : base.borderWidth
  };
};

/** يعيد التصميم إلى قالبه — يستعمله زرّ «أعِد الضبط» في اللوحة */
export const applyPreset = (design: StorefrontDesign, preset: DesignPreset): StorefrontDesign => ({
  ...design,
  preset,
  ...PRESETS[preset]
});

/** المتغيّرات كما تُكتب على العنصر — مفصولةٌ لتُستعمل في المعاينة الحيّة أيضاً */
export const designVars = (design: StorefrontDesign): Record<string, string> => {
  const [gap, padCard, padSection] = DENSITY[design.density];
  const [shadowCard, shadowPop] = SHADOWS[design.shadow];

  return {
    '--sf-r-card': `${design.radii.card}px`,
    '--sf-r-image': `${design.radii.image}px`,
    '--sf-r-button': `${design.radii.button}px`,
    '--sf-r-input': `${design.radii.input}px`,
    '--sf-r-sheet': `${design.radii.sheet}px`,
    '--sf-r-chip': `${design.radii.chip}px`,
    '--sf-border-w': `${design.borderWidth}px`,
    '--sf-shadow-card': shadowCard,
    '--sf-shadow-pop': shadowPop,
    '--sf-gap': `${gap}px`,
    '--sf-pad-card': `${padCard}px`,
    '--sf-pad-section': `${padSection}px`
  };
};

/**
 * يكتب المتغيّرات على الجذر ويُرجع دالّة تنظيف.
 *
 * التنظيف ليس ترفاً: زبونٌ يخرج من متجرٍ إلى صفحةٍ أخرى في نفس الجلسة كان
 * سيحمل استدارات المتجر معه.
 */
export const applyStorefrontDesign = (
  design: StorefrontDesign,
  target?: HTMLElement | null
): (() => void) => {
  if (typeof document === 'undefined') return () => undefined;

  const root = target || document.documentElement;
  const vars = designVars(design);
  const previous: Array<[string, string]> = [];

  Object.entries(vars).forEach(([name, value]) => {
    previous.push([name, root.style.getPropertyValue(name)]);
    root.style.setProperty(name, value);
  });

  return () => {
    previous.forEach(([name, value]) => {
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    });
  };
};

/**
 * اختصارات للأنماط السطرية — نظير `sf` في ملفّ الألوان.
 *
 * تُقرأ كقيمٍ نصّية `var(--sf-*)`، فالمكوّن لا يعرف قيمة الاستدارة ولا
 * يحتاجها: يتغيّر القالب فيتغيّر الشكل بلا إعادة تصيير.
 */
export const sd = {
  rCard: 'var(--sf-r-card, 20px)',
  rImage: 'var(--sf-r-image, 16px)',
  rButton: 'var(--sf-r-button, 14px)',
  rInput: 'var(--sf-r-input, 13px)',
  rSheet: 'var(--sf-r-sheet, 26px)',
  rChip: 'var(--sf-r-chip, 999px)',
  borderW: 'var(--sf-border-w, 1px)',
  shadowCard: 'var(--sf-shadow-card, 0 2px 12px rgba(0,0,0,0.22))',
  shadowPop: 'var(--sf-shadow-pop, 0 10px 30px rgba(0,0,0,0.38))',
  gap: 'var(--sf-gap, 12px)',
  padCard: 'var(--sf-pad-card, 12px)',
  padSection: 'var(--sf-pad-section, 16px)'
} as const;

/** أسماء عربية للعرض في اللوحة — مصدرٌ واحد فلا تتفرّق التسميات */
export const LABELS = {
  preset: { modern: 'عصري', minimal: 'بسيط', bold: 'جريء' } as Record<DesignPreset, string>,
  shell: {
    classic: 'كلاسيكي',
    boutique: 'بوتيك',
    showcase: 'معرض',
    landing: 'صفحة أقسام'
  } as Record<ShellVariant, string>,
  shellHint: {
    classic: 'شريط علوي دائم فيه البحث والسلّة، ثمّ بانر، ثمّ الأقسام. الأنسب لمتجرٍ كبير يتنقّل فيه الزبون بين أقسامٍ كثيرة.',
    boutique: 'بلا شريط علوي: شعارك في الوسط ثمّ الاسم ثمّ طرق التواصل، ثمّ بحثٌ وشرائح أقسام. الأنسب لمن يصل زبائنه من إنستغرام.',
    showcase: 'غلافك يملأ أعلى الشاشة والأزرار تطفو فوقه، والأقسام صورٌ عريضة. الأنسب لمتجرٍ صوره قويّة.',
    landing: 'صفحةُ عرضٍ منسّقة: فئاتك أوّلاً، ثمّ صفوف «الجديد» و«الحسومات» و«الأكثر مبيعاً» لكلٍّ «عرض الكل»، ثمّ تعريفٌ بك. الأنسب لمتجرٍ يريد أن يبدو أغنى ممّا تُظهره شبكة.'
  } as Record<ShellVariant, string>,
  card: { standard: 'قياسية', overlay: 'صورة بغطاء', compact: 'مضغوطة' } as Record<CardVariant, string>,
  product: { classic: 'كلاسيكية', split: 'منقسمة', immersive: 'غامرة' } as Record<ProductVariant, string>,
  nav: { solid: 'صلب', floating: 'عائم', minimal: 'بسيط' } as Record<NavVariant, string>,
  shadow: { none: 'بلا ظلّ', soft: 'ناعم', strong: 'واضح' } as Record<ShadowLevel, string>,
  density: { compact: 'مضغوط', cozy: 'متوازن', roomy: 'فسيح' } as Record<Density, string>,
  radii: {
    card: 'البطاقة',
    image: 'الصورة',
    button: 'الأزرار',
    input: 'الحقول',
    sheet: 'الألواح المنزلقة',
    chip: 'الشارات'
  } as Record<keyof Radii, string>
};

export default {
  PRESETS,
  DEFAULT_DESIGN,
  resolveDesign,
  applyPreset,
  designVars,
  applyStorefrontDesign,
  sd,
  LABELS
};
