import { useState, useEffect, useRef } from "react";

// ===================== DESIGN TOKENS =====================
// Primary: Deep Forest Green #0D4A3A
// Accent: Lime Yellow #C8E235
// Secondary: Medium Green #1A6B55
// Surface: Dark Teal #0F3D31
// Light: Soft Mint #E8F5E9

// ===================== ICONS (inline SVG) =====================
const Icon = ({ name, size = 20, className = "" }) => {
  const icons = {
    home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
    menu: "M4 6h16M4 12h16M4 18h16",
    orders: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h4v4h-4z",
    tables: "M4 6a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM16 16v2M8 16v2M4 9h16",
    staff: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    analytics: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    delivery: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0",
    settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    plans: "M13 10V3L4 14h7v7l9-11h-7z",
    coupons: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z",
    marketing: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    products: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    inventory: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    restaurant: "M12 6v6m0 0v6m0-6h6m-6 0H6",
    store: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
    close: "M6 18L18 6M6 6l12 12",
    check: "M5 13l4 4L19 7",
    star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    arrow: "M13 7l5 5m0 0l-5 5m5-5H6",
    shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    globe: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
    phone: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    drivers: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    admin: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  };
  const d = icons[name] || icons.home;
  const isPolyline = name === "menu" || name === "tables" || name === "orders";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {isPolyline ? d.split("M").filter(Boolean).map((p, i) => <path key={i} d={"M" + p} />) : <path d={d} />}
    </svg>
  );
};

// ===================== COLOR PALETTE =====================
const colors = {
  primary: "#0D4A3A",
  primaryLight: "#1A6B55",
  primaryDark: "#082E24",
  accent: "#C8E235",
  accentDark: "#A8C220",
  surface: "#0F3D31",
  surfaceLight: "#164D3E",
  text: "#E8F5E9",
  textMuted: "#9DC4AC",
  white: "#FFFFFF",
  cardBg: "#112E23",
  border: "rgba(200,226,53,0.15)",
};

// ===================== GLOBAL STYLES =====================
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; background: #082E24; color: #E8F5E9; direction: rtl; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0D4A3A; }
  ::-webkit-scrollbar-thumb { background: #C8E235; border-radius: 3px; }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
  @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  
  .fade-in { animation: fadeIn 0.4s ease forwards; }
  .slide-in { animation: slideIn 0.3s ease forwards; }
  .btn-accent { background: #C8E235; color: #082E24; font-weight: 700; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-family: 'Cairo', sans-serif; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; }
  .btn-accent:hover { background: #A8C220; transform: translateY(-1px); box-shadow: 0 4px 15px rgba(200,226,53,0.3); }
  .btn-outline { background: transparent; color: #C8E235; border: 1.5px solid #C8E235; padding: 9px 20px; border-radius: 10px; cursor: pointer; font-family: 'Cairo', sans-serif; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; }
  .btn-outline:hover { background: rgba(200,226,53,0.1); }
  .card { background: #112E23; border: 1px solid rgba(200,226,53,0.12); border-radius: 16px; padding: 20px; transition: all 0.2s; }
  .card:hover { border-color: rgba(200,226,53,0.3); }
  .badge-new { background: #C8E235; color: #082E24; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
  .badge-pro { background: linear-gradient(135deg, #C8E235, #A8C220); color: #082E24; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
  .stat-up { color: #C8E235; }
  .stat-down { color: #FF6B6B; }
`;

// ===================== SIDEBAR =====================
const Sidebar = ({ activePage, setActivePage, role, isOpen, onClose, user }) => {
  const isRestaurant = role === "restaurant";
  const isStore = role === "store";
  const isAdmin = role === "admin";

  const restaurantMenu = [
    { id: "dashboard", icon: "home", label: "الرئيسية" },
    { id: "menu", icon: "restaurant", label: "القائمة" },
    { id: "orders", icon: "orders", label: "الطلبات" },
    { id: "tables", icon: "tables", label: "الطاولات" },
    { id: "qr", icon: "qr", label: "رموز QR" },
    { id: "coupons", icon: "coupons", label: "الكوبونات" },
    { id: "staff", icon: "staff", label: "الموظفين" },
    { id: "delivery", icon: "delivery", label: "التوصيل" },
    { id: "drivers", icon: "drivers", label: "السائقين" },
    { id: "analytics", icon: "analytics", label: "الإحصائيات" },
    { id: "marketing", icon: "marketing", label: "التسويق", badge: "جديد" },
    { id: "plans", icon: "plans", label: "خطط الأسعار" },
    { id: "settings", icon: "settings", label: "الإعدادات" },
  ];

  const storeMenu = [
    { id: "dashboard", icon: "home", label: "الرئيسية" },
    { id: "products", icon: "products", label: "المنتجات" },
    { id: "inventory", icon: "inventory", label: "المخزون" },
    { id: "orders", icon: "orders", label: "الطلبات" },
    { id: "qr", icon: "qr", label: "رموز QR" },
    { id: "coupons", icon: "coupons", label: "الكوبونات" },
    { id: "staff", icon: "staff", label: "الموظفين" },
    { id: "delivery", icon: "delivery", label: "التوصيل" },
    { id: "drivers", icon: "drivers", label: "السائقين" },
    { id: "analytics", icon: "analytics", label: "الإحصائيات" },
    { id: "marketing", icon: "marketing", label: "التسويق", badge: "جديد" },
    { id: "plans", icon: "plans", label: "خطط الأسعار" },
    { id: "settings", icon: "settings", label: "الإعدادات" },
  ];

  const adminMenu = [
    { id: "admin-dashboard", icon: "home", label: "الرئيسية" },
    { id: "admin-restaurants", icon: "restaurant", label: "المطاعم" },
    { id: "admin-stores", icon: "store", label: "المتاجر" },
    { id: "admin-users", icon: "users", label: "المستخدمين" },
    { id: "admin-orders", icon: "orders", label: "الطلبات" },
    { id: "admin-drivers", icon: "drivers", label: "السائقين" },
    { id: "admin-plans", icon: "plans", label: "الخطط" },
    { id: "admin-features", icon: "star", label: "الميزات", badge: "جديد" },
    { id: "admin-qr", icon: "qr", label: "رموز QR" },
    { id: "admin-marketing", icon: "marketing", label: "التسويق" },
    { id: "admin-settings", icon: "settings", label: "الإعدادات" },
  ];

  const menuItems = isAdmin ? adminMenu : isStore ? storeMenu : restaurantMenu;

  return (
    <>
      {isOpen && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40, display: "none" }} className="mobile-overlay" />
      )}
      <aside style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: 240,
        background: colors.primary, zIndex: 50, display: "flex", flexDirection: "column",
        borderLeft: `1px solid ${colors.border}`, overflowY: "auto",
        transform: isOpen ? "translateX(0)" : "translateX(0)",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo/LOGO-09.png" width={65}  alt="" />
            <div>
              <div style={{ color: colors.accent, fontWeight: 800, fontSize: 16, lineHeight: 1 }}>SHAM STORES</div>
              <div style={{ color: colors.textMuted, fontSize: 11 }}>
                {isAdmin ? "لوحة الإدارة" : isStore ? "إدارة المتجر" : "إدارة المطعم"}
              </div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: `${colors.accent}20`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: colors.accent, fontWeight: 700 }}>
              {user.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: colors.text, fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <span style={{ background: `${colors.accent}20`, color: colors.accent, fontSize: 10, padding: "1px 7px", borderRadius: 20, fontWeight: 600 }}>
                  {isAdmin ? "مدير المنصة" : isStore ? "مالك متجر" : "مالك مطعم"}
                </span>
                <span style={{ background: "#1A6B5520", color: colors.textMuted, fontSize: 10, padding: "1px 7px", borderRadius: 20 }}>Pro</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {menuItems.map((item) => {
            const active = activePage === item.id;
            return (
              <button key={item.id} onClick={() => { setActivePage(item.id); onClose(); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10, border: "none", cursor: "pointer", textAlign: "right", marginBottom: 2,
                  background: active ? `${colors.accent}15` : "transparent",
                  color: active ? colors.accent : colors.textMuted,
                  fontFamily: "Cairo, sans-serif", fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: "all 0.15s", borderRight: active ? `3px solid ${colors.accent}` : "3px solid transparent",
                }}>
                <Icon name={item.icon} size={17} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && <span className="badge-new">{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* Plan Upgrade */}
        {!isAdmin && (
          <div style={{ margin: "0 12px 10px" }}>
            <button className="btn-accent" style={{ width: "100%", justifyContent: "center" }} onClick={() => setActivePage("plans")}>
              <Icon name="star" size={14} /> ترقية الخطة
            </button>
          </div>
        )}

        {/* Logout */}
        <div style={{ padding: "12px", borderTop: `1px solid ${colors.border}` }}>
          <button style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,100,100,0.2)", background: "transparent", color: "#FF6B6B", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: 13 }}>
            <Icon name="logout" size={16} /> تسجيل خروج
          </button>
        </div>
      </aside>
    </>
  );
};

// ===================== TOP BAR =====================
const TopBar = ({ title, onMenuClick }) => (
  <header style={{
    height: 60, background: colors.primaryDark, borderBottom: `1px solid ${colors.border}`,
    display: "flex", alignItems: "center", paddingInline: "20px 24px", gap: 16,
    position: "sticky", top: 0, zIndex: 30,
  }}>
    <button onClick={onMenuClick} style={{ background: "none", border: "none", color: colors.textMuted, cursor: "pointer", display: "flex", padding: 6, borderRadius: 8 }}>
      <Icon name="menu" size={20} />
    </button>
    <h1 style={{ flex: 1, fontSize: 18, fontWeight: 700, color: colors.text }}>{title}</h1>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 8, height: 8, background: colors.accent, borderRadius: "50%", animation: "pulse 2s infinite" }} />
      <span style={{ color: colors.textMuted, fontSize: 12 }}>متصل</span>
    </div>
  </header>
);

// ===================== STAT CARD =====================
const StatCard = ({ label, value, change, icon, color = colors.accent }) => (
  <div className="card fade-in" style={{ position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -20, left: -20, width: 80, height: 80, background: `${color}08`, borderRadius: "50%" }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
      <div style={{ width: 42, height: 42, background: `${color}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color }}>
        <Icon name={icon} size={20} />
      </div>
      {change !== undefined && (
        <span style={{ fontSize: 12, color: change >= 0 ? colors.accent : "#FF6B6B", fontWeight: 600 }}>
          {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
        </span>
      )}
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: colors.text, marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: 13, color: colors.textMuted }}>{label}</div>
  </div>
);

// ===================== DASHBOARD PAGE =====================
const DashboardPage = ({ role }) => {
  const isStore = role === "store";
  const stats = isStore
    ? [
        { label: "إجمالي المبيعات", value: "12,450 ر.س", change: 18, icon: "analytics" },
        { label: "الطلبات اليوم", value: "86", change: 12, icon: "orders" },
        { label: "المنتجات النشطة", value: "234", change: 5, icon: "products" },
        { label: "العملاء الجدد", value: "42", change: -3, icon: "staff" },
      ]
    : [
        { label: "إجمالي المبيعات", value: "8,320 ر.س", change: 22, icon: "analytics" },
        { label: "الطلبات اليوم", value: "63", change: 8, icon: "orders" },
        { label: "الطاولات المشغولة", value: "7/12", change: null, icon: "tables" },
        { label: "متوسط الفاتورة", value: "132 ر.س", change: 5, icon: "coupons" },
      ];

  const recentOrders = [
    { id: "#8821", customer: "أحمد محمد", items: isStore ? "حذاء رياضي × 2" : "برجر + فرايز", total: "145 ر.س", status: "مكتمل", statusColor: colors.accent },
    { id: "#8820", customer: "نورا خالد", items: isStore ? "بلوزة نسائية × 1" : "بيتزا مارجريتا", total: "89 ر.س", status: "قيد التحضير", statusColor: "#F59E0B" },
    { id: "#8819", customer: "خالد العلي", items: isStore ? "ساعة ذكية × 1" : "شاورما × 3", total: "210 ر.س", status: "في التوصيل", statusColor: "#60A5FA" },
    { id: "#8818", customer: "سارة إبراهيم", items: isStore ? "كريم وجه + مرطب" : "سلطة + عصير", total: "67 ر.س", status: "مكتمل", statusColor: colors.accent },
    { id: "#8817", customer: "محمد عمر", items: isStore ? "شنطة جلد" : "وجبة أطفال", total: "180 ر.س", status: "ملغي", statusColor: "#FF6B6B" },
  ];

  return (
    <div style={{ padding: "24px" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.text, marginBottom: 4 }}>
          مرحباً 👋 {isStore ? "بمتجر شام" : "بمطعم شام"}
        </h2>
        <p style={{ color: colors.textMuted, fontSize: 14 }}>إليك نظرة عامة على أداء اليوم</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* Recent Orders */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>آخر الطلبات</h3>
            <button className="btn-outline" style={{ fontSize: 12, padding: "5px 14px" }}>عرض الكل</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["رقم", "العميل", "الطلب", "المجموع", "الحالة"].map(h => (
                    <th key={h} style={{ textAlign: "right", padding: "8px 12px", color: colors.textMuted, fontSize: 12, borderBottom: `1px solid ${colors.border}`, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.border}40` }}>
                    <td style={{ padding: "12px", color: colors.accent, fontSize: 13, fontWeight: 600 }}>{o.id}</td>
                    <td style={{ padding: "12px", color: colors.text, fontSize: 13 }}>{o.customer}</td>
                    <td style={{ padding: "12px", color: colors.textMuted, fontSize: 12 }}>{o.items}</td>
                    <td style={{ padding: "12px", color: colors.text, fontSize: 13, fontWeight: 600 }}>{o.total}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: `${o.statusColor}20`, color: o.statusColor, fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.text, marginBottom: 14 }}>أداء اليوم</h3>
            {[
              { label: "نسبة إتمام الطلبات", value: 87 },
              { label: "رضا العملاء", value: 94 },
              { label: "نسبة التوصيل في الوقت", value: 78 },
            ].map((m, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: colors.textMuted }}>{m.label}</span>
                  <span style={{ fontSize: 12, color: colors.accent, fontWeight: 700 }}>{m.value}%</span>
                </div>
                <div style={{ background: `${colors.accent}15`, borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${m.value}%`, height: "100%", background: colors.accent, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: `${colors.accent}10`, border: `1px solid ${colors.accent}25` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Icon name="plans" size={18} color={colors.accent} style={{ color: colors.accent }} />
              <span style={{ color: colors.accent, fontWeight: 700, fontSize: 14 }}>الخطة الاحترافية</span>
            </div>
            <p style={{ color: colors.textMuted, fontSize: 12, lineHeight: 1.7, marginBottom: 12 }}>
              أنت تستفيد من جميع مزايا الخطة الاحترافية. تجديد الاشتراك بعد 18 يوم.
            </p>
            <button className="btn-accent" style={{ width: "100%", justifyContent: "center", fontSize: 13 }}>
              تجديد الاشتراك
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================== ORDERS PAGE =====================
const OrdersPage = () => {
  const [filter, setFilter] = useState("all");
  const statuses = ["all", "pending", "preparing", "delivery", "done", "cancelled"];
  const statusLabels = { all: "الكل", pending: "جديدة", preparing: "قيد التحضير", delivery: "في التوصيل", done: "مكتملة", cancelled: "ملغية" };
  const orders = [
    { id: "#8830", customer: "أحمد سالم", phone: "0551234567", items: "برجر + فرايز + كولا", total: 145, status: "pending", time: "12:30", type: "توصيل" },
    { id: "#8829", customer: "منى ريم", phone: "0509876543", items: "بيتزا مارجريتا كبير", total: 89, status: "preparing", time: "12:15", type: "طاولة 5" },
    { id: "#8828", customer: "سالم عمر", phone: "0567891234", items: "شاورما × 3 + أرز", total: 210, status: "delivery", time: "11:58", type: "توصيل" },
    { id: "#8827", customer: "رنا حسن", phone: "0501122334", items: "سلطة + عصير برتقال", total: 67, status: "done", time: "11:40", type: "طاولة 2" },
    { id: "#8826", customer: "طارق فيصل", phone: "0556677889", items: "وجبة أطفال + عصير", total: 55, status: "cancelled", time: "11:20", type: "توصيل" },
  ];
  const colors2 = { pending: "#60A5FA", preparing: "#F59E0B", delivery: "#A78BFA", done: "#C8E235", cancelled: "#FF6B6B" };
  const labels2 = { pending: "جديد", preparing: "يتحضر", delivery: "في الطريق", done: "مكتمل", cancelled: "ملغي" };
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${filter === s ? colors.accent : colors.border}`, background: filter === s ? `${colors.accent}15` : "transparent", color: filter === s ? colors.accent : colors.textMuted, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: 13, fontWeight: filter === s ? 600 : 400 }}>
            {statusLabels[s]}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((o, i) => (
          <div key={i} className="card fade-in" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 50, height: 50, background: `${colors2[o.status]}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: colors2[o.status], fontWeight: 800, fontSize: 11 }}>{o.id}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: colors.text, fontSize: 14 }}>{o.customer}</span>
                <span style={{ color: colors.textMuted, fontSize: 12 }}>{o.time}</span>
              </div>
              <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4 }}>{o.items}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: colors.textMuted, fontSize: 11 }}>{o.phone}</span>
                <span style={{ background: `${colors.accent}10`, color: colors.accent, fontSize: 10, padding: "1px 8px", borderRadius: 20 }}>{o.type}</span>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: colors.text, marginBottom: 6 }}>{o.total} ر.س</div>
              <span style={{ background: `${colors2[o.status]}15`, color: colors2[o.status], fontSize: 11, padding: "3px 12px", borderRadius: 20, fontWeight: 600 }}>{labels2[o.status]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===================== ANALYTICS PAGE =====================
const AnalyticsPage = () => {
  const bars = [65, 80, 45, 90, 72, 88, 60];
  const days = ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "مبيعات الشهر", value: "48,320 ر.س", change: 18, icon: "analytics" },
          { label: "إجمالي الطلبات", value: "1,243", change: 12, icon: "orders" },
          { label: "متوسط الطلب", value: "123 ر.س", change: 5, icon: "coupons" },
          { label: "تقييم العملاء", value: "4.8 ★", change: 2, icon: "star" },
        ].map((s, i) => <StatCard key={i} {...s} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="card">
          <h3 style={{ color: colors.text, fontWeight: 700, marginBottom: 20 }}>مبيعات الأسبوع</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 160 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", height: `${h}%`, background: i === 3 ? colors.accent : `${colors.accent}30`, borderRadius: "6px 6px 0 0", transition: "all 0.3s" }} />
                <span style={{ fontSize: 11, color: colors.textMuted }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ color: colors.text, fontWeight: 700, marginBottom: 16 }}>توزيع الطلبات</h3>
          {[
            { label: "طلبات داخلية", value: 45, color: colors.accent },
            { label: "طلبات توصيل", value: 35, color: "#60A5FA" },
            { label: "طلبات خارجية", value: 20, color: "#F59E0B" },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: colors.textMuted }}>{item.label}</span>
                <span style={{ fontSize: 12, color: item.color, fontWeight: 700 }}>{item.value}%</span>
              </div>
              <div style={{ background: `${item.color}20`, borderRadius: 4, height: 6 }}>
                <div style={{ width: `${item.value}%`, height: "100%", background: item.color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ===================== PLANS PAGE =====================
const PlansPage = () => {
  const plans = [
    { name: "مجاني", nameEn: "Free", price: "0", period: "للأبد", color: "#9DC4AC", features: ["20 صنف في القائمة", "طاولة واحدة", "QR أساسي", "بدون توصيل", "بدون كوبونات"], recommended: false },
    { name: "أساسي", nameEn: "Basic", price: "99", period: "شهرياً", color: "#60A5FA", features: ["100 صنف", "حتى 5 طاولات", "QR متقدم", "طلبات أونلاين", "كوبونات داخلية", "دعم فني 24/7"], recommended: false },
    { name: "احترافي", nameEn: "Pro", price: "199", period: "شهرياً", color: colors.accent, features: ["أصناف غير محدودة", "طاولات غير محدودة", "QR مخصص", "دومين مخصص", "تحليلات متقدمة", "كوبونات خارجية", "أولوية في الدعم"], recommended: true },
  ];
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: colors.text, marginBottom: 8 }}>اختر الخطة المناسبة</h2>
        <p style={{ color: colors.textMuted }}>ابدأ مجاناً وترقَّ عندما تنمو أعمالك</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto" }}>
        {plans.map((p, i) => (
          <div key={i} className="card" style={{ border: p.recommended ? `2px solid ${colors.accent}` : undefined, position: "relative", textAlign: "center" }}>
            {p.recommended && (
              <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: colors.accent, color: colors.primaryDark, fontSize: 12, fontWeight: 700, padding: "4px 18px", borderRadius: 20 }}>
                الأكثر شعبية
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: p.color, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{p.nameEn}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: colors.text }}>{p.price}<span style={{ fontSize: 16, color: colors.textMuted }}> ر.س</span></div>
              <div style={{ color: colors.textMuted, fontSize: 12 }}>{p.period}</div>
            </div>
            <div style={{ textAlign: "right", marginBottom: 20 }}>
              {p.features.map((f, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Icon name="check" size={14} style={{ color: p.color, flexShrink: 0 }} />
                  <span style={{ color: colors.textMuted, fontSize: 13 }}>{f}</span>
                </div>
              ))}
            </div>
            <button style={{ width: "100%", padding: "11px", borderRadius: 10, border: `1px solid ${p.color}`, background: p.recommended ? p.color : "transparent", color: p.recommended ? colors.primaryDark : p.color, fontFamily: "Cairo, sans-serif", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              {p.recommended ? "اشترك الآن" : "ابدأ"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===================== SETTINGS PAGE =====================
const SettingsPage = () => {
  const [tab, setTab] = useState("general");
  const tabs = [
    { id: "general", label: "عام" },
    { id: "delivery", label: "التوصيل" },
    { id: "design", label: "التصميم" },
    { id: "notifications", label: "الإشعارات" },
    { id: "domain", label: "الدومين" },
    { id: "payment", label: "الدفع" },
  ];
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "8px 18px", borderRadius: 10, border: `1px solid ${tab === t.id ? colors.accent : colors.border}`, background: tab === t.id ? `${colors.accent}15` : "transparent", color: tab === t.id ? colors.accent : colors.textMuted, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="card" style={{ maxWidth: 600 }}>
        {tab === "general" && (
          <div>
            <h3 style={{ color: colors.text, fontWeight: 700, marginBottom: 20 }}>الإعدادات العامة</h3>
            {[
              { label: "اسم المطعم / المتجر", placeholder: "شام ستور", type: "text" },
              { label: "البريد الإلكتروني", placeholder: "info@shamstores.com", type: "email" },
              { label: "رقم الهاتف", placeholder: "+963 11 234 5678", type: "tel" },
              { label: "العنوان", placeholder: "دمشق، سوريا", type: "text" },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", color: colors.textMuted, fontSize: 13, marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  style={{ width: "100%", background: colors.primaryDark, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 14px", color: colors.text, fontFamily: "Cairo, sans-serif", fontSize: 14, outline: "none" }} />
              </div>
            ))}
            <button className="btn-accent" style={{ marginTop: 8 }}>حفظ التغييرات</button>
          </div>
        )}
        {tab !== "general" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Icon name="settings" size={48} style={{ color: colors.textMuted, opacity: 0.5, margin: "0 auto 16px", display: "block" }} />
            <p style={{ color: colors.textMuted }}>إعدادات {tabs.find(t => t.id === tab)?.label}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ===================== ADMIN DASHBOARD =====================
const AdminDashboard = () => (
  <div style={{ padding: "24px" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
      {[
        { label: "إجمالي المطاعم", value: "128", change: 8, icon: "restaurant" },
        { label: "إجمالي المتاجر", value: "84", change: 14, icon: "store" },
        { label: "المستخدمين النشطين", value: "2,341", change: 22, icon: "users" },
        { label: "طلبات اليوم", value: "1,893", change: 6, icon: "orders" },
        { label: "إيرادات الشهر", value: "124K ر.س", change: 18, icon: "analytics" },
        { label: "السائقين النشطين", value: "47", change: -2, icon: "drivers" },
      ].map((s, i) => <StatCard key={i} {...s} />)}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="card">
        <h3 style={{ color: colors.text, fontWeight: 700, marginBottom: 16 }}>أحدث المشتركين</h3>
        {[
          { name: "مطعم البحر", type: "مطعم", plan: "احترافي", date: "اليوم" },
          { name: "متجر النور", type: "متجر", plan: "أساسي", date: "أمس" },
          { name: "مطعم الزيتون", type: "مطعم", plan: "مجاني", date: "٣ أيام" },
          { name: "متجر هدايا", type: "متجر", plan: "احترافي", date: "أسبوع" },
        ].map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 3 ? `1px solid ${colors.border}40` : "none" }}>
            <div style={{ width: 36, height: 36, background: `${colors.accent}15`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: colors.accent, fontSize: 12, fontWeight: 700 }}>
              {b.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>{b.name}</div>
              <div style={{ color: colors.textMuted, fontSize: 11 }}>{b.type}</div>
            </div>
            <span style={{ background: `${colors.accent}15`, color: colors.accent, fontSize: 11, padding: "2px 10px", borderRadius: 20 }}>{b.plan}</span>
            <span style={{ color: colors.textMuted, fontSize: 11 }}>{b.date}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ color: colors.text, fontWeight: 700, marginBottom: 16 }}>إحصائيات الخطط</h3>
        {[
          { label: "الخطة المجانية", count: 89, total: 212, color: "#9DC4AC" },
          { label: "الخطة الأساسية", count: 67, total: 212, color: "#60A5FA" },
          { label: "الخطة الاحترافية", count: 56, total: 212, color: colors.accent },
        ].map((p, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: colors.textMuted }}>{p.label}</span>
              <span style={{ fontSize: 12, color: p.color, fontWeight: 700 }}>{p.count} عميل</span>
            </div>
            <div style={{ background: `${p.color}20`, borderRadius: 4, height: 6 }}>
              <div style={{ width: `${(p.count / p.total) * 100}%`, height: "100%", background: p.color, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ===================== GENERIC PAGE =====================
const GenericPage = ({ title, icon }) => (
  <div style={{ padding: "24px" }}>
    <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ width: 80, height: 80, background: `${colors.accent}15`, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: colors.accent }}>
        <Icon name={icon} size={36} />
      </div>
      <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
      <p style={{ color: colors.textMuted, fontSize: 14 }}>هذا القسم قيد التطوير. سيكون متاحاً قريباً.</p>
    </div>
  </div>
);

// ===================== HOME PAGE =====================
const PublicHomePage = ({ onLogin }) => {
  const features = [
    { icon: "qr", title: "QR ذكي", desc: "قوائم رقمية تفاعلية لكل طاولة" },
    { icon: "orders", title: "طلبات أونلاين", desc: "استقبل طلباتك في الوقت الفعلي" },
    { icon: "analytics", title: "تحليلات متقدمة", desc: "تقارير دقيقة لتنمية أعمالك" },
    { icon: "delivery", title: "نظام توصيل", desc: "تتبع السائقين في الوقت الفعلي" },
    { icon: "coupons", title: "كوبونات ذكية", desc: "عروض مخصصة لزيادة المبيعات" },
    { icon: "shield", title: "أمان عالي", desc: "بياناتك محمية بأعلى معايير الأمان" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: colors.primaryDark, fontFamily: "Cairo, sans-serif" }} dir="rtl">
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: `1px solid ${colors.border}`, position: "sticky", top: 0, background: `${colors.primaryDark}E0`, backdropFilter: "blur(10px)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, background: colors.accent, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: colors.primaryDark, fontWeight: 900, fontSize: 18 }}>S</span>
          </div>
          <span style={{ color: colors.accent, fontWeight: 800, fontSize: 18 }}>SHAM STORES</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-outline" onClick={onLogin}>تسجيل الدخول</button>
          <button className="btn-accent" onClick={onLogin}>ابدأ مجاناً</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "80px 20px 60px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${colors.accent}15`, border: `1px solid ${colors.accent}30`, borderRadius: 20, padding: "6px 16px", marginBottom: 24 }}>
          <div style={{ width: 6, height: 6, background: colors.accent, borderRadius: "50%", animation: "pulse 2s infinite" }} />
          <span style={{ color: colors.accent, fontSize: 13, fontWeight: 600 }}>بوابتك الآمنة للتجارة الإلكترونية</span>
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 900, color: colors.text, lineHeight: 1.2, marginBottom: 20 }}>
          حوّل مطعمك أو متجرك إلى{" "}
          <span style={{ color: colors.accent }}>تجربة رقمية</span>
          {" "}متكاملة
        </h1>
        <p style={{ color: colors.textMuted, fontSize: 18, lineHeight: 1.7, marginBottom: 36, maxWidth: 600, margin: "0 auto 36px" }}>
          منصة SaaS متعددة المستأجرين تدير المطاعم والمتاجر بنظام QR وطلبات أونلاين وتوصيل وكوبونات
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-accent" style={{ fontSize: 16, padding: "14px 32px" }} onClick={onLogin}>
            ابدأ الآن مجاناً <Icon name="arrow" size={16} />
          </button>
          <button className="btn-outline" style={{ fontSize: 16, padding: "14px 32px" }}>
            اكتشف المزيد
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginTop: 60, padding: "24px", background: colors.surface, borderRadius: 16, border: `1px solid ${colors.border}` }}>
          {[
            { val: "1000+", label: "مطعم ومتجر" },
            { val: "50K+", label: "طلب شهرياً" },
            { val: "99.9%", label: "وقت التشغيل" },
            { val: "4.9★", label: "تقييم العملاء" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 24, fontWeight: 900, color: colors.accent }}>{s.val}</div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: "60px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: colors.text, marginBottom: 8 }}>لماذا تختار شام ستور؟</h2>
          <p style={{ color: colors.textMuted }}>كل ما تحتاجه لإدارة عملك الرقمي في مكان واحد</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, background: `${colors.accent}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: colors.accent, flexShrink: 0 }}>
                <Icon name={f.icon} size={20} />
              </div>
              <div>
                <div style={{ color: colors.text, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                <div style={{ color: colors.textMuted, fontSize: 13 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Solutions */}
      <div style={{ padding: "40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {[
            { title: "حلول المطاعم", emoji: "🍽️", desc: "قوائم رقمية، طاولات ذكية، توصيل، وتحليلات", items: ["قوائم رقمية تفاعلية", "رموز QR للطاولات", "طلبات أونلاين وتوصيل", "إدارة الموظفين", "تقارير مالية لحظية"], color: "#60A5FA", path: "restaurant" },
            { title: "حلول المتاجر", emoji: "🛍️", desc: "متجر إلكتروني، مخزون ذكي، وكوبونات", items: ["عرض المنتجات والتصنيفات", "نظام إدارة المخزون", "طلبات أونلاين وتوصيل", "عروض وخصومات", "تحليلات المبيعات"], color: colors.accent, path: "store" },
          ].map((sol, i) => (
            <div key={i} className="card" style={{ border: `1px solid ${sol.color}25` }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{sol.emoji}</div>
              <h3 style={{ color: colors.text, fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{sol.title}</h3>
              <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>{sol.desc}</p>
              <ul style={{ marginBottom: 20 }}>
                {sol.items.map((item, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 16, height: 16, background: `${sol.color}25`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="check" size={10} style={{ color: sol.color }} />
                    </div>
                    <span style={{ color: colors.textMuted, fontSize: 13 }}>{item}</span>
                  </li>
                ))}
              </ul>
              <button onClick={onLogin} style={{ width: "100%", padding: "11px", borderRadius: 10, border: `1px solid ${sol.color}`, background: `${sol.color}15`, color: sol.color, fontFamily: "Cairo, sans-serif", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                ابدأ الآن
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "40px", borderTop: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 13 }}>
        © 2026 SHAM STORES • بوابتك الآمنة للتجارة الإلكترونية • www.shamstores.com
      </div>
    </div>
  );
};

// ===================== LOGIN PAGE =====================
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("restaurant");

  return (
    <div style={{ minHeight: "100vh", background: colors.primaryDark, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cairo, sans-serif" }} dir="rtl">
      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: colors.accent, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: colors.primaryDark }}>S</span>
          </div>
          <div style={{ color: colors.accent, fontWeight: 800, fontSize: 22 }}>SHAM STORES</div>
          <p style={{ color: colors.textMuted, fontSize: 14, marginTop: 4 }}>تسجيل الدخول إلى لوحة التحكم</p>
        </div>

        <div className="card">
          {/* Role Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24, background: colors.primaryDark, padding: 4, borderRadius: 10 }}>
            {[
              { id: "restaurant", label: "🍽️ مطعم" },
              { id: "store", label: "🛍️ متجر" },
              { id: "admin", label: "🔑 أدمن" },
            ].map(r => (
              <button key={r.id} onClick={() => setRole(r.id)}
                style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: role === r.id ? colors.accent : "transparent", color: role === r.id ? colors.primaryDark : colors.textMuted, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: role === r.id ? 700 : 400, fontSize: 12, transition: "all 0.15s" }}>
                {r.label}
              </button>
            ))}
          </div>

          {[
            { label: "البريد الإلكتروني", value: email, setter: setEmail, type: "email", placeholder: "info@shamstores.com" },
            { label: "كلمة المرور", value: password, setter: setPassword, type: "password", placeholder: "••••••••" },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: colors.textMuted, fontSize: 13, marginBottom: 6 }}>{f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                style={{ width: "100%", background: colors.primaryDark, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "11px 14px", color: colors.text, fontFamily: "Cairo, sans-serif", fontSize: 14, outline: "none" }} />
            </div>
          ))}

          <button className="btn-accent" style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 15, marginTop: 8 }} onClick={() => onLogin(role)}>
            تسجيل الدخول
          </button>
          <p style={{ textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: 16 }}>
            ليس لديك حساب؟ <span style={{ color: colors.accent, cursor: "pointer" }}>سجّل الآن</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// ===================== MAIN APP =====================
export default function App() {
  const [view, setView] = useState("home");
  const [activePage, setActivePage] = useState("dashboard");
  const [role, setRole] = useState("restaurant");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = { name: role === "admin" ? "سوبر أدمن" : role === "store" ? "مالك المتجر" : "مالك المطعم", email: "info@shamstores.com" };

  const handleLogin = (r = role) => {
    setRole(r);
    setView("dashboard");
    setActivePage(r === "admin" ? "admin-dashboard" : "dashboard");
  };

  const pageMap = {
    dashboard: { title: role === "store" ? "لوحة تحكم المتجر" : "لوحة تحكم المطعم", component: <DashboardPage role={role} /> },
    orders: { title: "الطلبات", component: <OrdersPage /> },
    analytics: { title: "الإحصائيات والتقارير", component: <AnalyticsPage /> },
    plans: { title: "خطط الأسعار", component: <PlansPage /> },
    settings: { title: "الإعدادات", component: <SettingsPage /> },
    "admin-dashboard": { title: "لوحة تحكم الإدارة", component: <AdminDashboard /> },
  };

  const genericPages = {
    menu: { title: "إدارة القائمة", icon: "restaurant" },
    tables: { title: "إدارة الطاولات", icon: "tables" },
    qr: { title: "رموز QR", icon: "qr" },
    coupons: { title: "الكوبونات والعروض", icon: "coupons" },
    staff: { title: "إدارة الموظفين", icon: "staff" },
    delivery: { title: "طلبات التوصيل", icon: "delivery" },
    drivers: { title: "إدارة السائقين", icon: "drivers" },
    marketing: { title: "التسويق والبانرات", icon: "marketing" },
    products: { title: "إدارة المنتجات", icon: "products" },
    inventory: { title: "إدارة المخزون", icon: "inventory" },
    "admin-restaurants": { title: "إدارة المطاعم", icon: "restaurant" },
    "admin-stores": { title: "إدارة المتاجر", icon: "store" },
    "admin-users": { title: "إدارة المستخدمين", icon: "users" },
    "admin-orders": { title: "جميع الطلبات", icon: "orders" },
    "admin-drivers": { title: "إدارة السائقين", icon: "drivers" },
    "admin-plans": { title: "الخطط والاشتراكات", icon: "plans" },
    "admin-features": { title: "إدارة الميزات", icon: "star" },
    "admin-qr": { title: "رموز QR للمنصة", icon: "qr" },
    "admin-marketing": { title: "التسويق العام", icon: "marketing" },
    "admin-settings": { title: "إعدادات المنصة", icon: "settings" },
  };

  const currentPage = pageMap[activePage] || (genericPages[activePage] ? { title: genericPages[activePage].title, component: <GenericPage title={genericPages[activePage].title} icon={genericPages[activePage].icon} /> } : null);

  if (view === "home") {
    return (
      <>
        <style>{globalStyle}</style>
        <PublicHomePage onLogin={() => setView("login")} />
      </>
    );
  }

  if (view === "login") {
    return (
      <>
        <style>{globalStyle}</style>
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: colors.primaryDark }}>
        <Sidebar activePage={activePage} setActivePage={setActivePage} role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
        <div style={{ flex: 1, marginRight: 240, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <TopBar title={currentPage?.title || "الصفحة"} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main style={{ flex: 1 }}>
            {currentPage?.component}
          </main>
        </div>
      </div>
    </>
  );
}
