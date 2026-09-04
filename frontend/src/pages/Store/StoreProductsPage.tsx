// pages/Store/StoreProductsPage.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoAdd, IoPencil, IoTrash, IoEye, IoEyeOff, IoClose, IoCube, IoWarning, IoImage, IoCloudUpload } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getImageUrl } from '@/utils/imageHelpers';
import MultiImageUploader from '@/components/settings/MultiImageUploader';

// ✅ الألوان الثابتة فقط للعناصر التي لا تتغير (الأحمر، الأزرق، إلخ)
const staticColors = {
  red: '#FF6B6B',
  blue: '#60A5FA',
  yellow: '#F59E0B',
  purple: '#A78BFA',
};

interface Product {
  id: string;
  storeId: string;
  branchName?: string;
  branchLabel?: string;
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
  branchName?: string;
  branchLabel?: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
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

const StoreProductsPage: React.FC = () => {
  const { store, loading: storeLoading } = useStore();
  const permissions = usePermissions();
  const { isSuperAdmin, isStoreOwner, isStaff } = useAuth();
  const theme = useTheme();

  // ✅ استخدام ألوان المتجر الديناميكية
  const dynamicColors = {
    bg: theme.backgroundColor || '#082E24',
    card: theme.cardBgColor || '#112E23',
    prim: '#0D4A3A',
    surf: theme.surfaceColor || '#0F3D31',
    surfL: '#164D3E',
    accent: theme.primaryColor || '#C8E235',
    acDk: '#A8C220',
    text: theme.textColor || '#E8F5E9',
    muted: theme.mutedColor || '#9DC4AC',
    border: `rgba(200,226,53,0.15)`,
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    storeId: '',
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    image: '',
  });

  const [productForm, setProductForm] = useState({
    storeId: '',
    categoryId: '',
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    price: '',
    originalPrice: '',
    isPopular: false,
    images: [] as string[],
    imageUrl: '',
    stock: '',
    sku: '',
    isAvailable: true,
  });

  useEffect(() => {
    if (store?.id && !selectedBranchId) {
      setSelectedBranchId(store.id);
    }
  }, [store, selectedBranchId]);

  useEffect(() => {
    if (store) {
      fetchData();
    }
  }, [store, selectedBranchId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const branchOptions = store
        ? [
            {
              id: store.id,
              name: store.name,
              label: store.branchLabel || store.subdomain || store.slug || store.name,
            },
            ...(store.linkedBranches || []).map((branch) => ({
              id: branch.id,
              name: branch.name,
              label: branch.linkLabel || branch.name,
            })),
          ]
        : [];

      const branchesToLoad = selectedBranchId === 'all'
        ? branchOptions
        : branchOptions.filter((branch) => branch.id === selectedBranchId);

      const branchResults = await Promise.all(branchesToLoad.map(async (branch) => {
        const [categoriesResponse, productsResponse] = await Promise.all([
          api.get(`/store/categories?storeId=${branch.id}`),
          api.get(`/store/products?storeId=${branch.id}`)
        ]);

        const categoriesData = extractData(categoriesResponse).map((category: any) => ({
          ...category,
          branchName: branch.name,
          branchLabel: branch.label,
        }));

        const productsData = extractData(productsResponse).map((product: any) => ({
          ...product,
          branchName: branch.name,
          branchLabel: branch.label,
          price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
          discountedPrice: product.discountedPrice ? (typeof product.discountedPrice === 'string' ? parseFloat(product.discountedPrice) : product.discountedPrice) : null,
          stock: typeof product.stock === 'string' ? parseInt(product.stock) : product.stock,
        }));

        return { branch, categoriesData, productsData };
      }));

      const combinedCategories = branchResults.flatMap((result) => result.categoriesData);
      const combinedProducts = branchResults.flatMap((result) => result.productsData);

      setCategories(combinedCategories);
      setProducts(combinedProducts);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error?.response?.data?.error || 'حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({ storeId: selectedBranchId === 'all' ? (store?.id || '') : selectedBranchId, name: '', nameEn: '', description: '', descriptionEn: '', image: '' });
    setSelectedCategory(null);
  };

  const resetProductForm = () => {
    setProductForm({ storeId: selectedBranchId === 'all' ? (store?.id || '') : selectedBranchId, categoryId: '', name: '', nameEn: '', description: '', descriptionEn: '', price: '', originalPrice: '', isPopular: false, images: [], imageUrl: '', stock: '', sku: '', isAvailable: true });
    setSelectedProduct(null);
  };

  const handleOpenCategoryModal = (category?: Category) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لإدارة الفئات'); return; }
    if (selectedBranchId === 'all') { toast.error('اختر فرعاً محدداً لإدارة الفئات'); return; }
    if (category) {
      setSelectedCategory(category);
      setCategoryForm({ storeId: category.storeId, name: category.name, nameEn: category.nameEn || '', description: category.description || '', descriptionEn: category.descriptionEn || '', image: category.image || '' });
    } else { resetCategoryForm(); }
    setShowCategoryModal(true);
  };

  const handleOpenProductModal = (product?: Product) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لإدارة المنتجات'); return; }
    if (selectedBranchId === 'all') { toast.error('اختر فرعاً محدداً لإدارة المنتجات'); return; }
    if (product) {
      setSelectedProduct(product);
      setProductForm({
        storeId: product.storeId,
        categoryId: product.categoryId || '',
        name: product.name,
        nameEn: product.nameEn || '',
        description: product.description || '',
        descriptionEn: product.descriptionEn || '',
        price: product.price.toString(),
        originalPrice: (product as any).originalPrice?.toString() || '',
        isPopular: (product as any).isPopular === true,
        images: Array.isArray((product as any).images)
          ? (product as any).images
          : (product.imageUrl ? [product.imageUrl] : []),
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
      const payload = { ...categoryForm, storeId: categoryForm.storeId || selectedBranchId };
      if (selectedCategory) {
        await api.put(`/store/categories/${selectedCategory.id}`, payload);
        toast.success('تم تحديث الفئة بنجاح');
      } else {
        await api.post('/store/categories', payload);
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
      const data = { ...productForm, storeId: productForm.storeId || selectedBranchId, price, 
        // كان discountedPrice — حقل لا وجود له في المخطط ولا في المتحكّم
        // إطلاقاً: يملؤه التاجر ويُرمى بصمت. الصحيح تخزين سعر ما **قبل**
        // التخفيض، فيبقى price هو ما يُحصَّل ولا يحتاج أي موضع قراءة تعديلاً.
        originalPrice: productForm.originalPrice ? parseFloat(productForm.originalPrice) : null,
        isPopular: productForm.isPopular === true,
        images: productForm.images, stock: parseInt(productForm.stock) || 0 };
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

  const handleDeleteCategory = async (id: string, storeId?: string) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لحذف الفئات'); return; }
    const productsInCategory = products.filter(p => p.categoryId === id);
    if (productsInCategory.length > 0) { toast.error(`لا يمكن حذف الفئة لأنها تحتوي على ${productsInCategory.length} منتج`); return; }
    if (window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
      try {
        await api.delete(`/store/categories/${id}${storeId ? `?storeId=${storeId}` : ''}`);
        toast.success('تم حذف الفئة بنجاح');
        fetchData();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'حدث خطأ');
      }
    }
  };

  const handleDeleteProduct = async (id: string, storeId?: string) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لحذف المنتجات'); return; }
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      setDeleting(id);
      try {
        await api.delete(`/store/products/${id}${storeId ? `?storeId=${storeId}` : ''}`);
        toast.success('تم حذف المنتج بنجاح');
        fetchData();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'حدث خطأ');
      } finally {
        setDeleting(null);
      }
    }
  };

  const handleToggleAvailability = async (id: string, currentStatus: boolean, storeId?: string) => {
    try {
      await api.patch(`/store/products/${id}`, { isAvailable: !currentStatus, storeId: storeId || (selectedBranchId === 'all' ? (store?.id || undefined) : selectedBranchId) });
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
    if (stock <= 0) return { text: 'نفد من المخزون', bg: `${staticColors.red}20`, color: staticColors.red };
    if (stock <= 5) return { text: 'مخزون منخفض', bg: `${staticColors.yellow}20`, color: staticColors.yellow };
    if (stock <= 20) return { text: 'مخزون متوسط', bg: `${staticColors.blue}20`, color: staticColors.blue };
    return { text: 'مخزون جيد', bg: `${dynamicColors.accent}20`, color: dynamicColors.accent };
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 'بدون فئة';
    return category.branchLabel ? `${category.name} • ${category.branchLabel}` : category.name;
  };

  // ✅ ستايل الحقول مع الألوان الديناميكية
  const dynamicInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: dynamicColors.surf,
    border: `1px solid ${dynamicColors.border}`,
    borderRadius: 8,
    color: dynamicColors.text,
    outline: 'none',
  };

  const dynamicLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 4,
    color: dynamicColors.muted,
  };

  if (loading || storeLoading) return <Loader fullScreen />;

  return (
    <div style={{ background: dynamicColors.bg, minHeight: '100vh', padding: 24, fontFamily: theme.fontFamily || 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: dynamicColors.text, margin: 0 }}>🛍️ إدارة منتجات المتجر</h1>
          <p style={{ fontSize: 13, color: dynamicColors.muted, marginTop: 4 }}>إدارة الفئات والمنتجات في متجرك</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {(store && (store.linkedBranches?.length || 0) > 0) && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{ background: dynamicColors.card, color: dynamicColors.text, border: `1px solid ${dynamicColors.border}`, borderRadius: 10, padding: '8px 12px', minWidth: 220 }}
            >
              <option value={store.id}>الفرع الحالي: {store.name}</option>
              <option value="all">كل الفروع</option>
              {(store.linkedBranches || []).map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          )}
          {(isSuperAdmin || isStoreOwner) && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => selectedBranchId === 'all' ? toast.error('اختر فرعاً محدداً لإضافة فئة') : handleOpenCategoryModal()}
                disabled={selectedBranchId === 'all'}
                style={{ background: dynamicColors.surf, border: `1px solid ${dynamicColors.border}`, color: dynamicColors.accent, padding: '8px 16px', borderRadius: 10, cursor: selectedBranchId === 'all' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, opacity: selectedBranchId === 'all' ? 0.6 : 1 }}
              >
                <IoAdd size={18} /> إضافة فئة
              </button>
              <button
                onClick={() => selectedBranchId === 'all' ? toast.error('اختر فرعاً محدداً لإضافة منتج') : handleOpenProductModal()}
                disabled={selectedBranchId === 'all'}
                style={{ background: dynamicColors.accent, color: dynamicColors.bg, padding: '8px 16px', borderRadius: 10, cursor: selectedBranchId === 'all' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, border: 'none', opacity: selectedBranchId === 'all' ? 0.7 : 1 }}
              >
                <IoAdd size={18} /> إضافة منتج
              </button>
            </div>
          )}
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'إجمالي الفئات', value: categories.length, color: staticColors.blue },
          { label: 'إجمالي المنتجات', value: products.length, color: dynamicColors.accent },
          { label: 'غير متوفرة', value: products.filter(p => !p.isAvailable).length, color: staticColors.yellow },
          { label: 'نفد من المخزون', value: products.filter(p => p.stock === 0).length, color: staticColors.red },
        ].map((stat, i) => (
          <div key={i} style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, padding: 16 }}>
            <p style={{ color: dynamicColors.muted, fontSize: 13, margin: 0 }}>{stat.label}</p>
            <p style={{ color: stat.color, fontSize: 28, fontWeight: 700, margin: '4px 0 0' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* الفئات */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: dynamicColors.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 22, background: dynamicColors.accent, borderRadius: 4, display: 'inline-block' }}></span>
            الفئات
          </h2>
          <span style={{ color: dynamicColors.muted, fontSize: 13 }}>{categories.length} فئة</span>
        </div>

        {categories.length === 0 ? (
          <div style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <IoCube style={{ color: dynamicColors.muted, fontSize: 48, marginBottom: 12 }} />
            <p style={{ color: dynamicColors.muted, margin: 0 }}>لا توجد فئات. أضف فئة جديدة!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, padding: 16, transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = dynamicColors.accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = dynamicColors.border)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 600, color: dynamicColors.text, margin: 0, fontSize: 14 }}>{cat.name}</h3>
                    {cat.nameEn && <p style={{ color: dynamicColors.muted, fontSize: 11, margin: '2px 0 0' }}>{cat.nameEn}</p>}
                    {cat.branchLabel && <p style={{ color: dynamicColors.accent, fontSize: 11, margin: '4px 0 0' }}>{cat.branchLabel}</p>}
                  </div>
                  {(isSuperAdmin || isStoreOwner) && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => handleOpenCategoryModal(cat)} style={{ padding: 6, background: 'transparent', border: 'none', color: dynamicColors.accent, cursor: 'pointer', borderRadius: 8 }}>
                        <IoPencil size={15} />
                      </button>
                      <button onClick={() => handleDeleteCategory(cat.id, cat.storeId)} style={{ padding: 6, background: 'transparent', border: 'none', color: staticColors.red, cursor: 'pointer', borderRadius: 8 }}>
                        <IoTrash size={15} />
                      </button>
                    </div>
                  )}
                </div>
                {cat.image && (
                  <img src={getImageUrl(cat.image)} alt={cat.name} style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 10, marginTop: 10 }} />
                )}
                {cat.description && <p style={{ color: dynamicColors.muted, fontSize: 12, marginTop: 8 }}>{cat.description}</p>}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${dynamicColors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: dynamicColors.muted, fontSize: 12 }}>{products.filter(p => p.categoryId === cat.id).length} منتج</span>
                  <span style={{ color: dynamicColors.accent, fontSize: 12 }}>نشط</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* المنتجات */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: dynamicColors.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 22, background: dynamicColors.accent, borderRadius: 4, display: 'inline-block' }}></span>
            المنتجات
          </h2>
          <span style={{ color: dynamicColors.muted, fontSize: 13 }}>{products.length} منتج</span>
        </div>

        {products.length === 0 ? (
          <div style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <IoCube style={{ color: dynamicColors.muted, fontSize: 48, marginBottom: 12 }} />
            <p style={{ color: dynamicColors.muted, margin: 0 }}>لا توجد منتجات. أضف منتجاً جديداً!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {products.map((product) => {
              const stockStatus = getStockStatus(product.stock);
              const hasDiscount = product.discountedPrice && product.discountedPrice > 0;
              const finalPrice = hasDiscount ? product.discountedPrice : product.price;
              const discountPercent = hasDiscount ? Math.round(((product.price - product.discountedPrice!) / product.price) * 100) : 0;
              
              return (
                <div key={product.id} style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = dynamicColors.accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = dynamicColors.border)}
                >
                  {/* صورة المنتج */}
                  <div style={{ position: 'relative', height: 140, background: dynamicColors.surf, overflow: 'hidden' }}>
                    {product.imageUrl ? (
                      <img src={getImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <IoImage style={{ color: dynamicColors.muted, fontSize: 36 }} />
                        <span style={{ color: dynamicColors.muted, fontSize: 12, marginTop: 4 }}>لا توجد صورة</span>
                      </div>
                    )}
                    <button
                      onClick={() => handleToggleAvailability(product.id, product.isAvailable, product.storeId)}
                      style={{ position: 'absolute', top: 8, right: 8, padding: 6, borderRadius: '50%', border: 'none', cursor: 'pointer', background: product.isAvailable ? dynamicColors.accent : dynamicColors.muted, color: dynamicColors.bg }}
                    >
                      {product.isAvailable ? <IoEye size={13} /> : <IoEyeOff size={13} />}
                    </button>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 4 }}>
                      {hasDiscount && <span style={{ background: staticColors.red, color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>-{discountPercent}%</span>}
                      {product.stock === 0 && <span style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>نفد</span>}
                    </div>
                    {(isSuperAdmin || isStoreOwner) && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                      >
                        <button onClick={() => handleOpenProductModal(product)} style={{ padding: 8, background: '#fff', borderRadius: '50%', border: 'none', color: dynamicColors.prim, cursor: 'pointer' }}>
                          <IoPencil size={15} />
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id, product.storeId)} disabled={deleting === product.id} style={{ padding: 8, background: '#fff', borderRadius: '50%', border: 'none', color: staticColors.red, cursor: 'pointer' }}>
                          {deleting === product.id ? <div style={{ width: 15, height: 15, border: `2px solid ${staticColors.red}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <IoTrash size={15} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* معلومات المنتج */}
                  <div style={{ padding: 12 }}>
                    <h3 style={{ fontWeight: 600, color: dynamicColors.text, margin: 0, fontSize: 13 }}>{product.name}</h3>
                    {product.nameEn && <p style={{ color: dynamicColors.muted, fontSize: 11, margin: '2px 0 0' }}>{product.nameEn}</p>}
                    {product.branchLabel && <p style={{ color: dynamicColors.accent, fontSize: 11, margin: '4px 0 0' }}>{product.branchLabel}</p>}
                    <div style={{ marginTop: 6 }}>
                      <span style={{ background: dynamicColors.surf, color: dynamicColors.muted, fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>
                        {getCategoryName(product.categoryId || '')}
                      </span>
                    </div>
                    <p style={{ color: dynamicColors.muted, fontSize: 12, marginTop: 8, minHeight: 32 }}>{product.description || 'لا يوجد وصف'}</p>
                    <div style={{ marginTop: 8 }}>
                      {hasDiscount ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ color: dynamicColors.accent, fontSize: 16, fontWeight: 700 }}>{finalPrice.toFixed(2)} ر.س</span>
                          <span style={{ color: dynamicColors.muted, fontSize: 11, textDecoration: 'line-through' }}>{product.price.toFixed(2)} ر.س</span>
                          <span style={{ background: `${dynamicColors.accent}20`, color: dynamicColors.accent, fontSize: 11, padding: '1px 6px', borderRadius: 10 }}>
                            -{discountPercent}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: dynamicColors.accent, fontSize: 16, fontWeight: 700 }}>{product.price.toFixed(2)} ر.س</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${dynamicColors.border}` }}>
                      <span style={{ background: stockStatus.bg, color: stockStatus.color, fontSize: 11, padding: '3px 8px', borderRadius: 12 }}>{stockStatus.text}</span>
                      {product.sku && <span style={{ color: dynamicColors.muted, fontSize: 11, fontFamily: 'monospace' }}>{product.sku.length > 8 ? product.sku.substring(0, 8) + '…' : product.sku}</span>}
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
            <label style={dynamicLabelStyle}>اسم الفئة (عربي) <span style={{ color: staticColors.red }}>*</span></label>
            <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} style={dynamicInputStyle} placeholder="مثال: إلكترونيات" />
          </div>
          <div>
            <label style={dynamicLabelStyle}>اسم الفئة (إنجليزي)</label>
            <input type="text" value={categoryForm.nameEn} onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })} style={dynamicInputStyle} placeholder="Example: Electronics" />
          </div>
          <div>
            <label style={dynamicLabelStyle}>الوصف</label>
            <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} style={{ ...dynamicInputStyle, resize: 'vertical' }} rows={3} placeholder="وصف الفئة..." />
          </div>
          <div>
            <label style={dynamicLabelStyle}>الصورة</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', border: `2px dashed ${dynamicColors.border}`, borderRadius: 10, color: dynamicColors.muted }}>
                  <IoCloudUpload />
                  <span style={{ fontSize: 13 }}>اختر صورة</span>
                </div>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'category')} style={{ display: 'none' }} disabled={uploading} />
              </label>
              {categoryForm.image && (
                <button onClick={() => removeImage('category')} style={{ padding: 8, background: 'transparent', border: 'none', color: staticColors.red, cursor: 'pointer' }}>
                  <IoTrash size={18} />
                </button>
              )}
            </div>
            {uploading && <p style={{ color: dynamicColors.accent, fontSize: 13, marginTop: 4 }}>جاري رفع الصورة...</p>}
            {categoryForm.image && <img src={getImageUrl(categoryForm.image)} alt="معاينة" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, marginTop: 8, border: `1px solid ${dynamicColors.border}` }} />}
          </div>
          <button onClick={handleSaveCategory} disabled={uploading} style={{ background: dynamicColors.accent, color: dynamicColors.bg, padding: '10px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: 14 }}>
            {uploading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </Modal>

      {/* مودال المنتج */}
      <Modal isOpen={showProductModal} onClose={() => { setShowProductModal(false); resetProductForm(); }} title={selectedProduct ? 'تعديل منتج' : 'إضافة منتج جديد'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto', padding: 4 }}>
          <div>
            <label style={dynamicLabelStyle}>الفئة</label>
            <select value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })} style={{ ...dynamicInputStyle }}>
              <option value="">بدون فئة</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={dynamicLabelStyle}>اسم المنتج (عربي) <span style={{ color: staticColors.red }}>*</span></label>
              <input type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} style={dynamicInputStyle} placeholder="اسم المنتج" />
            </div>
            <div>
              <label style={dynamicLabelStyle}>اسم المنتج (إنجليزي)</label>
              <input type="text" value={productForm.nameEn} onChange={(e) => setProductForm({ ...productForm, nameEn: e.target.value })} style={dynamicInputStyle} placeholder="Product name" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={dynamicLabelStyle}>السعر (ل.س) <span style={{ color: staticColors.red }}>*</span></label>
              <input type="number" step="0.01" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} style={dynamicInputStyle} placeholder="0.00" />
            </div>
            <div>
              {/* السعر **قبل** الخصم لا بعده: price هو ما يُحصَّل دائماً،
                  فلا يحتاج أي موضع قراءة للسعر أن يعرف بوجود خصم أصلاً. */}
              <label style={dynamicLabelStyle}>السعر قبل الخصم (ل.س)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={productForm.originalPrice}
                onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                style={dynamicInputStyle}
                placeholder="اتركه فارغاً إن لا خصم"
              />
              <div style={{ color: dynamicColors.muted, fontSize: 11.5, marginTop: 5, lineHeight: 1.7 }}>
                يظهر مشطوباً بجانب السعر. يجب أن يكون <strong>أعلى</strong> من السعر الحالي وإلا تُجوهِل.
              </div>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={productForm.isPopular}
              onChange={(e) => setProductForm({ ...productForm, isPopular: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: dynamicColors.accent }}
            />
            <span style={{ color: dynamicColors.text, fontSize: 14, fontWeight: 500 }}>
              أبرزه ضمن «الأكثر طلباً»
            </span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={dynamicLabelStyle}>المخزون</label>
              <input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} style={dynamicInputStyle} placeholder="0" />
            </div>
            <div>
              <label style={dynamicLabelStyle}>SKU (رمز المنتج)</label>
              <input type="text" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} style={dynamicInputStyle} placeholder="PRD-001" />
            </div>
          </div>
          <div>
            <label style={dynamicLabelStyle}>الوصف (عربي)</label>
            <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} style={{ ...dynamicInputStyle, resize: 'vertical' }} rows={3} placeholder="وصف المنتج..." />
          </div>
          <div>
            <label style={dynamicLabelStyle}>الوصف (إنجليزي)</label>
            <textarea value={productForm.descriptionEn} onChange={(e) => setProductForm({ ...productForm, descriptionEn: e.target.value })} style={{ ...dynamicInputStyle, resize: 'vertical' }} rows={3} placeholder="Product description..." />
          </div>
          <div>
            <label style={dynamicLabelStyle}>صور المنتج</label>
            <MultiImageUploader
              value={productForm.images}
              onChange={(images) => setProductForm({ ...productForm, images })}
              entityType="products"
              entityId={productForm.storeId || selectedBranchId}
              colors={{
                card: dynamicColors.card,
                surf: dynamicColors.card,
                accent: dynamicColors.accent,
                bg: dynamicColors.bg,
                text: dynamicColors.text,
                muted: dynamicColors.muted,
                border: dynamicColors.border,
                red: staticColors.red
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={productForm.isAvailable} onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.checked })} style={{ width: 16, height: 16, accentColor: dynamicColors.accent }} />
            <span style={{ color: dynamicColors.text, fontSize: 14, fontWeight: 500 }}>المنتج متاح للبيع</span>
          </div>
          <button onClick={handleSaveProduct} disabled={uploading} style={{ background: dynamicColors.accent, color: dynamicColors.bg, padding: '10px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: 14 }}>
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