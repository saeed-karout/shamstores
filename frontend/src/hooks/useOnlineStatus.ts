// frontend/src/hooks/useOnlineStatus.ts
//
// هل نحن متّصلون — وهل ما يُعرض حيٌّ أم نسخةٌ محفوظة؟
//
// **سؤالان لا سؤال:** `navigator.onLine` يقول «لا شبكة» حين تنقطع الشبكة
// المحلّية فقط. أمّا الانقطاع الأشيع في سوريا — راوترٌ حيّ وخطٌّ ميّت
// خلفه، أو شبكةٌ خانقة لا يصل منها ردّ — فيبقى فيه `onLine` صادقاً شكلاً
// كاذباً فعلاً. لذلك عامل الخدمة يخبر الصفحة حين يخدمها الكتالوج من
// المخزن (`sham-sw:stale`)، فيظهر الشريط في الحالتين.
//
// **والحالة على مستوى الوحدة لا المكوّن:** رسالة العامل تصل لحظة جلب
// الكتالوج — والشريط لا يُركَّب إلا بعد اكتمال الجلب (قبله هيكل التحميل).
// مستمعٌ داخل المكوّن كان يصل بعد فوات الرسالة، فتُعرض أسعارٌ قديمة بلا
// تنبيه.

import { useSyncExternalStore } from 'react';

export interface OnlineStatus {
  /** المتصفّح يرى شبكة */
  online: boolean;
  /** البيانات المعروضة نسخةٌ محفوظة لأن الشبكة لم تُجب */
  stale: boolean;
  /** أيٌّ من الاثنين — ما تقرّر به الواجهة */
  offline: boolean;
}

let online = typeof navigator === 'undefined' || navigator.onLine !== false;
// «قديمة» لا تسقط بعودة الشبكة وحدها: المعروض ما زال النسخة المحفوظة حتى
// يُجلب الكتالوج من جديد — والشريط يعرض حينها زرّ التحديث
let stale = false;
let snapshot: OnlineStatus = { online, stale, offline: !online || stale };

const listeners = new Set<() => void>();
const emit = () => {
  snapshot = { online, stale, offline: !online || stale };
  listeners.forEach((listener) => listener());
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { online = true; emit(); });
  window.addEventListener('offline', () => { online = false; emit(); });
  navigator.serviceWorker?.addEventListener('message', (event: MessageEvent) => {
    const type = event.data?.type;
    if (type === 'sham-sw:stale' && !stale) { stale = true; emit(); }
    if (type === 'sham-sw:fresh' && stale) { stale = false; emit(); }
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

const getSnapshot = () => snapshot;
const serverSnapshot: OnlineStatus = { online: true, stale: false, offline: false };

export const useOnlineStatus = (): OnlineStatus =>
  useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);

export default useOnlineStatus;
