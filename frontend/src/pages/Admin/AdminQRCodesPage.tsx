// pages/Admin/AdminQRCodesPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import QRGenerator from '../../components/qr/QRGenerator';
import { 
  IoQrCode, IoSearch, IoRefresh, IoStorefront, IoRestaurant, 
  IoArrowBack, IoLink, IoCopy, IoDownload, IoShare, IoPrint,
  IoCheckmarkCircle, IoTime, IoGlobe, IoLocation,
  IoStatsChart, IoChatbubble, IoHeart, IoStar,
  IoPhoneLandscape
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const C = {
  bg: '#082E24', 
  card: '#112E23', 
  surf: '#0F3D31', 
  accent: '#C8E235',
  text: '#E8F5E9', 
  muted: '#9DC4AC', 
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', 
  blue: '#60A5FA',
  purple: '#A78BFA',
  yellow: '#FBBF24',
  orange: '#FB923C'
};

interface Entity {
  id: string;
  name: string;
  slug: string;
  subdomain?: string;
  customDomain?: string;
  logo?: string;
  isActive: boolean;
  email?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  plan?: { name: string; price: number };
  stats?: { ordersCount?: number; productsCount?: number; viewsCount?: number };
}

interface StatsData {
  ordersCount: number;
  productsCount: number;
  viewsCount: number;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
}

const AdminQRCodesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'restaurants' | 'stores'>('restaurants');
  const [restaurants, setRestaurants] = useState<Entity[]>([]);
  const [stores, setStores] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'restaurant' | 'store'; data: Entity } | null>(null);
  const [entityStats, setEntityStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => { 
    fetchData(); 
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'restaurants') {
        const response = await api.get('/admin/restaurants');
        const data = response?.data?.data?.restaurants || response?.data?.restaurants || response?.restaurants || response || [];
        setRestaurants(Array.isArray(data) ? data : []);
      } else {
        const response = await api.get('/admin/stores');
        const data = response?.data?.data?.stores || response?.data?.stores || response?.stores || response || [];
        setStores(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntityStats = async (type: string, id: string) => {
    setStatsLoading(true);
    try {
      const endpoint = type === 'restaurant' 
        ? `/admin/restaurants/${id}/stats` 
        : `/admin/stores/${id}/stats`;
      const response = await api.get(endpoint);
      const data = response?.data?.data || response?.data || response;
      setEntityStats({
        ordersCount: data?.ordersCount || data?.totalOrders || 0,
        productsCount: type === 'restaurant' ? (data?.menuItemsCount || 0) : (data?.productsCount || 0),
        viewsCount: data?.viewsCount || data?.totalViews || 0,
        todayOrders: data?.todayOrders || 0,
        weekOrders: data?.weekOrders || 0,
        monthOrders: data?.monthOrders || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setEntityStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  // ✅ دالة الحصول على الرابط الصحيح (باستخدام subdomain أو slug)
  const getFullUrl = (slug: string, subdomain?: string, customDomain?: string): string => {
    const baseUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
    
    // إذا كان هناك دومين مخصص
    if (customDomain) {
      return `https://${customDomain}`;
    }
    
    // إذا كان هناك subdomain
    if (subdomain) {
      return `https://${subdomain}.shamstores.com`;
    }
    
    // الوضع العادي: domain/slug
    return `${baseUrl}/${slug}`;
  };

  const copyToClipboard = (text: string) => { 
    navigator.clipboard.writeText(text); 
    toast.success('تم نسخ الرابط'); 
  };

  const handleSelectEntity = async (type: 'restaurant' | 'store', data: Entity) => {
    setSelectedEntity({ type, data });
    await fetchEntityStats(type, data.id);
  };

  const getFilteredData = () => {
    const list = activeTab === 'restaurants' ? restaurants : stores;
    return list.filter(i => 
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const LinkRow = ({ label, path, subdomain, customDomain }: { label: string; path: string; subdomain?: string; customDomain?: string }) => {
    const fullUrl = getFullUrl(path, subdomain, customDomain);
    return (
      <div style={{ background: C.surf, borderRadius: 12, padding: '12px 16px', marginBottom: 10 }}>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IoGlobe size={12} /> {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={{ 
            flex: 1, 
            background: C.bg, 
            color: C.accent, 
            padding: '6px 10px', 
            borderRadius: 8, 
            fontSize: 12, 
            fontFamily: 'monospace', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            {fullUrl}
          </code>
          <button 
            onClick={() => copyToClipboard(fullUrl)} 
            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, display: 'flex' }}
            title="نسخ الرابط"
          >
            <IoCopy size={16} />
          </button>
        </div>
        {(subdomain || customDomain) && (
          <div style={{ fontSize: 10, color: C.accent, marginTop: 6 }}>
            {subdomain && `🔗 الدومين الفرعي: ${subdomain}.shamstores.com`}
            {customDomain && `🌐 الدومين المخصص: ${customDomain}`}
          </div>
        )}
      </div>
    );
  };

  if (selectedEntity) {
    const { type, data } = selectedEntity;
    const fullUrl = getFullUrl(data.slug, data.subdomain, data.customDomain);
    
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
        <button 
          onClick={() => setSelectedEntity(null)} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: C.muted, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            fontSize: 14, 
            marginBottom: 24, 
            fontFamily: 'Cairo, sans-serif' 
          }}
        >
          <IoArrowBack size={18} /> العودة إلى القائمة
        </button>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden' }}>
          {/* Header with Cover */}
          <div style={{
            background: `linear-gradient(135deg, ${type === 'restaurant' ? C.blue : C.purple}40, ${type === 'restaurant' ? C.blue : C.purple}10)`,
            padding: '24px 28px',
            borderBottom: `1px solid ${C.border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ 
                width: 64, 
                height: 64, 
                background: type === 'restaurant' ? `${C.blue}20` : `${C.purple}20`, 
                borderRadius: 16, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                {data.logo ? (
                  <img src={data.logo} alt={data.name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
                ) : type === 'restaurant' ? (
                  <IoRestaurant size={32} style={{ color: C.blue }} />
                ) : (
                  <IoStorefront size={32} style={{ color: C.purple }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{data.name}</h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  <code style={{ fontFamily: 'monospace', color: C.accent, fontSize: 12, background: C.bg, padding: '2px 8px', borderRadius: 6 }}>
                    {data.slug}
                  </code>
                  {data.subdomain && (
                    <span style={{ fontSize: 11, color: C.accent, background: `${C.accent}15`, padding: '2px 8px', borderRadius: 20 }}>
                      {data.subdomain}.shamstores.com
                    </span>
                  )}
                  {data.customDomain && (
                    <span style={{ fontSize: 11, color: C.blue, background: `${C.blue}15`, padding: '2px 8px', borderRadius: 20 }}>
                      {data.customDomain}
                    </span>
                  )}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 20, fontSize: 11,
                    background: data.isActive ? `${C.accent}20` : `${C.red}20`,
                    color: data.isActive ? C.accent : C.red
                  }}>
                    {data.isActive ? <IoCheckmarkCircle size={12} /> : <IoTime size={12} />}
                    {data.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: 28 }}>
            {/* Stats Section */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: 12, 
              marginBottom: 24,
              background: C.surf,
              borderRadius: 16,
              padding: 16
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>
                  {statsLoading ? '...' : entityStats?.productsCount || 0}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  {type === 'restaurant' ? 'الأصناف' : 'المنتجات'}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.yellow }}>
                  {statsLoading ? '...' : entityStats?.ordersCount || 0}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>الطلبات</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.blue }}>
                  {statsLoading ? '...' : entityStats?.viewsCount || 0}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>المشاهدات</div>
              </div>
              {entityStats?.todayOrders !== undefined && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C.purple }}>
                    {statsLoading ? '...' : entityStats.todayOrders}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>طلبات اليوم</div>
                </div>
              )}
            </div>

            {/* QR Section - ✅ تم تمرير subdomain و customDomain */}
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoQrCode size={20} style={{ color: C.accent }} /> رمز QR الرئيسي
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
                <QRGenerator 
                  type={type === 'restaurant' ? 'restaurant' : 'store'} 
                  id={data.id}
                  slug={data.slug}
                  subdomain={data.subdomain}
                  customDomain={data.customDomain}
                  storeName={data.name}
                  storeLogo={data.logo}
                  buttonText={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IoQrCode size={14} />
                      <span>إنشاء QR رئيسي</span>
                    </div>
                  } 
                  variant="primary" 
                />
                <LinkRow 
                  label={`رابط ${type === 'restaurant' ? 'المطعم' : 'المتجر'}`} 
                  path={data.slug}
                  subdomain={data.subdomain}
                  customDomain={data.customDomain}
                />
              </div>
            </div>

            {/* Useful Links */}
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoLink size={18} style={{ color: C.accent }} /> روابط مفيدة
              </h2>
              {type === 'restaurant' ? (
                <>
                  <LinkRow label="قائمة المطعم" path={`${data.slug}/menu`} />
                  <LinkRow label="لوحة التحكم" path="/dashboard" />
                  <LinkRow label="الطلبات" path="/dashboard/orders" />
                </>
              ) : (
                <>
                  <LinkRow label="منتجات المتجر" path={`${data.slug}/products`} />
                  <LinkRow label="لوحة التحكم" path="/dashboard" />
                  <LinkRow label="الطلبات" path="/dashboard/orders" />
                </>
              )}
            </div>

            {/* Contact Info */}
            {(data.email || data.phone || data.address) && (
              <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginTop: 16 }}>
                <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoPhoneLandscape size={18} style={{ color: C.blue }} /> معلومات التواصل
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  {data.email && (
                    <div><span style={{ color: C.muted }}>البريد:</span> {data.email}</div>
                  )}
                  {data.phone && (
                    <div><span style={{ color: C.muted }}>الهاتف:</span> {data.phone}</div>
                  )}
                  {data.address && (
                    <div><span style={{ color: C.muted }}>العنوان:</span> {data.address}</div>
                  )}
                </div>
              </div>
            )}

            {/* Plan Info */}
            {data.plan && (
              <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginTop: 16 }}>
                <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoStatsChart size={18} style={{ color: C.purple }} /> الخطة الحالية
                </h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: C.accent, fontWeight: 700 }}>{data.plan.name}</span>
                  <span style={{ color: C.muted }}>{data.plan.price} ر.س / شهر</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📱 إدارة رموز QR</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>إنشاء وإدارة رموز QR للمطاعم والمتاجر وروابطها</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 12, flexWrap: 'wrap' }}>
        {[
          { tab: 'restaurants', label: '🍽️ المطاعم', icon: IoRestaurant, count: restaurants.length },
          { tab: 'stores', label: '🛍️ المتاجر', icon: IoStorefront, count: stores.length }
        ].map(({ tab, label, icon: Icon, count }) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab as any)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '10px 24px', 
              borderRadius: 12, 
              border: 'none', 
              background: activeTab === tab ? C.accent : C.surf, 
              color: activeTab === tab ? C.bg : C.muted, 
              fontFamily: 'Cairo, sans-serif', 
              fontWeight: activeTab === tab ? 700 : 500, 
              fontSize: 14, 
              cursor: 'pointer', 
              transition: 'all 0.2s' 
            }}
          >
            <Icon size={18} /> {label}
            <span style={{
              marginRight: 6,
              background: activeTab === tab ? C.bg : `${C.muted}30`,
              color: activeTab === tab ? C.accent : C.muted,
              padding: '2px 8px',
              borderRadius: 20,
              fontSize: 11
            }}>
              {count}
            </span>
          </button>
        ))}
        <button 
          onClick={fetchData} 
          style={{ 
            marginRight: 'auto', 
            background: C.surf, 
            border: `1px solid ${C.border}`, 
            borderRadius: 10, 
            color: C.muted, 
            cursor: 'pointer', 
            padding: '8px 14px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6 
          }}
        >
          <IoRefresh size={16} /> تحديث
        </button>
      </div>

      {/* Search */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 20, position: 'relative' }}>
        <IoSearch size={16} style={{ position: 'absolute', right: 26, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
        <input 
          type="text" 
          placeholder={`🔍 بحث عن ${activeTab === 'restaurants' ? 'مطعم' : 'متجر'} بالاسم أو الرابط...`} 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          style={{ 
            width: '100%', 
            paddingRight: 42, 
            paddingLeft: 16, 
            paddingTop: 12, 
            paddingBottom: 12, 
            background: C.surf, 
            border: `1px solid ${C.border}`, 
            borderRadius: 10, 
            color: C.text, 
            fontFamily: 'Cairo, sans-serif', 
            fontSize: 14, 
            outline: 'none', 
            boxSizing: 'border-box' 
          }} 
        />
      </div>

      {loading ? (
        <Loader />
      ) : filteredData.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 60, textAlign: 'center' }}>
          <IoLink size={56} style={{ color: C.border, marginBottom: 16 }} />
          <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>لا توجد {activeTab === 'restaurants' ? 'مطاعم' : 'متاجر'}</h3>
          <p style={{ color: C.muted, fontSize: 14 }}>لم يتم العثور على نتائج مطابقة للبحث</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredData.map(item => {
            const fullUrl = getFullUrl(item.slug, item.subdomain, item.customDomain);
            return (
              <div 
                key={item.id} 
                onClick={() => handleSelectEntity(activeTab === 'restaurants' ? 'restaurant' : 'store', item)} 
                style={{ 
                  background: C.card, 
                  border: `1px solid ${C.border}`, 
                  borderRadius: 16, 
                  overflow: 'hidden',
                  cursor: 'pointer', 
                  transition: 'all 0.2s',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={e => { 
                  (e.currentTarget as HTMLDivElement).style.borderColor = C.accent; 
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                }} 
                onMouseLeave={e => { 
                  (e.currentTarget as HTMLDivElement).style.borderColor = C.border; 
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{ 
                  padding: 16,
                  background: `linear-gradient(135deg, ${activeTab === 'restaurants' ? C.blue : C.purple}15, transparent)`,
                  borderBottom: `1px solid ${C.border}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <div style={{ 
                        width: 48, 
                        height: 48, 
                        background: activeTab === 'restaurants' ? `${C.blue}20` : `${C.purple}20`, 
                        borderRadius: 12, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        {item.logo ? (
                          <img src={item.logo} alt={item.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                        ) : activeTab === 'restaurants' ? (
                          <IoRestaurant size={22} style={{ color: C.blue }} />
                        ) : (
                          <IoStorefront size={22} style={{ color: C.purple }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: C.text, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <code style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', display: 'block', marginTop: 2 }}>
                          {item.slug}
                        </code>
                      </div>
                    </div>
                    <div style={{ 
                      width: 10, 
                      height: 10, 
                      borderRadius: '50%', 
                      background: item.isActive ? C.accent : C.red,
                      boxShadow: item.isActive ? `0 0 8px ${C.accent}` : 'none'
                    }} />
                  </div>
                </div>
                
                <div style={{ padding: 16 }}>
                  <div style={{ 
                    background: C.surf, 
                    borderRadius: 10, 
                    padding: '10px 12px', 
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <IoLink size={14} style={{ color: C.muted, flexShrink: 0 }} />
                    <code style={{ 
                      fontSize: 11, 
                      color: C.accent, 
                      fontFamily: 'monospace',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {fullUrl}
                    </code>
                  </div>
                  
                  {(item.subdomain || item.customDomain) && (
                    <div style={{ fontSize: 10, color: C.accent, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IoGlobe size={10} />
                      {item.subdomain && `${item.subdomain}.shamstores.com`}
                      {item.customDomain && item.customDomain}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
               
                  <button 
  onClick={(e) => {
    e.stopPropagation();
    handleSelectEntity(activeTab === 'restaurants' ? 'restaurant' : 'store', item);
  }}
  style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: 4, 
    background: `${C.accent}15`, 
    padding: '4px 12px', 
    borderRadius: 20, 
    fontSize: 12, 
    color: C.accent,
    fontWeight: 500,
    cursor: 'pointer'
  }}
>
  <IoQrCode size={13} /> عرض QR
</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminQRCodesPage;