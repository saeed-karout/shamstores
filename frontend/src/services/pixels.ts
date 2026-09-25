// frontend/src/services/pixels.ts
//
// أدوات تتبّع التاجر الإعلانية على واجهته — Meta Pixel وTikTok Pixel وGA4.
//
// **الشيفرة رسمية ومحقونة هنا لا ملصوقة من التاجر:** يحفظ التاجر المعرّف
// وحده (الخادم يفحص صيغته)، ونحن نكتب الشيفرة المعروفة لكل منصّة. لصقُ
// `<script>` حرّ كان سيفتح واجهته — وزبائنه — لأيّ شيفرة.
//
// **والأحداث من مصدرٍ واحد:** `track()` في services/track.ts يُطلق حدث
// الإحصاء الداخلي، ويمرّ هنا أيضاً فيُترجَم إلى لغة كل منصّة: `view_product`
// ← ViewContent، و`add_to_cart` ← AddToCart، و`order_placed` ← Purchase.
// فلا تُكتب نداءات البكسل في كل صفحة وتُنسى في واحدة.
//
// **والتنظيف عند المغادرة:** الزائر قد ينتقل من متجرٍ إلى الصفحة الرئيسية في
// التطبيق نفسه، فتُعطَّل الإرسالات — لا تُسجَّل زيارات المنصّة في حساب التاجر.

export interface PixelSettings {
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  ga4Id?: string | null;
}

export interface PixelDetail {
  value?: number;
  currency?: string;
  contentId?: string;
  contentName?: string;
}

type AnyWindow = Window & {
  fbq?: any;
  _fbq?: any;
  ttq?: any;
  gtag?: (...args: any[]) => void;
  dataLayer?: any[];
};

let active: PixelSettings | null = null;
const loaded = new Set<string>();

const addScript = (id: string, src: string) => {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
};

/** شيفرة ميتا الرسمية (مختصرة): طابورٌ يستقبل النداءات قبل وصول المكتبة */
const installMeta = (pixelId: string) => {
  const w = window as AnyWindow;
  if (!w.fbq) {
    const fbq: any = function (...args: any[]) {
      fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    w.fbq = fbq;
    w._fbq = fbq;
    addScript('sf-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js');
  }
  if (!loaded.has(`meta:${pixelId}`)) {
    w.fbq('init', pixelId);
    loaded.add(`meta:${pixelId}`);
  }
};

/** شيفرة تيك توك الرسمية (مختصرة) */
const installTikTok = (pixelId: string) => {
  const w = window as AnyWindow;
  if (!w.ttq) {
    const ttq: any = [];
    const methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    ttq.methods = methods;
    methods.forEach((m) => {
      ttq[m] = (...args: any[]) => ttq.push([m, ...args]);
    });
    ttq.load = (id: string) => {
      addScript(`sf-tiktok-${id}`, `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`);
    };
    w.ttq = ttq;
  }
  if (!loaded.has(`tiktok:${pixelId}`)) {
    w.ttq.load(pixelId);
    loaded.add(`tiktok:${pixelId}`);
  }
};

/** Google Analytics 4 */
const installGa4 = (measurementId: string) => {
  const w = window as AnyWindow;
  if (!w.gtag) {
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
    w.gtag('js', new Date());
    addScript(`sf-ga4-${measurementId}`, `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`);
  }
  if (!loaded.has(`ga4:${measurementId}`)) {
    // الصفحة يُرسلها `firePixel('page_view')` — لا إرسالٌ تلقائيّ مكرّر
    w.gtag('config', measurementId, { send_page_view: false });
    loaded.add(`ga4:${measurementId}`);
  }
};

/**
 * يفعّل أدوات هذا المتجر — ويُرجع دالّة إيقاف تُنادى عند مغادرة واجهته.
 * لا يفعل شيئاً إن لم يُضبط أيّ معرّف (أو لم يستحقّه التاجر: يصل `null`).
 */
export const activatePixels = (settings?: PixelSettings | null): (() => void) => {
  if (typeof window === 'undefined' || !settings) return () => undefined;
  const has = settings.metaPixelId || settings.tiktokPixelId || settings.ga4Id;
  if (!has) return () => undefined;
  try {
    if (settings.metaPixelId) installMeta(settings.metaPixelId);
    if (settings.tiktokPixelId) installTikTok(settings.tiktokPixelId);
    if (settings.ga4Id) installGa4(settings.ga4Id);
    active = settings;
    firePixel('page_view');
  } catch {
    /* أداة تتبّعٍ معطوبة لا تُسقط المتجر */
  }
  return () => {
    if (active === settings) active = null;
  };
};

const META_EVENTS: Record<string, string> = {
  page_view: 'PageView',
  view_product: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  order_placed: 'Purchase'
};
const TIKTOK_EVENTS: Record<string, string> = {
  view_product: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  order_placed: 'CompletePayment'
};
const GA4_EVENTS: Record<string, string> = {
  page_view: 'page_view',
  view_product: 'view_item',
  add_to_cart: 'add_to_cart',
  begin_checkout: 'begin_checkout',
  order_placed: 'purchase'
};

/** يُترجم حدثاً داخلياً إلى أحداث المنصّات المفعّلة */
export const firePixel = (type: string, detail: PixelDetail = {}) => {
  const settings = active;
  if (!settings || typeof window === 'undefined') return;
  const w = window as AnyWindow;
  const hasValue = typeof detail.value === 'number' && detail.value > 0;
  const money = hasValue ? { value: detail.value, currency: detail.currency || 'SYP' } : {};
  try {
    if (settings.metaPixelId && w.fbq && META_EVENTS[type]) {
      w.fbq('track', META_EVENTS[type], {
        ...money,
        ...(detail.contentId ? { content_ids: [detail.contentId], content_type: 'product' } : {}),
        ...(detail.contentName ? { content_name: detail.contentName } : {})
      });
    }
    if (settings.tiktokPixelId && w.ttq) {
      if (type === 'page_view') w.ttq.page();
      else if (TIKTOK_EVENTS[type]) {
        w.ttq.track(TIKTOK_EVENTS[type], {
          ...money,
          ...(detail.contentId ? { content_id: detail.contentId, content_type: 'product' } : {})
        });
      }
    }
    if (settings.ga4Id && w.gtag && GA4_EVENTS[type]) {
      w.gtag('event', GA4_EVENTS[type], {
        send_to: settings.ga4Id,
        ...money,
        ...(detail.contentId ? { items: [{ item_id: detail.contentId, item_name: detail.contentName }] } : {})
      });
    }
  } catch {
    /* صامت — التتبّع لا يعطّل الشراء */
  }
};

export default { activatePixels, firePixel };
