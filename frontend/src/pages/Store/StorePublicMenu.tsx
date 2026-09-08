// frontend/src/pages/Store/StorePublicMenu.tsx
//
// واجهة المتجر العامة — مبنية على مكونات storefront المشتركة.
//
// كانت هذه الصفحة تعيش بمعزل عن واجهة المطعم: رأس خاص بها، وسلة خاصة،
// وألوان مكتوبة يدوياً، فتبدو المنصة منصتين. الآن كلتاهما على الهيكل نفسه
// (StorefrontLayout / CartSheet / BottomCartBar) وتختلفان حيث يجب أن
// تختلفا فقط: **المطعم قائمة، والمتجر شبكة**.
//
// الفرق ليس ذوقاً: زبون المطعم يقرأ الأسماء بحثاً عن صنف يعرفه، وزبون
// المتجر يتصفّح بعينه. القائمة تعطي الصورة ثُمن المساحة، والشبكة تعطيها
// الصدارة.
//
// وأُصلحت في الطريق أعطال كانت تمنع البيع أو تكذب على الزبون:
//   • كان الطلب **يُلزم بتسجيل الدخول** بينما واجهة المطعم تقبل الضيف
//     والخادم يقبله — حاجز أمام كل زبون جديد بلا سبب.
//   • كانت العملة مكتوبة «ر.س» في رسالة واتساب ورسالة الكوبون، والمنصة
//     تسعّر بالليرة.
//   • كان **التوصيل** نوع الطلب الوحيد، فلا سبيل لطلب استلام.
//   • كانت صورة السلة تُقرأ من `product.imageUrl` وهو حقل لا وجود له،
//     فتظهر السلة بلا صور دائماً.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  IoClose,
  IoSwapVerticalOutline,
  IoPersonCircleOutline,
  IoReceiptOutline,
  IoCheckmark,
  IoPricetagsOutline,
  IoHeartOutline,
  IoLogOutOutline
} from 'react-icons/io5';

import PublicAdvertisements from '@/components/public/PublicAdvertisements';
import PublicOffers from '@/components/public/PublicOffers';
import PublicMarketingSections from '@/components/public/PublicMarketingSections';
import PublicFooter from '@/components/public/PublicFooter';
import OrderTrackingModal from '@/components/OrderTrackingModal';

import ShopLayout from '@/components/storefront/ShopLayout';
import ProductGridCard, { StorefrontProduct } from '@/components/storefront/ProductGridCard';
import CartSheet, { StorefrontOrderType } from '@/components/storefront/CartSheet';
import BottomCartBar from '@/components/storefront/BottomCartBar';
import BottomSheet from '@/components/storefront/BottomSheet';
import ProductOptionsSheet, {
  parseProductOptions,
  hasOptions,
  OptionsResult
} from '@/components/storefront/ProductOptionsSheet';
import StorefrontSkeleton from '@/components/storefront/StorefrontSkeleton';
import StorefrontSeo from '@/components/storefront/StorefrontSeo';
import PlatformBadge from '@/components/storefront/PlatformBadge';
import { PickedLocation } from '@/components/storefront/LocationPickerMap';

import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { useTheme } from '@/context/ThemeContext';
import api, { getCurrentSubdomain } from '@/services/api';
import { applyStorefrontTheme, sf } from '@/utils/storefrontTheme';
import { formatPrice } from '@/utils/currency';
import useDisplayCurrency from '@/hooks/useDisplayCurrency';
import { captureRef, getRef, clearRef } from '@/utils/referral';
import CurrencySwitcher from '@/components/storefront/CurrencySwitcher';
import { calculateDistance } from '@/utils/distance';
import { resolveBadges } from '@/utils/catalogBadges';
import type { CartItem } from '@/services/types';
import { useSocket } from '@/hooks/useSocket';
import InstallAppPrompt from '../../components/storefront/InstallAppPrompt';
import useCartSnapshot from '../../hooks/useCartSnapshot';

// ==================== الأنواع ====================

interface Category {
  id: string;
  name: string;
  image?: string | null;
  position?: number;
}

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

type SortKey = 'featured' | 'price-low' | 'price-high' | 'newest' | 'discount';

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'featured', label: 'المقترح' },
  { key: 'discount', label: 'الأكثر تخفيضاً' },
  { key: 'price-low', label: 'السعر: من الأقل' },
  { key: 'price-high', label: 'السعر: من الأعلى' },
  { key: 'newest', label: 'الأحدث' }
];

/** قسم افتراضي للمنتجات بلا فئة — أفضل من إخفائها */
const UNCATEGORIZED = '__other__';

// ==================== المكوّن ====================

const StorePublicMenu: React.FC<StorePublicMenuProps> = ({
  businessId: propBusinessId,
  businessName: propBusinessName,
  businessSlug: propBusinessSlug,
  businessLogo: propBusinessLogo,
  businessCoverImage: propBusinessCoverImage,
  businessDescription: propBusinessDescription,
  businessPhone: propBusinessPhone,
  businessWhatsapp: propBusinessWhatsapp
}) => {
  const { slug: urlSlug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getCartCount } = useCart();
  const { favorites, toggleFavorite } = useFavorites();
  const { setThemeColors } = useTheme();

  // ---------- الحالة ----------
  const [store, setStore] = useState<any | null>(null);
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('featured');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);

  const [cartOpen, setCartOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [optionsProduct, setOptionsProduct] = useState<StorefrontProduct | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [orderType, setOrderType] = useState<StorefrontOrderType>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<PickedLocation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const currentSlug = propBusinessSlug || urlSlug || getCurrentSubdomain();

  /**
   * رابط صفحة المنتج.
   *
   * على نطاق التاجر الفرعي لا يوجد جزء slug في المسار — الواجهة تتعرّف
   * على المتجر من المضيف. وعلى النطاق الرئيسي يلزم. بناء الرابط بصيغة
   * واحدة كان سيُنتج 404 في أحد الوضعين.
   */
  const productPath = (productId: string) =>
    urlSlug ? `/${urlSlug}/product/${productId}` : `/product/${productId}`;
  const [identifier, setIdentifier] = useState<string | null | undefined>(currentSlug);

  // عملة العرض: اختيار الزائر إن بدّل، وإلا افتراضيّ التاجر. الكائن يحمل
  // سعر الصرف معه، فيحوّل `formatPrice` بدل أن يبدّل الرمز وحده.
  const {
    currency,
    code: currencyCode,
    setCode: setCurrencyCode,
    options: currencyOptions,
  } = useDisplayCurrency(
    (store as any)?.currencySettings,
    (store as any)?.id,
    (store as any)?.currency
  );


  // رمز المسوّق: يُلتقط من الرابط ويُحفظ ثلاثين يوماً — الزائر لا يشتري في
  // نفس الزيارة عادةً، ورمزٌ يعيش في العنوان وحده يضيع عند أوّل تنقّل
  useEffect(() => {
    const id = (store as any)?.id;
    if (!id) return;
    const code = captureRef(id);
    // الزيارة تُسجَّل مرّةً عند الالتقاط لا مع كل تحميل صفحة
    if (code) api.post('/affiliate/track', { code }).catch(() => undefined);
  }, [(store as any)?.id]);

  // ---------- تحميل البيانات ----------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const idToUse = identifier || currentSlug;
      if (!idToUse) {
        setLoading(false);
        setLoadError('لا يوجد معرّف للمتجر');
        return;
      }

      try {
        setLoading(true);
        setLoadError(null);

        const response: any = await api.get(`/public/${encodeURIComponent(idToUse)}`);
        const business = response?.data || response;

        if (cancelled) return;
        if (!business?.id) throw new Error('بيانات غير صالحة');

        const merged = {
          ...business,
          name: business.name || propBusinessName,
          logo: business.logo || propBusinessLogo,
          coverImage: business.coverImage || propBusinessCoverImage,
          description: business.description || propBusinessDescription,
          phone: business.phone || propBusinessPhone,
          whatsapp: business.whatsapp || propBusinessWhatsapp,
          branchLabel: business.branchLabel || business.subdomain || business.slug
        };

        setStore(merged);
        applyStorefrontTheme(merged, 'store');
        // ThemeContext يخدم بقية الصفحات — يبقى متزامناً مع متغيرات المتجر
        setThemeColors({
          primaryColor: merged.primaryColor,
          secondaryColor: merged.secondaryColor,
          backgroundColor: merged.backgroundColor,
          cardBgColor: merged.cardColor,
          surfaceColor: merged.surfaceColor,
          textColor: merged.textColor,
          mutedColor: merged.mutedColor,
          accentColor: merged.accentColor,
          fontFamily: merged.fontFamily
        } as any);

        setCategories(business.categories || []);
        setProducts(business.products || []);
        setBranches(business.linkedBranches || []);
        setIdentifier(business.slug || business.subdomain || idToUse);

        // التوصيل ليس متاحاً دائماً — لا نبدأ بنوع طلب يرفضه المتجر
        if (business.deliverySettings?.enableDelivery === false) {
          setOrderType('takeaway');
        }
      } catch (error: any) {
        if (cancelled) return;
        console.error('Error fetching store data:', error);
        setLoadError(
          error?.response?.status === 404
            ? 'هذا المتجر غير موجود أو تم إيقافه'
            : 'تعذّر تحميل بيانات المتجر'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlug]);

  useEffect(() => {
    if (isAuthenticated && user) {
      setCustomerName((prev) => prev || user.name || '');
      setCustomerPhone((prev) => prev || (user as any).phone || '');
    }
  }, [isAuthenticated, user]);

  // ---------- اشتقاقات ----------
  const cartCount = getCartCount();
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  // لقطة السلّة للتذكير التلقائي — تُلتقط حين تكون السلّة مفتوحةً وفيها
  // أصناف، لا مع كل إضافة
  useCartSnapshot({
    businessId: (store as any)?.id,
    businessType: 'store',
    active: cartOpen && cart.length > 0,
    items: cart.map((i: any) => ({ name: i.name, quantity: i.quantity })),
    total: cartTotal,
    phone: customerPhone
  });

  const quantityByProductId = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((item) => map.set(item.id, (map.get(item.id) || 0) + item.quantity));
    return map;
  }, [cart]);

  const searchTerm = searchQuery.trim().toLowerCase();
  const isSearching = searchTerm.length > 0;

  const sortProducts = useCallback(
    (list: StorefrontProduct[]): StorefrontProduct[] => {
      const copy = [...list];
      switch (sortBy) {
        case 'price-low':
          return copy.sort((a, b) => a.price - b.price);
        case 'price-high':
          return copy.sort((a, b) => b.price - a.price);
        case 'newest':
          return copy.sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        case 'discount':
          return copy.sort(
            (a, b) => (resolveBadges(b).discountPercent || 0) - (resolveBadges(a).discountPercent || 0)
          );
        default:
          // «المقترح»: المخفَّض ثم الرائج ثم الباقي — لا ترتيب عشوائي
          return copy.sort((a, b) => score(b) - score(a));
      }
    },
    [sortBy]
  );

  /** المنتجات بعد البحث والتصفية والترتيب */
  const visibleProducts = useMemo(() => {
    let list = products;

    if (isSearching) {
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchTerm) ||
          p.description?.toLowerCase().includes(searchTerm)
      );
    } else if (activeCategory !== 'all') {
      list = list.filter((p) => ((p as any).categoryId || UNCATEGORIZED) === activeCategory);
    }

    if (onlyDiscounted) {
      list = list.filter((p) => resolveBadges(p).hasDiscount);
    }

    return sortProducts(list);
  }, [products, isSearching, searchTerm, activeCategory, onlyDiscounted, sortProducts]);

  /** الفئات التي تحوي منتجاً فعلاً — فئة فارغة في الشريط تُحبط الزبون */
  const navCategories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      const id = (p as any).categoryId || UNCATEGORIZED;
      counts.set(id, (counts.get(id) || 0) + 1);
    });

    const named = categories
      .filter((c) => (counts.get(c.id) || 0) > 0)
      .map((c) => ({ id: c.id, name: c.name, image: c.image, count: counts.get(c.id) || 0 }));

    if ((counts.get(UNCATEGORIZED) || 0) > 0) {
      named.push({
        id: UNCATEGORIZED,
        name: 'منتجات أخرى',
        image: null,
        count: counts.get(UNCATEGORIZED)!
      });
    }

    // «الكل» بلاطة مثل غيرها: في نمط البلاطات لا يوجد شريط يحمل خياراً
    // منفصلاً، فبلا هذه لا سبيل للعودة من قسم إلى كل المنتجات
    return named.length > 1
      ? [{ id: 'all', name: 'كل المنتجات', image: null, count: products.length }, ...named]
      : named;
  }, [products, categories]);

  /**
   * المفضّلة **من هذا المتجر وحده**.
   *
   * useFavorites يخزّن مفضّلة كل المتاجر في مفتاح واحد بالمتصفح. عرضها
   * كلها هنا كان سيُظهر للزبون منتجات متجر آخر داخل هذا المتجر — ولا
   * سبيل لإضافتها إلى سلته أصلاً.
   */
  const favoriteProducts = useMemo(
    () => products.filter((p) => favorites.has(p.id)),
    [products, favorites]
  );

  const discountedCount = useMemo(
    () => products.filter((p) => resolveBadges(p).hasDiscount).length,
    [products]
  );

  // ---------- السلة ----------
  const toCartItem = (product: StorefrontProduct): CartItem =>
    ({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: Number(product.originalPrice) || product.price,
      quantity: 1,
      // الصورة من نفس المصدر الذي تعرضه البطاقة — لا من حقل مخترع
      image: coverOf(product),
      notes: ''
    } as CartItem);

  /**
   * الإضافة إلى السلة.
   *
   * منتج بخيارات لا يُضاف بنقرة: لونٌ أو مقاسٌ غير محدَّد يعني اتصالاً من
   * التاجر ليسأل — والاتصال يُلغي نصف الطلبات. فيُفتح لوح الاختيار أولاً.
   */
  // addToCart يعرض رسالته بنفسه — رسالة ثانية هنا تُظهر إشعارين لنقرة
  const handleAdd = (product: StorefrontProduct) => {
    if (hasOptions((product as any).options)) {
      setOptionsProduct(product);
      return;
    }
    addToCart(toCartItem(product));
  };

  const confirmOptions = (result: OptionsResult) => {
    if (!optionsProduct) return;

    // العرض بسعر الوحدة بعد الخيارات؛ الخادم يعيد حسابه من المخزَّن
    const addons: string[] = [];
    let size: string | undefined;
    parseProductOptions((optionsProduct as any).options).forEach((group) => {
      const picked = result.selection[group.name];
      const labels = Array.isArray(picked) ? picked : picked ? [picked] : [];
      labels.forEach((label) => {
        if (group.type === 'single' && !size) size = label;
        else addons.push(`${group.name}: ${label}`);
      });
    });

    addToCart({
      ...toCartItem(optionsProduct),
      price: result.unitPrice,
      quantity: result.quantity,
      size,
      addons,
      selectedOptions: result.selection
    });
    setOptionsProduct(null);
  };

  const handleQuantityChange = (product: StorefrontProduct, next: number) => {
    const line = cart.find((item) => item.id === product.id);
    if (!line) {
      if (next > 0) handleAdd(product);
      return;
    }
    // ⚠️ useCart يعرّف السطر بـ (id, size) لا بمفتاح مركّب. تمرير مفتاح
    // مركّب كمعرّف لا يطابق شيئاً، فتصمت الإزالة والتعديل بلا خطأ.
    if (next < 1) removeFromCart(line.id, line.size, line.addons);
    else updateQuantity(line.id, next, line.size, line.addons);
  };

  const applyCoupon = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const data: any = await api.get(
        `/coupons/validate/${encodeURIComponent(trimmed)}?orderTotal=${cartTotal}`
      );
      setCouponCode(trimmed);
      setDiscountAmount(Number(data?.discountAmount) || 0);
      toast.success(`طُبِّق الكوبون — خصم ${formatPrice(Number(data?.discountAmount) || 0, currency)}`);
    } catch (error: any) {
      setCouponCode('');
      setDiscountAmount(0);
      toast.error(error?.response?.data?.error || 'كوبون غير صالح');
    }
  };

  // ---------- التوصيل ----------
  const deliveryFee = useMemo(() => {
    if (orderType !== 'delivery') return 0;

    const settings = store?.deliverySettings;
    if (!settings) return 0;

    const base = Number(settings.baseFee) || 0;
    const afterDiscount = cartTotal - discountAmount;
    if (settings.freeDeliveryAbove && afterDiscount >= Number(settings.freeDeliveryAbove)) return 0;

    // بلا موقع محدَّد نعرض الرسم الأساس لا صفراً: صفرٌ يوهم الزبون
    // بتوصيل مجاني ثم يفاجئه الرقم
    if (!deliveryLocation || !store?.latitude || !store?.longitude) return Math.round(base);

    try {
      const distance = calculateDistance(
        parseFloat(store.latitude),
        parseFloat(store.longitude),
        deliveryLocation.lat,
        deliveryLocation.lng
      );
      const minDistance = Number(settings.minDistance) || 0;
      const perKm = Number(settings.feePerKm) || 0;
      const extra = distance > minDistance ? (distance - minDistance) * perKm : 0;
      return Math.round(base + extra);
    } catch {
      return Math.round(base);
    }
  }, [orderType, store, cartTotal, discountAmount, deliveryLocation]);

  // ---------- إرسال الطلب ----------
  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }

    /**
     * الطلب من المتجر يتطلّب حساباً.
     *
     * يختلف عن المطعم عمداً: زبون المطعم جالس على طاولة ويطلب مرة واحدة،
     * وإلزامه بالتسجيل هناك يعني هجر الطلب. أما طلب المتجر فيُشحن ويُتابَع
     * ويُرجَع — وبلا حساب لا يملك الزبون سجلّاً يرجع إليه، ولا التاجر
     * وسيلةً للتحقّق ممّن طلب.
     *
     * والمسار يُحفظ ليعود الزبون إلى سلّته بعد الدخول لا إلى الرئيسية.
     */
    if (!isAuthenticated) {
      try {
        localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
      } catch {
        /* وضع التصفّح الخاص قد يمنع التخزين — الدخول يبقى ممكناً */
      }
      toast('سجّل دخولك لإتمام الطلب ومتابعته', { icon: '🔐' });
      navigate('/user/login');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('الاسم ورقم الهاتف مطلوبان');
      return;
    }
    if (orderType === 'delivery' && !deliveryLocation && !address.trim()) {
      toast.error('حدّد موقع التوصيل أو اكتب العنوان');
      return;
    }

    setSubmitting(true);
    try {
      const subtotal = cartTotal;
      const total = subtotal - discountAmount + deliveryFee;

      // الطلب كضيف — الخادم يقبل POST /api/orders علناً، وواجهة المطعم
      // تفعلها منذ البداية. إلزام المتجر بتسجيل الدخول كان حاجزاً بلا سبب.
      const orderData = {
        storeId: store?.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: orderNotes.trim() || undefined,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.originalPrice,
          finalPrice: item.price,
          notes: item.notes,
          // الخادم يتحقّق منها ويحسب فرق السعر — لا نرسل السعر النهائي حكماً
          selectedOptions: item.selectedOptions
        })),
        subtotal,
        discountAmount,
        couponCode: couponCode || undefined,
        total,
        paymentMethod: 'cash',
        orderType,
        deliveryAddress:
          orderType === 'delivery' ? deliveryLocation?.address || address.trim() : undefined,
        deliveryLat: orderType === 'delivery' ? deliveryLocation?.lat : undefined,
        deliveryLng: orderType === 'delivery' ? deliveryLocation?.lng : undefined,
        deliveryFee: orderType === 'delivery' ? deliveryFee : 0,
        // يُتجاهَل بصمت إن كان منتهياً أو لنشاطٍ آخر — الخادم يتحقّق
        referralCode: getRef((store as any)?.id) || undefined
      };

      const response: any = await api.post('/orders', orderData);

      toast.success('تم إرسال طلبك — يتابعه المتجر الآن 🎉');
      // الرمز استُهلك: إبقاؤه ينسب كل طلبٍ لاحق للمسوّق نفسه
      clearRef((store as any)?.id);
      clearCart();
      setCartOpen(false);
      setOrderNotes('');
      setCouponCode('');
      setDiscountAmount(0);

      // ⚠️ كان يفتح واتساب تلقائياً هنا.
      //
      // الطلب يصل لوحة التاجر ويُطلق إشعاراً فورياً عبر السوكِت — فتح
      // واتساب لم يكن يُرسل شيئاً، بل يخطف متصفّح **الزبون** إلى تطبيق
      // آخر برسالة عليه أن يرسلها بنفسه. فمن لم ينتبه ظنّ أن الطلب لم
      // يُسجَّل، ومن أرسلها كرّر الطلب على التاجر.
      //
      // بدلها: تتبّع الطلب فوراً — وهو ما يريده الزبون بعد الضغط.
      fetchMyOrders();
      setShowOrderTracking(true);
    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast.error(error?.response?.data?.error || 'تعذّر إرسال الطلب، حاول مجدداً');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchMyOrders = useCallback(async (silent = false) => {
    if (!isAuthenticated) return;
    if (!silent) setLoadingOrders(true);
    try {
      const response: any = await api.get('/orders/my-orders');
      const orders = response?.data || response || [];
      setMyOrders(Array.isArray(orders) ? orders : []);
    } catch {
      /* غير حرج */
    } finally {
      if (!silent) setLoadingOrders(false);
    }
  }, [isAuthenticated]);

  /**
   * تحديث الطلب لحظياً.
   *
   * الخادم يبثّ `order:updated` إلى غرفة صاحب الطلب — وكان لا أحد يسمعه على
   * الواجهة. فيجهّز التاجر الطلب ويخرج به السائق، والزبون ينظر إلى «قيد
   * الانتظار» لأنه لم يحدّث الصفحة، فيتّصل بالمتجر ليسأل. وهو بالضبط ما
   * تُفترض شاشة التتبّع أن تمنعه.
   *
   * والبطاقة المفتوحة تُحدَّث معها: تركُها على حالتها القديمة أسوأ من عدم
   * التحديث، لأن الزبون يراها مفتوحةً أمامه فيصدّقها.
   */
  useSocket({
    token: localStorage.getItem('token'),
    enabled: isAuthenticated,
    onOrderUpdated: (event) => {
      const incoming = event?.order;
      if (!incoming?.id) return;

      setMyOrders((prev) =>
        prev.some((o) => o.id === incoming.id)
          ? prev.map((o) => (o.id === incoming.id ? { ...o, ...incoming } : o))
          : prev
      );
      setTrackingOrder((prev: any) =>
        prev && prev.id === incoming.id ? { ...prev, ...incoming } : prev
      );

      // ثم نُعيد الجلب بهدوء: حدث السوكِت يحمل رؤوس الطلب لا أصنافه
      fetchMyOrders(true);
    }
  });

  // ---------- شاشات الحالة ----------
  if (loading) return <StorefrontSkeleton />;

  if (loadError || !store) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: sf.bg,
          color: sf.text,
          padding: 24,
          textAlign: 'center',
          fontFamily: sf.font
        }}
        dir="rtl"
      >
        <div style={{ maxWidth: 380 }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🛍️</div>
          <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{loadError}</h1>
          <p style={{ color: sf.muted, fontSize: 13.5, lineHeight: 1.9 }}>
            تأكد من صحة الرابط أو تواصل مع المتجر.
          </p>
        </div>
      </div>
    );
  }

  const deliveryEnabled = store.deliverySettings?.enableDelivery !== false;
  const availableOrderTypes: StorefrontOrderType[] = deliveryEnabled
    ? ['delivery', 'takeaway']
    : ['takeaway'];

  return (
    <>
      <StorefrontSeo business={store} type="store" itemCount={products.length} />

      <ShopLayout
        name={store.name}
        description={store.description}
        logo={store.logo}
        coverImage={store.coverImage}
        phone={store.phone}
        whatsapp={store.whatsapp}
        address={store.address}
        branches={branches.map((b: any) => ({
          id: b.id,
          name: b.name,
          url: b.url,
          isCurrent: b.id === store.id
        }))}
        categories={isSearching ? [] : navCategories}
        activeCategory={activeCategory}
        onCategorySelect={setActiveCategory}
        cartCount={cartCount}
        onCartClick={() => setCartOpen(true)}
        favoritesCount={favoriteProducts.length}
        onFavoritesClick={() => setFavoritesOpen(true)}
        onAccountClick={() => setAccountOpen(true)}
        headerExtra={
          <CurrencySwitcher
            options={currencyOptions}
            code={currencyCode}
            onChange={setCurrencyCode}
          />
        }
        accountLabel={isAuthenticated ? user?.name?.split(' ')[0] || 'حسابي' : 'دخول'}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchOpen={() => setSearchOpen(true)}
        footer={
          <PublicFooter
            businessName={store.name}
            businessType="store"
            businessLogo={store.logo}
            businessSlug={store.slug}
            description={store.description}
            socialLinks={{
              facebook: store.facebook,
              instagram: store.instagram,
              whatsapp: store.whatsapp,
              tiktok: store.tiktok
            }}
            contactInfo={{
              phone: store.phone,
              email: store.email,
              address: store.address
            }}
            primaryColor={store.primaryColor}
            secondaryColor={store.secondaryColor}
            backgroundColor={store.backgroundColor}
            textColor={store.textColor}
            mutedColor={store.mutedColor}
            accentColor={store.accentColor}
          />
        }
      >
        {/* شريط الأدوات — البحث انتقل إلى الشريط العلوي الدائم */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSortSheetOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 13px',
              minHeight: 36,
              borderRadius: 999,
              border: `1px solid ${sf.border}`,
              background: sf.card,
              color: sf.muted,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer'
            }}
          >
            <IoSwapVerticalOutline size={15} />
            {SORT_OPTIONS.find((o) => o.key === sortBy)?.label || 'ترتيب'}
          </button>

          {/* مرشّح العروض — يظهر فقط حين توجد عروض فعلاً */}
        {discountedCount > 0 && (
          <button
            type="button"
            onClick={() => setOnlyDiscounted((v) => !v)}
            aria-pressed={onlyDiscounted}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 13px',
              minHeight: 36,
              borderRadius: 999,
              border: `1px solid ${onlyDiscounted ? 'transparent' : sf.border}`,
              background: onlyDiscounted ? '#FF6B6B' : sf.card,
              color: onlyDiscounted ? '#fff' : sf.muted,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer'
            }}
          >
            <IoPricetagsOutline size={15} />
            العروض ({discountedCount})
            {onlyDiscounted && <IoClose size={14} />}
          </button>
        )}

        </div>

        {/* الشبكة */}
        <section style={{ marginTop: 16 }}>
          <h2 style={sectionHeading}>
            {isSearching
              ? 'نتائج البحث'
              : onlyDiscounted
                ? 'العروض'
                : activeCategory === 'all'
                  ? 'كل المنتجات'
                  : navCategories.find((c) => c.id === activeCategory)?.name || 'المنتجات'}
            <span style={{ color: sf.muted, fontWeight: 600, fontSize: 12.5 }}>
              {visibleProducts.length} منتج
            </span>
          </h2>

          {visibleProducts.length === 0 ? (
            <EmptyState
              text={
                isSearching
                  ? 'لا توجد منتجات تطابق بحثك'
                  : onlyDiscounted
                    ? 'لا عروض حالياً'
                    : 'لا توجد منتجات متاحة حالياً'
              }
            />
          ) : (
            <motion.div
              className="shop-grid"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              {visibleProducts.map((product) => (
                <ProductGridCard
                  key={product.id}
                  product={product}
                  currency={currency}
                  quantityInCart={quantityByProductId.get(product.id) || 0}
                  onAdd={handleAdd}
                  onQuantityChange={handleQuantityChange}
                  onOpen={(p) => navigate(productPath(p.id))}
                  isFavorite={favorites.has(product.id)}
                  onToggleFavorite={(p) =>
                    toggleFavorite({
                      id: p.id,
                      type: 'product',
                      name: p.name,
                      price: p.price,
                      image: coverOf(p)
                    } as any)
                  }
                />
              ))}
            </motion.div>
          )}
        </section>

        {/* المحتوى التسويقي بعد الشبكة — لا يزاحم المنتجات */}
        {!isSearching && !onlyDiscounted && (
          <div style={{ marginTop: 28 }}>
            <PublicMarketingSections businessId={store.id} businessType="store" limitPerSection={6} />
            <PublicOffers businessId={store.id} businessType="store" limit={4} />
            <div style={{ marginTop: 24 }}>
              <PublicAdvertisements
                businessId={store.id}
                businessType="store"
                currentPlan={store.plan}
                limit={2}
                position="bottom"
              />
            </div>
          </div>
        )}
      </ShopLayout>

      {/* ==================== شريط السلة ==================== */}
      <BottomCartBar
        itemCount={cartCount}
        total={cartTotal}
        currency={currency}
        onOpen={() => setCartOpen(true)}
        hidden={cartOpen || sortSheetOpen || searchOpen}
      />

      {/* ==================== لوح البحث ==================== */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 90,
              background: sf.bg,
              padding: 16,
              fontFamily: sf.font
            }}
            dir="rtl"
          >
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتج..."
                style={{
                  flex: 1,
                  minHeight: 46,
                  padding: '0 14px',
                  borderRadius: 13,
                  border: `1px solid ${sf.border}`,
                  background: sf.card,
                  color: sf.text,
                  fontSize: 14.5,
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                style={iconButtonStyle}
                aria-label="إغلاق البحث"
              >
                <IoClose size={20} />
              </button>
            </div>

            <div style={{ marginTop: 14, overflowY: 'auto', maxHeight: 'calc(100vh - 90px)' }}>
              <div className="shop-grid">
                {visibleProducts.map((product) => (
                  <ProductGridCard
                    key={product.id}
                    product={product}
                    currency={currency}
                    quantityInCart={quantityByProductId.get(product.id) || 0}
                    onAdd={handleAdd}
                    onQuantityChange={handleQuantityChange}
                    onOpen={(p) => navigate(productPath(p.id))}
                    isFavorite={favorites.has(product.id)}
                  />
                ))}
              </div>
              {isSearching && visibleProducts.length === 0 && (
                <EmptyState text="لا توجد منتجات تطابق بحثك" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== لوح الترتيب ==================== */}
      <BottomSheet open={sortSheetOpen} onClose={() => setSortSheetOpen(false)} title="ترتيب المنتجات">
        <div style={{ padding: '4px 0 10px' }}>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setSortBy(option.key);
                setSortSheetOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 4px',
                minHeight: 48,
                background: 'none',
                border: 'none',
                borderBottom: `1px solid ${sf.border}`,
                color: sortBy === option.key ? sf.accent : sf.text,
                fontSize: 14,
                fontWeight: sortBy === option.key ? 800 : 500,
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            >
              {option.label}
              {sortBy === option.key && <IoCheckmark size={18} />}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* ==================== السلة ==================== */}
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        currency={currency}
        onQuantityChange={(item, next) => {
          if (next < 1) removeFromCart(item.id, item.size, item.addons);
          else updateQuantity(item.id, next, item.size, item.addons);
        }}
        onRemove={(item) => removeFromCart(item.id, item.size, item.addons)}
        onClear={clearCart}
        availableOrderTypes={availableOrderTypes}
        orderType={orderType}
        onOrderTypeChange={setOrderType}
        customerName={customerName}
        customerPhone={customerPhone}
        notes={orderNotes}
        onCustomerNameChange={setCustomerName}
        onCustomerPhoneChange={setCustomerPhone}
        onNotesChange={setOrderNotes}
        address={address}
        onAddressChange={setAddress}
        deliveryLocation={deliveryLocation}
        onDeliveryLocationChange={setDeliveryLocation}
        businessLocation={
          store.latitude && store.longitude
            ? { lat: parseFloat(store.latitude), lng: parseFloat(store.longitude) }
            : undefined
        }
        deliveryFee={deliveryFee}
        discount={discountAmount}
        couponCode={couponCode}
        onCouponApply={applyCoupon}
        onCouponRemove={() => {
          setCouponCode('');
          setDiscountAmount(0);
        }}
        submitting={submitting}
        onSubmit={submitOrder}
      />

      {/* ==================== خيارات المنتج ==================== */}
      <ProductOptionsSheet
        open={!!optionsProduct}
        name={optionsProduct?.name || ''}
        basePrice={optionsProduct?.price || 0}
        options={parseProductOptions((optionsProduct as any)?.options)}
        currency={currency}
        onClose={() => setOptionsProduct(null)}
        onConfirm={confirmOptions}
      />

      {/* ==================== المفضلة ==================== */}
      <BottomSheet open={favoritesOpen} onClose={() => setFavoritesOpen(false)} title="المفضلة">
        {favoriteProducts.length === 0 ? (
          <div style={{ padding: '30px 10px', textAlign: 'center', color: sf.muted, fontSize: 13, lineHeight: 1.9 }}>
            لم تضف شيئاً بعد.
            <br />
            اضغط ♡ على أي منتج ليظهر هنا.
          </div>
        ) : (
          <div className="shop-grid" style={{ padding: '4px 0 14px' }}>
            {favoriteProducts.map((product) => (
              <ProductGridCard
                key={product.id}
                product={product}
                currency={currency}
                quantityInCart={quantityByProductId.get(product.id) || 0}
                onAdd={handleAdd}
                onQuantityChange={handleQuantityChange}
                onOpen={(p) => {
                  setFavoritesOpen(false);
                  navigate(productPath(p.id));
                }}
                isFavorite
                onToggleFavorite={(p) =>
                  toggleFavorite({
                    id: p.id,
                    type: 'product',
                    name: p.name,
                    price: p.price,
                    image: coverOf(p)
                  } as any)
                }
              />
            ))}
          </div>
        )}
      </BottomSheet>

      {/* ==================== الحساب ==================== */}
      <BottomSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        title={isAuthenticated ? user?.name || 'حسابي' : 'حسابك'}
      >
        <div style={{ display: 'grid', gap: 9, padding: '4px 0 14px' }}>
          {isAuthenticated ? (
            <>
              <div style={{ color: sf.muted, fontSize: 12.5, lineHeight: 1.9, marginBottom: 4 }}>
                {(user as any)?.email}
              </div>
              <SheetAction
                icon={<IoPersonCircleOutline size={18} />}
                label="بياناتي"
                onClick={() => {
                  setAccountOpen(false);
                  navigate('/profile');
                }}
              />
              <SheetAction
                icon={<IoReceiptOutline size={18} />}
                label="طلباتي"
                onClick={() => {
                  setAccountOpen(false);
                  fetchMyOrders();
                  setShowOrderTracking(true);
                }}
              />
              <SheetAction
                icon={<IoHeartOutline size={18} />}
                label="المفضلة"
                onClick={() => {
                  setAccountOpen(false);
                  setFavoritesOpen(true);
                }}
              />
              <SheetAction
                icon={<IoLogOutOutline size={18} />}
                label="تسجيل الخروج"
                danger
                onClick={() => {
                  setAccountOpen(false);
                  logout();
                }}
              />
            </>
          ) : (
            <>
              {/* الطلب لا يحتاج حساباً — نقولها صراحةً كي لا يهرب الزبون */}
              <div style={{ color: sf.muted, fontSize: 12.5, lineHeight: 1.9 }}>
                يمكنك الطلب كضيف بلا حساب. الحساب يحفظ طلباتك ويتيح تتبّعها.
              </div>
              <Link
                to="/user/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 46,
                  borderRadius: 12,
                  background: sf.accent,
                  color: sf.onAccent,
                  fontWeight: 800,
                  fontSize: 13.5,
                  textDecoration: 'none'
                }}
              >
                <IoPersonCircleOutline size={18} />
                تسجيل الدخول
              </Link>
              <SheetAction
                icon={<IoHeartOutline size={18} />}
                label="المفضلة"
                onClick={() => {
                  setAccountOpen(false);
                  setFavoritesOpen(true);
                }}
              />
            </>
          )}
        </div>
      </BottomSheet>

      {/* ==================== تتبّع الطلبات ==================== */}
      <OrderTrackingModal
        businessId={(store as any)?.id}
        isAuthenticated={isAuthenticated}
        isOpen={showOrderTracking}
        onClose={() => {
          setShowOrderTracking(false);
          setTrackingOrder(null);
        }}
        trackingOrder={trackingOrder}
        orders={myOrders}
        onSelectOrder={setTrackingOrder}
        formatPrice={(price: number) => formatPrice(price, currency)}
        loading={loadingOrders}
        kind="store"
        onRated={() => fetchMyOrders(true)}
      />

      {/* التثبيت على الشاشة الرئيسية — وعلى iPhone هو شرط الإشعارات لا تحسينها */}
      <InstallAppPrompt businessName={(store as any)?.name} />

      {/* الشارة يحسمها الخادم: قد تكون الميزة مشتراة مفردةً على خطة مجانية */}
      <PlatformBadge show={store?.showPlatformBadge} />
    </>
  );
};

// ==================== عناصر مساعدة ====================

/** أول صورة صالحة — نفس منطق البطاقة كي لا تختلف صورة السلة عن الشبكة */
const coverOf = (product: StorefrontProduct): string | undefined => {
  const { images, image } = product;
  if (Array.isArray(images) && images.length > 0) return images[0];
  if (typeof images === 'string' && images.trim()) {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {
      return images;
    }
  }
  return image || undefined;
};

/** ترتيب «المقترح»: المخفَّض أولاً ثم الرائج ثم الجديد */
const score = (product: StorefrontProduct): number => {
  const badges = resolveBadges(product);
  return (
    (badges.hasDiscount ? 1000 + (badges.discountPercent || 0) : 0) +
    (badges.isTrending ? 500 : 0) +
    (badges.isNew ? 100 : 0)
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      padding: '46px 20px',
      textAlign: 'center',
      color: sf.muted,
      fontSize: 13.5,
      lineHeight: 1.9
    }}
  >
    {text}
  </div>
);

/** إجراء داخل لوح سفلي */
const SheetAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      minHeight: 46,
      padding: '0 14px',
      borderRadius: 12,
      border: `1px solid ${sf.border}`,
      background: sf.card,
      color: danger ? '#FF6B6B' : sf.text,
      fontSize: 13.5,
      fontWeight: 700,
      fontFamily: 'inherit',
      cursor: 'pointer',
      textAlign: 'start'
    }}
  >
    {icon}
    {label}
  </button>
);

const sectionHeading: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 10,
  color: sf.text,
  fontSize: 15.5,
  fontWeight: 800,
  margin: '0 0 12px'
};

const iconButtonStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  minWidth: 44,
  borderRadius: 13,
  border: `1px solid ${sf.border}`,
  background: sf.card,
  color: sf.text,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  flexShrink: 0
};

export default StorePublicMenu;
