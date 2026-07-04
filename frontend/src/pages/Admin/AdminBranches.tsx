import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoSearch, IoFilter, IoClose, IoCheckmark, IoTrash, 
  IoEye, IoRefresh, IoBusiness, IoMail, IoCall, 
  IoCalendar, IoStatsChart, IoColorPalette, IoGlobe, 
  IoPerson, IoRestaurant, IoStorefront, IoLink, IoTime 
} from 'react-icons/io5';
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

interface Branch {
  id: string;
  planId: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  userId: string | null;
  whatsapp: string | null;
  address: string | null;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  latitude: number | null;
  longitude: number | null;
  showAllBranchesMenuItems: boolean;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  fontFamily: string;
  timezone: string;
  currency: string;
  language: string;
  subdomain: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerifiedAt: string | null;
  customDomainVerificationCode: string | null;
  isActive: boolean;
  deliverySettings: any;
  subscriptionStart: string;
  subscriptionEnd: string;
  createdAt: string;
  updatedAt: string;
  plan?: {
    id: string;
    name: string;
    price: number;
    maxRestaurants: number;
    maxUsers: number;
    maxMenuItems: number;
  };
  owner?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
  } | null;
  _count?: {
    menuItems: number;
    orders: number;
    tables: number;
    users: number;
    categories: number;
  };
}

const AdminBranches: React.FC = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/branches');
      
      let branchesData: Branch[] = [];
      
      if (response?.data?.data && Array.isArray(response.data.data)) {
        branchesData = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        branchesData = response.data;
      } else if (Array.isArray(response)) {
        branchesData = response;
      }
      
      setBranches(branchesData);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('فشل تحميل الفروع');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/branches/${id}/toggle`, { isActive: !currentStatus });
      toast.success(currentStatus ? 'تم تعطيل الفرع' : 'تم تفعيل الفرع');
      fetchBranches();
    } catch (error) {
      toast.error('فشل تغيير حالة الفرع');
    }
  };

  const deleteBranch = async (id: string, name: string) => {
    if (window.confirm(`⚠️ هل أنت متأكد من حذف فرع "${name}"؟\n\nسيتم حذف جميع الأصناف والطلبات والبيانات المرتبطة. هذا الإجراء لا يمكن التراجع عنه.`)) {
      try {
        await api.delete(`/admin/branches/${id}`);
        toast.success('تم حذف الفرع بنجاح');
        fetchBranches();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'فشل حذف الفرع');
      }
    }
  };

  const handleViewDetails = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowDetailsModal(true);
  };

  const handleGoToDetails = (id: string) => {
    navigate(`/admin/restaurants/${id}`);
  };

  const filteredBranches = branches.filter(branch => {
    if (searchTerm && !branch.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !branch.email?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterStatus === 'active' && !branch.isActive) return false;
    if (filterStatus === 'inactive' && branch.isActive) return false;
    return true;
  });

  if (loading) return <Loader fullScreen />;

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

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🏢 إدارة الفروع</h1>
          <p style={{ color: C.muted, fontSize: 13 }}>إدارة جميع فروع المطاعم على المنصة</p>
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
            onClick={fetchBranches}
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
              <IoStorefront size={20} color={C.accent} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{branches.length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>إجمالي الفروع</div>
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: `${C.accent}20`, padding: 8, borderRadius: 10 }}>
              <IoCheckmark size={20} color={C.accent} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{branches.filter(b => b.isActive).length}</div>
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
              <div style={{ fontSize: 24, fontWeight: 700 }}>{branches.filter(b => !b.isActive).length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>غير نشط</div>
            </div>
          </div>
        </div>
      </div>

      {/* Branches Table */}
      {branches.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <IoStorefront size={48} style={{ color: C.border, marginBottom: 12 }} />
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>لا توجد فروع</h3>
          <p style={{ color: C.muted, fontSize: 13 }}>لم يتم العثور على فروع في المنصة</p>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>اسم الفرع</th>
                  <th style={thStyle}>البريد الإلكتروني</th>
                  <th style={thStyle}>رقم الهاتف</th>
                  <th style={thStyle}>الخطة</th>
                  <th style={thStyle}>المالك</th>
                  <th style={thStyle}>الدومين</th>
                  <th style={thStyle}>الإحصائيات</th>
                  <th style={thStyle}>الحالة</th>
                  <th style={thStyle}>تاريخ التسجيل</th>
                  <th style={thStyle}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((branch, index) => (
                  <tr
                    key={branch.id}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, color: C.muted, width: 40 }}>{index + 1}</td>
                    <td
                      style={{ ...tdStyle, color: C.accent, cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => handleGoToDetails(branch.id)}
                    >
                      {branch.logo ? (
                        <img src={branch.logo} alt={branch.name} style={{ width: 24, height: 24, borderRadius: 8, marginLeft: 8, verticalAlign: 'middle' }} />
                      ) : (
                        <IoStorefront style={{ marginLeft: 8, verticalAlign: 'middle' }} />
                      )} 
                      {branch.name}
                    </td>
                    <td style={{ ...tdStyle, color: C.muted }}>{branch.email || '-'}</td>
                    <td style={tdStyle}>{branch.phone || '-'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: `${C.blue}20`, color: C.blue,
                      }}>
                        {branch.plan?.name || 'free'} {branch.plan?.price ? `(${branch.plan.price} ر.س)` : ''}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>
                      {branch.owner?.name || branch.userId || '-'}
                      {branch.owner?.email && <div style={{ fontSize: 10, color: C.muted }}>{branch.owner.email}</div>}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>
                      {branch.subdomain && <span style={{ color: C.muted }}>{branch.subdomain}.shamstores.com</span>}
                      {branch.customDomain && <span style={{ color: C.accent }}>{branch.customDomain}</span>}
                      {!branch.subdomain && !branch.customDomain && '-'}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {branch._count && (
                          <>
                            <span style={{ color: C.accent }}>🍽️ {branch._count.menuItems}</span>
                            <span style={{ color: C.blue }}>📦 {branch._count.orders}</span>
                            <span style={{ color: C.orange }}>👥 {branch._count.users}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleStatus(branch.id, branch.isActive)}
                        style={{
                          padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                          border: 'none', cursor: 'pointer',
                          background: branch.isActive ? `${C.accent}20` : `${C.red}20`,
                          color: branch.isActive ? C.accent : C.red,
                        }}
                      >
                        {branch.isActive ? '✅ نشط' : '⛔ غير نشط'}
                      </button>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: C.muted }}>
                      {new Date(branch.createdAt).toLocaleDateString('ar-SA')}
                      <div style={{ fontSize: 10, color: C.muted }}>
                        <IoTime size={10} style={{ verticalAlign: 'middle' }} /> {new Date(branch.createdAt).toLocaleTimeString('ar-SA')}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleViewDetails(branch)}
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
                          onClick={() => handleGoToDetails(branch.id)}
                          title="إدارة الفرع"
                          style={{
                            padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: `${C.blue}15`, color: C.blue,
                            display: 'flex', alignItems: 'center',
                          }}
                        >
                          <IoStatsChart size={16} />
                        </button>
                        <button
                          onClick={() => deleteBranch(branch.id, branch.name)}
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
      )}

      {/* ==================== MODAL: تفاصيل الفرع ==================== */}
      <Modal 
        isOpen={showDetailsModal} 
        onClose={() => { setShowDetailsModal(false); setSelectedBranch(null); }} 
        title={`🏢 تفاصيل الفرع: ${selectedBranch?.name || ''}`} 
        size="lg"
      >
        {selectedBranch ? (
          <div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: `${C.accent}20`, padding: 12, borderRadius: 50 }}>
                    <IoStorefront size={24} color={C.accent} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedBranch.name}</div>
                    <div style={{ color: C.muted, fontSize: 13 }}>{selectedBranch.email || 'لا يوجد بريد'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedBranch.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                      <IoCall size={14} /> {selectedBranch.phone}
                    </div>
                  )}
                  {selectedBranch.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                      <IoGlobe size={14} /> {selectedBranch.address}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                    <IoCalendar size={14} /> تاريخ التسجيل: {new Date(selectedBranch.createdAt).toLocaleDateString('ar-SA')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                    <IoColorPalette size={14} /> الخطة: {selectedBranch.plan?.name || 'free'} ({selectedBranch.plan?.price || 0} ر.س/شهر)
                  </div>
                  {selectedBranch.subdomain && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                      <IoLink size={14} /> الدومين الفرعي: {selectedBranch.subdomain}.shamstores.com
                    </div>
                  )}
                  {selectedBranch.customDomain && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.accent, fontSize: 13 }}>
                      <IoGlobe size={14} /> الدومين المخصص: {selectedBranch.customDomain}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>{selectedBranch._count?.menuItems || 0}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>الأصناف</div>
                  </div>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>{selectedBranch._count?.orders || 0}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>الطلبات</div>
                  </div>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.blue }}>{selectedBranch._count?.users || 0}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>المستخدمين</div>
                  </div>
                  <div style={{ background: C.surf, padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: selectedBranch.isActive ? C.accent : C.red }}>
                      {selectedBranch.isActive ? 'نشط' : 'غير نشط'}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>الحالة</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Info */}
            {selectedBranch.owner && (
              <div style={{ marginBottom: 20, padding: 16, background: C.surf, borderRadius: 12 }}>
                <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoPerson size={18} color={C.accent} /> معلومات المالك
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  <div><span style={{ color: C.muted }}>الاسم:</span> {selectedBranch.owner.name || '-'}</div>
                  <div><span style={{ color: C.muted }}>البريد:</span> {selectedBranch.owner.email || '-'}</div>
                  <div><span style={{ color: C.muted }}>الهاتف:</span> {selectedBranch.owner.phone || '-'}</div>
                </div>
              </div>
            )}

            {/* Subscription Info */}
            {selectedBranch.subscriptionStart && selectedBranch.subscriptionEnd && (
              <div style={{ padding: 16, background: C.surf, borderRadius: 12 }}>
                <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoCalendar size={18} color={C.accent} /> معلومات الاشتراك
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  <div><span style={{ color: C.muted }}>تاريخ البدء:</span> {new Date(selectedBranch.subscriptionStart).toLocaleDateString('ar-SA')}</div>
                  <div><span style={{ color: C.muted }}>تاريخ الانتهاء:</span> {new Date(selectedBranch.subscriptionEnd).toLocaleDateString('ar-SA')}</div>
                  <div>
                    <span style={{ color: C.muted }}>الحالة:</span>
                    <span style={{ 
                      color: new Date(selectedBranch.subscriptionEnd) > new Date() ? C.accent : C.red,
                      marginLeft: 4
                    }}>
                      {new Date(selectedBranch.subscriptionEnd) > new Date() ? '✅ فعال' : '⛔ منتهي'}
                    </span>
                  </div>
                </div>
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

export default AdminBranches;