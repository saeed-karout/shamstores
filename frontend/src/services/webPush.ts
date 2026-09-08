// frontend/src/services/webPush.ts
//
// إشعارات المتصفّح للتاجر.
//
// **ما تحلّه:** السوكِت يبلّغ اللوحة المفتوحة وحدها. والتاجر الذي أغلق
// التبويب — أو أقفل الحاسوب وذهب — لا يعلم بالطلب حتى يعود، وقد بَرَد
// وألغاه الزبون.
//
// **وحدودها الصادقة:** إشعار الويب لا يعمل على iOS إلا إذا أضاف المستخدم
// الموقع إلى شاشته الرئيسية (قيدٌ من Apple منذ 16.4). ويحتاج إذناً صريحاً
// يرفضه كثيرون. ولذلك ليس القناة الوحيدة — تيليجرام يغطّي من يسقط منها.

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, deleteToken, isSupported, onMessage } from 'firebase/messaging';
import api from './api';
import { getVisitorId } from '../utils/visitor';

const SW_PATH = '/firebase-messaging-sw.js';

/**
 * مشروع الإشعارات **قد يختلف عن مشروع المصادقة**.
 *
 * وهذا واقعُ المنصّة اليوم: المصادقة على مشروع `shamstores`، والخادم وتطبيق
 * السائق على `shamstores-ba667`. ورمزٌ يُصدره مشروعٌ ويرسل إليه آخر ترفضه
 * Google بـ`messaging/mismatched-credential` — وهو خطأ خبيث لأن كل الفحوص
 * تمرّ ولا يصل إشعار. كلّفنا ذلك ساعاتٍ في تطبيق السائق.
 *
 * فيُهيّأ تطبيق Firebase **مُسمّى** للإشعارات وحدها، بمتغيّرات `VITE_FCM_*`
 * التي تعود إلى `VITE_FIREBASE_*` حين تغيب — فتوحيدُ المشروعين لاحقاً لا
 * يحتاج تعديل شيفرة.
 */
const pick = (fcm: string, fallback: string): string =>
  (import.meta.env[fcm as keyof ImportMetaEnv] as string) ||
  (import.meta.env[fallback as keyof ImportMetaEnv] as string) ||
  '';

const config = {
  apiKey: pick('VITE_FCM_API_KEY', 'VITE_FIREBASE_API_KEY'),
  authDomain: pick('VITE_FCM_AUTH_DOMAIN', 'VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: pick('VITE_FCM_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID'),
  storageBucket: pick('VITE_FCM_STORAGE_BUCKET', 'VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: pick('VITE_FCM_MESSAGING_SENDER_ID', 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: pick('VITE_FCM_APP_ID', 'VITE_FIREBASE_APP_ID'),
};

/** مشروع الإشعارات كما تراه الواجهة — تقارنه صفحة الإعدادات بمشروع الخادم */
export const messagingProjectId = (): string => config.projectId;

/**
 * تطبيق مستقلّ باسم `messaging`.
 *
 * `initializeApp` بالاسم الافتراضي مرّتين يرمي، وتطبيقُ المصادقة مُهيّأ
 * أصلاً في `firebaseConfig.ts`. الاسم يفصل بينهما فيتعايشان.
 */
const MESSAGING_APP = 'messaging';

const messagingApp = (): FirebaseApp | null => {
  if (!config.projectId || !config.apiKey || !config.messagingSenderId) return null;
  try {
    const existing = getApps().find((app) => app.name === MESSAGING_APP);
    return existing || initializeApp(config, MESSAGING_APP);
  } catch {
    try {
      return getApp(MESSAGING_APP);
    } catch {
      return null;
    }
  }
};

/**
 * مفتاح VAPID.
 *
 * يُولَّد مرّةً من: Firebase Console ← Project settings ← Cloud Messaging ←
 * Web configuration ← Web Push certificates. بدونه يرفض `getToken` بلا رسالة
 * مفهومة — ولذلك نفحصه أولاً ونقول السبب صراحةً.
 */
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export type PushState =
  | 'unsupported'      // متصفّح لا يدعم إشعارات الدفع
  | 'ios-needs-pwa'    // iOS: لا يعمل إلا بتثبيت الموقع على الشاشة الرئيسية
  | 'not-configured'   // ينقص إعداد Firebase أو مفتاح VAPID
  | 'denied'           // المستخدم رفض الإذن — لا سبيل لإعادة السؤال برمجياً
  | 'granted'          // مفعّل على هذا الجهاز
  | 'default';         // لم يُسأل بعد

const isIos = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);

const isStandalone = (): boolean =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

/** اسمٌ يميّز الجهاز في قائمة الإعدادات — «Chrome على Windows» لا سلسلة UA */
export const describeDevice = (): string => {
  const ua = navigator.userAgent;
  const browser =
    /Edg\//.test(ua) ? 'Edge'
      : /OPR\//.test(ua) ? 'Opera'
      : /Chrome\//.test(ua) ? 'Chrome'
      : /Firefox\//.test(ua) ? 'Firefox'
      : /Safari\//.test(ua) ? 'Safari'
      : 'متصفّح';
  const os =
    /Android/.test(ua) ? 'Android'
      : isIos() ? 'iPhone'
      : /Windows/.test(ua) ? 'Windows'
      : /Mac OS/.test(ua) ? 'Mac'
      : /Linux/.test(ua) ? 'Linux'
      : '';
  return os ? `${browser} على ${os}` : browser;
};

export const getPushState = async (): Promise<PushState> => {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    // iOS يُخفي الإشعارات كلّياً خارج وضع التطبيق المثبَّت — الرسالة تقول
    // له كيف يفعّلها بدل «متصفّحك غير مدعوم»
    return isIos() && !isStandalone() ? 'ios-needs-pwa' : 'unsupported';
  }
  if (!(await isSupported().catch(() => false))) {
    return isIos() && !isStandalone() ? 'ios-needs-pwa' : 'unsupported';
  }
  if (!messagingApp() || !VAPID_KEY) return 'not-configured';

  return Notification.permission as PushState;
};

/** يسجّل عامل الخدمة ومعه الإعداد — مصدر حقيقة واحد لا نسخة ثانية */
const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  const query = new URLSearchParams(config as Record<string, string>).toString();
  return navigator.serviceWorker.register(`${SW_PATH}?${query}`, { scope: '/' });
};

/**
 * يسجّل عامل الخدمة عند إقلاع التطبيق — لا عند تفعيل الإشعارات وحده.
 *
 * **لماذا مبكّراً:** كروم لا يعرض «تثبيت التطبيق» إلا لموقعٍ **عامل خدمته
 * مسجَّلٌ وفعّال** ولديه بيانٌ صالح. والتسجيل عند تفعيل الإشعارات وحده
 * يعني أن الزبون الذي لم يفعّلها لا يُعرض عليه التثبيت أصلاً — ولا يستطيع
 * تفعيلها على iPhone قبل أن يثبّت. حلقةٌ مغلقة كسْرُها هنا.
 *
 * الفشل صامتٌ عمداً: موقعٌ بلا عامل خدمة يعمل كما كان، والتثبيت وحده
 * يغيب.
 */
export const registerAppServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    await registerServiceWorker();
  } catch (error) {
    console.warn('تعذّر تسجيل عامل الخدمة:', error);
  }
};

/** هل يعمل التطبيق مثبَّتاً على الشاشة الرئيسية؟ */
export const isInstalled = (): boolean => isStandalone();

/** هل الجهاز iPhone/iPad؟ يقرّر أي تعليمات تثبيتٍ تُعرض */
export const isIosDevice = (): boolean => isIos();

export interface EnableResult {
  ok: boolean;
  state: PushState;
  error?: string;
}

/**
 * يطلب الإذن ويسجّل الجهاز.
 *
 * **يُنادى من نقرة المستخدم لا عند التحميل.** المتصفّحات تحجب طلب الإذن
 * التلقائي، والأسوأ أن رفضاً واحداً دائم: لا سبيل برمجياً لإعادة السؤال،
 * ويضطرّ التاجر إلى إعدادات المتصفّح. فالسؤال يأتي بعد أن يفهم لماذا.
 */
export type PushAudience = 'merchant' | 'customer';

export const enablePush = async (audience: PushAudience = 'merchant'): Promise<EnableResult> => {
  const state = await getPushState();

  if (state === 'unsupported') {
    return { ok: false, state, error: 'متصفّحك لا يدعم إشعارات الويب' };
  }
  if (state === 'ios-needs-pwa') {
    return {
      ok: false,
      state,
      error: 'على iPhone: افتح قائمة المشاركة ← «إضافة إلى الشاشة الرئيسية»، ثم فعّل الإشعارات من التطبيق المثبّت'
    };
  }
  if (state === 'not-configured') {
    return { ok: false, state, error: 'إشعارات الويب غير مضبوطة على المنصّة بعد' };
  }
  if (state === 'denied') {
    return {
      ok: false,
      state,
      error: 'الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفّح (أيقونة القفل بجانب العنوان)'
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, state: permission as PushState, error: 'لم يُمنح إذن الإشعارات' };
    }

    const app = messagingApp();
    if (!app) return { ok: false, state: 'not-configured', error: 'إشعارات الويب غير مضبوطة على المنصّة بعد' };

    const registration = await registerServiceWorker();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) return { ok: false, state: 'default', error: 'تعذّر الحصول على رمز الجهاز' };

    // مسارٌ مختلف للزبون عن التاجر: مسار التاجر محروسٌ بالمصادقة، والزبون
    // ضيفٌ في الغالب فيرتدّ عنه بـ401 — فيرى «فُعّلت الإشعارات» ولا يصله
    // شيء أبداً. الوجهة تُختار هنا لا تُترك للحظّ.
    const visitorId = getVisitorId();
    if (audience === 'customer') {
      if (!visitorId) {
        return { ok: false, state: 'default', error: 'متصفّحك يمنع حفظ البيانات — فعّل تخزين المواقع ثم أعد المحاولة' };
      }
      await api.post('/alert-channels/visitor-devices', {
        token,
        visitorId,
        platform: 'web',
        label: describeDevice()
      });
    } else {
      await api.post('/alert-channels/devices', {
        token,
        platform: 'web',
        label: describeDevice()
      });
    }

    return { ok: true, state: 'granted' };
  } catch (error: any) {
    console.error('enablePush failed:', error);
    return { ok: false, state: 'default', error: error?.message || 'تعذّر تفعيل الإشعارات' };
  }
};

/** يوقف الإشعارات على هذا الجهاز وحده — لا على بقية أجهزة التاجر */
export const disablePush = async (): Promise<boolean> => {
  try {
    const app = messagingApp();
    if (!app) return false;

    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    }).catch(() => null);

    if (token) {
      await api.post('/alert-channels/devices/remove', { token });
      await deleteToken(messaging).catch(() => undefined);
    }
    return true;
  } catch (error) {
    console.error('disablePush failed:', error);
    return false;
  }
};

/**
 * الرسالة الواردة واللوحة مفتوحة لا يعرضها المتصفّح تلقائياً.
 *
 * نمرّرها إلى المنبّه داخل اللوحة بدل إشعار نظامٍ ثانٍ: التاجر ينظر إلى
 * الشاشة أصلاً، وإشعارٌ يغطّيها يزعج ولا يفيد.
 */
export const onForegroundPush = (handler: (payload: any) => void): (() => void) => {
  try {
    const app = messagingApp();
    if (!app) return () => undefined;
    const messaging = getMessaging(app);
    return onMessage(messaging, handler);
  } catch {
    return () => undefined;
  }
};

/**
 * يعرض إشعار نظام من الصفحة نفسها.
 *
 * **لماذا نحتاجه رغم وجود عامل الخدمة:** عامل الخدمة يعرض الإشعار فقط حين
 * **لا** تكون الصفحة ظاهرة. وحين تكون ظاهرة تصل الرسالة إلى معالج المقدّمة
 * ولا يعرض المتصفّح شيئاً تلقائياً. فرسالةٌ ليست طلباً — تجربةٌ أو بثّ
 * إداري — كانت تُبتلع بصمت أمام عين التاجر وهو ينتظرها.
 *
 * يمرّ عبر تسجيل عامل الخدمة لا `new Notification()`: الأخير مهمَل على
 * أندرويد ويرمي هناك.
 */
export const showLocalNotification = async (
  title: string,
  body: string,
  link?: string
): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return false;
    const registration =
      (await navigator.serviceWorker.getRegistration(SW_PATH)) ||
      (await navigator.serviceWorker.ready);
    if (!registration) return false;

    await registration.showNotification(title, {
      body,
      icon: '/logo.svg',
      badge: '/logo.svg',
      dir: 'rtl',
      lang: 'ar',
      data: { link: link || '/' },
    });
    return true;
  } catch (error) {
    console.error('showLocalNotification failed:', error);
    return false;
  }
};

export default {
  getPushState, enablePush, disablePush, onForegroundPush,
  describeDevice, messagingProjectId, showLocalNotification
};
