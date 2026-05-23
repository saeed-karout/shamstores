// pages/Store/StoreQRCodesPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useStore } from '../../hooks/useStore';
import Loader from '../../components/common/Loader';
import QRGenerator from '../../components/qr/QRGenerator';
import { IoQrCode, IoDownload, IoPrint, IoStorefront, IoCube, IoCart } from 'react-icons/io5';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
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
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ textAlign: 'center' }}>
        <IoStorefront style={{ color: C.muted, fontSize: 64, display: 'block', margin: '0 auto 16px' }} />
        <p style={{ color: C.muted }}>المتجر غير موجود</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: C.text, fontSize: 28, fontWeight: 800, marginBottom: 8 }}>📱 رموز QR للمتجر</h1>
          <p style={{ color: C.muted }}>قم بإنشاء وتحميل رموز QR للمتجر والمنتجات لمشاركتها مع العملاء</p>
        </div>

        {/* QR المتجر */}
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 4, height: 24, background: C.accent, borderRadius: 4 }}></div>
                <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>QR المتجر</h2>
              </div>
              <p style={{ color: C.muted, marginBottom: 8 }}>
                رمز QR رئيسي للمتجر - يفتح صفحة المتجر الرئيسية مباشرة
              </p>
              <div style={{ background: C.surf, borderRadius: 10, padding: 12, display: 'inline-block' }}>
                <p style={{ color: C.muted, fontSize: 13, fontFamily: 'monospace' }}>
                  {window.location.origin}/{store.slug}
                </p>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>رابط المتجر المباشر</p>
              </div>
            </div>
            <QRGenerator
              type="store"
              slug={store.slug}
              storeName={store.name}
              storeLogo={store.logo}
              buttonText={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoQrCode size={18} />
                  <span>إنشاء QR المتجر</span>
                </div>
              }
              variant="primary"
            />
          </div>
        </div>

        {/* QR المنتجات */}
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 4, height: 24, background: C.blue, borderRadius: 4 }}></div>
            <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>📦 QR المنتجات</h2>
          </div>
          <p style={{ color: C.muted, marginBottom: 16 }}>
            رموز QR خاصة بكل منتج - للمشاركة المباشرة عبر وسائل التواصل
          </p>

          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', background: C.surf, borderRadius: 12 }}>
              <IoCube style={{ color: C.muted, fontSize: 48, display: 'block', margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ color: C.muted }}>لا توجد منتجات. قم بإضافة منتجات أولاً</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {products.slice(0, 9).map(product => (
                  <div key={product.id} style={{ border: '1px solid ' + C.border, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ color: C.text, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{product.name}</h3>
                        {product.nameEn && (
                          <p style={{ color: C.muted, fontSize: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{product.nameEn}</p>
                        )}
                        <div style={{ marginTop: 8 }}>
                          <span style={{ color: C.accent, fontWeight: 700, fontSize: 17 }}>
                            {product.discountedPrice || product.price} ر.س
                          </span>
                          {product.discountedPrice && (
                            <span style={{ color: C.muted, fontSize: 13, textDecoration: 'line-through', marginRight: 8 }}>
                              {product.price} ر.س
                            </span>
                          )}
                        </div>
                        <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                          المخزون: {product.stock} قطعة
                        </p>
                      </div>
                      <QRGenerator
                        type="store-product"
                        id={product.id}
                        name={product.name}
                        slug={store.slug}
                        storeName={store.name}
                        storeLogo={store.logo}
                        buttonText={<IoQrCode size={20} />}
                        variant="outline"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {products.length > 9 && (
                <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid ' + C.border }}>
                  <p style={{ color: C.muted }}>
                    ... و {products.length - 9} منتج آخر
                  </p>
                  <button
                    onClick={() => window.location.href = '/store/products'}
                    style={{ marginTop: 8, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}
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
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(96,165,250,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoStorefront style={{ color: C.blue, fontSize: 20 }} />
              </div>
              <div>
                <p style={{ color: C.muted, fontSize: 13 }}>رابط المتجر</p>
                <p style={{ color: C.text, fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {window.location.origin}/{store.slug}
                </p>
              </div>
            </div>
          </div>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(200,226,53,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoCube style={{ color: C.accent, fontSize: 20 }} />
              </div>
              <div>
                <p style={{ color: C.muted, fontSize: 13 }}>إجمالي المنتجات</p>
                <p style={{ color: C.accent, fontSize: 24, fontWeight: 700 }}>{products.length}</p>
              </div>
            </div>
          </div>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(167,139,250,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoCart style={{ color: C.purple, fontSize: 20 }} />
              </div>
              <div>
                <p style={{ color: C.muted, fontSize: 13 }}>QR للمنتجات</p>
                <p style={{ color: C.purple, fontSize: 24, fontWeight: 700 }}>{products.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* نصائح */}
        <div style={{ padding: 16, background: 'rgba(96,165,250,0.08)', borderRadius: 12, border: '1px solid rgba(96,165,250,0.2)' }}>
          <h3 style={{ color: C.blue, fontWeight: 600, marginBottom: 8 }}>💡 نصائح لاستخدام QR في متجرك:</h3>
          <ul style={{ color: C.muted, fontSize: 13, lineHeight: 2 }}>
            <li>• ضع QR المتجر في مكان واضح ليزوره العملاء مباشرة</li>
            <li>• يمكنك مشاركة QR المنتجات عبر واتساب لترويج العروض</li>
            <li>• استخدم QR للمنتجات في الإعلانات المطبوعة</li>
            <li>• قم بتحميل QR بصيغة PNG أو SVG للطباعة</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StoreQRCodesPage;
