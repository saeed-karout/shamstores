import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import PublicMenu from './PublicMenu';
import Loader from '../components/common/Loader';

interface TableInfo {
  id: string;
  name: string;
  restaurantId: string;
  restaurant?: {
    name: string;
    slug: string;
  };
}

const PublicTable: React.FC = () => {
  const { slug, tableId } = useParams<{ slug: string; tableId: string }>();
  const [table, setTable] = useState<TableInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tableId) {
      fetchTable();
    } else {
      setLoading(false);
    }
  }, [tableId]);

  const fetchTable = async () => {
    try {
      const data = await api.get(`/tables/${tableId}`);
      setTable(data);
      if (data.restaurantId && slug && data.restaurantId !== slug) {
        setError('هذه الطاولة لا تنتمي لهذا المطعم');
      }
    } catch (error) {
      setError('لم نتمكن من العثور على الطاولة');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div>
      {error ? (
        <div style={{ background: '#FF6B6B', color: '#fff', textAlign: 'center', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <span style={{ fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>⚠️ {error}</span>
          </div>
        </div>
      ) : table ? (
        <div style={{ background: 'linear-gradient(90deg, #0D4A3A, #0F5C48)', color: '#C8E235', textAlign: 'center', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>🔹 أنت على طاولة: {table.name}</span>
          </div>
        </div>
      ) : null}
      <PublicMenu />
    </div>
  );
};

export default PublicTable;
