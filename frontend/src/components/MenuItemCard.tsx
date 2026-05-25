// frontend/src/components/MenuItemCard.tsx

import React from 'react';
import { IoCart, IoHeart, IoHeartOutline, IoShare, IoFlame, IoTime } from 'react-icons/io5';
import { motion } from 'framer-motion';
import { getImageUrl } from '@/utils/imageHelpers';
import { MenuItem } from '../services/types';
import { useTheme } from '@/context/ThemeContext'; // ✅ استخدم useTheme بدلاً من useContext

interface MenuItemCardProps {
  item: MenuItem;
  index: number;
  isFavorite: boolean;
  slug: string;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (item: MenuItem) => void;
  onShare?: (item: MenuItem) => void;
  onNavigate: (path: string) => void;
  viewMode?: 'grid' | 'list';
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  index,
  isFavorite,
  slug,
  onToggleFavorite,
  onAddToCart,
  onShare,
  onNavigate,
  viewMode = 'grid'
}) => {
  // ✅ استخدام useTheme hook
  const theme = useTheme();
  const primaryColor = theme.primaryColor;
  const secondaryColor = theme.secondaryColor;
  const cardBgColor = theme.cardBgColor;
  const textColor = theme.textColor;
  const mutedColor = theme.mutedColor;

  const basePrice = item.discountedPrice ? Number(item.discountedPrice) : Number(item.price);
  const discountPercent = item.discountedPrice 
    ? Math.round(((Number(item.price) - Number(item.discountedPrice)) / Number(item.price)) * 100)
    : 0;

  // ✅ إذا كان viewMode = 'list'، اعرض بطاقة بشكل أفقي
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ x: 5 }}
        className="rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
        style={{ backgroundColor: cardBgColor }}
        onClick={() => onNavigate(`/${slug}/item/${item.shareToken || item.id}`)}
      >
        <div className="flex flex-row">
          {/* صورة */}
          <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden">
            {item.image ? (
              <img 
                src={getImageUrl(item.image)}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <IoCart className="text-2xl text-gray-400" />
              </div>
            )}
            
            {item.discountedPrice && (
              <div className="absolute top-1 right-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                -{discountPercent}%
              </div>
            )}

            {!item.isAvailable && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  غير متوفر
                </span>
              </div>
            )}
          </div>

          {/* محتوى */}
          <div className="flex-1 p-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-base font-bold line-clamp-1" style={{ color: textColor }}>{item.name}</h3>
                {item.nameEn && (
                  <p className="text-xs" style={{ color: mutedColor }}>{item.nameEn}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item.id);
                  }}
                  className="p-1 rounded-full transition-colors"
                >
                  {isFavorite ? (
                    <IoHeart className="text-red-500 text-lg" />
                  ) : (
                    <IoHeartOutline className="text-gray-400 text-lg" />
                  )}
                </button>
                {onShare && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(item);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <IoShare size={16} />
                  </button>
                )}
              </div>
            </div>

            {item.description && (
              <p className="text-xs mt-1 line-clamp-2" style={{ color: mutedColor }}>{item.description}</p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: mutedColor }}>
              {item.ordersCount > 0 && (
                <span className="flex items-center gap-1">
                  <IoFlame className="text-orange-400" />
                  {item.ordersCount} طلب
                </span>
              )}
              {item.preparationTime && (
                <span className="flex items-center gap-1">
                  <IoTime />
                  {item.preparationTime} د
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <div>
                {item.discountedPrice ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>
                      {Number(item.discountedPrice).toFixed(2)} ل.س
                    </span>
                    <span className="text-xs line-through" style={{ color: mutedColor }}>
                      {Number(item.price).toFixed(2)} ل.س
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-bold" style={{ color: textColor }}>
                    {Number(item.price).toFixed(2)} ل.س
                  </span>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(item);
                }}
                disabled={!item.isAvailable}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  item.isAvailable 
                    ? 'text-white shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                style={{ backgroundColor: item.isAvailable ? primaryColor : undefined }}
              >
                <IoCart size={16} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ✅ عرض بطاقة شبكية (grid) - الوضع الافتراضي
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className="rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 group cursor-pointer"
      style={{ backgroundColor: cardBgColor }}
      onClick={() => onNavigate(`/${slug}/item/${item.shareToken || item.id}`)}
    >
      <div className="relative h-48 overflow-hidden">
        {item.image ? (
          <img 
            src={getImageUrl(item.image)}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <IoCart className="text-4xl text-gray-400" />
          </div>
        )}
        
        {item.discountedPrice && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            خصم {discountPercent}%
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className="absolute top-3 left-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all"
        >
          {isFavorite ? (
            <IoHeart className="text-red-500 text-xl" />
          ) : (
            <IoHeartOutline className="text-gray-600 text-xl" />
          )}
        </button>

        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">
              غير متوفر
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-bold line-clamp-1" style={{ color: textColor }}>{item.name}</h3>
            {item.nameEn && (
              <p className="text-sm line-clamp-1" style={{ color: mutedColor }}>{item.nameEn}</p>
            )}
          </div>
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(item);
              }}
              className="text-gray-400 hover:text-blue-500 transition-colors p-1"
            >
              <IoShare size={18} />
            </button>
          )}
        </div>

        {item.description && (
          <p className="text-sm mb-3 line-clamp-2" style={{ color: mutedColor }}>{item.description}</p>
        )}

        <div className="flex items-center gap-3 mb-4 text-xs" style={{ color: mutedColor }}>
          {item.ordersCount > 0 && (
            <span className="flex items-center gap-1">
              <IoFlame className="text-orange-400" />
              {item.ordersCount} طلب
            </span>
          )}
          {item.preparationTime && (
            <span className="flex items-center gap-1">
              <IoTime />
              {item.preparationTime} د
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            {item.discountedPrice ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                  {Number(item.discountedPrice).toFixed(2)} ل.س
                </span>
                <span className="text-sm line-through" style={{ color: mutedColor }}>
                  {Number(item.price).toFixed(2)} ل.س
                </span>
              </div>
            ) : (
              <span className="text-2xl font-bold" style={{ color: textColor }}>
                {Number(item.price).toFixed(2)} ل.س
              </span>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(item);
            }}
            disabled={!item.isAvailable}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
              item.isAvailable 
                ? 'text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            style={{ backgroundColor: item.isAvailable ? primaryColor : undefined }}
          >
            <IoCart size={20} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default MenuItemCard;