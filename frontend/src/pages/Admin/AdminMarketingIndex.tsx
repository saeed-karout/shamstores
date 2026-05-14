// frontend/src/pages/Admin/AdminMarketingIndex.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoStorefront, IoRestaurant, IoSearch, IoArrowForward, IoAlertCircle } from 'react-icons/io5';
import { adminService } from '../../services/api/index';

interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  logo?: string;
  isActive: boolean;
  storeOwner?: {
    name: string;
    email: string;
  };
  plan?: {
    name: string;
  };
}

const AdminMarketingIndex: React.FC = () => {
  const navigate = useNavigate();
  const [businessType, setBusinessType] = useState<'restaurant' | 'store'>('store');
  const [searchTerm, setSearchTerm] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchBusinesses = async () => {
    if (!searchTerm.trim()) {
      setError('الرجاء إدخال نص للبحث');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let result;
      if (businessType === 'restaurant') {
        result = await adminService.getRestaurants({ search: searchTerm, limit: 10 });
        // معالجة استجابة المطاعم - قد تكون بنفس الهيكل أو مختلف
        if (result && typeof result === 'object') {
          if (result.data?.restaurants) {
            setBusinesses(result.data.restaurants);
          } else if (result.restaurants) {
            setBusinesses(result.restaurants);
          } else if (Array.isArray(result)) {
            setBusinesses(result);
          } else {
            setBusinesses([]);
          }
        }
      } else {
        result = await adminService.getStores({ search: searchTerm, limit: 10 });
        console.log('API Response:', result);
        
        // معالجة استجابة المتاجر بناءً على الهيكل الذي رأيناه
        if (result && typeof result === 'object') {
          // إذا كانت النتيجة تحتوي على data.stores
          if (result.data?.stores && Array.isArray(result.data.stores)) {
            setBusinesses(result.data.stores);
          }
          // إذا كانت النتيجة تحتوي على stores مباشرة
          else if (result.stores && Array.isArray(result.stores)) {
            setBusinesses(result.stores);
          }
          // إذا كانت النتيجة مصفوفة مباشرة
          else if (Array.isArray(result)) {
            setBusinesses(result);
          }
          // إذا كانت النتيجة تحتوي على data وهي مصفوفة
          else if (result.data && Array.isArray(result.data)) {
            setBusinesses(result.data);
          }
          else {
            console.warn('Unexpected response structure:', result);
            setBusinesses([]);
            setError('لم يتم العثور على نتائج');
          }
        }
      }
      
      if (businesses.length === 0 && !error) {
        setError(`لم يتم العثور على ${businessType === 'restaurant' ? 'مطاعم' : 'متاجر'} matching "${searchTerm}"`);
      }
    } catch (err: any) {
      console.error('Error searching businesses:', err);
      setError(err?.response?.data?.error || 'حدث خطأ في البحث');
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business);
  };

  const handleGoToMarketing = () => {
    if (selectedBusiness) {
      navigate(`/admin/business/${businessType}/${selectedBusiness.id}/marketing`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchBusinesses();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">إدارة التسويق</h1>
          <p className="text-gray-600 mb-6">
            اختر النشاط التجاري الذي تريد إدارة إعلاناته وبانراته وعروضه
          </p>

          {/* Business Type Selection */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => {
                setBusinessType('restaurant');
                setBusinesses([]);
                setSelectedBusiness(null);
                setSearchTerm('');
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 transition-all ${
                businessType === 'restaurant'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <IoRestaurant className="w-6 h-6" />
              <span className="font-medium">مطاعم</span>
            </button>
            <button
              onClick={() => {
                setBusinessType('store');
                setBusinesses([]);
                setSelectedBusiness(null);
                setSearchTerm('');
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 transition-all ${
                businessType === 'store'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <IoStorefront className="w-6 h-6" />
              <span className="font-medium">متاجر</span>
            </button>
          </div>

          {/* Search */}
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`ابحث عن ${businessType === 'restaurant' ? 'مطعم' : 'متجر'}...`}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={searchBusinesses}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري البحث...</span>
                </>
              ) : (
                <>
                  <IoSearch className="w-5 h-5" />
                  <span>بحث</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
              <IoAlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results */}
          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-500">جاري البحث...</p>
            </div>
          )}

          {!loading && businesses.length > 0 && (
            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                نتائج البحث ({businesses.length}):
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {businesses.map((business) => (
                  <div
                    key={business.id}
                    onClick={() => handleSelectBusiness(business)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedBusiness?.id === business.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{business.name}</h4>
                          {business.isActive === false && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              غير نشط
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{business.email}</p>
                        {business.storeOwner && (
                          <p className="text-xs text-gray-400 mt-1">
                            المالك: {business.storeOwner.name}
                          </p>
                        )}
                        {business.plan && (
                          <p className="text-xs text-gray-400">
                            الخطة: {business.plan.name}
                          </p>
                        )}
                      </div>
                      {selectedBusiness?.id === business.id && (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && businesses.length === 0 && searchTerm && !error && (
            <div className="text-center py-8 text-gray-500">
              <IoStorefront className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>لم يتم العثور على {businessType === 'restaurant' ? 'مطاعم' : 'متاجر'}</p>
              <p className="text-sm mt-1">جرب كلمات بحث مختلفة</p>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleGoToMarketing}
            disabled={!selectedBusiness}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2"
          >
            <span>متابعة إلى إدارة التسويق</span>
            <IoArrowForward className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminMarketingIndex;