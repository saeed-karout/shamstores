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

// ==================== Color Tokens ====================

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', orange: '#FB923C',
};

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
  if (!store) return <div style={{ color: C.text, background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }}>لا توجد بيانات</div>;

  // ✅ تأكد من وجود slug قبل تمريره إلى ProductCard
  const storeSlug = store.slug || currentSlug;

  // Use business primary color for interactive elements, fallback to lime
  const primaryColor = store.primaryColor || C.accent;

  return (
    <>
      <Helmet>
        <title>{store.name} - متجر إلكتروني</title>
        <meta name="description" content={store.description} />
        {store.logo && <meta property="og:image" content={getImageUrl(store.logo)} />}
      </Helmet>

      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
        {/* Cover Image */}
        {store.coverImage && (
          <div
            style={{
              height: 224,
              backgroundImage: `url(${getImageUrl(store.coverImage)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative'
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,46,36,0.85) 0%, transparent 60%)' }} />
          </div>
        )}

        {/* Store Header */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', marginTop: store.coverImage ? -80 : 24, position: 'relative', zIndex: 10 }}>
          <div style={{ background: C.card, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '20px 24px', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {store.logo && (
                <img
                  src={getImageUrl(store.logo)}
                  alt={store.name}
                  style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', border: `3px solid ${C.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
                />
              )}
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: 0 }}>{store.name}</h1>
                {store.description && (
                  <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{store.description}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    style={{ padding: 12, background: 'rgba(200,226,53,0.08)', border: `1px solid ${C.border}`, borderRadius: '50%', color: C.text, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <IoCall size={20} />
                  </a>
                )}
                {store.whatsapp && (
                  <button
                    onClick={() => openWhatsApp(store.whatsapp, `مرحباً، أود الاستفسار عن ${store.name}`)}
                    style={{ padding: 12, background: '#16A34A', color: '#fff', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(22,163,74,0.4)' }}
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
        <div style={{ position: 'sticky', top: 0, zIndex: 20, background: C.card, borderBottom: `1px solid ${C.border}`, marginTop: 24 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px',
                    background: 'rgba(200,226,53,0.08)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    color: C.text,
                    cursor: 'pointer',
                    fontFamily: 'Cairo, sans-serif',
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  <IoSearch size={18} />
                  <span>بحث</span>
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px',
                    background: 'rgba(200,226,53,0.08)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    color: C.text,
                    cursor: 'pointer',
                    fontFamily: 'Cairo, sans-serif',
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  <IoFilter size={18} />
                  <span>ترتيب</span>
                </button>
              </div>

              <button
                onClick={() => navigate('/my-orders')}
                style={{ padding: '10px 16px', background: C.purple, color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 14, boxShadow: '0 2px 8px rgba(167,139,250,0.3)' }}
              >
                <IoTime size={18} style={{ display: 'inline', marginLeft: 4 }} />
                طلباتي
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => navigate('/favorites')}
                  style={{ position: 'relative', padding: '10px 16px', background: '#BE185D', color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 14, boxShadow: '0 2px 8px rgba(190,24,93,0.3)' }}
                >
                  <IoHeart size={18} style={{ display: 'inline', marginLeft: 4 }} />
                  المفضلة
                  {getFavoritesCount() > 0 && (
                    <span style={{ position: 'absolute', top: -8, right: -8, background: C.red, color: '#fff', fontSize: 11, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getFavoritesCount()}
                    </span>
                  )}
                </button>

                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => setShowCartModal(true)}
                      style={{ position: 'relative', padding: '10px 16px', background: primaryColor, color: C.bg, borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 14, fontWeight: 600 }}
                    >
                      <IoCart size={18} style={{ display: 'inline', marginLeft: 4 }} />
                      سلة
                      {getCartCount() > 0 && (
                        <span style={{ position: 'absolute', top: -8, right: -8, background: C.red, color: '#fff', fontSize: 11, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {getCartCount()}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={logout}
                      style={{ padding: '10px 16px', background: C.red, color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 14 }}
                    >
                      <IoLogOut size={18} style={{ display: 'inline', marginLeft: 4 }} />
                      خروج
                    </button>
                  </>
                ) : (
                  <Link
                    to="/user/login"
                    style={{ padding: '10px 16px', background: C.blue, color: '#fff', borderRadius: 12, textDecoration: 'none', fontFamily: 'Cairo, sans-serif', fontSize: 14 }}
                  >
                    <IoPerson size={18} style={{ display: 'inline', marginLeft: 4 }} />
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
                  style={{ overflow: 'hidden', marginTop: 12 }}
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن منتج..."
                    style={{
                      width: '100%',
                      padding: 12,
                      background: C.surf,
                      border: `2px solid ${C.border}`,
                      borderRadius: 12,
                      color: C.text,
                      outline: 'none',
                      fontFamily: 'Cairo, sans-serif',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
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
                  style={{ overflow: 'hidden', marginTop: 12 }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      onClick={() => setSortBy('price-low')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 16px',
                        borderRadius: 12,
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'Cairo, sans-serif',
                        fontSize: 13,
                        transition: 'all 0.2s',
                        background: sortBy === 'price-low' ? primaryColor : 'rgba(200,226,53,0.08)',
                        color: sortBy === 'price-low' ? C.bg : C.text,
                        boxShadow: sortBy === 'price-low' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                      }}
                    >
                      <IoChevronDown size={16} />
                      السعر: من الأقل
                    </button>
                    <button
                      onClick={() => setSortBy('price-high')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 16px',
                        borderRadius: 12,
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'Cairo, sans-serif',
                        fontSize: 13,
                        transition: 'all 0.2s',
                        background: sortBy === 'price-high' ? primaryColor : 'rgba(200,226,53,0.08)',
                        color: sortBy === 'price-high' ? C.bg : C.text,
                        boxShadow: sortBy === 'price-high' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                      }}
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
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px' }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                whiteSpace: 'nowrap',
                fontWeight: 500,
                border: selectedCategory === 'all' ? 'none' : `1px solid ${C.border}`,
                cursor: 'pointer',
                fontFamily: 'Cairo, sans-serif',
                fontSize: 14,
                transition: 'all 0.2s',
                background: selectedCategory === 'all' ? primaryColor : C.card,
                color: selectedCategory === 'all' ? C.bg : C.text,
                boxShadow: selectedCategory === 'all' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              جميع المنتجات
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                  border: selectedCategory === cat.id ? 'none' : `1px solid ${C.border}`,
                  cursor: 'pointer',
                  fontFamily: 'Cairo, sans-serif',
                  fontSize: 14,
                  transition: 'all 0.2s',
                  background: selectedCategory === cat.id ? primaryColor : C.card,
                  color: selectedCategory === cat.id ? C.bg : C.text,
                  boxShadow: selectedCategory === cat.id ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px 32px' }}>
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 24px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
              <IoStorefront style={{ fontSize: 64, color: C.muted, opacity: 0.3, display: 'block', margin: '0 auto 16px' }} />
              <p style={{ color: C.muted, fontSize: 17 }}>لا توجد منتجات</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ marginTop: 16, color: primaryColor, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Cairo, sans-serif', fontSize: 14, fontWeight: 500 }}
                >
                  مسح البحث
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  storeSlug={storeSlug}
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
              style={{
                position: 'fixed', bottom: 96, right: 16, zIndex: 30,
                width: 48, height: 48,
                background: primaryColor,
                color: C.bg,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
              }}
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
            style={{
              position: 'fixed', bottom: 24, left: 16, zIndex: 30,
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
              color: C.bg,
              padding: 16,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ position: 'relative' }}>
              <IoCart size={26} />
              <span style={{ position: 'absolute', top: -8, right: -8, background: C.red, color: '#fff', fontSize: 11, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
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
