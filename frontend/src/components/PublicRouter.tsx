import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { getCurrentSubdomain } from '../utils/subdomain';
import Loader from './common/Loader';
import PublicMenu from '../pages/PublicMenu';
import UserLogin from '../pages/auth/UserLogin';
import UserRegister from '../pages/auth/UserRegister';
import api from '../services/api';
import TrackOrder from '@/pages/TrackOrder';
import PublicProduct from '@/pages/PublicProduct';

// مكون داخلي لجلب البيانات
const BusinessLoader: React.FC<{ children: (data: any) => React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);
  
  const subdomain = getCurrentSubdomain();
  const { slug } = useParams<{ slug: string }>();
  
  const identifier = slug || subdomain;
  
  useEffect(() => {
  if (identifier) {
    fetchBusinessData();
  } else {
    setLoading(false);
    setError('لا يوجد معرف للنشاط التجاري');
  }
}, [identifier]);
  
  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching business data for identifier:', identifier);
      
      // ✅ استدعاء الـ API
      const response = await api.get(`/public/${identifier}`);
      console.log('📦 API Response:', response);
      
      // ✅ التحقق من التنسيق الصحيح (البيانات تأتي مباشرة، ليس داخل data)
      if (response && response.id) {
        // ✅ البيانات موجودة مباشرة في response
        const data = response;
        
        const business = {
          id: data.id,
          name: data.name,
          slug: data.slug,
          subdomain: data.subdomain,
          type: data.type,
          logo: data.logo,
          coverImage: data.coverImage,
          description: data.description,
          phone: data.phone,
          whatsapp: data.whatsapp,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          address: data.address,
          email: data.email,
          isActive: data.isActive,
          categories: data.categories || [],
          menuItems: data.menuItems || [],
          products: data.products || [],
        };
        
        console.log('✅ Business data loaded:', business);
        setBusinessData(business);
      } else if (response && response.data && response.data.id) {
        // ✅ إذا كانت البيانات داخل data (للتوافق)
        const data = response.data;
        
        const business = {
          id: data.id,
          name: data.name,
          slug: data.slug,
          subdomain: data.subdomain,
          type: data.type,
          logo: data.logo,
          coverImage: data.coverImage,
          description: data.description,
          phone: data.phone,
          whatsapp: data.whatsapp,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          address: data.address,
          email: data.email,
          isActive: data.isActive,
          categories: data.categories || [],
          menuItems: data.menuItems || [],
          products: data.products || [],
        };
        
        console.log('✅ Business data loaded (from data field):', business);
        setBusinessData(business);
      } else {
        console.error('❌ Invalid response format:', response);
        throw new Error('Invalid response format - missing data');
      }
    } catch (err: any) {
      console.error('❌ Error fetching business data:', err);
      setError(err.message || 'فشل تحميل بيانات المتجر');
      setBusinessData(null);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <Loader fullScreen />;
  }
  
  if (error || !businessData) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4">
        <div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">⚠️ خطأ</h1>
          <p className="text-gray-600">{error || 'لا يمكن الوصول إلى المتجر'}</p>
        </div>
      </div>
    );
  }
  
  return <>{children(businessData)}</>;
};

const PublicRouter: React.FC = () => {
  const subdomain = getCurrentSubdomain();
  
  return (
    <Routes>
      <Route path="/terms" element={<Navigate to="/" replace />} />
      <Route path="/privacy" element={<Navigate to="/" replace />} />
      <Route path="/about" element={<Navigate to="/" replace />} />
      <Route path="/faq" element={<Navigate to="/" replace />} />
      <Route path="/contact" element={<Navigate to="/" replace />} />

      {/* مسارات المصادقة */}
      <Route path="/user/login" element={<UserLogin />} />
      <Route path="/user/register" element={<UserRegister />} />
      <Route path="/track/:orderId" element={<TrackOrder />} />
      
      {/* مسار صفحة المنتج - مع slug في URL */}
      <Route 
        path="/:slug/product/:productId" 
        element={
          <BusinessLoader>
            {(businessData) => (
              <PublicProduct 
                storeData={businessData}
                productIdParam={undefined}
              />
            )}
          </BusinessLoader>
        } 
      />
      
      {/* مسار صفحة المنتج - بدون slug (يعتمد على subdomain) */}
      <Route 
        path="/product/:productId" 
        element={
          <BusinessLoader>
            {(businessData) => (
              <PublicProduct 
                storeData={businessData}
                productIdParam={undefined}
              />
            )}
          </BusinessLoader>
        } 
      />
      
      {/* الصفحة الرئيسية - مع slug في URL */}
      <Route 
        path="/:slug" 
        element={
          <BusinessLoader>
            {(businessData) => (
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
            )}
          </BusinessLoader>
        } 
      />
      
      {/* الصفحة الرئيسية - بدون slug (تعتمد على subdomain) */}
      <Route 
        path="/" 
        element={
          subdomain ? (
            <BusinessLoader>
              {(businessData) => (
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
              )}
            </BusinessLoader>
          ) : (
            <Navigate to="/user/login" replace />
          )
        } 
      />
      
      {/* إعادة توجيه أي مسار آخر إلى الصفحة الرئيسية */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default PublicRouter;