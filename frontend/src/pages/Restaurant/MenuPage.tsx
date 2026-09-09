import React, { useEffect, useMemo, useState } from 'react';
import { useMenu } from '../../hooks/useMenu';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import { useRestaurant } from '../../hooks/useRestaurant';
import { Category, MenuItem } from '../../services/types';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoAdd, IoPencil, IoTrash, IoEye, IoEyeOff, IoClose } from 'react-icons/io5';
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
      if (!itemForm.name || !itemForm.price || !itemForm.categoryId) {
        toast.error('يرجى إكمال جميع الحقول المطلوبة');
        return;
      }
      const basePrice = parseFloat(itemForm.price) || 0;
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

  if (loading || restaurantLoading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, direction: 'rtl', color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>إدارة القائمة</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {branchOptions.length > 0 && (
            <select
              value={selectedRestaurantId}
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
              style={{ background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', minWidth: 220 }}
            >
              <option value={restaurant?.id || ''}>الفرع الحالي: {restaurant?.name || ''}</option>
              <option value="all">كل الفروع</option>
              {restaurant?.linkedBranches?.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          )}
          {(isSuperAdmin || isOwner) && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => selectedRestaurantId === 'all' ? toast.error('اختر فرعاً محدداً لإضافة فئة') : handleOpenCategoryModal()}
                disabled={selectedRestaurantId === 'all'}
                style={{ background: C.surf, border: `1px solid ${C.border}`, color: C.text, padding: '8px 16px', borderRadius: 10, cursor: selectedRestaurantId === 'all' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, opacity: selectedRestaurantId === 'all' ? 0.6 : 1 }}
              >
                <IoAdd /> إضافة فئة
              </button>
              <button
                onClick={() => selectedRestaurantId === 'all' ? toast.error('اختر فرعاً محدداً لإضافة عنصر') : handleOpenItemModal()}
                disabled={selectedRestaurantId === 'all'}
                style={{ background: C.accent, color: C.bg, padding: '8px 16px', borderRadius: 10, cursor: selectedRestaurantId === 'all' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, border: 'none', opacity: selectedRestaurantId === 'all' ? 0.7 : 1 }}
              >
                <IoAdd /> إضافة عنصر
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Categories */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 16 }}>الفئات</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontWeight: 600, color: C.text, margin: 0 }}>{cat.name}</h3>
                  {cat.nameEn && <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>{cat.nameEn}</p>}
                  {getBranchLabel(cat.restaurantId) && <p style={{ fontSize: 12, color: C.accent, margin: '4px 0 0' }}>{getBranchLabel(cat.restaurantId)}</p>}
                </div>
                {(isSuperAdmin || isOwner) && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleOpenCategoryModal(cat)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', padding: 4 }}>
                      <IoPencil size={18} />
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 4 }}>
                      <IoTrash size={18} />
                    </button>
                  </div>
                )}
              </div>
              {cat.image && (
                <img src={getImageUrl(cat.image)} alt={cat.name} style={{ width: '100%', height: 120, objectFit: 'cover', marginTop: 12, borderRadius: 8 }} />
              )}
              <p style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>{cat.description}</p>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 4, opacity: 0.7 }}>
                {menuItems.filter(i => i.categoryId === cat.id).length} عنصر
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 16 }}>عناصر القائمة</h2>
        {loading ? (
          <Loader />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {menuItems && menuItems.length > 0 ? (
              menuItems.map((item) => {
                const basePrice = item.discountedPrice ? Number(item.discountedPrice) : Number(item.price);
                return (
                  <div key={item.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontWeight: 600, color: C.text, margin: 0 }}>{item.name}</h3>
                        {item.nameEn && <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>{item.nameEn}</p>}
                        {getBranchLabel(item.restaurantId) && <p style={{ fontSize: 12, color: C.accent, margin: '4px 0 0' }}>{getBranchLabel(item.restaurantId)}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => toggleAvailability(item.id, item.restaurantId)}
                          style={{ background: 'none', border: 'none', color: item.isAvailable ? C.accent : C.muted, cursor: 'pointer', padding: 4 }}
                          title={item.isAvailable ? 'إخفاء' : 'إظهار'}
                        >
                          {item.isAvailable ? <IoEye size={18} /> : <IoEyeOff size={18} />}
                        </button>
                        {(isSuperAdmin || isOwner) && (
                          <>
                            <button onClick={() => handleOpenItemModal(item)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', padding: 4 }}>
                              <IoPencil size={18} />
                            </button>
                            <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 4 }}>
                              <IoTrash size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {item.image && (
                      <img src={getImageUrl(item.image)} alt={item.name} style={{ width: '100%', height: 120, objectFit: 'cover', marginTop: 12, borderRadius: 8 }} />
                    )}

                    <p style={{ fontSize: 13, color: C.muted, marginTop: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </p>

                    {item.hasSizes && item.sizes && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>المقاسات:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {Object.entries(typeof item.sizes === 'string' ? JSON.parse(item.sizes) : item.sizes).map(([size, price]) => {
                            const priceNum = Number(price);
                            const priceColor = priceNum < basePrice ? C.accent : priceNum > basePrice ? C.blue : C.muted;
                            return (
                              <span key={size} style={{ background: C.surfL, padding: '2px 8px', borderRadius: 6, fontSize: 12, color: C.text }}>
                                {size}: <span style={{ fontWeight: 700, color: priceColor }}>{priceNum.toFixed(2)} ل.س</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {item.hasAddons && item.addons && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>الإضافات:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {Object.entries(typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons).map(([id, addon]: [string, any]) => (
                            <span key={id} style={{ background: C.prim, padding: '2px 8px', borderRadius: 6, fontSize: 12, color: C.text }}>
                              {addon.name}: <span style={{ fontWeight: 700 }}>{Number(addon.price).toFixed(2)} ل.س</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 13, color: C.muted }}>
                        {categories.find(c => c.id === item.categoryId)?.name || 'بدون فئة'}
                      </span>
                      <div>
                        {item.discountedPrice && Number(item.discountedPrice) > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: C.accent }}>{Number(item.discountedPrice).toFixed(2)} ل.س</span>
                            <span style={{ fontSize: 12, color: C.muted, textDecoration: 'line-through' }}>{Number(item.price).toFixed(2)} ل.س</span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 700, color: C.text }}>{Number(item.price).toFixed(2)} ل.س</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginTop: 6, opacity: 0.7 }}>
                      <span>مشاهدات: {item.viewsCount || 0}</span>
                      <span>طلبات: {item.ordersCount || 0}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '32px 0', color: C.muted }}>
                لا توجد عناصر في القائمة. أضف عنصراً جديداً!
              </div>
            )}
          </div>
        )}
      </div>

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
          <div>
            <label style={labelStyle}>الوصف (عربي)</label>
            <textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
          </div>
          <div>
            <label style={labelStyle}>الوصف (إنجليزي)</label>
            <textarea value={itemForm.descriptionEn} onChange={(e) => setItemForm({ ...itemForm, descriptionEn: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
          </div>
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
            <label style={labelStyle}>الصورة</label>
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
                  * اترك السعر 0 لاستخدام السعر الأساسي ({Number(itemForm.price || 0).toFixed(2)} ل.س)
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
