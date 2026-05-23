// frontend/src/components/ProductCard.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IoHeart, IoHeartOutline, IoCart, IoEye, IoShare, IoStar, IoStarOutline, IoStorefront, IoHeartSharp } from 'react-icons/io5';
import { getImageUrl } from '@/utils/imageHelpers';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  stock?: number;
  description?: string;
  rating?: number;
  reviewsCount?: number;
  storeId?: string;
  storeSlug?: string; // أضف هذا الحقل
}

interface ProductCardProps {
  product: Product;
  storeSlug?: string; // أضف هذا prop
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onAddToCart?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  onShare?: (product: Product) => void;
  showStock?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  storeSlug,
  isFavorite = false,
  onToggleFavorite,
  onAddToCart,
  onQuickView,
  onShare,
  showStock = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // تحديد رابط المنتج الصحيح
  const productLink = storeSlug || product.storeSlug
    ? `/${storeSlug || product.storeSlug}/product/${product.id}`
    : `/product/${product.id}`;
  
  const originalPrice = product.price;
  const finalPrice = product.discountedPrice || product.price;
  const discount = product.discountedPrice 
    ? Math.round(((product.price - product.discountedPrice) / product.price) * 100)
    : 0;
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock && product.stock <= 5 && product.stock > 0;
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(product.id);
  };
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) {
      toast.error('المنتج غير متوفر في المخزون');
      return;
    }
    onAddToCart?.(product);
  };
  
  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(product);
  };
  
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onShare) {
      onShare(product);
    } else {
      try {
        await navigator.clipboard.writeText(window.location.origin + productLink);
        toast.success('تم نسخ الرابط');
      } catch (error) {
        toast.error('فشل نسخ الرابط');
      }
    }
  };
  
  const renderStars = (rating: number = 0) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <IoStar key={i} className="text-yellow-400 text-sm" />;
          } else if (i === fullStars && hasHalfStar) {
            return <IoStar key={i} className="text-yellow-400 text-sm opacity-50" />;
          } else {
            return <IoStarOutline key={i} className="text-gray-300 text-sm" />;
          }
        })}
        {product.reviewsCount && product.reviewsCount > 0 && (
          <span className="text-xs text-gray-500 mr-1">({product.reviewsCount})</span>
        )}
      </div>
    );
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Discount Badge */}
      {discount > 0 && (
        <div className="absolute top-3 right-3 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          -{discount}%
        </div>
      )}
      
      {/* Stock Badge */}
      {showStock && isLowStock && !isOutOfStock && (
        <div className="absolute top-3 left-3 z-10 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          متبقي {product.stock}
        </div>
      )}
      
      {showStock && isOutOfStock && (
        <div className="absolute top-3 left-3 z-10 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          نفذ من المخزون
        </div>
      )}
      
      {/* Favorite Button */}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-2 left-2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-transform z-10"
      >
        {isFavorite ? (
          <IoHeartSharp className="text-red-500 text-xl" />
        ) : (
          <IoHeartOutline className="text-gray-600 text-xl" />
        )}
      </button>
      
      {/* Product Image */}
      <Link to={productLink} className="block">
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {!imageError && product.imageUrl ? (
            <img
              src={getImageUrl(product.imageUrl)}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <IoStorefront className="text-4xl text-gray-400" />
            </div>
          )}
          
          {/* Overlay Actions */}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-3 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            <button
              onClick={handleQuickView}
              className="bg-white text-gray-800 p-2 rounded-full hover:bg-green-500 hover:text-white transition-colors"
              title="معاينة سريعة"
            >
              <IoEye size={20} />
            </button>
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`bg-white text-gray-800 p-2 rounded-full hover:bg-green-500 hover:text-white transition-colors ${
                isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="إضافة إلى السلة"
            >
              <IoCart size={20} />
            </button>
            <button
              onClick={handleShare}
              className="bg-white text-gray-800 p-2 rounded-full hover:bg-green-500 hover:text-white transition-colors"
              title="مشاركة"
            >
              <IoShare size={20} />
            </button>
          </div>
        </div>
      </Link>
      
      {/* Product Info */}
      <div className="p-4">
        <Link to={productLink} className="block">
          <h3 className="font-semibold text-gray-800 hover:text-green-600 transition-colors line-clamp-2 min-h-[3rem]">
            {product.name}
          </h3>
          {product.nameEn && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{product.nameEn}</p>
          )}
        </Link>
        
        {/* Rating */}
        {product.rating !== undefined && (
          <div className="mt-2">
            {renderStars(product.rating)}
          </div>
        )}
        
        {/* Price */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {product.discountedPrice ? (
              <>
                <span className="text-lg font-bold text-green-600">
                  {finalPrice.toLocaleString()} ر.س
                </span>
                <span className="text-sm text-gray-400 line-through">
                  {originalPrice.toLocaleString()} ر.س
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-800">
                {originalPrice.toLocaleString()} ر.س
              </span>
            )}
          </div>
          
          {/* Add to Cart Button (Mobile) */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`md:hidden p-2 rounded-full transition-colors ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            <IoCart size={18} />
          </button>
        </div>
        
        {/* Stock Status */}
        {showStock && product.stock !== undefined && product.stock > 0 && product.stock <= 10 && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-green-500 rounded-full h-1.5"
                style={{ width: `${Math.min(100, (product.stock / 10) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">متبقي {product.stock} قطعة</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProductCard;