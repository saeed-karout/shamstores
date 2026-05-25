// pages/Store/StoreQRCodesPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '@/context/ThemeContext';
import Loader from '../../components/common/Loader';
import QRGenerator from '../../components/qr/QRGenerator';
import { IoQrCode, IoDownload, IoPrint, IoStorefront, IoCube, IoCart, IoGlobe } from 'react-icons/io5';

// ✅ الألوان الثابتة فقط للعناصر التي لا تتغير
const staticColors = {
  red: '#FF6B6B',
  blue: '#60A5FA',
  purple: '#A78BFA',
};

interface Product {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
  discountedPrice?: number;
  shareToken?: string;
  image?: string;
  stock: number;
}

const StoreQRCodesPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { store, loading: storeLoading } = useStore();
  const theme = useTheme();

  // ✅ استخدام ألوان المتجر الديناميكية
  const dynamicColors = {
    bg: theme.backgroundColor || '#082E24',
    card: theme.cardBgColor || '#112E23',
    surf: theme.surfaceColor || '#0F3D31',
    accent: theme.primaryColor || '#C8E235',
    text: theme.textColor || '#E8F5E9',
    muted: theme.mutedColor || '#9DC4AC',
    border: `rgba(200,226,53,0.15)`,
    blue: '#60A5FA',
    purple: '#A78BFA',
  };

  // ✅ دالة للحصول على الرابط الصحيح مع subdomain (بدون process.env)
  const getStoreUrl = (): string => {
    // إذا كان هناك customDomain
    if (store?.customDomain) {
      return `https://${store.customDomain}`;
    }
    
    // إذا كان هناك subdomain
    if (store?.subdomain) {
      return `https://${store.subdomain}.shamstores.com`;
    }
    
    // الوضع العادي: domain/slug
    return `${window.location.origin}/${store?.slug}`;
  };

  // ✅ دالة للحصول على رابط المنتج (بدون process.env)
  const getProductUrl = (product: Product): string => {
    const storeUrl = getStoreUrl();
    return `${storeUrl}/product/${product.id}`;
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsData = await api.get<Product[]>('/store/products');
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || storeLoading) return <Loader fullScreen />;
  if (!store) return (
    <div style={{ background: dynamicColors.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ textAlign: 'center' }}>
        <IoStorefront style={{ color: dynamicColors.muted, fontSize: 64, display: 'block', margin: '0 auto 16px' }} />
        <p style={{ color: dynamicColors.muted }}>المتجر غير موجود</p>
      </div>
    </div>
  );

  const storeUrl = getStoreUrl();

  return (
    <div style={{ background: dynamicColors.bg, minHeight: '100vh', padding: 24, fontFamily: theme.fontFamily || 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: dynamicColors.text, fontSize: 28, fontWeight: 800, marginBottom: 8 }}>📱 رموز QR للمتجر</h1>
          <p style={{ color: dynamicColors.muted }}>قم بإنشاء وتحميل رموز QR للمتجر والمنتجات لمشاركتها مع العملاء</p>
        </div>

        {/* QR المتجر - مع subdomain */}
        <div style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 4, height: 24, background: dynamicColors.accent, borderRadius: 4 }}></div>
                <h2 style={{ color: dynamicColors.text, fontSize: 18, fontWeight: 700 }}>QR المتجر</h2>
              </div>
              <p style={{ color: dynamicColors.muted, marginBottom: 8 }}>
                رمز QR رئيسي للمتجر - يفتح صفحة المتجر الرئيسية مباشرة
              </p>
              <div style={{ background: dynamicColors.surf, borderRadius: 10, padding: 12, display: 'inline-block' }}>
                <p style={{ color: dynamicColors.muted, fontSize: 13, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoGlobe size={14} />
                  {storeUrl}
                </p>
                <p style={{ color: dynamicColors.muted, fontSize: 11, marginTop: 4 }}>
                  {store.subdomain ? '🔗 رابط المتجر (الدومين الفرعي)' : 'رابط المتجر المباشر'}
                </p>
              </div>
            </div>
            <QRGenerator
              type="store"
              slug={store.slug}
              subdomain={store.subdomain}
              customDomain={store.customDomain}
              storeName={store.name}
              storeLogo={store.logo}
              buttonText={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 
                  <span>إنشاء QR المتجر</span>
                </div>
              }
              variant="primary"
            />
          </div>
        </div>

        {/* QR المنتجات - مع subdomain */}
        <div style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 4, height: 24, background: staticColors.blue, borderRadius: 4 }}></div>
            <h2 style={{ color: dynamicColors.text, fontSize: 18, fontWeight: 700 }}>📦 QR المنتجات</h2>
          </div>
          <p style={{ color: dynamicColors.muted, marginBottom: 16 }}>
            رموز QR خاصة بكل منتج - للمشاركة المباشرة عبر وسائل التواصل
          </p>

          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', background: dynamicColors.surf, borderRadius: 12 }}>
              <IoCube style={{ color: dynamicColors.muted, fontSize: 48, display: 'block', margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ color: dynamicColors.muted }}>لا توجد منتجات. قم بإضافة منتجات أولاً</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {products.slice(0, 9).map(product => (
                  <div key={product.id} style={{ border: `1px solid ${dynamicColors.border}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ color: dynamicColors.text, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{product.name}</h3>
                        {product.nameEn && (
                          <p style={{ color: dynamicColors.muted, fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{product.nameEn}</p>
                        )}
                        <div style={{ marginTop: 8 }}>
                          <span style={{ color: dynamicColors.accent, fontWeight: 700, fontSize: 17 }}>
                            {product.discountedPrice || product.price} ر.س
                          </span>
                          {product.discountedPrice && (
                            <span style={{ color: dynamicColors.muted, fontSize: 13, textDecoration: 'line-through', marginRight: 8 }}>
                              {product.price} ر.س
                            </span>
                          )}
                        </div>
                        <p style={{ color: dynamicColors.muted, fontSize: 11, marginTop: 4 }}>
                          المخزون: {product.stock} قطعة
                        </p>
                      </div>
                      <QRGenerator
                        type="store-product"
                        id={product.id}
                        name={product.name}
                        slug={store.slug}
                        subdomain={store.subdomain}
                        customDomain={store.customDomain}
                        storeName={store.name}
                        storeLogo={store.logo}
                        // buttonText={<IoQrCode size={20} />}
                        variant="outline"
                      />
                    </div>
                    {/* عرض رابط المنتج الصغير */}
                    <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${dynamicColors.border}` }}>
                      <p style={{ color: dynamicColors.muted, fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {getProductUrl(product)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {products.length > 9 && (
                <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: `1px solid ${dynamicColors.border}` }}>
                  <p style={{ color: dynamicColors.muted }}>
                    ... و {products.length - 9} منتج آخر
                  </p>
                  <button
                    onClick={() => window.location.href = '/store/products'}
                    style={{ marginTop: 8, color: staticColors.blue, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}
                  >
                    عرض جميع المنتجات ←
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* إحصائيات سريعة */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(96,165,250,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoStorefront style={{ color: staticColors.blue, fontSize: 20 }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: dynamicColors.muted, fontSize: 13 }}>رابط المتجر</p>
                <p style={{ color: dynamicColors.text, fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {store.subdomain ? `${store.subdomain}.shamstores.com` : store.slug}
                </p>
              </div>
            </div>
          </div>
          <div style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: `${dynamicColors.accent}20`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoCube style={{ color: dynamicColors.accent, fontSize: 20 }} />
              </div>
              <div>
                <p style={{ color: dynamicColors.muted, fontSize: 13 }}>إجمالي المنتجات</p>
                <p style={{ color: dynamicColors.accent, fontSize: 24, fontWeight: 700 }}>{products.length}</p>
              </div>
            </div>
          </div>
          <div style={{ background: dynamicColors.card, border: `1px solid ${dynamicColors.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(167,139,250,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoCart style={{ color: staticColors.purple, fontSize: 20 }} />
              </div>
              <div>
                <p style={{ color: dynamicColors.muted, fontSize: 13 }}>QR للمنتجات</p>
                <p style={{ color: staticColors.purple, fontSize: 24, fontWeight: 700 }}>{products.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* نصائح */}
        <div style={{ padding: 16, background: 'rgba(96,165,250,0.08)', borderRadius: 12, border: '1px solid rgba(96,165,250,0.2)' }}>
          <h3 style={{ color: staticColors.blue, fontWeight: 600, marginBottom: 8 }}>💡 نصائح لاستخدام QR في متجرك:</h3>
          <ul style={{ color: dynamicColors.muted, fontSize: 13, lineHeight: 2 }}>
            <li>• ضع QR المتجر في مكان واضح ليزوره العملاء مباشرة</li>
            <li>• يمكنك مشاركة QR المنتجات عبر واتساب لترويج العروض</li>
            <li>• استخدم QR للمنتجات في الإعلانات المطبوعة</li>
            <li>• قم بتحميل QR بصيغة PNG أو SVG للطباعة</li>
            {store.subdomain && (
              <li>• 🔗 الرابط المختصر: <strong style={{ color: dynamicColors.accent }}>{store.subdomain}.shamstores.com</strong> سهل التذكر والمشاركة</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StoreQRCodesPage;