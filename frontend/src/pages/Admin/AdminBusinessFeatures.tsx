// pages/Admin/AdminBusinessFeatures.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import {
  IoArrowBack, IoCheckmark, IoClose, IoAdd,
  IoTime, IoCalendar, IoSettings, IoWarning,
  IoRestaurant, IoStorefront, IoGlobe
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

interface Feature {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  description: string;
  category: string;
  group: string;
  isCore: boolean;
  isActive: boolean;
  price: number;
  isOneTime: boolean;
  isEnabled: boolean;
  isOverridden: boolean;
  expiresAt?: string;
  config?: any;
}

const AdminBusinessFeatures: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [type, id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [businessData, featuresData] = await Promise.all([
        api.get(`/admin/${type}s/${id}`),
        api.get(`/features/business/${type}/${id}`)
      ]);
      setBusiness(businessData);
      setFeatures(featuresData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableFeature = async () => {
    if (!selectedFeature) return;

    try {
      await api.post(`/features/business/${type}/${id}/enable/${selectedFeature.code}`, {
        expiresAt: expiryDate || null
      });
      toast.success(`تم تفعيل ميزة "${selectedFeature.name}" بنجاح`);
      setShowEnableModal(false);
      setSelectedFeature(null);
      setExpiryDate('');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleDisableFeature = async (feature: Feature) => {
    if (!window.confirm(`هل أنت متأكد من تعطيل ميزة "${feature.name}"؟`)) return;

    try {
      await api.delete(`/features/business/${type}/${id}/disable/${feature.code}`);
      toast.success(`تم تعطيل ميزة "${feature.name}" بنجاح`);
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const getFilteredFeatures = () => {
    let filtered = [...features];
    if (filterCategory !== 'all') {
      filtered = filtered.filter(f => f.category === filterCategory);
    }
    return filtered;
  };

  const getStatusBadge = (feature: Feature) => {
    if (feature.isEnabled) {
      return (
        <span style={{
          padding: '2px 10px', background: 'rgba(200,226,53,0.12)', color: C.accent,
          borderRadius: 999, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4
        }}>
          <IoCheckmark size={12} />
          {feature.isOverridden ? 'مفعلة (تجاوز)' : 'مفعلة'}
        </span>
      );
    }
    return (
      <span style={{
        padding: '2px 10px', background: 'rgba(255,107,107,0.12)', color: C.red,
        borderRadius: 999, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4
      }}>
        <IoClose size={12} />
        معطلة
      </span>
    );
  };

  if (loading) return <Loader fullScreen />;

  const filteredFeatures = getFilteredFeatures();
  const enabledCount = features.filter(f => f.isEnabled).length;
  const availableFeatures = features.filter(f => !f.isEnabled && !f.isCore);

  const filterChips = [
    { id: 'all', label: 'الكل' },
    { id: 'restaurant', label: 'مطاعم' },
    { id: 'store', label: 'متاجر' },
    { id: 'both', label: 'مشترك' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: C.surf,
    border: '1px solid ' + C.border,
    borderRadius: 10,
    color: C.text,
    fontFamily: 'Cairo, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate(`/admin/${type}s`)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
        >
          <IoArrowBack size={20} />
          العودة
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: type === 'restaurant' ? 'rgba(96,165,250,0.12)' : 'rgba(200,226,53,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {type === 'restaurant'
              ? <IoRestaurant style={{ color: C.blue, fontSize: 24 }} />
              : <IoStorefront style={{ color: C.accent, fontSize: 24 }} />}
          </div>
          <div>
            <h1 style={{ color: C.text, fontWeight: 700, fontSize: 22, margin: 0 }}>{business?.name}</h1>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
              إدارة الميزات الإضافية لل{type === 'restaurant' ? 'مطعم' : 'متجر'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>إجمالي الميزات</p>
          <p style={{ color: C.purple, fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{features.length}</p>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>ميزات مفعلة</p>
          <p style={{ color: C.accent, fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{enabledCount}</p>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>ميزات متاحة للإضافة</p>
          <p style={{ color: C.blue, fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{availableFeatures.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filterChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => setFilterCategory(chip.id)}
              style={{
                padding: '4px 14px',
                borderRadius: 8,
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Cairo, sans-serif',
                background: filterCategory === chip.id ? C.accent : C.surf,
                color: filterCategory === chip.id ? C.bg : C.muted,
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Features Table */}
      {filteredFeatures.length === 0 ? (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <IoGlobe style={{ color: C.muted, fontSize: 48, marginBottom: 16 }} />
          <h3 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>لا توجد ميزات</h3>
          <p style={{ color: C.muted }}>لا توجد ميزات متاحة</p>
        </div>
      ) : (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الميزة</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الكود</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الفئة</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>المجموعة</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>السعر</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الحالة</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>انتهاء</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeatures.map((feature) => (
                  <tr
                    key={feature.code}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    style={{ borderBottom: '1px solid ' + C.border }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ color: C.text, fontWeight: 600, margin: 0 }}>{feature.name}</p>
                      {feature.description && (
                        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{feature.description}</p>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <code style={{ fontFamily: 'monospace', color: C.accent, background: C.bg, padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>
                        {feature.code}
                      </code>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.text, fontSize: 13 }}>
                      {feature.category === 'restaurant' ? 'مطعم' :
                       feature.category === 'store' ? 'متجر' : 'مشترك'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(feature)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {feature.price > 0 ? (
                        <span style={{ color: C.accent, fontWeight: 700 }}>{feature.price} ر.س</span>
                      ) : (
                        <span style={{ color: C.accent }}>مجانية</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(feature)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {feature.expiresAt ? (
                        <span style={{ color: C.muted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IoTime size={12} />
                          {format(new Date(feature.expiresAt), 'dd/MM/yyyy', { locale: ar })}
                        </span>
                      ) : (
                        <span style={{ color: C.muted, fontSize: 12 }}>دائم</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {feature.isEnabled ? (
                        <button
                          onClick={() => handleDisableFeature(feature)}
                          disabled={feature.isCore}
                          style={{
                            color: feature.isCore ? C.muted : C.red,
                            background: 'none', border: 'none', cursor: feature.isCore ? 'default' : 'pointer',
                            fontSize: 13, fontFamily: 'Cairo, sans-serif'
                          }}
                        >
                          تعطيل
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedFeature(feature);
                            setShowEnableModal(true);
                          }}
                          style={{
                            color: C.accent, background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: 13, fontFamily: 'Cairo, sans-serif'
                          }}
                        >
                          تفعيل
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal تفعيل ميزة */}
      <Modal
        isOpen={showEnableModal}
        onClose={() => {
          setShowEnableModal(false);
          setSelectedFeature(null);
          setExpiryDate('');
        }}
        title={`➕ تفعيل ميزة "${selectedFeature?.name}"`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: 'rgba(200,226,53,0.06)',
            border: '1px solid rgba(200,226,53,0.2)',
            borderRadius: 10, padding: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <IoWarning style={{ color: C.accent, marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ color: C.text, fontSize: 13, margin: 0 }}>
                  الميزة: <span style={{ fontWeight: 700 }}>{selectedFeature?.name}</span>
                </p>
                <p style={{ color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 0 }}>
                  السعر: <span style={{ fontWeight: 700 }}>{selectedFeature?.price} ر.س</span>
                  {selectedFeature?.isOneTime ? ' (دفعة واحدة)' : ' / شهرياً'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              تاريخ الانتهاء (اختياري)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              style={inputStyle}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            <p style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
              اتركه فارغاً للميزة الدائمة
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="primary" onClick={handleEnableFeature} fullWidth>
              تفعيل الميزة
            </Button>
            <Button variant="outline" onClick={() => setShowEnableModal(false)} fullWidth>
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminBusinessFeatures;
