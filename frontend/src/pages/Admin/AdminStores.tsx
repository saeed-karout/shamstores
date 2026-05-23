// pages/Admin/AdminStores.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoTrash, IoEye, IoAdd, IoFilter, IoClose, IoCheckmark, IoRefresh, IoBusiness, IoMail, IoCall, IoCalendar, IoStatsChart, IoColorPalette, IoGlobe, IoLockClosed, IoCheckmarkCircle } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const C = {
  bg: '#082E24',
  card: '#112E23',
  prim: '#0D4A3A',
  surf: '#0F3D31',
  surfL: '#164D3E',
  accent: '#C8E235',
  acDk: '#A8C220',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  blue: '#60A5FA',
  yellow: '#F59E0B',
  purple: '#A78BFA',
  orange: '#FB923C',
};

interface Store {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  plan: { id: string; name: string; price: number };
  owner: { id: string; name: string; email: string };
  subdomain?: string;
  customDomain?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
  productsCount?: number;
  ordersCount?: number;
}

const AdminStores: React.FC = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [storeStats, setStoreStats] = useState<any>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/stores');
      // ✅ تصحيح: استقبال البيانات بشكل صحيح
      const storesData = response.data?.data?.stores || response.data?.stores || response.data || [];
      setStores(Array.isArray(storesData) ? storesData : []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('فشل تحميل المتاجر');
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreDetails = async (storeId: string) => {
    setStatsLoading(true);
    try {
      const response = await api.get(`/admin/stores/${storeId}`);
      setStoreStats(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching store details:', error);
      toast.error('فشل تحميل تفاصيل المتجر');
    } finally {
      setStatsLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/stores/${id}/toggle`);
      toast.success(currentStatus ? 'تم تعطيل المتجر' : 'تم تفعيل المتجر');
      fetchStores();
    } catch (error) {
      toast.error('فشل تغيير حالة المتجر');
    }
  };

  const deleteStore = async (id: string, name: string) => {
    if (window.confirm(`⚠️ هل أنت متأكد من حذف متجر "${name}"؟\n\nسيتم حذف جميع المنتجات والطلبات والبيانات المرتبطة. هذا الإجراء لا يمكن التراجع عنه.`)) {
      try {
        await api.delete(`/admin/stores/${id}`);
        toast.success('تم حذف المتجر بنجاح');
        fetchStores();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'فشل حذف المتجر');
      }
    }
  };

  const handleViewDetails = async (store: Store) => {
    setSelectedStore(store);
    await fetchStoreDetails(store.id);
    setShowDetailsModal(true);
  };

  const handleGoToDetails = (id: string) => {
    navigate(`/admin/stores/${id}`);
  };

  const filteredStores = stores.filter(store => {
    if (searchTerm && !store.name.toLowerCase().includes(searchTerm.toLowerCase()) && !store.email?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterStatus === 'active' && !store.isActive) return false;
    if (filterStatus === 'inactive' && store.isActive) return false;
    return true;
  });

  if (loading) return <Loader fullScreen />;

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'right',
    color: C.muted,
    fontSize: 12,
    fontWeight: 600,
    background: C.surf,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    color: C.text,
    fontSize: 13,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'middle',
  };

  const inputStyle: React.CSSProperties = {
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    padding: '8px 40px 8px 14px',
    fontSize: 14,
    outline: 'none',
    width: 220,
  };

  const selectStyle: React.CSSProperties = {
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    padding: '8px 14px',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🛍️ إدارة المتاجر</h1>
          <p style={{ color: C.muted, fontSize: 13 }}>إدارة جميع المتاجر الإلكترونية على المنصة</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />
            <IoSearch style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} style={selectStyle}>
            <option value="all">📋 الكل</option>
            <option value="active">✅ نشط</option>
            <option value="inactive">⛔ غير نشط</option>
          </select>
          <button
            onClick={fetchStores}
            style={{
              padding: '8px 14px',
              background: `${C.accent}15`,
              border: `1px solid ${C.accent}`,
              borderRadius: 10,
              color: C.accent,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <IoRefresh size={16} />
            تحديث
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${C.accent}20`, padding: 8, borderRadius: 10 }}>
              <IoBusiness size={20} color={C.accent} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stores.length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>إجمالي المتاجر</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${C.accent}20`, padding: 8, borderRadius: 10 }}>
              <IoCheckmarkCircle size={20} color={C.accent} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stores.filter(s => s.isActive).length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>نشط</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${C.red}20`, padding: 8, borderRadius: 10 }}>
              <IoClose size={20} color={C.red} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stores.filter(s => !s.isActive).length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>غير نشط</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stores Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>اسم المتجر</th>
                <th style={thStyle}>البريد الإلكتروني</th>
                <th style={thStyle}>رقم الهاتف</th>
                <th style={thStyle}>الخطة</th>
                <th style={thStyle}>المالك</th>
                <th style={thStyle}>الدومين</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>تاريخ التسجيل</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.map((store, index) => (
                <tr
                  key={store.id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, color: C.muted, width: 40 }}>{index + 1}</td>
                  <td
                    style={{ ...tdStyle, color: C.accent, cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => handleGoToDetails(store.id)}
                  >
                    {store.logo ? <img src={store.logo} alt={store.name} style={{ width: 24, height: 24, borderRadius: 8, marginLeft: 8, verticalAlign: 'middle' }} /> : '🛍️'} {store.name}
                  </td>
                  <td style={{ ...tdStyle, color: C.muted }}>{store.email}</td>
                  <td style={tdStyle}>{store.phone || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: `${C.blue}20`, color: C.blue,
                    }}>
                      {store.plan?.name || 'free'} {store.plan?.price ? `(${store.plan.price} ر.س)` : ''}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>
                    {store.owner?.name || '-'}
                    <div style={{ fontSize: 10, color: C.muted }}>{store.owner?.email || ''}</div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>
                    {store.subdomain && <span style={{ color: C.muted }}>{store.subdomain}.shamstores.com</span>}
                    {store.customDomain && <span style={{ color: C.accent }}>{store.customDomain}</span>}
                    {!store.subdomain && !store.customDomain && '-'}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => toggleStatus(store.id, store.isActive)}
                      style={{
                        padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        background: store.isActive ? `${C.accent}20` : `${C.red}20`,
                        color: store.isActive ? C.accent : C.red,
                      }}
                    >
                      {store.isActive ? '✅ نشط' : '⛔ غير نشط'}
                    </button>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: C.muted }}>
                    {new Date(store.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleViewDetails(store)}
                        title="عرض التفاصيل"
                        style={{
                          padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: `${C.accent}15`, color: C.accent,
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <IoEye size={16} />
                      </button>
                      <button
                        onClick={() => handleGoToDetails(store.id)}
                        title="إدارة المتجر"
                        style={{
                          padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: `${C.blue}15`, color: C.blue,
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <IoStatsChart size={16} />
                      </button>
                      <button
                        onClick={() => deleteStore(store.id, store.name)}
                        title="حذف"
                        style={{
                          padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: `${C.red}15`, color: C.red,
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <IoTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredStores.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted, fontSize: 14 }}>
          {searchTerm || filterStatus !== 'all' ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد متاجر في المنصة'}
        </div>
      )}

      {/* ==================== MODAL: تفاصيل المتجر ==================== */}
      <Modal isOpen={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedStore(null); setStoreStats(null); }} title={`🏪 تفاصيل المتجر: ${selectedStore?.name || ''}`} size="lg">
        {statsLoading ? (
          <Loader />
        ) : storeStats && selectedStore ? (
          <div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: `${C.accent}20`, padding: 12, borderRadius: 50 }}>
                    <IoBusiness size={24} color={C.accent} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedStore.name}</div>
                    <div style={{ color: C.muted, fontSize: 13 }}>{selectedStore.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedStore.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                      <IoCall size={14} /> {selectedStore.phone}
                    </div>
                  )}
                  {selectedStore.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                      <IoGlobe size={14} /> {selectedStore.address}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                    <IoCalendar size={14} /> تاريخ التسجيل: {new Date(selectedStore.createdAt).toLocaleDateString('ar-SA')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                    <IoColorPalette size={14} /> الخطة: {selectedStore.plan?.name || 'free'} ({selectedStore.plan?.price || 0} ر.س/شهر)
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>{storeStats.productsCount || selectedStore.productsCount || 0}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>المنتجات</div>
                  </div>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>{storeStats.ordersCount || selectedStore.ordersCount || 0}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>الطلبات</div>
                  </div>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.yellow }}>{storeStats.totalSales || 0} ر.س</div>
                    <div style={{ fontSize: 11, color: C.muted }}>إجمالي المبيعات</div>
                  </div>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: selectedStore.isActive ? C.accent : C.red }}>
                      {selectedStore.isActive ? 'نشط' : 'غير نشط'}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>الحالة</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Info */}
            {storeStats.owner && (
              <div style={{ marginBottom: 20, padding: 16, background: C.surf, borderRadius: 12 }}>
                <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoPerson size={18} color={C.accent} /> معلومات المالك
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  <div><span style={{ color: C.muted }}>الاسم:</span> {storeStats.owner.name || '-'}</div>
                  <div><span style={{ color: C.muted }}>البريد:</span> {storeStats.owner.email || '-'}</div>
                  <div><span style={{ color: C.muted }}>الهاتف:</span> {storeStats.owner.phone || '-'}</div>
                </div>
              </div>
            )}

            {/* Domain Info */}
            {(selectedStore.subdomain || selectedStore.customDomain) && (
              <div style={{ marginBottom: 20, padding: 16, background: C.surf, borderRadius: 12 }}>
                <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoGlobe size={18} color={C.accent} /> معلومات الدومين
                </h4>
                {selectedStore.subdomain && (
                  <div><span style={{ color: C.muted }}>الدومين الفرعي:</span> {selectedStore.subdomain}.shamstores.com</div>
                )}
                {selectedStore.customDomain && (
                  <div><span style={{ color: C.muted }}>الدومين المخصص:</span> {selectedStore.customDomain}</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 32, color: C.muted }}>لا توجد تفاصيل</div>
        )}
      </Modal>
    </div>
  );
};

export default AdminStores;