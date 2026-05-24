// frontend/src/components/public/PublicMarketingSections.tsx

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getImageUrl } from '@/utils/imageHelpers';
import api from '@/services/api';
import { 
  IoMegaphone, 
  IoFlag, 
  IoPricetag, 
  IoArrowForward,
  IoTime,
  IoCalendarClear,
  IoLocation,
  IoStar,
  IoHeart,
  IoShareSocial,
  IoBookmark
} from 'react-icons/io5';

export interface MarketingSection {
  id: string;
  businessType: string;
  businessId: string;
  sectionType: 'announcement' | 'banner' | 'offer';
  title?: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive: boolean;
  sortOrder: number;
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingData {
  sectionOrder: ('announcement' | 'banner' | 'offer')[];
  sections: MarketingSection[];
}

interface PublicMarketingSectionsProps {
  businessId?: string;
  businessType?: 'restaurant' | 'store';
  className?: string;
  limitPerSection?: number;
}

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  blue: '#60A5FA',
  purple: '#A78BFA',
  orange: '#FB923C',
};

const sectionConfig = {
  announcement: {
    icon: IoMegaphone,
    gradient: 'from-blue-500/20 to-blue-600/10',
    borderColor: C.blue,
    badgeColor: C.blue,
    badgeText: 'إعلان',
    titleColor: C.blue
  },
  banner: {
    icon: IoFlag,
    gradient: 'from-green-500/20 to-green-600/10',
    borderColor: C.accent,
    badgeColor: C.accent,
    badgeText: 'بانر',
    titleColor: C.accent
  },
  offer: {
    icon: IoPricetag,
    gradient: 'from-orange-500/20 to-orange-600/10',
    borderColor: C.orange,
    badgeColor: C.orange,
    badgeText: 'عرض خاص',
    titleColor: C.orange
  }
};

const PublicMarketingSections: React.FC<PublicMarketingSectionsProps> = ({
  businessId,
  businessType,
  className = '',
  limitPerSection = 10
}) => {
  const [marketing, setMarketing] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    if (businessId && businessType) {
      fetchMarketingData();
    } else {
      setLoading(false);
    }
  }, [businessId, businessType]);

  const fetchMarketingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `/marketing/public?businessType=${businessType}&businessId=${businessId}`;
      const response = await api.get(url);
      
      if (response && response.sections) {
        setMarketing(response);
      } else if (response && response.data && response.data.sections) {
        setMarketing(response.data);
      } else {
        setMarketing(null);
      }
    } catch (err) {
      console.error('Error fetching marketing data:', err);
      setError(err instanceof Error ? err.message : 'فشل تحميل البيانات التسويقية');
      setMarketing(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center py-16 ${className}`}>
        <div className="relative">
          <div className="w-12 h-12 border-3 border-gray-200 border-t-accent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-accent rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !marketing || !marketing.sections || marketing.sections.length === 0) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className={`space-y-8 ${className}`} dir="rtl">
      {marketing.sectionOrder.map((sectionType) => {
        const sectionsOfType = marketing.sections.filter(
          (section) => section.sectionType === sectionType && section.isActive === true
        );

        if (sectionsOfType.length === 0) return null;

        const sortedSections = [...sectionsOfType]
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .slice(0, limitPerSection);

        const config = sectionConfig[sectionType];
        const Icon = config.icon;

        return (
          <motion.div
            key={sectionType}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="relative"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${config.borderColor}20` }}
                >
                  <Icon size={20} style={{ color: config.borderColor }} />
                </div>
                <div>
                  <h2 
                    className="text-xl font-bold"
                    style={{ color: config.titleColor }}
                  >
                    {sectionType === 'announcement' && '📢 إعلانات'}
                    {sectionType === 'banner' && '🎯 بانرات'}
                    {sectionType === 'offer' && '🎁 عروض خاصة'}
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {sectionsOfType.length} {sectionsOfType.length === 1 ? 'عنصر' : 'عناصر'}
                  </p>
                </div>
              </div>
              
              {sectionsOfType.length > limitPerSection && (
                <button className="text-sm text-accent hover:text-accent/80 transition-colors flex items-center gap-1">
                  <span>عرض الكل</span>
                  <IoArrowForward size={14} />
                </button>
              )}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedSections.map((section, index) => (
                <motion.div
                  key={section.id}
                  variants={itemVariants}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  onMouseEnter={() => setHoveredCard(section.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="group relative rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm border transition-all duration-300 cursor-pointer"
                  style={{ 
                    borderColor: hoveredCard === section.id ? config.borderColor : 'rgba(255,255,255,0.1)',
                    boxShadow: hoveredCard === section.id ? `0 8px 32px ${config.borderColor}20` : 'none'
                  }}
                >
                  {/* Badge */}
                  <div 
                    className="absolute top-3 right-3 z-10 px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-md"
                    style={{ 
                      background: `${config.badgeColor}dd`,
                      color: '#fff'
                    }}
                  >
                    {sectionType === 'announcement' && '📢 إعلان'}
                    {sectionType === 'banner' && '🎯 بانر'}
                    {sectionType === 'offer' && '🎁 عرض'}
                  </div>

                  {/* Image */}
                  {section.imageUrl && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={getImageUrl(section.imageUrl)}
                        alt={section.title || section.titleEn || 'Marketing'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.style.background = `linear-gradient(135deg, ${config.borderColor}20, ${config.borderColor}05)`;
                        }}
                      />
                      <div 
                        className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-base mb-1 line-clamp-1" style={{ color: C.text }}>
                      {section.title || section.titleEn || 'بدون عنوان'}
                    </h3>
                    
                    {(section.description || section.descriptionEn) && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                        {section.description || section.descriptionEn}
                      </p>
                    )}

                    {/* Date if available */}
                    {section.startAt && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                        <IoTime size={12} />
                        <span>يبدأ: {new Date(section.startAt).toLocaleDateString('ar-SA')}</span>
                      </div>
                    )}

                    {/* Action Button */}
                    {section.linkUrl && (
                      <a
                        href={section.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-2 text-sm font-medium transition-colors group/btn"
                        style={{ color: config.borderColor }}
                      >
                        <span>عرض التفاصيل</span>
                        <IoArrowForward 
                          size={14} 
                          className="transition-transform duration-300 group-hover/btn:translate-x-1"
                        />
                      </a>
                    )}
                  </div>

                  {/* Hover Overlay Effect */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ 
                      background: `radial-gradient(circle at 30% 20%, ${config.borderColor}10, transparent 70%)`
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default PublicMarketingSections;