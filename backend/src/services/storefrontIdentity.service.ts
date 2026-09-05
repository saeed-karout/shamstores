// backend/src/services/storefrontIdentity.service.ts
//
// اسم الواجهة (`slug` و`subdomain`) — قيمة واحدة في عمودين.
//
// **العطل الذي تصلحه هذه الوحدة:** تحديث المتجر كان يتجاهل `slug` بصمت
// ويردّ «تم التحديث بنجاح» ومعه الاسم القديم. ومسار الـ subdomain المستقل
// كان يكتب `subdomain` وحده، فيبقى `slug` على قيمته السابقة — والبحث
// العام يطابق أيّهما، فيعمل الرابطان معاً ويظنّ التاجر أن القديم «لم
// يُحذف». اسمان لواجهة واحدة يربكان الروابط والفهرسة والإحصاءات.
//
// فالحقلان يتغيّران معاً هنا دائماً، ولا يُكتبان في مكان آخر.
//
// والتفرّد يُفحص **عبر الجدولين وعمودَيهما الأربعة**: المطاعم والمتاجر
// تتقاسم فضاء النطاقات الفرعية، وفحصُ عمود واحد يسمح بتصادم يظهر متأخراً
// كخطأ Prisma غامض بحالة 500.

import prisma from './prisma';
import slugify from '../utils/slugify';
import { isReservedSubdomain, invalidateDomainCache } from './domain.service';

export type StorefrontType = 'restaurant' | 'store';

/** حروف إنجليزية وأرقام وشرطات، لا تبدأ أو تنتهي بشرطة */
const HANDLE_PATTERN = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;

export const MIN_HANDLE = 3;
export const MAX_HANDLE = 63;

export interface RenameResult {
  ok: boolean;
  /** حالة HTTP المقترحة — 400 لصيغة خاطئة، 409 لاسم مأخوذ */
  status?: number;
  error?: string;
  slug?: string;
  subdomain?: string;
}

/**
 * يطبّع المُدخَل إلى اسم صالح.
 *
 * يمرّ بـ slugify لا بالتحقق وحده: التاجر يكتب «Disney Store» ويتوقّع أن
 * تعمل. رفضها بحجّة المسافة يجعله يجرّب خمس مرات قبل أن يفهم.
 */
export const normalizeHandle = (input: unknown): string =>
  slugify(String(input ?? '').trim().toLowerCase())
    // العربية مسموحة في slugify لكنها لا تصلح نطاقاً فرعياً
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');

export const validateHandle = (handle: string): { ok: boolean; error?: string } => {
  if (handle.length < MIN_HANDLE || handle.length > MAX_HANDLE) {
    return { ok: false, error: `الاسم يجب أن يكون بين ${MIN_HANDLE} و${MAX_HANDLE} حرفاً` };
  }
  if (!HANDLE_PATTERN.test(handle)) {
    return { ok: false, error: 'أحرف إنجليزية وأرقام وشرطات فقط، ولا يبدأ أو ينتهي بشرطة' };
  }
  if (isReservedSubdomain(handle)) {
    return { ok: false, error: 'هذا الاسم محجوز للمنصة، اختر اسماً آخر' };
  }
  return { ok: true };
};

/** هل الاسم مأخوذ في أي من الجدولين، سواء كـ slug أو subdomain؟ */
export const isHandleTaken = async (
  handle: string,
  exclude?: { type: StorefrontType; id: string }
): Promise<boolean> => {
  const match = { OR: [{ slug: handle }, { subdomain: handle }] };

  const [restaurant, store] = await Promise.all([
    prisma.restaurant.findFirst({
      where:
        exclude?.type === 'restaurant'
          ? { ...match, id: { not: exclude.id } }
          : match,
      select: { id: true }
    }),
    prisma.store.findFirst({
      where: exclude?.type === 'store' ? { ...match, id: { not: exclude.id } } : match,
      select: { id: true }
    })
  ]);

  return !!restaurant || !!store;
};

/**
 * يغيّر اسم الواجهة — العمودان معاً أو لا شيء.
 *
 * ⚠️ الروابط القديمة تنكسر بعد هذا. لا نُبقي الاسم القديم عاملاً: بقاؤه
 * هو العطل نفسه الذي نصلحه — واجهة بعنوانين تُقسّم الفهرسة وتُربك التاجر
 * حين يشارك أحدهما ويرى الآخر في لوحته.
 */
export const renameStorefront = async (
  type: StorefrontType,
  id: string,
  rawHandle: unknown
): Promise<RenameResult> => {
  const original = String(rawHandle ?? '').trim();
  const handle = normalizeHandle(rawHandle);

  // اسم عربي بالكامل يخرج من التطبيع فارغاً. رسالة «بين 3 و63 حرفاً»
  // تُحيّر من كتب اسماً طويلاً بالعربية — السبب اللغة لا الطول.
  if (original.length > 0 && handle.length === 0) {
    return {
      ok: false,
      status: 400,
      error: 'عنوان الواجهة يُكتب بأحرف إنجليزية وأرقام. اسم متجرك بالعربية يبقى كما هو.'
    };
  }

  const validation = validateHandle(handle);
  if (!validation.ok) {
    return { ok: false, status: 400, error: validation.error };
  }

  if (await isHandleTaken(handle, { type, id })) {
    return { ok: false, status: 409, error: 'هذا الاسم مستخدم بالفعل، اختر اسماً آخر' };
  }

  const data = { slug: handle, subdomain: handle };
  if (type === 'restaurant') {
    await prisma.restaurant.update({ where: { id }, data });
  } else {
    await prisma.store.update({ where: { id }, data });
  }

  // ذاكرة النطاقات تحمل الخريطة القديمة — بلا إبطالها يظل الاسم القديم يعمل
  invalidateDomainCache();

  return { ok: true, slug: handle, subdomain: handle };
};

export default { normalizeHandle, validateHandle, isHandleTaken, renameStorefront };
