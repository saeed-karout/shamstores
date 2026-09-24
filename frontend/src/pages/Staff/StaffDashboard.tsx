// frontend/src/pages/Staff/StaffDashboard.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { staffAreas } from '../../utils/staffAccess';
import { Link } from 'react-router-dom';
import { 
  IoFastFood, IoReceipt, IoRestaurant, IoNavigate,
  IoCube, IoLayers
} from 'react-icons/io5';

const C = {
  bg: '#F4F7F4',
  card: '#FFFFFF',
  accent: '#084835',
  text: '#10231B',
  muted: '#5F736A',
  border: 'rgba(8,72,53,0.15)',
};

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  // صلاحيات **الموظّف** كما منحها المالك — كانت هذه تقرأ صلاحيات الخطة
  // (`usePermissions`) فيرى الموظّف كلّ ما في الخطة مهما عطّل المالك.
  const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    '/menu': IoFastFood,
    '/orders': IoReceipt,
    '/tables': IoRestaurant,
    '/delivery': IoNavigate,
    '/store/products': IoCube,
    '/store/orders': IoReceipt,
    '/store/inventory': IoLayers,
  };
  const menuItems = staffAreas(user).map((area) => ({ ...area, icon: ICONS[area.path] || IoReceipt }));
  const can = (path: string) => menuItems.some((item) => item.path === path);
  const ordersPath = user?.storeId ? '/store/orders' : '/orders';
  const catalogPath = user?.storeId ? '/store/products' : '/menu';

  // إذا لم تكن هناك صلاحيات، عرض رسالة
  if (menuItems.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', background: C.bg, minHeight: '100vh' }} dir="rtl">
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48 }}>
          <h2 style={{ color: C.text, marginBottom: 16 }}>مرحباً {user?.name} 👋</h2>
          <p style={{ color: C.muted }}>لا توجد صلاحيات متاحة لك حالياً. يرجى التواصل مع مدير النظام.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }} dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
          مرحباً {user?.name} 👋
        </h1>
        <p style={{ color: C.muted, fontSize: 14 }}>
          لوحة تحكم الموظفين - يمكنك الوصول إلى الصفحات المسموح بها حسب صلاحياتك
        </p>
      </div>

      {/* Quick Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.accent }}>{menuItems.length}</div>
          <div style={{ color: C.muted, fontSize: 12 }}>الصفحات المتاحة</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: can(ordersPath) ? C.accent : C.muted }}>
            {can(ordersPath) ? '✅' : '❌'}
          </div>
          <div style={{ color: C.muted, fontSize: 12 }}>الطلبات</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: can(catalogPath) ? C.accent : C.muted }}>
            {can(catalogPath) ? '✅' : '❌'}
          </div>
          <div style={{ color: C.muted, fontSize: 12 }}>{user?.storeId ? 'المنتجات' : 'القائمة'}</div>
        </div>
      </div>

      {/* Menu Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
              textDecoration: 'none',
              transition: 'transform 0.2s, border-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = C.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = C.border;
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              background: `${C.accent}15`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <item.icon size={24} color={C.accent} />
            </div>
            <div>
              <div style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>{item.label}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{item.description}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity Placeholder */}
      <div style={{ 
        marginTop: 32, 
        background: C.card, 
        border: `1px solid ${C.border}`, 
        borderRadius: 16, 
        padding: 20 
      }}>
        <h3 style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          📋 النشاطات الأخيرة
        </h3>
        <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 20 }}>
          ستظهر هنا آخر الطلبات والنشاطات
        </p>
      </div>
    </div>
  );
};

export default StaffDashboard;