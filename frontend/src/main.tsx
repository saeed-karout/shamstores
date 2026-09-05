// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { SettingsProvider } from './hooks/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';

/**
 * تعافٍ من أجزاء JS قديمة بعد نشر جديد.
 *
 * الأجزاء مُبصمة بالتجزئة، والنشر يحذف القديمة. تبويب مفتوح منذ ما قبل
 * النشر يطلب جزءاً لم يعد موجوداً حين ينتقل المستخدم إلى صفحة كسولة،
 * فتنكسر الصفحة بشاشة بيضاء ورسالة عن نوع MIME تبدو عطلاً في الكود.
 *
 * إعادة تحميل واحدة تجلب index.html الجديد بأسماء الأجزاء الصحيحة.
 *
 * الحارس ضروري: لو كان الفشل حقيقياً (جزء مفقود فعلاً من النشر) لدارت
 * الصفحة في حلقة إعادة تحميل لا تنتهي. مرة واحدة كل دقيقة، ثم يُترك
 * الخطأ ظاهراً ليُشخَّص.
 */
const RELOAD_KEY = 'chunk-reload-at';
const RELOAD_COOLDOWN_MS = 60_000;

const reloadOnceForStaleChunk = () => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // وضع التصفّح الخاص قد يمنع التخزين — إعادة تحميل بلا حارس أسوأ
    return;
  }
  window.location.reload();
};

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadOnceForStaleChunk();
});

// React.lazy لا يمرّ دائماً بـ vite:preloadError — نلتقط الرفض مباشرةً
window.addEventListener('unhandledrejection', (event) => {
  const message = String(event.reason?.message || event.reason || '');
  if (/dynamically imported module|Importing a module script failed|MIME type/i.test(message)) {
    reloadOnceForStaleChunk();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </SettingsProvider>
  </React.StrictMode>
);