// backend/src/config/storefrontDesign.ts
//
// تنقية «شكل الواجهة» قبل حفظه.
//
// **لماذا لا يُحفظ كما يصل:** العمود من نوع JSON، أي أن `req.body` يمرّ
// إليه كما هو ما لم يُفحص. فيستطيع من يعدّل الطلب أن يخزّن كائناً بحجم
// ميغابايت، أو استدارةً بمليون بكسل تُخرج الصفحة عن حدّها، أو حقولاً لا
// تُقرأ أبداً تكبر مع كل حفظ.
//
// وقائمة المفاتيح مغلقة عمداً: ما ليس معروفاً يُسقط، فلا ينمو العمود بما
// لا تعرضه الواجهة.
//
// **مرآةُ `frontend/src/utils/storefrontDesign.ts`.** القيم المسموحة
// مكرّرة في الطرفين لأنهما لا يتشاركان حزمة؛ وأي إضافةٍ هناك تحتاج سطرها
// هنا وإلا حُذفت عند الحفظ بصمت.

export type DesignPreset = 'modern' | 'minimal' | 'bold';

const PRESETS: DesignPreset[] = ['modern', 'minimal', 'bold'];
const SHELLS = ['classic', 'boutique', 'showcase'];
const CARDS = ['standard', 'overlay', 'compact'];
const PRODUCTS = ['classic', 'split', 'immersive'];
const NAVS = ['solid', 'floating', 'minimal'];
const SHADOWS = ['none', 'soft', 'strong'];
const DENSITIES = ['compact', 'cozy', 'roomy'];
const RADIUS_KEYS = ['card', 'image', 'button', 'input', 'sheet', 'chip'] as const;

const oneOf = (value: unknown, allowed: string[]): string | undefined =>
  typeof value === 'string' && allowed.includes(value) ? value : undefined;

const radius = (value: unknown): number | undefined => {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(Math.max(Math.round(n), 0), 999);
};

export interface SanitizedDesign {
  preset?: string;
  shell?: string;
  card?: string;
  product?: string;
  nav?: string;
  shadow?: string;
  density?: string;
  borderWidth?: number;
  radii?: Record<string, number>;
}

/**
 * يُرجع الكائن المنقّى، أو `null` لمسح القيمة والعودة إلى الافتراضي.
 *
 * `null` معنىً لا خطأ: التاجر الذي يضغط «أعِد الضبط» يمحو تخصيصه، فيرث
 * قالب المنصّة الافتراضي وما يتحسّن فيه لاحقاً.
 */
export const sanitizeDesign = (raw: unknown): SanitizedDesign | null => {
  if (raw === null) return null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const input = raw as Record<string, unknown>;
  const out: SanitizedDesign = {};

  const preset = oneOf(input.preset, PRESETS);
  if (preset) out.preset = preset;

  const shell = oneOf(input.shell, SHELLS);
  if (shell) out.shell = shell;

  const card = oneOf(input.card, CARDS);
  if (card) out.card = card;

  const product = oneOf(input.product, PRODUCTS);
  if (product) out.product = product;

  const nav = oneOf(input.nav, NAVS);
  if (nav) out.nav = nav;

  const shadow = oneOf(input.shadow, SHADOWS);
  if (shadow) out.shadow = shadow;

  const density = oneOf(input.density, DENSITIES);
  if (density) out.density = density;

  const width = Number(input.borderWidth);
  if (Number.isFinite(width)) out.borderWidth = Math.min(Math.max(Math.round(width), 0), 4);

  if (input.radii && typeof input.radii === 'object' && !Array.isArray(input.radii)) {
    const source = input.radii as Record<string, unknown>;
    const radii: Record<string, number> = {};
    RADIUS_KEYS.forEach((key) => {
      const value = radius(source[key]);
      if (value !== undefined) radii[key] = value;
    });
    if (Object.keys(radii).length) out.radii = radii;
  }

  // كائنٌ فارغ لا يُخزَّن: تخصيصٌ بلا حقلٍ واحد صالح هو غياب تخصيص
  return Object.keys(out).length ? out : null;
};

export default { sanitizeDesign };
