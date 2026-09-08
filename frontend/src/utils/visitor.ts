// frontend/src/utils/visitor.ts
//
// هوية الزائر بلا حساب.
//
// **لماذا نحتاجها:** معظم زبائن المتاجر يطلبون كضيوف. وبلا معرّفٍ ثابت لا
// سبيل لربط جهازٍ أذِن بالإشعارات، ولا لتذكّر سلّةٍ تُركت، ولا لمنع إرسال
// نفس الرسالة عشر مرّات لنفس الشخص.
//
// **وما هي ليست:** ليست تتبّعاً عبر المواقع ولا بصمةَ متصفّح. رقمٌ عشوائي
// يعيش في تخزين هذا الموقع وحده، يمسحه الزبون بمسح بيانات الموقع، ولا
// يُقرأ إلا من نطاقنا.

const KEY = 'sham_visitor_id';

/** معرّفٌ عشوائيّ لا مشتقٌّ من شيء — لا وقتٌ ولا جهاز يمكن ربطه بشخص */
const generate = (): string => {
  // `as` لا فحصٌ بـ`in`: تضييق TypeScript بعد `'randomUUID' in crypto`
  // يجعل الفرع التالي من نوع `never` فيرفض `getRandomValues` الموجودة فعلاً
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  try {
    if (typeof c?.randomUUID === 'function') return c.randomUUID();
    if (typeof c?.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* المتصفّحات القديمة تسقط إلى ما دونه */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

/**
 * يُرجع معرّف الزائر، ويولّده عند أوّل نداء.
 *
 * **يُرجع `null` لا يرمي** حين يُمنع التخزين (تصفّح خاص، أو إعدادات تحجب
 * بيانات المواقع). والمنادي يتعامل مع الغياب بتعطيل الميزة بهدوء — لا
 * بإظهار عطلٍ لزبونٍ لم يفعل شيئاً خاطئاً.
 */
export const getVisitorId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && existing.length >= 8) return existing;

    const fresh = generate();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
};

export default getVisitorId;
