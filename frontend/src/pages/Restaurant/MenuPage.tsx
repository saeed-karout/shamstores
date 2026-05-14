import React, { useState } from 'react';
import { useMenu } from '../../hooks/useMenu';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import { Category, MenuItem } from '../../services/types';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { IoAdd, IoPencil, IoTrash, IoEye, IoEyeOff, IoClose } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getImageUrl } from '@/utils/imageHelpers';

interface Size {
  name: string;
  price: number;
}

interface Addon {
  id: string;
  name: string;
  price: number;
}

const MenuPage: React.FC = () => {
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
  } = useMenu();

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
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    image: '',
  });

  const [itemForm, setItemForm] = useState({
    categoryId: '',
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    price: '',
    discountedPrice: '',
    image: '',
    preparationTime: '',
    calories: '',
    hasSizes: false,
    hasAddons: false,
  });

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      nameEn: '',
      description: '',
      descriptionEn: '',
      image: '',
    });
    setSelectedCategory(null);
  };

  const resetItemForm = () => {
    setItemForm({
      categoryId: '',
      name: '',
      nameEn: '',
      description: '',
      descriptionEn: '',
      price: '',
      discountedPrice: '',
      image: '',
      preparationTime: '',
      calories: '',
      hasSizes: false,
      hasAddons: false,
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
        .map(([id, addon]: [string, any]) => ({ 
          id, 
          name: addon.name, 
          price: Number(addon.price) 
        }))
        .filter(addon => addon.price > 0);
    } catch (e) {
      return [];
    }
  };

  const handleOpenCategoryModal = (category?: Category) => {
    if (isStaff) {
      toast.error('ليس لديك صلاحية لإدارة الفئات');
      return;
    }
    
    if (category) {
      setSelectedCategory(category);
      setCategoryForm({
        name: category.name,
        nameEn: category.nameEn || '',
        description: category.description || '',
        descriptionEn: category.descriptionEn || '',
        image: category.image || '',
      });
    }
    setShowCategoryModal(true);
  };

  const handleOpenItemModal = (item?: MenuItem) => {
    if (isStaff) {
      toast.error('ليس لديك صلاحية لإدارة العناصر');
      return;
    }
    
    if (item) {
      setSelectedItem(item);
      setItemForm({
        categoryId: item.categoryId,
        name: item.name,
        nameEn: item.nameEn || '',
        description: item.description || '',
        descriptionEn: item.descriptionEn || '',
        price: item.price.toString(),
        discountedPrice: item.discountedPrice?.toString() || '',
        image: item.image || '',
        preparationTime: item.preparationTime?.toString() || '',
        calories: item.calories?.toString() || '',
        hasSizes: item.hasSizes,
        hasAddons: item.hasAddons,
      });
      
      if (item.sizes) {
        const loadedSizes = Object.entries(item.sizes).map(([name, price]) => ({
          name,
          price: Number(price)
        }));
        setSizes(loadedSizes);
      } else {
        setSizes([
          { name: 'صغير', price: 0 },
          { name: 'وسط', price: 0 },
          { name: 'كبير', price: 0 }
        ]);
      }
      
      if (item.addons) {
        const loadedAddons = Object.entries(item.addons).map(([id, addon]: [string, any]) => ({
          id,
          name: addon.name,
          price: Number(addon.price)
        }));
        setAddons(loadedAddons);
      } else {
        setAddons([]);
      }
    } else {
      resetItemForm();
    }
    setShowItemModal(true);
  };

  const handleAddAddon = () => {
    if (!newAddonName || !newAddonPrice) {
      toast.error('يرجى إدخال اسم وسعر الإضافة');
      return;
    }
    
    const newAddon: Addon = {
      id: Date.now().toString(),
      name: newAddonName,
      price: parseFloat(newAddonPrice) || 0
    };
    
    setAddons([...addons, newAddon]);
    setNewAddonName('');
    setNewAddonPrice('');
  };

  const handleRemoveAddon = (id: string) => {
    setAddons(addons.filter(a => a.id !== id));
  };

  const handleSizeChange = (index: number, field: 'name' | 'price', value: string) => {
    const updatedSizes = [...sizes];
    if (field === 'price') {
      updatedSizes[index].price = parseFloat(value) || 0;
    } else {
      updatedSizes[index].name = value;
    }
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
        sizes.forEach(size => {
          if (size.name) {
            const price = size.price > 0 ? size.price : basePrice;
            sizesObject[size.name] = price;
          }
        });
      }

      const addonsObject: { [key: string]: { name: string; price: number } } = {};
      if (itemForm.hasAddons) {
        addons.forEach(addon => {
          if (addon.name && addon.price > 0) {
            addonsObject[addon.id] = {
              name: addon.name,
              price: addon.price
            };
          }
        });
      }

      const data = {
        ...itemForm,
        price: basePrice,
        discountedPrice: itemForm.discountedPrice ? parseFloat(itemForm.discountedPrice) : null,
        preparationTime: itemForm.preparationTime ? parseInt(itemForm.preparationTime) : null,
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
    if (isStaff) {
      toast.error('ليس لديك صلاحية لحذف الفئات');
      return;
    }
    
    if (window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
      try {
        await deleteCategory(id);
        toast.success('تم حذف الفئة بنجاح');
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'حدث خطأ');
      }
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (isStaff) {
      toast.error('ليس لديك صلاحية لحذف العناصر');
      return;
    }
    
    if (window.confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
      try {
        await deleteMenuItem(id);
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
      
      if (type === 'category') {
        setCategoryForm({ ...categoryForm, image: result.imageUrl });
      } else {
        setItemForm({ ...itemForm, image: result.imageUrl });
      }
      
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      toast.error('فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة القائمة</h1>
        {(isSuperAdmin || isOwner) && (
          <div className="flex space-x-2 rtl:space-x-reverse">
            <Button
              variant="primary"
              onClick={() => handleOpenCategoryModal()}
            >
              <IoAdd className="inline ml-1" />
              إضافة فئة
            </Button>
            <Button
              variant="success"
              onClick={() => handleOpenItemModal()}
            >
              <IoAdd className="inline ml-1" />
              إضافة عنصر
            </Button>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">الفئات</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{cat.name}</h3>
                  {cat.nameEn && <p className="text-sm text-gray-500">{cat.nameEn}</p>}
                </div>
                {(isSuperAdmin || isOwner) && (
                  <div className="flex space-x-2 rtl:space-x-reverse">
                    <button
                      onClick={() => handleOpenCategoryModal(cat)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <IoPencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <IoTrash size={18} />
                    </button>
                  </div>
                )}
              </div>
              {cat.image && (
                <img 
                  src={getImageUrl(cat.image)}
                  alt={cat.name}
                  className="w-full h-32 object-cover mt-2 rounded"
                />
              )}
              <p className="text-sm text-gray-600 mt-2">{cat.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                {menuItems.filter(i => i.categoryId === cat.id).length} عنصر
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">عناصر القائمة</h2>
        {loading ? (
          <Loader />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems && menuItems.length > 0 ? (
              menuItems.map((item) => {
                const basePrice = item.discountedPrice 
                  ? Number(item.discountedPrice) 
                  : Number(item.price);
                
                return (
                  <div key={item.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        {item.nameEn && <p className="text-sm text-gray-500">{item.nameEn}</p>}
                      </div>
                      <div className="flex space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => toggleAvailability(item.id)}
                          className={`${item.isAvailable ? 'text-green-500' : 'text-gray-400'} hover:opacity-75`}
                          title={item.isAvailable ? 'إخفاء' : 'إظهار'}
                        >
                          {item.isAvailable ? <IoEye size={18} /> : <IoEyeOff size={18} />}
                        </button>
                        {(isSuperAdmin || isOwner) && (
                          <>
                            <button
                              onClick={() => handleOpenItemModal(item)}
                              className="text-blue-500 hover:text-blue-700"
                              title="تعديل"
                            >
                              <IoPencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-500 hover:text-red-700"
                              title="حذف"
                            >
                              <IoTrash size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {item.image && (
                      <img 
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        className="w-full h-32 object-cover mt-2 rounded"
                      />
                    )}
                    
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.description}</p>
                    
                    {/* عرض المقاسات */}
                    {item.hasSizes && item.sizes && (
                      <div className="mt-2 text-xs">
                        <span className="font-medium text-gray-500">المقاسات:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Object.entries(
                            typeof item.sizes === 'string' ? JSON.parse(item.sizes) : item.sizes
                          ).map(([size, price]) => {
                            const priceNum = Number(price);
                            let priceColor = 'text-gray-600';
                            if (priceNum < basePrice) priceColor = 'text-green-600';
                            if (priceNum > basePrice) priceColor = 'text-blue-600';
                            
                            return (
                              <span key={size} className="bg-blue-50 px-2 py-1 rounded">
                                {size}: <span className={`font-bold ${priceColor}`}>{priceNum.toFixed(2)} ل.س</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* عرض الإضافات */}
                    {item.hasAddons && item.addons && (
                      <div className="mt-2 text-xs">
                        <span className="font-medium text-gray-500">الإضافات:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Object.entries(
                            typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons
                          ).map(([id, addon]: [string, any]) => (
                            <span key={id} className="bg-green-50 px-2 py-1 rounded">
                              {addon.name}: <span className="font-bold">{Number(addon.price).toFixed(2)} ل.س</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-3 pt-2 border-t">
                      <span className="text-sm text-gray-500">
                        {categories.find(c => c.id === item.categoryId)?.name || 'بدون فئة'}
                      </span>
                      <div className="text-left">
                        {item.discountedPrice && Number(item.discountedPrice) > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-green-600">
                              {Number(item.discountedPrice).toFixed(2)} ل.س
                            </span>
                            <span className="text-sm text-gray-400 line-through">
                              {Number(item.price).toFixed(2)} ل.س
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold">{Number(item.price).toFixed(2)} ل.س</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>مشاهدات: {item.viewsCount || 0}</span>
                      <span>طلبات: {item.ordersCount || 0}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                لا توجد عناصر في القائمة. أضف عنصراً جديداً!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal الفئات */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          resetCategoryForm();
        }}
        title={selectedCategory ? 'تعديل فئة' : 'إضافة فئة جديدة'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الفئة (عربي)</label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">اسم الفئة (إنجليزي)</label>
            <input
              type="text"
              value={categoryForm.nameEn}
              onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الوصف (عربي)</label>
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الوصف (إنجليزي)</label>
            <textarea
              value={categoryForm.descriptionEn}
              onChange={(e) => setCategoryForm({ ...categoryForm, descriptionEn: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الصورة</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'category')}
              className="w-full p-2 border rounded"
              disabled={uploading}
            />
            {uploading && <p className="text-sm text-blue-500 mt-1">جاري رفع الصورة...</p>}
            {categoryForm.image && (
              <img 
                src={getImageUrl(categoryForm.image)}
                alt="معاينة"
                className="w-32 h-32 object-cover mt-2 rounded"
              />
            )}
          </div>
          <Button
            variant="primary"
            onClick={handleSaveCategory}
            fullWidth
            loading={uploading}
          >
            حفظ
          </Button>
        </div>
      </Modal>

      {/* Modal العناصر */}
      <Modal
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false);
          resetItemForm();
        }}
        title={selectedItem ? 'تعديل عنصر' : 'إضافة عنصر جديد'}
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto p-2">
          <div>
            <label className="block text-sm font-medium mb-1">الفئة</label>
            <select
              value={itemForm.categoryId}
              onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">اختر الفئة</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">اسم العنصر (عربي)</label>
            <input
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">اسم العنصر (إنجليزي)</label>
            <input
              type="text"
              value={itemForm.nameEn}
              onChange={(e) => setItemForm({ ...itemForm, nameEn: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الوصف (عربي)</label>
            <textarea
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الوصف (إنجليزي)</label>
            <textarea
              value={itemForm.descriptionEn}
              onChange={(e) => setItemForm({ ...itemForm, descriptionEn: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">السعر الأساسي (ل.س)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                className="w-full p-2 border rounded"
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">السعر بعد الخصم (ل.س)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.discountedPrice}
                onChange={(e) => setItemForm({ ...itemForm, discountedPrice: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">وقت التحضير (دقيقة)</label>
              <input
                type="number"
                min="0"
                value={itemForm.preparationTime}
                onChange={(e) => setItemForm({ ...itemForm, preparationTime: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">السعرات الحرارية</label>
              <input
                type="number"
                min="0"
                value={itemForm.calories}
                onChange={(e) => setItemForm({ ...itemForm, calories: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الصورة</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'item')}
              className="w-full p-2 border rounded"
              disabled={uploading}
            />
            {uploading && <p className="text-sm text-blue-500 mt-1">جاري رفع الصورة...</p>}
            {itemForm.image && (
              <img 
                src={getImageUrl(itemForm.image)}
                alt="معاينة"
                className="w-32 h-32 object-cover mt-2 rounded"
              />
            )}
          </div>
          
          {/* خيار المقاسات */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={itemForm.hasSizes}
                  onChange={(e) => setItemForm({ ...itemForm, hasSizes: e.target.checked })}
                  className="ml-2"
                />
                <span className="font-medium">يوجد مقاسات مختلفة</span>
              </label>
            </div>
            
            {itemForm.hasSizes && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">تحديد المقاسات والأسعار</h4>
                <p className="text-xs text-blue-600 mb-2">
                  * اترك السعر 0 لاستخدام السعر الأساسي للمنتج ({Number(itemForm.price || 0).toFixed(2)} ل.س)
                </p>
                {sizes.map((size, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={size.name}
                      onChange={(e) => handleSizeChange(index, 'name', e.target.value)}
                      placeholder="اسم المقاس"
                      className="flex-1 p-2 border rounded"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={size.price}
                      onChange={(e) => handleSizeChange(index, 'price', e.target.value)}
                      placeholder="السعر"
                      className="w-32 p-2 border rounded"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* خيار الإضافات */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={itemForm.hasAddons}
                  onChange={(e) => setItemForm({ ...itemForm, hasAddons: e.target.checked })}
                  className="ml-2"
                />
                <span className="font-medium">يوجد إضافات</span>
              </label>
            </div>
            
            {itemForm.hasAddons && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">إضافة إضافات جديدة</h4>
                
                {addons.map((addon) => (
                  <div key={addon.id} className="flex items-center justify-between bg-white p-2 rounded border">
                    <div>
                      <span className="font-medium">{addon.name}</span>
                      <span className="mr-2 text-green-600">{addon.price} ل.س</span>
                    </div>
                    <button
                      onClick={() => handleRemoveAddon(addon.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <IoClose size={18} />
                    </button>
                  </div>
                ))}
                
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newAddonName}
                    onChange={(e) => setNewAddonName(e.target.value)}
                    placeholder="اسم الإضافة"
                    className="flex-1 p-2 border rounded"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newAddonPrice}
                    onChange={(e) => setNewAddonPrice(e.target.value)}
                    placeholder="السعر"
                    className="w-24 p-2 border rounded"
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddAddon}
                    size="sm"
                  >
                    إضافة
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <Button
            variant="primary"
            onClick={handleSaveItem}
            fullWidth
            loading={uploading}
          >
            حفظ العنصر
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MenuPage;