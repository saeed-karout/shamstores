// backend/src/services/productOptions.service.ts
//
// خيارات المنتج — لون، مقاس، إضافات… المرجع الوحيد لشكلها وتحقّقها.
//
// **العطل الذي تسدّه:** الواجهة كانت تعرض `sizes` و`addons` لأصناف المطعم،
// وهما حقلان **لا وجود لهما في المخطط** — فلوح الخيارات يفتح دائماً فارغاً.
// والمنتجات لم يكن لها خيارات أصلاً: زبون يطلب قميصاً بلا مقاس ولا لون،
// فيتصل به التاجر ليسأل — وهو ما تُفترض المنصة أن تُغنيه عنه.
//
// **السعر يُحسب هنا لا في المتصفح.** الواجهة ترسل ما اختاره الزبون، لا كم
// يجب أن يدفع: زيادة المقاس الكبير قابلة للتزوير في الطلب لو صدّقناها.

export type OptionType = 'single' | 'multi';

export interface OptionValue {
  label: string;
  /** يُضاف إلى سعر الوحدة. صفر أو أكثر. */
  priceDelta: number;
  /**
   * صورة تمثّل القيمة — للألوان خاصةً.
   *
   * «أزرق» كلمة؛ والأزرق الحقيقي درجات. الزبون الذي يرى الاسم وحده يطلب
   * ثم يفاجأ، والمفاجأة تعني إرجاعاً. الصورة تحسم قبل الطلب لا بعده.
   */
  image?: string | null;
}

export interface OptionGroup {
  name: string;
  type: OptionType;
  required: boolean;
  values: OptionValue[];
}

/** حدود تحمي الواجهة من قائمة لا تُقرأ ولا تُمرَّر */
export const MAX_GROUPS = 6;
export const MAX_VALUES = 30;

const text = (value: unknown, max: number): string =>
  String(value ?? '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);

/**
 * يطبّع ما يرسله التاجر إلى شكل صالح للتخزين.
 *
 * يتجاهل الفاسد بدل رفض الحفظ كلّه: مجموعة بلا قيم أو قيمة بلا اسم خطأٌ
 * في الإدخال لا سبب لإسقاط تعديل المنتج بأكمله عنده.
 */
export const normalizeOptions = (raw: unknown): OptionGroup[] => {
  let input = raw;
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(input)) return [];

  const groups: OptionGroup[] = [];

  for (const item of input.slice(0, MAX_GROUPS)) {
    if (!item || typeof item !== 'object') continue;

    const name = text((item as any).name, 40);
    if (!name) continue;

    const rawValues = Array.isArray((item as any).values) ? (item as any).values : [];
    const seen = new Set<string>();
    const values: OptionValue[] = [];

    for (const value of rawValues.slice(0, MAX_VALUES)) {
      const label = text(value && typeof value === 'object' ? (value as any).label : value, 40);
      // التكرار يربك الزبون ويجعل الاختيار غامضاً عند الطلب
      if (!label || seen.has(label)) continue;
      seen.add(label);

      const delta = Number(
        value && typeof value === 'object' ? (value as any).priceDelta ?? 0 : 0
      );
      // الصورة رابط أو لا شيء — قيمة غير صالحة تُهمَل ولا تُسقط الحفظ
      const rawImage =
        value && typeof value === 'object' ? String((value as any).image ?? '').trim() : '';
      const image = /^https?:\/\//i.test(rawImage) || rawImage.startsWith('/') ? rawImage.slice(0, 500) : null;

      values.push({
        label,
        priceDelta: Number.isFinite(delta) && delta > 0 ? Math.round(delta) : 0,
        image
      });
    }

    if (values.length === 0) continue;

    groups.push({
      name,
      type: (item as any).type === 'multi' ? 'multi' : 'single',
      required: (item as any).required === true,
      values
    });
  }

  return groups;
};

/** يقرأ الخيارات المخزّنة (قد تصل كنص JSON حسب مسار الحفظ) */
export const parseOptions = (stored: unknown): OptionGroup[] => normalizeOptions(stored);

export interface SelectionResult {
  ok: boolean;
  error?: string;
  /** أول مجموعة مفردة — تُخزَّن في OrderItem.size الموجود أصلاً */
  size?: string | null;
  /** بقية الاختيارات بصيغة «المجموعة: القيمة» */
  addons?: string[];
  /** ما يُضاف إلى سعر الوحدة */
  priceDelta: number;
}

/**
 * يتحقّق من اختيار الزبون ويحسب فرق السعر.
 *
 * الاختيار يصل بصيغة `{ "اللون": "أحمر", "إضافات": ["تغليف هدية"] }`.
 */
export const validateSelection = (
  stored: unknown,
  rawSelection: unknown
): SelectionResult => {
  const groups = parseOptions(stored);
  if (groups.length === 0) return { ok: true, priceDelta: 0, size: null, addons: [] };

  const selection: Record<string, unknown> =
    rawSelection && typeof rawSelection === 'object' ? (rawSelection as any) : {};

  let priceDelta = 0;
  let size: string | null = null;
  const addons: string[] = [];
  let singleSeen = false;

  for (const group of groups) {
    const picked = selection[group.name];
    const labels = (Array.isArray(picked) ? picked : picked === undefined || picked === null ? [] : [picked])
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (labels.length === 0) {
      if (group.required) {
        return { ok: false, error: `اختر «${group.name}» قبل إتمام الطلب`, priceDelta: 0 };
      }
      continue;
    }

    // مجموعة مفردة باختيارين ليست خطأ إدخال بل محاولة تجاوز — تُرفض
    if (group.type === 'single' && labels.length > 1) {
      return { ok: false, error: `«${group.name}» يقبل خياراً واحداً`, priceDelta: 0 };
    }

    for (const label of labels) {
      const value = group.values.find((v) => v.label === label);
      if (!value) {
        return { ok: false, error: `خيار غير متاح في «${group.name}»`, priceDelta: 0 };
      }
      priceDelta += value.priceDelta;

      if (group.type === 'single' && !singleSeen) {
        // أول مجموعة مفردة تملأ عمود size القائم؛ الباقي يذهب إلى addons
        size = label;
        singleSeen = true;
      } else {
        addons.push(`${group.name}: ${label}`);
      }
    }
  }

  return { ok: true, priceDelta, size, addons };
};

export default { normalizeOptions, parseOptions, validateSelection, MAX_GROUPS, MAX_VALUES };
