import React, { lazy, Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import '../../styles/dashboard.css';

/**
 * المنبّه مؤجَّل — **لأن `Layout` يُستورد ساكناً من `App`.**
 *
 * فكان `useSocket` و`webPush` داخله يدخلان الحزمة الرئيسية، ويصلان إلى
 * زبونٍ يفتح متجراً ولا لوحة له أصلاً. والتأجيل لا يؤخّر التاجر: المنبّه
 * لا يُعرض إلا عند وصول طلب، وحزمته تصل قبله بكثير.
 */
const NewOrderAlarm = lazy(() => import('../alerts/NewOrderAlarm'));

// Map route prefixes to page titles (Arabic)
const pageTitles: Record<string, string> = {
  '/admin/restaurants':       'المطاعم',
  '/admin/stores':            'المتاجر',
  '/admin/users':             'المستخدمين',
  '/admin/orders':            'الطلبات',
  '/admin/drivers':           'السائقين',
  '/admin/plans':             'الخطط',
  '/admin/features':          'الميزات',
  '/admin/platform-settings': 'إعدادات المنصة',
  '/admin/qr-codes':          'رموز QR',
  '/admin/staff':             'موظفي المنصة',
  '/admin/marketing':         'التسويق',
  '/admin/settings':          'الإعدادات',
  '/admin':                   'لوحة تحكم المنصة',
  '/menu':                    'القائمة',
  '/orders':                  'الطلبات',
  '/tables':                  'الطاولات',
  '/qr-codes':                'رموز QR',
  '/coupons':                 'الكوبونات',
  '/staff':                   'الموظفين',
  '/delivery':                'التوصيل',
  '/drivers':                 'السائقين',
  '/analytics':               'الإحصائيات',
  '/marketing':               'التسويق',
  '/plans':                   'خطط الأسعار',
  '/settings':                'الإعدادات',
  '/dashboard':               'لوحة التحكم',
  '/store/products':          'المنتجات',
  '/store/inventory':         'المخزون',
  '/store/orders':            'الطلبات',
  '/store/coupons':           'الكوبونات',
  '/store/staff':             'الموظفين',
  '/store/delivery':          'التوصيل',
  '/store/drivers':           'السائقين',
  '/store/analytics':         'الإحصائيات',
  '/store/settings':          'الإعدادات',
  '/store/plans':             'خطط الأسعار',
  '/store/qr-codes':          'رموز QR',
  '/store/marketing':         'التسويق',
  '/store/customers':         'الزبائن',
  '/restaurant/customers':    'الزبائن',
  '/store/campaigns':         'حملات الزبائن',
  '/restaurant/campaigns':    'حملات الزبائن',
  '/store/automations':       'رسائل تلقائية',
  '/restaurant/automations':  'رسائل تلقائية',
  '/store/shipping':          'مناطق التوصيل',
  '/restaurant/shipping':     'مناطق التوصيل',
  '/store/pos':               'الكاشير',
  '/restaurant/pos':          'الكاشير',
  '/store/affiliates':        'المسوّقون',
  '/restaurant/affiliates':   'المسوّقون',
  '/finance':                 'القسم المالي',
  '/features':                'الميزات',
  '/profile':                 'حسابي',
  '/admin/branches':          'الفروع',
  '/admin/subscriptions':     'الاشتراكات',
  '/admin/contact-messages':  'رسائل التواصل',
  '/admin/push-notifications':'بثّ الإشعارات',
  '/admin/advertisements':    'الإعلانات',
};

const getTitle = (pathname: string) => {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Prefix match (longest first)
  const match = Object.keys(pageTitles)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? pageTitles[match] : 'لوحة التحكم';
};

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = getTitle(location.pathname);

  // الدُّرج يُغلق مع كلّ تنقّل — وإلا بقي فوق الشاشة الجديدة على الجوال
  React.useEffect(() => setSidebarOpen(false), [location.pathname]);

  // عنوان التبويب يتبع الشاشة: التاجر يفتح لوحته في تبويباتٍ عدّة
  React.useEffect(() => {
    document.title = `${title} · شام ستورز`;
  }, [title]);

  return (
    <div className="ss-dash">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />

      <div className="ss-dash-main">
        <Navbar onMenuOpen={() => setSidebarOpen(true)} title={title} />
        <main id="main-content" className="ss-dash-content">
          <Outlet />
        </main>
      </div>

      {/* المنبّه في الهيكل لا في صفحة الطلبات: التاجر الذي يتصفّح منتجاته
          «نشطٌ على اللوحة» ولم يكن يحدث عنده شيء عند وصول طلب */}
      <Suspense fallback={null}>
        <NewOrderAlarm />
      </Suspense>
    </div>
  );
};

export default Layout;