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
          <div className="flex flex-col gap-2">
            <p>تمت إضافة العنصر إلى السلة</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate(`/${slug}?cart=open`);
                }}
                className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm"
              >
                عرض السلة
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="bg-gray-200 px-3 py-1 rounded-lg text-sm"
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Loader fullScreen />
      </div>
    );
  }

  if (!item) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4"
      >
        <div className="text-center max-w-md">
          <div className="bg-red-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <IoWarning className="text-red-500" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">العنصر غير متوفر</h2>
          <p className="text-gray-600 mb-8">
            عذراً، العنصر الذي تبحث عنه غير موجود أو تم إزالته من القائمة.
          </p>
          <Link 
            to={`/${slug}`}
            className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all transform hover:scale-105 shadow-lg"
          >
            <IoArrowBack className="ml-2" size={20} />
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

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* شريط علوي متحرك */}
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm"
        >
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link 
                to={`/${slug}`}
                className="flex items-center text-gray-600 hover:text-blue-500 transition-colors group"
              >
                <IoArrowBack size={24} className="group-hover:-translate-x-1 transition-transform" />
                <span className="mr-2 font-medium hidden sm:inline">العودة للقائمة</span>
              </Link>
              
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="المفضلة"
                >
                  {isFavorite ? (
                    <IoHeart className="text-red-500" size={22} />
                  ) : (
                    <IoHeartOutline size={22} className="text-gray-600" />
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowShareModal(true)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="مشاركة"
                >
                  <IoShare size={22} className="text-gray-600" />
                </motion.button>
                
                <Link 
                  to={`/${slug}`}
                  className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors"
                >
                  <IoRestaurant size={18} />
                  <span className="font-medium hidden sm:inline">القائمة</span>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* المحتوى الرئيسي */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* الجانب الأيمن - الصورة */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <div className="sticky top-24">
                {item.image ? (
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-50 to-purple-50">
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader />
                      </div>
                    )}
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      onLoad={() => setImageLoaded(true)}
                      className={`w-full h-auto object-cover transition-opacity duration-500 ${
                        imageLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    
                    {/* علامة الخصم */}
                    {item.discountedPrice && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        خصم {Math.round(((item.price - item.discountedPrice) / item.price) * 100)}%
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-2xl">
                    <IoRestaurant size={80} className="text-gray-400" />
                  </div>
                )}

                {/* مؤشر السعر */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="absolute -bottom-4 -left-4 bg-green-500 text-white rounded-2xl px-6 py-3 shadow-xl"
                >
                  <div className="text-sm opacity-90">السعر</div>
                  <div className="text-2xl font-bold">{formatPrice(totalPrice)} ل.س</div>
                </motion.div>
              </div>
            </motion.div>

            {/* الجانب الأيسر - التفاصيل */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* العنوان والوصف */}
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">{item.name}</h1>
                {item.nameEn && (
                  <p className="text-gray-500 text-lg mb-4 border-b border-gray-100 pb-4">{item.nameEn}</p>
                )}
                {item.description && (
                  <p className="text-gray-600 leading-relaxed text-lg">{item.description}</p>
                )}
                
                {/* المعلومات الإضافية */}
                {(item.preparationTime || item.calories) && (
                  <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
                    {item.preparationTime && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <IoTime />
                        <span>{item.preparationTime} دقيقة</span>
                      </div>
                    )}
                    {item.calories && (
                      <div className="flex items-center gap-2 text-gray-500">
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
                  className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
                >
                  <h3 className="text-xl font-bold mb-6 flex items-center">
                    <span className="w-1 h-8 bg-blue-500 rounded-full ml-3"></span>
                    اختر المقاس
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(item.sizes).map(([size, price]: [string, any], index) => {
                      const priceNum = Number(price);
                      const isDefaultPrice = priceNum === 0;
                      const displayPrice = isDefaultPrice ? basePrice : priceNum;
                      
                      return (
                        <motion.button
                          key={size}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedSize(size)}
                          className={`p-4 rounded-2xl border-2 transition-all ${
                            selectedSize === size
                              ? 'border-blue-500 bg-blue-50 shadow-lg'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-bold text-lg mb-1">{size}</div>
                          <div className={`text-sm ${selectedSize === size ? 'text-blue-600' : 'text-gray-500'}`}>
                            {formatPrice(displayPrice)} ل.س
                            {isDefaultPrice && (
                              <span className="block text-xs text-gray-400">السعر الافتراضي</span>
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
                  className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
                >
                  <h3 className="text-xl font-bold mb-6 flex items-center">
                    <span className="w-1 h-8 bg-green-500 rounded-full ml-3"></span>
                    إضافات إضافية
                  </h3>
                  <div className="grid gap-3">
                    {Object.entries(item.addons).map(([id, addon]: [string, any], index) => (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        onClick={() => toggleAddon(id)}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          selectedAddons.has(id)
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            selectedAddons.has(id)
                              ? 'border-green-500 bg-green-500 text-white'
                              : 'border-gray-300'
                          }`}>
                            {selectedAddons.has(id) && <IoCheckmark size={16} />}
                          </div>
                          <span className="font-medium">{addon.name}</span>
                        </div>
                        <span className={`font-bold ${selectedAddons.has(id) ? 'text-green-600' : 'text-gray-500'}`}>
                          +{formatPrice(addon.price)} ل.س
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ملاحظات خاصة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
              >
                <h3 className="text-xl font-bold mb-4">ملاحظات خاصة</h3>
                <textarea
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="أضف ملاحظاتك هنا... (اختياري)"
                  className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-0 transition-colors resize-none"
                  rows={3}
                />
              </motion.div>

              {/* ملخص الطلب وإضافة للسلة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-8 shadow-2xl text-white"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">ملخص الطلب</h3>
                  <div className="bg-white/20 rounded-full px-4 py-2">
                    <span className="font-bold text-xl">{formatPrice(totalPrice)}</span>
                    <span className="mr-1 text-sm opacity-90">ل.س</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <span className="text-lg opacity-90">الكمية</span>
                  <div className="flex items-center gap-4 bg-white/20 rounded-full px-2 py-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-full bg-white/30 hover:bg-white/40 flex items-center justify-center transition-colors"
                    >
                      <IoRemove size={20} />
                    </motion.button>
                    <span className="font-bold text-xl w-8 text-center">{quantity}</span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-full bg-white/30 hover:bg-white/40 flex items-center justify-center transition-colors"
                    >
                      <IoAdd size={20} />
                    </motion.button>
                  </div>
                </div>

                {/* تفاصيل السعر */}
                <div className="bg-white/10 rounded-2xl p-4 mb-4 text-sm">
                  <div className="flex justify-between mb-2">
                    <span>سعر الوحدة:</span>
                    <span>{formatPrice(unitPrice)} ل.س</span>
                  </div>
                  {selectedSize && (
                    <div className="flex justify-between mb-2 text-white/80">
                      <span>المقاس: {selectedSize}</span>
                      <span></span>
                    </div>
                  )}
                  {selectedAddons.size > 0 && (
                    <div className="flex justify-between mb-2 text-white/80">
                      <span>عدد الإضافات:</span>
                      <span>{selectedAddons.size}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-white/20 font-bold">
                    <span>الإجمالي:</span>
                    <span>{formatPrice(totalPrice)} ل.س</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  className="w-full bg-white text-blue-600 py-4 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <IoCart size={24} />
                  أضف إلى السلة
                </motion.button>

                {/* رسالة للمستخدم غير مسجل */}
                {!isAuthenticated && (
                  <p className="text-center text-white/80 text-sm mt-4">
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
              className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3"
            >
              <IoCheckmark size={24} />
              <span className="font-bold text-lg">تمت الإضافة إلى السلة بنجاح</span>
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
          <div className="space-y-4">
            <p className="text-gray-600 text-center mb-4">اختر طريقة المشاركة</p>
            
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
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2ZM12.04 20.15C10.52 20.15 9.03 19.75 7.71 19L7.45 18.84L4.43 19.65L5.26 16.73L5.06 16.43C4.24 15.05 3.8 13.5 3.8 11.91C3.8 7.3 7.43 3.68 12.04 3.68C16.65 3.68 20.28 7.3 20.28 11.91C20.28 16.52 16.65 20.15 12.04 20.15ZM16.59 13.86C16.33 13.73 15.14 13.15 14.9 13.06C14.66 12.97 14.48 12.92 14.3 13.18C14.12 13.44 13.63 14.02 13.47 14.2C13.31 14.38 13.15 14.4 12.89 14.27C11.42 13.6 10.44 12.96 9.67 11.96C9.42 11.63 9.77 11.66 10.1 10.97C10.17 10.82 10.14 10.69 10.05 10.56C9.96 10.43 9.39 9.24 9.18 8.78C8.97 8.32 8.75 8.38 8.59 8.38C8.44 8.38 8.27 8.38 8.09 8.38C7.91 8.38 7.62 8.44 7.38 8.71C7.14 8.98 6.53 9.65 6.53 11.01C6.53 12.37 7.49 13.68 7.63 13.88C7.77 14.08 9.38 16.6 11.86 17.68C12.56 17.99 13.1 18.17 13.51 18.3C14.22 18.53 14.87 18.49 15.38 18.39C15.95 18.28 17.14 17.76 17.39 17.19C17.64 16.62 17.64 16.13 17.56 16.01C17.48 15.89 17.26 15.81 16.98 15.68L16.59 13.86Z"/>
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
                <path d="M22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 16.84 5.44 20.87 10 21.8V15H8V12H10V9.5C10 7.57 11.57 6 13.5 6H16V9H14C13.45 9 13 9.45 13 10V12H16V15H13V21.95C18.05 21.45 22 17.19 22 12Z"/>
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