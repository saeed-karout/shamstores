// frontend/src/services/track.ts
//
// تتبّعُ أحداث واجهة المتجر — لتقارير التاجر، لا لتتبّع الأشخاص.
//
// **ثلاث قواعد تحكم كل ما دونه:**
//
// ١. **لا يُعطّل التصفّح أبداً.** الإرسال بـ`sendBeacon` — يخرج في الخلفية
//    ولا يمنع الانتقال إلى صفحةٍ أخرى، ولا ينتظر رداً. وكلُّ شيء داخل
//    `try` صامت: خللٌ في الإحصاء لا يجوز أن يُسقط زرّ «أضف إلى السلّة».
//
// ٢. **لا يُعرِّف شخصاً.** لا كعكة ولا معرّفٌ دائم. `sessionId` رقمٌ عشوائيّ
//    في `sessionStorage` — يعيش في التبويب وينتهي بإغلاقه، فلا يتبع أحداً
//    بين المتاجر ولا بين الأيام.
//
// ٣. **الدفعة لا الطلب.** زائرٌ يتنقّل بين عشر بطاقات يُنتج عشرة أحداث،
//    وعشرةُ طلباتٍ شبكيّة على جوّالٍ بشبكةٍ ضعيفة تُبطئ الصفحة التي نقيسها.
//    فتُجمَّع ثانيةً واحدة ثمّ تُرسل مرّة.

const SESSION_KEY = 'sham_sid';
const SOURCE_KEY = 'sham_src';
const FLUSH_MS = 1000;
const MAX_QUEUE = 20;

export type TrackEvent =
  | 'view_store'
  | 'view_product'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'order_placed';

interface Queued {
  type: TrackEvent;
  productId?: string;
  sessionId: string;
  source: string;
  device: 'mobile' | 'desktop';
}

/** يُقرأ مرّةً ويُحفظ: عشوائيٌّ لا مُشتقٌّ من شيءٍ عن الزائر */
const sessionId = (): string => {
  try {
    const found = sessionStorage.getItem(SESSION_KEY);
    if (found) return found;
    const made =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 24)
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, made);
    return made;
  } catch {
    // متصفّحٌ يمنع التخزين: نبقى بمعرّفٍ لهذه الصفحة وحدها. رقمُ الزيارات
    // يصير أعلى من الحقيقة، والبديل أن نفقد الزيارة كلّها
    return 'nostore' + Math.random().toString(36).slice(2, 10);
  }
};

/**
 * مصدر **الزيارة** لا الصفحة.
 *
 * `document.referrer` بعد أوّل نقلةٍ داخلية يصير صفحتنا نفسها، فمن دخل من
 * إنستغرام ثمّ فتح منتجاً يُحسب `direct` — وهو أسوأ خطأٍ ممكن في تقرير
 * المصادر: يُفرِغ القناة التي تعمل. فيُحفظ أوّل مُحيلٍ للجلسة ويُستعمل
 * لكلّ أحداثها.
 */
const source = (): string => {
  try {
    const kept = sessionStorage.getItem(SOURCE_KEY);
    if (kept) return kept;

    let value = 'direct';
    const ref = document.referrer;
    if (ref) {
      try {
        const host = new URL(ref).hostname.toLowerCase().replace(/^(www|m|l)\./, '');
        if (host && host !== location.hostname.toLowerCase() && !host.endsWith('.shamstores.com')) {
          const groups: Array<[RegExp, string]> = [
            [/(^|\.)instagram\.com$/, 'instagram'],
            [/(^|\.)facebook\.com$|(^|\.)fb\.(com|me)$/, 'facebook'],
            [/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/, 'whatsapp'],
            [/(^|\.)t\.me$|(^|\.)telegram\.(org|me)$/, 'telegram'],
            [/(^|\.)tiktok\.com$/, 'tiktok'],
            [/(^|\.)snapchat\.com$/, 'snapchat'],
            [/(^|\.)google\./, 'google'],
            [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'youtube'],
            [/(^|\.)x\.com$|(^|\.)twitter\.com$/, 'x']
          ];
          value = groups.find(([re]) => re.test(host))?.[1] || host.slice(0, 60);
        }
      } catch {
        /* مُحيلٌ غير صالح — يبقى direct */
      }
    }

    sessionStorage.setItem(SOURCE_KEY, value);
    return value;
  } catch {
    return 'direct';
  }
};

const device = (): 'mobile' | 'desktop' => {
  try {
    return window.matchMedia('(min-width: 768px)').matches ? 'desktop' : 'mobile';
  } catch {
    return 'mobile';
  }
};

// ==================== الطابور ====================

let scope: { businessType: 'store' | 'restaurant'; businessId: string } | null = null;
let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * ما أُرسل مرّةً في هذه الجلسة ولا يُعاد.
 *
 * **مشاهدةُ المنتج تُحسب مرّةً لكل جلسة:** من رجع إلى المنتج ثلاث مرّات
 * لم يُشاهده ثلاثاً بمعنىً يفيد التاجر، ورقمٌ منتفخٌ يُخفي أيُّ منتجٍ
 * يُشاهَد فعلاً. والأحداثُ التي تعني فعلاً متكرّراً — الإضافة إلى السلّة
 * والطلب — لا تُخضع لهذا.
 */
const ONCE_KEY = 'sham_seen';
const ONCE_TYPES = new Set<TrackEvent>(['view_store', 'view_product']);

/**
 * وهي في `sessionStorage` لا في الذاكرة — **وهذا فرقٌ يُقاس:** ذاكرة
 * الوحدة تُمسح عند كلّ تحميلٍ كامل للصفحة، فمن فتح المتجر ثمّ رجع إليه
 * بزرّ المتصفّح يُحسب «زيارة متجرٍ» ثانية. والوعدُ «مرّةً لكل جلسة» يجب
 * أن يصدق على الجلسة كما يفهمها الزائر: التبويب حتى يُغلق.
 */
const seen = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(ONCE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

const remember = (key: string) => {
  try {
    const set = seen();
    set.add(key);
    // سقفٌ حتى لا ينمو التخزين بمن تصفّح مئة منتج
    const list = [...set].slice(-200);
    sessionStorage.setItem(ONCE_KEY, JSON.stringify(list));
  } catch {
    /* بلا تخزين: يُحسب مكرّراً — أهون من فقدان الحدث */
  }
};

const endpoint = (): string => {
  const base = import.meta.env.VITE_API_URL || '/api';
  return `${base.replace(/\/$/, '')}/public/events`;
};

const flush = () => {
  timer = null;
  if (!scope || !queue.length) return;

  const payload = JSON.stringify({
    businessType: scope.businessType,
    businessId: scope.businessId,
    events: queue
  });
  queue = [];

  try {
    // `sendBeacon` يخرج حتى وقد أُغلقت الصفحة — وهو الفرق بين قياس من
    // ضغط «إتمام الطلب» ومن اختفى قبل أن يصل الطلب
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(endpoint(), new Blob([payload], { type: 'application/json' }));
      if (ok) return;
    }
    fetch(endpoint(), {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    }).catch(() => {});
  } catch {
    /* لا شيء: الإحصاء لا يُعطّل شيئاً */
  }
};

/** يُنادى مرّةً عند معرفة المتجر */
export const setTrackScope = (businessType: 'store' | 'restaurant', businessId?: string | null) => {
  if (!businessId) return;
  if (scope && scope.businessId === businessId) return;
  scope = { businessType, businessId };
};

/** يُسجّل حدثاً — آمنٌ للنداء قبل معرفة المتجر (يُهمَل) */
export const track = (type: TrackEvent, productId?: string) => {
  try {
    if (!scope) return;

    if (ONCE_TYPES.has(type)) {
      const key = type + ':' + (productId || '');
      if (seen().has(key)) return;
      remember(key);
    }

    if (queue.length >= MAX_QUEUE) return;
    queue.push({ type, productId, sessionId: sessionId(), source: source(), device: device() });

    if (!timer) timer = setTimeout(flush, FLUSH_MS);
  } catch {
    /* صامت */
  }
};

// الصفحةُ تُخفى قبل أن يمرّ المؤقّت أحياناً — فنُرسل ما في الطابور فوراً.
// `pagehide` لا `beforeunload`: الأخير لا يُطلق على iOS
if (typeof window !== 'undefined') {
  const onLeave = () => {
    if (queue.length) flush();
  };
  window.addEventListener('pagehide', onLeave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onLeave();
  });
}

export default { track, setTrackScope };
