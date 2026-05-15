import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import QRGenerator from '../../components/qr/QRGenerator';
import { IoQrCode, IoSearch, IoRefresh, IoStorefront, IoRestaurant, IoArrowBack, IoLink, IoCopy } from 'react-icons/io5';
import toast from 'react-hot-toast';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA',
};

interface Entity { id: string; name: string; slug: string; logo?: string; isActive: boolean; }

const AdminQRCodesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'restaurants' | 'stores'>('restaurants');
  const [restaurants, setRestaurants] = useState<Entity[]>([]);
  const [stores, setStores] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'restaurant' | 'store'; data: Entity } | null>(null);

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'restaurants') { const d = await api.get('/admin/restaurants'); setRestaurants(d?.restaurants || d || []); }
      else { const d = await api.get('/admin/stores'); setStores(d?.stores || d || []); }
    } catch { toast.error('حدث خطأ في جلب البيانات'); }
    finally { setLoading(false); }
  };

  const getFilteredData = () => {
    const list = activeTab === 'restaurants' ? restaurants : stores;
    return list.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.slug.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success('تم نسخ الرابط'); };

  const LinkRow = ({ label, path }: { label: string; path: string }) => (
    <div style={{ background: C.surf, borderRadius: 12, padding: '12px 16px', marginBottom: 10 }}>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <code style={{ flex: 1, background: C.bg, color: C.accent, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{window.location.origin}{path}</code>
        <button onClick={() => copyToClipboard(`${window.location.origin}${path}`)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, display: 'flex' }}><IoCopy size={16} /></button>
      </div>
    </div>
  );

  if (selectedEntity) {
    const { type, data } = selectedEntity;
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
        <button onClick={() => setSelectedEntity(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 24, fontFamily: 'Cairo, sans-serif' }}>
          <IoArrowBack size={18} /> العودة إلى القائمة
        </button>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, background: type === 'restaurant' ? 'rgba(96,165,250,0.15)' : 'rgba(200,226,53,0.12)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {type === 'restaurant' ? <IoRestaurant size={24} style={{ color: C.blue }} /> : <IoStorefront size={24} style={{ color: C.accent }} />}
            </div>
            <div>
              <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800 }}>{data.name}</h1>
              <p style={{ color: C.muted, fontSize: 13 }}>{type === 'restaurant' ? 'مطعم' : 'متجر'} • <code style={{ fontFamily: 'monospace', color: C.accent, fontSize: 12 }}>{data.slug}</code></p>
            </div>
          </div>

          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <h2 style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 16 }}>QR الرئيسي</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
              <QRGenerator type={type === 'restaurant' ? 'restaurant' : 'store'} slug={data.slug} storeName={data.name} storeLogo={data.logo} buttonText={<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IoQrCode size={14} /><span>إنشاء QR رئيسي</span></div>} variant="primary" />
              <LinkRow label={`رابط ${type === 'restaurant' ? 'المطعم' : 'المتجر'}`} path={`/${data.slug}`} />
            </div>
          </div>

          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
            <h2 style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IoLink size={16} style={{ color: C.accent }} /> روابط مفيدة
            </h2>
            {type === 'restaurant' ? (
              <><LinkRow label="قائمة المطعم" path={`/${data.slug}/menu`} /><LinkRow label="لوحة التحكم" path="/dashboard" /></>
            ) : (
              <><LinkRow label="منتجات المتجر" path={`/${data.slug}/products`} /><LinkRow label="لوحة التحكم" path="/dashboard" /></>
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
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>إدارة رموز QR</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>إنشاء رموز QR للمطاعم والمتاجر وروابطها</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        {([['restaurants', 'المطاعم', IoRestaurant], ['stores', 'المتاجر', IoStorefront]] as const).map(([tab, label, Icon]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10, border: 'none', background: activeTab === tab ? C.accent : C.surf, color: activeTab === tab ? C.bg : C.muted, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
            <Icon size={16} /> {label}
          </button>
        ))}
        <button onClick={fetchData} style={{ marginRight: 'auto', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 8, display: 'flex' }}><IoRefresh size={18} /></button>
      </div>

      {/* Search */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 20, position: 'relative' }}>
        <IoSearch size={15} style={{ position: 'absolute', right: 26, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
        <input type="text" placeholder={`بحث عن ${activeTab === 'restaurants' ? 'مطعم' : 'متجر'}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', paddingRight: 36, paddingLeft: 12, paddingTop: 8, paddingBottom: 8, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {loading ? <Loader /> : filteredData.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <IoLink size={48} style={{ color: C.border, marginBottom: 12 }} />
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>لا توجد {activeTab === 'restaurants' ? 'مطاعم' : 'متاجر'}</h3>
          <p style={{ color: C.muted, fontSize: 13 }}>لم يتم العثور على نتائج</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filteredData.map(item => (
            <div key={item.id} onClick={() => setSelectedEntity({ type: activeTab === 'restaurants' ? 'restaurant' : 'store', data: item })} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.accent; }} onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, background: activeTab === 'restaurants' ? 'rgba(96,165,250,0.12)' : 'rgba(200,226,53,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {activeTab === 'restaurants' ? <IoRestaurant size={20} style={{ color: C.blue }} /> : <IoStorefront size={20} style={{ color: C.accent }} />}
                  </div>
                  <div>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                    <code style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace' }}>{item.slug}</code>
                  </div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.isActive ? C.accent : C.red, marginTop: 4 }} />
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: C.muted, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoLink size={11} /> {window.location.origin}/{item.slug}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.accent, fontSize: 12, fontWeight: 700 }}>
                  <IoQrCode size={13} /> إنشاء QR
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminQRCodesPage;
