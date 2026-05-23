// pages/Store/StoreProductsPage.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoAdd, IoPencil, IoTrash, IoEye, IoEyeOff, IoClose, IoCube, IoWarning, IoImage, IoCloudUpload } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getImageUrl } from '@/utils/imageHelpers';

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

interface Product {
  id: string;
  storeId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  stock: number;
  sku?: string;
  categoryId?: string;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  storeId: string;
  name: string;
  nameEn?: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
}

// دالة مساعدة لاستخراج البيانات من الاستجابة
const extractData = (response: any) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (response.data && Array.isArray(response.data)) return response.data;
  if (response.data && response.data.data && Array.isArray(response.data.data)) return response.data.data;
  return [];
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: C.surf,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 4,
  color: C.muted,
};

const StoreProductsPage: React.FC = () => {
  const { store, loading: storeLoading } = useStore();
  const permissions = usePermissions();
  const { isSuperAdmin, isStoreOwner, isStaff } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    image: '',
  });

  const [productForm, setProductForm] = useState({
    categoryId: '',
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    price: '',
    discountedPrice: '',
    imageUrl: '',
    stock: '',
    sku: '',
    isAvailable: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesResponse, productsResponse] = await Promise.all([
        api.get('/store/categories'),
        api.get('/store/products')
      ]);

      console.log('Categories response:', categoriesResponse);
      console.log('Products response:', productsResponse);

      // استخراج الفئات
      const categoriesData = extractData(categoriesResponse);
      setCategories(categoriesData);

      // استخراج المنتجات
      let productsData = extractData(productsResponse);
      
      // معالجة المنتجات
      const processedProducts = productsData.map((product: any) => ({
        ...product,
        price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
        discountedPrice: product.discountedPrice ? (typeof product.discountedPrice === 'string' ? parseFloat(product.discountedPrice) : product.discountedPrice) : null,
        stock: typeof product.stock === 'string' ? parseInt(product.stock) : product.stock,
      }));

      setProducts(processedProducts);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error?.response?.data?.error || 'حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', nameEn: '', description: '', descriptionEn: '', image: '' });
    setSelectedCategory(null);
  };

  const resetProductForm = () => {
    setProductForm({ categoryId: '', name: '', nameEn: '', description: '', descriptionEn: '', price: '', discountedPrice: '', imageUrl: '', stock: '', sku: '', isAvailable: true });
    setSelectedProduct(null);
  };

  const handleOpenCategoryModal = (category?: Category) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لإدارة الفئات'); return; }
    if (category) {
      setSelectedCategory(category);
      setCategoryForm({ name: category.name, nameEn: category.nameEn || '', description: category.description || '', descriptionEn: category.descriptionEn || '', image: category.image || '' });
    } else { resetCategoryForm(); }
    setShowCategoryModal(true);
  };

  const handleOpenProductModal = (product?: Product) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لإدارة المنتجات'); return; }
    if (product) {
      setSelectedProduct(product);
      setProductForm({
        categoryId: product.categoryId || '',
        name: product.name,
        nameEn: product.nameEn || '',
        description: product.description || '',
        descriptionEn: product.descriptionEn || '',
        price: product.price.toString(),
        discountedPrice: product.discountedPrice?.toString() || '',
        imageUrl: product.imageUrl || '',
        stock: product.stock.toString(),
        sku: product.sku || '',
        isAvailable: product.isAvailable,
      });
    } else { resetProductForm(); }
    setShowProductModal(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (!categoryForm.name) { toast.error('اسم الفئة مطلوب'); return; }
      if (selectedCategory) {
        await api.put(`/store/categories/${selectedCategory.id}`, categoryForm);
        toast.success('تم تحديث الفئة بنجاح');
      } else {
        await api.post('/store/categories', categoryForm);
        toast.success('تم إنشاء الفئة بنجاح');
      }
      setShowCategoryModal(false);
      resetCategoryForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleSaveProduct = async () => {
    try {
      if (!productForm.name) { toast.error('اسم المنتج مطلوب'); return; }
      if (!productForm.price || parseFloat(productForm.price) <= 0) { toast.error('السعر مطلوب ويجب أن يكون أكبر من 0'); return; }
      const price = parseFloat(productForm.price);
      if (isNaN(price) || price <= 0) { toast.error('السعر يجب أن يكون رقماً صحيحاً أكبر من 0'); return; }
      const data = { ...productForm, price, discountedPrice: productForm.discountedPrice ? parseFloat(productForm.discountedPrice) : null, stock: parseInt(productForm.stock) || 0 };
      if (selectedProduct) {
        await api.put(`/store/products/${selectedProduct.id}`, data);
        toast.success('تم تحديث المنتج بنجاح');
      } else {
        await api.post('/store/products', data);
        toast.success('تم إضافة المنتج بنجاح');
      }
      setShowProductModal(false);
      resetProductForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لحذف الفئات'); return; }
    const productsInCategory = products.filter(p => p.categoryId === id);
    if (productsInCategory.length > 0) { toast.error(`لا يمكن حذف الفئة لأنها تحتوي على ${productsInCategory.length} منتج`); return; }
    if (window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
      try {
        await api.delete(`/store/categories/${id}`);
        toast.success('تم حذف الفئة بنجاح');
        fetchData();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'حدث خطأ');
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لحذف المنتجات'); return; }
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      setDeleting(id);
      try {
        await api.delete(`/store/products/${id}`);
        toast.success('تم حذف المنتج بنجاح');
        fetchData();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'حدث خطأ');
      } finally {
        setDeleting(null);
      }
    }
  };

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/store/products/${id}`, { isAvailable: !currentStatus });
      toast.success(currentStatus ? 'تم إخفاء المنتج' : 'تم إظهار المنتج');
      fetchData();
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'category' | 'product') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { toast.error('يسمح فقط بصور JPG, PNG, GIF, WEBP'); e.target.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('حجم الصورة يجب أن يكون أقل من 10 ميجابايت'); e.target.value = ''; return; }
    setUploading(true);
    try {
      const response = await api.upload<{ imageUrl: string }>('/upload', file, type === 'category' ? 'categories' : 'products');
      if (type === 'category') setCategoryForm({ ...categoryForm, image: response.imageUrl });
      else setProductForm({ ...productForm, imageUrl: response.imageUrl });
      toast.success('تم رفع الصورة بنجاح');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل رفع الصورة');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (type: 'category' | 'product') => {
    if (type === 'category') setCategoryForm({ ...categoryForm, image: '' });
    else setProductForm({ ...productForm, imageUrl: '' });
    toast.success('تم إزالة الصورة');
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { text: 'نفد من المخزون', bg: `rgba(255,107,107,0.15)`, color: C.red };
    if (stock <= 5) return { text: 'مخزون منخفض', bg: `rgba(245,158,11,0.15)`, color: C.yellow };
    if (stock <= 20) return { text: 'مخزون متوسط', bg: `rgba(96,165,250,0.15)`, color: C.blue };
    return { text: 'مخزون جيد', bg: `rgba(200,226,53,0.15)`, color: C.accent };
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'بدون فئة';
  };

  if (loading || storeLoading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24 }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>إدارة منتجات المتجر</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>إدارة الفئات والمنتجات في متجرك</p>
        </div>
        {(isSuperAdmin || isStoreOwner) && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleOpenCategoryModal()}
              style={{ background: C.surf, border: `1px solid ${C.border}`, color: C.accent, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <IoAdd size={18} /> إضافة فئة
            </button>
            <button
              onClick={() => handleOpenProductModal()}
              style={{ background: C.accent, color: C.bg, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, border: 'none' }}
            >
              <IoAdd size={18} /> إضافة منتج
            </button>
          </div>
        )}
      </div>

      {/* إحصائيات سريعة */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'إجمالي الفئات', value: categories.length, color: C.blue },
          { label: 'إجمالي المنتجات', value: products.length, color: C.accent },
          { label: 'غير متوفرة', value: products.filter(p => !p.isAvailable).length, color: C.yellow },
          { label: 'نفد من المخزون', value: products.filter(p => p.stock === 0).length, color: C.red },
        ].map((stat, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{stat.label}</p>
            <p style={{ color: stat.color, fontSize: 28, fontWeight: 700, margin: '4px 0 0' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* الفئات */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 22, background: C.accent, borderRadius: 4, display: 'inline-block' }}></span>
            الفئات
          </h2>
          <span style={{ color: C.muted, fontSize: 13 }}>{categories.length} فئة</span>
        </div>

        {categories.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <IoCube style={{ color: C.muted, fontSize: 48, marginBottom: 12 }} />
            <p style={{ color: C.muted, margin: 0 }}>لا توجد فئات. أضف فئة جديدة!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 600, color: C.text, margin: 0, fontSize: 14 }}>{cat.name}</h3>
                    {cat.nameEn && <p style={{ color: C.muted, fontSize: 11, margin: '2px 0 0' }}>{cat.nameEn}</p>}
                  </div>
                  {(isSuperAdmin || isStoreOwner) && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => handleOpenCategoryModal(cat)} style={{ padding: 6, background: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', borderRadius: 8 }}>
                        <IoPencil size={15} />
                      </button>
                      <button onClick={() => handleDeleteCategory(cat.id)} style={{ padding: 6, background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', borderRadius: 8 }}>
                        <IoTrash size={15} />
                      </button>
                    </div>
                  )}
                </div>
                {cat.image && (
                  <img src={getImageUrl(cat.image)} alt={cat.name} style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 10, marginTop: 10 }} />
                )}
                {cat.description && <p style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>{cat.description}</p>}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: C.muted, fontSize: 12 }}>{products.filter(p => p.categoryId === cat.id).length} منتج</span>
                  <span style={{ color: C.accent, fontSize: 12 }}>نشط</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* المنتجات */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 22, background: C.accent, borderRadius: 4, display: 'inline-block' }}></span>
            المنتجات
          </h2>
          <span style={{ color: C.muted, fontSize: 13 }}>{products.length} منتج</span>
        </div>

        {products.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <IoCube style={{ color: C.muted, fontSize: 48, marginBottom: 12 }} />
            <p style={{ color: C.muted, margin: 0 }}>لا توجد منتجات. أضف منتجاً جديداً!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {products.map((product) => {
              const stockStatus = getStockStatus(product.stock);
              const hasDiscount = product.discountedPrice && product.discountedPrice > 0;
              const finalPrice = hasDiscount ? product.discountedPrice : product.price;
              const discountPercent = hasDiscount ? Math.round(((product.price - product.discountedPrice!) / product.price) * 100) : 0;
              
              return (
                <div key={product.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                >
                  {/* صورة المنتج */}
                  <div style={{ position: 'relative', height: 140, background: C.surf, overflow: 'hidden' }}>
                    {product.imageUrl ? (
                      <img src={getImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <IoImage style={{ color: C.muted, fontSize: 36 }} />
                        <span style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>لا توجد صورة</span>
                      </div>
                    )}
                    <button
                      onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                      style={{ position: 'absolute', top: 8, right: 8, padding: 6, borderRadius: '50%', border: 'none', cursor: 'pointer', background: product.isAvailable ? C.accent : C.muted, color: C.bg }}
                    >
                      {product.isAvailable ? <IoEye size={13} /> : <IoEyeOff size={13} />}
                    </button>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 4 }}>
                      {hasDiscount && <span style={{ background: C.red, color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>-{discountPercent}%</span>}
                      {product.stock === 0 && <span style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>نفد</span>}
                    </div>
                    {(isSuperAdmin || isStoreOwner) && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                      >
                        <button onClick={() => handleOpenProductModal(product)} style={{ padding: 8, background: '#fff', borderRadius: '50%', border: 'none', color: C.prim, cursor: 'pointer' }}>
                          <IoPencil size={15} />
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id)} disabled={deleting === product.id} style={{ padding: 8, background: '#fff', borderRadius: '50%', border: 'none', color: C.red, cursor: 'pointer' }}>
                          {deleting === product.id ? <div style={{ width: 15, height: 15, border: `2px solid ${C.red}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <IoTrash size={15} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* معلومات المنتج */}
                  <div style={{ padding: 12 }}>
                    <h3 style={{ fontWeight: 600, color: C.text, margin: 0, fontSize: 13 }}>{product.name}</h3>
                    {product.nameEn && <p style={{ color: C.muted, fontSize: 11, margin: '2px 0 0' }}>{product.nameEn}</p>}
                    <div style={{ marginTop: 6 }}>
                      <span style={{ background: C.surf, color: C.muted, fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>
                        {getCategoryName(product.categoryId || '')}
                      </span>
                    </div>
                    <p style={{ color: C.muted, fontSize: 12, marginTop: 8, minHeight: 32 }}>{product.description || 'لا يوجد وصف'}</p>
                    <div style={{ marginTop: 8 }}>
                      {hasDiscount ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ color: C.accent, fontSize: 16, fontWeight: 700 }}>{finalPrice.toFixed(2)} ر.س</span>
                          <span style={{ color: C.muted, fontSize: 11, textDecoration: 'line-through' }}>{product.price.toFixed(2)} ر.س</span>
                          <span style={{ background: `rgba(200,226,53,0.15)`, color: C.accent, fontSize: 11, padding: '1px 6px', borderRadius: 10 }}>
                            -{discountPercent}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: C.accent, fontSize: 16, fontWeight: 700 }}>{product.price.toFixed(2)} ر.س</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                      <span style={{ background: stockStatus.bg, color: stockStatus.color, fontSize: 11, padding: '3px 8px', borderRadius: 12 }}>{stockStatus.text}</span>
                      {product.sku && <span style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace' }}>{product.sku.length > 8 ? product.sku.substring(0, 8) + '…' : product.sku}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* مودال الفئة */}
      <Modal isOpen={showCategoryModal} onClose={() => { setShowCategoryModal(false); resetCategoryForm(); }} title={selectedCategory ? 'تعديل فئة' : 'إضافة فئة جديدة'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>اسم الفئة (عربي) <span style={{ color: C.red }}>*</span></label>
            <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} style={inputStyle} placeholder="مثال: إلكترونيات" />
          </div>
          <div>
            <label style={labelStyle}>اسم الفئة (إنجليزي)</label>
            <input type="text" value={categoryForm.nameEn} onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })} style={inputStyle} placeholder="Example: Electronics" />
          </div>
          <div>
            <label style={labelStyle}>الوصف</label>
            <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="وصف الفئة..." />
          </div>
          <div>
            <label style={labelStyle}>الصورة</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', border: `2px dashed ${C.border}`, borderRadius: 10, color: C.muted }}>
                  <IoCloudUpload />
                  <span style={{ fontSize: 13 }}>اختر صورة</span>
                </div>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'category')} style={{ display: 'none' }} disabled={uploading} />
              </label>
              {categoryForm.image && (
                <button onClick={() => removeImage('category')} style={{ padding: 8, background: 'transparent', border: 'none', color: C.red, cursor: 'pointer' }}>
                  <IoTrash size={18} />
                </button>
              )}
            </div>
            {uploading && <p style={{ color: C.accent, fontSize: 13, marginTop: 4 }}>جاري رفع الصورة...</p>}
            {categoryForm.image && <img src={getImageUrl(categoryForm.image)} alt="معاينة" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, marginTop: 8, border: `1px solid ${C.border}` }} />}
          </div>
          <button onClick={handleSaveCategory} disabled={uploading} style={{ background: C.accent, color: C.bg, padding: '10px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: 14 }}>
            {uploading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </Modal>

      {/* مودال المنتج */}
      <Modal isOpen={showProductModal} onClose={() => { setShowProductModal(false); resetProductForm(); }} title={selectedProduct ? 'تعديل منتج' : 'إضافة منتج جديد'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto', padding: 4 }}>
          <div>
            <label style={labelStyle}>الفئة</label>
            <select value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })} style={{ ...inputStyle }}>
              <option value="">بدون فئة</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>اسم المنتج (عربي) <span style={{ color: C.red }}>*</span></label>
              <input type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} style={inputStyle} placeholder="اسم المنتج" />
            </div>
            <div>
              <label style={labelStyle}>اسم المنتج (إنجليزي)</label>
              <input type="text" value={productForm.nameEn} onChange={(e) => setProductForm({ ...productForm, nameEn: e.target.value })} style={inputStyle} placeholder="Product name" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>السعر (ر.س) <span style={{ color: C.red }}>*</span></label>
              <input type="number" step="0.01" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} style={inputStyle} placeholder="0.00" />
            </div>
            <div>
              <label style={labelStyle}>السعر بعد الخصم (ر.س)</label>
              <input type="number" step="0.01" min="0" value={productForm.discountedPrice} onChange={(e) => setProductForm({ ...productForm, discountedPrice: e.target.value })} style={inputStyle} placeholder="0.00" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>المخزون</label>
              <input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} style={inputStyle} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>SKU (رمز المنتج)</label>
              <input type="text" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} style={inputStyle} placeholder="PRD-001" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>الوصف (عربي)</label>
            <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="وصف المنتج..." />
          </div>
          <div>
            <label style={labelStyle}>الوصف (إنجليزي)</label>
            <textarea value={productForm.descriptionEn} onChange={(e) => setProductForm({ ...productForm, descriptionEn: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="Product description..." />
          </div>
          <div>
            <label style={labelStyle}>صورة المنتج</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', border: `2px dashed ${C.border}`, borderRadius: 10, color: C.muted }}>
                  <IoCloudUpload />
                  <span style={{ fontSize: 13 }}>اختر صورة</span>
                </div>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'product')} style={{ display: 'none' }} disabled={uploading} />
              </label>
              {productForm.imageUrl && (
                <button onClick={() => removeImage('product')} style={{ padding: 8, background: 'transparent', border: 'none', color: C.red, cursor: 'pointer' }}>
                  <IoTrash size={18} />
                </button>
              )}
            </div>
            {uploading && <p style={{ color: C.accent, fontSize: 13, marginTop: 4 }}>جاري رفع الصورة...</p>}
            {productForm.imageUrl && <img src={getImageUrl(productForm.imageUrl)} alt="معاينة" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, marginTop: 8, border: `1px solid ${C.border}` }} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={productForm.isAvailable} onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.checked })} style={{ width: 16, height: 16, accentColor: C.accent }} />
            <span style={{ color: C.text, fontSize: 14, fontWeight: 500 }}>المنتج متاح للبيع</span>
          </div>
          <button onClick={handleSaveProduct} disabled={uploading} style={{ background: C.accent, color: C.bg, padding: '10px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: 14 }}>
            {uploading ? 'جاري الحفظ...' : 'حفظ المنتج'}
          </button>
        </div>
      </Modal>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StoreProductsPage;