// frontend/src/components/marketing/MarketingSectionList.tsx

import React from 'react';
import { IoAdd, IoLockClosed } from 'react-icons/io5';
import { MarketingSection, MarketingSectionType } from '../../types/marketing';
import MarketingSectionCard from './MarketingSectionCard';

interface Props {
  sections: MarketingSection[];
  type: MarketingSectionType;
  title: string;
  icon: JSX.Element;
  description?: string;
  isAdminOnly?: boolean;
  onAdd: () => void;
  onEdit: (section: MarketingSection) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
}

const typeColors: Record<MarketingSectionType, string> = {
  announcement: 'from-purple-500 to-purple-600',
  banner: 'from-blue-500 to-blue-600',
  offer: 'from-orange-500 to-orange-600'
};

const MarketingSectionList: React.FC<Props> = ({
  sections = [],
  type,
  title,
  icon,
  description,
  isAdminOnly = false,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive
}) => {
  const filteredSections = sections.filter(s => s?.sectionType === type);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className={`bg-gradient-to-r ${typeColors[type]} px-6 py-4`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {isAdminOnly && (
              <span className="flex items-center gap-1 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                <IoLockClosed className="w-3 h-3" />
                للمدير فقط
              </span>
            )}
            <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
              {filteredSections.length}
            </span>
          </div>
          {!isAdminOnly && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              <IoAdd className="w-4 h-4" />
              <span>إضافة جديد</span>
            </button>
          )}
        </div>
        {description && (
          <p className="text-white/80 text-sm mt-1 mr-7">{description}</p>
        )}
      </div>

      <div className="p-4">
        {filteredSections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-2xl block mb-2">{icon}</span>
            <p>لا توجد {title} حالياً</p>
            {!isAdminOnly && (
              <button
                onClick={onAdd}
                className="mt-3 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                أضف أول {title}
              </button>
            )}
            {isAdminOnly && (
              <p className="text-sm text-gray-400 mt-2">
                الإعلانات يضيفها المدير العام فقط
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSections.map((section) => (
              <MarketingSectionCard
                key={section.id}
                section={section}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingSectionList;