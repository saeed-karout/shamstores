import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { IoEye, IoSearch, IoRefresh, IoStorefront, IoRestaurant } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

interface StaffMember {
  id: string; name: string; email: string; phone: string; role: string; isActive: boolean;
  lastLogin: string | null; createdAt: string; storeId?: string; restaurantId?: string;
  store?: { id: string; name: string }; restaurant?: { id: string; name: string };
}

const AdminStaffListPage: React.FC = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'restaurant' | 'store'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/admin/staff');
      const staffData = response?.data || response;
      setStaff(Array.isArray(staffData) ? staffData : (staffData?.staff || []));
    } catch { toast.error('حدث خطأ في جلب الموظفين'); }
    finally { setLoading(false); }
  };

  const getFilteredStaff = () => {
    let filtered = [...staff];
    if (searchTerm) filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()) || (s.phone && s.phone.includes(searchTerm)));
    if (filterType === 'restaurant') filtered = filtered.filter(s => s.restaurantId);
    else if (filterType === 'store') filtered = filtered.filter(s => s.storeId);
    if (filterActive === 'active') filtered = filtered.filter(s => s.isActive);
    else if (filterActive === 'inactive') filtered = filtered.filter(s => !s.isActive);
    return filtered;
  };

  const selectStyle: React.CSSProperties = { padding: '9px 12px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13, outline: 'none' };

  if (loading) return <Loader fullScreen />;
  const filteredStaff = getFilteredStaff();

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>إدارة موظفي المنصة</h1>
        <p style={{ color: C.muted, fontSize: 13 }}>إدارة جميع موظفي المطاعم والمتاجر</p>
      </div>

      {/* Filters */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <IoSearch size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          <input type="text" placeholder="بحث عن موظف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', paddingRight: 36, paddingLeft: 12, paddingTop: 10, paddingBottom: 10, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)} style={selectStyle}>
          <option value="all">جميع الموظفين</option>
          <option value="restaurant">موظفي المطاعم</option>
          <option value="store">موظفي المتاجر</option>
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value as any)} style={selectStyle}>
          <option value="all">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
        <Button variant="secondary" onClick={fetchStaff}><IoRefresh size={16} /></Button>
      </div>

      {filteredStaff.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <IoStorefront size={48} style={{ color: C.border, marginBottom: 12 }} />
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>لا يوجد موظفين</h3>
          <p style={{ color: C.muted, fontSize: 13 }}>لم يتم العثور على موظفين</p>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  {['#', 'الاسم', 'البريد', 'الهاتف', 'النوع', 'التابع لـ', 'الحالة', 'التسجيل', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member, idx) => (
                  <tr key={member.id} style={{ borderBottom: `1px solid ${C.border}` }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>{idx + 1}</td>
                    <td style={{ padding: '12px 16px', color: C.text, fontSize: 13, fontWeight: 600 }}>{member.name}</td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>{member.email}</td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>{member.phone || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {member.storeId ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(200,226,53,0.12)', color: C.accent, padding: '3px 8px', borderRadius: 10, fontSize: 11 }}><IoStorefront size={11} />متجر</span>
                      ) : member.restaurantId ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(96,165,250,0.12)', color: C.blue, padding: '3px 8px', borderRadius: 10, fontSize: 11 }}><IoRestaurant size={11} />مطعم</span>
                      ) : <span style={{ color: C.muted, fontSize: 12 }}>-</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>{member.store?.name || member.restaurant?.name || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: member.isActive ? 'rgba(200,226,53,0.12)' : 'rgba(255,107,107,0.12)', color: member.isActive ? C.accent : C.red, padding: '3px 10px', borderRadius: 10, fontSize: 12 }}>
                        {member.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12 }}>{member.createdAt ? format(new Date(member.createdAt), 'dd/MM/yyyy', { locale: ar }) : '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => navigate(`/admin/staff/${member.id}`)} style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', padding: 4, display: 'flex' }}><IoEye size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffListPage;
