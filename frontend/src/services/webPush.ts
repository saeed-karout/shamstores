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

import { getMessaging, getToken, deleteToken, isSupported, onMessage } from 'firebase/messaging';
import { firebaseApp } from './firebaseConfig';
import api from './api';

const SW_PATH = '/firebase-messaging-sw.js';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
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
  if (!firebaseApp || !config.projectId || !VAPID_KEY) return 'not-configured';

  return Notification.permission as PushState;
};

/** يسجّل عامل الخدمة ومعه الإعداد — مصدر حقيقة واحد لا نسخة ثانية */
const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  const query = new URLSearchParams(config as Record<string, string>).toString();
  return navigator.serviceWorker.register(`${SW_PATH}?${query}`, { scope: '/' });
};

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
export const enablePush = async (): Promise<EnableResult> => {
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

    const registration = await registerServiceWorker();
    const messaging = getMessaging(firebaseApp!);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) return { ok: false, state: 'default', error: 'تعذّر الحصول على رمز الجهاز' };

    await api.post('/alert-channels/devices', {
      token,
      platform: 'web',
      label: describeDevice()
    });

    return { ok: true, state: 'granted' };
  } catch (error: any) {
    console.error('enablePush failed:', error);
    return { ok: false, state: 'default', error: error?.message || 'تعذّر تفعيل الإشعارات' };
  }
};

/** يوقف الإشعارات على هذا الجهاز وحده — لا على بقية أجهزة التاجر */
export const disablePush = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    const messaging = getMessaging(firebaseApp!);
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
    if (!firebaseApp) return () => undefined;
    const messaging = getMessaging(firebaseApp);
    return onMessage(messaging, handler);
  } catch {
    return () => undefined;
  }
};

export default { getPushState, enablePush, disablePush, onForegroundPush, describeDevice };
