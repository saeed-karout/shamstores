import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Table, MenuItem } from '../../services/types';
import Loader from '../../components/common/Loader';
import QRGenerator from '../../components/qr/QRGenerator';
import { IoQrCode, IoDownload, IoPrint } from 'react-icons/io5';
import { useRestaurant } from '../../hooks/useRestaurant';

const QRCodesPage: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { restaurant, loading: restaurantLoading } = useRestaurant();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tablesData, itemsData] = await Promise.all([
        api.get<Table[]>('/tables'),
        api.get<MenuItem[]>('/menu/items')
      ]);
      
      setTables(tablesData);
      setMenuItems(itemsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || restaurantLoading) return <Loader fullScreen />;
  if (!restaurant) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500">المطعم غير موجود</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">رموز QR</h1>
        <p className="text-gray-500">قم بإنشاء وتحميل رموز QR للمطعم والطاولات وعناصر القائمة</p>
      </div>

      {/* QR المطعم */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
              <h2 className="text-xl font-semibold text-gray-800">QR المطعم</h2>
            </div>
            <p className="text-gray-600 mb-2">
              رمز QR رئيسي للمطعم - يفتح القائمة الرئيسية مباشرة
            </p>
            <div className="bg-gray-50 rounded-lg p-3 inline-block">
              <p className="text-sm text-gray-500 font-mono">
                {window.location.origin}/{restaurant.slug}
              </p>
            </div>
          </div>
          <QRGenerator
            type="restaurant"
            slug={restaurant.slug}
            buttonText={
              <div className="flex items-center gap-2">
                <IoQrCode size={18} />
                <span>إنشاء QR المطعم</span>
              </div>
            }
            restaurantLogo={restaurant.logo}
            restaurantName={restaurant.name}
            variant="primary"
          />
        </div>
      </div>

      {/* QR الطاولات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-green-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-gray-800">QR الطاولات</h2>
        </div>
        <p className="text-gray-600 mb-4">
          رموز QR خاصة بكل طاولة - عند المسح يفتح القائمة مع تحديد رقم الطاولة تلقائياً
        </p>
        
        {tables.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">لا توجد طاولات. قم بإضافة طاولات أولاً</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {tables.map(table => (
                <div key={table.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">{table.name}</h3>
                      <p className="text-sm text-gray-500">عدد المقاعد: {table.seats}</p>
                      <p className="text-xs text-gray-400 mt-1">ID: {table.id.substring(0, 8)}...</p>
                    </div>
                    <QRGenerator
                      type="table"
                      id={table.id}
                      name={table.name}
                      slug={restaurant.slug}
                      buttonText={<IoQrCode size={20} />}
                      restaurantLogo={restaurant.logo}
                      restaurantName={restaurant.name}
                      variant="outline"
                      className="p-2 hover:bg-blue-50 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t">
              <QRGenerator
                type="table"
                id="all"
                name="جميع الطاولات"
                slug={restaurant.slug}
                buttonText={
                  <div className="flex items-center gap-2">
                    <IoDownload size={16} />
                    <span>تحميل QR لجميع الطاولات</span>
                  </div>
                }
                restaurantLogo={restaurant.logo}
                restaurantName={restaurant.name}
                variant="outline"
              />
            </div>
          </>
        )}
      </div>

      {/* QR عناصر القائمة */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-gray-800">QR عناصر القائمة</h2>
        </div>
        <p className="text-gray-600 mb-4">
          رموز QR خاصة بكل عنصر - للمشاركة المباشرة عبر وسائل التواصل
        </p>

        {menuItems.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">لا توجد عناصر في القائمة. أضف عناصر أولاً</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.slice(0, 9).map(item => (
                <div key={item.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 line-clamp-1">{item.name}</h3>
                      <p className="text-sm text-green-600 font-medium mt-1">
                        {item.discountedPrice || item.price} ر.س
                        {item.discountedPrice && (
                          <span className="text-xs text-gray-400 line-through mr-1">
                            {item.price} ر.س
                          </span>
                        )}
                      </p>
                      {item.shareToken && (
                        <p className="text-xs text-gray-400 mt-1 font-mono">
                          رمز: {item.shareToken.substring(0, 12)}...
                        </p>
                      )}
                    </div>
                    <QRGenerator
                      type="item"
                      id={item.id}
                      name={item.name}
                      slug={restaurant.slug}
                      buttonText={<IoQrCode size={20} />}
                      restaurantLogo={restaurant.logo}
                      restaurantName={restaurant.name}
                      variant="outline"
                      className="p-2 hover:bg-purple-50 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>

            {menuItems.length > 9 && (
              <div className="text-center mt-6 pt-4 border-t">
                <p className="text-gray-500">
                  ... و {menuItems.length - 9} عنصر آخر
                </p>
                <button
                  onClick={() => window.location.href = '/dashboard/menu'}
                  className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
                >
                  عرض جميع العناصر ←
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ملاحظات */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="font-semibold text-blue-800 mb-2">💡 نصائح:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• يمكنك تخصيص ألوان وتصميم QR Code من خلال زر "تخصيص التصميم"</li>
          <li>• يمكنك تحميل QR Code بصيغة PNG أو SVG للطباعة</li>
          <li>• QR الطاولات يساعد في معرفة الطاولة التي يطلب منها الزبون تلقائياً</li>
          <li>• QR العناصر يمكن مشاركته عبر واتساب أو فيسبوك للترويج</li>
        </ul>
      </div>
    </div>
  );
};

export default QRCodesPage;