// pages/MaintenancePage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { IoWarning, IoRefresh, IoHome } from 'react-icons/io5';

const MaintenancePage: React.FC = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <IoWarning className="text-yellow-500 text-5xl" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">🔧 وضع الصيانة</h1>
          <p className="text-gray-300 mb-6">
            المنصة تحت الصيانة حالياً. نعمل على تحسين الخدمة لتقديم أفضل تجربة.
            <br />
            يرجى المحاولة لاحقاً.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl transition-all"
            >
              <IoRefresh size={20} />
              تحديث الصفحة
            </button>
            
            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all"
            >
              <IoHome size={20} />
              العودة للرئيسية
            </Link>
          </div>
          
          <p className="text-gray-400 text-sm mt-6">
            توقع عودة الخدمة قريباً. شكراً لتفهمك.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;