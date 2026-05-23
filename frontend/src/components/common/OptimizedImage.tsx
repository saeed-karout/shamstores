// frontend/src/components/common/OptimizedImage.tsx
import React, { useState } from 'react';
import { getOptimizedImageUrl } from '../../utils/imageHelpers';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  fallback?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  style = {},
  loading = 'lazy',
  fallback = '/placeholder-image.jpg'
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  const optimizedUrl = getOptimizedImageUrl(imgSrc, { width, height });

  const handleError = () => {
    if (!error) {
      setError(true);
      setImgSrc(fallback);
    }
  };

  return (
    <img
      src={optimizedUrl || fallback}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      loading={loading}
      onError={handleError}
    />
  );
};

export default OptimizedImage;