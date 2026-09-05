// frontend/src/utils/storefrontTheme.ts
//
// ألوان التاجر تصبح متغيرات CSS على :root، فتستهلكها كل مكونات المتجر
// عبر var(--sf-*) بدل ألوان مكتوبة يدوياً في كل ملف.

export interface StorefrontBusiness {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
  cardColor?: string | null;
  surfaceColor?: string | null;
  textColor?: string | null;
  mutedColor?: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
}

export type StorefrontKind = 'restaurant' | 'store';

/**
 * لوحة المطعم — أخضر داكن. نفس الافتراضي في قاعدة البيانات.
 */
export const SF_FALLBACK = {
  primary: '#3B82F6',
  secondary: '#10B981',
  bg: '#082E24',
  card: '#112E23',
  surface: '#0F3D31',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  accent: '#C8E235',
  font: 'Cairo'
} as const;

/**
 * لوحة المتجر — ليل أزرق وكهرماني.
 *
 * تخالف لوحة المطعم عمداً: القائمة الرقمية والمتجر منتجان مختلفان، ومن
 * يفتح الاثنين يجب أن يرى الفرق قبل أن يقرأ كلمة.
 *
 * وهي لوحة **كاملة**: الافتراضي القديم كان خلفية بيضاء ونصاً أسود مع
 * بطاقات وأسطح داكنة — فينتج نصٌّ رمادي فاتح على أبيض وبطاقات سوداء
 * عليه. لوحة نصفها فاتح ونصفها داكن ليست خياراً جمالياً، بل عطل.
 */
export const SF_STORE_FALLBACK = {
  primary: '#6366F1',
  secondary: '#22C55E',
  bg: '#0D1424',
  card: '#151E33',
  surface: '#1C2742',
  text: '#E9EEF9',
  muted: '#94A2BE',
  accent: '#FFB020',
  font: 'Cairo'
} as const;

const paletteFor = (kind?: StorefrontKind) =>
  kind === 'store' ? SF_STORE_FALLBACK : SF_FALLBACK;

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** يقبل الألوان الصالحة فقط — قيمة قادمة من قاعدة البيانات قد تكون فارغة أو تالفة */
const safeColor = (value: string | null | undefined, fallback: string): string => {
  const v = (value || '').trim();
  if (!v) return fallback;
  if (HEX_RE.test(v)) return v;
  // نسمح أيضاً بصيغ rgb/hsl الصالحة
  if (/^(rgb|hsl)a?\([\d\s.,%/-]+\)$/i.test(v)) return v;
  return fallback;
};

/** تحويل لون hex إلى "r, g, b" لاستخدامه داخل rgba() */
export const hexToRgbTriplet = (hex: string): string | null => {
  const m = hex.trim().replace('#', '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(m)) return null;
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
};

/** لون بشفافية مشتق من لون التاجر */
export const withAlpha = (color: string, alpha: number): string => {
  const triplet = hexToRgbTriplet(color);
  if (!triplet) return color;
  return `rgba(${triplet}, ${alpha})`;
};

/**
 * هل اللون فاتح؟ يُستخدم لاختيار لون نص مقروء فوق أزرار ملوّنة.
 * صيغة اللمعان المعتمدة في WCAG مبسّطة.
 */
export const isLightColor = (color: string): boolean => {
  const triplet = hexToRgbTriplet(color);
  if (!triplet) return false;
  const [r, g, b] = triplet.split(',').map((n) => parseInt(n.trim(), 10) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45;
};

/** لون نص مقروء فوق خلفية معطاة */
export const readableOn = (background: string): string =>
  isLightColor(background) ? '#0B1F19' : '#FFFFFF';

export interface StorefrontTokens {
  primary: string;
  secondary: string;
  bg: string;
  card: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  font: string;
  onPrimary: string;
  onAccent: string;
}

export const resolveTokens = (
  business?: StorefrontBusiness | null,
  kind?: StorefrontKind
): StorefrontTokens => {
  const base = paletteFor(kind);
  const primary = safeColor(business?.primaryColor, base.primary);
  const accent = safeColor(business?.accentColor, base.accent);

  return {
    primary,
    secondary: safeColor(business?.secondaryColor, base.secondary),
    bg: safeColor(business?.backgroundColor, base.bg),
    card: safeColor(business?.cardColor, base.card),
    surface: safeColor(business?.surfaceColor, base.surface),
    text: safeColor(business?.textColor, base.text),
    muted: safeColor(business?.mutedColor, base.muted),
    accent,
    border: withAlpha(accent, 0.16),
    font: (business?.fontFamily || base.font).trim() || base.font,
    onPrimary: readableOn(primary),
    onAccent: readableOn(accent)
  };
};

const VAR_MAP: Record<keyof StorefrontTokens, string> = {
  primary: '--sf-primary',
  secondary: '--sf-secondary',
  bg: '--sf-bg',
  card: '--sf-card',
  surface: '--sf-surface',
  text: '--sf-text',
  muted: '--sf-muted',
  accent: '--sf-accent',
  border: '--sf-border',
  font: '--sf-font',
  onPrimary: '--sf-on-primary',
  onAccent: '--sf-on-accent'
};

/**
 * يطبّق ألوان التاجر كمتغيرات CSS.
 * يُرجع دالة تنظيف تُعيد المتغيرات إلى ما كانت عليه — مهم عند مغادرة صفحة المتجر.
 */
export const applyStorefrontTheme = (
  business?: StorefrontBusiness | null,
  kind?: StorefrontKind,
  target?: HTMLElement | null
): (() => void) => {
  if (typeof document === 'undefined') return () => undefined;

  const root = target || document.documentElement;
  const tokens = resolveTokens(business, kind);
  const previous: Array<[string, string]> = [];

  (Object.keys(VAR_MAP) as Array<keyof StorefrontTokens>).forEach((key) => {
    const varName = VAR_MAP[key];
    previous.push([varName, root.style.getPropertyValue(varName)]);
    root.style.setProperty(varName, tokens[key]);
  });

  // ألوان مشتقة للحالات (تمرير/ضغط/ظل)
  const derived: Array<[string, string]> = [
    ['--sf-primary-soft', withAlpha(tokens.primary, 0.14)],
    ['--sf-accent-soft', withAlpha(tokens.accent, 0.14)],
    ['--sf-shadow', withAlpha('#000000', 0.35)],
    ['--sf-overlay', withAlpha(tokens.bg, 0.72)]
  ];
  derived.forEach(([name, value]) => {
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

/** قراءة متغيّر ثيم من الـ DOM (للحالات التي تحتاج قيمة فعلية لا var()) */
export const getSfVar = (name: string, fallback = ''): string => {
  if (typeof window === 'undefined') return fallback;
  const varName = name.startsWith('--') ? name : `--sf-${name}`;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
};

/** اختصارات للاستخدام في inline styles */
export const sf = {
  primary: 'var(--sf-primary)',
  secondary: 'var(--sf-secondary)',
  bg: 'var(--sf-bg)',
  card: 'var(--sf-card)',
  surface: 'var(--sf-surface)',
  text: 'var(--sf-text)',
  muted: 'var(--sf-muted)',
  accent: 'var(--sf-accent)',
  border: 'var(--sf-border)',
  font: 'var(--sf-font), Cairo, system-ui, sans-serif',
  onPrimary: 'var(--sf-on-primary)',
  onAccent: 'var(--sf-on-accent)',
  primarySoft: 'var(--sf-primary-soft)',
  accentSoft: 'var(--sf-accent-soft)',
  shadow: 'var(--sf-shadow)',
  overlay: 'var(--sf-overlay)'
} as const;
