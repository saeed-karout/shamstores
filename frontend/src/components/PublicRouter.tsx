import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { getCurrentSubdomain, isCustomDomain, getCurrentHost } from '../utils/subdomain';
import Loader from './common/Loader';
import PublicMenu from '../pages/PublicMenu';
import api from '../services/api';

/**
 * صفحاتٌ ليست واجهة المتجر — مؤجَّلة.
 *
 * كانت كلّها ساكنة، فتدخل الحزمة الرئيسية ويحمّلها كلُّ زبونٍ يفتح المتجر.
 * و`TrackOrder` وحدها كانت تجرّ framer-motion (١٢٨ ك.ب) إلى أوّل تحميل
 * لصفحةٍ لا حركة فيها.
 *
 * `PublicMenu` وحدها تبقى ساكنة: هي الوجهة الأولى على نطاق التاجر، وتأجيلها
 * يضيف رحلةً كاملة قبل أوّل منتج.
 */
const UserLogin = lazy(() => import('../pages/auth/UserLogin'));
const UserRegister = lazy(() => import('../pages/auth/UserRegister'));
const TrackOrder = lazy(() => import('@/pages/TrackOrder'));
const PublicProduct = lazy(() => import('@/pages/PublicProduct'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

// مكون داخلي لجلب البيانات
const BusinessLoader: React.FC<{ children: (data: any) => React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);

  const subdomain = getCurrentSubdomain();
  const { slug } = useParams<{ slug: string }>();

  // ترتيب الأولوية: slug في الرابط، ثم النطاق الفرعي، ثم النطاق المخصص
  const directIdentifier = slug || subdomain;

  useEffect(() => {
    let cancelled = false;

    const resolveIdentifier = async (): Promise<string | null> => {
      if (directIdentifier) return directIdentifier;

      // نطاق مخصص: لا يوجد معرّف في الرابط، نسأل الخادم عن صاحب هذا المضيف
      if (isCustomDomain()) {
        const response: any = await api.get('/public/resolve-host', { host: getCurrentHost() });
        const payload = response?.data ?? response;
        return payload?.identifier || payload?.slug || null;
      }

      return null;
    };

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const identifier = await resolveIdentifier();

        if (!identifier) {
          if (!cancelled) {
            setError('لا يوجد معرف للنشاط التجاري');
            setLoading(false);
          }
          return;
        }

        const response: any = await api.get(`/public/${encodeURIComponent(identifier)}`);
        const data = response?.data || response;

        if (!data || !data.id) {
          throw new Error('تعذر تحميل بيانات المتجر');
        }

        if (cancelled) return;

        setBusinessData({
          id: data.id,
          name: data.name,
          slug: data.slug,
          subdomain: data.subdomain,
          customDomain: data.customDomain,
          type: data.type,
          logo: data.logo,
          coverImage: data.coverImage,
          description: data.description,
          phone: data.phone,
          whatsapp: data.whatsapp,
          address: data.address,
          email: data.email,
          currency: data.currency,
          // ألوان التاجر كاملة — تستهلكها طبقة الثيم
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          backgroundColor: data.backgroundColor,
          cardColor: data.cardColor,
          surfaceColor: data.surfaceColor,
          textColor: data.textColor,
          mutedColor: data.mutedColor,
          accentColor: data.accentColor,
          fontFamily: data.fontFamily,
          isActive: data.isActive,
          plan: data.plan,
          linkedBranches: data.linkedBranches || [],
          categories: data.categories || [],
          menuItems: data.menuItems || [],
          products: data.products || []
        });
      } catch (err: any) {
        if (cancelled) return;
        const status = err?.response?.status;
        setError(
          status === 404
            ? 'هذا المتجر غير موجود أو تم إيقافه'
            : err?.response?.data?.error || err?.message || 'فشل تحميل بيانات المتجر'
        );
        setBusinessData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [directIdentifier]);

  if (loading) {
    return <Loader fullScreen />;
  }

  if (error || !businessData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-center p-6"
        style={{ background: '#082E24', color: '#E8F5E9' }}
      >
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            {error || 'لا يمكن الوصول إلى المتجر'}
          </h1>
          <p style={{ color: '#9DC4AC', fontSize: 14, lineHeight: 1.8 }}>
            تأكد من صحة الرابط، أو تواصل مع صاحب المتجر إذا استمرت المشكلة.
          </p>
        </div>
      </div>
    );
  }

  return <>{children(businessData)}</>;
};

const PublicRouter: React.FC = () => {
  const subdomain = getCurrentSubdomain();
  
  return (
    <Suspense fallback={<Loader />}>
    <Routes>
      <Route path="/terms" element={<Navigate to="/" replace />} />
      <Route path="/privacy" element={<Navigate to="/" replace />} />
      <Route path="/about" element={<Navigate to="/" replace />} />
      <Route path="/faq" element={<Navigate to="/" replace />} />
      <Route path="/contact" element={<Navigate to="/" replace />} />

      {/* مسارات المصادقة */}
      {/* ⚠️ كل مسار للزبون يجب أن يُذكر هنا صراحةً.
          على نطاق التاجر الفرعي يتولّى PublicRouter التوجيه كاملاً، وقاعدة
          `*` أسفله تُعيد أي مسار مجهول إلى الرئيسية. فصفحة الحساب كانت
          تُفتح على النطاق الرئيسي وتُعاد إلى واجهة المتجر على النطاق
          الفرعي — حيث يقف الزبون فعلاً. */}
      <Route path="/profile" element={<ProfilePage />} />
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
          subdomain || isCustomDomain() ? (
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
    </Suspense>
  );
};

export default PublicRouter;