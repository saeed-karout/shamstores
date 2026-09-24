import React, { useEffect, useState } from 'react';
import { formatPrice } from '@/utils/currency';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Restaurant, Category, MenuItem } from '../services/types';
import Loader from '../components/common/Loader';
import {
  IoCall, IoLogoWhatsapp, IoLocation, IoTime,
  IoLogoInstagram, IoLogoFacebook, IoShare
} from 'react-icons/io5';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/utils/imageHelpers';

interface RestaurantData {
  restaurant: Restaurant;
  categories: Category[];
}

const RestaurantPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => { fetchRestaurant(); }, [slug]);

  const fetchRestaurant = async () => {
    try {
      const response = await api.get<RestaurantData>(`/menu/public/${slug}`);
      setData(response);
      if (response.restaurant) {
        document.documentElement.style.setProperty('--primary', response.restaurant.primaryColor);
        document.documentElement.style.setProperty('--secondary', response.restaurant.secondaryColor);
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareRestaurant = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('تم نسخ الرابط');
  };

  const getFilteredItems = () => {
    if (!data) return [];
    let items: MenuItem[] = [];
    data.categories.forEach(cat => {
      if (selectedCategory === 'all' || cat.id === selectedCategory) {
        items = [...items, ...(cat.menuItems || [])];
      }
    });
    return items;
  };

  if (loading) return <Loader fullScreen />;
  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#F4F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5F736A', fontFamily: 'Cairo, sans-serif' }}>
      المطعم غير موجود
    </div>
  );

  const { restaurant, categories } = data;
  const filteredItems = getFilteredItems();
  const primaryColor = restaurant.primaryColor || '#084835';

  return (
    <>
      <Helmet>
        <title>{restaurant.name} - القائمة الرقمية</title>
        <meta name="description" content={restaurant.description} />
        <meta property="og:title" content={restaurant.name} />
        <meta property="og:description" content={restaurant.description} />
        {restaurant.logo && <meta property="og:image" content={getImageUrl(restaurant.logo)} />}
      </Helmet>

      <div style={{ minHeight: '100vh', background: '#F4F7F4', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
        {restaurant.coverImage && (
          <div style={{ height: 256, backgroundImage: `url(${getImageUrl(restaurant.coverImage)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 32px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(8,72,53,0.15)', borderRadius: 16, padding: 24, marginTop: restaurant.coverImage ? -80 : 32, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {restaurant.logo && (
                <img
                  src={getImageUrl(restaurant.logo)}
                  alt={restaurant.name}
                  style={{ width: 96, height: 96, borderRadius: '50%', border: '4px solid rgba(8,72,53,0.3)', marginTop: restaurant.coverImage ? -48 : 0, flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h1 style={{ color: '#10231B', fontSize: 24, fontWeight: 800 }}>
                    {restaurant.name}
                  </h1>
                  <button onClick={shareRestaurant} style={{ background: 'none', border: 'none', color: '#5F736A', cursor: 'pointer', padding: 8, borderRadius: '50%' }} aria-label="مشاركة المطعم">
                    <IoShare size={20} />
                  </button>
                </div>
                {restaurant.description && (
                  <p style={{ color: '#5F736A', marginTop: 8, fontSize: 14 }}>{restaurant.description}</p>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
                  {restaurant.phone && (
                    <a href={`tel:${restaurant.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2563EB', fontSize: 13, textDecoration: 'none' }}>
                      <IoCall size={14} /> {restaurant.phone}
                    </a>
                  )}
                  {restaurant.whatsapp && (
                    <a href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803D', fontSize: 13, textDecoration: 'none' }}>
                      <IoLogoWhatsapp size={14} /> واتساب
                    </a>
                  )}
                  {restaurant.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#5F736A', fontSize: 13 }}>
                      <IoLocation size={14} /> {restaurant.address}
                    </div>
                  )}
                  {restaurant.instagram && (
                    <a href={`https://instagram.com/${restaurant.instagram}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E879F9', fontSize: 13, textDecoration: 'none' }}>
                      <IoLogoInstagram size={14} /> انستغرام
                    </a>
                  )}
                </div>

                {restaurant.openingHours && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#5F736A', fontSize: 13 }}>
                    <IoTime size={14} />
                    <span>اليوم: {new Date().toLocaleDateString('ar-SA', { weekday: 'long' })}</span>
                    <span style={{ margin: '0 6px' }}>•</span>
                    <span>
                      {(restaurant.openingHours as any)[new Date().toLocaleDateString('en-US', { weekday: 'lowercase' })]?.closed
                        ? 'مغلق'
                        : `${(restaurant.openingHours as any)[new Date().toLocaleDateString('en-US', { weekday: 'lowercase' })]?.open} - ${(restaurant.openingHours as any)[new Date().toLocaleDateString('en-US', { weekday: 'lowercase' })]?.close}`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ marginTop: 24, overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
              {[{ id: 'all', name: 'الكل' }, ...categories].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontFamily: 'Cairo, sans-serif', fontWeight: 600, fontSize: 13,
                    background: selectedCategory === cat.id ? primaryColor : '#F1F5F2',
                    color: selectedCategory === cat.id ? '#F4F7F4' : '#5F736A',
                    transition: 'all 0.2s',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Items grid */}
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {filteredItems.map(item => (
              <div key={item.id} style={{ background: '#FFFFFF', border: '1px solid rgba(8,72,53,0.15)', borderRadius: 16, overflow: 'hidden', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(8,72,53,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(8,72,53,0.15)'; }}>
                {item.image && (
                  <img src={getImageUrl(item.image)} alt={item.name} style={{ width: '100%', height: 192, objectFit: 'cover' }} />
                )}
                <div style={{ padding: 16 }}>
                  <h3 style={{ color: '#10231B', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{item.name}</h3>
                  {item.description && (
                    <p style={{ color: '#5F736A', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{item.description}</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {item.discountedPrice ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#084835', fontSize: 18, fontWeight: 800 }}>{formatPrice(item.discountedPrice)}</span>
                          <span style={{ color: '#5F736A', fontSize: 13, textDecoration: 'line-through' }}>{formatPrice(item.price)}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#084835', fontSize: 18, fontWeight: 800 }}>{formatPrice(item.price)}</span>
                      )}
                    </div>
                    {!item.isAvailable && (
                      <span style={{ background: 'rgba(214,69,69,0.12)', color: '#D64545', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>غير متوفر</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default RestaurantPage;
