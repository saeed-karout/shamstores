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
      console.log('Fetching table with ID:', tableId);
      const data = await api.get(`/tables/${tableId}`);
      console.log('Table data:', data);
      setTable(data);
      
      // إذا كانت الطاولة من مطعم مختلف، نظهر رسالة
      if (data.restaurantId && slug && data.restaurantId !== slug) {
        setError('هذه الطاولة لا تنتمي لهذا المطعم');
      }
    } catch (error) {
      console.error('Error fetching table:', error);
      setError('لم نتمكن من العثور على الطاولة');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div>
      {error ? (
        <div className="bg-red-500 text-white text-center py-3 px-4 sticky top-0 z-10 shadow-md">
          <div className="max-w-7xl mx-auto">
            <span className="font-bold">⚠️ {error}</span>
          </div>
        </div>
      ) : table ? (
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-center py-3 px-4 sticky top-0 z-10 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <span className="font-bold">🔹 أنت على طاولة: {table.name}</span>
          </div>
        </div>
      ) : null}
      <PublicMenu />
    </div>
  );
};

export default PublicTable;