/* frontend/public/firebase-messaging-sw.js
 *
 * عامل الخدمة الذي يستقبل إشعارات الطلبات والمتصفّح مغلق.
 *
 * **لماذا ملفّ منفصل بلا حزم:** عامل الخدمة يعمل خارج التطبيق تماماً — لا
 * يرى وحداته ولا متغيّرات البناء. لذلك يُحمَّل Firebase من CDN بنسخة
 * `compat`.
 *
 * **والإعداد يصله في رابط التسجيل** لا مكتوباً هنا: نسخُ المفاتيح إلى ملفٍّ
 * ثانٍ يعني مصدرَي حقيقة يفترقان بصمت عند تغيير المشروع — والعطل الناتج
 * صامت تماماً: كل شيء يبدو مسجَّلاً ولا يصل إشعار. الصفحة تسجّله هكذا:
 *   navigator.serviceWorker.register('/firebase-messaging-sw.js?apiKey=…')
 *
 * ⚠️ يجب أن يبقى في `public/` باسمه هذا: المتصفّح يطلبه من جذر النطاق
 * (`/firebase-messaging-sw.js`) ولا يقبله من مسار آخر.
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.2/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

const config = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  storageBucket: params.get('storageBucket') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || '',
};

// بلا مشروع لا يُهيَّأ شيء: `initializeApp` بقيمٍ فارغة ترمي، والرمية في
// عامل الخدمة تُسقطه كلّه فلا يعمل حتى بعد ضبط الإعداد
if (config.projectId && config.messagingSenderId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || 'طلب جديد';
    const body = (payload.notification && payload.notification.body) || '';
    const link = (payload.data && payload.data.link) || '/';

    self.registration.showNotification(title, {
      body,
      icon: '/logo.svg',
      badge: '/logo.svg',
      dir: 'rtl',
      lang: 'ar',
      // يبقى معروضاً حتى يتفاعل التاجر: إشعارُ طلبٍ يختفي بعد ثوانٍ يفوت
      requireInteraction: true,
      // وسمٌ لكل طلب: طلبان مختلفان إشعاران، وإعادةُ إرسال الطلب نفسه
      // تستبدل إشعاره لا تكدّسه
      tag: (payload.data && payload.data.orderNumber) || undefined,
      data: { link },
    });
  });
}

/**
 * النقر يفتح تبويباً مفتوحاً على المنصّة إن وُجد بدل فتح ثالث.
 *
 * التاجر الذي يبقي اللوحة مفتوحة لا يريد نسخةً ثانية منها في كل نقرة.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    })
  );
});

/**
 * معالج `fetch` — شرط تثبيت لا آلية تخزين.
 *
 * كروم لا يعرض «تثبيت التطبيق» إلا لموقعٍ عامل خدمته تستمع إلى `fetch`.
 * لذلك يوجد هذا المعالج، ولذلك **لا يخزّن شيئاً**: التخزين المسبق على
 * تطبيقٍ يُنشر عدّة مرّات في اليوم يترك زبائن على نسخةٍ قديمة لا يعرفون
 * كيف يخرجون منها — وهو عطلٌ أسوأ بكثير من غياب العمل دون اتصال.
 *
 * المرور من الشبكة دائماً، وبلا اعتراضٍ لغير طلبات التصفّح.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // لا نعترض: نترك المتصفّح يتصرّف كما لو لا عامل خدمة أصلاً
  return;
});

/// التحديث يصل فوراً لا بعد إغلاق كل التبويبات
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
