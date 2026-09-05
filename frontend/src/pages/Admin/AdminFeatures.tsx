// pages/Admin/AdminFeatures.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import {
  IoAdd, IoPencil, IoTrash, IoSearch, IoRefresh,
  IoCheckmark, IoClose, IoInformation,
  IoRestaurant, IoStorefront, IoGlobe,
  IoRocket, IoList, IoGitBranch, IoCode,
  IoCloseCircle
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import FeatureRequestsPanel from '@/components/admin/FeatureRequestsPanel';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', orange: '#FB923C',
};

// ✅ تعريف أنواع FeatureGroup و FeatureCategory
type FeatureGroup = 'basic' | 'marketing' | 'advanced' | 'payment' | 'delivery' | 'analytics' | 'integration';
type FeatureCategory = 'restaurant' | 'store' | 'both';

interface Feature {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: FeatureCategory;
  group: FeatureGroup;
  isCore: boolean;
  isActive: boolean;
  price: number;
  isOneTime: boolean;
  defaultInPlans: string[];
  dependsOn: string[];
  configSchema: any;
  createdAt: string;
  updatedAt: string;
}

interface Plan {
  id: string;
  name: string;
  displayName: string;
  displayNameEn?: string;
}

const AdminFeatures: React.FC = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    category: 'both' as FeatureCategory,
    group: 'basic' as FeatureGroup,
    isCore: false,
    isActive: true,
    price: '',
    isOneTime: false,
    defaultInPlans: [] as string[],
    dependsOn: [] as string[],
    configSchema: ''
  });

  useEffect(() => {
    fetchFeatures();
    fetchPlans();
  }, []);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const data = await api.get('/features');
      setFeatures(data || []);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast.error('حدث خطأ في جلب الميزات');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await api.get('/plans');
      setPlans(data || []);
      console.log('Plans loaded:', data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.code || !formData.name) {
        toast.error('الكود والاسم مطلوبان');
        return;
      }

      const data = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        defaultInPlans: formData.defaultInPlans,
        dependsOn: formData.dependsOn,
        configSchema: formData.configSchema ? JSON.parse(formData.configSchema) : null
      };

      if (editingFeature) {
        await api.put(`/features/${editingFeature.code}`, data);
        toast.success('تم تحديث الميزة بنجاح');
      } else {
        await api.post('/features', data);
        toast.success('تم إنشاء الميزة بنجاح');
      }
      setShowModal(false);
      resetForm();
      await fetchFeatures();
    } catch (error: any) {
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('حدث خطأ');
      }
    }
  };

  const handleDelete = async (feature: Feature) => {
    if (feature.isCore) {
      toast.error('لا يمكن حذف ميزة أساسية');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف ميزة "${feature.name}"؟`)) return;

    try {
      await api.delete(`/features/${feature.code}`);
      toast.success('تم حذف الميزة بنجاح');
      await fetchFeatures();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleToggleStatus = async (feature: Feature) => {
    try {
      await api.put(`/features/${feature.code}`, { ...feature, isActive: !feature.isActive });
      toast.success(feature.isActive ? 'تم تعطيل الميزة' : 'تم تفعيل الميزة');
      await fetchFeatures();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      nameEn: '',
      description: '',
      descriptionEn: '',
      category: 'both',
      group: 'basic',
      isCore: false,
      isActive: true,
      price: '',
      isOneTime: false,
      defaultInPlans: [],
      dependsOn: [],
      configSchema: ''
    });
    setEditingFeature(null);
  };

  const handleOpenModal = (feature?: Feature) => {
    if (feature) {
      setEditingFeature(feature);
      setFormData({
        code: feature.code,
        name: feature.name,
        nameEn: feature.nameEn || '',
        description: feature.description || '',
        descriptionEn: feature.descriptionEn || '',
        category: feature.category,
        group: feature.group,
        isCore: feature.isCore,
        isActive: feature.isActive,
        price: feature.price.toString(),
        isOneTime: feature.isOneTime,
        defaultInPlans: feature.defaultInPlans || [],
        dependsOn: feature.dependsOn || [],
        configSchema: feature.configSchema ? JSON.stringify(feature.configSchema, null, 2) : ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleViewDetails = (feature: Feature) => {
    setSelectedFeature(feature);
    setShowDetailsModal(true);
  };

  const handleAddToDefaultPlans = (planId: string) => {
    if (!formData.defaultInPlans.includes(planId)) {
      setFormData({ ...formData, defaultInPlans: [...formData.defaultInPlans, planId] });
    }
  };

  const handleRemoveFromDefaultPlans = (planId: string) => {
    setFormData({ ...formData, defaultInPlans: formData.defaultInPlans.filter(id => id !== planId) });
  };

  const handleAddToDependsOn = (featureCode: string) => {
    if (!formData.dependsOn.includes(featureCode)) {
      setFormData({ ...formData, dependsOn: [...formData.dependsOn, featureCode] });
    }
  };

  const handleRemoveFromDependsOn = (featureCode: string) => {
    setFormData({ ...formData, dependsOn: formData.dependsOn.filter(code => code !== featureCode) });
  };

  const getFilteredFeatures = () => {
    let filtered = [...features];

    if (searchTerm) {
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.nameEn && f.nameEn.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(f => f.category === selectedCategory);
    }

    if (selectedGroup !== 'all') {
      filtered = filtered.filter(f => f.group === selectedGroup);
    }

    return filtered;
  };

  const getCategoryIcon = (category: FeatureCategory) => {
    switch (category) {
      case 'restaurant': return <IoRestaurant style={{ color: C.blue }} />;
      case 'store': return <IoStorefront style={{ color: C.accent }} />;
      default: return <IoGlobe style={{ color: C.purple }} />;
    }
  };

  const getCategoryName = (category: FeatureCategory): string => {
    switch (category) {
      case 'restaurant': return 'مطعم';
      case 'store': return 'متجر';
      default: return 'مشترك';
    }
  };

  const getGroupBadge = (group: FeatureGroup) => {
    const colors: Record<FeatureGroup, { bg: string; color: string }> = {
      basic: { bg: 'rgba(156,163,175,0.12)', color: '#9CA3AF' },
      marketing: { bg: 'rgba(244,114,182,0.12)', color: '#F472B6' },
      advanced: { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA' },
      payment: { bg: 'rgba(200,226,53,0.12)', color: '#C8E235' },
      delivery: { bg: 'rgba(251,146,60,0.12)', color: '#FB923C' },
      analytics: { bg: 'rgba(96,165,250,0.12)', color: '#60A5FA' },
      integration: { bg: 'rgba(99,102,241,0.12)', color: '#6366F1' },
    };

    const names: Record<FeatureGroup, string> = {
      basic: 'أساسية',
      marketing: 'تسويق',
      advanced: 'متقدمة',
      payment: 'دفع',
      delivery: 'توصيل',
      analytics: 'تحليلات',
      integration: 'تكامل'
    };

    const style = colors[group] || { bg: 'rgba(156,163,175,0.12)', color: '#9CA3AF' };

    return (
      <span style={{ padding: '2px 10px', fontSize: 12, borderRadius: 999, background: style.bg, color: style.color }}>
        {names[group] || group}
      </span>
    );
  };

  if (loading) return <Loader fullScreen />;

  const filteredFeatures = getFilteredFeatures();

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: C.surf,
    border: '1px solid ' + C.border,
    borderRadius: 10,
    color: C.text,
    fontFamily: 'Cairo, sans-serif',
    outline: 'none',
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: C.text, fontWeight: 700, fontSize: 22, margin: 0 }}>⚙️ إدارة ميزات المنصة</h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            تعريف الميزات وتسعيرها. الاختيار للتجّار — يشترونها من قسم
            الميزات في لوحاتهم، وتصلك طلباتهم أدناه.
          </p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <IoAdd style={{ display: 'inline', marginLeft: 4 }} />
          إضافة ميزة جديدة
        </Button>
      </div>

      {/* ما يصل الإدارة من اختيار التجّار */}
      <FeatureRequestsPanel />

      {/* Filters */}
      <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <IoSearch style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input
              type="text"
              placeholder="بحث عن ميزة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ ...inputStyle, width: '100%', paddingRight: 36, boxSizing: 'border-box' }}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={inputStyle}
          >
            <option value="all">جميع الفئات</option>
            <option value="restaurant">مطاعم</option>
            <option value="store">متاجر</option>
            <option value="both">مشترك</option>
          </select>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={inputStyle}
          >
            <option value="all">جميع المجموعات</option>
            <option value="basic">أساسية</option>
            <option value="marketing">تسويق</option>
            <option value="advanced">متقدمة</option>
            <option value="payment">دفع</option>
            <option value="delivery">توصيل</option>
            <option value="analytics">تحليلات</option>
            <option value="integration">تكامل</option>
          </select>
          <Button variant="outline" onClick={fetchFeatures}>
            <IoRefresh style={{ display: 'inline' }} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>إجمالي الميزات</p>
          <p style={{ color: C.purple, fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{features.length}</p>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>ميزات نشطة</p>
          <p style={{ color: C.accent, fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{features.filter(f => f.isActive).length}</p>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>ميزات أساسية</p>
          <p style={{ color: C.blue, fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{features.filter(f => f.isCore).length}</p>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>ميزات مدفوعة</p>
          <p style={{ color: C.orange, fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{features.filter(f => f.price > 0).length}</p>
        </div>
      </div>

      {/* Features Table */}
      {filteredFeatures.length === 0 ? (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <IoInformation style={{ color: C.muted, fontSize: 48, marginBottom: 16 }} />
          <h3 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>لا توجد ميزات</h3>
          <p style={{ color: C.muted }}>قم بإضافة ميزة جديدة</p>
        </div>
      ) : (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الكود</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الاسم</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الفئة</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>المجموعة</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>السعر</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الخطط</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الحالة</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeatures.map((feature) => (
                  <tr
                    key={feature.id}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    style={{ borderBottom: '1px solid ' + C.border }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <code style={{ fontFamily: 'monospace', color: C.accent, background: C.bg, padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>
                        {feature.code}
                      </code>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ color: C.text, fontWeight: 600, margin: 0 }}>{feature.name}</p>
                      {feature.nameEn && <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{feature.nameEn}</p>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getCategoryIcon(feature.category)}
                        <span style={{ color: C.text, fontSize: 13 }}>{getCategoryName(feature.category)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{getGroupBadge(feature.group)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {feature.price > 0 ? (
                        <div>
                          <span style={{ color: C.accent, fontWeight: 700 }}>{feature.price} ر.س</span>
                          {feature.isOneTime && <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>لمرة واحدة</p>}
                        </div>
                      ) : (
                        <span style={{ color: C.accent }}>مجانية</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {feature.defaultInPlans && feature.defaultInPlans.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {feature.defaultInPlans.map(planId => (
                            <span key={planId} style={{ background: C.bg, color: C.accent, padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                              {plans.find(p => p.id === planId)?.name || planId.slice(0, 8)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: C.muted, fontSize: 12 }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleToggleStatus(feature)}
                        style={{
                          background: feature.isActive ? 'rgba(200,226,53,0.12)' : 'rgba(255,107,107,0.12)',
                          border: 'none',
                          borderRadius: 6,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: feature.isActive ? C.accent : C.red,
                          fontSize: 12
                        }}
                      >
                        {feature.isActive ? <IoCheckmark size={12} /> : <IoClose size={12} />}
                        {feature.isActive ? 'مفعلة' : 'معطلة'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleViewDetails(feature)} style={{ color: C.purple, background: 'none', border: 'none', cursor: 'pointer' }} title="تفاصيل">
                          <IoList size={18} />
                        </button>
                        <button onClick={() => handleOpenModal(feature)} style={{ color: C.blue, background: 'none', border: 'none', cursor: 'pointer' }} title="تعديل">
                          <IoPencil size={18} />
                        </button>
                        {!feature.isCore && (
                          <button onClick={() => handleDelete(feature)} style={{ color: C.red, background: 'none', border: 'none', cursor: 'pointer' }} title="حذف">
                            <IoTrash size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal تفاصيل الميزة */}
      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title={`📋 تفاصيل الميزة: ${selectedFeature?.name || ''}`} size="lg">
        {selectedFeature && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={{ color: C.muted, fontSize: 12 }}>الكود</label><code style={{ display: 'block', background: C.surf, padding: '8px 12px', borderRadius: 8, color: C.accent }}>{selectedFeature.code}</code></div>
              <div><label style={{ color: C.muted, fontSize: 12 }}>الفئة</label><div style={{ background: C.surf, padding: '8px 12px', borderRadius: 8 }}>{getCategoryName(selectedFeature.category)}</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={{ color: C.muted, fontSize: 12 }}>الاسم (عربي)</label><div style={{ background: C.surf, padding: '8px 12px', borderRadius: 8 }}>{selectedFeature.name}</div></div>
              <div><label style={{ color: C.muted, fontSize: 12 }}>الاسم (إنجليزي)</label><div style={{ background: C.surf, padding: '8px 12px', borderRadius: 8 }}>{selectedFeature.nameEn || '-'}</div></div>
            </div>
            <div><label style={{ color: C.muted, fontSize: 12 }}>الوصف (عربي)</label><div style={{ background: C.surf, padding: '8px 12px', borderRadius: 8, minHeight: 60 }}>{selectedFeature.description || '-'}</div></div>
            <div><label style={{ color: C.muted, fontSize: 12 }}>الوصف (إنجليزي)</label><div style={{ background: C.surf, padding: '8px 12px', borderRadius: 8, minHeight: 60 }}>{selectedFeature.descriptionEn || '-'}</div></div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={{ color: C.muted, fontSize: 12 }}>المجموعة</label><div style={{ background: C.surf, padding: '8px 12px', borderRadius: 8 }}>{getGroupBadge(selectedFeature.group)}</div></div>
              <div><label style={{ color: C.muted, fontSize: 12 }}>السعر</label><div style={{ background: C.surf, padding: '8px 12px', borderRadius: 8, color: C.accent }}>{selectedFeature.price > 0 ? `${selectedFeature.price} ر.س` : 'مجانية'}{selectedFeature.isOneTime && <span style={{ color: C.muted, fontSize: 11, marginRight: 8 }}>(لمرة واحدة)</span>}</div></div>
              <div><label style={{ color: C.muted, fontSize: 12 }}>الحالة</label><div style={{ background: C.surf, padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>{selectedFeature.isActive ? <><IoCheckmark style={{ color: C.accent }} /> مفعلة</> : <><IoClose style={{ color: C.red }} /> معطلة</>}{selectedFeature.isCore && <span style={{ background: C.bg, color: C.blue, padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>أساسية</span>}</div></div>
            </div>

            <div><label style={{ color: C.muted, fontSize: 12 }}><IoRocket size={14} /> الخطط الافتراضية</label><div style={{ background: C.surf, padding: '8px 12px', borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>{selectedFeature.defaultInPlans?.length > 0 ? selectedFeature.defaultInPlans.map(planId => (<span key={planId} style={{ background: C.bg, color: C.accent, padding: '4px 12px', borderRadius: 16, fontSize: 13 }}>{plans.find(p => p.id === planId)?.name || planId}</span>)) : <span style={{ color: C.muted }}>لا توجد خطط افتراضية</span>}</div></div>
            <div><label style={{ color: C.muted, fontSize: 12 }}><IoGitBranch size={14} /> يعتمد على الميزات</label><div style={{ background: C.surf, padding: '8px 12px', borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>{selectedFeature.dependsOn?.length > 0 ? selectedFeature.dependsOn.map(dep => (<span key={dep} style={{ background: C.bg, color: C.orange, padding: '4px 12px', borderRadius: 16, fontSize: 13 }}>{dep}</span>)) : <span style={{ color: C.muted }}>لا يعتمد على ميزات أخرى</span>}</div></div>
            <div><label style={{ color: C.muted, fontSize: 12 }}><IoCode size={14} /> مخطط التهيئة</label><div style={{ background: C.surf, padding: '8px 12px', borderRadius: 8, overflowX: 'auto' }}>{selectedFeature.configSchema ? <pre style={{ color: C.accent, fontSize: 12, margin: 0 }}>{JSON.stringify(selectedFeature.configSchema, null, 2)}</pre> : <span style={{ color: C.muted }}>لا يوجد</span>}</div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.border}` }}><div><label style={{ color: C.muted, fontSize: 11 }}>تاريخ الإنشاء</label><p style={{ margin: 0, fontSize: 12 }}>{new Date(selectedFeature.createdAt).toLocaleString('ar-SA')}</p></div><div><label style={{ color: C.muted, fontSize: 11 }}>آخر تحديث</label><p style={{ margin: 0, fontSize: 12 }}>{new Date(selectedFeature.updatedAt).toLocaleString('ar-SA')}</p></div></div>
          </div>
        )}
      </Modal>

      {/* Modal إضافة/تعديل ميزة */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingFeature ? '✏️ تعديل ميزة' : '➕ إضافة ميزة جديدة'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 500, overflowY: 'auto', padding: 8 }}>
          {/* الكود والاسم */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الكود (Code) *</label>
              <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z_]/g, '_') })} style={{ ...inputStyle, width: '100%', fontFamily: 'monospace' }} placeholder="whatsapp_button" disabled={!!editingFeature} required />
              <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>يستخدم للتحقق في الكود</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الاسم (عربي) *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ ...inputStyle, width: '100%' }} required />
            </div>
          </div>

          {/* الاسم الإنجليزي والفئة */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الاسم (إنجليزي)</label>
              <input type="text" value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الفئة</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as FeatureCategory })} style={{ ...inputStyle, width: '100%' }}>
                <option value="restaurant">مطعم</option>
                <option value="store">متجر</option>
                <option value="both">مشترك</option>
              </select>
            </div>
          </div>

          {/* المجموعة والسعر */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>المجموعة</label>
              <select value={formData.group} onChange={(e) => setFormData({ ...formData, group: e.target.value as FeatureGroup })} style={{ ...inputStyle, width: '100%' }}>
                <option value="basic">أساسية</option>
                <option value="marketing">تسويق</option>
                <option value="advanced">متقدمة</option>
                <option value="payment">دفع</option>
                <option value="delivery">توصيل</option>
                <option value="analytics">تحليلات</option>
                <option value="integration">تكامل</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>السعر (ر.س)</label>
              <input type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} style={{ ...inputStyle, width: '100%' }} placeholder="0.00" />
            </div>
          </div>

          {/* خيارات إضافية */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
              <input type="checkbox" checked={formData.isCore} onChange={(e) => setFormData({ ...formData, isCore: e.target.checked })} style={{ width: 16, height: 16 }} />
              ميزة أساسية (لا يمكن حذفها)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
              <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} style={{ width: 16, height: 16 }} />
              مفعلة
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
              <input type="checkbox" checked={formData.isOneTime} onChange={(e) => setFormData({ ...formData, isOneTime: e.target.checked })} style={{ width: 16, height: 16 }} />
              دفع لمرة واحدة
            </label>
          </div>

          {/* الوصف */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الوصف (عربي)</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ ...inputStyle, width: '100%', resize: 'vertical' }} rows={2} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الوصف (إنجليزي)</label>
            <textarea value={formData.descriptionEn} onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })} style={{ ...inputStyle, width: '100%', resize: 'vertical' }} rows={2} />
          </div>

          {/* الخطط الافتراضية */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>
              <IoRocket size={14} style={{ display: 'inline', marginLeft: 4 }} />
              الخطط الافتراضية
            </label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              {plans.map(plan => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handleAddToDefaultPlans(plan.id)}
                  style={{
                    background: formData.defaultInPlans.includes(plan.id) ? C.accent : C.surf,
                    color: formData.defaultInPlans.includes(plan.id) ? C.bg : C.text,
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  {plan.displayName || plan.name}
                </button>
              ))}
            </div>
            {formData.defaultInPlans.length > 0 && (
              <div style={{ background: C.surf, borderRadius: 8, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0', fontSize: 12, color: C.muted }}>الخطط المختارة:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {formData.defaultInPlans.map(planId => {
                    const plan = plans.find(p => p.id === planId);
                    return (
                      <span key={planId} style={{ background: C.accent, color: C.bg, padding: '4px 12px', borderRadius: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {plan?.displayName || plan?.name || planId}
                        <button onClick={() => handleRemoveFromDefaultPlans(planId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.bg, padding: 0, display: 'flex', alignItems: 'center' }}>
                          <IoCloseCircle size={14} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <p style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>اختر الخطط التي تتضمن هذه الميزة بشكل افتراضي</p>
          </div>

          {/* الميزات المعتمدة */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>
              <IoGitBranch size={14} style={{ display: 'inline', marginLeft: 4 }} />
              يعتمد على الميزات
            </label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              {features.filter(f => f.code !== formData.code).map(feature => (
                <button
                  key={feature.code}
                  type="button"
                  onClick={() => handleAddToDependsOn(feature.code)}
                  style={{
                    background: formData.dependsOn.includes(feature.code) ? C.accent : C.surf,
                    color: formData.dependsOn.includes(feature.code) ? C.bg : C.text,
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  {feature.name} ({feature.code})
                </button>
              ))}
            </div>
            {formData.dependsOn.length > 0 && (
              <div style={{ background: C.surf, borderRadius: 8, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0', fontSize: 12, color: C.muted }}>الميزات المعتمدة:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {formData.dependsOn.map(depCode => {
                    const feature = features.find(f => f.code === depCode);
                    return (
                      <span key={depCode} style={{ background: C.orange, color: C.text, padding: '4px 12px', borderRadius: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {feature?.name || depCode}
                        <button onClick={() => handleRemoveFromDependsOn(depCode)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, padding: 0, display: 'flex', alignItems: 'center' }}>
                          <IoCloseCircle size={14} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <p style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>الميزات التي يجب تفعيلها قبل تفعيل هذه الميزة</p>
          </div>

          {/* مخطط التهيئة */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
              <IoCode size={14} style={{ display: 'inline', marginLeft: 4 }} />
              مخطط التهيئة (Config Schema) - JSON
            </label>
            <textarea
              value={formData.configSchema}
              onChange={(e) => setFormData({ ...formData, configSchema: e.target.value })}
              style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'monospace' }}
              rows={4}
              placeholder={`{\n  "settings": {\n    "enabled": { "type": "boolean", "default": true }\n  }\n}`}
            />
            <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>مخطط JSON لتكوين الميزة (اختياري)</p>
          </div>

          <Button variant="primary" onClick={handleSave} fullWidth>
            {editingFeature ? 'تحديث الميزة' : 'إنشاء الميزة'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminFeatures;