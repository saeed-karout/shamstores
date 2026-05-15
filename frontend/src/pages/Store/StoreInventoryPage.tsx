// pages/Store/StoreInventoryPage.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  IoCube, IoWarning, IoCheckmarkCircle, IoRefresh,
  IoSearch, IoPencil, IoSave, IoClose, IoTrendingDown,
  IoWallet, IoAlertCircle
} from 'react-icons/io5';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Loader from '../../components/common/Loader';
import { motion } from 'framer-motion';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  isAvailable: boolean;
  category?: { name: string };
}

interface InventoryStats {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  totalStock: number;
  totalValue: number;
  lowStockThreshold: number;
}

interface EditState {
  productId: string;
  quantity: number;
  type: 'set' | 'add' | 'subtract';
}

const StoreInventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'out'>('all');
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, statsRes] = await Promise.allSettled([
        api.get('/store/products'),
        api.get('/store/inventory/stats'),
      ]);

      if (productsRes.status === 'fulfilled') {
        const raw = productsRes.value;
        setProducts(raw?.data || raw?.products || []);
      }

      if (statsRes.status === 'fulfilled') {
        const raw = statsRes.value;
        setStats(raw?.data || null);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateInventory = async () => {
    if (!editState) return;
    setSaving(true);
    try {
      await api.patch(`/store/inventory/${editState.productId}`, {
        quantity: editState.quantity,
        type: editState.type,
      });
      toast.success('تم تحديث المخزون بنجاح');
      setEditState(null);
      await fetchData();
    } catch (error) {
      toast.error('فشل تحديث المخزون');
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (stock: number, threshold: number) => {
    if (stock === 0) return { label: 'نفد المخزون', color: C.red, bg: 'rgba(255,107,107,0.12)', icon: IoAlertCircle };
    if (stock <= threshold) return { label: 'مخزون منخفض', color: '#FBB91F', bg: 'rgba(251,191,36,0.12)', icon: IoWarning };
    return { label: 'متوفر', color: C.accent, bg: 'rgba(200,226,53,0.12)', icon: IoCheckmarkCircle };
  };

  const threshold = stats?.lowStockThreshold || 10;

  const filtered = products.filter(p => {
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter =
      filterMode === 'all' ||
      (filterMode === 'low' && p.stock > 0 && p.stock <= threshold) ||
      (filterMode === 'out' && p.stock === 0);
    return matchSearch && matchFilter;
  });

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IoCube style={{ color: C.accent, display: 'inline' }} />
            إدارة المخزون
          </h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>تتبع وإدارة مخزون منتجات متجرك</p>
        </div>
        <button
          onClick={fetchData}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: C.accent, color: C.bg, border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
        >
          <IoRefresh />
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>إجمالي المنتجات</p>
            <p style={{ color: C.blue, fontSize: 24, fontWeight: 700 }}>{stats.totalProducts}</p>
          </div>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>إجمالي الوحدات</p>
            <p style={{ color: C.accent, fontSize: 24, fontWeight: 700 }}>{stats.totalStock.toLocaleString()}</p>
          </div>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>مخزون منخفض</p>
            <p style={{ color: '#FBB91F', fontSize: 24, fontWeight: 700 }}>{stats.lowStock}</p>
          </div>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>نفد المخزون</p>
            <p style={{ color: C.red, fontSize: 24, fontWeight: 700 }}>{stats.outOfStock}</p>
          </div>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>قيمة المخزون</p>
            <p style={{ color: C.accent, fontSize: 17, fontWeight: 700 }}>{stats.totalValue.toLocaleString()} ل.س</p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {stats && stats.outOfStock > 0 && (
        <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 16, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <IoAlertCircle style={{ color: C.red, fontSize: 20, flexShrink: 0 }} />
          <span style={{ color: C.red, fontSize: 13 }}>
            تحذير: {stats.outOfStock} منتج{stats.outOfStock > 1 ? 'ات' : ''} نفد مخزونها. يرجى إعادة التخزين.
          </span>
        </div>
      )}
      {stats && stats.lowStock > 0 && (
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 16, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <IoWarning style={{ color: '#FBB91F', fontSize: 20, flexShrink: 0 }} />
          <span style={{ color: '#FBB91F', fontSize: 13 }}>
            تنبيه: {stats.lowStock} منتج{stats.lowStock > 1 ? 'ات' : ''} بمخزون منخفض (أقل من {threshold} وحدات).
          </span>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16, marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <IoSearch style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input
            type="text"
            placeholder="بحث في المنتجات..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingRight: 36, paddingLeft: 16, paddingTop: 8, paddingBottom: 8, background: C.surf, border: '1px solid ' + C.border, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'all', label: 'الكل' },
            { key: 'low', label: 'مخزون منخفض' },
            { key: 'out', label: 'نفد المخزون' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key as typeof filterMode)}
              style={{
                padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'Cairo, sans-serif', transition: 'all 0.2s',
                ...(filterMode === f.key
                  ? { background: C.accent, color: C.bg }
                  : { background: C.surf, color: C.muted })
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
            <IoCube style={{ fontSize: 48, display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
            <p>لا توجد منتجات</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: C.surf }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>المنتج</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>السعر</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>المخزون</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>الحالة</th>
                  <th style={{ padding: '12px 16px', color: C.muted, fontSize: 12, textAlign: 'right' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => {
                  const status = getStockStatus(product.stock, threshold);
                  const StatusIcon = status.icon;
                  const isEditing = editState?.productId === product.id;

                  return (
                    <motion.tr
                      key={product.id}
                      layout
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      style={{ borderBottom: '1px solid ' + C.border }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: C.surf, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IoCube style={{ color: C.muted }} />
                            </div>
                          )}
                          <div>
                            <p style={{ color: C.text, fontWeight: 500 }}>{product.name}</p>
                            {product.category && (
                              <p style={{ color: C.muted, fontSize: 12 }}>{product.category.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>
                        {product.price.toLocaleString()} ل.س
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <select
                              value={editState.type}
                              onChange={e => setEditState(prev => prev ? { ...prev, type: e.target.value as EditState['type'] } : null)}
                              style={{ background: C.surf, border: '1px solid ' + C.border, borderRadius: 8, padding: '4px 8px', fontSize: 13, color: C.text, fontFamily: 'Cairo, sans-serif' }}
                            >
                              <option value="set">تعيين</option>
                              <option value="add">إضافة</option>
                              <option value="subtract">خصم</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              value={editState.quantity}
                              onChange={e => setEditState(prev => prev ? { ...prev, quantity: Number(e.target.value) } : null)}
                              style={{ width: 80, background: C.surf, border: '1px solid ' + C.border, borderRadius: 8, padding: '4px 8px', fontSize: 13, color: C.text, fontFamily: 'Cairo, sans-serif' }}
                            />
                          </div>
                        ) : (
                          <span style={{ color: C.text, fontWeight: 700 }}>{product.stock}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: status.bg, color: status.color }}>
                          <StatusIcon />
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              disabled={saving}
                              onClick={updateInventory}
                              style={{ padding: 8, background: C.accent, color: C.bg, border: 'none', borderRadius: 8, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                            >
                              <IoSave />
                            </button>
                            <button
                              onClick={() => setEditState(null)}
                              style={{ padding: 8, background: C.surf, color: C.muted, border: '1px solid ' + C.border, borderRadius: 8, cursor: 'pointer' }}
                            >
                              <IoClose />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditState({ productId: product.id, quantity: product.stock, type: 'set' })}
                            style={{ padding: 8, background: 'rgba(96,165,250,0.1)', color: C.blue, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                          >
                            <IoPencil />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreInventoryPage;
