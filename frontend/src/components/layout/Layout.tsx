import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

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
};

const getTitle = (pathname: string) => {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Prefix match (longest first)
  const match = Object.keys(pageTitles)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? pageTitles[match] : 'SHAM STORES';
};

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = getTitle(location.pathname);

  return (
    <div
      style={{ display: 'flex', minHeight: '100vh', background: '#082E24', direction: 'rtl' }}
    >
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content — offset by sidebar width on large screens */}
      <div
        // minWidth: 0 ضروري: عنصر flex لا ينكمش تحت محتواه افتراضياً، فأي
        // جدول عريض كان يدفع الصفحة كلها أفقياً بدل أن يمرّر داخل نفسه.
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
        
      >
        <Navbar onMenuOpen={() => setSidebarOpen(true)} title={title} />

        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;