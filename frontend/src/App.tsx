// frontend/src/App.tsx

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import SkipToContent from '@/components/a11y/SkipToContent';
import GlobalNotifications from '@/components/GlobalNotifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { IoWarning } from 'react-icons/io5';

// ==================== خدمات ====================
import { isStorefrontHost } from './utils/subdomain';

// frontend/src/pages/auth
const EmailVerification = lazy(() => import('./pages/auth/EmailVerification'));
// ==================== صفحات المالكين ====================
const RestaurantDashboard = lazy(() => import('./pages/Owner/RestaurantDashboard'));
const StoreDashboard = lazy(() => import('./pages/Owner/StoreDashboard'));
// ==================== صفحات المطعم ====================
const RestaurantMenuPage = lazy(() => import('./pages/Restaurant/RestaurantMenuPage'));
const RestaurantOrdersPage = lazy(() => import('./pages/Restaurant/RestaurantOrdersPage'));
const RestaurantTablesPage = lazy(() => import('./pages/Restaurant/RestaurantTablesPage'));
const RestaurantQRCodesPage = lazy(() => import('./pages/Restaurant/RestaurantQRCodesPage'));
const RestaurantStaffPage = lazy(() => import('./pages/Restaurant/RestaurantStaffPage'));
const RestaurantDeliveryDashboard = lazy(() => import('./pages/Restaurant/RestaurantDeliveryDashboard'));
const RestaurantDriversPage = lazy(() => import('./pages/Restaurant/RestaurantDriversPage'));
const RestaurantSettingsPage = lazy(() => import('./pages/Restaurant/RestaurantSettingsPage'));
const RestaurantAnalyticsPage = lazy(() => import('./pages/Restaurant/RestaurantAnalyticsPage'));
const RestaurantPlansPage = lazy(() => import('./pages/Restaurant/RestaurantPlansPage'));
const OwnerFeaturesPage = lazy(() => import('./pages/Owner/FeaturesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RestaurantCouponsPage = lazy(() => import('./pages/Restaurant/RestaurantCouponsPage'));
// ==================== صفحات المتجر ====================
const StoreProductsPage = lazy(() => import('./pages/Store/StoreProductsPage'));
const StoreInventoryPage = lazy(() => import('./pages/Store/StoreInventoryPage'));
const StoreOrdersPage = lazy(() => import('./pages/Store/StoreOrdersPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const StoreCouponsPage = lazy(() => import('./pages/Store/StoreCouponsPage'));
const StoreDeliveryDashboard = lazy(() => import('./pages/Store/StoreDeliveryDashboard'));
const StoreDriversPage = lazy(() => import('./pages/Store/StoreDriversPage'));
const StoreSettingsPage = lazy(() => import('./pages/Store/StoreSettingsPage'));
const StoreAnalyticsPage = lazy(() => import('./pages/Store/StoreAnalyticsPage'));
const StoreStaffPage = lazy(() => import('./pages/Store/StoreStaffPage'));
const StorePlansPage = lazy(() => import('./pages/Store/StorePlansPage'));
const StoreQRCodesPage = lazy(() => import('./pages/Store/StoreQRCodesPage'));
// ==================== صفحات السوبر أدمن ====================
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminRestaurants = lazy(() => import('./pages/Admin/AdminRestaurants'));
const AdminStores = lazy(() => import('./pages/Admin/AdminStores'));
const AdminBranches = lazy(() => import('./pages/Admin/AdminBranches'));
const AdminUsers = lazy(() => import('./pages/Admin/AdminUsers'));
const AdminOrders = lazy(() => import('./pages/Admin/AdminOrders'));
const AdminDrivers = lazy(() => import('./pages/Admin/AdminDrivers'));
const AdminPlans = lazy(() => import('./pages/Admin/AdminPlans'));
const AdminSettings = lazy(() => import('./pages/Admin/AdminSettings'));
const AdminRestaurantDetails = lazy(() => import('./pages/Admin/AdminRestaurantDetails'));
const AdminStoreDetails = lazy(() => import('./pages/Admin/AdminStoreDetails'));
const AdminUserDetails = lazy(() => import('./pages/Admin/AdminUserDetails'));
const AdminStaffPage = lazy(() => import('./pages/Admin/AdminStaffPage'));
const AdminStaffListPage = lazy(() => import('./pages/Admin/AdminStaffListPage'));
const AdminStaffDetailsPage = lazy(() => import('./pages/Admin/AdminStaffDetailsPage'));
const AdminQRCodesPage = lazy(() => import('./pages/Admin/AdminQRCodesPage'));
const AdminBusinessFeatures = lazy(() => import('./pages/Admin/AdminBusinessFeatures'));
const AdminPlatformSettings = lazy(() => import('./pages/Admin/AdminPlatformSettings'));
const AdminPushNotifications = lazy(() => import('./pages/Admin/AdminPushNotifications'));
const CustomersPage = lazy(() => import('./pages/Store/CustomersPage'));
const CampaignsPage = lazy(() => import('./pages/Store/CampaignsPage'));
const AutomationsPage = lazy(() => import('./pages/Store/AutomationsPage'));
const ShippingZonesPage = lazy(() => import('./pages/Store/ShippingZonesPage'));
const PosPage = lazy(() => import('./pages/Store/PosPage'));
const AffiliatesPage = lazy(() => import('./pages/Store/AffiliatesPage'));
const AdminFeatures = lazy(() => import('./pages/Admin/AdminFeatures'));
const AdminBusinessMarketing = lazy(() => import('./pages/Admin/AdminBusinessMarketing'));
const AdminAdvertisements = lazy(() => import('./pages/Admin/AdminAdvertisements'));
const AdminSubscriptions = lazy(() => import('./pages/Admin/AdminSubscriptions'));
const AdminContactMessages = lazy(() => import('./pages/Admin/AdminContactMessages'));
// ==================== صفحات عامة ====================
import HomePage from './pages/HomePage';
const PublicMenu = lazy(() => import('./pages/PublicMenu'));
const PublicStorefrontRoute = lazy(() => import('./components/PublicStorefrontRoute'));
const PublicTable = lazy(() => import('./pages/PublicTable'));
const PublicItem = lazy(() => import('./pages/PublicItem'));
const PublicProduct = lazy(() => import('./pages/PublicProduct'));
const RestaurantPage = lazy(() => import('./pages/RestaurantPage'));
const DeliveryTracking = lazy(() => import('./pages/DeliveryTracking'));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const AdminMarketingIndex = lazy(() => import('./pages/Admin/AdminMarketingIndex'));
// ==================== صفحات قانونية ====================
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const AboutPage = lazy(() => import('./pages/legal/AboutPage'));
const FaqPage = lazy(() => import('./pages/legal/FaqPage'));
const ContactPage = lazy(() => import('./pages/legal/ContactPage'));
// ==================== مكونات ====================
import ProtectedRoute from './components/auth/ProtectedRoute';
import PlanRoute from './components/auth/PlanRoute';
import Layout from './components/layout/Layout';
import { useAuth } from './hooks/useAuth';
import PublicRouter from './components/PublicRouter';
const BusinessMarketing = lazy(() => import('./pages/Owner/BusinessMarketing'));
import SEOHead from './components/dashboard/SEO';
const StaffDashboard = lazy(() => import('./pages/Staff/StaffDashboard'));
const UserRegister = lazy(() => import('./pages/auth/UserRegister'));
const DeliveryLogin = lazy(() => import('./pages/auth/DeliveryLogin'));
const UserLogin = lazy(() => import('./pages/auth/UserLogin'));
const Register = lazy(() => import('./pages/auth/Register'));
const Login = lazy(() => import('./pages/auth/Login'));
// ==================== شاشة انتظار تحميل الصفحات المؤجّلة ====================
const RouteFallback: React.FC = () => (
  <div
    style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      color: '#9DC4AC',
      fontFamily: 'Cairo, sans-serif'
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(157,196,172,0.25)',
        borderTopColor: '#C8E235',
        borderRadius: '50%',
        animation: 'app-route-spin .8s linear infinite'
      }}
    />
    <span style={{ fontSize: 13 }}>جاري التحميل...</span>
    <style>{'@keyframes app-route-spin{to{transform:rotate(360deg)}}'}</style>
  </div>
);

// ==================== إعدادات React Query ====================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

// ==================== مكون التوجيه للمالك ====================
const DashboardRouter: React.FC = () => {
  const { user, isRestaurantOwner, isStoreOwner, loading: isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }
  
  if (isRestaurantOwner && user?.restaurantId) {
    return <RestaurantDashboard />;
  }
  
  const storeId = (user as any)?.storeId;

  if (isStoreOwner && storeId) {
    return <StoreDashboard />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <IoWarning className="text-yellow-500 text-4xl" />
        </div>
        <h2 className="text-2xl font-bold mb-2">مرحباً بك!</h2>
        <p className="text-gray-600 mb-6">
          يبدو أنك لم تقم بإنشاء مطعم أو متجر بعد. يرجى إنشاء مطعم أو متجر للبدء.
        </p>
        <div className="space-y-3">
          <Link to="/register" className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl">🍽️ إنشاء مطعم</Link>
          <Link to="/register-store" className="block w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl">🛍️ إنشاء متجر</Link>
        </div>
      </div>
    </div>
  );
};

// ==================== صفحة 404 ====================
const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-9xl font-bold text-gray-300 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">الصفحة غير موجودة</h1>
        <Link to="/" className="inline-block px-6 py-3 bg-blue-500 text-white rounded-xl">العودة إلى الرئيسية</Link>
      </div>
    </div>
  );
};

// ==================== مكون Subdomain Router مع المسارات القانونية ====================
const SubdomainApp: React.FC = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              duration: 3500,
              style: { fontFamily: 'Cairo, sans-serif', direction: 'rtl' },
              success: { iconTheme: { primary: '#10B981', secondary: '#FFFFFF' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' } },
            }}
          />
          <SkipToContent />
          <main id="main-content" tabIndex={-1}>
            <Routes>
              {/* ✅ جميع المسارات الأخرى تذهب إلى PublicRouter */}
              <Route path="*" element={<PublicRouter />} />
            </Routes>
          </main>
        </Router>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

// ==================== التطبيق الرئيسي للدومين الرئيسي ====================
const MainApp: React.FC = () => {
  const { loading: isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead />
      <SkipToContent />
      {/* مستمع الإشعارات — مرة واحدة لكل التطبيق. كان الاتصال يقوم في
          صفحتَي الطلبات فقط، فالمشرف على أي شاشة أخرى بلا سوكِت إطلاقاً. */}
      <GlobalNotifications token={localStorage.getItem('token')} />

      <Suspense fallback={<RouteFallback />}>
        <main id="main-content" tabIndex={-1}>
        <Routes>
        {/* ==================== مسارات عامة (بدون مصادقة) ==================== */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/email-verification" element={<EmailVerification />} />
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/register" element={<UserRegister />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/delivery/login" element={<DeliveryLogin />} />
        <Route path="/orders/:orderId/track" element={<DeliveryTracking />} />
        <Route path="/maintenance" element={<MaintenancePage />} />

        {/* ==================== الحساب — لكل من سجّل دخوله ==================== */}
        {/* بلا allowedRoles عمداً: الزبون يملك حساباً كالمالك، وحصرُ الصفحة
            بدور واحد كان سيحرم أكثر المستخدمين عدداً من تعديل بياناتهم. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* ==================== مسارات المالكين (Owner) - يجب أن تأتي أولاً ==================== */}
        <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardRouter />} />
            
            {/* مسارات المطعم */}
            <Route path="/menu" element={<RestaurantMenuPage />} />
            <Route path="/orders" element={<PlanRoute feature="onlineOrders"><RestaurantOrdersPage /></PlanRoute>} />
            <Route path="/tables" element={<PlanRoute feature="tableQr"><RestaurantTablesPage /></PlanRoute>} />
            <Route path="/qr-codes" element={<PlanRoute feature="tableQr"><RestaurantQRCodesPage /></PlanRoute>} />
            <Route path="/staff" element={<PlanRoute feature="staff"><RestaurantStaffPage /></PlanRoute>} />
            <Route path="/delivery" element={<PlanRoute feature="onlineOrders"><RestaurantDeliveryDashboard /></PlanRoute>} />
            <Route path="/drivers" element={<PlanRoute feature="onlineOrders"><RestaurantDriversPage /></PlanRoute>} />
            <Route path="/settings" element={<RestaurantSettingsPage />} />
            <Route path="/analytics" element={<PlanRoute feature="analytics"><RestaurantAnalyticsPage /></PlanRoute>} />
            <Route path="/coupons" element={<PlanRoute feature="coupons"><RestaurantCouponsPage /></PlanRoute>} />
            <Route path="/marketing" element={<PlanRoute feature="marketing"><BusinessMarketing /></PlanRoute>} />
            <Route path="/plans" element={<RestaurantPlansPage />} />
            {/* صفحة شراء الميزات المفردة — بلا PlanRoute عمداً: حجبها عمّن
                لا يملك الميزات يمنعه من شرائها، وهو عكس الغرض */}
            <Route path="/features" element={<OwnerFeaturesPage />} />

            {/* القسم المالي — مشترك بين المطعم والمتجر، والخادم يستنتج أيّهما
                من المستخدم. مسار واحد لأن الحساب والأعمدة واحدة. */}
            <Route path="/finance" element={<FinancePage />} />
            
            {/* مسارات المتجر */}
            <Route path="/store/products" element={<StoreProductsPage />} />
            <Route path="/store/inventory" element={<PlanRoute feature="inventory"><StoreInventoryPage /></PlanRoute>} />
            <Route path="/store/orders" element={<PlanRoute feature="onlineOrders"><StoreOrdersPage /></PlanRoute>} />
            <Route path="/store/staff" element={<PlanRoute feature="staff"><StoreStaffPage /></PlanRoute>} />
            <Route path="/store/coupons" element={<PlanRoute feature="coupons"><StoreCouponsPage /></PlanRoute>} />
            <Route path="/store/delivery" element={<PlanRoute feature="onlineOrders"><StoreDeliveryDashboard /></PlanRoute>} />
            <Route path="/store/drivers" element={<PlanRoute feature="onlineOrders"><StoreDriversPage /></PlanRoute>} />
            {/* صفحة واحدة للمتجر والمطعم: النشاط يُشتقّ من الرمز لا من المسار */}
            <Route path="/store/customers" element={<CustomersPage />} />
            <Route path="/restaurant/customers" element={<CustomersPage />} />
            <Route path="/store/campaigns" element={<CampaignsPage />} />
            <Route path="/restaurant/campaigns" element={<CampaignsPage />} />
            <Route path="/store/automations" element={<AutomationsPage />} />
            <Route path="/restaurant/automations" element={<AutomationsPage />} />
            <Route path="/store/shipping" element={<ShippingZonesPage />} />
            <Route path="/restaurant/shipping" element={<ShippingZonesPage />} />
            {/* الحارس في الخادم لا هنا: `pos` إضافة مدفوعة تُفحص على كل مسار */}
            <Route path="/store/pos" element={<PosPage />} />
            <Route path="/restaurant/pos" element={<PosPage />} />
            <Route path="/store/affiliates" element={<AffiliatesPage />} />
            <Route path="/restaurant/affiliates" element={<AffiliatesPage />} />
            <Route path="/store/analytics" element={<PlanRoute feature="analytics"><StoreAnalyticsPage /></PlanRoute>} />
            <Route path="/store/settings" element={<StoreSettingsPage />} />
            <Route path="/store/qr-codes" element={<PlanRoute feature="tableQr"><StoreQRCodesPage /></PlanRoute>} />
            <Route path="/store/marketing" element={<PlanRoute feature="marketing"><BusinessMarketing /></PlanRoute>} />
            <Route path="/store/plans" element={<StorePlansPage />} />
          </Route>
        </Route>

        {/* ==================== مسارات الموظفين (Staff) ==================== */}
        <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<StaffDashboard />} />
            <Route path="/menu" element={<RestaurantMenuPage />} />
            <Route path="/orders" element={<RestaurantOrdersPage />} />
            <Route path="/tables" element={<RestaurantTablesPage />} />
            <Route path="/delivery" element={<RestaurantDeliveryDashboard />} />
            
            {/* إعادة توجيه الصفحات المحظورة للموظفين */}
            <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
            <Route path="/staff" element={<Navigate to="/dashboard" replace />} />
            <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />
            <Route path="/plans" element={<Navigate to="/dashboard" replace />} />
            <Route path="/drivers" element={<Navigate to="/dashboard" replace />} />
            <Route path="/qr-codes" element={<Navigate to="/dashboard" replace />} />
            <Route path="/coupons" element={<Navigate to="/dashboard" replace />} />
            <Route path="/marketing" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        {/* ==================== مسارات السوبر أدمن ==================== */}
        <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
          <Route element={<Layout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/restaurants" element={<AdminRestaurants />} />
            <Route path="/admin/branches" element={<AdminBranches />} />
            <Route path="/admin/stores" element={<AdminStores />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/drivers" element={<AdminDrivers />} />
            <Route path="/admin/plans" element={<AdminPlans />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/restaurants/:id" element={<AdminRestaurantDetails />} />
            <Route path="/admin/stores/:id" element={<AdminStoreDetails />} />
            <Route path="/admin/users/:id" element={<AdminUserDetails />} />
            <Route path="/admin/staff" element={<AdminStaffListPage />} />
            <Route path="/admin/staff/:staffId" element={<AdminStaffDetailsPage />} />
            <Route path="/admin/stores/:storeId/staff" element={<AdminStaffPage />} />
            <Route path="/admin/qr-codes" element={<AdminQRCodesPage />} />
            <Route path="/admin/features" element={<AdminFeatures />} />
            <Route path="/admin/platform-settings" element={<AdminPlatformSettings />} />
            <Route path="/admin/push-notifications" element={<AdminPushNotifications />} />
            <Route path="/admin/business/:type/:id/features" element={<AdminBusinessFeatures />} />
            <Route path="/admin/advertisements" element={<AdminAdvertisements />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/contact-messages" element={<AdminContactMessages />} />
            <Route path="/admin/marketing" element={<AdminMarketingIndex />} />
            <Route path="/admin/business/:type/:id/marketing" element={<AdminBusinessMarketing />} />
          </Route>
        </Route>

        {/* ==================== مسارات مندوبي التوصيل ==================== */}
        <Route element={<ProtectedRoute allowedRoles={['delivery_driver']} />}>
          <Route path="/driver/dashboard" element={<DriverDashboard />} />
        </Route>

          {/* ==================== واجهات المتاجر عبر الدومين الرئيسي ==================== */}
          {/* رموز QR تعود إلى shamstores.com/<slug> عند غياب subdomain أو دومين مخصص.
              تبقى هذه المسارات قبل مسار 404 مباشرةً حتى لا تلتقط المسارات الثابتة. */}
          <Route path="/table/:tableId" element={<PublicTable />} />
          <Route path="/:slug" element={<PublicStorefrontRoute />} />
          <Route path="/:slug/table/:tableId" element={<PublicStorefrontRoute />} />
          <Route path="/:slug/item/:itemId" element={<PublicItem />} />
          <Route path="/:slug/product/:productId" element={<PublicProduct />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </main>
      </Suspense>
    </>
  );
};

// ==================== التطبيق الرئيسي ====================
const App: React.FC = () => {
  // النطاق المخصص للتاجر يجب أن يعرض واجهة المتجر تماماً كالنطاق الفرعي
  if (isStorefrontHost()) {
    return <SubdomainApp />;
  }

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              duration: 4000,
              style: { fontFamily: 'Cairo, sans-serif', direction: 'rtl' },
              success: { iconTheme: { primary: '#10B981', secondary: '#FFFFFF' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' } },
            }}
          />
          <MainApp />
        </Router>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;