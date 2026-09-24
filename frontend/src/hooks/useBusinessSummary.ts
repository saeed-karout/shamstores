// frontend/src/hooks/useBusinessSummary.ts
//
// اسم النشاط وشعاره ورابط واجهته — لهيكل اللوحة (العمود الجانبي وزرّ
// «واجهتي»). طلبٌ واحد يُخزَّن ربع ساعة فلا يتكرّر مع كلّ تنقّل.

import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuth } from './useAuth';
import { buildSubdomainUrl, getBaseUrl } from '@/utils/subdomain';

export interface BusinessSummary {
  name: string;
  logo?: string | null;
  type: 'restaurant' | 'store';
  /** رابط الواجهة العامّة — النطاق الفرعيّ إن وُجد، وإلا المسار على المنصّة */
  publicUrl: string | null;
}

export const useBusinessSummary = () => {
  const { user } = useAuth();
  const restaurantId = (user as any)?.restaurantId as string | undefined;
  const storeId = (user as any)?.storeId as string | undefined;
  const type: BusinessSummary['type'] | null = restaurantId ? 'restaurant' : storeId ? 'store' : null;

  return useQuery<BusinessSummary | null>({
    queryKey: ['business-summary', type, restaurantId || storeId],
    enabled: !!type && (user?.role === 'owner' || user?.role === 'staff'),
    staleTime: 15 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const res: any = await api.get(type === 'restaurant' ? '/restaurants/profile' : '/store/profile');
      const b = res?.data?.id ? res.data : res;
      if (!b?.id) return null;
      // محلياً لا نطاقات فرعية حقيقية — فالمسار على المضيف نفسه
      const local = /localhost|127\.0\.0\.1/.test(window.location.hostname);
      const publicUrl = b.subdomain && !local
        ? buildSubdomainUrl(b.subdomain)
        : b.slug
          ? `${getBaseUrl()}/${b.slug}`
          : null;
      return { name: b.name, logo: b.logo, type: type!, publicUrl };
    }
  });
};

export default useBusinessSummary;
