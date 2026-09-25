// pages/Store/StoreProductsPage.tsx

import '@/styles/orders.css';
import '@/styles/catalog.css';
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoAdd, IoPencil, IoTrash, IoEye, IoEyeOff, IoClose, IoCube, IoWarning, IoImage, IoCloudUpload,
  IoReorderThreeOutline, IoSearch, IoLayersOutline, IoNotificationsOutline, IoCallOutline, IoMailOutline,
  IoLogoWhatsapp
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getImageUrl } from '@/utils/imageHelpers';
import ReorderList, { type ReorderItem } from '@/components/common/ReorderList';
import { ProductCsvTools } from '@/components/common/CsvTools';
import TagsInput from '@/components/common/TagsInput';
import MultiImageUploader from '@/components/settings/MultiImageUploader';
import ProductOptionsEditor, { OptionGroup } from '@/components/settings/ProductOptionsEditor';
import { getDiscountPercent } from '@/utils/catalogBadges';
import { formatPrice } from '@/utils/currency';

// ✅ الألوان الثابتة فقط للعناصر التي لا تتغير (الأحمر، الأزرق، إلخ)
const staticColors = {
  red: '#D64545',
  blue: '#2563EB',
  yellow: '#B45309',
  purple: '#8B45B5',
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
  /** سعر ما قبل الخصم — أعلى من price وإلا فلا خصم */
  originalPrice?: number | null;
  isPopular?: boolean;
  images?: string[];
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

/** زرّ تبديل وضع الترتيب — نفسه للفئات والمنتجات */
const ReorderToggle: React.FC<{
  active: boolean;
  onClick: () => void;
  colors: { accent: string; muted: string; border: string; bg: string };
}> = ({ active, onClick, colors }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      minHeight: 34,
      padding: '0 12px',
      borderRadius: 10,
      border: `1px solid ${active ? colors.accent : colors.border}`,
      background: active ? colors.accent : 'transparent',
      color: active ? colors.bg : colors.muted,
      fontSize: 12.5,
      fontWeight: 700,
      fontFamily: 'inherit',
      cursor: 'pointer'
    }}
  >
    <IoReorderThreeOutline size={17} />
    {active ? 'إنهاء الترتيب' : 'ترتيب'}
  </button>
);

const StoreProductsPage: React.FC = () => {
  const { store, loading: storeLoading } = useStore();
  const permissions = usePermissions();
  const { isSuperAdmin, isStoreOwner, isStaff } = useAuth();

  // ألوان اللوحة لا ألوان واجهة المتجر: كانت تُقرأ من `useTheme` فتتبدّل
  // الشاشة بثيم كلّ تاجر وتخرج عن بقيّة اللوحة
  const dynamicColors = {
    bg: '#F4F7F4',
    card: '#FFFFFF',
    prim: '#E8EFEA',
    surf: '#F1F5F2',
    surfL: '#E2EBE5',
    accent: '#084835',
    acDk: '#06382A',
    text: '#10231B',
    muted: '#5F736A',
    border: 'rgba(16,35,27,0.12)',
  };

  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [showCats, setShowCats] = useState(false);


  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  /**
   * وضع الترتيب — قائمةٌ واحدة في كل مرّة.
   *
   * فتحُ القائمتين معاً يعني شريطَي حفظٍ ملتصقَين أسفل الشاشة، ولا يعرف
   * التاجر أيّهما يحفظ ماذا.
   */
  const [reordering, setReordering] = useState<'none' | 'categories' | 'products'>('none');
  const [savingOrder, setSavingOrder] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  // طلبات «أعلمني حين يتوفّر» — العدد على البطاقة، والجهات في نافذة
  const [stockAlerts, setStockAlerts] = useState<{ counts: Record<string, number>; products: any[] }>({ counts: {}, products: [] });
  const [alertsProductId, setAlertsProductId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    parentId: '',
    storeId: '',
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    image: '',
  });

  const [productForm, setProductForm] = useState({
    tags: [] as string[],
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
    options: [] as OptionGroup[],
    isAvailable: true,
    comingSoon: false,
    availableAt: '',
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

  /**
   * يحفظ الترتيب ثمّ يُعيد الجلب.
   *
   * **الجلب بعد الحفظ لا قبله:** الخادم هو من يرقّم بالموضع، وإعادة القراءة
   * تُثبت أن ما يراه التاجر هو ما حُفظ فعلاً — لا نسخةً متفائلة في الذاكرة
   * قد تختلف عمّا ستعرضه واجهة المتجر للزبون.
   */
  const saveOrder = async (kind: 'categories' | 'products', ids: string[]) => {
    setSavingOrder(true);
    try {
      await api.put(`/store/${kind}/reorder`, { ids });
      await fetchData();
      toast.success('حُفظ الترتيب — هذا ما سيراه الزبون');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر حفظ الترتيب');
    } finally {
      setSavingOrder(false);
    }
  };

  /**
   * وسوم المتجر كلّها — للاقتراح في حقل الوسوم.
   *
   * تُشتقّ من المنتجات لا من جدول: الوسم كلمةٌ لا كيان. ومرتّبةٌ بالشيوع
   * فالأكثر استعمالاً أوّل ما يُقترح.
   */
  const storeTags = useMemo(() => {
    const counts = new Map<string, { label: string; n: number }>();
    products.forEach((p) => {
      const raw = (p as any).tags;
      const list = Array.isArray(raw) ? raw : [];
      list.forEach((tag: unknown) => {
        if (typeof tag !== 'string' || !tag.trim()) return;
        const key = tag.trim().toLowerCase();
        const entry = counts.get(key);
        if (entry) entry.n += 1;
        else counts.set(key, { label: tag.trim(), n: 1 });
      });
    });
    return [...counts.values()].sort((a, b) => b.n - a.n).map((e) => e.label);
  }, [products]);

  const reorderColors = {
    text: dynamicColors.text,
    muted: dynamicColors.muted,
    card: dynamicColors.card,
    surface: dynamicColors.surf,
    border: dynamicColors.border,
    accent: dynamicColors.accent,
    bg: dynamicColors.bg
  };

  const fetchStockAlerts = async () => {
    try {
      const data: any = await api.get('/store/stock-alerts');
      const payload = data?.counts ? data : data?.data || {};
      setStockAlerts({ counts: payload.counts || {}, products: payload.products || [] });
    } catch {
      /* غير حرج: البطاقات تعمل بلا العدد */
    }
  };

  useEffect(() => {
    fetchStockAlerts();
  }, []);

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
          originalPrice: (product as any).originalPrice ?? null,
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
    setCategoryForm({ parentId: '', storeId: selectedBranchId === 'all' ? (store?.id || '') : selectedBranchId, name: '', nameEn: '', description: '', descriptionEn: '', image: '' });
    setSelectedCategory(null);
  };

  const resetProductForm = () => {
    setProductForm({ tags: [], storeId: selectedBranchId === 'all' ? (store?.id || '') : selectedBranchId, categoryId: '', name: '', nameEn: '', description: '', descriptionEn: '', price: '', originalPrice: '', isPopular: false, images: [], imageUrl: '', stock: '', sku: '', options: [], isAvailable: true, comingSoon: false, availableAt: '' });
    setSelectedProduct(null);
  };

  const handleOpenCategoryModal = (category?: Category) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لإدارة الفئات'); return; }
    if (selectedBranchId === 'all') { toast.error('اختر فرعاً محدداً لإدارة الفئات'); return; }
    if (category) {
      setSelectedCategory(category);
      setCategoryForm({ parentId: (category as any).parentId || '', storeId: category.storeId, name: category.name, nameEn: category.nameEn || '', description: category.description || '', descriptionEn: category.descriptionEn || '', image: category.image || '' });
    } else { resetCategoryForm(); }
    setShowCategoryModal(true);
  };

  const handleOpenProductModal = (product?: Product) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لإدارة المنتجات'); return; }
    if (selectedBranchId === 'all') { toast.error('اختر فرعاً محدداً لإدارة المنتجات'); return; }
    if (product) {
      setSelectedProduct(product);
      setProductForm({
        // الوسوم تصل مصفوفةً أو نصّاً JSON حسب مسار الحفظ — كالخيارات
        tags: (() => {
          const raw = (product as any).tags;
          if (Array.isArray(raw)) return raw.filter((t: unknown) => typeof t === 'string');
          if (typeof raw === 'string' && raw.trim()) {
            try {
              const parsed = JSON.parse(raw);
              return Array.isArray(parsed) ? parsed.filter((t: unknown) => typeof t === 'string') : [];
            } catch {
              return [];
            }
          }
          return [];
        })(),
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
        // الخيارات تصل مصفوفةً أو نصاً JSON حسب مسار الحفظ
        options: (() => {
          const raw = (product as any).options;
          if (Array.isArray(raw)) return raw;
          if (typeof raw === 'string' && raw.trim()) {
            try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
          }
          return [];
        })(),
        isAvailable: product.isAvailable,
        comingSoon: (product as any).comingSoon === true,
        availableAt: (product as any).availableAt ? String((product as any).availableAt).slice(0, 10) : '',
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
        images: productForm.images, stock: parseInt(productForm.stock) || 0,
        comingSoon: productForm.comingSoon === true,
        availableAt: productForm.comingSoon && productForm.availableAt ? productForm.availableAt : null };
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

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (catFilter === 'all' || p.categoryId === catFilter) &&
        (!q || [p.name, p.nameEn, p.sku].some((f) => (f || '').toLowerCase().includes(q)))
    );
  }, [products, catFilter, query]);

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

  if (loading || storeLoading) return <Loader fullScreen variant="grid" />;

  return (
    <div className="ss-page pc-page">
      {/* ===== الأدوات ===== */}
      <div className="pc-toolbar">
        <label className="ob-search pc-search">
          <IoSearch size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم المنتج أو رمزه"
            aria-label="بحث في المنتجات"
          />
        </label>
        {(store && (store.linkedBranches?.length || 0) > 0) && (
          <select
            className="pc-select"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            aria-label="الفرع"
          >
            <option value={store.id}>الفرع الحالي: {store.name}</option>
            <option value="all">كل الفروع</option>
            {(store.linkedBranches || []).map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        )}
        {(isSuperAdmin || isStoreOwner) && (
          <div className="pc-toolbar-actions">
            <button
              type="button"
              className="ss-btn ss-btn-ghost"
              onClick={() => selectedBranchId === 'all' ? toast.error('اختر فرعاً محدداً لإضافة فئة') : handleOpenCategoryModal()}
              disabled={selectedBranchId === 'all'}
            >
              <IoAdd size={18} /> فئة
            </button>
            <button
              type="button"
              className="ss-btn ss-btn-primary"
              onClick={() => selectedBranchId === 'all' ? toast.error('اختر فرعاً محدداً لإضافة منتج') : handleOpenProductModal()}
              disabled={selectedBranchId === 'all'}
            >
              <IoAdd size={18} /> إضافة منتج
            </button>
          </div>
        )}
      </div>

      {/* ===== أرقام ===== */}
      <div className="pc-stats">
        {[
          { label: 'المنتجات', value: products.length, tone: 'green' },
          { label: 'الفئات', value: categories.length, tone: 'blue' },
          { label: 'مخفيّة عن الزبائن', value: products.filter(p => !p.isAvailable).length, tone: 'amber' },
          { label: 'نفد مخزونها', value: products.filter(p => p.stock === 0).length, tone: 'red' },
        ].map((stat) => (
          <div key={stat.label} className={`pc-stat tone-${stat.tone}`}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      {/* ===== الفئات: شريط تصفية، وإدارتها عند الطلب ===== */}
      <div className="pc-cats">
        <div className="ob-tabs" role="tablist" aria-label="تصفية حسب الفئة">
          <button type="button" role="tab" className="ob-tab" aria-selected={catFilter === 'all'} onClick={() => setCatFilter('all')}>
            الكل <span>{products.length}</span>
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.id).length;
            return (
              <button key={cat.id} type="button" role="tab" className="ob-tab" aria-selected={catFilter === cat.id} onClick={() => setCatFilter(cat.id)}>
                {cat.name} <span>{count}</span>
              </button>
            );
          })}
        </div>
        {(isSuperAdmin || isStoreOwner) && categories.length > 0 && (
          <button type="button" className="pc-link" onClick={() => setShowCats((v) => !v)} aria-expanded={showCats}>
            <IoLayersOutline size={16} /> {showCats ? 'إخفاء إدارة الفئات' : 'إدارة الفئات'}
          </button>
        )}
      </div>

      {(showCats || categories.length === 0) && (
        <section className="ss-card pc-panel" aria-labelledby="cats-title">
          <header className="pc-panel-head">
            <div>
              <h2 id="cats-title">الفئات</h2>
              <p>{categories.length ? `${categories.length} فئة — الترتيب هنا هو ترتيبها في متجرك` : 'الفئات ترتّب متجرك: ملابس، أحذية، إكسسوارات…'}</p>
            </div>
            {(isSuperAdmin || isStoreOwner) && categories.length > 1 && (
              <ReorderToggle
                active={reordering === 'categories'}
                onClick={() => setReordering((prev) => (prev === 'categories' ? 'none' : 'categories'))}
                colors={dynamicColors}
              />
            )}
          </header>

          {reordering === 'categories' ? (
            <ReorderList
              items={categories.map(
                (cat): ReorderItem => ({
                  id: cat.id,
                  name: cat.name,
                  image: cat.image,
                  meta: `${products.filter((p) => p.categoryId === cat.id).length} منتج`
                })
              )}
              onSave={(ids) => saveOrder('categories', ids)}
              onCancel={() => setReordering('none')}
              colors={reorderColors}
              saving={savingOrder}
            />
          ) : categories.length === 0 ? (
            <div className="ob-empty">
              <b>لا فئات بعد</b>
              <p>أنشئ فئتك الأولى ثم أضف منتجاتك إليها.</p>
              {(isSuperAdmin || isStoreOwner) && (
                <button type="button" onClick={() => handleOpenCategoryModal()}>إضافة فئة</button>
              )}
            </div>
          ) : (
            <ul className="pc-cat-list">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <span className="pc-cat-thumb">
                    {cat.image ? <img src={getImageUrl(cat.image)} alt="" loading="lazy" /> : <IoLayersOutline size={18} />}
                  </span>
                  <span className="pc-cat-main">
                    <b>{cat.name}</b>
                    <small>
                      {products.filter((p) => p.categoryId === cat.id).length} منتج
                      {cat.branchLabel ? ` · ${cat.branchLabel}` : ''}
                    </small>
                  </span>
                  {(isSuperAdmin || isStoreOwner) && (
                    <span className="pc-actions">
                      <button type="button" className="pc-act" onClick={() => handleOpenCategoryModal(cat)} aria-label={`تعديل ${cat.name}`}>
                        <IoPencil size={16} />
                      </button>
                      <button type="button" className="pc-act is-danger" onClick={() => handleDeleteCategory(cat.id, cat.storeId)} aria-label={`حذف ${cat.name}`}>
                        <IoTrash size={16} />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ===== المنتجات ===== */}
      <section aria-labelledby="products-title">
        <div className="pc-section-head">
          <h2 id="products-title">
            {catFilter === 'all' ? 'كلّ المنتجات' : getCategoryName(catFilter)}
            <span>{visibleProducts.length}</span>
          </h2>
          <div className="pc-section-tools">
            {(isSuperAdmin || isStoreOwner) && <ProductCsvTools colors={reorderColors} onDone={fetchData} />}
            {(isSuperAdmin || isStoreOwner) && products.length > 1 && (
              <ReorderToggle
                active={reordering === 'products'}
                onClick={() => setReordering((prev) => (prev === 'products' ? 'none' : 'products'))}
                colors={dynamicColors}
              />
            )}
          </div>
        </div>

        {reordering === 'products' ? (
          <ReorderList
            items={products.map(
              (product): ReorderItem => ({
                id: product.id,
                name: product.name,
                image: (product as any).imageUrl || (product as any).image,
                meta: categories.find((c) => c.id === product.categoryId)?.name || 'بدون فئة'
              })
            )}
            onSave={(ids) => saveOrder('products', ids)}
            onCancel={() => setReordering('none')}
            colors={reorderColors}
            saving={savingOrder}
          />
        ) : visibleProducts.length === 0 ? (
          <div className="ss-card">
            <div className="ob-empty">
              <b>{products.length === 0 ? 'لا منتجات بعد' : 'لا منتجات تطابق البحث'}</b>
              <p>{products.length === 0 ? 'أضف منتجك الأوّل بصورةٍ واضحة وسعرٍ — ويظهر في متجرك فوراً.' : 'جرّب كلمةً أخرى أو فئةً أخرى.'}</p>
              {products.length === 0 && (isSuperAdmin || isStoreOwner) && categories.length > 0 && (
                <button type="button" onClick={() => handleOpenProductModal()}>إضافة منتج</button>
              )}
            </div>
          </div>
        ) : (
          <div className="pc-grid">
            {visibleProducts.map((product) => {
              const stockStatus = getStockStatus(product.stock);
              // price هو ما يُحصَّل دائماً، وoriginalPrice سعر ما قبل الخصم.
              // النسبة تُشتق من نفس قواعد الخادم بدل حسابها هنا بمعيار ثانٍ.
              const discountPercent = getDiscountPercent(product.price, (product as any).originalPrice);
              const hasDiscount = discountPercent !== null;
              return (
                <article key={product.id} className={`pc-card ${product.isAvailable ? '' : 'is-hidden'}`}>
                  <div className="pc-media">
                    {product.imageUrl ? (
                      <img src={getImageUrl(product.imageUrl)} alt={product.name} loading="lazy" />
                    ) : (
                      <span className="pc-noimg"><IoImage size={30} /> بلا صورة</span>
                    )}
                    <span className="pc-badges">
                      {hasDiscount && <span className="pc-badge is-sale">-{discountPercent}%</span>}
                      {(product as any).comingSoon ? (
                        <span className="pc-badge is-sale" style={{ background: '#6D28D9' }}>قريباً</span>
                      ) : (
                        product.stock === 0 && <span className="pc-badge is-dark">نفد</span>
                      )}
                      {!product.isAvailable && <span className="pc-badge is-dark">مخفيّ</span>}
                    </span>
                  </div>

                  <div className="pc-body">
                    <span className="pc-cat">{getCategoryName(product.categoryId || '')}</span>
                    <h3>{product.name}</h3>
                    {product.branchLabel && <small className="pc-branch">{product.branchLabel}</small>}
                    <div className="pc-price">
                      <strong>{formatPrice(product.price)}</strong>
                      {hasDiscount && <s>{formatPrice((product as any).originalPrice)}</s>}
                    </div>
                    <span className="pc-stock" style={{ background: stockStatus.bg, color: stockStatus.color }}>
                      {stockStatus.text}
                      {product.stock > 0 ? ` · ${product.stock}` : ''}
                    </span>
                    {/* من طلب «أعلمني» — الطلب الحقيقي قبل إعادة التوريد */}
                    {(stockAlerts.counts[product.id] || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setAlertsProductId(product.id)}
                        style={{
                          marginTop: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(109,40,217,0.25)',
                          background: 'rgba(109,40,217,0.08)',
                          color: '#6D28D9',
                          fontSize: 12,
                          fontWeight: 800,
                          fontFamily: 'inherit',
                          cursor: 'pointer'
                        }}
                      >
                        <IoNotificationsOutline size={13} /> {stockAlerts.counts[product.id]} ينتظرون عودته
                      </button>
                    )}
                  </div>

                  {/* الأزرار ظاهرةٌ دائماً — كانت تظهر عند المرور بالمؤشّر فقط، فلا يصلها تاجرٌ على هاتفه */}
                  <footer className="pc-foot">
                    <button
                      type="button"
                      className={`pc-toggle ${product.isAvailable ? 'is-on' : ''}`}
                      role="switch"
                      aria-checked={product.isAvailable}
                      onClick={() => handleToggleAvailability(product.id, product.isAvailable, product.storeId)}
                      title={product.isAvailable ? 'ظاهر للزبائن — اضغط لإخفائه' : 'مخفيّ — اضغط لإظهاره'}
                    >
                      <span className="pc-toggle-track"><span /></span>
                      <span className="pc-toggle-text">{product.isAvailable ? 'ظاهر' : 'مخفيّ'}</span>
                    </button>
                    {(isSuperAdmin || isStoreOwner) && (
                      <span className="pc-actions">
                        <button type="button" className="pc-act" onClick={() => handleOpenProductModal(product)} aria-label={`تعديل ${product.name}`}>
                          <IoPencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="pc-act is-danger"
                          onClick={() => handleDeleteProduct(product.id, product.storeId)}
                          disabled={deleting === product.id}
                          aria-label={`حذف ${product.name}`}
                        >
                          {deleting === product.id ? <span className="pc-spin" /> : <IoTrash size={16} />}
                        </button>
                      </span>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

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
            {/* الأب — والقائمة تُصفّى مرّتين:
                • التصنيفات الفرعية لا تصلح آباءً (مستويان لا ثلاثة).
                • والتصنيف الذي يُعدَّل لا يكون أباً لنفسه.
                والذي له أبناء يُمنع من الخارج ويُرفض من الخادم كذلك. */}
            <label style={dynamicLabelStyle}>يتبع تصنيفاً رئيسياً؟</label>
            <select
              value={categoryForm.parentId}
              onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })}
              style={dynamicInputStyle}
            >
              <option value="">— تصنيف رئيسي —</option>
              {categories
                .filter((c) => !(c as any).parentId && c.id !== selectedCategory?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <p style={{ color: dynamicColors.muted, fontSize: 11.5, marginTop: 5, lineHeight: 1.75 }}>
              اختيار أبٍ يجعل هذا تصنيفاً فرعياً. واختيار تصنيفٍ رئيسيّ في
              المتجر يعرض منتجاته ومنتجات فرعيّاته معاً.
            </p>
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
            <label style={dynamicLabelStyle}>الوسوم</label>
            <TagsInput
              value={productForm.tags}
              onChange={(tags) => setProductForm({ ...productForm, tags })}
              suggestions={storeTags}
              colors={reorderColors}
            />
            <p style={{ color: dynamicColors.muted, fontSize: 11.5, marginTop: 6, lineHeight: 1.75 }}>
              يفرز بها الزبون في المتجر. ويمكن وسمُ منتجاتٍ كثيرة دفعةً
              واحدة من عمود «الوسوم» في ملفّ CSV.
            </p>
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
          <div>
            <ProductOptionsEditor
              value={productForm.options}
              onChange={(options) => setProductForm({ ...productForm, options })}
              productImages={productForm.images}
              colors={{
                card: dynamicColors.card,
                surf: dynamicColors.bg,
                accent: dynamicColors.accent,
                bg: dynamicColors.bg,
                text: dynamicColors.text,
                muted: dynamicColors.muted,
                border: dynamicColors.border,
                red: staticColors.red
              }}
            />
          </div>
          {/* «قريباً»: يظهر في المتجر بلا زرّ شراء، ويجمع «أعلمني حين يتوفّر» */}
          <div style={{ border: `1px dashed ${dynamicColors.border}`, borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={productForm.comingSoon}
                onChange={(e) => setProductForm({ ...productForm, comingSoon: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: dynamicColors.accent }}
              />
              <span style={{ color: dynamicColors.text, fontSize: 14, fontWeight: 600 }}>
                «قريباً» — اعرضه قبل طرحه واجمع من ينتظره
              </span>
            </label>
            {productForm.comingSoon && (
              <div>
                <label style={dynamicLabelStyle}>موعد التوفّر المتوقّع (اختياري)</label>
                <input
                  type="date"
                  value={productForm.availableAt}
                  onChange={(e) => setProductForm({ ...productForm, availableAt: e.target.value })}
                  style={dynamicInputStyle}
                />
                <p style={{ color: dynamicColors.muted, fontSize: 11.5, marginTop: 6, lineHeight: 1.75 }}>
                  حين تُطفئ «قريباً» وفي المخزون كميّة، يصل إشعارٌ تلقائيّ لكل من طلب «أعلمني».
                </p>
              </div>
            )}
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

      {/* ==================== من ينتظر المنتج ==================== */}
      <Modal
        isOpen={!!alertsProductId}
        onClose={() => setAlertsProductId(null)}
        title={`ينتظرون «${stockAlerts.products.find((e) => e.product?.id === alertsProductId)?.product?.name || ''}»`}
      >
        {(() => {
          const entry = stockAlerts.products.find((e) => e.product?.id === alertsProductId);
          if (!entry) return null;
          return (
            <div style={{ display: 'grid', gap: 10 }}>
              <p style={{ color: dynamicColors.muted, fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                يصل إشعارٌ تلقائيّ لأصحاب الحسابات والبريد حين يعود المنتج. من ترك رقم هاتفه وحده تواصل معه
                أنت — زرّ واتساب بجانب رقمه.
              </p>
              {entry.contacts.map((c: any) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: `1px solid ${dynamicColors.border}`,
                    opacity: c.notifiedAt ? 0.6 : 1
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
                    <b style={{ color: dynamicColors.text, fontSize: 13.5 }}>
                      {c.name || (c.registered ? 'زبون مسجَّل' : 'زائر')}
                    </b>
                    <span style={{ color: dynamicColors.muted, fontSize: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {c.email && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} dir="ltr">
                          <IoMailOutline size={13} /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} dir="ltr">
                          <IoCallOutline size={13} /> {c.phone}
                        </span>
                      )}
                    </span>
                    <span style={{ color: dynamicColors.muted, fontSize: 11.5 }}>
                      {c.notifiedAt ? 'أُبلغ ✓' : `طلب في ${new Date(c.createdAt).toLocaleDateString('ar-SY')}`}
                    </span>
                  </div>
                  {c.phone && (
                    <a
                      href={`https://wa.me/${String(c.phone).replace(/\D/g, '')}?text=${encodeURIComponent(
                        `مرحباً، «${entry.product?.name}» الذي طلبت أن نُعلمك به ${entry.product?.stock > 0 ? 'متوفّر الآن' : 'سيتوفّر قريباً'}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="مراسلة واتساب"
                      style={{ color: '#128C7E', display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, background: 'rgba(37,211,102,0.12)' }}
                    >
                      <IoLogoWhatsapp size={18} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </Modal>

    </div>
  );
};

export default StoreProductsPage;