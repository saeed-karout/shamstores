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
import PublicAdvertisements from '@/components/public/PublicAdvertisements';
import PublicOffers from '@/components/public/PublicOffers';

import Loader from '@/components/common/Loader';
import MenuItemCard from '@/components/MenuItemCard';
import CartModal from '@/components/CartModal';
import OrderTrackingModal from '@/components/OrderTrackingModal';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import api, { getCurrentSubdomain } from '@/services/api';
import { getImageUrl } from '@/utils/imageHelpers';
import { openWhatsApp } from '@/utils/helpers';
import PublicMarketingSections, { PublicMarketingData } from '@/components/public/PublicMarketingSections';
import { useCurrentPlan } from '@/hooks/stores/useCurrentPlan';
import { useTheme } from '@/context/ThemeContext'; // ✅ استيراد useTheme

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
  const { plan: currentPlan, loading: planLoading } = useCurrentPlan();
  const { setThemeColors } = useTheme(); // ✅ استخدام setThemeColors لتحديث الألوان

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
      
      const identifier = currentSlug;
      if (!identifier) {
        throw new Error('No business identifier found');
      }
      
      console.log('🔍 Fetching restaurant data for identifier:', identifier);
      const response = await api.get(`/public/${identifier}`);
      console.log('📦 Restaurant data response:', response);
      
      const businessData = response.data || response;
      
      // ✅ تحديث ألوان ThemeProvider ديناميكياً
      const restaurantColors = {
        primaryColor: businessData.primaryColor || propBusinessPrimaryColor || '#3B82F6',
        secondaryColor: businessData.secondaryColor || propBusinessSecondaryColor || '#10B981',
        backgroundColor: businessData.backgroundColor || '#082E24',
        cardBgColor: businessData.cardColor || '#112E23',
        surfaceColor: businessData.surfaceColor || '#0F3D31',
        textColor: businessData.textColor || '#E8F5E9',
        mutedColor: businessData.mutedColor || '#9DC4AC',
        accentColor: businessData.accentColor || '#C8E235',
        fontFamily: businessData.fontFamily || 'Cairo, sans-serif',
      };
      
      setThemeColors(restaurantColors);
      
      setData({
        restaurant: {
          id: businessData.id || propBusinessId,
          name: businessData.name || propBusinessName,
          logo: businessData.logo || propBusinessLogo,
          coverImage: businessData.coverImage || propBusinessCoverImage,
          description: businessData.description || propBusinessDescription,
          phone: businessData.phone || propBusinessPhone,
          whatsapp: businessData.whatsapp || propBusinessWhatsapp,
          primaryColor: businessData.primaryColor || propBusinessPrimaryColor || '#3B82F6',
          secondaryColor: businessData.secondaryColor || propBusinessSecondaryColor || '#10B981',
          backgroundColor: businessData.backgroundColor || '#082E24',
          cardColor: businessData.cardColor || '#112E23',
          surfaceColor: businessData.surfaceColor || '#0F3D31',
          textColor: businessData.textColor || '#E8F5E9',
          mutedColor: businessData.mutedColor || '#9DC4AC',
          accentColor: businessData.accentColor || '#C8E235',
          fontFamily: businessData.fontFamily || 'Cairo',
        },
        categories: businessData.categories || [],
        marketing: businessData.marketing || undefined
      });

      const primary = businessData.primaryColor || propBusinessPrimaryColor;
      if (primary) {
        document.documentElement.style.setProperty('--primary-color', primary);
      }
      const secondary = businessData.secondaryColor || propBusinessSecondaryColor;
      if (secondary) {
        document.documentElement.style.setProperty('--secondary-color', secondary);
      }
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
      
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
          backgroundColor: '#082E24',
          cardColor: '#112E23',
          surfaceColor: '#0F3D31',
          textColor: '#E8F5E9',
          mutedColor: '#9DC4AC',
          accentColor: '#C8E235',
          fontFamily: 'Cairo',
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

    if (searchQuery) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    items = items.filter(item => item.isAvailable !== false);

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

  // ✅ إنشاء ألوان ديناميكية من بيانات المطعم
  const dynamicColors = {
    bg: restaurant.backgroundColor || '#082E24',
    card: restaurant.cardColor || '#112E23',
    surf: restaurant.surfaceColor || '#0F3D31',
    primary: restaurant.primaryColor || '#C8E235',
    secondary: restaurant.secondaryColor || '#10B981',
    text: restaurant.textColor || '#E8F5E9',
    muted: restaurant.mutedColor || '#9DC4AC',
    accent: restaurant.accentColor || '#C8E235',
    red: '#FF6B6B',
    blue: '#60A5FA',
    purple: '#A78BFA',
    orange: '#FB923C',
    border: `rgba(200,226,53,0.15)`,
  };

  const primaryColor = restaurant.primaryColor || dynamicColors.primary;

  // دمج حالة التحميل
  if (loading || authLoading || planLoading) return <Loader fullScreen />;

  return (
    <>
      <Helmet>
        <title>{restaurant.name || 'المطعم'} - القائمة الرقمية</title>
        <meta name="description" content={restaurant.description} />
        {restaurant.logo && <meta property="og:image" content={getImageUrl(restaurant.logo)} />}
      </Helmet>

      <div style={{ background: dynamicColors.bg, minHeight: '100vh', fontFamily: restaurant.fontFamily || 'Cairo, sans-serif' }} dir="rtl">
        {/* Cover Image */}
        {restaurant.coverImage && (
          <div
            style={{
              height: 224,
              backgroundImage: `url(${getImageUrl(restaurant.coverImage)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative'
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${dynamicColors.bg} 0%, transparent 60%)` }} />
          </div>
        )}

        {/* Mobile Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: dynamicColors.card,
          borderBottom: `1px solid ${dynamicColors.border}`,
          display: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} style={{ background: 'none', border: 'none', color: dynamicColors.text, cursor: 'pointer' }}>
              <IoMenu size={24} />
            </button>
            <h2 style={{ fontWeight: 700, fontSize: 17, color: dynamicColors.text, margin: 0 }}>{restaurant.name}</h2>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowCartModal(true)} style={{ background: 'none', border: 'none', color: dynamicColors.text, cursor: 'pointer' }}>
                <IoCart size={24} />
                {getCartCount() > 0 && (
                  <span style={{ position: 'absolute', top: -8, right: -8, background: dynamicColors.red, color: '#fff', fontSize: 11, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getCartCount()}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', marginTop: restaurant.coverImage ? -64 : 16, position: 'relative', zIndex: 10 }}>
          <div style={{ background: dynamicColors.card, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', padding: '16px 24px', border: `1px solid ${dynamicColors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {restaurant.logo && (
                <img
                  src={getImageUrl(restaurant.logo)}
                  alt={restaurant.name}
                  style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', border: `2px solid ${dynamicColors.primary}` }}
                />
              )}
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: dynamicColors.text, margin: 0 }}>{restaurant.name}</h1>
                {restaurant.description && (
                  <p style={{ color: dynamicColors.muted, fontSize: 14, marginTop: 4 }}>{restaurant.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== الأقسام التسويقية (بانرات وعروض) ==================== */}
        <PublicMarketingSections 
          businessId={restaurant.id}
          businessType="restaurant"
          className="mt-6"
          limitPerSection={10}
        />

        {/* ==================== العروض الخاصة ==================== */}
        <PublicOffers 
          businessId={restaurant.id}
          businessType="restaurant"
          className="max-w-7xl mx-auto px-4 mt-4"
          limit={5}
        />

        {/* Controls Bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: dynamicColors.card, borderBottom: `1px solid ${dynamicColors.border}`, marginTop: 16 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px',
                    background: 'rgba(200,226,53,0.08)',
                    border: `1px solid ${dynamicColors.border}`,
                    borderRadius: 9999,
                    color: dynamicColors.text,
                    cursor: 'pointer',
                    fontFamily: restaurant.fontFamily || 'Cairo, sans-serif',
                    fontSize: 14
                  }}
                >
                  <IoSearch size={18} />
                  <span>بحث</span>
                </button>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px',
                    background: 'rgba(200,226,53,0.08)',
                    border: `1px solid ${dynamicColors.border}`,
                    borderRadius: 9999,
                    color: dynamicColors.text,
                    cursor: 'pointer',
                    fontFamily: restaurant.fontFamily || 'Cairo, sans-serif',
                    fontSize: 14
                  }}
                >
                  <IoFilter size={18} />
                  <span>ترتيب</span>
                  {showFilters ? <IoChevronUp size={14} /> : <IoChevronDown size={14} />}
                </button>

                <div style={{ display: 'flex', gap: 4, background: 'rgba(200,226,53,0.08)', borderRadius: 9999, padding: 4, border: `1px solid ${dynamicColors.border}` }}>
                  <button
                    onClick={() => setViewMode('grid')}
                    style={{ padding: 8, borderRadius: 9999, border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? dynamicColors.surf : 'transparent', color: viewMode === 'grid' ? dynamicColors.accent : dynamicColors.muted, transition: 'all 0.2s' }}
                  >
                    <IoGrid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    style={{ padding: 8, borderRadius: 9999, border: 'none', cursor: 'pointer', background: viewMode === 'list' ? dynamicColors.surf : 'transparent', color: viewMode === 'list' ? dynamicColors.accent : dynamicColors.muted, transition: 'all 0.2s' }}
                  >
                    <IoList size={18} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => setShowOrderTracking(true)}
                      style={{ padding: '8px 16px', background: dynamicColors.purple, color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: restaurant.fontFamily || 'Cairo, sans-serif', fontSize: 14 }}
                    >
                      طلباتي
                    </button>
                    <button
                      onClick={logout}
                      style={{ padding: '8px 16px', background: dynamicColors.red, color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: restaurant.fontFamily || 'Cairo, sans-serif', fontSize: 14 }}
                    >
                      <IoLogOut style={{ display: 'inline', marginLeft: 4 }} />
                      خروج
                    </button>
                  </>
                ) : (
                  <Link
                    to="/user/login"
                    style={{ padding: '8px 16px', background: dynamicColors.blue, color: '#fff', borderRadius: 8, textDecoration: 'none', fontFamily: restaurant.fontFamily || 'Cairo, sans-serif', fontSize: 14 }}
                  >
                    <IoPerson style={{ display: 'inline', marginLeft: 4 }} />
                    دخول
                  </Link>
                )}

                {restaurant.phone && (
                  <a
                    href={`tel:${restaurant.phone}`}
                    style={{ padding: '8px 16px', background: 'rgba(200,226,53,0.08)', border: `1px solid ${dynamicColors.border}`, borderRadius: 8, color: dynamicColors.text, textDecoration: 'none', fontFamily: restaurant.fontFamily || 'Cairo, sans-serif', fontSize: 14 }}
                  >
                    <IoCall style={{ display: 'inline', marginLeft: 4 }} />
                    اتصال
                  </a>
                )}

                {restaurant.whatsapp && (
                  <button
                    onClick={() => openWhatsApp(restaurant.whatsapp, `مرحباً، أود الاستفسار عن ${restaurant.name}`)}
                    style={{ padding: '8px 16px', background: '#16A34A', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: restaurant.fontFamily || 'Cairo, sans-serif', fontSize: 14 }}
                  >
                    <IoLogoWhatsapp style={{ display: 'inline', marginLeft: 4 }} />
                    واتساب
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
                  style={{ overflow: 'hidden', marginTop: 12 }}
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن طعامك المفضل..."
                    style={{
                      width: '100%',
                      padding: 12,
                      background: dynamicColors.surf,
                      border: `1px solid ${dynamicColors.border}`,
                      borderRadius: 12,
                      color: dynamicColors.text,
                      outline: 'none',
                      fontFamily: restaurant.fontFamily || 'Cairo, sans-serif',
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
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
                  style={{ overflow: 'hidden', marginTop: 12 }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { value: 'popular', label: 'الأكثر طلباً', icon: IoFlame },
                      { value: 'price-low', label: 'السعر: من الأقل', icon: IoChevronDown },
                      { value: 'price-high', label: 'السعر: من الأعلى', icon: IoChevronUp },
                      { value: 'newest', label: 'الأحدث', icon: IoTime },
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value as any)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 16px',
                          borderRadius: 9999,
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: restaurant.fontFamily || 'Cairo, sans-serif',
                          fontSize: 13,
                          transition: 'all 0.2s',
                          background: sortBy === option.value ? primaryColor : 'rgba(200,226,53,0.08)',
                          color: sortBy === option.value ? dynamicColors.bg : dynamicColors.text
                        }}
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
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 16px' }} ref={categoriesRef}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '10px 20px',
                borderRadius: 9999,
                whiteSpace: 'nowrap',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                fontFamily: restaurant.fontFamily || 'Cairo, sans-serif',
                fontSize: 14,
                transition: 'all 0.2s',
                background: selectedCategory === 'all' ? primaryColor : dynamicColors.card,
                color: selectedCategory === 'all' ? dynamicColors.bg : dynamicColors.text,
                boxShadow: selectedCategory === 'all' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              الجميع
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 9999,
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: restaurant.fontFamily || 'Cairo, sans-serif',
                  fontSize: 14,
                  transition: 'all 0.2s',
                  background: selectedCategory === cat.id ? primaryColor : dynamicColors.card,
                  color: selectedCategory === cat.id ? dynamicColors.bg : dynamicColors.text,
                  boxShadow: selectedCategory === cat.id ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid/List */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px 32px' }}>
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 16px' }}>
              <IoRestaurant style={{ fontSize: 64, color: dynamicColors.muted, opacity: 0.3, display: 'block', margin: '0 auto 16px' }} />
              <p style={{ color: dynamicColors.muted, fontSize: 17 }}>لا توجد عناصر في هذه الفئة</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ marginTop: 16, color: primaryColor, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: restaurant.fontFamily || 'Cairo, sans-serif', fontSize: 14 }}
                >
                  مسح البحث
                </button>
              )}
            </div>
          ) : (
            <div style={viewMode === 'grid'
              ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 24 }
              : { display: 'flex', flexDirection: 'column', gap: 16 }
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
              style={{
                position: 'fixed', bottom: 96, right: 16, zIndex: 30,
                width: 44, height: 44,
                background: primaryColor,
                color: dynamicColors.bg,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
              }}
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
            style={{
              position: 'fixed', bottom: 24, left: 16, zIndex: 30,
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
              color: dynamicColors.bg,
              padding: 16,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ position: 'relative' }}>
              <IoCart size={24} />
              <span style={{ position: 'absolute', top: -8, right: -8, background: dynamicColors.red, color: '#fff', fontSize: 11, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
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

        {/* ==================== إعلانات أسفل الصفحة ==================== */}
        <PublicAdvertisements 
          businessId={restaurant.id}
          businessType="restaurant"
          currentPlan={currentPlan}
          className="max-w-7xl mx-auto px-4 mt-8 mb-8"
          limit={2}
          position="bottom"
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