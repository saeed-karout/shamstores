// frontend/src/utils/saveData.ts
//
// «وضع توفير البيانات» لواجهة الزبون.
//
// **لماذا:** باقة الإنترنت في سوريا تُشترى بالميغا، وشبكة 2G/3G المزدحمة
// تجعل صورة بانرٍ بعرض 1800 بكسل دقيقةَ انتظار. الزبون الذي يرى صفحةً
// بيضاء يغلقها — لا ينتظر.
//
// **ومتى يعمل:**
//   - تلقائياً حين يطلبه المتصفّح (`navigator.connection.saveData` — «موفّر
//     البيانات» في كروم أندرويد) أو حين تكون الشبكة 2g/slow-2g.
//   - يدوياً من زرّ في الواجهة، ويُحفظ الاختيار على الجهاز فيغلب الكشف.
//
// **وماذا يفعل:** صورٌ بالنسخة الصغيرة (400 بكسل) بدل المتوسّطة والكبيرة،
// وبانرٌ ثابت بلا تشغيلٍ تلقائيّ ولا شرائح إضافية، وبلا حركات.
//
// **ومحصورٌ بواجهة الزبون:** `getImageUrl` تُستعمل في لوحة التاجر أيضاً،
// وتاجرٌ يرفع صورة منتجه على 3G لا يريد معاينتها مصغّرةً ضبابية. لذلك
// الوضع لا يسري إلا والواجهة مركّبة (`useStorefrontSaveData`).

import { useEffect, useState, useSyncExternalStore } from 'react';

type Preference = 'auto' | 'on' | 'off';

const STORAGE_KEY = 'sf-save-data';
const HTML_CLASS = 'sf-save-data';

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: 'change', listener: () => void) => void;
}

const connection = (): NetworkInformationLike | undefined =>
  typeof navigator === 'undefined' ? undefined : (navigator as any).connection;

const readPreference = (): Preference => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'on' || value === 'off' ? value : 'auto';
  } catch {
    // التصفّح الخاص قد يمنع التخزين — الكشف التلقائيّ يبقى يعمل
    return 'auto';
  }
};

let preference: Preference = readPreference();
let storefrontMounted = false;
const listeners = new Set<() => void>();

/** هل الشبكة أو المتصفّح يطلبان التوفير؟ — بلا اعتبارٍ لاختيار الزبون */
export const isSlowNetwork = (): boolean => {
  const c = connection();
  if (!c) return false;
  if (c.saveData === true) return true;
  return c.effectiveType === '2g' || c.effectiveType === 'slow-2g';
};

const computeActive = (): boolean => {
  if (!storefrontMounted) return false;
  if (preference === 'on') return true;
  if (preference === 'off') return false;
  return isSlowNetwork();
};

let active = computeActive();

/**
 * يُطفئ الحركات بقاعدة CSS واحدة على الجذر.
 *
 * قاعدةٌ عامّة لا تعديلٌ في كل مكوّن: الحركات موزّعة على عشرات المكوّنات
 * (نبض الهياكل، انزلاق الأوراق، تكبير البطاقات)، ومفتاحٌ في كلٍّ منها
 * يُنسى في أوّل مكوّنٍ جديد.
 */
const STYLE_ID = 'sf-save-data-style';
const ensureStyle = () => {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
html.${HTML_CLASS} *, html.${HTML_CLASS} *::before, html.${HTML_CLASS} *::after {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
  scroll-behavior: auto !important;
}`;
  document.head.appendChild(style);
};

const sync = (notify = true) => {
  const next = computeActive();
  if (typeof document !== 'undefined') {
    if (next) ensureStyle();
    document.documentElement.classList.toggle(HTML_CLASS, next);
  }
  if (next === active) return;
  active = next;
  if (notify) listeners.forEach((listener) => listener());
};

// الشبكة تتبدّل أثناء التصفّح (خرج من الواي فاي إلى 2G) — نتابعها
connection()?.addEventListener?.('change', () => sync());

/** للقراءة المتزامنة داخل الرسم — `getImageUrl` تسأل هنا */
export const isSaveDataActive = (): boolean => active;

/** هل الوضع مفروضٌ تلقائياً (لا باختيار الزبون)؟ — يغيّر نصّ الشريط */
export const isSaveDataAuto = (): boolean => preference === 'auto';

export const setSaveData = (on: boolean): void => {
  preference = on ? 'on' : 'off';
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // يسري للجلسة وحدها — أفضل من زرٍّ لا يستجيب
  }
  sync();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** يتابع الوضع ويعيد الرسم عند تبدّله */
export const useSaveData = (): boolean =>
  useSyncExternalStore(subscribe, isSaveDataActive, () => false);

/**
 * يفعّل نطاق الوضع ما دامت واجهة الزبون مركّبة، ويعيد حالته.
 *
 * **يُرفع العلم أثناء أوّل رسمٍ لا في `useEffect`:** الصور تُرسم في الرسم
 * نفسه، وعلمٌ يُرفع بعده يعني أن الصفحة الأولى — الأغلى بياناً — تُحمَّل
 * بالنسخ الكبيرة قبل أن يعمل الوضع.
 */
export const useStorefrontSaveData = (): boolean => {
  useState(() => {
    storefrontMounted = true;
    // بلا إبلاغ: إيقاظ مكوّناتٍ أخرى أثناء رسمِ هذا يرفضه React
    sync(false);
    return true;
  });

  useEffect(() => {
    storefrontMounted = true;
    sync();
    return () => {
      storefrontMounted = false;
      sync();
    };
  }, []);

  return useSaveData();
};
