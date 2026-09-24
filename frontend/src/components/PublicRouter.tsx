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
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const EmailVerification = lazy(() => import('../pages/auth/EmailVerification'));
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
    return <Loader fullScreen variant="storefront" />;
  }

  if (error || !businessData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-center p-6"
        // بهوية شام الفاتحة — لا ألوان للمتجر هنا لأنه لم يُحمَّل أصلاً
        style={{ background: '#F6F8F5', color: '#10231B', fontFamily: 'Cairo, sans-serif' }}
      >
        <div style={{ maxWidth: 420, display: 'grid', justifyItems: 'center', gap: 10 }}>
          <div
            aria-hidden="true"
            style={{ width: 76, height: 76, borderRadius: 24, display: 'grid', placeItems: 'center', background: 'rgba(8,72,53,0.08)', color: '#084835', fontSize: 34 }}
          >
            ?
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
            {error || 'لا يمكن الوصول إلى المتجر'}
          </h1>
          <p style={{ color: '#647870', fontSize: 14.5, lineHeight: 1.9, margin: 0 }}>
            تأكد من صحة الرابط، أو تواصل مع صاحب المتجر إذا استمرت المشكلة.
          </p>
        </div>
      </div>
    );
  }

  return <>{children(businessData)}</>;
};

// واجهة النشاط بخصائصه — مكتوبةً مرّةً لا في كلّ مسار
const renderMenu = (businessData: any) => (
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
);

const PublicRouter: React.FC = () => {
  const hasOwnHost = !!getCurrentSubdomain() || isCustomDomain();

  return (
    <Suspense fallback={<Loader fullScreen variant="storefront" />}>
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
      {/* كانا غائبين هنا: زبونٌ يسجّل على نطاق التاجر يُنقل إلى صفحة الرمز
          فتعيده قاعدة `*` إلى الرئيسية، ولا يُفعَّل حسابه أبداً */}
      <Route path="/auth/email-verification" element={<EmailVerification />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
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
      <Route path="/:slug" element={<BusinessLoader>{renderMenu}</BusinessLoader>} />

      {/* رابط الطاولة — ما يطبعه رمز QR الطاولة. `RestaurantPublicMenu` يقرأ
          `tableId` من المسار فيفتح السلّة على «في المطعم».
          كان المساران غائبين هنا، فقاعدة `*` تُعيد كلّ رمزٍ مطبوع لنطاقٍ
          فرعيّ أو مخصّص إلى الرئيسية ويضيع رقم الطاولة. */}
      <Route path="/table/:tableId" element={hasOwnHost ? <BusinessLoader>{renderMenu}</BusinessLoader> : <Navigate to="/" replace />} />
      <Route path="/:slug/table/:tableId" element={<BusinessLoader>{renderMenu}</BusinessLoader>} />

      {/* الصفحة الرئيسية - بدون slug (تعتمد على subdomain) */}
      <Route
        path="/"
        element={hasOwnHost ? <BusinessLoader>{renderMenu}</BusinessLoader> : <Navigate to="/user/login" replace />}
      />

      {/* إعادة توجيه أي مسار آخر إلى الصفحة الرئيسية */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
};

export default PublicRouter;