// backend/src/services/catalogTaxonomy.service.ts
//
// قواعد التصنيفات الفرعية والوسوم — في موضعٍ واحد.
//
// **لماذا خدمةٌ لا شرطٌ في المتحكّم:** التصنيف يُنشأ ويُعدَّل من مسارَين
// (المتجر والمطعم)، والوسوم تُكتب من ثلاثة (شاشة المنتج، والاستيراد،
// وشاشة الإدارة). وقاعدةٌ مكتوبة في كل موضعٍ تتفرّق عند أوّل تعديل —
// فيصير عمقُ الشجرة مستويين هنا وثلاثةً هناك.

import prisma from './prisma';

// ==================== الوسوم ====================

/** أكثر من هذا لا يُقرأ على بطاقةٍ ولا يُفرز به أحد */
const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 28;

/**
 * ينقّي مصفوفة الوسوم.
 *
 * **التطبيع قبل إزالة التكرار:** التاجر يكتب «قطن» و«قطن » و«  قطن»،
 * فتظهر ثلاث شرائح لوسمٍ واحد في شريط التصفية. والمقارنة بعد التطبيع
 * تُبقي أوّل شكلٍ كتبه — لأن حالة الأحرف قد تكون مقصودة في «SHEIN».
 */
export const sanitizeTags = (raw: unknown): string[] | null => {
  let list: unknown[] = [];

  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string') {
    // الفاصلة المنقوطة أوّلاً: هي فاصل الوسوم داخل خلية CSV، لأن الفاصلة
    // تفصل الأعمدة نفسها
    list = raw.split(/[;،,]/);
  } else if (raw === null) return null;
  else return null;

  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of list) {
    if (typeof item !== 'string') continue;
    const tag = item.replace(/\s+/g, ' ').trim();
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) continue;

    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }

  return out.length ? out : null;
};

/** يقرأ الوسوم المخزَّنة — العمود JSON وقد يحمل ما ليس مصفوفة */
export const readTags = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((t): t is string => typeof t === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
};

// ==================== التصنيفات الفرعية ====================

export class TaxonomyError extends Error {}

interface ParentCheck {
  /** التصنيف الذي يُعدَّل — غائبٌ عند الإنشاء */
  categoryId?: string;
  parentId: string | null;
  storeId?: string | null;
  restaurantId?: string | null;
}

/**
 * يتحقّق من صلاحية الأب ويُرجعه.
 *
 * القواعد الأربع، وكلٌّ منها تمنع خللاً وقع في أنظمةٍ قبلنا:
 *
 *   ١. **الأب في نفس النشاط** — وإلا نُقل تصنيفٌ تحت تصنيف متجرٍ آخر.
 *   ٢. **لا أبٌ لنفسه** — حلقةٌ من عنصرٍ واحد تُعلّق كل عرضٍ شجريّ.
 *   ٣. **الأب لا أبَ له** — هذا ما يحدّ الشجرة بمستويين.
 *   ٤. **الذي له أبناء لا يصير ابناً** — وإلا صار له حفيدٌ من الباب الخلفيّ.
 */
export const resolveParent = async ({
  categoryId,
  parentId,
  storeId,
  restaurantId
}: ParentCheck): Promise<string | null> => {
  if (!parentId) return null;

  if (categoryId && parentId === categoryId) {
    throw new TaxonomyError('لا يكون التصنيف أباً لنفسه');
  }

  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { id: true, storeId: true, restaurantId: true, parentId: true }
  });

  if (!parent) throw new TaxonomyError('التصنيف الأب غير موجود');

  const sameOwner = storeId
    ? parent.storeId === storeId
    : restaurantId
      ? parent.restaurantId === restaurantId
      : false;
  if (!sameOwner) throw new TaxonomyError('التصنيف الأب ليس في نشاطك');

  if (parent.parentId) {
    throw new TaxonomyError('التصنيفات مستويان: لا يُضاف تصنيفٌ تحت تصنيفٍ فرعيّ');
  }

  if (categoryId) {
    const children = await prisma.category.count({ where: { parentId: categoryId } });
    if (children > 0) {
      throw new TaxonomyError(
        `هذا التصنيف يحوي ${children} تصنيفاً فرعياً — انقلها أوّلاً ثمّ اجعله فرعياً`
      );
    }
  }

  return parentId;
};

/**
 * معرّفات التصنيف وأبنائه.
 *
 * تُستعمل عند التصفية: اختيار تصنيفٍ رئيسيّ يجب أن يُظهر منتجاته
 * **ومنتجات أبنائه** — وإلا ظهر التصنيف الرئيسيّ فارغاً لمن وزّع منتجاته
 * على الفرعيّات، وهو أوّل ما يفعله من يستعمل الميزة.
 */
export const categoryWithChildren = async (categoryId: string): Promise<string[]> => {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true }
  });
  return [categoryId, ...children.map((c) => c.id)];
};

export default { sanitizeTags, readTags, resolveParent, categoryWithChildren, TaxonomyError };
