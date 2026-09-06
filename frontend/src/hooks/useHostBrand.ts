// frontend/src/hooks/useHostBrand.ts
//
// هوية النطاق الذي فُتحت منه الصفحة — لا هوية المنصّة دائماً.
//
// **المشكلة:** زبونٌ يتصفّح `mystore.com` ثم يضغط «تسجيل الدخول» فيجد أمامه
// اسم شام ستورز وشعارها. من منظوره غادر متجر من يثق به إلى موقع لا يعرفه،
// وهو على وشك كتابة رقمه وكلمة مروره. الصفحة يجب أن تُكمل ما بدأه المتجر.
//
// **لماذا هوك لا `BusinessLoader`:** ذاك يجلب الأصناف والمنتجات كلّها ويحجب
// الصفحة بشاشة تحميل. خلف نموذج فيه حقلان لا معنى لذلك. وهذا الهوك لا يحجب
// شيئاً: يعرض النموذج فوراً بهوية المنصّة، ويلبس هوية التاجر حين تصل.
//
// **على النطاق الرئيسي** لا نداء أصلاً — `isMainDomain()` تحسمها قبل الشبكة.

import { useEffect, useState } from 'react';
import api from '@/services/api';
import { getCurrentHost, isMainDomain } from '@/utils/subdomain';

export interface HostBrand {
  id: string;
  name: string;
  slug: string | null;
  subdomain: string | null;
  logo: string | null;
  type: 'restaurant' | 'store' | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  fontFamily: string;
}

/** يبقى بين تنقّلات الصفحة داخل الجلسة — النداء مرّة واحدة لا مرّة لكل شاشة */
const CACHE_KEY = 'hostBrand';

const readCache = (host: string): HostBrand | null | undefined => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed?.host !== host) return undefined;
    return parsed.brand as HostBrand | null;
  } catch {
    return undefined;
  }
};

const writeCache = (host: string, brand: HostBrand | null) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ host, brand }));
  } catch {
    /* وضع التصفّح الخاص أو تخزين ممتلئ — الهوية تُجلب في كل مرة، لا ضرر */
  }
};

export const useHostBrand = (): { brand: HostBrand | null; loading: boolean } => {
  const [brand, setBrand] = useState<HostBrand | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isMainDomain()) return;

    const host = getCurrentHost();
    if (!host) return;

    const cached = readCache(host);
    if (cached !== undefined) {
      setBrand(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .get<HostBrand | null>('/public/brand', { host })
      .then((data) => {
        if (cancelled) return;
        setBrand(data || null);
        writeCache(host, data || null);
      })
      .catch(() => {
        // الفشل يعني هوية المنصّة — ولا يمنع تسجيل الدخول
        if (!cancelled) setBrand(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { brand, loading };
};

export default useHostBrand;
