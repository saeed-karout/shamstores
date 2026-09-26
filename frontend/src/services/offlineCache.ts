// frontend/src/services/offlineCache.ts
//
// تسخين مخزن عامل الخدمة بما حمّلته الصفحة فعلاً.
//
// **لماذا من الصفحة:** أوّل زيارة تحمّل حزمها قبل أن يتحكّم العامل بها،
// فلا تمرّ به ولا تُخزَّن. زبونٌ فتح المتجر مرّةً ثم انقطعت الكهرباء عن
// الراوتر كان سيجد صفحة «لا اتصال» في زيارته الثانية. الصفحة تعرف ما
// حمّلته (Resource Timing) فترسل القائمة، والعامل يخزّنها — راجع
// `public/firebase-messaging-sw.js`.

const isCacheableAsset = (href: string): boolean => {
  try {
    const url = new URL(href);
    if (url.origin !== window.location.origin) return false;
    return (
      url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/Fonts/') ||
      url.pathname.startsWith('/icons/')
    );
  } catch {
    return false;
  }
};

/**
 * يرسل للعامل الحزم والصفحة الحاليّة بعد اكتمال التحميل.
 *
 * بعد `load` وبمهلة: الحزم الكسولة للمسار الحاليّ تُطلب بعد الإقلاع، ومن
 * يُرسل مبكّراً يفوته أهمّها — حزمة صفحة المتجر نفسها.
 */
export const warmOfflineCache = (): void => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const send = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const assets = performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter(isCacheableAsset);
      registration.active?.postMessage({
        type: 'sham-sw:warm',
        assets: Array.from(new Set(assets)),
        shell: window.location.href
      });
    } catch {
      // التسخين تحسين — فشله لا يمسّ الصفحة
    }
  };

  const later = () => window.setTimeout(send, 2500);
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
};
