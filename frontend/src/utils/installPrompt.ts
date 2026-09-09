// frontend/src/utils/installPrompt.ts
//
// التقاط حدث التثبيت **قبل** أن يُركّب React أي مكوّن.
//
// **هذا هو سبب أن الزرّ لم يكن يفعل شيئاً:** كروم يطلق `beforeinstallprompt`
// بمجرّد أن يستوفي الموقع شروط التثبيت — وذلك يحدث عادةً قبل أن يُركّب
// React شجرته. والمستمع الذي يُسجَّل داخل `useEffect` يصل بعد أن مرّ الحدث
// وذهب، فيبقى `deferred` فارغاً. ثم يظهر الشريط (لسببٍ آخر) وتُصادف النقرة
// `if (!deferred) return;` فلا يحدث شيء ولا تُطبع رسالة.
//
// والحدث **لا يُعاد إطلاقه** إلا بعد إعادة تحميل الصفحة، فلا سبيل لتدارك
// فواته. لذلك يُلتقط هنا: هذه الوحدة تُستورد من `main.tsx` فتُنفَّذ مع أوّل
// سطرٍ من التطبيق.

/** حدث كروم غير القياسي — ليس في مكتبة أنواع DOM */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => {
  try {
    fn();
  } catch (error) {
    console.warn('install listener failed:', error);
  }
});

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // بلا `preventDefault` يعرض كروم شريطه الصغير أسفل الشاشة — وهو
    // يُتجاهَل غالباً، ولا يمكن عرضه في اللحظة التي نختارها
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    // الحدث يُستهلك بالتثبيت: الاحتفاظ به يعني زرّاً يُعرض لتطبيقٍ مثبَّت
    deferred = null;
    notify();
  });
}

/** هل يستطيع المتصفّح فتح نافذة التثبيت الآن؟ */
export const canPromptInstall = (): boolean => deferred !== null;

export const wasInstalledThisSession = (): boolean => installed;

/** يُشعَر عند وصول الحدث أو عند التثبيت — يُرجع دالّة إلغاء الاشتراك */
export const onInstallStateChange = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export type PromptOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'failed';

/**
 * يفتح نافذة التثبيت.
 *
 * **يجب أن تُنادى من نقرة المستخدم مباشرةً** — كروم يرفض `prompt()` خارج
 * إيماءةٍ حقيقية. ولا `await` قبلها في مسار النقرة لهذا السبب.
 */
export const promptInstall = async (): Promise<PromptOutcome> => {
  if (!deferred) return 'unavailable';
  const event = deferred;
  try {
    await event.prompt();
    const choice = await event.userChoice;
    // الحدث يصلح مرّةً واحدة: إعادة استعماله ترمي
    deferred = null;
    notify();
    return choice.outcome;
  } catch (error) {
    console.warn('promptInstall failed:', error);
    deferred = null;
    notify();
    return 'failed';
  }
};

export default { canPromptInstall, onInstallStateChange, promptInstall };
