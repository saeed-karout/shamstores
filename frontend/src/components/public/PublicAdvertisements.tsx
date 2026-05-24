// frontend/src/components/public/PublicAdvertisements.tsx

import React, { useEffect, useState } from 'react';
import { getImageUrl } from '@/utils/imageHelpers';
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

  console.log('📢 Rendering', advertisements.length, 'advertisements');

  return (
    <div className={`space-y-4 ${className}`} dir="rtl">
      {advertisements.map((ad, index) => (
        <a
          key={ad.id}
          href={ad.linkUrl || '#'}
          target={ad.linkUrl ? '_blank' : undefined}
          rel={ad.linkUrl ? 'noopener noreferrer' : undefined}
          className="block group overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300"
          style={{ display: 'block', marginBottom: index < advertisements.length - 1 ? '16px' : '0' }}
        >
          <div className="relative" style={{ position: 'relative', width: '100%' }}>
            {ad.imageUrl ? (
              <img
                src={getImageUrl(ad.imageUrl)}
                alt={ad.title}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                loading="lazy"
                onError={(e) => {
                  console.error('Image failed to load:', ad.imageUrl);
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/cccccc/999999?text=No+Image';
                }}
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">لا توجد صورة</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 right-0 left-0 p-4 text-white">
              <h3 className="text-lg font-bold mb-1">{ad.title}</h3>
              {ad.description && (
                <p className="text-sm text-white/80 line-clamp-2">{ad.description}</p>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default PublicAdvertisements;