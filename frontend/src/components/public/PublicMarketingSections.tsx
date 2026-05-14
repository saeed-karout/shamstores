import React from 'react';
import { getImageUrl } from '@/utils/imageHelpers';

export type MarketingSectionType = 'announcement' | 'banner' | 'offer';

export interface PublicMarketingSection {
  id: string;
  sectionType: MarketingSectionType;
  title?: string | null;
  titleEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
}

export interface PublicMarketingData {
  sectionOrder?: MarketingSectionType[];
  announcements?: PublicMarketingSection[];
  banners?: PublicMarketingSection[];
  offers?: PublicMarketingSection[];
}

interface PublicMarketingSectionsProps {
  marketing?: PublicMarketingData;
  className?: string;
}

const DEFAULT_ORDER: MarketingSectionType[] = ['announcement', 'banner', 'offer'];

const getSectionTitle = (type: MarketingSectionType): string => {
  switch (type) {
    case 'announcement':
      return 'إعلانات مهمة';
    case 'banner':
      return 'بنرات ترويجية';
    case 'offer':
      return 'عروض خاصة';
    default:
      return '';
  }
};

const displayText = (ar?: string | null, en?: string | null): string => ar || en || '';

const maybeLink = (section: PublicMarketingSection) => {
  if (!section.linkUrl) {
    return undefined;
  }

  return section.linkUrl;
};

const PublicMarketingSections: React.FC<PublicMarketingSectionsProps> = ({ marketing, className = '' }) => {
  const announcements = marketing?.announcements || [];
  const banners = marketing?.banners || [];
  const offers = marketing?.offers || [];
  const sectionOrder = marketing?.sectionOrder?.length ? marketing.sectionOrder : DEFAULT_ORDER;

  if (announcements.length === 0 && banners.length === 0 && offers.length === 0) {
    return null;
  }

  const renderAnnouncements = () => {
    if (announcements.length === 0) {
      return null;
    }

    return (
      <section className="space-y-2">
        <h3 className="text-lg font-bold">{getSectionTitle('announcement')}</h3>
        <div className="space-y-2">
          {announcements.map((item) => (
            <div key={item.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="font-semibold text-amber-900">{displayText(item.title, item.titleEn)}</p>
              {displayText(item.description, item.descriptionEn) && (
                <p className="text-sm text-amber-800 mt-1">{displayText(item.description, item.descriptionEn)}</p>
              )}
              {maybeLink(item) && (
                <a
                  href={maybeLink(item)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-sm text-amber-700 underline"
                >
                  عرض التفاصيل
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderBanners = () => {
    if (banners.length === 0) {
      return null;
    }

    return (
      <section className="space-y-2">
        <h3 className="text-lg font-bold">{getSectionTitle('banner')}</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {banners.map((item) => {
            const content = (
              <div className="min-w-[280px] max-w-[360px] bg-white rounded-xl border shadow-sm overflow-hidden">
                {item.imageUrl && (
                  <img
                    src={getImageUrl(item.imageUrl)}
                    alt={displayText(item.title, item.titleEn) || 'banner'}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-3">
                  {displayText(item.title, item.titleEn) && (
                    <p className="font-semibold">{displayText(item.title, item.titleEn)}</p>
                  )}
                  {displayText(item.description, item.descriptionEn) && (
                    <p className="text-sm text-gray-600 mt-1">{displayText(item.description, item.descriptionEn)}</p>
                  )}
                </div>
              </div>
            );

            if (maybeLink(item)) {
              return (
                <a key={item.id} href={maybeLink(item)} target="_blank" rel="noreferrer" className="block">
                  {content}
                </a>
              );
            }

            return <div key={item.id}>{content}</div>;
          })}
        </div>
      </section>
    );
  };

  const renderOffers = () => {
    if (offers.length === 0) {
      return null;
    }

    return (
      <section className="space-y-2">
        <h3 className="text-lg font-bold">{getSectionTitle('offer')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {offers.map((item) => {
            const content = (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-3">
                {item.imageUrl && (
                  <img
                    src={getImageUrl(item.imageUrl)}
                    alt={displayText(item.title, item.titleEn) || 'offer'}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div>
                  <p className="font-semibold text-emerald-900">{displayText(item.title, item.titleEn)}</p>
                  {displayText(item.description, item.descriptionEn) && (
                    <p className="text-sm text-emerald-800 mt-1">{displayText(item.description, item.descriptionEn)}</p>
                  )}
                </div>
              </div>
            );

            if (maybeLink(item)) {
              return (
                <a key={item.id} href={maybeLink(item)} target="_blank" rel="noreferrer">
                  {content}
                </a>
              );
            }

            return <div key={item.id}>{content}</div>;
          })}
        </div>
      </section>
    );
  };

  const renderByType = (type: MarketingSectionType) => {
    switch (type) {
      case 'announcement':
        return renderAnnouncements();
      case 'banner':
        return renderBanners();
      case 'offer':
        return renderOffers();
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {sectionOrder.map((type) => (
        <React.Fragment key={type}>{renderByType(type)}</React.Fragment>
      ))}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default PublicMarketingSections;
