// frontend/src/pages/Restaurant/RestaurantPublicMenu.tsx
//
// واجهة المطعم العامة — مبنية على مكونات storefront المشتركة.
// المبادئ: الجوال أولاً، ألوان التاجر عبر متغيرات CSS، والطلب كضيف بلا تسجيل دخول.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  IoSearchOutline,
  IoClose,
  IoSwapVerticalOutline,
  IoPersonCircleOutline,
  IoReceiptOutline,
  IoCheckmark
} from 'react-icons/io5';

import PublicAdvertisements from '@/components/public/PublicAdvertisements';
import PublicMarketingSections from '@/components/public/PublicMarketingSections';
import PublicFooter from '@/components/public/PublicFooter';
import OrderTrackingModal from '@/components/OrderTrackingModal';

import StorefrontLayout from '@/components/storefront/StorefrontLayout';
import StickyCategoryNav from '@/components/storefront/StickyCategoryNav';
import MenuItemListCard, { StorefrontMenuItem } from '@/components/storefront/MenuItemListCard';
import ItemOptionsSheet, { SelectedOptions } from '@/components/storefront/ItemOptionsSheet';
import CartSheet, { StorefrontOrderType, cartLineKey } from '@/components/storefront/CartSheet';
import BottomCartBar from '@/components/storefront/BottomCartBar';
import BottomSheet from '@/components/storefront/BottomSheet';
import StorefrontSkeleton from '@/components/storefront/StorefrontSkeleton';

import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import api, { getCurrentSubdomain } from '@/services/api';
import { getImageUrl } from '@/utils/imageHelpers';
import { applyStorefrontTheme, sf } from '@/utils/storefrontTheme';
import { formatPrice } from '@/utils/currency';
import useDisplayCurrency from '@/hooks/useDisplayCurrency';
import { captureRef, getRef, clearRef } from '@/utils/referral';
import CurrencySwitcher from '@/components/storefront/CurrencySwitcher';
import LanguageSwitcher from '@/components/storefront/LanguageSwitcher';
import useStorefrontLanguage from '@/hooks/useStorefrontLanguage';
import type { CartItem } from '@/services/types';
import PlatformBadge from '@/components/storefront/PlatformBadge';
import StorefrontSeo from '@/components/storefront/StorefrontSeo';
import { useSocket } from '@/hooks/useSocket';
import InstallAppPrompt from '../../components/storefront/InstallAppPrompt';
import useStoreManifest from '../../hooks/useStoreManifest';
import { StorefrontI18nProvider, makeT } from '@/i18n/storefront';

// ==================== الأنواع ====================

interface Category {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  image?: string;
  position?: number;
  menuItems?: StorefrontMenuItem[];
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

type SortKey = 'popular' | 'price-low' | 'price-high' | 'newest';

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'popular', label: 'الأكثر طلباً' },
  { key: 'price-low', label: 'السعر: من الأقل' },
  { key: 'price-high', label: 'السعر: من الأعلى' },
  { key: 'newest', label: 'الأحدث' }
];

const MINI_HEADER_OFFSET = 56;

// ==================== المكوّن ====================

const RestaurantPublicMenu: React.FC<RestaurantPublicMenuProps> = ({
  businessId: propBusinessId,
  businessName: propBusinessName,
  businessSlug: propBusinessSlug,
  businessLogo: propBusinessLogo,
  businessCoverImage: propBusinessCoverImage,
  businessDescription: propBusinessDescription,
  businessPhone: propBusinessPhone,
  businessWhatsapp: propBusinessWhatsapp
}) => {
  const { slug: urlSlug, tableId } = useParams();

  // بيان التطبيق باسم هذا المطعم وهويته — يستبدل بيان المنصّة داخل صفحته،
  // ويحدّد هل تُعرض دعوة التثبيت أصلاً (الميزة تُشترى).
  //
  // المعرّف من المسار لا من الكائن: الكائن يُصرَّح بعد هذا السطر، والمسار
  // هو ما وصل به الزبون أصلاً فيكفي.
  const storePwa = useStoreManifest(urlSlug);

  const navigate = useNavigate();

  const { user, isAuthenticated, logout } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getCartCount } = useCart();
  const { favorites, toggleFavorite } = useFavorites();

  // ---------- الحالة ----------
  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // لغة عرض المحتوى — من إعدادات المطعم التي يحسبها الخادم بحسب استحقاق
  // `multi_language`، فلا يظهر الزرّ لمن لم يشترِ الميزة
  const language = useStorefrontLanguage(urlSlug, (restaurant as any)?.languageSettings);
  // الصفحة فوق المزوّد فلا تراه — تبني دالّتها من نفس اللغة
  const t = useMemo(() => makeT(language.lang), [language.lang]);

  /**
   * الأقسام وأصنافها بلغة العرض.
   *
   * **الترجمة عند المصدر لا في كل بطاقة:** البطاقات تقرأ `name` مباشرةً،
   * وتمريرُ اللغة إلى كلٍّ منها كان يعني تعديل عدّة مكوّنات وتذكّرَ ذلك في
   * كل مكوّنٍ جديد.
   */
  const localizedCategories = useMemo(() => {
    if (language.lang !== 'en') return categories;
    return categories.map((category: any) => ({
      ...category,
      name: language.pick(category, 'name'),
      menuItems: (category.menuItems || []).map((item: any) => ({
        ...item,
        name: language.pick(item, 'name'),
        description: language.pick(item, 'description')
      }))
    }));
  }, [categories, language]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('popular');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const [optionsItem, setOptionsItem] = useState<StorefrontMenuItem | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [orderType, setOrderType] = useState<StorefrontOrderType>(tableId ? 'dine_in' : 'takeaway');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentSlug = propBusinessSlug || urlSlug || getCurrentSubdomain();
  const [identifier, setIdentifier] = useState<string | null | undefined>(currentSlug);

  // عملة العرض: اختيار الزائر إن بدّل، وإلا افتراضيّ التاجر. الكائن يحمل
  // سعر الصرف معه، فيحوّل `formatPrice` بدل أن يبدّل الرمز وحده.
  const {
    currency,
    code: currencyCode,
    setCode: setCurrencyCode,
    options: currencyOptions,
  } = useDisplayCurrency(
    (restaurant as any)?.currencySettings,
    (restaurant as any)?.id,
    (restaurant as any)?.currency
  );

  // رمز المسوّق: يُلتقط من الرابط ويُحفظ ثلاثين يوماً — الزائر لا يشتري في
  // نفس الزيارة عادةً، ورمزٌ يعيش في العنوان وحده يضيع عند أوّل تنقّل
  useEffect(() => {
    const id = (restaurant as any)?.id;
    if (!id) return;
    const code = captureRef(id);
    // الزيارة تُسجَّل مرّةً عند الالتقاط لا مع كل تحميل صفحة
    if (code) api.post('/affiliate/track', { code }).catch(() => undefined);
  }, [(restaurant as any)?.id]);

  // ---------- تحميل البيانات ----------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const idToUse = identifier || currentSlug;
      if (!idToUse) {
        setLoading(false);
        setLoadError('لا يوجد معرّف للمطعم');
        return;
      }

      try {
        setLoading(true);
        setLoadError(null);

        const response: any = await api.get(`/public/${encodeURIComponent(idToUse)}`);
        const business = response?.data || response;

        if (cancelled) return;

        if (!business?.id) throw new Error('بيانات غير صالحة');

        setRestaurant({
          ...business,
          name: business.name || propBusinessName,
          logo: business.logo || propBusinessLogo,
          coverImage: business.coverImage || propBusinessCoverImage,
          description: business.description || propBusinessDescription,
          phone: business.phone || propBusinessPhone,
          whatsapp: business.whatsapp || propBusinessWhatsapp,
          branchLabel: business.branchLabel || business.subdomain || business.slug
        });

        // ربط الأصناف بأقسامها: الخادم يُرجعها في مصفوفتين منفصلتين
        const rawCategories: Category[] = business.categories || [];
        const items: StorefrontMenuItem[] = business.menuItems || [];

        const grouped = rawCategories.map((category) => ({
          ...category,
          menuItems: items.filter((item: any) => item.categoryId === category.id)
        }));

        const uncategorized = items.filter(
          (item: any) => !item.categoryId || !rawCategories.some((c) => c.id === item.categoryId)
        );
        if (uncategorized.length > 0) {
          grouped.push({ id: '__other__', name: 'أصناف أخرى', menuItems: uncategorized });
        }

        setCategories(grouped.filter((c) => (c.menuItems?.length || 0) > 0));
        setBranches(business.linkedBranches || []);
        setIdentifier(business.slug || business.subdomain || idToUse);
      } catch (error: any) {
        if (cancelled) return;
        console.error('Error fetching restaurant data:', error);
        setLoadError(
          error?.response?.status === 404
            ? 'هذا المطعم غير موجود أو تم إيقافه'
            : 'تعذّر تحميل بيانات المطعم'
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
  }, [identifier]);

  // ---------- تطبيق ألوان التاجر ----------
  useEffect(() => {
    if (!restaurant) return;
    return applyStorefrontTheme(restaurant, 'restaurant');
  }, [restaurant]);

  // ---------- تعبئة بيانات المستخدم إن كان مسجلاً (اختياري) ----------
  useEffect(() => {
    if (isAuthenticated && user) {
      setCustomerName((prev) => prev || user.name || '');
      setCustomerPhone((prev) => prev || (user as any).phone || '');
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // ---------- الأصناف المعروضة ----------
  const allItems = useMemo(
    () => categories.flatMap((category) => category.menuItems || []),
    [categories]
  );

  const isSearching = searchQuery.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const query = searchQuery.trim().toLowerCase();
    return allItems.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    );
  }, [allItems, searchQuery, isSearching]);

  const sortItems = useCallback(
    (items: StorefrontMenuItem[]): StorefrontMenuItem[] => {
      const priceOf = (item: StorefrontMenuItem) =>
        item.discountedPrice && item.discountedPrice > 0 ? item.discountedPrice : item.price;

      const sorted = [...items];
      switch (sortBy) {
        case 'price-low':
          return sorted.sort((a, b) => priceOf(a) - priceOf(b));
        case 'price-high':
          return sorted.sort((a, b) => priceOf(b) - priceOf(a));
        case 'newest':
          return sorted.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
        case 'popular':
        default:
          return sorted.sort((a, b) => Number(!!b.isPopular) - Number(!!a.isPopular));
      }
    },
    [sortBy]
  );

  const navCategories = useMemo(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        count: category.menuItems?.length || 0
      })),
    [categories]
  );

  // ---------- السلة ----------
  const cartCount = getCartCount();

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0),
    [cart]
  );

  /** الكمية الإجمالية لصنف في السلة عبر كل صيَغه */
  const quantityByItemId = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((item) => {
      map.set(item.id, (map.get(item.id) || 0) + (Number(item.quantity) || 0));
    });
    return map;
  }, [cart]);

  const hasOptions = (item: StorefrontMenuItem) =>
    (item.sizes?.length || 0) > 0 || (item.addons?.length || 0) > 0;

  const handleAdd = (item: StorefrontMenuItem) => {
    if (hasOptions(item)) {
      setOptionsItem(item);
      setOptionsOpen(true);
      return;
    }

    const price = item.discountedPrice && item.discountedPrice > 0 ? item.discountedPrice : item.price;
    addToCart({
      id: item.id,
      name: item.name,
      originalPrice: Number(item.price) || 0,
      price: Number(price) || 0,
      quantity: 1,
      image: item.image,
      notes: ''
    });
  };

  const handleConfirmOptions = (item: StorefrontMenuItem, options: SelectedOptions) => {
    addToCart({
      id: item.id,
      name: item.name,
      originalPrice: Number(item.price) || 0,
      price: options.unitPrice,
      quantity: options.quantity,
      image: item.image,
      notes: options.notes,
      size: options.size?.name,
      addons: options.addons.map((a) => a.name)
    });
    setOptionsOpen(false);
    setOptionsItem(null);
  };

  /** تعديل كمية صنف بلا خيارات مباشرة من البطاقة */
  const handleCardQuantityChange = (item: StorefrontMenuItem, next: number) => {
    const line = cart.find((c) => c.id === item.id && !c.size);
    if (!line) return;
    if (next < 1) removeFromCart(item.id, line.size);
    else updateQuantity(item.id, next, line.size);
  };

  const handleCartQuantityChange = (item: CartItem, next: number) => {
    if (next < 1) removeFromCart(item.id, item.size);
    else updateQuantity(item.id, next, item.size);
  };

  // ---------- إرسال الطلب ----------
  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error(t('السلة فارغة'));
      return;
    }

    const isDineInAtTable = orderType === 'dine_in' && !!tableId;
    if (!isDineInAtTable && (!customerName.trim() || !customerPhone.trim())) {
      toast.error(t('الاسم ورقم الهاتف مطلوبان'));
      return;
    }
    if (orderType === 'delivery' && !address.trim()) {
      toast.error(t('عنوان التوصيل مطلوب'));
      return;
    }

    setSubmitting(true);
    try {
      const subtotal = cartTotal;

      // الطلب كضيف — لا نطلب تسجيل دخول. الواجهة الخلفية تقبل POST /api/orders علناً.
      const orderData = {
        restaurantId: restaurant?.id,
        tableId: tableId || null,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: orderType === 'delivery' ? address.trim() : undefined,
        notes: orderNotes.trim() || undefined,
        items: cart.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
          price: item.originalPrice,
          finalPrice: item.price,
          size: item.size,
          addons: item.addons,
          notes: item.notes
        })),
        subtotal,
        total: subtotal,
        paymentMethod: 'cash',
        orderType,
        // يُتجاهَل بصمت إن كان منتهياً أو لنشاطٍ آخر — الخادم يتحقّق
        referralCode: getRef((restaurant as any)?.id) || undefined
      };

      await api.post('/orders', orderData);

      toast.success(t('تم إرسال طلبك بنجاح 🎉'));
      // الرمز استُهلك: إبقاؤه ينسب كل طلبٍ لاحق للمسوّق نفسه
      clearRef((restaurant as any)?.id);
      clearCart();
      setCartOpen(false);
      setOrderNotes('');

      if (isAuthenticated) fetchMyOrders();

      // ⚠️ كان يفتح واتساب تلقائياً هنا.
      //
      // الطلب يصل لوحة المطعم ويُطلق إشعاراً فورياً عبر السوكِت. فتح
      // واتساب لا يُرسل شيئاً — يخطف متصفّح الزبون إلى تطبيق آخر برسالة
      // عليه أن يرسلها بنفسه، فيظنّ من لم ينتبه أن طلبه لم يُسجَّل.
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
   * تحديث الطلب لحظياً — الخادم يبثّ `order:updated` إلى غرفة صاحب الطلب،
   * وكان لا أحد يسمعه هنا. فيبقى الزبون على «قيد الانتظار» بينما خرج طلبه.
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

      fetchMyOrders(true);
    }
  });

  // ---------- شاشات الحالة ----------
  if (loading) return <StorefrontSkeleton />;

  if (loadError || !restaurant) {
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
          <div style={{ fontSize: 52, marginBottom: 14 }}>🍽️</div>
          <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{loadError}</h1>
          <p style={{ color: sf.muted, fontSize: 13.5, lineHeight: 1.9 }}>{t('تأكد من صحة الرابط أو تواصل مع المطعم.')}</p>
        </div>
      </div>
    );
  }

  const displayCategories = isSearching ? [] : localizedCategories;

  // ---------- إجراءات الرأس المصغّر ----------
  const headerActions = (
    <>
      {/* العملة أوّلاً: قرارٌ يسبق البحث والترتيب — الزبون يريد أن يقرأ
          السعر بعملته قبل أن يبحث فيه */}
      <CurrencySwitcher
        options={currencyOptions}
        code={currencyCode}
        onChange={setCurrencyCode}
      />
      {/* اللغة بعد العملة: التبديل بينهما قرارٌ واحد في ذهن الزبون */}
      <LanguageSwitcher
        options={language.options}
        lang={language.lang}
        onChange={language.setLang}
      />
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label={t('بحث')}
        style={iconButtonStyle}
      >
        <IoSearchOutline size={19} />
      </button>
      <button
        type="button"
        onClick={() => setSortSheetOpen(true)}
        aria-label={t('ترتيب')}
        style={iconButtonStyle}
      >
        <IoSwapVerticalOutline size={19} />
      </button>
    </>
  );

  return (
    // المزوّد يلفّ الشجرة كلّها: البطاقات والسلّة والرأس تقرأ اللغة
    // منه بلا تمريرٍ عبر عشرة مكوّنات
    <StorefrontI18nProvider lang={language.lang}>
      <StorefrontSeo
        business={restaurant}
        type="restaurant"
        itemCount={categories.reduce((sum, c) => sum + (c.menuItems?.length || 0), 0)}
      />

      <StorefrontLayout
        name={language.pick(restaurant, 'name')}
        description={language.pick(restaurant, 'description')}
        logo={restaurant.logo}
        coverImage={restaurant.coverImage}
        phone={restaurant.phone}
        whatsapp={restaurant.whatsapp}
        address={restaurant.address}
        branchLabel={restaurant.branchLabel}
        branches={branches.map((b: any) => ({
          id: b.id,
          name: b.name,
          url: b.url,
          label: b.linkLabel,
          isCurrent: b.id === restaurant.id
        }))}
        headerActions={headerActions}
        cartCount={cartCount}
        onCartClick={() => setCartOpen(true)}
        stickyNav={
          !isSearching && navCategories.length > 0 ? (
            <StickyCategoryNav
              categories={navCategories}
              offsetTop={MINI_HEADER_OFFSET}
              sectionIdPrefix="cat-"
              scrollSpy
            />
          ) : null
        }
        footer={
          <PublicFooter
            businessName={language.pick(restaurant, 'name')}
            businessType="restaurant"
            businessLogo={restaurant.logo}
            businessSlug={restaurant.slug}
            description={language.pick(restaurant, 'description')}
            socialLinks={{
              facebook: restaurant.facebook,
              instagram: restaurant.instagram,
              whatsapp: restaurant.whatsapp,
              tiktok: restaurant.tiktok
            }}
            contactInfo={{
              phone: restaurant.phone,
              email: restaurant.email,
              address: restaurant.address,
              openingHours: restaurant.openingHours
            }}
            primaryColor={restaurant.primaryColor}
            secondaryColor={restaurant.secondaryColor}
            backgroundColor={restaurant.backgroundColor}
            textColor={restaurant.textColor}
            mutedColor={restaurant.mutedColor}
            accentColor={restaurant.accentColor}
          />
        }
      >
        {/* شريط أدوات: بحث + ترتيب + حساب */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
            marginBottom: 4
          }}
        >
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            style={{
              flex: 1,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '0 14px',
              borderRadius: 13,
              border: `1px solid ${sf.border}`,
              background: sf.card,
              color: sf.muted,
              fontSize: 13,
              fontFamily: 'inherit',
              cursor: 'pointer',
              textAlign: 'start'
            }}
          >
            <IoSearchOutline size={17} />
            {isSearching ? searchQuery : 'ابحث في القائمة...'}
          </button>

          <button type="button" onClick={() => setSortSheetOpen(true)} style={iconButtonStyle} aria-label={t('ترتيب')}>
            <IoSwapVerticalOutline size={19} />
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                fetchMyOrders();
                setShowOrderTracking(true);
              }}
              style={iconButtonStyle}
              aria-label={t('طلباتي')}
            >
              <IoReceiptOutline size={19} />
            </button>
          ) : (
            <Link
              to="/user/login"
              style={{ ...iconButtonStyle, textDecoration: 'none' }}
              aria-label={t('تسجيل الدخول (اختياري)')}
            >
              <IoPersonCircleOutline size={19} />
            </Link>
          )}
        </div>

        {/* نتائج البحث */}
        {isSearching ? (
          <section style={{ marginTop: 16 }}>
            <h2 style={sectionHeading}>{t('نتائج البحث')}<span style={{ color: sf.muted, fontWeight: 600, fontSize: 12.5 }}>
                {searchResults.length} صنف
              </span>
            </h2>

            {searchResults.length === 0 ? (
              <EmptyState text="لا توجد أصناف تطابق بحثك" />
            ) : (
              <div style={itemListStyle}>
                {sortItems(searchResults).map((item) => (
                  <MenuItemListCard
                    key={item.id}
                    item={item}
                    currency={currency}
                    quantityInCart={quantityByItemId.get(item.id) || 0}
                    onAdd={handleAdd}
                    onQuantityChange={handleCardQuantityChange}
                    onOpenDetails={(it) => {
                      setOptionsItem(it);
                      setOptionsOpen(true);
                    }}
                    isFavorite={favorites.has(item.id)}
                    onToggleFavorite={(it) =>
                      toggleFavorite({
                        id: it.id,
                        type: 'menuItem',
                        name: it.name,
                        price: it.price,
                        image: it.image
                      } as any)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {displayCategories.length === 0 ? (
              <EmptyState text="لا توجد أصناف متاحة حالياً" />
            ) : (
              displayCategories.map((category, index) => (
                <React.Fragment key={category.id}>
                  <section id={`cat-${category.id}`} style={{ marginTop: index === 0 ? 18 : 26, scrollMarginTop: 120 }}>
                    <h2 style={sectionHeading}>
                      {category.name}
                      <span style={{ color: sf.muted, fontWeight: 600, fontSize: 12.5 }}>
                        {category.menuItems?.length || 0}
                      </span>
                    </h2>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.22 }}
                      style={itemListStyle}
                    >
                      {sortItems(category.menuItems || []).map((item) => (
                        <MenuItemListCard
                          key={item.id}
                          item={item}
                          currency={currency}
                          quantityInCart={quantityByItemId.get(item.id) || 0}
                          onAdd={handleAdd}
                          onQuantityChange={handleCardQuantityChange}
                          onOpenDetails={(it) => {
                            setOptionsItem(it);
                            setOptionsOpen(true);
                          }}
                          isFavorite={favorites.has(item.id)}
                          onToggleFavorite={(it) =>
                            toggleFavorite({
                              id: it.id,
                              type: 'menuItem',
                              name: it.name,
                              price: it.price,
                              image: it.image
                            } as any)
                          }
                        />
                      ))}
                    </motion.div>
                  </section>

                  {/* المحتوى التسويقي بعد أول قسمين — لا يزاحم القائمة */}
                  {index === 1 && (
                    <div style={{ marginTop: 24 }}>
                      <PublicMarketingSections
                        businessId={restaurant.id}
                        businessType="restaurant"
                        limitPerSection={6}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))
            )}

            {/* إن كان هناك قسم واحد فقط، يُعرض المحتوى التسويقي في النهاية */}
            {displayCategories.length === 1 && (
              <div style={{ marginTop: 24 }}>
                <PublicMarketingSections
                  businessId={restaurant.id}
                  businessType="restaurant"
                  limitPerSection={6}
                />
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <PublicAdvertisements
                businessId={restaurant.id}
                businessType="restaurant"
                currentPlan={restaurant.plan}
                limit={2}
                position="bottom"
              />
            </div>
          </>
        )}
      </StorefrontLayout>

      {/* ==================== شريط السلة ==================== */}
      <BottomCartBar
        itemCount={cartCount}
        total={cartTotal}
        currency={currency}
        onOpen={() => setCartOpen(true)}
        hidden={cartOpen || optionsOpen || sortSheetOpen || searchOpen}
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
              zIndex: 200,
              background: sf.bg,
              fontFamily: sf.font,
              display: 'flex',
              flexDirection: 'column'
            }}
            dir="rtl"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '12px 14px',
                borderBottom: `1px solid ${sf.border}`,
                background: sf.card
              }}
            >
              <IoSearchOutline size={19} style={{ color: sf.muted, flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('ابحث عن صنف...')}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: sf.text,
                  fontSize: 15,
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  if (!searchQuery.trim()) setSearchQuery('');
                }}
                style={{ ...iconButtonStyle, flexShrink: 0 }}
                aria-label={t('إغلاق البحث')}
              >
                <IoClose size={19} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {!isSearching ? (
                <EmptyState text="اكتب اسم الصنف الذي تبحث عنه" />
              ) : searchResults.length === 0 ? (
                <EmptyState text="لا توجد نتائج" />
              ) : (
                <div style={itemListStyle}>
                  {sortItems(searchResults).map((item) => (
                    <MenuItemListCard
                      key={item.id}
                      item={item}
                      currency={currency}
                      quantityInCart={quantityByItemId.get(item.id) || 0}
                      onAdd={handleAdd}
                      onQuantityChange={handleCardQuantityChange}
                      isFavorite={favorites.has(item.id)}
                      onToggleFavorite={(it) =>
                        toggleFavorite({
                          id: it.id,
                          type: 'menuItem',
                          name: it.name,
                          price: it.price,
                          image: it.image
                        } as any)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== لوح الترتيب ==================== */}
      <BottomSheet open={sortSheetOpen} onClose={() => setSortSheetOpen(false)} title={t('ترتيب حسب')}>
        <div style={{ display: 'grid', gap: 8 }}>
          {SORT_OPTIONS.map((option) => {
            const active = sortBy === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setSortBy(option.key);
                  setSortSheetOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 50,
                  padding: '0 14px',
                  borderRadius: 12,
                  border: `1.5px solid ${active ? sf.accent : sf.border}`,
                  background: sf.surface,
                  color: active ? sf.accent : sf.text,
                  fontSize: 13.5,
                  fontWeight: active ? 800 : 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                {t(option.label)}
                {active && <IoCheckmark size={18} />}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* ==================== لوح خيارات الصنف ==================== */}
      <ItemOptionsSheet
        item={optionsItem}
        open={optionsOpen}
        currency={currency}
        onClose={() => {
          setOptionsOpen(false);
          setOptionsItem(null);
        }}
        onConfirm={handleConfirmOptions}
      />

      {/* ==================== السلة ==================== */}
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        currency={currency}
        onQuantityChange={handleCartQuantityChange}
        onRemove={(item) => removeFromCart(item.id, item.size)}
        onClear={clearCart}
        tableNumber={tableId || null}
        availableOrderTypes={tableId ? ['dine_in'] : ['takeaway', 'delivery']}
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
        deliveryFee={Number(restaurant?.deliverySettings?.deliveryFee) || 0}
        submitting={submitting}
        onSubmit={submitOrder}
      />

      {/* ==================== تتبّع الطلبات (للمسجّلين فقط) ==================== */}
      <OrderTrackingModal
        businessId={(restaurant as any)?.id}
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
        kind="restaurant"
        onRated={() => fetchMyOrders(true)}
      />

      {/* الشارة يحسمها الخادم: الخطة وحدها لا تكفي — قد تكون الميزة مشتراة
          مفردةً على خطة مجانية، وهو ما لا تراه الواجهة */}
      {/* التثبيت على الشاشة الرئيسية — وعلى iPhone هو شرط الإشعارات لا تحسينها */}
      <InstallAppPrompt
        businessName={storePwa.shortName || storePwa.name || (restaurant as any)?.name}
        enabled={storePwa.enabled}
        theme={storePwa.theme}
      />

      <PlatformBadge show={restaurant?.showPlatformBadge} />
    </StorefrontI18nProvider>
  );
};

// ==================== عناصر مساعدة ====================

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ textAlign: 'center', padding: '52px 20px', color: sf.muted, fontSize: 13.5 }}>{text}</div>
);

const sectionHeading: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  margin: '0 0 12px',
  fontSize: 16,
  fontWeight: 800,
  color: sf.text
};

const itemListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 11
};

const iconButtonStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 13,
  border: `1px solid ${sf.border}`,
  background: sf.card,
  color: sf.text,
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0
};

export default RestaurantPublicMenu;
