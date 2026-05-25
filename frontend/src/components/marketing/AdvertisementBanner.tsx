// frontend/src/components/marketing/AdvertisementBanner.tsx

import React, { useEffect, useState } from 'react';
import { IoChevronForward, IoChevronBack, IoPause, IoPlay, IoClose } from 'react-icons/io5';
import { getImageUrl } from '../../utils/imageHelpers';
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

interface AdvertisementBannerProps {
  autoplay?: boolean;
  autoplayDelay?: number;
  showArrows?: boolean;
  showDots?: boolean;
  height?: number;
}

const AdvertisementBanner: React.FC<AdvertisementBannerProps> = ({
  autoplay = true,
  autoplayDelay = 5000,
  showArrows = true,
  showDots = true,
  height = 280,
}) => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    fetchAds();
  }, []);

  useEffect(() => {
    if (ads.length > 1 && autoplay && !isPaused) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
      }, autoplayDelay);
      return () => clearInterval(interval);
    }
  }, [ads.length, autoplay, isPaused, autoplayDelay]);

  const fetchAds = async () => {
    try {
      const response = await api.get('/advertisements/public');
      const adsData = response.data || response || [];
      setAds(adsData);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      goToNext();
    }
    if (touchStart - touchEnd < -50) {
      goToPrevious();
    }
  };

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height,
        background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(200,226,53,0.2)',
          borderTopColor: '#C8E235',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (ads.length === 0) return null;

  const currentAd = ads[currentIndex];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        cursor: currentAd.linkUrl ? 'pointer' : 'default',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        if (currentAd.linkUrl) {
          window.open(currentAd.linkUrl, '_blank');
        }
      }}
    >
      {/* Banner Image */}
      <div style={{ position: 'relative', width: '100%', height }}>
        <img
          src={getImageUrl(currentAd.imageUrl)}
          alt={currentAd.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-banner.jpg';
          }}
        />
        
        {/* Dark Overlay for better text readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 100%)',
        }} />
        
        {/* Banner Content */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 32px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
        }}>
          <h3 style={{
            color: '#fff',
            fontSize: 24,
            fontWeight: 700,
            margin: 0,
            marginBottom: 8,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}>
            {currentAd.title}
          </h3>
          {currentAd.description && (
            <p style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: 14,
              margin: 0,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}>
              {currentAd.description}
            </p>
          )}
          {currentAd.linkUrl && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              color: '#C8E235',
              fontSize: 13,
              fontWeight: 600,
            }}>
              <span>اعرف المزيد</span>
              <IoChevronForward size={14} />
            </div>
          )}
        </div>
      </div>

      {/* Previous Arrow */}
      {showArrows && ads.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.5)';
          }}
        >
          <IoChevronBack size={20} />
        </button>
      )}

      {/* Next Arrow */}
      {showArrows && ads.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.5)';
          }}
        >
          <IoChevronForward size={20} />
        </button>
      )}

      {/* Pause/Play Button */}
      {autoplay && ads.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsPaused(!isPaused);
          }}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            zIndex: 10,
          }}
        >
          {isPaused ? <IoPlay size={14} /> : <IoPause size={14} />}
        </button>
      )}

      {/* Dots Navigation */}
      {showDots && ads.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            zIndex: 10,
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
                width: currentIndex === index ? 28 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                background: currentIndex === index ? '#C8E235' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* Badge for multiple ads */}
      {ads.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 12,
            color: '#fff',
            zIndex: 10,
          }}
        >
          {currentIndex + 1} / {ads.length}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdvertisementBanner;