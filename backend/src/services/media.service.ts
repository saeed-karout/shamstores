// backend/src/services/media.service.ts
//
// صور المنتجات وأصناف القوائم.
//
// المنتج كان يحمل صورة واحدة (`imageUrl` / `image`). أُضيفت `images` مصفوفةً،
// وبقي الحقل المفرد **غلافاً مشتقاً من أولها** لا حقلاً مستقلاً: 131 موضعاً
// في الخادم والواجهة يقرأ المفرد، واستبدالها دفعةً واحدة مخاطرة بلا مقابل.
//
// الخطر الوحيد في هذا التصميم أن يتباعد الحقلان — غلاف يشير إلى صورة ليست
// في المصفوفة، أو مصفوفة بلا غلاف. لذلك لا يُكتب أيّ منهما مباشرة: كل مسار
// كتابة يمرّ بـ `normalizeImages` التي تُخرجهما متّسقين دائماً.

/** حد أقصى للصور لكل منتج. أكثر من ذلك يُبطئ الصفحة ولا يبيع أكثر. */
export const MAX_IMAGES = Number(process.env.MAX_PRODUCT_IMAGES || 8);

export interface NormalizedImages {
  /** المصفوفة الكاملة، الغلاف أولها */
  images: string[];
  /** الغلاف — للحقل المفرد */
  cover: string | null;
}

const isUsableUrl = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 2048;

/** يقرأ الحقل المخزَّن مهما كان شكله: مصفوفة، أو نصّ JSON، أو تالفاً. */
export const parseImages = (raw: unknown): string[] => {
  let value = raw;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    // نصّ مفرد لا JSON — صورة واحدة مخزّنة بالشكل القديم
    if (!trimmed.startsWith('[')) return isUsableUrl(trimmed) ? [trimmed] : [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(value.filter(isUsableUrl).map((url) => url.trim()))
  ).slice(0, MAX_IMAGES);
};

/**
 * يوحّد المصفوفة والغلاف.
 *
 * `cover` المُمرَّر له الأولوية في ترتيب المصفوفة: التاجر الذي يختار صورة
 * غلافاً يتوقّع أن تظهر أولاً، لا أن تُدفن في مكانها القديم.
 */
export const normalizeImages = (rawImages: unknown, rawCover?: unknown): NormalizedImages => {
  const list = parseImages(rawImages);
  const cover = isUsableUrl(rawCover) ? rawCover.trim() : null;

  let ordered = list;
  if (cover) {
    ordered = [cover, ...list.filter((url) => url !== cover)].slice(0, MAX_IMAGES);
  }

  return { images: ordered, cover: ordered[0] ?? null };
};

/**
 * يبني حقول التحديث لنموذج المنتج أو الصنف.
 *
 * `imageField` يختلف بين النموذجين: `imageUrl` للمنتج و`image` للصنف — فرق
 * تاريخي في المخطط لا معنى له، لكن تغييره الآن يمسّ 131 موضعاً.
 *
 * يُرجع `null` حين لا يمسّ الطلب الصور إطلاقاً، فلا نكتب فوق صور قائمة بقيم
 * فارغة لمجرد أن التاجر عدّل السعر.
 */
export const buildImageUpdate = (
  body: Record<string, any>,
  imageField: 'imageUrl' | 'image'
): Record<string, any> | null => {
  const touchesImages = body.images !== undefined;
  const touchesCover = body[imageField] !== undefined;

  if (!touchesImages && !touchesCover) return null;

  const { images, cover } = normalizeImages(
    touchesImages ? body.images : undefined,
    touchesCover ? body[imageField] : undefined
  );

  return { images, [imageField]: cover };
};

/**
 * ما يُرسَل إلى واجهة الزبون: مصفوفة مضمونة غير فارغة متى وُجدت صورة واحدة.
 * تقرأ الحقل الجديد وتسقط إلى القديم — فالمنتجات التي أُنشئت قبل المصفوفة
 * تعرض صورتها بدل أن تظهر بلا صورة.
 */
export const getPublicImages = (entity: { images?: unknown } & Record<string, any>, imageField: 'imageUrl' | 'image'): string[] => {
  const fromArray = parseImages(entity?.images);
  if (fromArray.length > 0) return fromArray;

  const legacy = entity?.[imageField];
  return isUsableUrl(legacy) ? [legacy.trim()] : [];
};

export default { MAX_IMAGES, parseImages, normalizeImages, buildImageUpdate, getPublicImages };
