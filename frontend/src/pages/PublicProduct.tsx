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
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';
import { useCart } from '@/hooks/useCart';
import ProductOptionsSheet, {
  parseProductOptions,
  hasOptions,
  OptionsResult
} from '@/components/storefront/ProductOptionsSheet';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', orange: '#FB923C',
};

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
  const [optionsOpen, setOptionsOpen] = useState(false);
  const { addToCart } = useCart();
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

  /**
   * الإضافة إلى السلة.
   *
   * ⚠️ كانت هذه الصفحة تكتب في مفتاح `cart_<slug>` الخاص بها، بينما واجهة
   * المتجر تقرأ من `cart` عبر useCart — سلّتان لا تتحدّثان. الزبون يضيف من
   * صفحة المنتج ثم يعود إلى المتجر فيجد سلّته فارغة.
   *
   * والمنتج بخيارات لا يُضاف بنقرة: يُفتح لوح الاختيار أولاً.
   */
  const handleAddToCart = () => {
    if (!product) return;

    const productStock = typeof product.stock === 'number' ? product.stock : parseInt(String(product.stock)) || 0;
    if (productStock === 0) {
      toast.error('المنتج غير متوفر في المخزون');
      return;
    }

    if (hasOptions((product as any).options)) {
      setOptionsOpen(true);
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: parsePrice(product.price),
      originalPrice: parsePrice(product.price),
      quantity,
      image: images[0] || product.imageUrl,
      notes: ''
    } as any);

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  /** يُضيف بعد اختيار الخيارات، ويحوّل الاختيار إلى size/addons */
  const confirmOptions = (result: OptionsResult) => {
    if (!product) return;

    const addons: string[] = [];
    let size: string | undefined;
    parseProductOptions((product as any).options).forEach((group) => {
      const picked = result.selection[group.name];
      const labels = Array.isArray(picked) ? picked : picked ? [picked] : [];
      labels.forEach((label) => {
        if (group.type === 'single' && !size) size = label;
        else addons.push(`${group.name}: ${label}`);
      });
    });

    addToCart({
      id: product.id,
      name: product.name,
      price: result.unitPrice,
      originalPrice: parsePrice(product.price),
      quantity: result.quantity,
      image: images[0] || product.imageUrl,
      notes: '',
      size,
      addons,
      selectedOptions: result.selection
    } as any);

    setOptionsOpen(false);
    setAddedToCart(true);
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
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 8 }}>المنتج غير موجود</h1>
          <p style={{ color: C.muted, marginBottom: 16 }}>عذراً، المنتج الذي تبحث عنه غير موجود</p>
          <Link to={`/${store?.slug || ''}`} style={{ color: C.accent, textDecoration: 'none' }}>
            العودة إلى المتجر
          </Link>
        </div>
      </div>
    );
  }

  // عملة العرض من إعدادات المتجر — كانت «ر.س» مكتوبة في سبعة مواضع
  const currency = (store as any)?.currency || DEFAULT_CURRENCY;

  const finalPrice = getFinalPrice();
  const discountPercent = getDiscountPercent();
  const productStock = typeof product.stock === 'number' ? product.stock : parseInt(String(product.stock)) || 0;
  /**
   * كل صور المنتج لا الغلاف وحده.
   *
   * كانت الصفحة تقرأ `imageUrl` فقط، فيرى الزبون صورة واحدة لمنتج يشتريه
   * بلا أن يلمسه — وحقل `images` المملوء يبقى بلا استعمال.
   *
   * والحقل يصل مصفوفةً أو نصاً JSON حسب مسار الحفظ، فيُقرأ الشكلان.
   */
  const images = ((): string[] => {
    const raw = (product as any).images;
    let list: string[] = [];

    if (Array.isArray(raw)) {
      list = raw.filter(Boolean).map(String);
    } else if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        list = Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [raw];
      } catch {
        list = [raw];
      }
    }

    if (product.imageUrl && !list.includes(product.imageUrl)) {
      // الغلاف أولاً حتى لو لم يكن ضمن المصفوفة
      list = [product.imageUrl, ...list];
    }
    return list.filter(Boolean);
  })();

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* خيارات المنتج — الصورة تتبع اللون المختار */}
      <ProductOptionsSheet
        open={optionsOpen}
        name={product.name}
        basePrice={parsePrice(product.price)}
        options={parseProductOptions((product as any).options)}
        currency={currency}
        onClose={() => setOptionsOpen(false)}
        onConfirm={confirmOptions}
        onPreviewImage={(image) => {
          const index = images.findIndex((candidate) => candidate === image);
          if (index >= 0) setCurrentImageIndex(index);
        }}
      />

      {/* Header */}
      <div style={{ background: '#082E24', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to={`/${store.slug}`} style={{ color: C.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 15 }}>
              <IoChevronForward size={18} />
              العودة إلى المتجر
            </Link>
            <Link to={`/${store.slug}`} style={{ fontSize: 20, fontWeight: 700, color: C.text, textDecoration: 'none' }}>
              {store.name}
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          {/* قسم الصور */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 16 }}>
            <div style={{ position: 'relative' }}>
              {images.length > 0 && images[0] ? (
                <img
                  src={getImageUrl(images[currentImageIndex])}
                  alt={product.name}
                  style={{ width: '100%', height: 384, objectFit: 'cover', borderRadius: 12, display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: 384, background: C.surf, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: C.muted }}>لا توجد صورة</span>
                </div>
              )}

              {discountPercent > 0 && (
                <div style={{ position: 'absolute', top: 16, right: 16, background: C.red, color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                  خصم {discountPercent}%
                </div>
              )}

              {productStock === 0 && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ background: C.red, color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 17, fontWeight: 700 }}>
                    نفد من المخزون
                  </span>
                </div>
              )}
            </div>

            {/* مصغرات الصور */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16, overflowX: 'auto', paddingBottom: 8 }}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: currentImageIndex === idx ? `2px solid ${C.accent}` : '2px solid transparent',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0
                    }}
                  >
                    <img src={getImageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* معلومات المنتج */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
            {/* SKU */}
            {product.sku && (
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 8, marginTop: 0 }}>SKU: {product.sku}</p>
            )}

            {/* الاسم */}
            <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 8, marginTop: 0 }}>
              {product.name}
            </h1>
            {product.nameEn && (
              <p style={{ color: C.muted, marginBottom: 16 }}>{product.nameEn}</p>
            )}

            {/* السعر */}
            <div style={{ marginBottom: 16 }}>
              {discountPercent > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: C.accent }}>
                    {formatPrice(finalPrice, currency)}
                  </span>
                  <span style={{ fontSize: 17, color: C.muted, textDecoration: 'line-through' }}>
                    {formatPrice(getOriginalPrice(), currency)}
                  </span>
                  <span style={{ background: 'rgba(200,226,53,0.15)', color: C.accent, padding: '4px 8px', borderRadius: 20, fontSize: 13, border: `1px solid ${C.border}` }}>
                    وفر {discountPercent}%
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 28, fontWeight: 700, color: C.accent }}>
                  {formatPrice(finalPrice, currency)}
                </span>
              )}
            </div>

            {/* الوصف */}
            {product.description && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 600, color: C.text, marginBottom: 8, marginTop: 0 }}>الوصف</h3>
                <p style={{ color: C.muted, lineHeight: 1.8, margin: 0 }}>{product.description}</p>
                {product.descriptionEn && (
                  <p style={{ color: C.muted, fontSize: 13, marginTop: 8, marginBottom: 0 }}>{product.descriptionEn}</p>
                )}
              </div>
            )}

            {/* المخزون */}
            <div style={{ marginBottom: 24, padding: 16, background: C.surf, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: C.muted }}>الحالة:</span>
                {productStock > 0 ? (
                  <span style={{ color: C.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IoCheckmark /> متوفر
                  </span>
                ) : (
                  <span style={{ color: C.red, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IoClose /> غير متوفر
                  </span>
                )}
              </div>
              {productStock > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: C.muted }}>الكمية المتاحة:</span>
                  <span style={{ fontWeight: 500, color: C.text }}>{productStock} قطعة</span>
                </div>
              )}
            </div>

            {/* اختيار الكمية */}
            {productStock > 0 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: C.muted, marginBottom: 8 }}>
                  الكمية:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={decrementQuantity}
                    style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${C.border}`, background: C.surf, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.text, fontSize: 18 }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: 20, fontWeight: 600, width: 48, textAlign: 'center', color: C.text }}>{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${C.border}`, background: C.surf, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.text, fontSize: 18 }}
                  >
                    +
                  </button>
                  <span style={{ fontSize: 13, color: C.muted, marginRight: 8 }}>الحد الأقصى: {productStock}</span>
                </div>
              </div>
            )}

            {/* أزرار الإجراء */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <button
                onClick={handleAddToCart}
                disabled={productStock === 0}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  border: 'none',
                  cursor: productStock === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: 15,
                  fontFamily: 'Cairo, sans-serif',
                  background: productStock === 0
                    ? C.surf
                    : addedToCart
                    ? 'rgba(200,226,53,0.2)'
                    : C.accent,
                  color: productStock === 0
                    ? C.muted
                    : addedToCart
                    ? C.accent
                    : C.bg,
                  transition: 'all 0.2s'
                }}
              >
                {addedToCart ? <IoCheckmark size={20} /> : <IoCart size={20} />}
                {addedToCart ? 'تمت الإضافة' : 'أضف إلى السلة'}
              </button>

              <button
                onClick={() => setIsFavorited(!isFavorited)}
                style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surf, cursor: 'pointer' }}
              >
                {isFavorited ? (
                  <IoHeart style={{ color: C.red, fontSize: 20 }} />
                ) : (
                  <IoHeartOutline style={{ color: C.muted, fontSize: 20 }} />
                )}
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surf, cursor: 'pointer' }}
                >
                  <IoShare style={{ color: C.muted, fontSize: 20 }} />
                </button>

                {showShareMenu && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, background: C.card, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', border: `1px solid ${C.border}`, overflow: 'hidden', minWidth: 150, zIndex: 10 }}>
                    <button
                      onClick={handleShare}
                      style={{ width: '100%', padding: '8px 16px', textAlign: 'right', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: C.text, fontFamily: 'Cairo, sans-serif' }}
                    >
                      <IoShare size={16} style={{ color: C.muted }} /> نسخ الرابط
                    </button>
                    <button
                      onClick={handleWhatsAppShare}
                      style={{ width: '100%', padding: '8px 16px', textAlign: 'right', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: C.text, fontFamily: 'Cairo, sans-serif' }}
                    >
                      <IoLogoWhatsapp size={16} style={{ color: '#25D366' }} /> مشاركة واتساب
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* معلومات المتجر */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
              <h3 style={{ fontWeight: 600, color: C.text, marginBottom: 12, marginTop: 0 }}>معلومات المتجر</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                {store.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted }}>
                    <IoCall size={16} style={{ color: C.accent }} />
                    <span>هاتف: {store.phone}</span>
                  </div>
                )}
                {store.whatsapp && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted }}>
                    <IoLogoWhatsapp size={16} style={{ color: '#25D366' }} />
                    <span>واتساب: {store.whatsapp}</span>
                  </div>
                )}
                {store.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted }}>
                    <IoLocation size={16} style={{ color: C.accent }} />
                    <span>{store.address}</span>
                  </div>
                )}
                {store.settings?.enableDelivery && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted }}>
                    <IoTime size={16} style={{ color: C.accent }} />
                    <span>وقت التوصيل المتوقع: {store.settings.estimatedTime} دقيقة</span>
                  </div>
                )}
                {store.settings?.enableDelivery && store.settings.freeDeliveryAbove > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted }}>
                    <IoWallet size={16} style={{ color: C.accent }} />
                    <span>توصيل مجاني للطلبات فوق {formatPrice(store.settings.freeDeliveryAbove, currency)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* منتجات ذات صلة */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 24 }}>منتجات قد تعجبك</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {relatedProducts.map((item) => {
                const itemPrice = parsePrice(item.discountedPrice || item.price);
                const itemOriginalPrice = parsePrice(item.price);
                const hasDiscount = parsePrice(item.discountedPrice) > 0 && parsePrice(item.discountedPrice) < itemOriginalPrice;

                return (
                  <Link
                    key={item.id}
                    to={`/${store.slug}/product/${item.id}`}
                    style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', textDecoration: 'none', display: 'block', transition: 'border-color 0.2s' }}
                  >
                    <div style={{ height: 160, overflow: 'hidden' }}>
                      {item.imageUrl ? (
                        <img
                          src={getImageUrl(item.imageUrl)}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: C.surf, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: C.muted }}>لا توجد صورة</span>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 12 }}>
                      <h3 style={{ fontWeight: 600, color: C.text, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as any, margin: '0 0 8px' }}>{item.name}</h3>
                      <div>
                        {hasDiscount ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, color: C.accent }}>
                              {formatPrice(itemPrice, currency)}
                            </span>
                            <span style={{ fontSize: 11, color: C.muted, textDecoration: 'line-through' }}>
                              {formatPrice(itemOriginalPrice, currency)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 700, color: C.accent }}>
                            {formatPrice(itemPrice, currency)}
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
        <div style={{ position: 'fixed', bottom: 24, left: 0, right: 0, padding: '0 16px' }}>
          <button
            onClick={handleAddToCart}
            style={{ width: '100%', padding: '12px 0', background: C.accent, color: C.bg, borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 16, boxShadow: '0 4px 20px rgba(200,226,53,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
          >
            <IoCart size={20} />
            أضف إلى السلة - {formatPrice(finalPrice, currency)}
          </button>
        </div>
      )}
    </div>
  );
};

export default PublicProduct;
