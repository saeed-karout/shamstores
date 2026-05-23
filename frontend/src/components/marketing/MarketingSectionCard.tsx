// frontend/src/components/marketing/MarketingSectionCard.tsx

import React from 'react';
import {
  IoCreate,
  IoTrash,
  IoEye,
  IoEyeOff,
  IoCalendar,
  IoLink,
  IoImage
} from 'react-icons/io5';
import { MarketingSection, MarketingSectionType } from '../../types/marketing';

interface Props {
  section: MarketingSection;
  onEdit: (section: MarketingSection) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
}

const sectionTypeLabels: Record<MarketingSectionType, { label: string; color: string }> = {
  announcement: { label: '📢 إعلان', color: 'bg-blue-100 text-blue-800' },
  banner: { label: '🎨 بانر', color: 'bg-purple-100 text-purple-800' },
  offer: { label: '🏷️ عرض', color: 'bg-orange-100 text-orange-800' }
};

const MarketingSectionCard: React.FC<Props> = ({
  section,
  onEdit,
  onDelete,
  onToggleActive
}) => {
  const typeInfo = sectionTypeLabels[section.sectionType];
  const hasSchedule = section.startAt || section.endAt;
  const isExpired = section.endAt && new Date(section.endAt) < new Date();

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${isExpired ? 'border-red-200 bg-red-50/30' : 'border-gray-100'} overflow-hidden hover:shadow-md transition-shadow`}>
      {/* Header with type and status */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              section.isActive && !isExpired
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {section.isActive && !isExpired ? (
                <>
                  <IoEye className="w-3 h-3 inline ml-1" />
                  نشط
                </>
              ) : (
                <>
                  <IoEyeOff className="w-3 h-3 inline ml-1" />
                  غير نشط
                </>
              )}
            </span>
            {isExpired && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                منتهي الصلاحية
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleActive(section.id, section.isActive)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title={section.isActive ? 'تعطيل' : 'تفعيل'}
            >
              {section.isActive ? (
                <IoEyeOff className="w-4 h-4" />
              ) : (
                <IoEye className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onEdit(section)}
              className="p-1.5 text-blue-500 hover:text-blue-600 rounded-lg hover:bg-blue-50"
              title="تعديل"
            >
              <IoCreate className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(section.id)}
              className="p-1.5 text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50"
              title="حذف"
            >
              <IoTrash className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Image preview */}
        {section.imageUrl && (
          <div className="mb-3">
            <div className="relative h-32 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={section.imageUrl}
                alt={section.title || 'Marketing image'}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/50 rounded-lg px-2 py-1">
                <IoImage className="w-3 h-3 text-white inline ml-1" />
                <span className="text-white text-xs">صورة</span>
              </div>
            </div>
          </div>
        )}

        {/* Titles */}
        <h3 className="font-bold text-gray-800 mb-1">
          {section.title || 'بدون عنوان'}
        </h3>
        {section.titleEn && (
          <p className="text-sm text-gray-500 mb-2">{section.titleEn}</p>
        )}

        {/* Descriptions */}
        {(section.description || section.descriptionEn) && (
          <div className="mb-3 text-sm text-gray-600">
            {section.description && <p>{section.description}</p>}
            {section.descriptionEn && (
              <p className="text-gray-400 text-xs mt-1">{section.descriptionEn}</p>
            )}
          </div>
        )}

        {/* Link */}
        {section.linkUrl && (
          <div className="flex items-center gap-2 text-sm text-blue-500 mb-3">
            <IoLink className="w-4 h-4" />
            <a href={section.linkUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
              {section.linkUrl}
            </a>
          </div>
        )}

        {/* Schedule */}
        {hasSchedule && (
          <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <IoCalendar className="w-4 h-4" />
            {section.startAt && (
              <span>من: {new Date(section.startAt).toLocaleDateString('ar-SA')}</span>
            )}
            {section.endAt && (
              <span>إلى: {new Date(section.endAt).toLocaleDateString('ar-SA')}</span>
            )}
          </div>
        )}

        {/* Sort order */}
        <div className="mt-2 text-xs text-gray-400">
          ترتيب العرض: {section.sortOrder}
        </div>
      </div>
    </div>
  );
};

export default MarketingSectionCard;