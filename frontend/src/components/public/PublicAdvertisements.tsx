// frontend/src/components/public/PublicAdvertisements.tsx

import React, { useEffect, useState } from 'react';
import { getImageUrl } from '@/utils/imageHelpers';
import BannerCarousel from '@/components/storefront/BannerCarousel';
import api from '@/services/api';

export interface Advertisement {
  id: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUrl: string;
  linkUrl?: string;
  position: number;
  isActive: boolean;
  startAt?: string;
  endAt?: string;
  price?: number;
  paid?: boolean;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

interface PublicAdvertisementsProps {
  businessId?: string;
  businessType?: 'restaurant' | 'store';
  currentPlan?: {
    name?: string;
    hasCustomDomain?: boolean;
    hasOnlineOrders?: boolean;
  };
  className?: string;
  limit?: number;
  position?: 'top' | 'bottom';
}

const PublicAdvertisements: React.FC<PublicAdvertisementsProps> = ({
  businessId,
  businessType,
  currentPlan,
  className = '',
  limit = 10,
  position = 'bottom'
}) => {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ التحقق مما إذا كان يجب إخفاء الإعلانات
  const shouldHideAds = () => {
    // إذا كانت الخطة مدفوعة (Pro أو Enterprise)، يمكن إخفاء الإعلانات
    const isPaidPlan = currentPlan?.name === 'pro' || 
                       currentPlan?.name === 'enterprise' ||
                       currentPlan?.hasCustomDomain === true;
    
    console.log('📢 shouldHideAds - isPaidPlan:', isPaidPlan, 'plan:', currentPlan?.name);
    return isPaidPlan;
  };

  // frontend/src/components/public/PublicAdvertisements.tsx

const fetchAdvertisements = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('📢 Fetching advertisements...');
    const response = await api.get('/advertisements/public');
    
    console.log('📢 Full response:', response);
    console.log('📢 Response type:', typeof response);
    
    // ✅ التعامل مع التنسيقات المختلفة
    let adsData = [];
    
    // إذا كان الـ response مصفوفة مباشرة
    if (Array.isArray(response)) {
      adsData = response;
    }
    // إذا كان الـ response يحتوي على success و data
    else if (response && response.success && Array.isArray(response.data)) {
      adsData = response.data;
    }
    // إذا كان الـ response يحتوي على data فقط
    else if (response && response.data && Array.isArray(response.data)) {
      adsData = response.data;
    }
    
    console.log('📢 Extracted ads count:', adsData.length);
    
    if (adsData.length > 0) {
      // ✅ لا تقم بتصفية حسب position للاختبار
      // فقط عرض جميع الإعلانات
      console.log(`📢 Displaying all ${adsData.length} advertisements`);
      setAdvertisements(adsData.slice(0, limit));
    } else {
      console.log('📢 No advertisements found');
      setAdvertisements([]);
    }
  } catch (err) {
    console.error('Error fetching advertisements:', err);
    setAdvertisements([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchAdvertisements();
  }, [businessId, businessType, limit, position]);

  // ✅ إذا كان يجب إخفاء الإعلانات، لا نعرض شيئاً
  if (shouldHideAds()) {
    console.log('📢 Ads hidden due to paid plan');
    return null;
  }

  if (loading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || advertisements.length === 0) {
    console.log('📢 No advertisements to display, error:', error, 'count:', advertisements.length);
    return null;
  }

  // بانر بعرض كامل بدل بطاقات مكدّسة: الإعلان الثاني في قائمة عمودية لا
  // يراه أحد على الجوال، والكاروسيل يمنح كل إعلان نفس الفرصة.
  return (
    <BannerCarousel
      className={className}
      slides={advertisements.map((ad) => ({
        id: ad.id,
        imageUrl: getImageUrl(ad.imageUrl),
        title: ad.title,
        subtitle: ad.description,
        linkUrl: ad.linkUrl || null
      }))}
    />
  );
};

export default PublicAdvertisements;