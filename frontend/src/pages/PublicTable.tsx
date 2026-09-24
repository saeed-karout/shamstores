// frontend/src/pages/PublicTable.tsx
//
// `/table/:tableId` على النطاق الرئيسي — رابط طاولةٍ بلا اسم المطعم.
//
// كانت الصفحة تعرض `<PublicMenu />` بلا أيّ بيانات، فيبقى الزائر على
// «جاري التحميل» للأبد، وتطلب `/tables/:id` وهو مسارٌ للمالك يردّ ٤٠١
// على كلّ زبون. الطاولة تعرف مطعمها: نسأل المسار العامّ عنه ثم نحوّل إلى
// `/<slug>/table/<id>` — الرابط الذي يعمل كاملاً مع رقم الطاولة.

import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import api from '../services/api';
import Loader from '../components/common/Loader';

const PublicTable: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const [target, setTarget] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response: any = await api.get(`/public/table/${encodeURIComponent(tableId || '')}`);
        const data = response?.data || response;
        const slug = data?.restaurant?.slug;
        if (!slug) throw new Error('no-slug');
        if (!cancelled) setTarget(`/${encodeURIComponent(slug)}/table/${encodeURIComponent(tableId || '')}`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tableId]);

  if (target) return <Navigate to={target} replace />;

  if (failed) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#082E24',
          color: '#E8F5E9',
          fontFamily: 'Cairo, sans-serif',
          padding: 24,
          textAlign: 'center'
        }}
      >
        <div>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🍽️</div>
          <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>لم نعثر على هذه الطاولة</h1>
          <p style={{ color: '#9DC4AC', fontSize: 14 }}>ربما أُزيلت أو عُطّلت. اطلب من فريق المطعم رمزاً جديداً.</p>
        </div>
      </div>
    );
  }

  return <Loader fullScreen variant="storefront" />;
};

export default PublicTable;
