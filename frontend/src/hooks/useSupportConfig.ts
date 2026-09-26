// frontend/src/hooks/useSupportConfig.ts
//
// رقم واتساب الدعم ومقاطع الشرح — يضبطهما مشرف المنصّة من «إعدادات المنصّة».
// طلبٌ واحد يُخزَّن خمس دقائق: الزرّ العائم في كل شاشة ولا يستحقّ طلباً لكلّ تنقّل.
// والمفتاح مربوطٌ بالحساب: الذاكرة لا تُمسح عند الخروج، فمشرفٌ يضبط الرقم ثم
// يدخل بحساب تاجر في النافذة نفسها كان يرى النسخة الفارغة القديمة نصف ساعة.

import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuth } from './useAuth';

export interface TutorialVideo {
  title: string;
  url: string;
  duration?: string;
  youtubeId: string;
}

export interface SupportConfig {
  whatsapp: string;
  videos: TutorialVideo[];
}

export const useSupportConfig = () => {
  const { user } = useAuth();
  const hasBusiness = !!((user as any)?.restaurantId || (user as any)?.storeId);

  return useQuery<SupportConfig>({
    queryKey: ['support-config', user?.id],
    enabled: hasBusiness && (user?.role === 'owner' || user?.role === 'staff'),
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const data = await api.get<SupportConfig>('/support/config');
      return { whatsapp: data?.whatsapp || '', videos: Array.isArray(data?.videos) ? data.videos : [] };
    }
  });
};

/** رابط محادثة واتساب برسالةٍ أولى تعرّف بالتاجر — فلا يبدأ الدعم بـ«مين معي؟» */
export const supportWhatsappUrl = (number: string, businessName?: string | null) => {
  const text = businessName ? `مرحباً، أنا من «${businessName}» على شام ستورز وأحتاج مساعدة في: ` : 'مرحباً، أحتاج مساعدة في لوحة شام ستورز: ';
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
};

export default useSupportConfig;
