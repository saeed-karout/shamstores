// src/pages/RestaurantPublicMenu.tsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  IoRestaurant, IoCart, IoSearch, IoFilter, IoChevronDown, IoChevronUp,
  IoTime, IoFlame, IoPerson, IoLogOut, IoCall, IoLogoWhatsapp, IoArrowUp,
  IoHeart, IoHeartOutline, IoClose, IoMenu, IoGrid, IoList,
} from 'react-icons/io5';

import Loader from '@/components/common/Loader';
import MenuItemCard from '@/components/MenuItemCard';
import CartModal from '@/components/CartModal';
import OrderTrackingModal from '@/components/OrderTrackingModal';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import api, { getCurrentSubdomain, isMainDomain } from '@/services/api';
import { getImageUrl } from '@/utils/imageHelpers';
import { openWhatsApp } from '@/utils/helpers';
import PublicMarketingSections, { PublicMarketingData } from '@/components/public/PublicMarketingSections';

interface Category {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  image?: string;
  menuItems?: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  discountedPrice?: number;
  image?: string;
  categoryId?: string;
  isAvailable: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  preparationTime?: number;
  calories?: number;
  sizes?: { name: string; price: number }[];
  addons?: { name: string; price: number }[];
}

interface RestaurantPublicMenuProps {
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

const RestaurantPublicMenu: React.FC<RestaurantPublicMenuProps> = ({
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
  const { slug: urlSlug, tableId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getCartSubtotal, getCartCount } = useCart();
  const { favorites, toggleFavorite, getFavoritesCount } = useFavorites();
  
  // State
  const [data, setData] = useState<{ restaurant: any; categories: Category[]; marketing?: PublicMarketingData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'newest'>('popular');
  const [showCartModal, setShowCartModal] = useState(false);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Order State
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  const categoriesRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentSlug = propBusinessSlug || urlSlug || getCurrentSubdomain();
  
  // Effects
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);
  
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchMyOrders();
      setCustomerInfo(prev => ({ ...prev, name: user.name || '', phone: user.phone || '' }));
    }
  }, [isAuthenticated, user]);
  
  useEffect(() => {
    fetchRestaurantData();
  }, [currentSlug]);
  
  // API Calls
  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/public');
      
      setData({
        restaurant: {
          id: response.business?.id || propBusinessId,
          name: response.business?.name || propBusinessName,
          logo: response.business?.logo || propBusinessLogo,
          coverImage: response.business?.coverImage || propBusinessCoverImage,
          description: response.business?.description || propBusinessDescription,
          phone: response.business?.phone || propBusinessPhone,
          whatsapp: response.business?.whatsapp || propBusinessWhatsapp,
          primaryColor: response.business?.primaryColor || propBusinessPrimaryColor || '#3B82F6',
          secondaryColor: response.business?.secondaryColor || propBusinessSecondaryColor || '#10B981',
        },
        categories: response.categories || [],
        marketing: response.marketing || undefined
      });
      
      // Apply theme colors
      if (response.business?.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', response.business.primaryColor);
      }
      if (response.business?.secondaryColor) {
        document.documentElement.style.setProperty('--secondary-color', response.business.secondaryColor);
      }
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
      // Fallback to props data
      setData({
        restaurant: {
          id: propBusinessId,
          name: propBusinessName || 'المطعم',
          logo: propBusinessLogo,
          coverImage: propBusinessCoverImage,
          description: propBusinessDescription,
          phone: propBusinessPhone,
          whatsapp: propBusinessWhatsapp,
          primaryColor: propBusinessPrimaryColor || '#3B82F6',
          secondaryColor: propBusinessSecondaryColor || '#10B981',
        },
        categories: [],
        marketing: undefined
      });
      toast.error('فشل تحميل البيانات، يتم عرض بيانات افتراضية');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMyOrders = async () => {
    if (!isAuthenticated) return;
    setLoadingOrders(true);
    try {
      const orders = await api.get('/orders/my-orders');
      setMyOrders(orders);
    } catch (error) {
      console.error('Error fetching my orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };
  
  // Filter and Sort Items
  const getFilteredItems = useCallback(() => {
    if (!data) return [];
    let items: MenuItem[] = [];
    
    data.categories.forEach(cat => {
      if (selectedCategory === 'all' || cat.id === selectedCategory) {
        items = [...items, ...(cat.menuItems || [])];
      }
    });
    
    // Filter by search
    if (searchQuery) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by availability
    items = items.filter(item => item.isAvailable !== false);
    
    // Sort
    switch (sortBy) {
      case 'popular':
        items.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
        break;
      case 'price-low':
        items.sort((a, b) => (a.discountedPrice || a.price) - (b.discountedPrice || b.price));
        break;
      case 'price-high':
        items.sort((a, b) => (b.discountedPrice || b.price) - (a.discountedPrice || a.price));
        break;
      case 'newest':
        items.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
    }
    
    return items;
  }, [data, selectedCategory, searchQuery, sortBy]);
  
  const handleAddToCart = (item: MenuItem) => {
    addToCart({
      id: item.id,
      name: item.name,
      originalPrice: Number(item.price),
      price: item.discountedPrice ? Number(item.discountedPrice) : Number(item.price),
      quantity: 1,
      image: item.image,
      notes: '',
    });
    toast.success('تمت الإضافة إلى السلة');
  };
  
  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }
    
    if (!isAuthenticated || !user) {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/user/login');
      return;
    }
    
    setSubmitting(true);
    try {
      const subtotal = getCartSubtotal();
      const orderData = {
        tableId: tableId || null,
        customerName: customerInfo.name || user.name,
        customerPhone: customerInfo.phone || user.phone,
        notes: customerInfo.notes,
        items: cart.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity,
          price: item.originalPrice,
          finalPrice: item.price,
          notes: item.notes,
        })),
        subtotal,
        total: subtotal,
        paymentMethod: 'cash',
        orderType: tableId ? 'dine_in' : 'takeaway',
      };
      
      await api.post('/orders', orderData);
      toast.success('تم إرسال الطلب بنجاح');
      clearCart();
      setShowCartModal(false);
      setCustomerInfo(prev => ({ ...prev, notes: '' }));
      fetchMyOrders();
      
      // Send WhatsApp notification if available
      if (data?.restaurant.whatsapp) {
        const message = `🆕 طلب جديد\n👤 ${customerInfo.name || user.name}\n📞 ${customerInfo.phone || user.phone}\n💰 ${subtotal} ر.س`;
        openWhatsApp(data.restaurant.whatsapp, message);
      }
    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast.error(error.response?.data?.error || 'فشل إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };
  
  const filteredItems = getFilteredItems();
  const categories = data?.categories || [];
  const restaurant = data?.restaurant || {};
  
  if (loading || authLoading) return <Loader fullScreen />;
  
  return (
    <>
      <Helmet>
        <title>{restaurant.name || 'المطعم'} - القائمة الرقمية</title>
        <meta name="description" content={restaurant.description} />
        {restaurant.logo && <meta property="og:image" content={getImageUrl(restaurant.logo)} />}
      </Helmet>
      
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Cover Image */}
        {restaurant.coverImage && (
          <div 
            className="h-56 md:h-80 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${getImageUrl(restaurant.coverImage)})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}
        
        {/* Mobile Header */}
        <div className="sticky top-0 z-20 bg-white shadow-md md:hidden">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)}>
              <IoMenu size={24} />
            </button>
            <h2 className="font-bold text-lg">{restaurant.name}</h2>
            <div className="relative">
              <button onClick={() => setShowCartModal(true)}>
                <IoCart size={24} />
                {getCartCount() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {getCartCount()}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Business Info */}
        <div className={`max-w-7xl mx-auto px-4 ${restaurant.coverImage ? '-mt-16 md:-mt-20' : 'mt-4'} relative z-10`}>
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
            <div className="flex items-center gap-4 flex-wrap">
              {restaurant.logo && (
                <img
                  src={getImageUrl(restaurant.logo)}
                  alt={restaurant.name}
                  className="w-16 h-16 md:w-24 md:h-24 rounded-xl object-cover border-2 border-white shadow"
                />
              )}
              <div className="flex-1">
                <h1 className="text-xl md:text-3xl font-bold">{restaurant.name}</h1>
                {restaurant.description && (
                  <p className="text-gray-500 text-sm md:text-base mt-1">{restaurant.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <PublicMarketingSections marketing={data?.marketing} className="max-w-7xl mx-auto px-4 mt-4" />
        
        {/* Controls Bar */}
        <div className="sticky top-0 md:top-auto z-10 bg-white shadow-md mt-4">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2">
                {/* Search Toggle */}
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                >
                  <IoSearch size={18} />
                  <span className="hidden sm:inline">بحث</span>
                </button>
                
                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                >
                  <IoFilter size={18} />
                  <span className="hidden sm:inline">ترتيب</span>
                  {showFilters ? <IoChevronUp size={14} /> : <IoChevronDown size={14} />}
                </button>
                
                {/* View Mode Toggle */}
                <div className="hidden md:flex gap-1 bg-gray-100 rounded-full p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-full transition ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                  >
                    <IoGrid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-full transition ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                  >
                    <IoList size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => setShowOrderTracking(true)}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                    >
                      طلباتي
                    </button>
                    <button
                      onClick={logout}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      <IoLogOut className="inline ml-1" />
                      خروج
                    </button>
                  </>
                ) : (
                  <Link
                    to="/user/login"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    <IoPerson className="inline ml-1" />
                    دخول
                  </Link>
                )}
                
                {restaurant.phone && (
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    <IoCall className="inline ml-1" />
                    <span className="hidden sm:inline">اتصال</span>
                  </a>
                )}
                
                {restaurant.whatsapp && (
                  <button
                    onClick={() => openWhatsApp(restaurant.whatsapp, `مرحباً، أود الاستفسار عن ${restaurant.name}`)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    <IoLogoWhatsapp className="inline ml-1" />
                    <span className="hidden sm:inline">واتساب</span>
                  </button>
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
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن طعامك المفضل..."
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
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
                    {[
                      { value: 'popular', label: 'الأكثر طلباً', icon: IoFlame },
                      { value: 'price-low', label: 'السعر: من الأقل', icon: IoChevronDown },
                      { value: 'price-high', label: 'السعر: من الأعلى', icon: IoChevronUp },
                      { value: 'newest', label: 'الأحدث', icon: IoTime },
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${
                          sortBy === option.value
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <option.icon size={16} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Categories */}
        <div className="max-w-7xl mx-auto px-4 py-4" ref={categoriesRef}>
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2.5 rounded-full whitespace-nowrap font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              الجميع
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-full whitespace-nowrap font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-white hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Menu Items Grid/List */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <IoRestaurant className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">لا توجد عناصر في هذه الفئة</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-green-500 underline"
                >
                  مسح البحث
                </button>
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
            }>
              {filteredItems.map((item, index) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  isFavorite={favorites.has(item.id)}
                  slug={currentSlug || ''}
                  onToggleFavorite={toggleFavorite}
                  onAddToCart={handleAddToCart}
                  onNavigate={navigate}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Scroll to Top */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-24 right-4 z-30 w-10 h-10 md:w-12 md:h-12 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition"
            >
              <IoArrowUp size={20} />
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
              <IoCart size={24} />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {getCartCount()}
              </span>
            </div>
          </motion.button>
        )}
        
        {/* Modals */}
        <CartModal
          isOpen={showCartModal}
          onClose={() => setShowCartModal(false)}
          cart={cart}
          isOutside={!tableId}
          tableId={tableId}
          customerInfo={customerInfo}
          onCustomerInfoChange={setCustomerInfo}
          onSubmit={submitOrder}
          onUpdateQuantity={updateQuantity}
          onRemoveFromCart={removeFromCart}
          subtotal={getCartSubtotal()}
          formatPrice={(price) => price.toLocaleString()}
          submitting={submitting}
        />
        
        <OrderTrackingModal
          isOpen={showOrderTracking}
          onClose={() => {
            setShowOrderTracking(false);
            setTrackingOrder(null);
          }}
          trackingOrder={trackingOrder}
          orders={myOrders}
          onSelectOrder={setTrackingOrder}
          formatPrice={(price) => price.toLocaleString()}
          loading={loadingOrders}
        />
      </div>
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
};

export default RestaurantPublicMenu;
