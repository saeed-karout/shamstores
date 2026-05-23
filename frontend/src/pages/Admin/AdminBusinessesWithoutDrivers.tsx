// frontend/src/pages/Admin/AdminBusinessesWithoutDrivers.tsx
import React, { useEffect, useState } from 'react';
import { IoStorefront, IoRestaurant, IoCar, IoAdd } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

const C = {
  bg: '#082E24',
  card: '#112E23',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  blue: '#60A5FA',
  purple: '#A78BFA',
};

interface Business {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  isActive: boolean;
  createdAt: string;
}

const AdminBusinessesWithoutDrivers: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Business[]>([]);
  const [stores, setStores] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | 'restaurants' | 'stores'>('all');

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const response = await api.get('/admin/drivers/businesses-without-drivers');
      setRestaurants(response.data.restaurants || []);
      setStores(response.data.stores || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast.error('فشل تحميل المنشآت');
    } finally {
      setLoading(false);
    }
  };

  const assignDriver = async (businessId: string, businessType: string) => {
    // TODO: فتح مودال لاختيار سائق أو إنشاء سائق جديد
    toast.success(`سيتم تفعيل إضافة سائق لـ ${businessType}`);
  };

  if (loading) return <Loader fullScreen />;

  const allBusinesses = [
    ...restaurants.map(r => ({ ...r, type: 'restaurant' as const })),
    ...stores.map(s => ({ ...s, type: 'store' as const }))
  ];

  const displayBusinesses = () => {
    if (selectedTab === 'restaurants') return restaurants.map(r => ({ ...r, type: 'restaurant' as const }));
    if (selectedTab === 'stores') return stores.map(s => ({ ...s, type: 'store' as const }));
    return allBusinesses;
  };

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>🏪 المنشآت التي تحتاج سائقين</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>
          هذه المنشآت (مطاعم/متاجر) ليس لديها سائقين حتى الآن. يمكنك إضافة سائقين لهم.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 24px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IoRestaurant size={28} style={{ color: C.blue }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{restaurants.length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>مطاعم بدون سائقين</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 24px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IoStorefront size={28} style={{ color: C.purple }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stores.length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>متاجر بدون سائقين</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {[
          { id: 'all', label: 'الكل', count: allBusinesses.length },
          { id: 'restaurants', label: 'مطاعم', count: restaurants.length },
          { id: 'stores', label: 'متاجر', count: stores.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              color: selectedTab === tab.id ? C.accent : C.muted,
              borderBottom: selectedTab === tab.id ? `2px solid ${C.accent}` : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            {tab.label}
            <span style={{
              background: selectedTab === tab.id ? `${C.accent}20` : `${C.muted}20`,
              padding: '2px 8px',
              borderRadius: 20,
              fontSize: 12
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Businesses List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayBusinesses().map((business) => (
          <div
            key={`${business.type}-${business.id}`}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: business.type === 'restaurant' ? `${C.blue}20` : `${C.purple}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24
              }}>
                {business.type === 'restaurant' ? '🍽️' : '🛍️'}
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{business.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {business.type === 'restaurant' ? 'مطعم' : 'متجر'}
                  {business.address && ` • ${business.address}`}
                </div>
                {business.email && (
                  <div style={{ fontSize: 11, color: C.muted }}>{business.email}</div>
                )}
              </div>
            </div>
            <button
              onClick={() => assignDriver(business.id, business.type)}
              style={{
                padding: '8px 16px',
                background: `${C.accent}15`,
                border: `1px solid ${C.accent}`,
                borderRadius: 8,
                color: C.accent,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 500
              }}
            >
              <IoCar size={16} />
              إضافة سائق
            </button>
          </div>
        ))}
      </div>

      {displayBusinesses().length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
          🎉 جميع المنشآت لديها سائقين! لا توجد منشآت بحاجة إلى سائقين.
        </div>
      )}
    </div>
  );
};

export default AdminBusinessesWithoutDrivers;