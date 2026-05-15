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
    if (stock === 0) return { label: 'نفد المخزون', color: 'text-red-600', bg: 'bg-red-100', icon: IoAlertCircle };
    if (stock <= threshold) return { label: 'مخزون منخفض', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: IoWarning };
    return { label: 'متوفر', color: 'text-green-600', bg: 'bg-green-100', icon: IoCheckmarkCircle };
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
    <div className="p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IoCube className="text-green-600" />
            إدارة المخزون
          </h1>
          <p className="text-gray-500 text-sm mt-1">تتبع وإدارة مخزون منتجات متجرك</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
        >
          <IoRefresh />
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-gray-500 text-xs mb-1">إجمالي المنتجات</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalProducts}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-gray-500 text-xs mb-1">إجمالي الوحدات</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalStock.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-gray-500 text-xs mb-1">مخزون منخفض</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-gray-500 text-xs mb-1">نفد المخزون</p>
            <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-gray-500 text-xs mb-1">قيمة المخزون</p>
            <p className="text-lg font-bold text-emerald-600">{stats.totalValue.toLocaleString()} ل.س</p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {stats && stats.outOfStock > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <IoAlertCircle className="text-red-500 text-xl flex-shrink-0" />
          <span className="text-red-700 text-sm">
            تحذير: {stats.outOfStock} منتج{stats.outOfStock > 1 ? 'ات' : ''} نفد مخزونها. يرجى إعادة التخزين.
          </span>
        </div>
      )}
      {stats && stats.lowStock > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <IoWarning className="text-yellow-500 text-xl flex-shrink-0" />
          <span className="text-yellow-700 text-sm">
            تنبيه: {stats.lowStock} منتج{stats.lowStock > 1 ? 'ات' : ''} بمخزون منخفض (أقل من {threshold} وحدات).
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <IoSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="بحث في المنتجات..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'low', label: 'مخزون منخفض' },
            { key: 'out', label: 'نفد المخزون' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key as typeof filterMode)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                filterMode === f.key
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <IoCube className="text-5xl mx-auto mb-3 opacity-30" />
            <p>لا توجد منتجات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المنتج</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">السعر</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المخزون</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(product => {
                  const status = getStockStatus(product.stock, threshold);
                  const StatusIcon = status.icon;
                  const isEditing = editState?.productId === product.id;

                  return (
                    <motion.tr
                      key={product.id}
                      layout
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <IoCube className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{product.name}</p>
                            {product.category && (
                              <p className="text-xs text-gray-400">{product.category.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.price.toLocaleString()} ل.س
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editState.type}
                              onChange={e => setEditState(prev => prev ? { ...prev, type: e.target.value as EditState['type'] } : null)}
                              className="border rounded-lg px-2 py-1 text-sm"
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
                              className="w-20 border rounded-lg px-2 py-1 text-sm"
                            />
                          </div>
                        ) : (
                          <span className="font-bold text-gray-800">{product.stock}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                          <StatusIcon />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              disabled={saving}
                              onClick={updateInventory}
                              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-60"
                            >
                              <IoSave />
                            </button>
                            <button
                              onClick={() => setEditState(null)}
                              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                              <IoClose />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditState({ productId: product.id, quantity: product.stock, type: 'set' })}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
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
