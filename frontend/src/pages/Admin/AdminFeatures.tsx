// pages/Admin/AdminFeatures.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import {
  IoAdd, IoPencil, IoTrash, IoSearch, IoRefresh,
  IoCheckmark, IoClose, IoWarning, IoInformation,
  IoRestaurant, IoStorefront, IoGlobe, IoCard,
  IoMegaphone, IoStatsChart, IoCar, IoCloud,
  IoShield, IoMail, IoChatbubble, IoQrCode,
  IoCart, IoCube, IoPricetag, IoRocket
} from 'react-icons/io5';
import toast from 'react-hot-toast';

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
  descriptionEn: string;
  category: 'restaurant' | 'store' | 'both';
  group: 'basic' | 'marketing' | 'advanced' | 'payment' | 'delivery' | 'analytics' | 'integration';
  isCore: boolean;
  isActive: boolean;
  price: number;
  isOneTime: boolean;
  defaultInPlans: string[];
  dependsOn: string[];
}

const AdminFeatures: React.FC = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    category: 'both' as const,
    group: 'basic' as const,
    isCore: false,
    isActive: true,
    price: '',
    isOneTime: false,
    defaultInPlans: [] as string[],
    dependsOn: [] as string[]
  });

  useEffect(() => {
    fetchFeatures();
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
        dependsOn: formData.dependsOn
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
      toast.error(error.response?.data?.error || 'حدث خطأ');
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
      dependsOn: []
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
        dependsOn: feature.dependsOn || []
      });
    }
    setShowModal(true);
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'restaurant': return <IoRestaurant style={{ color: C.blue }} />;
      case 'store': return <IoStorefront style={{ color: C.accent }} />;
      default: return <IoGlobe style={{ color: C.purple }} />;
    }
  };

  const getGroupBadge = (group: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      basic:       { bg: 'rgba(156,163,175,0.12)', color: '#9CA3AF' },
      marketing:   { bg: 'rgba(244,114,182,0.12)', color: '#F472B6' },
      advanced:    { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA' },
      payment:     { bg: 'rgba(200,226,53,0.12)',  color: '#C8E235' },
      delivery:    { bg: 'rgba(251,146,60,0.12)',  color: '#FB923C' },
      analytics:   { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA' },
      integration: { bg: 'rgba(99,102,241,0.12)',  color: '#6366F1' },
    };

    const names: Record<string, string> = {
      basic: 'أساسية', marketing: 'تسويق', advanced: 'متقدمة',
      payment: 'دفع', delivery: 'توصيل', analytics: 'تحليلات', integration: 'تكامل'
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
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>إنشاء وتعديل الميزات المتاحة للمطاعم والمتاجر</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <IoAdd style={{ display: 'inline', marginLeft: 4 }} />
          إضافة ميزة جديدة
        </Button>
      </div>

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
          <p style={{ color: '#FB923C', fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{features.filter(f => f.price > 0).length}</p>
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
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الحالة</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>أساسية</th>
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
                      {feature.nameEn && (
                        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{feature.nameEn}</p>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getCategoryIcon(feature.category)}
                        <span style={{ color: C.text, fontSize: 13 }}>
                          {feature.category === 'restaurant' ? 'مطعم' :
                           feature.category === 'store' ? 'متجر' : 'مشترك'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getGroupBadge(feature.group)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {feature.price > 0 ? (
                        <div>
                          <span style={{ color: C.accent, fontWeight: 700 }}>{feature.price} ر.س</span>
                          {feature.isOneTime && (
                            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>لمرة واحدة</p>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: C.accent }}>مجانية</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {feature.isActive ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.accent }}>
                          <IoCheckmark /> مفعلة
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.red }}>
                          <IoClose /> معطلة
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {feature.isCore ? (
                        <span style={{ padding: '2px 10px', background: 'rgba(96,165,250,0.12)', color: C.blue, borderRadius: 999, fontSize: 12 }}>
                          أساسية
                        </span>
                      ) : (
                        <span style={{ padding: '2px 10px', background: 'rgba(156,163,175,0.12)', color: C.muted, borderRadius: 999, fontSize: 12 }}>
                          إضافية
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleOpenModal(feature)}
                          style={{ color: C.blue, background: 'none', border: 'none', cursor: 'pointer' }}
                          title="تعديل"
                        >
                          <IoPencil size={18} />
                        </button>
                        {!feature.isCore && (
                          <button
                            onClick={() => handleDelete(feature)}
                            style={{ color: C.red, background: 'none', border: 'none', cursor: 'pointer' }}
                            title="حذف"
                          >
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

      {/* Modal إضافة/تعديل ميزة */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingFeature ? '✏️ تعديل ميزة' : '➕ إضافة ميزة جديدة'}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 384, overflowY: 'auto', padding: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الكود (Code) *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z_]/g, '_') })}
                style={{ ...inputStyle, width: '100%', fontFamily: 'monospace', boxSizing: 'border-box' }}
                placeholder="whatsapp_button"
                disabled={!!editingFeature}
                required
              />
              <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>يستخدم للتحقق في الكود</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الاسم (عربي) *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الاسم (إنجليزي)</label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الفئة</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              >
                <option value="restaurant">مطعم</option>
                <option value="store">متجر</option>
                <option value="both">مشترك</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>المجموعة</label>
              <select
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value as any })}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              >
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
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
              <input
                type="checkbox"
                checked={formData.isCore}
                onChange={(e) => setFormData({ ...formData, isCore: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              ميزة أساسية
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              مفعلة
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
              <input
                type="checkbox"
                checked={formData.isOneTime}
                onChange={(e) => setFormData({ ...formData, isOneTime: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              دفع لمرة واحدة
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الوصف (عربي)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ ...inputStyle, width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
              rows={2}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>الوصف (إنجليزي)</label>
            <textarea
              value={formData.descriptionEn}
              onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
              style={{ ...inputStyle, width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
              rows={2}
            />
          </div>

          <Button variant="primary" onClick={handleSave} fullWidth>
            {editingFeature ? 'تحديث' : 'إنشاء'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminFeatures;
