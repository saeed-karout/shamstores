// pages/Store/StoreQRCodesPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useStore } from '../../hooks/useStore';
import Loader from '../../components/common/Loader';
import QRGenerator from '../../components/qr/QRGenerator';
import { IoQrCode, IoDownload, IoPrint, IoStorefront, IoCube, IoCart } from 'react-icons/io5';

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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <IoStorefront className="text-gray-300 text-6xl mx-auto mb-4" />
        <p className="text-gray-500">المتجر غير موجود</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📱 رموز QR للمتجر</h1>
        <p className="text-gray-500">قم بإنشاء وتحميل رموز QR للمتجر والمنتجات لمشاركتها مع العملاء</p>
      </div>

      {/* QR المتجر */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-green-500 rounded-full"></div>
              <h2 className="text-xl font-semibold text-gray-800">QR المتجر</h2>
            </div>
            <p className="text-gray-600 mb-2">
              رمز QR رئيسي للمتجر - يفتح صفحة المتجر الرئيسية مباشرة
            </p>
            <div className="bg-gray-50 rounded-lg p-3 inline-block">
              <p className="text-sm text-gray-500 font-mono">
                {window.location.origin}/{store.slug}
              </p>
              <p className="text-xs text-gray-400 mt-1">رابط المتجر المباشر</p>
            </div>
          </div>
          <QRGenerator
            type="store"
            slug={store.slug}
            storeName={store.name}
            storeLogo={store.logo}
            buttonText={
              <div className="flex items-center gap-2">
                <IoQrCode size={18} />
                <span>إنشاء QR المتجر</span>
              </div>
            }
            variant="primary"
          />
        </div>
      </div>

      {/* QR المنتجات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-gray-800">📦 QR المنتجات</h2>
        </div>
        <p className="text-gray-600 mb-4">
          رموز QR خاصة بكل منتج - للمشاركة المباشرة عبر وسائل التواصل
        </p>
        
        {products.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <IoCube className="text-gray-300 text-5xl mx-auto mb-3" />
            <p className="text-gray-500">لا توجد منتجات. قم بإضافة منتجات أولاً</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.slice(0, 9).map(product => (
                <div key={product.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 line-clamp-1">{product.name}</h3>
                      {product.nameEn && (
                        <p className="text-xs text-gray-500 line-clamp-1">{product.nameEn}</p>
                      )}
                      <div className="mt-2">
                        <span className="text-lg font-bold text-green-600">
                          {product.discountedPrice || product.price} ر.س
                        </span>
                        {product.discountedPrice && (
                          <span className="text-sm text-gray-400 line-through mr-2">
                            {product.price} ر.س
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
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
                      className="p-2 hover:bg-blue-50 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>

            {products.length > 9 && (
              <div className="text-center mt-6 pt-4 border-t">
                <p className="text-gray-500">
                  ... و {products.length - 9} منتج آخر
                </p>
                <button
                  onClick={() => window.location.href = '/store/products'}
                  className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
                >
                  عرض جميع المنتجات ←
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <IoStorefront className="text-white text-xl" />
            </div>
            <div>
              <p className="text-sm text-blue-600">رابط المتجر</p>
              <p className="text-xs text-blue-800 font-mono break-all">
                {window.location.origin}/{store.slug}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <IoCube className="text-white text-xl" />
            </div>
            <div>
              <p className="text-sm text-green-600">إجمالي المنتجات</p>
              <p className="text-2xl font-bold text-green-700">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
              <IoCart className="text-white text-xl" />
            </div>
            <div>
              <p className="text-sm text-purple-600">QR للمنتجات</p>
              <p className="text-2xl font-bold text-purple-700">{products.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* نصائح */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="font-semibold text-blue-800 mb-2">💡 نصائح لاستخدام QR في متجرك:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• ضع QR المتجر في مكان واضح ليزوره العملاء مباشرة</li>
          <li>• يمكنك مشاركة QR المنتجات عبر واتساب لترويج العروض</li>
          <li>• استخدم QR للمنتجات في الإعلانات المطبوعة</li>
          <li>• قم بتحميل QR بصيغة PNG أو SVG للطباعة</li>
        </ul>
      </div>
    </div>
  );
};

export default StoreQRCodesPage;