// frontend/src/pages/Staff/StaffDashboard.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { Link } from 'react-router-dom';
import { 
  IoFastFood, IoReceipt, IoRestaurant, IoNavigate,
  IoStatsChart, IoQrCode, IoPricetag, IoPeople
} from 'react-icons/io5';

const C = {
  bg: '#082E24',
  card: '#112E23',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
};

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const permissions = usePermissions();

  const menuItems = [
    { 
      path: '/menu', 
      icon: IoFastFood, 
      label: 'القائمة', 
      description: 'عرض وإدارة الأصناف',
      allowed: permissions.canViewMenu 
    },
    { 
      path: '/orders', 
      icon: IoReceipt, 
      label: 'الطلبات', 
      description: 'عرض وتحديث حالة الطلبات',
      allowed: permissions.canViewOrders 
    },
    { 
      path: '/tables', 
      icon: IoRestaurant, 
      label: 'الطاولات', 
      description: 'إدارة الطاولات ورموز QR',
      allowed: permissions.canViewTables 
    },
    { 
      path: '/delivery', 
      icon: IoNavigate, 
      label: 'التوصيل', 
      description: 'متابعة طلبات التوصيل',
      allowed: permissions.canViewDelivery 
    },
  ].filter(item => item.allowed);

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
          <div style={{ fontSize: 28, fontWeight: 700, color: permissions.canViewOrders ? C.accent : C.muted }}>
            {permissions.canViewOrders ? '✅' : '❌'}
          </div>
          <div style={{ color: C.muted, fontSize: 12 }}>الطلبات</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: permissions.canViewMenu ? C.accent : C.muted }}>
            {permissions.canViewMenu ? '✅' : '❌'}
          </div>
          <div style={{ color: C.muted, fontSize: 12 }}>القائمة</div>
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