import React, { useEffect, useMemo, useState } from 'react';
import '@/styles/orders.css';
import '@/styles/catalog.css';
import { formatPrice } from '@/utils/currency';
import { useMenu } from '../../hooks/useMenu';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import { useRestaurant } from '../../hooks/useRestaurant';
import { Category, MenuItem } from '../../services/types';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoAdd, IoPencil, IoTrash, IoEye, IoEyeOff, IoClose, IoSearch, IoLayersOutline, IoImage } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getImageUrl } from '@/utils/imageHelpers';
import useUsdPricing from '@/hooks/useUsdPricing';
import UsdPriceFields from '@/components/pricing/UsdPriceFields';
import AiImportTool from '@/components/ai/AiImportTool';
import AiDescribeButton from '@/components/ai/AiDescribeButton';
import EnhanceImageButton from '@/components/ai/EnhanceImageButton';

const C = {
  bg:     '#F4F7F4',
  card:   '#FFFFFF',
  prim:   '#E8EFEA',
  surf:   '#F1F5F2',
  surfL:  '#E2EBE5',
  accent: '#084835',
  acDk:   '#06382A',
  text:   '#10231B',
  muted:  '#5F736A',
  border: 'rgba(8,72,53,0.15)',
  red:    '#D64545',
  blue:   '#2563EB',
  yellow: '#B45309',
  purple: '#8B45B5',
};

interface Size {
  name: string;
  price: number;
}

interface Addon {
  id: string;
  name: string;
  price: number;
}

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

const MenuPage: React.FC = () => {
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');

  const branchOptions = useMemo(() => {
    if (!restaurant) return [];

    return [
      {
        id: restaurant.id,
        name: restaurant.name,
        label: restaurant.branchLabel || restaurant.subdomain || restaurant.slug || restaurant.name,
      },
      ...(restaurant.linkedBranches || []).map((branch) => ({
        id: branch.id,
        name: branch.name,
        label: branch.linkLabel || branch.name,
      })),
    ];
  }, [restaurant]);

  useEffect(() => {
    if (restaurant && !selectedRestaurantId) {
      setSelectedRestaurantId(restaurant.id);
    }
  }, [restaurant, selectedRestaurantId]);

  const restaurantIdsForMenu = useMemo(() => {
    if (!selectedRestaurantId) return [];
    if (selectedRestaurantId === 'all') return branchOptions.map((branch) => branch.id);
    return [selectedRestaurantId];
  }, [selectedRestaurantId, branchOptions]);

  const {
    categories,
    menuItems,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleAvailability,
    refresh
  } = useMenu({ restaurantIds: restaurantIdsForMenu });

  const permissions = usePermissions();
  const { isSuperAdmin, isOwner, isStaff } = useAuth();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [uploading, setUploading] = useState(false);

  const [sizes, setSizes] = useState<Size[]>([
    { name: 'صغير', price: 0 },
    { name: 'وسط', price: 0 },
    { name: 'كبير', price: 0 }
  ]);

  const [addons, setAddons] = useState<Addon[]>([]);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');

  const [categoryForm, setCategoryForm] = useState({
    restaurantId: '',
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    image: '',
  });

  // التسعير بالدولار — حقلٌ منفصل عن `itemForm` كي لا يمسّ وضع الليرة
  const usdPricing = useUsdPricing();
  const [priceUsd, setPriceUsd] = useState('');
  // عنوان محرّكات البحث — يملؤه مساعد الوصف غالباً، ويعدّله التاجر
  const [seoTitle, setSeoTitle] = useState('');
  const [itemForm, setItemForm] = useState({
    restaurantId: '',
    categoryId: '',
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    price: '',
    discountedPrice: '',
    image: '',
    sku: '',
    trackStock: false,
    stock: '',
    minStockLevel: '',
    preparationTime: '',
    calories: '',
    hasSizes: false,
    hasAddons: false,
  });

  const resetCategoryForm = () => {
    setCategoryForm({ restaurantId: selectedRestaurantId === 'all' ? (restaurant?.id || '') : selectedRestaurantId, name: '', nameEn: '', description: '', descriptionEn: '', image: '' });
    setSelectedCategory(null);
  };

  const resetItemForm = () => {
    setPriceUsd('');
    setSeoTitle('');
    setItemForm({
      restaurantId: selectedRestaurantId === 'all' ? (restaurant?.id || '') : selectedRestaurantId,
      categoryId: '', name: '', nameEn: '', description: '', descriptionEn: '',
      price: '', discountedPrice: '', image: '', sku: '', preparationTime: '', calories: '',
      trackStock: false, stock: '', minStockLevel: '',
      hasSizes: false, hasAddons: false,
    });
    setSizes([
      { name: 'صغير', price: 0 },
      { name: 'وسط', price: 0 },
      { name: 'كبير', price: 0 }
    ]);
    setAddons([]);
    setNewAddonName('');
    setNewAddonPrice('');
    setSelectedItem(null);
  };

  const parseSizes = (sizes: any): { name: string; price: number }[] => {
    if (!sizes) return [];
    try {
      const sizesObj = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
      return Object.entries(sizesObj)
        .map(([name, price]) => ({ name, price: Number(price) }))
        .filter(size => size.price > 0);
    } catch (e) {
      return [];
    }
  };

  const parseAddons = (addons: any): { id: string; name: string; price: number }[] => {
    if (!addons) return [];
    try {
      const addonsObj = typeof addons === 'string' ? JSON.parse(addons) : addons;
      return Object.entries(addonsObj)
        .map(([id, addon]: [string, any]) => ({ id, name: addon.name, price: Number(addon.price) }))
        .filter(addon => addon.price > 0);
    } catch (e) {
      return [];
    }
  };

  const handleOpenCategoryModal = (category?: Category) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لإدارة الفئات'); return; }
    if (category) {
      setSelectedCategory(category);
      setCategoryForm({
        restaurantId: category.restaurantId,
        name: category.name, nameEn: category.nameEn || '',
        description: category.description || '', descriptionEn: category.descriptionEn || '',
        image: category.image || '',
      });
    }
    setShowCategoryModal(true);
  };

  const handleOpenItemModal = (item?: MenuItem) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لإدارة العناصر'); return; }
    if (item) {
      setSelectedItem(item);
      setSeoTitle((item as any).seoTitle || '');
      setPriceUsd((item as any).priceUsd != null ? String((item as any).priceUsd) : '');
      setItemForm({
        restaurantId: item.restaurantId,
        categoryId: item.categoryId, name: item.name, nameEn: item.nameEn || '',
        description: item.description || '', descriptionEn: item.descriptionEn || '',
        price: item.price.toString(), discountedPrice: item.discountedPrice?.toString() || '',
        image: item.image || '', sku: item.sku || '',
        trackStock: Boolean((item as any).trackStock),
        stock: (item as any).stock?.toString() || '',
        minStockLevel: (item as any).minStockLevel?.toString() || '',
        preparationTime: item.preparationTime?.toString() || '',
        calories: item.calories?.toString() || '', hasSizes: item.hasSizes, hasAddons: item.hasAddons,
      });
      if (item.sizes) {
        setSizes(Object.entries(item.sizes).map(([name, price]) => ({ name, price: Number(price) })));
      } else {
        setSizes([{ name: 'صغير', price: 0 }, { name: 'وسط', price: 0 }, { name: 'كبير', price: 0 }]);
      }
      if (item.addons) {
        setAddons(Object.entries(item.addons).map(([id, addon]: [string, any]) => ({ id, name: addon.name, price: Number(addon.price) })));
      } else {
        setAddons([]);
      }
    } else {
      resetItemForm();
    }
    setShowItemModal(true);
  };

  const handleAddAddon = () => {
    if (!newAddonName || !newAddonPrice) { toast.error('يرجى إدخال اسم وسعر الإضافة'); return; }
    setAddons([...addons, { id: Date.now().toString(), name: newAddonName, price: parseFloat(newAddonPrice) || 0 }]);
    setNewAddonName('');
    setNewAddonPrice('');
  };

  const handleRemoveAddon = (id: string) => setAddons(addons.filter(a => a.id !== id));

  const handleSizeChange = (index: number, field: 'name' | 'price', value: string) => {
    const updatedSizes = [...sizes];
    if (field === 'price') updatedSizes[index].price = parseFloat(value) || 0;
    else updatedSizes[index].name = value;
    setSizes(updatedSizes);
  };

  const handleSaveCategory = async () => {
    try {
      if (selectedCategory) {
        await updateCategory(selectedCategory.id, categoryForm);
        toast.success('تم تحديث الفئة بنجاح');
      } else {
        await createCategory(categoryForm);
        toast.success('تم إنشاء الفئة بنجاح');
      }
      setShowCategoryModal(false);
      resetCategoryForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleSaveItem = async () => {
    try {
      // بالدولار: الليرة معاينةٌ فقط، والخادم يعيد حسابها من `priceUsd`
      const usdSyp = usdPricing.isUsd ? usdPricing.preview(priceUsd) : null;
      if (!itemForm.name || !itemForm.categoryId || (usdPricing.isUsd ? !usdSyp : !itemForm.price)) {
        toast.error('يرجى إكمال جميع الحقول المطلوبة');
        return;
      }
      const basePrice = usdSyp ?? (parseFloat(itemForm.price) || 0);
      const sizesObject: { [key: string]: number } = {};
      if (itemForm.hasSizes) {
        sizes.forEach(size => { if (size.name) sizesObject[size.name] = size.price > 0 ? size.price : basePrice; });
      }
      const addonsObject: { [key: string]: { name: string; price: number } } = {};
      if (itemForm.hasAddons) {
        addons.forEach(addon => { if (addon.name && addon.price > 0) addonsObject[addon.id] = { name: addon.name, price: addon.price }; });
      }
      const data = {
        ...itemForm,
        seoTitle,
        restaurantId: itemForm.restaurantId || selectedRestaurantId,
        price: basePrice,
        discountedPrice: itemForm.discountedPrice ? parseFloat(itemForm.discountedPrice) : null,
        preparationTime: itemForm.preparationTime ? parseInt(itemForm.preparationTime) : null,
        trackStock: itemForm.trackStock,
        stock: itemForm.trackStock ? parseInt(itemForm.stock || '0') : null,
        minStockLevel: itemForm.trackStock ? parseInt(itemForm.minStockLevel || '5') : null,
        calories: itemForm.calories ? parseInt(itemForm.calories) : null,
        sizes: itemForm.hasSizes ? sizesObject : null,
        addons: itemForm.hasAddons ? addonsObject : null,
        ...(usdPricing.isUsd ? { priceUsd: parseFloat(priceUsd) } : {}),
      };
      if (!selectedItem && isOwner && menuItems.length >= permissions.getMaxItems()) {
        toast.error(`لقد تجاوزت الحد المسموح به من العناصر (${permissions.getMaxItems()})`);
        return;
      }
      if (selectedItem) {
        await updateMenuItem(selectedItem.id, data);
        toast.success('تم تحديث العنصر بنجاح');
      } else {
        await createMenuItem(data);
        toast.success('تم إنشاء العنصر بنجاح');
      }
      setShowItemModal(false);
      resetItemForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لحذف الفئات'); return; }
    if (window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
      try {
        const category = categories.find((cat) => cat.id === id);
        await deleteCategory(id, category?.restaurantId);
        toast.success('تم حذف الفئة بنجاح');
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'حدث خطأ');
      }
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (isStaff) { toast.error('ليس لديك صلاحية لحذف العناصر'); return; }
    if (window.confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
      try {
        const item = menuItems.find((menuItem) => menuItem.id === id);
        await deleteMenuItem(id, item?.restaurantId);
        toast.success('تم حذف العنصر بنجاح');
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'حدث خطأ');
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'category' | 'item') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.upload<{ imageUrl: string }>('/upload', file, type === 'category' ? 'categories' : 'items');
      if (type === 'category') setCategoryForm({ ...categoryForm, image: result.imageUrl });
      else setItemForm({ ...itemForm, image: result.imageUrl });
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      toast.error('فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const getBranchLabel = (restaurantId?: string) => {
    if (!restaurantId || !restaurant) return '';
    if (restaurantId === restaurant.id) return restaurant.branchLabel || restaurant.subdomain || restaurant.slug || restaurant.name;
    return restaurant.linkedBranches?.find((branch) => branch.id === restaurantId)?.linkLabel || '';
  };

  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [showCats, setShowCats] = useState(false);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (menuItems || []).filter(
      (i) =>
        (catFilter === 'all' || i.categoryId === catFilter) &&
        (!q || [i.name, i.nameEn].some((f) => (f || '').toLowerCase().includes(q)))
    );
  }, [menuItems, catFilter, query]);

  if (loading || restaurantLoading) return <Loader fullScreen variant="grid" />;

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
            placeholder="ابحث باسم الطبق"
            aria-label="بحث في القائمة"
          />
        </label>
        {branchOptions.length > 1 && (
          <select
            className="pc-select"
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
            aria-label="الفرع"
          >
            <option value={restaurant?.id || ''}>الفرع الحالي: {restaurant?.name || ''}</option>
            <option value="all">كل الفروع</option>
            {restaurant?.linkedBranches?.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        )}
        {(isSuperAdmin || isOwner) && (
          <div className="pc-toolbar-actions">
            <button
              type="button"
              className="ss-btn ss-btn-ghost"
              onClick={() => selectedRestaurantId === 'all' ? toast.error('اختر فرعاً محدداً لإضافة فئة') : handleOpenCategoryModal()}
              disabled={selectedRestaurantId === 'all'}
            >
              <IoAdd size={18} /> فئة
            </button>
            <button
              type="button"
              className="ss-btn ss-btn-primary"
              onClick={() => selectedRestaurantId === 'all' ? toast.error('اختر فرعاً محدداً لإضافة طبق') : handleOpenItemModal()}
              disabled={selectedRestaurantId === 'all'}
            >
              <IoAdd size={18} /> إضافة طبق
            </button>
          </div>
        )}
      </div>

      {/* ===== الفئات: شريط تصفية، وإدارتها عند الطلب ===== */}
      <div className="pc-cats">
        <div className="ob-tabs" role="tablist" aria-label="تصفية حسب الفئة">
          <button type="button" role="tab" className="ob-tab" aria-selected={catFilter === 'all'} onClick={() => setCatFilter('all')}>
            الكل <span>{menuItems.length}</span>
          </button>
          {categories.map((cat) => (
            <button key={cat.id} type="button" role="tab" className="ob-tab" aria-selected={catFilter === cat.id} onClick={() => setCatFilter(cat.id)}>
              {cat.name} <span>{menuItems.filter((i) => i.categoryId === cat.id).length}</span>
            </button>
          ))}
        </div>
        {(isSuperAdmin || isOwner) && categories.length > 0 && (
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
              <p>{categories.length ? `${categories.length} فئة في قائمتك` : 'الفئات أقسام قائمتك: مقبلات، مشاوي، حلويات…'}</p>
            </div>
          </header>
          {categories.length === 0 ? (
            <div className="ob-empty">
              <b>لا فئات بعد</b>
              <p>أنشئ فئتك الأولى ثم أضف أطباقك إليها.</p>
              {(isSuperAdmin || isOwner) && (
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
                      {menuItems.filter((i) => i.categoryId === cat.id).length} طبق
                      {getBranchLabel(cat.restaurantId) ? ` · ${getBranchLabel(cat.restaurantId)}` : ''}
                    </small>
                  </span>
                  {(isSuperAdmin || isOwner) && (
                    <span className="pc-actions">
                      <button type="button" className="pc-act" onClick={() => handleOpenCategoryModal(cat)} aria-label={`تعديل ${cat.name}`}>
                        <IoPencil size={16} />
                      </button>
                      <button type="button" className="pc-act is-danger" onClick={() => handleDeleteCategory(cat.id)} aria-label={`حذف ${cat.name}`}>
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

      {/* ===== الأطباق ===== */}
      <section aria-labelledby="items-title">
        <div className="pc-section-head">
          <h2 id="items-title">
            {catFilter === 'all' ? 'كلّ الأطباق' : categories.find((c) => c.id === catFilter)?.name || 'الأطباق'}
            <span>{visibleItems.length}</span>
          </h2>
          {(isSuperAdmin || isOwner) && (
            <div className="pc-section-tools">
              <AiImportTool
                kind="restaurant"
                colors={{ text: C.text, muted: C.muted, card: C.card, surface: C.surf, border: C.border, accent: C.accent, bg: C.bg }}
                onDone={refresh}
                branchId={selectedRestaurantId && selectedRestaurantId !== 'all' ? selectedRestaurantId : undefined}
                categories={categories.map((c) => c.name)}
              />
            </div>
          )}
        </div>

        {visibleItems.length === 0 ? (
          <div className="ss-card">
            <div className="ob-empty">
              <b>{menuItems.length === 0 ? 'قائمتك فارغة' : 'لا أطباق تطابق البحث'}</b>
              <p>{menuItems.length === 0 ? 'أضف طبقك الأوّل بصورةٍ شهيّة وسعر — ويظهر لزبائنك فوراً.' : 'جرّب كلمةً أخرى أو فئةً أخرى.'}</p>
              {menuItems.length === 0 && (isSuperAdmin || isOwner) && categories.length > 0 && (
                <button type="button" onClick={() => handleOpenItemModal()}>إضافة طبق</button>
              )}
            </div>
          </div>
        ) : (
          <div className="pc-grid">
            {visibleItems.map((item) => {
              const sale = item.discountedPrice && Number(item.discountedPrice) > 0 ? Number(item.discountedPrice) : null;
              const sizesCount = item.hasSizes && item.sizes ? Object.keys(typeof item.sizes === 'string' ? JSON.parse(item.sizes) : item.sizes).length : 0;
              const addonsCount = item.hasAddons && item.addons ? Object.keys(typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons).length : 0;
              const extras = [sizesCount ? `${sizesCount} أحجام` : '', addonsCount ? `${addonsCount} إضافات` : ''].filter(Boolean).join(' · ');
              return (
                <article key={item.id} className={`pc-card ${item.isAvailable ? '' : 'is-hidden'}`}>
                  <div className="pc-media">
                    {item.image ? (
                      <img src={getImageUrl(item.image)} alt={item.name} loading="lazy" />
                    ) : (
                      <span className="pc-noimg"><IoImage size={30} /> بلا صورة</span>
                    )}
                    <span className="pc-badges">
                      {sale !== null && <span className="pc-badge is-sale">عرض</span>}
                      {!item.isAvailable && <span className="pc-badge is-dark">مخفيّ</span>}
                    </span>
                  </div>

                  <div className="pc-body">
                    <span className="pc-cat">{categories.find((c) => c.id === item.categoryId)?.name || 'بدون فئة'}</span>
                    <h3>{item.name}</h3>
                    {getBranchLabel(item.restaurantId) && selectedRestaurantId === 'all' && <small className="pc-branch">{getBranchLabel(item.restaurantId)}</small>}
                    <div className="pc-price">
                      <strong>{formatPrice(sale ?? Number(item.price))}</strong>
                      {sale !== null && <s>{formatPrice(Number(item.price))}</s>}
                    </div>
                    {extras && <small className="pc-extras">{extras}</small>}
                    <small className="pc-meta">
                      {item.ordersCount || 0} طلب · {item.viewsCount || 0} مشاهدة
                    </small>
                  </div>

                  <footer className="pc-foot">
                    <button
                      type="button"
                      className={`pc-toggle ${item.isAvailable ? 'is-on' : ''}`}
                      role="switch"
                      aria-checked={item.isAvailable}
                      onClick={() => toggleAvailability(item.id, item.restaurantId)}
                      title={item.isAvailable ? 'متوفّر — اضغط لإخفائه' : 'مخفيّ — اضغط لإظهاره'}
                    >
                      <span className="pc-toggle-track"><span /></span>
                      <span className="pc-toggle-text">{item.isAvailable ? 'متوفّر' : 'مخفيّ'}</span>
                    </button>
                    {(isSuperAdmin || isOwner) && (
                      <span className="pc-actions">
                        <button type="button" className="pc-act" onClick={() => handleOpenItemModal(item)} aria-label={`تعديل ${item.name}`}>
                          <IoPencil size={16} />
                        </button>
                        <button type="button" className="pc-act is-danger" onClick={() => handleDeleteItem(item.id)} aria-label={`حذف ${item.name}`}>
                          <IoTrash size={16} />
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

      {/* Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => { setShowCategoryModal(false); resetCategoryForm(); }}
        title={selectedCategory ? 'تعديل فئة' : 'إضافة فئة جديدة'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>اسم الفئة (عربي)</label>
            <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>اسم الفئة (إنجليزي)</label>
            <input type="text" value={categoryForm.nameEn} onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>الوصف (عربي)</label>
            <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
          </div>
          <div>
            <label style={labelStyle}>الوصف (إنجليزي)</label>
            <textarea value={categoryForm.descriptionEn} onChange={(e) => setCategoryForm({ ...categoryForm, descriptionEn: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
          </div>
          <div>
            <label style={labelStyle}>الصورة</label>
            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'category')} style={inputStyle} disabled={uploading} />
            {uploading && <p style={{ fontSize: 13, color: C.accent, marginTop: 4 }}>جاري رفع الصورة...</p>}
            {categoryForm.image && <img src={getImageUrl(categoryForm.image)} alt="معاينة" style={{ width: 128, height: 128, objectFit: 'cover', marginTop: 8, borderRadius: 8 }} />}
          </div>
          <button
            onClick={handleSaveCategory}
            disabled={uploading}
            style={{ background: C.accent, color: C.bg, padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: 15 }}
          >
            حفظ
          </button>
        </div>
      </Modal>

      {/* Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => { setShowItemModal(false); resetItemForm(); }}
        title={selectedItem ? 'تعديل عنصر' : 'إضافة عنصر جديد'}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto', paddingLeft: 4, paddingRight: 4 }}>
          <div>
            <label style={labelStyle}>الفئة</label>
            <select value={itemForm.categoryId} onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })} style={{ ...inputStyle, appearance: 'none' }} required>
              <option value="" style={{ background: C.surf }}>اختر الفئة</option>
              {categories.map(cat => <option key={cat.id} value={cat.id} style={{ background: C.surf }}>{cat.name}{getBranchLabel(cat.restaurantId) ? ` • ${getBranchLabel(cat.restaurantId)}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>اسم العنصر (عربي)</label>
            <input type="text" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>اسم العنصر (إنجليزي)</label>
            <input type="text" value={itemForm.nameEn} onChange={(e) => setItemForm({ ...itemForm, nameEn: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <AiDescribeButton
              name={itemForm.name}
              price={itemForm.price}
              category={categories.find((c) => c.id === itemForm.categoryId)?.name || null}
              notes={itemForm.description}
              imageUrl={itemForm.image || null}
              hasExisting={!!(itemForm.description.trim() || itemForm.descriptionEn.trim())}
              onApply={(copy) => {
                setItemForm((f) => ({ ...f, description: copy.description, descriptionEn: copy.descriptionEn, nameEn: f.nameEn || copy.nameEn }));
                if (copy.seoTitle) setSeoTitle(copy.seoTitle);
              }}
              plansHref="/plans"
              colors={C}
            />
          </div>
          <div>
            <label style={labelStyle}>الوصف (عربي)</label>
            <textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
          </div>
          <div>
            <label style={labelStyle}>الوصف (إنجليزي)</label>
            <textarea value={itemForm.descriptionEn} onChange={(e) => setItemForm({ ...itemForm, descriptionEn: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
          </div>
          <div>
            <label style={labelStyle}>عنوان الصفحة في محرّكات البحث</label>
            <input type="text" maxLength={90} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} style={inputStyle} placeholder={`${itemForm.name || 'اسم الصنف'} | ${restaurant?.name || 'مطعمك'}`} />
          </div>
          {usdPricing.isUsd && usdPricing.config ? (
            <UsdPriceFields
              config={usdPricing.config}
              preview={usdPricing.preview}
              priceUsd={priceUsd}
              onChange={(next) => next.priceUsd !== undefined && setPriceUsd(next.priceUsd)}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              colors={C}
              showOriginal={false}
            />
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>السعر الأساسي (ل.س)</label>
              <input type="number" step="0.01" min="0" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} style={inputStyle} placeholder="0.00" required />
            </div>
            <div>
              <label style={labelStyle}>السعر بعد الخصم (ل.س)</label>
              <input type="number" step="0.01" min="0" value={itemForm.discountedPrice} onChange={(e) => setItemForm({ ...itemForm, discountedPrice: e.target.value })} style={inputStyle} placeholder="0.00" />
            </div>
          </div>
          )}
          <div>
            <label style={labelStyle}>رمز الصنف / الباركود</label>
            <input
              type="text"
              value={itemForm.sku}
              onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
              style={{ ...inputStyle, fontFamily: 'monospace' }}
              placeholder="امسح الباركود أو اكتبه — اتركه فارغاً إن لم يكن للصنف رمز"
              autoComplete="off"
            />
            <p style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
              هذا ما يبحث عنه الكاشير حين تمسح الباركود. اتركه فارغاً للوجبات
              المحضَّرة التي لا باركود لها.
            </p>
          </div>
          {/* تتبّع المخزون: **اختياريّ لكل صنف**. الشاورما تُحضَّر عند الطلب
              فلا مخزون لها، وعلبة البيبسي لها عدد. وتفعيلُه للجميع كان
              سيُظهر كل الوجبات «نفدت» فور التفعيل. */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={itemForm.trackStock}
                onChange={(e) => setItemForm({ ...itemForm, trackStock: e.target.checked })}
                style={{ accentColor: C.accent, width: 17, height: 17 }}
              />
              <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>
                تتبّع المخزون لهذا الصنف
              </span>
            </label>
            <p style={{ color: C.muted, fontSize: 12, margin: '6px 0 0', lineHeight: 1.8 }}>
              فعّله للمعلّبات والمشروبات الجاهزة. اتركه مطفأً للوجبات التي
              تُحضَّر عند الطلب — وإلا ظهرت «نفدت» عند أوّل بيعة.
            </p>

            {itemForm.trackStock && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label style={labelStyle}>الكمية المتوفّرة</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.stock}
                    onChange={(e) => setItemForm({ ...itemForm, stock: e.target.value })}
                    style={inputStyle}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={labelStyle}>حدّ التنبيه</label>
                  <input
                    type="number"
                    min="1"
                    value={itemForm.minStockLevel}
                    onChange={(e) => setItemForm({ ...itemForm, minStockLevel: e.target.value })}
                    style={inputStyle}
                    placeholder="5"
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>وقت التحضير (دقيقة)</label>
              <input type="number" min="0" value={itemForm.preparationTime} onChange={(e) => setItemForm({ ...itemForm, preparationTime: e.target.value })} style={inputStyle} placeholder="30" />
            </div>
            <div>
              <label style={labelStyle}>السعرات الحرارية</label>
              <input type="number" min="0" value={itemForm.calories} onChange={(e) => setItemForm({ ...itemForm, calories: e.target.value })} style={inputStyle} placeholder="500" />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>الصورة</label>
              <EnhanceImageButton
                imageUrl={itemForm.image || null}
                colors={C}
                onEnhanced={async (file) => {
                  const result = await api.upload<{ imageUrl: string }>('/upload', file, 'items');
                  setItemForm((f) => ({ ...f, image: result.imageUrl }));
                }}
              />
            </div>
            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'item')} style={inputStyle} disabled={uploading} />
            {uploading && <p style={{ fontSize: 13, color: C.accent, marginTop: 4 }}>جاري رفع الصورة...</p>}
            {itemForm.image && <img src={getImageUrl(itemForm.image)} alt="معاينة" style={{ width: 128, height: 128, objectFit: 'cover', marginTop: 8, borderRadius: 8 }} />}
          </div>

          {/* Sizes */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={itemForm.hasSizes} onChange={(e) => setItemForm({ ...itemForm, hasSizes: e.target.checked })} style={{ accentColor: C.accent }} />
              <span style={{ fontWeight: 500, color: C.text }}>يوجد مقاسات مختلفة</span>
            </label>
            {itemForm.hasSizes && (
              <div style={{ background: C.surf, borderRadius: 12, padding: 16, marginTop: 12 }}>
                <h4 style={{ fontWeight: 500, color: C.text, marginBottom: 8 }}>تحديد المقاسات والأسعار</h4>
                <p style={{ fontSize: 12, color: C.accent, marginBottom: 8 }}>
                  * اترك السعر 0 لاستخدام السعر الأساسي ({formatPrice(Number(itemForm.price || 0))})
                </p>
                {sizes.map((size, index) => (
                  <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input type="text" value={size.name} onChange={(e) => handleSizeChange(index, 'name', e.target.value)} placeholder="اسم المقاس" style={{ ...inputStyle, flex: 1 }} />
                    <input type="number" step="0.01" min="0" value={size.price} onChange={(e) => handleSizeChange(index, 'price', e.target.value)} placeholder="السعر" style={{ ...inputStyle, width: 100, flex: 'none' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Addons */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={itemForm.hasAddons} onChange={(e) => setItemForm({ ...itemForm, hasAddons: e.target.checked })} style={{ accentColor: C.accent }} />
              <span style={{ fontWeight: 500, color: C.text }}>يوجد إضافات</span>
            </label>
            {itemForm.hasAddons && (
              <div style={{ background: C.surf, borderRadius: 12, padding: 16, marginTop: 12 }}>
                <h4 style={{ fontWeight: 500, color: C.text, marginBottom: 12 }}>إضافة إضافات جديدة</h4>
                {addons.map((addon) => (
                  <div key={addon.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surfL, padding: '8px 12px', borderRadius: 8, marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 500, color: C.text }}>{addon.name}</span>
                      <span style={{ marginRight: 8, color: C.accent }}>{addon.price} ل.س</span>
                    </div>
                    <button onClick={() => handleRemoveAddon(addon.id)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}>
                      <IoClose size={18} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input type="text" value={newAddonName} onChange={(e) => setNewAddonName(e.target.value)} placeholder="اسم الإضافة" style={{ ...inputStyle, flex: 1 }} />
                  <input type="number" step="0.01" min="0" value={newAddonPrice} onChange={(e) => setNewAddonPrice(e.target.value)} placeholder="السعر" style={{ ...inputStyle, width: 90, flex: 'none' }} />
                  <button onClick={handleAddAddon} style={{ background: C.surfL, border: `1px solid ${C.border}`, color: C.text, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    إضافة
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSaveItem}
            disabled={uploading}
            style={{ background: C.accent, color: C.bg, padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', width: '100%', fontSize: 15 }}
          >
            حفظ العنصر
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default MenuPage;
