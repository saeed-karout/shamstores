// src/components/PublicRouter.tsx

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentSubdomain } from '../utils/subdomain';
import Loader from './common/Loader';
import PublicMenu from '../pages/PublicMenu';
import UserLogin from '../pages/auth/UserLogin';
import UserRegister from '../pages/auth/UserRegister';
import api from '../services/api';
import TrackOrder from '@/pages/TrackOrder';
import PublicProduct from '@/pages/PublicProduct';

const PublicRouter: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);
  
  const subdomain = getCurrentSubdomain();
  
  useEffect(() => {
    if (subdomain) {
      fetchBusinessData();
    } else {
      setLoading(false);
      setError('لا يوجد subdomain');
    }
  }, [subdomain]);
  
  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching business data for subdomain:', subdomain);
      
      const result = await api.getPublicBusiness();
      console.log('📦 Business data result:', result);
      
      if (result && result.business) {
        setBusinessData({
          id: result.business.id,
          name: result.business.name,
          slug: result.business.slug,
          subdomain: result.business.subdomain,
          type: result.business.type || (result.categories ? 'restaurant' : 'store'),
          logo: result.business.logo,
          coverImage: result.business.coverImage,
          description: result.business.description,
          phone: result.business.phone,
          whatsapp: result.business.whatsapp,
          primaryColor: result.business.primaryColor || '#3B82F6',
          secondaryColor: result.business.secondaryColor || '#10B981',
          address: result.business.address,
          settings: result.business.settings,
        });
        console.log('✅ Business data loaded:', result.business.name);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('❌ Error fetching business data:', err);
      setError(err instanceof Error ? err.message : 'فشل تحميل بيانات المتجر');
      setBusinessData(null);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <Loader fullScreen />;
  }
  
  return (
    <Routes>
      {/* مسارات المصادقة */}
      <Route path="/user/login" element={<UserLogin />} />
      <Route path="/user/register" element={<UserRegister />} />
      <Route path="/track/:orderId" element={<TrackOrder />} />
      
      {/* مسار صفحة المنتج - يجب أن يكون قبل المسار الرئيسي */}
      <Route 
        path="/product/:productId" 
        element={
          error || !businessData ? (
            <div className="min-h-screen flex items-center justify-center text-center p-4">
              <div>
                <h1 className="text-2xl font-bold text-red-600 mb-2">⚠️ خطأ</h1>
                <p className="text-gray-600">{error || 'لا يمكن الوصول إلى المتجر'}</p>
              </div>
            </div>
          ) : (
            <PublicProduct 
              storeData={businessData}
              productIdParam={undefined}
            />
          )
        } 
      />
      
      {/* مسار المنتج مع slug - للتوافق مع الرابط القديم */}
      <Route 
        path="/:slug/product/:productId" 
        element={
          error || !businessData ? (
            <div className="min-h-screen flex items-center justify-center text-center p-4">
              <div>
                <h1 className="text-2xl font-bold text-red-600 mb-2">⚠️ خطأ</h1>
                <p className="text-gray-600">{error || 'لا يمكن الوصول إلى المتجر'}</p>
              </div>
            </div>
          ) : (
            <PublicProduct 
              storeData={businessData}
              productIdParam={undefined}
            />
          )
        } 
      />
      
      {/* الصفحة الرئيسية للمتجر */}
      <Route 
        path="/" 
        element={
          error || !subdomain || !businessData ? (
            <div className="min-h-screen flex items-center justify-center text-center p-4">
              <div>
                <h1 className="text-2xl font-bold text-red-600 mb-2">⚠️ خطأ</h1>
                <p className="text-gray-600">{error || 'لا يمكن الوصول إلى المتجر'}</p>
              </div>
            </div>
          ) : (
            <PublicMenu
              businessId={businessData.id}
              businessName={businessData.name}
              businessSlug={businessData.slug}
              businessSubdomain={businessData.subdomain}
              businessType={businessData.type}
              businessLogo={businessData.logo}
              businessCoverImage={businessData.coverImage}
              businessDescription={businessData.description}
              businessPhone={businessData.phone}
              businessWhatsapp={businessData.whatsapp}
              businessPrimaryColor={businessData.primaryColor}
              businessSecondaryColor={businessData.secondaryColor}
            />
          )
        } 
      />
      
      {/* إعادة توجيه أي مسار آخر إلى الصفحة الرئيسية */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default PublicRouter;