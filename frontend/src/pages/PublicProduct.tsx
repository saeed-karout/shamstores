// frontend/src/pages/PublicProduct.tsx

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  IoCart, IoShare, IoHeart, IoHeartOutline, IoCheckmark, 
  IoClose, IoArrowForward, IoStar, IoStarHalf, IoStarOutline,
  IoLocation, IoCall, IoLogoWhatsapp, IoTime, IoWallet,
  IoChevronForward, IoChevronBack
} from 'react-icons/io5';
import api from '../services/api';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/utils/imageHelpers';

interface Product {
  id: string;
  storeId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number | string;
  discountedPrice?: number | string;
  imageUrl?: string;
  stock: number;
  sku?: string;
  categoryId?: string;
  isAvailable: boolean;
  createdAt: string;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  primaryColor: string;
  secondaryColor: string;
  settings?: {
    enableDelivery: boolean;
    deliveryFee: number;
    freeDeliveryAbove: number;
    estimatedTime: number;
  };
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number | string;
  discountedPrice?: number | string;
  imageUrl?: string;
}

interface PublicProductProps {
  storeData?: Store;
  productIdParam?: string;
}

const PublicProduct: React.FC<PublicProductProps> = ({ storeData: propStoreData, productIdParam }) => {
  const { slug, productId: paramProductId } = useParams<{ slug: string; productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(propStoreData || null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const actualProductId = productIdParam || paramProductId;
  const actualSlug = slug || store?.slug;

  useEffect(() => {
    if (actualProductId) {
      if (propStoreData) {
        setStore(propStoreData);
        fetchProductWithStore(propStoreData, actualProductId);
      } else if (actualSlug) {
        fetchProductData();
      } else {
        setLoading(false);
        toast.error('لا يمكن تحميل بيانات المنتج');
      }
    } else {
      setLoading(false);
    }
    
    window.scrollTo(0, 0);
  }, [actualSlug, actualProductId, propStoreData]);

  // دالة مساعدة لتحويل السعر إلى رقم
  const parsePrice = (price: number | string | undefined): number => {
    if (price === undefined || price === null) return 0;
    const parsed = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(parsed) ? 0 : parsed;
  };

  const fetchProductWithStore = async (storeData: Store, productId: string) => {
    setLoading(true);
    try {
      const productData = await api.get(`/store/public/${storeData.slug}/product/${productId}`);
      console.log('Product data:', productData);
      
      let productResult = productData;
      if (productData?.data?.data) {
        productResult = productData.data.data;
      } else if (productData?.data) {
        productResult = productData.data;
      }
      setProduct(productResult);
      
      try {
        const related = await api.get(`/store/public/${storeData.slug}/related-products/${productId}?limit=4`);
        let relatedResult = related;
        if (related?.data?.data) {
          relatedResult = related.data.data;
        } else if (related?.data) {
          relatedResult = related.data;
        }
        setRelatedProducts(relatedResult || []);
      } catch (err) {
        console.log('No related products');
        setRelatedProducts([]);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('حدث خطأ في تحميل بيانات المنتج');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductData = async () => {
    setLoading(true);
    try {
      if (!store) {
        const storeData = await api.get(`/store/public/${actualSlug}`);
        console.log('Store data:', storeData);
        
        let storeResult = storeData;
        if (storeData?.data?.data) {
          storeResult = storeData.data.data;
        } else if (storeData?.data) {
          storeResult = storeData.data;
        }
        setStore(storeResult);
        
        const productData = await api.get(`/store/public/${actualSlug}/product/${actualProductId}`);
        console.log('Product data:', productData);
        
        let productResult = productData;
        if (productData?.data?.data) {
          productResult = productData.data.data;
        } else if (productData?.data) {
          productResult = productData.data;
        }
        setProduct(productResult);
        
        try {
          const related = await api.get(`/store/public/${actualSlug}/related-products/${actualProductId}?limit=4`);
          let relatedResult = related;
          if (related?.data?.data) {
            relatedResult = related.data.data;
          } else if (related?.data) {
            relatedResult = related.data;
          }
          setRelatedProducts(relatedResult || []);
        } catch (err) {
          console.log('No related products');
          setRelatedProducts([]);
        }
      } else {
        const productData = await api.get(`/store/public/${actualSlug}/product/${actualProductId}`);
        console.log('Product data:', productData);
        
        let productResult = productData;
        if (productData?.data?.data) {
          productResult = productData.data.data;
        } else if (productData?.data) {
          productResult = productData.data;
        }
        setProduct(productResult);
        
        try {
          const related = await api.get(`/store/public/${actualSlug}/related-products/${actualProductId}?limit=4`);
          let relatedResult = related;
          if (related?.data?.data) {
            relatedResult = related.data.data;
          } else if (related?.data) {
            relatedResult = related.data;
          }
          setRelatedProducts(relatedResult || []);
        } catch (err) {
          console.log('No related products');
          setRelatedProducts([]);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('حدث خطأ في تحميل بيانات المنتج');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    const productStock = typeof product.stock === 'number' ? product.stock : parseInt(String(product.stock)) || 0;
    
    if (productStock === 0) {
      toast.error('المنتج غير متوفر في المخزون');
      return;
    }
    
    const cartKey = store?.slug ? `cart_${store.slug}` : 'cart';
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    const existingItem = cart.find((item: any) => item.id === product.id);
    const productPrice = parsePrice(product.discountedPrice || product.price);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: productPrice,
        imageUrl: product.imageUrl,
        quantity: quantity
      });
    }
    
    localStorage.setItem(cartKey, JSON.stringify(cart));
    setAddedToCart(true);
    toast.success(`تم إضافة ${product.name} إلى السلة`);
    
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleShare = () => {
    const url = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: `تسوق منتج ${product?.name} من ${store?.name}`,
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('تم نسخ الرابط');
      setShowShareMenu(false);
    }
  };

  const handleWhatsAppShare = () => {
    const message = `مرحباً، أود مشاركتك منتج ${product?.name} من ${store?.name}\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    setShowShareMenu(false);
  };

  const incrementQuantity = () => {
    const productStock = product ? (typeof product.stock === 'number' ? product.stock : parseInt(String(product.stock)) || 0) : 0;
    if (product && quantity < productStock) {
      setQuantity(quantity + 1);
    } else {
      toast.error('الكمية المتاحة محدودة');
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const getFinalPrice = (): number => {
    if (!product) return 0;
    const discounted = parsePrice(product.discountedPrice);
    const original = parsePrice(product.price);
    return discounted > 0 ? discounted : original;
  };

  const getOriginalPrice = (): number => {
    if (!product) return 0;
    return parsePrice(product.price);
  };

  const getDiscountPercent = (): number => {
    if (!product) return 0;
    const discounted = parsePrice(product.discountedPrice);
    const original = parsePrice(product.price);
    if (discounted > 0 && discounted < original) {
      return Math.round(((original - discounted) / original) * 100);
    }
    return 0;
  };

  if (loading) return <Loader fullScreen />;
  
  if (!product || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-2">المنتج غير موجود</h1>
          <p className="text-gray-500 mb-4">عذراً، المنتج الذي تبحث عنه غير موجود</p>
          <Link to={`/${store?.slug || ''}`} className="text-blue-500 hover:underline">
            العودة إلى المتجر
          </Link>
        </div>
      </div>
    );
  }

  const finalPrice = getFinalPrice();
  const discountPercent = getDiscountPercent();
  const productStock = typeof product.stock === 'number' ? product.stock : parseInt(String(product.stock)) || 0;
  const images = [product.imageUrl].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link to={`/${store.slug}`} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
              <IoChevronForward size={18} />
              العودة إلى المتجر
            </Link>
            <Link to={`/${store.slug}`} className="text-xl font-bold text-gray-800">
              {store.name}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* قسم الصور */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="relative">
              {images.length > 0 && images[0] ? (
                <img
                  src={getImageUrl(images[currentImageIndex])}
                  alt={product.name}
                  className="w-full h-96 object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-96 bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-gray-400">لا توجد صورة</span>
                </div>
              )}
              
              {discountPercent > 0 && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  خصم {discountPercent}%
                </div>
              )}
              
              {productStock === 0 && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                  <span className="bg-red-500 text-white px-4 py-2 rounded-full text-lg font-bold">
                    نفد من المخزون
                  </span>
                </div>
              )}
            </div>

            {/* مصغرات الصور */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                      currentImageIndex === idx ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* معلومات المنتج */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {/* SKU */}
            {product.sku && (
              <p className="text-xs text-gray-400 mb-2">SKU: {product.sku}</p>
            )}
            
            {/* الاسم */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              {product.name}
            </h1>
            {product.nameEn && (
              <p className="text-gray-500 mb-4">{product.nameEn}</p>
            )}
            
            {/* السعر */}
            <div className="mb-4">
              {discountPercent > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-green-600">
                    {finalPrice.toFixed(2)} ر.س
                  </span>
                  <span className="text-lg text-gray-400 line-through">
                    {getOriginalPrice().toFixed(2)} ر.س
                  </span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm">
                    وفر {discountPercent}%
                  </span>
                </div>
              ) : (
                <span className="text-3xl font-bold text-green-600">
                  {finalPrice.toFixed(2)} ر.س
                </span>
              )}
            </div>
            
            {/* الوصف */}
            {product.description && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">الوصف</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
                {product.descriptionEn && (
                  <p className="text-gray-500 text-sm mt-2">{product.descriptionEn}</p>
                )}
              </div>
            )}
            
            {/* المخزون */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">الحالة:</span>
                {productStock > 0 ? (
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <IoCheckmark /> متوفر
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold flex items-center gap-1">
                    <IoClose /> غير متوفر
                  </span>
                )}
              </div>
              {productStock > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">الكمية المتاحة:</span>
                  <span className="font-medium">{productStock} قطعة</span>
                </div>
              )}
            </div>
            
            {/* اختيار الكمية */}
            {productStock > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الكمية:
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={decrementQuantity}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition"
                  >
                    -
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500 mr-2">الحد الأقصى: {productStock}</span>
                </div>
              </div>
            )}
            
            {/* أزرار الإجراء */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleAddToCart}
                disabled={productStock === 0}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition ${
                  productStock === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : addedToCart
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white font-semibold`}
              >
                {addedToCart ? <IoCheckmark size={20} /> : <IoCart size={20} />}
                {addedToCart ? 'تمت الإضافة' : 'أضف إلى السلة'}
              </button>
              
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className="px-4 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition"
              >
                {isFavorited ? (
                  <IoHeart className="text-red-500 text-xl" />
                ) : (
                  <IoHeartOutline className="text-gray-500 text-xl" />
                )}
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="px-4 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition"
                >
                  <IoShare className="text-gray-500 text-xl" />
                </button>
                
                {showShareMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border overflow-hidden min-w-[150px] z-10">
                    <button
                      onClick={handleShare}
                      className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center gap-2"
                    >
                      <IoShare size={16} /> نسخ الرابط
                    </button>
                    <button
                      onClick={handleWhatsAppShare}
                      className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center gap-2"
                    >
                      <IoLogoWhatsapp size={16} className="text-green-600" /> مشاركة واتساب
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* معلومات المتجر */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-700 mb-3">معلومات المتجر</h3>
              <div className="space-y-2 text-sm">
                {store.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <IoCall size={16} />
                    <span>هاتف: {store.phone}</span>
                  </div>
                )}
                {store.whatsapp && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <IoLogoWhatsapp size={16} className="text-green-600" />
                    <span>واتساب: {store.whatsapp}</span>
                  </div>
                )}
                {store.address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <IoLocation size={16} />
                    <span>{store.address}</span>
                  </div>
                )}
                {store.settings?.enableDelivery && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <IoTime size={16} />
                    <span>وقت التوصيل المتوقع: {store.settings.estimatedTime} دقيقة</span>
                  </div>
                )}
                {store.settings?.enableDelivery && store.settings.freeDeliveryAbove > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <IoWallet size={16} />
                    <span>توصيل مجاني للطلبات فوق {store.settings.freeDeliveryAbove} ر.س</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* منتجات ذات صلة */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-800 mb-6">منتجات قد تعجبك</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((item) => {
                const itemPrice = parsePrice(item.discountedPrice || item.price);
                const itemOriginalPrice = parsePrice(item.price);
                const hasDiscount = parsePrice(item.discountedPrice) > 0 && parsePrice(item.discountedPrice) < itemOriginalPrice;
                
                return (
                  <Link
                    key={item.id}
                    to={`/${store.slug}/product/${item.id}`}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden group"
                  >
                    <div className="h-40 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={getImageUrl(item.imageUrl)}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400">لا توجد صورة</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-800 line-clamp-1">{item.name}</h3>
                      <div className="mt-2">
                        {hasDiscount ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-600">
                              {itemPrice.toFixed(2)} ر.س
                            </span>
                            <span className="text-xs text-gray-400 line-through">
                              {itemOriginalPrice.toFixed(2)} ر.س
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-green-600">
                            {itemPrice.toFixed(2)} ر.س
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button - إضافة إلى السلة سريعاً */}
      {productStock > 0 && (
        <div className="fixed bottom-6 left-0 right-0 md:hidden px-4">
          <button
            onClick={handleAddToCart}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
          >
            <IoCart size={20} />
            أضف إلى السلة - {finalPrice.toFixed(2)} ر.س
          </button>
        </div>
      )}
    </div>
  );
};

export default PublicProduct;