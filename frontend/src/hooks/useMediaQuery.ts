// frontend/src/hooks/useMediaQuery.ts
//
// استعلام مقاسٍ يُقرأ من جافاسكربت.
//
// **لماذا نحتاجه رغم وجود CSS:** واجهة المتجر مرسومة بأنماطٍ سطرية
// (`style={{...}}`)، وهذه لا تقبل `@media`. فالتخطيط الذي يتغيّر بين
// الجوال والشاشة الكبيرة — عمودٌ واحد مقابل عمودين، معرضٌ ملتصق مقابل
// متدفّق — يحتاج قراءة المقاس لا كتابة قاعدة.
//
// **والقيمة الأولى تُقرأ قبل أوّل رسم** (`useState` بمُهيّئ لا `useEffect`):
// لو بدأت `false` دائماً لرأى زائر الشاشة الكبيرة تخطيط الجوال لجزءٍ من
// الثانية ثمّ يقفز — وهي قفزةٌ تُحسب عليك في قياس الأداء.

import { useEffect, useState } from 'react';

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(list.matches);

    // `addEventListener` غير موجود على MediaQueryList في سفاري قبل ١٤،
    // و`addListener` مهمَل في الحديثة. فيُجرَّب الحديث ويُرتدّ إلى القديم
    if (list.addEventListener) {
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    }
    list.addListener(onChange);
    return () => list.removeListener(onChange);
  }, [query]);

  return matches;
};

/** نقاط الانكسار المستعملة في واجهة المتجر — مصدرٌ واحد فلا تتفرّق الأرقام */
export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 900px)');
export const useIsWide = (): boolean => useMediaQuery('(min-width: 1200px)');
export const useIsMobile = (): boolean => useMediaQuery('(max-width: 640px)');

export default useMediaQuery;
