// src/pages/Store/StorePublicMenu.tsx

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IoStorefront, IoCart, IoSearch, IoFilter, IoHeart, IoLogOut, 
  IoCall, IoLogoWhatsapp, IoArrowUp, IoClose, IoChevronDown, 
  IoChevronUp, IoPerson, IoLocation, IoNavigate,
  IoHeartOutline, IoHeartSharp,
  IoTime
} from 'react-icons/io5';
import toast from 'react-hot-toast';

import Loader from '@/components/common/Loader';
import ProductCard from '@/components/ProductCard';
import CartModal from '@/components/CartModal';
import LocationPicker from '@/components/LocationPicker';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import api, { getCurrentSubdomain } from '@/services/api';
import { getImageUrl } from '@/utils/imageHelpers';
import { openWhatsApp } from '@/utils/helpers';
import { DeliveryLocation } from '@/models/order';
import { calculateDistance } from '@/utils/distance';
import PublicMarketingSections, { PublicMarketingData } from '@/components/public/PublicMarketingSections';

interface StorePublicMenuProps {
  businessId?: string;
  businessName?: string;
  businessSlug?: string;
  businessSubdomain?: string;
  businessLogo?: string;
  businessCoverImage?: string;
  businessDescription?: string;
  businessPhone?: string;
  businessWhatsapp?: string;
  businessPrimaryColor?: string;
  businessSecondaryColor?: string;
}

const StorePublicMenu: React.FC<StorePublicMenuProps> = ({
  businessId: propBusinessId,
  businessName: propBusinessName,
  businessSlug: propBusinessSlug,
  businessLogo: propBusinessLogo,
  businessCoverImage: propBusinessCoverImage,
  businessDescription: propBusinessDescription,
  businessPhone: propBusinessPhone,
  businessWhatsapp: propBusinessWhatsapp,
  businessPrimaryColor: propBusinessPrimaryColor,
  businessSecondaryColor: propBusinessSecondaryColor,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { 
    cart, 
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    getCartSubtotal, 
    getCartCount 
  } = useCart();
  const { 
    isFavorite, 
    toggleFavorite, 
    getFavoritesCount,
    loading: favoritesLoading 
  } = useFavorites();
  
  // State
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [marketing, setMarketing] = useState<PublicMarketingData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high'>('price-low');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  // Order State
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', notes: '' });
  const [customerLocation, setCustomerLocation] = useState<DeliveryLocation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  
  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  
  // الحصول على slug بشكل آمن
  const currentSlug = propBusinessSlug || getCurrentSubdomain() || '';
  
  // Effects
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    if (isAuthenticated && user) {
      setCustomerInfo(prev => ({ 
        ...prev, 
        name: user.name || '', 
        phone: user.phone || '' 
      }));
    }
  }, [isAuthenticated, user]);
  
  useEffect(() => {
    fetchStoreData();
  }, []);
  
  useEffect(() => {
    if (customerLocation && store) {
      calculateDelivery();
    }
  }, [customerLocation, cart, discountAmount, store]);
  
  const fetchStoreData = async () => {
    try {
      const response = await api.get('/public');
      setStore(response.business);
      setCategories(response.categories || []);
      setProducts(response.products || []);
      setMarketing(response.marketing || undefined);
    } catch (error) {
      console.error('Error fetching store:', error);
      setStore({
        id: propBusinessId,
        name: propBusinessName,
        slug: currentSlug,
        logo: propBusinessLogo,
        coverImage: propBusinessCoverImage,
        description: propBusinessDescription,
        phone: propBusinessPhone,
        whatsapp: propBusinessWhatsapp,
        primaryColor: propBusinessPrimaryColor || '#3B82F6',
        secondaryColor: propBusinessSecondaryColor || '#10B981',
        deliverySettings: {
          enableDelivery: true,
          baseFee: 5,
          feePerKm: 2,
          minDistance: 1,
          maxDistance: 20,
          freeDeliveryAbove: 100,
          estimatedTime: 45
        }
      });
      setMarketing(undefined);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateDelivery = () => {
    if (!customerLocation || !store?.latitude || !store?.longitude) return;
    
    try {
      const distance = calculateDistance(
        parseFloat(store.latitude),
        parseFloat(store.longitude),
        customerLocation.lat,
        customerLocation.lng
      );
      
      setDeliveryDistance(Math.round(distance * 100) / 100);
      
      const settings = store.deliverySettings || { 
        baseFee: 5, 
        feePerKm: 2, 
        minDistance: 1, 
        freeDeliveryAbove: 100
      };
      
      const currentSubtotal = getCartSubtotal() - discountAmount;
      let fee = settings.baseFee;
      
      if (currentSubtotal >= settings.freeDeliveryAbove) {
        fee = 0;
      } else if (distance > settings.minDistance) {
        fee += (distance - settings.minDistance) * settings.feePerKm;
      }
      
      setDeliveryFee(Math.round(fee));
    } catch (error) {
      console.error('Error calculating delivery fee:', error);
      setDeliveryFee(5);
    }
  };
  
  const handleAddToCart = (product: any) => {
    addToCart({
      id: product.id,
      name: product.name,
      originalPrice: product.price,
      price: product.discountedPrice || product.price,
      quantity: 1,
      image: product.imageUrl,
      notes: '',
    });
    toast.success('تمت الإضافة إلى السلة');
  };
  
  const handleToggleFavorite = (product: any) => {
    toggleFavorite({
      id: product.id,
      type: 'product',
      name: product.name,
      price: product.discountedPrice || product.price,
      image: product.imageUrl
    });
  };
  
  const validateCoupon = async (code: string) => {
    if (!code || code.trim() === '') {
      toast.error('يرجى إدخال كود الكوبون');
      return;
    }

    setValidatingCoupon(true);
    try {
      const subtotal = getCartSubtotal();
      
      if (subtotal <= 0) {
        toast.error('لا يمكن تطبيق الكوبون على سلة فارغة');
        return;
      }

      const response = await api.get(`/coupons/validate/${code}?orderTotal=${subtotal}`);
      
      setAppliedCoupon(response);
      setDiscountAmount(response.discountAmount || 0);
      setCouponCode(code);
      toast.success(`تم تطبيق الكوبون! خصم ${response.discountValue}${response.discountType === 'percentage' ? '%' : ' ر.س'}`);
    } catch (error: any) {
      console.error('Coupon error:', error);
      toast.error(error.response?.data?.error || 'كوبون غير صالح');
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponCode('');
    } finally {
      setValidatingCoupon(false);
    }
  };
  
  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setDiscountAmount(0);
    toast.success('تم إزالة الكوبون');
  };
  
  const handleLocationSelect = (location: DeliveryLocation | null) => {
    setCustomerLocation(location);
    setShowLocationPicker(false);
    if (location) {
      toast.success('تم تحديد موقع التوصيل');
    }
  };
  
  const validateOrder = () => {
    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return false;
    }
    
    if (!isAuthenticated) {
      toast.error('يرجى تسجيل الدخول لإتمام الطلب');
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/user/login');
      return false;
    }
    
    if (!customerInfo.name || !customerInfo.phone) {
      toast.error('يرجى إدخال الاسم ورقم الهاتف');
      return false;
    }
    
    if (!customerLocation) {
      toast.error('يرجى تحديد موقع التوصيل');
      setShowLocationPicker(true);
      return false;
    }
    
    return true;
  };
  
  const submitOrder = async () => {
    if (!validateOrder()) return;
    
    setSubmitting(true);
    try {
      const subtotal = getCartSubtotal();
      const total = (subtotal - discountAmount) + (deliveryFee || 0);
      
      const orderData = {
        storeId: store?.id,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        notes: customerInfo.notes,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.originalPrice,
          finalPrice: item.price,
          notes: item.notes,
        })),
        subtotal,
        discountAmount,
        couponCode: appliedCoupon?.code,
        total,
        paymentMethod: 'cash',
        orderType: 'delivery',
        deliveryAddress: customerLocation?.address,
        deliveryLat: customerLocation?.lat,
        deliveryLng: customerLocation?.lng,
        deliveryFee: deliveryFee || 0,
        deliveryDistance: deliveryDistance,
      };
      
      const response = await api.post('/orders', orderData);
      toast.success('تم إرسال الطلب بنجاح');
      
      if (store?.whatsapp) {
        let message = `🆕 طلب جديد #${response.orderNumber || 'N/A'}\n`;
        message += `👤 ${customerInfo.name}\n📞 ${customerInfo.phone}\n`;
        message += `💰 ${total} ر.س\n📦 توصيل\n`;
        message += `📍 ${customerLocation?.address}\n`;
        message += `🗺️ https://www.google.com/maps?q=${customerLocation?.lat},${customerLocation?.lng}\n\n`;
        message += `🛒 المنتجات:\n`;
        cart.forEach(item => {
          message += `• ${item.name} x${item.quantity} = ${item.price * item.quantity} ر.س\n`;
        });
        openWhatsApp(store.whatsapp, message);
      }
      
      clearCart();
      setCouponCode('');
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setShowCartModal(false);
      setCustomerInfo({ name: '', phone: '', notes: '' });
      setCustomerLocation(null);
      setDeliveryFee(null);
      
    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast.error(error.response?.data?.error || 'فشل إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };
  
  const getFilteredProducts = () => {
    let filtered = [...products];
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.categoryId === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.discountedPrice || a.price) - (b.discountedPrice || b.price));
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.discountedPrice || b.price) - (a.discountedPrice || a.price));
    }
    
    return filtered;
  };
  
  const filteredProducts = getFilteredProducts();
  
  if (loading || favoritesLoading) return <Loader fullScreen />;
  if (!store) return <div>لا توجد بيانات</div>;
  
  // ✅ تأكد من وجود slug قبل تمريره إلى ProductCard
  const storeSlug = store.slug || currentSlug;
  
  return (
    <>
      <Helmet>
        <title>{store.name} - متجر إلكتروني</title>
        <meta name="description" content={store.description} />
        {store.logo && <meta property="og:image" content={getImageUrl(store.logo)} />}
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white" dir="rtl">
        {/* Cover Image */}
        {store.coverImage && (
          <div 
            className="h-56 md:h-72 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${getImageUrl(store.coverImage)})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}
        
        {/* Store Header */}
        <div className={`max-w-7xl mx-auto px-4 ${store.coverImage ? '-mt-20' : 'mt-6'} relative z-10`}>
          <div className="bg-white rounded-2xl shadow-xl p-5 md:p-6">
            <div className="flex flex-col md:flex-row items-center gap-5">
              {store.logo && (
                <img 
                  src={getImageUrl(store.logo)} 
                  alt={store.name} 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                />
              )}
              <div className="flex-1 text-center md:text-right">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{store.name}</h1>
                {store.description && (
                  <p className="text-gray-500 text-sm md:text-base mt-1">{store.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                {store.phone && (
                  <a href={`tel:${store.phone}`} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                    <IoCall size={20} />
                  </a>
                )}
                {store.whatsapp && (
                  <button 
                    onClick={() => openWhatsApp(store.whatsapp, `مرحباً، أود الاستفسار عن ${store.name}`)}
                    className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition shadow-md"
                  >
                    <IoLogoWhatsapp size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <PublicMarketingSections marketing={marketing} className="max-w-7xl mx-auto px-4 mt-4" />
        
        {/* Search and Filters Bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md shadow-md mt-6">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                >
                  <IoSearch size={18} />
                  <span className="hidden sm:inline font-medium">بحث</span>
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                >
                  <IoFilter size={18} />
                  <span className="hidden sm:inline font-medium">ترتيب</span>
                </button>
              </div>

              <button 
                onClick={() => navigate('/my-orders')}
                className="relative px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition shadow-md"
              >
                <IoTime size={18} className="inline ml-1" />
                طلباتي
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate('/favorites')}
                  className="relative px-4 py-2.5 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition shadow-md"
                >
                  <IoHeart size={18} className="inline ml-1" />
                  المفضلة
                  {getFavoritesCount() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {getFavoritesCount()}
                    </span>
                  )}
                </button>
                
                {isAuthenticated ? (
                  <>
                    <button 
                      onClick={() => setShowCartModal(true)} 
                      className="relative px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition shadow-md"
                    >
                      <IoCart size={18} className="inline ml-1" />
                      سلة
                      {getCartCount() > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {getCartCount()}
                        </span>
                      )}
                    </button>
                    <button onClick={logout} className="px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition shadow-md">
                      <IoLogOut size={18} className="inline ml-1" />
                      خروج
                    </button>
                  </>
                ) : (
                  <Link to="/user/login" className="px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition shadow-md">
                    <IoPerson size={18} className="inline ml-1" />
                    دخول
                  </Link>
                )}
              </div>
            </div>
            
            {/* Search Input */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن منتج..."
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 outline-none"
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3"
                >
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSortBy('price-low')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                        sortBy === 'price-low' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <IoChevronDown size={16} />
                      السعر: من الأقل
                    </button>
                    <button
                      onClick={() => setSortBy('price-high')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                        sortBy === 'price-high' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <IoChevronUp size={16} />
                      السعر: من الأعلى
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Categories */}
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                selectedCategory === 'all' 
                  ? 'bg-green-500 text-white shadow-md' 
                  : 'bg-white border border-gray-200 hover:border-green-300 hover:shadow-sm'
              }`}
            >
              جميع المنتجات
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                  selectedCategory === cat.id 
                    ? 'bg-green-500 text-white shadow-md' 
                    : 'bg-white border border-gray-200 hover:border-green-300 hover:shadow-sm'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Products Grid */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
              <IoStorefront className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">لا توجد منتجات</p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mt-4 text-green-500 underline font-medium">
                  مسح البحث
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  storeSlug={storeSlug}  // ✅ استخدم storeSlug بدلاً من businessSlug
                  product={{
                    id: product.id,
                    name: product.name,
                    nameEn: product.nameEn,
                    price: product.price,
                    discountedPrice: product.discountedPrice,
                    imageUrl: product.imageUrl,
                    stock: product.stock,
                  }}
                  isFavorite={isFavorite(product.id)}
                  onToggleFavorite={() => handleToggleFavorite(product)}
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Floating Buttons */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-24 right-4 z-30 w-12 h-12 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition flex items-center justify-center"
            >
              <IoArrowUp size={22} />
            </motion.button>
          )}
        </AnimatePresence>
        
        {/* Floating Cart Button */}
        {cart.length > 0 && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setShowCartModal(true)}
            className="fixed bottom-6 left-4 z-30 bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform"
          >
            <div className="relative">
              <IoCart size={26} />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {getCartCount()}
              </span>
            </div>
          </motion.button>
        )}
        
        {/* Cart Modal */}
        <CartModal
          isOpen={showCartModal}
          onClose={() => setShowCartModal(false)}
          cart={cart}
          isOutside={true}
          customerInfo={customerInfo}
          onCustomerInfoChange={setCustomerInfo}
          onSubmit={submitOrder}
          onUpdateQuantity={updateQuantity}
          onRemoveFromCart={removeFromCart}
          onApplyCoupon={(code) => setCouponCode(code)}
          onRemoveCoupon={handleRemoveCoupon}
          validateCoupon={validateCoupon}
          couponCode={couponCode}
          appliedCoupon={appliedCoupon}
          discountAmount={discountAmount}
          validatingCoupon={validatingCoupon}
          subtotal={getCartSubtotal()}
          formatPrice={(price) => price.toLocaleString() + ' ر.س'}
          getCartCount={getCartCount}
          submitting={submitting}
          restaurantLat={store?.latitude ? parseFloat(store.latitude) : undefined}
          restaurantLng={store?.longitude ? parseFloat(store.longitude) : undefined}
          customerLocation={customerLocation}
          onCustomerLocationChange={setCustomerLocation}
        />
      </div>
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
};

export default StorePublicMenu;