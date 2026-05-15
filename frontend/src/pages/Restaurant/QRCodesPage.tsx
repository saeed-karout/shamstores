import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Table, MenuItem } from '../../services/types';
import Loader from '../../components/common/Loader';
import QRGenerator from '../../components/qr/QRGenerator';
import { IoQrCode, IoDownload, IoPrint } from 'react-icons/io5';
import { useRestaurant } from '../../hooks/useRestaurant';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

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
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: C.muted }}>المطعم غير موجود</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: C.text, fontSize: 28, fontWeight: 800, marginBottom: 8 }}>رموز QR</h1>
          <p style={{ color: C.muted }}>قم بإنشاء وتحميل رموز QR للمطعم والطاولات وعناصر القائمة</p>
        </div>

        {/* QR المطعم */}
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 4, height: 24, background: C.blue, borderRadius: 4 }}></div>
                <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>QR المطعم</h2>
              </div>
              <p style={{ color: C.muted, marginBottom: 8 }}>
                رمز QR رئيسي للمطعم - يفتح القائمة الرئيسية مباشرة
              </p>
              <div style={{ background: C.surf, borderRadius: 10, padding: 12, display: 'inline-block' }}>
                <p style={{ color: C.muted, fontSize: 13, fontFamily: 'monospace' }}>
                  {window.location.origin}/{restaurant.slug}
                </p>
              </div>
            </div>
            <QRGenerator
              type="restaurant"
              slug={restaurant.slug}
              buttonText={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 4, height: 24, background: C.accent, borderRadius: 4 }}></div>
            <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>QR الطاولات</h2>
          </div>
          <p style={{ color: C.muted, marginBottom: 16 }}>
            رموز QR خاصة بكل طاولة - عند المسح يفتح القائمة مع تحديد رقم الطاولة تلقائياً
          </p>

          {tables.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', background: C.surf, borderRadius: 12 }}>
              <p style={{ color: C.muted }}>لا توجد طاولات. قم بإضافة طاولات أولاً</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
                {tables.map(table => (
                  <div key={table.id} style={{ border: '1px solid ' + C.border, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ color: C.text, fontWeight: 600 }}>{table.name}</h3>
                        <p style={{ color: C.muted, fontSize: 13 }}>عدد المقاعد: {table.seats}</p>
                        <p style={{ color: C.muted, fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>ID: {table.id.substring(0, 8)}...</p>
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
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid ' + C.border }}>
                <QRGenerator
                  type="table"
                  id="all"
                  name="جميع الطاولات"
                  slug={restaurant.slug}
                  buttonText={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 4, height: 24, background: C.purple, borderRadius: 4 }}></div>
            <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>QR عناصر القائمة</h2>
          </div>
          <p style={{ color: C.muted, marginBottom: 16 }}>
            رموز QR خاصة بكل عنصر - للمشاركة المباشرة عبر وسائل التواصل
          </p>

          {menuItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', background: C.surf, borderRadius: 12 }}>
              <p style={{ color: C.muted }}>لا توجد عناصر في القائمة. أضف عناصر أولاً</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {menuItems.slice(0, 9).map(item => (
                  <div key={item.id} style={{ border: '1px solid ' + C.border, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ color: C.text, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.name}</h3>
                        <p style={{ color: C.accent, fontWeight: 600, marginTop: 4, fontSize: 14 }}>
                          {item.discountedPrice || item.price} ر.س
                          {item.discountedPrice && (
                            <span style={{ color: C.muted, fontSize: 12, textDecoration: 'line-through', marginRight: 4 }}>
                              {item.price} ر.س
                            </span>
                          )}
                        </p>
                        {item.shareToken && (
                          <p style={{ color: C.muted, fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>
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
                      />
                    </div>
                  </div>
                ))}
              </div>

              {menuItems.length > 9 && (
                <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid ' + C.border }}>
                  <p style={{ color: C.muted }}>
                    ... و {menuItems.length - 9} عنصر آخر
                  </p>
                  <button
                    onClick={() => window.location.href = '/dashboard/menu'}
                    style={{ marginTop: 8, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}
                  >
                    عرض جميع العناصر ←
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ملاحظات */}
        <div style={{ marginTop: 32, padding: 16, background: 'rgba(96,165,250,0.08)', borderRadius: 12, border: '1px solid rgba(96,165,250,0.2)' }}>
          <h3 style={{ color: C.blue, fontWeight: 600, marginBottom: 8 }}>💡 نصائح:</h3>
          <ul style={{ color: C.muted, fontSize: 13, lineHeight: 2 }}>
            <li>• يمكنك تخصيص ألوان وتصميم QR Code من خلال زر "تخصيص التصميم"</li>
            <li>• يمكنك تحميل QR Code بصيغة PNG أو SVG للطباعة</li>
            <li>• QR الطاولات يساعد في معرفة الطاولة التي يطلب منها الزبون تلقائياً</li>
            <li>• QR العناصر يمكن مشاركته عبر واتساب أو فيسبوك للترويج</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QRCodesPage;
