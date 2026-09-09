// frontend/src/hooks/useStoreManifest.ts
//
// يستبدل بيان المنصّة ببيان المتجر داخل صفحته.
//
// **لماذا استبدالٌ لا إضافة:** المتصفّح يقرأ `<link rel="manifest">` واحداً
// فقط — أوّل ما يجده. وبيان المنصّة مكتوبٌ في `index.html` ثابتاً، فلو
// أضفنا بيان المتجر بجانبه لبقي الزبون يثبّت «شام ستورز».
//
// **وiOS لا يقرأ البيان أصلاً** لاسم الأيقونة وصورتها: يقرأ
// `apple-touch-icon` و`apple-mobile-web-app-title` من الوسوم. فتُحقن هي
// أيضاً — وإلا ظهر المتجر على شاشة الآيفون باسم المنصّة وشعارها.

import { useEffect, useState } from 'react';
import api from '@/services/api';

export interface StoreTheme {
  primary: string;
  background: string;
  accent: string;
  text: string;
  card: string;
  muted: string;
}

export interface PwaStatus {
  enabled: boolean;
  name: string | null;
  shortName: string | null;
  themeColor: string | null;
  /** هوية المتجر — تُرسم بها نافذة التثبيت بدل ألوان المنصّة */
  theme: StoreTheme | null;
}

/** الوسوم التي نحقنها تُعلَّم كي تُزال عند مغادرة صفحة المتجر */
const MARK = 'data-sham-store-pwa';

const removeInjected = () => {
  document.querySelectorAll(`[${MARK}]`).forEach((el) => el.remove());
};

/** يُعيد إظهار وسوم المنصّة التي عطّلناها مؤقّتاً */
const restorePlatform = () => {
  document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"][data-sham-disabled]').forEach((el) => {
    el.setAttribute('rel', 'manifest');
    el.removeAttribute('data-sham-disabled');
  });
  document.querySelectorAll<HTMLLinkElement>('link[data-sham-hidden-apple]').forEach((el) => {
    el.setAttribute('rel', 'apple-touch-icon');
    el.removeAttribute('data-sham-hidden-apple');
  });
};

/**
 * يضبط وسم `meta` — **بالتعديل إن وُجد لا بإضافة ثانٍ**.
 *
 * المتصفّح يقرأ **أوّل** وسمٍ بالاسم نفسه. وإضافة `theme-color` ثانٍ في
 * نهاية `head` كانت تترك لون شريط المتصفّح على أخضر المنصّة رغم أن اللون
 * الصحيح موجودٌ في الصفحة — وسمٌ يُكتب ولا يُقرأ.
 *
 * والقيمة الأصلية تُحفَظ لتُعاد عند مغادرة صفحة المتجر.
 */
const setMeta = (name: string, content: string) => {
  const existing = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (existing) {
    if (!existing.hasAttribute('data-sham-prev')) {
      existing.setAttribute('data-sham-prev', existing.getAttribute('content') || '');
    }
    existing.setAttribute('content', content);
    return;
  }
  const meta = document.createElement('meta');
  meta.setAttribute('name', name);
  meta.setAttribute('content', content);
  meta.setAttribute(MARK, '');
  document.head.appendChild(meta);
};

/** يعيد الوسوم المعدَّلة إلى قيمها الأصلية */
const restoreMeta = () => {
  document.querySelectorAll<HTMLMetaElement>('meta[data-sham-prev]').forEach((el) => {
    el.setAttribute('content', el.getAttribute('data-sham-prev') || '');
    el.removeAttribute('data-sham-prev');
  });
};

/**
 * @param slug   المعرّف اللفظي للمتجر — لا شيء يحدث بدونه
 * @returns حالة الميزة، لتقرّر الواجهة عرض دعوة التثبيت
 */
export const useStoreManifest = (slug?: string | null): PwaStatus => {
  const [status, setStatus] = useState<PwaStatus>({
    enabled: false,
    name: null,
    shortName: null,
    themeColor: null,
    theme: null
  });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    // **يُعطَّل بيان المنصّة فوراً — قبل سؤال الخادم.**
    //
    // داخل صفحة متجر، بيان المنصّة يعني أن الزبون قد يثبّت أيقونةً باسم
    // «شام ستورز» بدل اسم المتجر الذي جاء إليه. وهذا خطأٌ سواءٌ اشترى
    // التاجر الميزة أم لا: من اشترى يريد هويته، ومن لم يشترِ لا يريد
    // هويتنا على شاشة زبونه. والانتظار حتى يردّ الخادم يترك نافذةً زمنية
    // يستطيع المتصفّح خلالها عرض تثبيت المنصّة.
    //
    // والتعطيل بتغيير `rel` لا بالحذف: الحذف يفقدنا الوسم فلا نستطيع
    // إعادته حين يغادر الزبون إلى صفحةٍ من صفحات المنصّة.
    document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]').forEach((el) => {
      el.setAttribute('data-sham-disabled', '');
      el.setAttribute('rel', 'manifest-disabled');
    });
    document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]').forEach((el) => {
      el.setAttribute('data-sham-hidden-apple', '');
      el.setAttribute('rel', 'apple-touch-icon-disabled');
    });

    (async () => {
      let data: PwaStatus | null = null;
      try {
        data = (await api.get(`/public/${encodeURIComponent(slug)}/pwa-status`)) as PwaStatus;
      } catch {
        // خادمٌ متعذّر: يبقى بيان المنصّة معطّلاً — لا تثبيت خيرٌ من تثبيتٍ
        // باسمٍ خاطئ
        return;
      }
      if (cancelled || !data?.enabled) return;

      setStatus(data);
      removeInjected();

      const base = `/api/public/${encodeURIComponent(slug)}`;

      const manifest = document.createElement('link');
      manifest.rel = 'manifest';
      manifest.href = `${base}/manifest.webmanifest`;
      manifest.setAttribute(MARK, '');
      document.head.appendChild(manifest);

      // مقاسان: iOS يختار الأقرب، وواحدٌ صغير يظهر مشوّشاً على الشاشات
      // عالية الكثافة
      for (const size of [192, 512]) {
        const icon = document.createElement('link');
        icon.rel = 'apple-touch-icon';
        icon.setAttribute('sizes', `${size}x${size}`);
        icon.href = `${base}/pwa-icon/${size}.png`;
        icon.setAttribute(MARK, '');
        document.head.appendChild(icon);
      }

      if (data.name) setMeta('apple-mobile-web-app-title', data.name);
      if (data.themeColor) setMeta('theme-color', data.themeColor);
    })();

    return () => {
      cancelled = true;
      removeInjected();
      restoreMeta();
      restorePlatform();
    };
  }, [slug]);

  return status;
};

export default useStoreManifest;
