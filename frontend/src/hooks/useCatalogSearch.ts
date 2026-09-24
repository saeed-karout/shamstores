// frontend/src/hooks/useCatalogSearch.ts
//
// البحث في كتالوج المتجر أو قائمة المطعم على الخادم.
//
// **لماذا لا يكفي تصفية ما حُمّل:** التصفية المحلّية تبحث في الاسم والوصف
// وحدهما، ولا ترى رمز SKU ولا الوسوم ولا المقاسات والألوان، ولا ترى منتجاً
// لم يُحمَّل أصلاً في متجرٍ كبير. الخادم يبحث في كل ذلك ويرتّب بالصلة.
//
// **والتصفية المحلّية تبقى جسراً:** تظهر نتائجها فوراً مع أوّل حرف، ثمّ
// تحلّ محلّها نتائج الخادم بعد توقّف الكتابة. فلا شاشة فارغة تنتظر الشبكة،
// ولا نتيجة تختفي إن تعطّل الخادم — تبقى المحلّية.

import { useEffect, useRef, useState } from 'react';
import api from '@/services/api';

export interface CatalogSearchState<T> {
  /** نتائج الخادم — `null` ما لم تصل بعد (أو تعذّرت) */
  items: T[] | null;
  total: number;
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

const PAGE = 24;
/** توقّف الكتابة قبل السؤال — أقلّ منه يطلب مع كل حرف، وأكثر يبدو بطيئاً */
const DEBOUNCE_MS = 280;

export const useCatalogSearch = <T = any>(identifier: string | null | undefined, query: string): CatalogSearchState<T> => {
  const [items, setItems] = useState<T[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  // رقم الطلب الأحدث — ردٌّ متأخّر لكلمةٍ قديمة لا يكتب فوق نتائج الجديدة
  const seq = useRef(0);

  const term = query.trim();

  useEffect(() => {
    setOffset(0);
    if (!identifier || term.length < 2) {
      seq.current += 1;
      setItems(null);
      setTotal(0);
      setHasMore(false);
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const data: any = await api.get(`/public/${encodeURIComponent(identifier)}/search`, {
          params: { q: term, limit: PAGE, offset: 0 }
        });
        if (mine !== seq.current) return;
        const payload = data?.items ? data : data?.data || {};
        setItems(Array.isArray(payload.items) ? payload.items : []);
        setTotal(Number(payload.total) || 0);
        setHasMore(!!payload.hasMore);
      } catch {
        // الخادم متعذّر: تبقى نتائج التصفية المحلّية — لا رسالة خطأ للزبون
        if (mine === seq.current) setItems(null);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [identifier, term]);

  const loadMore = () => {
    if (!identifier || loading || !hasMore) return;
    const next = offset + PAGE;
    const mine = ++seq.current;
    setLoading(true);
    api
      .get(`/public/${encodeURIComponent(identifier)}/search`, { params: { q: term, limit: PAGE, offset: next } })
      .then((data: any) => {
        if (mine !== seq.current) return;
        const payload = data?.items ? data : data?.data || {};
        setItems((prev) => [...(prev || []), ...(Array.isArray(payload.items) ? payload.items : [])]);
        setHasMore(!!payload.hasMore);
        setOffset(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  };

  return { items, total, loading, hasMore, loadMore };
};

export default useCatalogSearch;
