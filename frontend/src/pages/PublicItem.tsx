import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { MenuItem } from '../services/types';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import {
  IoArrowBack,
  IoCart,
  IoShare,
  IoAdd,
  IoRemove,
  IoCheckmark,
  IoClose,
  IoRestaurant,
  IoWarning,
  IoTime,
  IoFlame,
  IoHeart,
  IoHeartOutline
} from 'react-icons/io5';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/utils/imageHelpers';
import { motion, AnimatePresence } from 'framer-motion';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', orange: '#FB923C',
};

const PublicItem: React.FC = () => {
  const { slug, itemId } = useParams<{ slug: string; itemId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [specialNotes, setSpecialNotes] = useState('');
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (itemId) {
      fetchItem();
    }
    window.scrollTo(0, 0);
  }, [itemId]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching item with ID/token:', itemId);

      const data = await api.get<MenuItem>(`/menu/share/${itemId}`);
      console.log('✅ Item data:', data);

      // معالجة المقاسات والإضافات
      const processedItem = {
        ...data,
        sizes: typeof data.sizes === 'string' ? JSON.parse(data.sizes) : data.sizes,
        addons: typeof data.addons === 'string' ? JSON.parse(data.addons) : data.addons
      };

      setItem(processedItem);

      // تعيين المقاس الافتراضي (أول مقاس)
      if (processedItem.sizes && Object.keys(processedItem.sizes).length > 0) {
        setSelectedSize(Object.keys(processedItem.sizes)[0]);
      }
    } catch (error) {
      console.error('❌ Error fetching item:', error);
      toast.error('العنصر غير موجود');
      navigate(`/${slug}`);
    } finally {
      setLoading(false);
    }
  };

  const shareItem = () => {
    console.log('Item shareToken:', item?.shareToken);

    if (!item?.shareToken) {
      toast.error('رمز المشاركة غير متوفر لهذا العنصر');
      return;
    }

    const url = `${window.location.origin}/${slug}/item/${item.shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success('✅ تم نسخ الرابط');
    setShowShareModal(false);
  };

  const shareViaWhatsApp = () => {
    if (!item) return;
    const shareToken = item.shareToken || item.id;
    const url = `${window.location.origin}/${slug}/item/${shareToken}`;
    const text = `تفحص هذا العنصر: ${item.name} - ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowShareModal(false);
  };

  const shareViaFacebook = () => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    setShowShareModal(false);
  };

  const calculatePrice = (): { unitPrice: number; totalPrice: number; originalPrice: number } => {
    if (!item) return { unitPrice: 0, totalPrice: 0, originalPrice: 0 };

    const basePrice = Number(item.price);
    const discountedBasePrice = item.discountedPrice ? Number(item.discountedPrice) : basePrice;

    let unitPrice = discountedBasePrice;
    let originalUnitPrice = basePrice;

    // تطبيق سعر المقاس إذا تم اختياره
    if (selectedSize && item.sizes) {
      const sizePrice = Number(item.sizes[selectedSize]);
      if (sizePrice > 0) {
        unitPrice = sizePrice;
        originalUnitPrice = sizePrice;
      } else {
        unitPrice = discountedBasePrice;
        originalUnitPrice = basePrice;
      }
    }

    // إضافة سعر الإضافات المحددة
    if (selectedAddons.size > 0 && item.addons) {
      selectedAddons.forEach(addonId => {
        const addonPrice = Number((item.addons as any)[addonId]?.price) || 0;
        unitPrice += addonPrice;
        originalUnitPrice += addonPrice;
      });
    }

    return {
      unitPrice,
      originalPrice: originalUnitPrice * quantity,
      totalPrice: unitPrice * quantity
    };
  };

  const handleAddToCart = () => {
    if (!item) return;

    const { unitPrice, originalPrice, totalPrice } = calculatePrice();

    console.log('Adding to cart:', {
      item,
      quantity,
      selectedSize,
      selectedAddons: Array.from(selectedAddons),
      unitPrice,
      originalPrice,
      totalPrice
    });

    addToCart({
      id: item.id,
      name: item.name,
      originalPrice: originalPrice,
      price: totalPrice,
      quantity: 1,
      size: selectedSize || undefined,
      addons: Array.from(selectedAddons),
      notes: specialNotes || undefined,
      image: item.image
    });

    setShowAddedToCart(true);

    // رسالة للمستخدم غير مسجل
    if (!isAuthenticated) {
      setTimeout(() => {
        toast((t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p>تمت إضافة العنصر إلى السلة</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate(`/${slug}?cart=open`);
                }}
                style={{ background: C.accent, color: C.bg, padding: '4px 12px', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer' }}
              >
                عرض السلة
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                style={{ background: C.surf, color: C.text, padding: '4px 12px', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer' }}
              >
                متابعة التسوق
              </button>
            </div>
          </div>
        ), { duration: 5000 });
      }, 500);
    }

    setTimeout(() => setShowAddedToCart(false), 3000);
  };

  const toggleAddon = (addonId: string) => {
    const newAddons = new Set(selectedAddons);
    if (newAddons.has(addonId)) {
      newAddons.delete(addonId);
    } else {
      newAddons.add(addonId);
    }
    setSelectedAddons(newAddons);
  };

  const formatPrice = (price: number) => {
    if (isNaN(price) || price === null || price === undefined) return '0';
    return price.toFixed(2);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <Loader fullScreen />
      </div>
    );
  }

  if (!item) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Cairo, sans-serif' }}
        dir="rtl"
      >
        <div style={{ textAlign: 'center', maxWidth: 448 }}>
          <div style={{ background: 'rgba(255,107,107,0.1)', borderRadius: '50%', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <IoWarning style={{ color: C.red, fontSize: 48 }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 12 }}>العنصر غير متوفر</h2>
          <p style={{ color: C.muted, marginBottom: 32 }}>
            عذراً، العنصر الذي تبحث عنه غير موجود أو تم إزالته من القائمة.
          </p>
          <Link
            to={`/${slug}`}
            style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', background: C.accent, color: C.bg, borderRadius: 12, textDecoration: 'none', fontWeight: 700 }}
          >
            <IoArrowBack style={{ marginLeft: 8 }} size={20} />
            العودة إلى القائمة
          </Link>
        </div>
      </motion.div>
    );
  }

  const { unitPrice, originalPrice, totalPrice } = calculatePrice();
  const restaurant = item.restaurant as any;
  const basePrice = item.discountedPrice ? Number(item.discountedPrice) : Number(item.price);

  return (
    <>
      <Helmet>
        <title>{item.name} | {restaurant?.name || 'قائمة طعام'}</title>
        <meta name="description" content={item.description || `اطلب ${item.name} الآن`} />
        <meta property="og:title" content={item.name} />
        <meta property="og:description" content={item.description || ''} />
        {item.image && <meta property="og:image" content={getImageUrl(item.image)} />}
        <meta property="og:type" content="product" />
        <meta property="product:price:amount" content={item.price.toString()} />
        <meta property="product:price:currency" content="SAR" />
      </Helmet>

      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
        {/* شريط علوي متحرك */}
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          style={{ background: 'rgba(8,46,36,0.9)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 30 }}
        >
          <div style={{ maxWidth: 896, margin: '0 auto', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Link
                to={`/${slug}`}
                style={{ display: 'flex', alignItems: 'center', color: C.muted, textDecoration: 'none', transition: 'color 0.2s' }}
              >
                <IoArrowBack size={24} />
                <span style={{ marginRight: 8, fontWeight: 500 }}>العودة للقائمة</span>
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsFavorite(!isFavorite)}
                  style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }}
                  title="المفضلة"
                >
                  {isFavorite ? (
                    <IoHeart style={{ color: C.red, fontSize: 22 }} />
                  ) : (
                    <IoHeartOutline style={{ fontSize: 22, color: C.muted }} />
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowShareModal(true)}
                  style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }}
                  title="مشاركة"
                >
                  <IoShare style={{ fontSize: 22, color: C.muted }} />
                </motion.button>

                <Link
                  to={`/${slug}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(200,226,53,0.1)', color: C.accent, padding: '8px 16px', borderRadius: 20, textDecoration: 'none', border: `1px solid ${C.border}` }}
                >
                  <IoRestaurant size={18} />
                  <span style={{ fontWeight: 500 }}>القائمة</span>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* المحتوى الرئيسي */}
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, alignItems: 'start' }}>
            {/* الجانب الأيمن - الصورة */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              style={{ position: 'relative' }}
            >
              <div style={{ position: 'sticky', top: 96 }}>
                {item.image ? (
                  <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', background: C.card, border: `1px solid ${C.border}` }}>
                    {!imageLoaded && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader />
                      </div>
                    )}
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      onLoad={() => setImageLoaded(true)}
                      style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block', opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.5s' }}
                    />

                    {/* علامة الخصم */}
                    {item.discountedPrice && (
                      <div style={{ position: 'absolute', top: 16, right: 16, background: C.red, color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        خصم {Math.round(((item.price - item.discountedPrice) / item.price) * 100)}%
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ aspectRatio: '1/1', borderRadius: 24, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${C.border}` }}>
                    <IoRestaurant size={80} style={{ color: C.muted }} />
                  </div>
                )}

                {/* مؤشر السعر */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  style={{ position: 'absolute', bottom: -16, left: -16, background: '#16A34A', color: '#fff', borderRadius: 16, padding: '12px 24px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                >
                  <div style={{ fontSize: 12, opacity: 0.9 }}>السعر</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{formatPrice(totalPrice)} ل.س</div>
                </motion.div>
              </div>
            </motion.div>

            {/* الجانب الأيسر - التفاصيل */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              {/* العنوان والوصف */}
              <div style={{ background: C.card, borderRadius: 24, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', border: `1px solid ${C.border}` }}>
                <h1 style={{ fontSize: 32, fontWeight: 700, color: C.text, marginBottom: 16, marginTop: 0 }}>{item.name}</h1>
                {item.nameEn && (
                  <p style={{ color: C.muted, fontSize: 17, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>{item.nameEn}</p>
                )}
                {item.description && (
                  <p style={{ color: C.muted, lineHeight: 1.8, fontSize: 17, margin: 0 }}>{item.description}</p>
                )}

                {/* المعلومات الإضافية */}
                {(item.preparationTime || item.calories) && (
                  <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                    {item.preparationTime && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted }}>
                        <IoTime />
                        <span>{item.preparationTime} دقيقة</span>
                      </div>
                    )}
                    {item.calories && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted }}>
                        <IoFlame />
                        <span>{item.calories} سعرة</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* خيارات المقاسات */}
              {item.hasSizes && item.sizes && Object.keys(item.sizes).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ background: C.card, borderRadius: 24, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', border: `1px solid ${C.border}` }}
                >
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', color: C.text, marginTop: 0 }}>
                    <span style={{ width: 4, height: 32, background: C.accent, borderRadius: 2, marginLeft: 12, display: 'inline-block' }}></span>
                    اختر المقاس
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                    {Object.entries(item.sizes).map(([size, price]: [string, any], index) => {
                      const priceNum = Number(price);
                      const isDefaultPrice = priceNum === 0;
                      const displayPrice = isDefaultPrice ? basePrice : priceNum;
                      const isSelected = selectedSize === size;

                      return (
                        <motion.button
                          key={size}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedSize(size)}
                          style={{
                            padding: 16,
                            borderRadius: 16,
                            border: isSelected ? `2px solid ${C.accent}` : `2px solid ${C.border}`,
                            background: isSelected ? 'rgba(200,226,53,0.08)' : C.surf,
                            cursor: 'pointer',
                            textAlign: 'center',
                            boxShadow: isSelected ? `0 0 12px rgba(200,226,53,0.15)` : 'none'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 4 }}>{size}</div>
                          <div style={{ fontSize: 13, color: isSelected ? C.accent : C.muted }}>
                            {formatPrice(displayPrice)} ل.س
                            {isDefaultPrice && (
                              <span style={{ display: 'block', fontSize: 11, color: C.muted, opacity: 0.7 }}>السعر الافتراضي</span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* الإضافات */}
              {item.hasAddons && item.addons && Object.keys(item.addons).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  style={{ background: C.card, borderRadius: 24, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', border: `1px solid ${C.border}` }}
                >
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', color: C.text, marginTop: 0 }}>
                    <span style={{ width: 4, height: 32, background: C.accent, borderRadius: 2, marginLeft: 12, display: 'inline-block' }}></span>
                    إضافات إضافية
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Object.entries(item.addons).map(([id, addon]: [string, any], index) => {
                      const isSelected = selectedAddons.has(id);
                      return (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.05 }}
                          onClick={() => toggleAddon(id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 16,
                            borderRadius: 16,
                            border: isSelected ? `2px solid ${C.accent}` : `2px solid ${C.border}`,
                            background: isSelected ? 'rgba(200,226,53,0.08)' : C.surf,
                            cursor: 'pointer',
                            boxShadow: isSelected ? `0 0 12px rgba(200,226,53,0.1)` : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: isSelected ? `2px solid ${C.accent}` : `2px solid ${C.muted}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? C.accent : 'transparent',
                              color: C.bg,
                              transition: 'all 0.2s'
                            }}>
                              {isSelected && <IoCheckmark size={16} />}
                            </div>
                            <span style={{ fontWeight: 500, color: C.text }}>{addon.name}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: isSelected ? C.accent : C.muted }}>
                            +{formatPrice(addon.price)} ل.س
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ملاحظات خاصة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{ background: C.card, borderRadius: 24, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', border: `1px solid ${C.border}` }}
              >
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: C.text, marginTop: 0 }}>ملاحظات خاصة</h3>
                <textarea
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="أضف ملاحظاتك هنا... (اختياري)"
                  style={{ width: '100%', padding: 16, border: `2px solid ${C.border}`, borderRadius: 16, background: C.surf, color: C.text, resize: 'none', fontFamily: 'Cairo, sans-serif', fontSize: 15, boxSizing: 'border-box', outline: 'none' }}
                  rows={3}
                />
              </motion.div>

              {/* ملخص الطلب وإضافة للسلة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{ background: 'linear-gradient(135deg, #0D4A3A, #082E24)', borderRadius: 24, padding: 32, boxShadow: '0 8px 40px rgba(0,0,0,0.3)', border: `1px solid ${C.border}`, color: C.text }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>ملخص الطلب</h3>
                  <div style={{ background: 'rgba(200,226,53,0.15)', borderRadius: 20, padding: '8px 16px', border: `1px solid ${C.border}` }}>
                    <span style={{ fontWeight: 700, fontSize: 20 }}>{formatPrice(totalPrice)}</span>
                    <span style={{ marginRight: 4, fontSize: 13, opacity: 0.9 }}>ل.س</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <span style={{ fontSize: 17, opacity: 0.9 }}>الكمية</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(200,226,53,0.1)', borderRadius: 20, padding: '4px 8px', border: `1px solid ${C.border}` }}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(200,226,53,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}
                    >
                      <IoRemove size={20} />
                    </motion.button>
                    <span style={{ fontWeight: 700, fontSize: 20, width: 32, textAlign: 'center' }}>{quantity}</span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(quantity + 1)}
                      style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(200,226,53,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}
                    >
                      <IoAdd size={20} />
                    </motion.button>
                  </div>
                </div>

                {/* تفاصيل السعر */}
                <div style={{ background: 'rgba(200,226,53,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, fontSize: 14, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>سعر الوحدة:</span>
                    <span>{formatPrice(unitPrice)} ل.س</span>
                  </div>
                  {selectedSize && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, opacity: 0.8 }}>
                      <span>المقاس: {selectedSize}</span>
                      <span></span>
                    </div>
                  )}
                  {selectedAddons.size > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, opacity: 0.8 }}>
                      <span>عدد الإضافات:</span>
                      <span>{selectedAddons.size}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid rgba(200,226,53,0.2)`, fontWeight: 700 }}>
                    <span>الإجمالي:</span>
                    <span>{formatPrice(totalPrice)} ل.س</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  style={{ width: '100%', background: C.accent, color: C.bg, padding: '16px 0', borderRadius: 16, border: 'none', fontWeight: 700, fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(200,226,53,0.3)', fontFamily: 'Cairo, sans-serif' }}
                >
                  <IoCart size={24} />
                  أضف إلى السلة
                </motion.button>

                {/* رسالة للمستخدم غير مسجل */}
                {!isAuthenticated && (
                  <p style={{ textAlign: 'center', opacity: 0.7, fontSize: 13, marginTop: 16, marginBottom: 0 }}>
                    يمكنك إضافة العناصر إلى السلة، ولكن ستحتاج إلى تسجيل الدخول عند إتمام الطلب
                  </p>
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* مؤشر الإضافة للسلة */}
        <AnimatePresence>
          {showAddedToCart && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.accent, color: C.bg, padding: '16px 32px', borderRadius: 16, boxShadow: '0 8px 32px rgba(200,226,53,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <IoCheckmark size={24} />
              <span style={{ fontWeight: 700, fontSize: 17 }}>تمت الإضافة إلى السلة بنجاح</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* مودال المشاركة */}
        <Modal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          title="مشاركة العنصر"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: C.muted, textAlign: 'center', marginBottom: 16 }}>اختر طريقة المشاركة</p>

            <Button
              variant="primary"
              onClick={shareItem}
              fullWidth
              className="flex items-center justify-center gap-2"
            >
              <IoShare size={20} />
              نسخ الرابط
            </Button>

            <Button
              variant="outline"
              onClick={shareViaWhatsApp}
              fullWidth
              className="flex items-center justify-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2ZM12.04 20.15C10.52 20.15 9.03 19.75 7.71 19L7.45 18.84L4.43 19.65L5.26 16.73L5.06 16.43C4.24 15.05 3.8 13.5 3.8 11.91C3.8 7.3 7.43 3.68 12.04 3.68C16.65 3.68 20.28 7.3 20.28 11.91C20.28 16.52 16.65 20.15 12.04 20.15ZM16.59 13.86C16.33 13.73 15.14 13.15 14.9 13.06C14.66 12.97 14.48 12.92 14.3 13.18C14.12 13.44 13.63 14.02 13.47 14.2C13.31 14.38 13.15 14.4 12.89 14.27C11.42 13.6 10.44 12.96 9.67 11.96C9.42 11.63 9.77 11.66 10.1 10.97C10.17 10.82 10.14 10.69 10.05 10.56C9.96 10.43 9.39 9.24 9.18 8.78C8.97 8.32 8.75 8.38 8.59 8.38C8.44 8.38 8.27 8.38 8.09 8.38C7.91 8.38 7.62 8.44 7.38 8.71C7.14 8.98 6.53 9.65 6.53 11.01C6.53 12.37 7.49 13.68 7.63 13.88C7.77 14.08 9.38 16.6 11.86 17.68C12.56 17.99 13.1 18.17 13.51 18.3C14.22 18.53 14.87 18.49 15.38 18.39C15.95 18.28 17.14 17.76 17.39 17.19C17.64 16.62 17.64 16.13 17.56 16.01C17.48 15.89 17.26 15.81 16.98 15.68L16.59 13.86Z" />
              </svg>
              مشاركة عبر واتساب
            </Button>

            <Button
              variant="outline"
              onClick={shareViaFacebook}
              fullWidth
              className="flex items-center justify-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 16.84 5.44 20.87 10 21.8V15H8V12H10V9.5C10 7.57 11.57 6 13.5 6H16V9H14C13.45 9 13 9.45 13 10V12H16V15H13V21.95C18.05 21.45 22 17.19 22 12Z" />
              </svg>
              مشاركة عبر فيسبوك
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowShareModal(false)}
              fullWidth
            >
              إلغاء
            </Button>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default PublicItem;
