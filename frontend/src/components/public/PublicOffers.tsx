// frontend/src/components/public/PublicOffers.tsx

import React, { useEffect, useState } from 'react';
import { getImageUrl } from '@/utils/imageHelpers';
import { IoPricetag, IoTime } from 'react-icons/io5';

interface Offer {
  id: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUrl: string;
  linkUrl?: string;
  discount?: number;
  validUntil?: string;
}

interface PublicOffersProps {
  businessId?: string;
  businessType?: 'restaurant' | 'store';
  className?: string;
  limit?: number;
}

const PublicOffers: React.FC<PublicOffersProps> = ({
  businessId,
  businessType,
  className = '',
  limit = 10
}) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        // جلب العروض من الـ API
        const response = await fetch('/api/marketing/public/offers', {
          headers: {
            'Content-Type': 'application/json',
            ...(businessId && businessType && {
              'X-Business-Id': businessId,
              'X-Business-Type': businessType
            })
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setOffers(result.data.slice(0, limit));
          }
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [businessId, businessType, limit]);

  if (loading || offers.length === 0) return null;

  return (
    <div className={`my-6 ${className}`} dir="rtl">
      <div className="flex items-center gap-2 mb-4">
        <IoPricetag className="text-green-500 text-xl" />
        <h2 className="text-xl font-bold text-gray-800">عروض خاصة</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
          >
            {offer.imageUrl && (
              <img
                src={getImageUrl(offer.imageUrl)}
                alt={offer.title}
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2">{offer.title}</h3>
              {offer.description && (
                <p className="text-gray-600 text-sm mb-3">{offer.description}</p>
              )}
              {offer.discount && (
                <div className="inline-block bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                  خصم {offer.discount}%
                </div>
              )}
              {offer.validUntil && (
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                  <IoTime size={12} />
                  <span>صالح حتى: {new Date(offer.validUntil).toLocaleDateString('ar-SA')}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicOffers;