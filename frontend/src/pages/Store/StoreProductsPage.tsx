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
  
  // نموذج الفئة
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    image: '',
  });

  // نموذج المنتج
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
      const [categoriesData, productsData] = await Promise.all([
        api.get('/store/categories'),
        api.get('/store/products')
      ]);
      
      // ✅ تحويل الأسعار إلى أرقام
      const processedProducts = (productsData || []).map((product: any) => ({
        ...product,
        price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
        discountedPrice: product.discountedPrice ? (typeof product.discountedPrice === 'string' ? parseFloat(product.discountedPrice) : product.discountedPrice) : null,
      }));
      
      setCategories(categoriesData || []);
      setProducts(processedProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

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

  const resetProductForm = () => {
    setProductForm({
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
    setSelectedProduct(null);
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
    } else {
      resetCategoryForm();
    }
    setShowCategoryModal(true);
  };

  const handleOpenProductModal = (product?: Product) => {
    if (isStaff) {
      toast.error('ليس لديك صلاحية لإدارة المنتجات');
      return;
    }
    
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
    } else {
      resetProductForm();
    }
    setShowProductModal(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (!categoryForm.name) {
        toast.error('اسم الفئة مطلوب');
        return;
      }

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
      if (!productForm.name) {
        toast.error('اسم المنتج مطلوب');
        return;
      }
      
      if (!productForm.price || parseFloat(productForm.price) <= 0) {
        toast.error('السعر مطلوب ويجب أن يكون أكبر من 0');
        return;
      }

      const price = parseFloat(productForm.price);
      if (isNaN(price) || price <= 0) {
        toast.error('السعر يجب أن يكون رقماً صحيحاً أكبر من 0');
        return;
      }

      const data = {
        ...productForm,
        price: price,
        discountedPrice: productForm.discountedPrice ? parseFloat(productForm.discountedPrice) : null,
        stock: parseInt(productForm.stock) || 0,
      };

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
    if (isStaff) {
      toast.error('ليس لديك صلاحية لحذف الفئات');
      return;
    }
    
    const productsInCategory = products.filter(p => p.categoryId === id);
    if (productsInCategory.length > 0) {
      toast.error(`لا يمكن حذف الفئة لأنها تحتوي على ${productsInCategory.length} منتج`);
      return;
    }
    
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
    if (isStaff) {
      toast.error('ليس لديك صلاحية لحذف المنتجات');
      return;
    }
    
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
      console.error('Error toggling availability:', error);
      toast.error('حدث خطأ');
    }
  };


const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'category' | 'product') => {
  const file = e.target.files?.[0];
  if (!file) return;

  // التحقق من نوع الملف
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('يسمح فقط بصور JPG, PNG, GIF, WEBP');
    e.target.value = '';
    return;
  }

  // التحقق من حجم الملف (10MB)
  if (file.size > 10 * 1024 * 1024) {
    toast.error('حجم الصورة يجب أن يكون أقل من 10 ميجابايت');
    e.target.value = '';
    return;
  }

  setUploading(true);
  const formData = new FormData();
  formData.append('image', file);
  
  // تحديد نوع الصورة
  if (type === 'category') {
    formData.append('type', 'categories');
    if (selectedCategory) {
      formData.append('id', selectedCategory.id);
    }
  } else {
    formData.append('type', 'products');
    if (selectedProduct) {
      formData.append('id', selectedProduct.id);
    }
  }

  try {
    const response = await api.upload<{ imageUrl: string }>('/upload', file, type === 'category' ? 'categories' : 'products');
    
    if (type === 'category') {
      setCategoryForm({ ...categoryForm, image: response.imageUrl });
    } else {
      setProductForm({ ...productForm, imageUrl: response.imageUrl });
    }
    toast.success('تم رفع الصورة بنجاح');
  } catch (error: any) {
    console.error('Upload error:', error);
    toast.error(error.response?.data?.error || 'فشل رفع الصورة');
  } finally {
    setUploading(false);
    e.target.value = '';
  }
};

  const removeImage = (type: 'category' | 'product') => {
    if (type === 'category') {
      setCategoryForm({ ...categoryForm, image: '' });
    } else {
      setProductForm({ ...productForm, imageUrl: '' });
    }
    toast.success('تم إزالة الصورة');
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { text: 'نفد من المخزون', color: 'bg-red-100 text-red-800', icon: '🔴' };
    if (stock <= 5) return { text: 'مخزون منخفض', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' };
    if (stock <= 20) return { text: 'مخزون متوسط', color: 'bg-blue-100 text-blue-800', icon: '🔵' };
    return { text: 'مخزون جيد', color: 'bg-green-100 text-green-800', icon: '🟢' };
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'بدون فئة';
  };

  if (loading || storeLoading) return <Loader fullScreen />;

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">📦 إدارة منتجات المتجر</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة الفئات والمنتجات في متجرك</p>
        </div>
        {(isSuperAdmin || isStoreOwner) && (
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => handleOpenCategoryModal()}
              className="shadow-sm"
            >
              <IoAdd className="inline ml-1" size={18} />
              إضافة فئة
            </Button>
            <Button
              variant="success"
              onClick={() => handleOpenProductModal()}
              className="shadow-sm"
            >
              <IoAdd className="inline ml-1" size={18} />
              إضافة منتج
            </Button>
          </div>
        )}
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-blue-500">
          <p className="text-gray-500 text-sm">إجمالي الفئات</p>
          <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-green-500">
          <p className="text-gray-500 text-sm">إجمالي المنتجات</p>
          <p className="text-2xl font-bold text-green-600">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-yellow-500">
          <p className="text-gray-500 text-sm">منتجات غير متوفرة</p>
          <p className="text-2xl font-bold text-yellow-600">{products.filter(p => !p.isAvailable).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-red-500">
          <p className="text-gray-500 text-sm">نفد من المخزون</p>
          <p className="text-2xl font-bold text-red-600">{products.filter(p => p.stock === 0).length}</p>
        </div>
      </div>

      {/* عرض الفئات */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
            الفئات
          </h2>
          <span className="text-sm text-gray-500">{categories.length} فئة</span>
        </div>
        
        {categories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <IoCube className="text-gray-300 text-5xl mx-auto mb-3" />
            <p className="text-gray-500">لا توجد فئات. أضف فئة جديدة!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-200 group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 line-clamp-1">{cat.name}</h3>
                    {cat.nameEn && <p className="text-xs text-gray-400 line-clamp-1">{cat.nameEn}</p>}
                  </div>
                  {(isSuperAdmin || isStoreOwner) && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenCategoryModal(cat)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        title="تعديل"
                      >
                        <IoPencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="حذف"
                      >
                        <IoTrash size={16} />
                      </button>
                    </div>
                  )}
                </div>
                {cat.image && (
                  <div className="relative mt-3">
                    <img 
                      src={getImageUrl(cat.image)}
                      alt={cat.name}
                      className="w-full h-28 object-cover rounded-lg"
                    />
                  </div>
                )}
                {cat.description && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{cat.description}</p>
                )}
                <div className="mt-3 pt-2 border-t flex justify-between items-center">
                  <p className="text-xs text-gray-400">
                    {products.filter(p => p.categoryId === cat.id).length} منتج
                  </p>
                  <span className="text-xs text-green-600">🟢 نشط</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* عرض المنتجات */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="w-1 h-6 bg-green-500 rounded-full"></span>
            المنتجات
          </h2>
          <span className="text-sm text-gray-500">{products.length} منتج</span>
        </div>
        
        {loading ? (
          <Loader />
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <IoCube className="text-gray-300 text-5xl mx-auto mb-3" />
            <p className="text-gray-500">لا توجد منتجات. أضف منتجاً جديداً!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {products.map((product) => {
              const stockStatus = getStockStatus(product.stock);
              const hasDiscount = product.discountedPrice && product.discountedPrice > 0;
              const finalPrice = hasDiscount ? Number(product.discountedPrice) : Number(product.price);
              
              return (
                <div 
                  key={product.id} 
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 overflow-hidden group"
                >
                  {/* صورة المنتج */}
                  <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={getImageUrl(product.imageUrl)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <IoImage className="text-gray-300 text-4xl mb-1" />
                        <span className="text-xs text-gray-400">لا توجد صورة</span>
                      </div>
                    )}
                    
                    {/* حالة التوفر */}
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                        className={`p-1.5 rounded-full shadow-md transition-all ${
                          product.isAvailable 
                            ? 'bg-green-500 text-white hover:bg-green-600' 
                            : 'bg-gray-500 text-white hover:bg-gray-600'
                        }`}
                        title={product.isAvailable ? 'إخفاء المنتج' : 'إظهار المنتج'}
                      >
                        {product.isAvailable ? <IoEye size={14} /> : <IoEyeOff size={14} />}
                      </button>
                    </div>
                    
                    {/* وسوم */}
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {hasDiscount && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                          خصم
                        </span>
                      )}
                      {product.stock === 0 && (
                        <span className="px-2 py-0.5 bg-gray-700 text-white text-xs rounded-full">
                          نفد
                        </span>
                      )}
                    </div>
                    
                    {/* أزرار الإجراءات (تظهر عند المرور) */}
                    {(isSuperAdmin || isStoreOwner) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenProductModal(product)}
                          className="p-2 bg-white rounded-full text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                          title="تعديل"
                        >
                          <IoPencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={deleting === product.id}
                          className="p-2 bg-white rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                          title="حذف"
                        >
                          {deleting === product.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <IoTrash size={16} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* معلومات المنتج */}
                  <div className="p-3">
                    <div>
                      <h3 className="font-semibold text-gray-800 line-clamp-1 text-sm">
                        {product.name}
                      </h3>
                      {product.nameEn && (
                        <p className="text-xs text-gray-400 line-clamp-1">{product.nameEn}</p>
                      )}
                    </div>
                    
                    {/* الفئة */}
                    <div className="mt-1">
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        {getCategoryName(product.categoryId || '')}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 min-h-[2.5rem]">
                      {product.description || 'لا يوجد وصف'}
                    </p>
                    
                    {/* السعر */}
                    <div className="mt-2">
                      {hasDiscount ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg font-bold text-green-600">
                            {finalPrice.toFixed(2)} ر.س
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            {Number(product.price).toFixed(2)} ر.س
                          </span>
                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                            -{Math.round(((product.price - product.discountedPrice!) / product.price) * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-green-600">
                          {Number(product.price).toFixed(2)} ر.س
                        </span>
                      )}
                    </div>
                    
                    {/* المخزون */}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${stockStatus.color}`}>
                        <span className="ml-1">{stockStatus.icon}</span>
                        {stockStatus.text}
                      </span>
                      {product.sku && (
                        <span className="text-xs text-gray-400 font-mono" title={product.sku}>
                          {product.sku.length > 8 ? product.sku.substring(0, 8) + '…' : product.sku}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* مودال إضافة/تعديل فئة */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          resetCategoryForm();
        }}
        title={selectedCategory ? '✏️ تعديل فئة' : '➕ إضافة فئة جديدة'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الفئة (عربي) <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="مثال: إلكترونيات"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">اسم الفئة (إنجليزي)</label>
            <input
              type="text"
              value={categoryForm.nameEn}
              onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Example: Electronics"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الوصف</label>
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder="وصف الفئة..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الصورة</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-lg hover:border-green-500 transition-colors">
                  <IoCloudUpload className="text-gray-400" />
                  <span className="text-sm text-gray-500">اختر صورة</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'category')}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>
              </label>
              {categoryForm.image && (
                <button
                  onClick={() => removeImage('category')}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="إزالة الصورة"
                >
                  <IoTrash size={18} />
                </button>
              )}
            </div>
            {uploading && <p className="text-sm text-blue-500 mt-1">جاري رفع الصورة...</p>}
            {categoryForm.image && (
              <div className="mt-2">
                <img 
                  src={getImageUrl(categoryForm.image)}
                  alt="معاينة"
                  className="w-24 h-24 object-cover rounded-lg border"
                />
              </div>
            )}
          </div>
          <Button variant="primary" onClick={handleSaveCategory} fullWidth loading={uploading}>
            {uploading ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </Modal>

      {/* مودال إضافة/تعديل منتج */}
      <Modal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          resetProductForm();
        }}
        title={selectedProduct ? '✏️ تعديل منتج' : '➕ إضافة منتج جديد'}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <div>
            <label className="block text-sm font-medium mb-1">الفئة</label>
            <select
              value={productForm.categoryId}
              onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">بدون فئة</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">اسم المنتج (عربي) <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="اسم المنتج"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">اسم المنتج (إنجليزي)</label>
              <input
                type="text"
                value={productForm.nameEn}
                onChange={(e) => setProductForm({ ...productForm, nameEn: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Product name"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">السعر (ر.س) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">السعر بعد الخصم (ر.س)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={productForm.discountedPrice}
                onChange={(e) => setProductForm({ ...productForm, discountedPrice: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">المخزون</label>
              <input
                type="number"
                min="0"
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SKU (رمز المنتج)</label>
              <input
                type="text"
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="مثال: PRD-001"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الوصف (عربي)</label>
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              rows={3}
              placeholder="وصف المنتج..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الوصف (إنجليزي)</label>
            <textarea
              value={productForm.descriptionEn}
              onChange={(e) => setProductForm({ ...productForm, descriptionEn: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              rows={3}
              placeholder="Product description..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">صورة المنتج</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-lg hover:border-green-500 transition-colors">
                  <IoCloudUpload className="text-gray-400" />
                  <span className="text-sm text-gray-500">اختر صورة</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'product')}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>
              </label>
              {productForm.imageUrl && (
                <button
                  onClick={() => removeImage('product')}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="إزالة الصورة"
                >
                  <IoTrash size={18} />
                </button>
              )}
            </div>
            {uploading && <p className="text-sm text-blue-500 mt-1">جاري رفع الصورة...</p>}
            {productForm.imageUrl && (
              <div className="mt-2">
                <img 
                  src={getImageUrl(productForm.imageUrl)}
                  alt="معاينة"
                  className="w-24 h-24 object-cover rounded-lg border"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={productForm.isAvailable}
                onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.checked })}
                className="w-4 h-4 text-green-500 rounded focus:ring-green-500"
              />
              <span className="text-sm font-medium">المنتج متاح للبيع</span>
            </label>
          </div>
          
          <Button variant="primary" onClick={handleSaveProduct} fullWidth loading={uploading}>
            {uploading ? 'جاري الحفظ...' : 'حفظ المنتج'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default StoreProductsPage;