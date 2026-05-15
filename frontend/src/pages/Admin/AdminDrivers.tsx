// pages/Admin/AdminDrivers.tsx

import React, { useEffect, useState } from 'react';
import { IoSearch, IoTrash, IoEye, IoCar } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  prim:   '#0D4A3A',
  surf:   '#0F3D31',
  surfL:  '#164D3E',
  accent: '#C8E235',
  acDk:   '#A8C220',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
  blue:   '#60A5FA',
  yellow: '#F59E0B',
  purple: '#A78BFA',
};

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  restaurant?: { name: string };
  store?: { name: string };
  lastLocationLat?: number;
  lastLocationLng?: number;
  lastLocationUpdate?: string;
  createdAt: string;
}

const AdminDrivers: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/admin/drivers');
      setDrivers(response.drivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('فشل تحميل السائقين');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/drivers/${id}/toggle`);
      toast.success(currentStatus ? 'تم تعطيل السائق' : 'تم تفعيل السائق');
      fetchDrivers();
    } catch (error) {
      toast.error('فشل تغيير حالة السائق');
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>إدارة السائقين</h1>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: C.surf,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              padding: '8px 40px 8px 14px',
              fontSize: 14,
              outline: 'none',
              width: 220,
            }}
          />
          <IoSearch style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>الاسم</th>
                <th style={thStyle}>البريد الإلكتروني</th>
                <th style={thStyle}>رقم الهاتف</th>
                <th style={thStyle}>مرتبط بـ</th>
                <th style={thStyle}>الموقع</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>تاريخ التسجيل</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver, index) => (
                <tr
                  key={driver.id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, color: C.muted, width: 40 }}>{index + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{driver.name}</td>
                  <td style={{ ...tdStyle, color: C.muted }}>{driver.email}</td>
                  <td style={tdStyle}>{driver.phone || '-'}</td>
                  <td style={{ ...tdStyle, color: C.muted, fontSize: 12 }}>
                    {driver.restaurant?.name || driver.store?.name || '-'}
                  </td>
                  <td style={tdStyle}>
                    {driver.lastLocationLat && driver.lastLocationLng ? (
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: `${C.accent}20`, color: C.accent,
                      }}>
                        متصل
                      </span>
                    ) : (
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: `${C.muted}15`, color: C.muted,
                      }}>
                        غير متاح
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => toggleStatus(driver.id, driver.isActive)}
                      style={{
                        padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        background: driver.isActive ? `${C.accent}20` : `${C.red}20`,
                        color: driver.isActive ? C.accent : C.red,
                      }}
                    >
                      {driver.isActive ? 'نشط' : 'غير نشط'}
                    </button>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: C.muted }}>
                    {new Date(driver.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td style={tdStyle}>
                    <button
                      title="عرض التفاصيل"
                      style={{
                        padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: `${C.accent}15`, color: C.accent,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <IoEye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredDrivers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted, fontSize: 14 }}>
          لا يوجد سائقون
        </div>
      )}
    </div>
  );
};

export default AdminDrivers;
