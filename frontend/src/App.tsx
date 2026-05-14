// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { IoWarning } from 'react-icons/io5';

// ==================== خدمات ====================
import { getCurrentSubdomain, isMainDomain } from './utils/subdomain';

// ==================== صفحات المصادقة ====================
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import UserLogin from './pages/auth/UserLogin';
import UserRegister from './pages/auth/UserRegister';
import DeliveryLogin from './pages/auth/DeliveryLogin';

// ==================== صفحات المالكين ====================
import RestaurantDashboard from './pages/Owner/RestaurantDashboard';
import StoreDashboard from './pages/Owner/StoreDashboard';

// ==================== صفحات المطعم (باستخدام الأسماء الجديدة) ====================
import RestaurantMenuPage from './pages/Restaurant/RestaurantMenuPage';
import RestaurantOrdersPage from './pages/Restaurant/RestaurantOrdersPage';
import RestaurantTablesPage from './pages/Restaurant/RestaurantTablesPage';
import RestaurantQRCodesPage from './pages/Restaurant/RestaurantQRCodesPage';
import RestaurantStaffPage from './pages/Restaurant/RestaurantStaffPage';
import RestaurantDeliveryDashboard from './pages/Restaurant/RestaurantDeliveryDashboard';
import RestaurantDriversPage from './pages/Restaurant/RestaurantDriversPage';
import RestaurantSettingsPage from './pages/Restaurant/RestaurantSettingsPage';
import RestaurantAnalyticsPage from './pages/Restaurant/RestaurantAnalyticsPage';
import RestaurantPlansPage from './pages/Restaurant/RestaurantPlansPage';
import RestaurantCouponsPage from './pages/Restaurant/RestaurantCouponsPage';

// ==================== صفحات المتجر ====================
import StoreProductsPage from './pages/Store/StoreProductsPage';
import StoreInventoryPage from './pages/Store/StoreInventoryPage';
import StoreOrdersPage from './pages/Store/StoreOrdersPage';
import StoreCouponsPage from './pages/Store/StoreCouponsPage';
import StoreDeliveryDashboard from './pages/Store/StoreDeliveryDashboard';
import StoreDriversPage from './pages/Store/StoreDriversPage';
import StoreSettingsPage from './pages/Store/StoreSettingsPage';
import StoreAnalyticsPage from './pages/Store/StoreAnalyticsPage';
import StoreStaffPage from './pages/Store/StoreStaffPage';
import StorePlansPage from './pages/Store/StorePlansPage';
import StoreQRCodesPage from './pages/Store/StoreQRCodesPage';

// ==================== صفحات السوبر أدمن ====================
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminRestaurants from './pages/Admin/AdminRestaurants';
import AdminStores from './pages/Admin/AdminStores';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminOrders from './pages/Admin/AdminOrders';
import AdminDrivers from './pages/Admin/AdminDrivers';
import AdminPlans from './pages/Admin/AdminPlans';
import AdminSettings from './pages/Admin/AdminSettings';
import AdminRestaurantDetails from './pages/Admin/AdminRestaurantDetails';
import AdminStoreDetails from './pages/Admin/AdminStoreDetails';
import AdminUserDetails from './pages/Admin/AdminUserDetails';
import AdminStaffPage from './pages/Admin/AdminStaffPage';
import AdminStaffListPage from './pages/Admin/AdminStaffListPage';
import AdminStaffDetailsPage from './pages/Admin/AdminStaffDetailsPage';
import AdminQRCodesPage from './pages/Admin/AdminQRCodesPage';
import AdminBusinessFeatures from './pages/Admin/AdminBusinessFeatures';
import AdminPlatformSettings from './pages/Admin/AdminPlatformSettings';
import AdminFeatures from './pages/Admin/AdminFeatures';
import AdminBusinessMarketing from './pages/Admin/AdminBusinessMarketing';

// ==================== صفحات عامة ====================
import HomePage from './pages/HomePage';
import PublicMenu from './pages/PublicMenu';
import PublicTable from './pages/PublicTable';
import PublicItem from './pages/PublicItem';
import PublicProduct from './pages/PublicProduct';
import RestaurantPage from './pages/RestaurantPage';
import DeliveryTracking from './pages/DeliveryTracking';
import DriverDashboard from './pages/DriverDashboard';
import MaintenancePage from './pages/MaintenancePage';

// ==================== مكونات ====================
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import { useAuth } from './hooks/useAuth';
import PublicRouter from './components/PublicRouter';
import AdminMarketingIndex from './pages/Admin/AdminMarketingIndex';
import BusinessMarketing from './pages/Owner/BusinessMarketing';

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
  const { user, isRestaurantOwner, isStoreOwner, isLoading } = useAuth();
  
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
  
  if (isStoreOwner && user?.storeId) {
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

// ==================== التطبيق الرئيسي للدومين الرئيسي ====================
const MainApp: React.FC = () => {
  const { isLoading } = useAuth();

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
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/user/login" element={<UserLogin />} />
      <Route path="/user/register" element={<UserRegister />} />
      <Route path="/delivery/login" element={<DeliveryLogin />} />
      <Route path="/orders/:orderId/track" element={<DeliveryTracking />} />
      <Route path="/maintenance" element={<MaintenancePage />} />
      

      {/* ==================== مسارات المالكين (Owner) ==================== */}
      <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardRouter />} />
          
          {/* مسارات المطعم (باستخدام الأسماء الجديدة) */}
          <Route path="/menu" element={<RestaurantMenuPage />} />
          <Route path="/orders" element={<RestaurantOrdersPage />} />
          <Route path="/tables" element={<RestaurantTablesPage />} />
          <Route path="/qr-codes" element={<RestaurantQRCodesPage />} />
          <Route path="/staff" element={<RestaurantStaffPage />} />
          <Route path="/delivery" element={<RestaurantDeliveryDashboard />} />
          <Route path="/drivers" element={<RestaurantDriversPage />} />
          <Route path="/settings" element={<RestaurantSettingsPage />} />
          <Route path="/analytics" element={<RestaurantAnalyticsPage />} />
          <Route path="/plans" element={<RestaurantPlansPage />} />
          <Route path="/coupons" element={<RestaurantCouponsPage />} />
          <Route path="/marketing" element={<BusinessMarketing />} />
          
          {/* مسارات المتجر */}
          <Route path="/store/products" element={<StoreProductsPage />} />
          <Route path="/store/inventory" element={<StoreInventoryPage />} />
          <Route path="/store/orders" element={<StoreOrdersPage />} />
          <Route path="/store/staff" element={<StoreStaffPage />} />
          <Route path="/store/coupons" element={<StoreCouponsPage />} />
          <Route path="/store/delivery" element={<StoreDeliveryDashboard />} />
          <Route path="/store/drivers" element={<StoreDriversPage />} />
          <Route path="/store/analytics" element={<StoreAnalyticsPage />} />
          <Route path="/store/settings" element={<StoreSettingsPage />} />
          <Route path="/store/plans" element={<StorePlansPage />} />
          <Route path="/store/qr-codes" element={<StoreQRCodesPage />} />
          <Route path="/store/marketing" element={<BusinessMarketing />} />
        </Route>
      </Route>

      {/* ==================== مسارات السوبر أدمن ==================== */}
      <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/restaurants" element={<AdminRestaurants />} />
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
          <Route path="/admin/business/:type/:id/features" element={<AdminBusinessFeatures />} />
          <Route path="/admin/marketing" element={<AdminMarketingIndex />} />
          <Route path="/admin/business/:type/:id/marketing" element={<AdminBusinessMarketing />} />

          
        </Route>
      </Route>

      {/* ==================== مسارات مندوبي التوصيل ==================== */}
      <Route element={<ProtectedRoute allowedRoles={['delivery_driver']} />}>
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
      </Route>

      {/* ==================== مسارات الموظفين ==================== */}
      <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<RestaurantDashboard />} />
          <Route path="/menu" element={<RestaurantMenuPage />} />
          <Route path="/orders" element={<RestaurantOrdersPage />} />
          <Route path="/tables" element={<RestaurantTablesPage />} />
          <Route path="/delivery" element={<RestaurantDeliveryDashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

// ==================== التطبيق الرئيسي ====================
const App: React.FC = () => {
  const currentSubdomain = getCurrentSubdomain();
  const isSubdomain = currentSubdomain !== null && !isMainDomain();
  
  console.log('🔥 App - currentSubdomain:', currentSubdomain);
  console.log('🔥 App - isSubdomain:', isSubdomain);
  
  if (isSubdomain) {
    console.log('🚀 Rendering PublicRouter for subdomain:', currentSubdomain);
    return (
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <Router>
            <PublicRouter />
          </Router>
        </QueryClientProvider>
      </HelmetProvider>
    );
  }
  
  console.log('🏠 Rendering MainApp');
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