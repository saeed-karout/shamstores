// frontend/src/utils/storefrontPalettes.ts
//
// ثيمات ألوانٍ جاهزة لواجهة المتجر والمطعم — يختار التاجر واحداً بنقرة
// فتُملأ حقول الألوان الثمانية، ويبقى له تعديل أيّ لونٍ بعدها يدوياً.
//
// **كلّ ثيمٍ مجرَّب التباين:** `accent` هو لون الفعل (الأزرار والأسعار)
// فيجب أن يُقرأ نصّاً على `card` و`bg`. ثمانية منتقاة يدوياً أسلم من منتقي
// ألوانٍ حرّ يُخرج سعراً ليمونياً على أبيض.

export interface StorefrontPalette {
  key: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
}

export const STOREFRONT_PALETTES: StorefrontPalette[] = [
  {
    key: 'sham-light',
    name: 'هوية شام',
    primaryColor: '#084835',
    secondaryColor: '#C07CDF',
    backgroundColor: '#F6F8F5',
    cardColor: '#FFFFFF',
    surfaceColor: '#EEF3EF',
    textColor: '#10231B',
    mutedColor: '#647870',
    accentColor: '#084835'
  },
  {
    key: 'sham-night',
    name: 'شام الليلي',
    primaryColor: '#0C5C44',
    secondaryColor: '#C07CDF',
    backgroundColor: '#06231A',
    cardColor: '#0B2F24',
    surfaceColor: '#0F3A2D',
    textColor: '#EAF6EE',
    mutedColor: '#9DC4AC',
    accentColor: '#CDEF7C'
  },
  {
    key: 'noir-gold',
    name: 'داكن ذهبي',
    primaryColor: '#2A2622',
    secondaryColor: '#8C6D3F',
    backgroundColor: '#0F0F10',
    cardColor: '#1A1A1C',
    surfaceColor: '#232326',
    textColor: '#F4EFE6',
    mutedColor: '#A39D93',
    accentColor: '#D4A64A'
  },
  {
    key: 'citrus',
    name: 'برتقالي عصري',
    primaryColor: '#E2521A',
    secondaryColor: '#FFB547',
    backgroundColor: '#FFF8F2',
    cardColor: '#FFFFFF',
    surfaceColor: '#FFEFE3',
    textColor: '#2A1A10',
    mutedColor: '#8A7466',
    accentColor: '#D9480F'
  },
  {
    key: 'mono',
    name: 'مينيمال',
    primaryColor: '#141312',
    secondaryColor: '#8A8378',
    backgroundColor: '#FAF8F4',
    cardColor: '#FFFFFF',
    surfaceColor: '#F0ECE5',
    textColor: '#111111',
    mutedColor: '#77736D',
    accentColor: '#111111'
  },
  {
    key: 'ocean',
    name: 'بحري',
    primaryColor: '#0B4A86',
    secondaryColor: '#2B8FE0',
    backgroundColor: '#F1F7FC',
    cardColor: '#FFFFFF',
    surfaceColor: '#E4EFF8',
    textColor: '#0B2033',
    mutedColor: '#5F768A',
    accentColor: '#0F5FA8'
  },
  {
    key: 'royal',
    name: 'بنفسجي',
    primaryColor: '#6C2E96',
    secondaryColor: '#C07CDF',
    backgroundColor: '#FAF6FD',
    cardColor: '#FFFFFF',
    surfaceColor: '#F1E8F8',
    textColor: '#24122F',
    mutedColor: '#7E6B8A',
    accentColor: '#7A3BA8'
  },
  {
    key: 'rose',
    name: 'وردي',
    primaryColor: '#B62A5D',
    secondaryColor: '#F07AA4',
    backgroundColor: '#FFF5F8',
    cardColor: '#FFFFFF',
    surfaceColor: '#FCE6EE',
    textColor: '#33101D',
    mutedColor: '#8D6877',
    accentColor: '#C2386B'
  }
];

export const DEFAULT_PALETTE = STOREFRONT_PALETTES[0];

type ColorFields = Omit<StorefrontPalette, 'key' | 'name'>;

const COLOR_KEYS: Array<keyof ColorFields> = [
  'primaryColor',
  'secondaryColor',
  'backgroundColor',
  'cardColor',
  'surfaceColor',
  'textColor',
  'mutedColor',
  'accentColor'
];

/** الثيم المطابق لألوان النموذج حرفياً — لإبراز المختار في اللوحة */
export const matchPalette = (form: Partial<Record<keyof ColorFields, string>>): StorefrontPalette | null =>
  STOREFRONT_PALETTES.find((p) =>
    COLOR_KEYS.every((k) => String(form[k] || '').toLowerCase() === p[k].toLowerCase())
  ) || null;

/** ألوان الثيم وحدها — لدمجها في نموذج الإعدادات بلا المفتاح والاسم */
export const paletteColors = (palette: StorefrontPalette): ColorFields => {
  const { key: _key, name: _name, ...colors } = palette;
  return colors;
};
