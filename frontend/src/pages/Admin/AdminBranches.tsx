import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

interface Branch {
  id: number;
  label?: string;
  linkType?: string;
  linkedTo?: string | null;
  createdAt?: string;
}

const AdminBranches: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const resp: any = await api.get('/admin/branches');
      const data = resp?.data || resp;
      setBranches(data || []);
    } catch (err) {
      console.error('Failed to load branches', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>الفروع</h1>
      <div style={{ background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {branches.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>لا توجد فروع</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: 8 }}>#</th>
                <th style={{ padding: 8 }}>الاسم</th>
                <th style={{ padding: 8 }}>نمط الرابط</th>
                <th style={{ padding: 8 }}>مرتبط ب</th>
                <th style={{ padding: 8 }}>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #fafafa' }}>
                  <td style={{ padding: 8 }}>{b.id}</td>
                  <td style={{ padding: 8 }}>{b.label || '-'}</td>
                  <td style={{ padding: 8 }}>{b.linkType || '-'}</td>
                  <td style={{ padding: 8 }}>{b.linkedTo || '-'}</td>
                  <td style={{ padding: 8 }}>{b.createdAt ? new Date(b.createdAt).toLocaleString('ar-SA') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminBranches;
