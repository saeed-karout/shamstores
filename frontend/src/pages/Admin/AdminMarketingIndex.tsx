import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoStorefront, IoRestaurant, IoSearch, IoArrowBack, IoAlertCircle } from 'react-icons/io5';
import { adminService } from '../../services/api/index';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  surf:   '#0F3D31',
  surfL:  '#164D3E',
  accent: '#C8E235',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
};

interface Business {
  id: string; name: string; email: string; phone: string; logo?: string; isActive: boolean;
  storeOwner?: { name: string; email: string }; plan?: { name: string };
}

const AdminMarketingIndex: React.FC = () => {
  const navigate = useNavigate();
  const [businessType, setBusinessType] = useState<'restaurant' | 'store'>('store');
  const [searchTerm, setSearchTerm] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchBusinesses = async () => {
    if (!searchTerm.trim()) { setError('الرجاء إدخال نص للبحث'); return; }
    setLoading(true); setError(null);
    try {
      let result: any;
      if (businessType === 'restaurant') {
        result = await adminService.getRestaurants({ search: searchTerm, limit: 10 });
        if (result?.data?.restaurants) setBusinesses(result.data.restaurants);
        else if (result?.restaurants) setBusinesses(result.restaurants);
        else if (Array.isArray(result)) setBusinesses(result);
        else setBusinesses([]);
      } else {
        result = await adminService.getStores({ search: searchTerm, limit: 10 });
        if (result?.data?.stores) setBusinesses(result.data.stores);
        else if (result?.stores) setBusinesses(result.stores);
        else if (Array.isArray(result)) setBusinesses(result);
        else if (result?.data && Array.isArray(result.data)) setBusinesses(result.data);
        else { setBusinesses([]); setError('لم يتم العثور على نتائج'); }
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'حدث خطأ في البحث'); setBusinesses([]);
    } finally { setLoading(false); }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') searchBusinesses(); };

  const handleGoToMarketing = () => {
    if (selectedBusiness) navigate(`/admin/business/${businessType}/${selectedBusiness.id}/marketing`);
  };

  const resetSearch = (type: 'restaurant' | 'store') => {
    setBusinessType(type); setBusinesses([]); setSelectedBusiness(null); setSearchTerm(''); setError(null);
  };

  const inputStyle: React.CSSProperties = { flex: 1, padding: '11px 14px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14, outline: 'none' };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28 }}>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 6 }}>إدارة التسويق</h1>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>اختر النشاط التجاري الذي تريد إدارة إعلاناته وبانراته وعروضه</p>

          {/* Type selector */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {([['restaurant', 'مطاعم', IoRestaurant], ['store', 'متاجر', IoStorefront]] as const).map(([type, label, Icon]) => (
              <button key={type} onClick={() => resetSearch(type)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, border: `2px solid ${businessType === type ? C.accent : C.border}`, background: businessType === type ? 'rgba(200,226,53,0.1)' : 'transparent', color: businessType === type ? C.accent : C.muted, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
                <Icon size={20} /> {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyPress={handleKeyPress} placeholder={`ابحث عن ${businessType === 'restaurant' ? 'مطعم' : 'متجر'}...`} style={inputStyle} />
            <button onClick={searchBusinesses} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px', background: C.accent, color: C.bg, border: 'none', borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? <><div style={{ width: 16, height: 16, border: `2px solid ${C.bg}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />جاري البحث...</> : <><IoSearch size={16} />بحث</>}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: C.red, fontSize: 14 }}>
              <IoAlertCircle size={18} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          {/* Results */}
          {!loading && businesses.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>نتائج البحث ({businesses.length}):</div>
              <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {businesses.map(business => (
                  <div key={business.id} onClick={() => setSelectedBusiness(business)} style={{ background: selectedBusiness?.id === business.id ? 'rgba(200,226,53,0.1)' : C.surf, border: `${selectedBusiness?.id === business.id ? '2px' : '1px'} solid ${selectedBusiness?.id === business.id ? C.accent : C.border}`, borderRadius: 12, padding: '12px 16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{business.name}</span>
                        {!business.isActive && <span style={{ background: 'rgba(255,107,107,0.15)', color: C.red, fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>غير نشط</span>}
                      </div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{business.email}</div>
                      {business.storeOwner && <div style={{ color: C.muted, fontSize: 11 }}>المالك: {business.storeOwner.name}</div>}
                      {business.plan && <div style={{ color: C.muted, fontSize: 11 }}>الخطة: {business.plan.name}</div>}
                    </div>
                    {selectedBusiness?.id === business.id && (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.bg }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && businesses.length === 0 && searchTerm && !error && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted }}>
              <IoStorefront size={40} style={{ color: C.border, marginBottom: 12 }} />
              <p style={{ fontSize: 14, marginBottom: 4 }}>لم يتم العثور على {businessType === 'restaurant' ? 'مطاعم' : 'متاجر'}</p>
              <p style={{ fontSize: 13 }}>جرب كلمات بحث مختلفة</p>
            </div>
          )}

          {/* Action button */}
          <button onClick={handleGoToMarketing} disabled={!selectedBusiness} style={{ width: '100%', padding: '13px', background: selectedBusiness ? C.accent : C.surf, color: selectedBusiness ? C.bg : C.muted, border: `1px solid ${selectedBusiness ? C.accent : C.border}`, borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 15, cursor: selectedBusiness ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            متابعة إلى إدارة التسويق <IoArrowBack size={16} />
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminMarketingIndex;
