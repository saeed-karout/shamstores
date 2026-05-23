// frontend/src/components/marketing/AdvertisementBanner.tsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

interface Advertisement {
  id: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUrl: string;
  linkUrl?: string;
  position: number;
}

const AdvertisementBanner: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchAds();
  }, []);

  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [ads.length]);

  const fetchAds = async () => {
    try {
      const response = await api.get('/advertisements/public');
      setAds(response.data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || ads.length === 0) return null;

  const currentAd = ads[currentIndex];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        cursor: currentAd.linkUrl ? 'pointer' : 'default',
      }}
      onClick={() => {
        if (currentAd.linkUrl) {
          window.open(currentAd.linkUrl, '_blank');
        }
      }}
    >
      <img
        src={currentAd.imageUrl}
        alt={currentAd.title}
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: 200,
          objectFit: 'cover',
        }}
      />
      
      {/* نقاط التنقل */}
      {ads.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {ads.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: 'none',
                background: currentIndex === index ? '#C8E235' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvertisementBanner;