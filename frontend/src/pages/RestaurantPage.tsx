import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Restaurant, Category, MenuItem } from '../services/types';
import Loader from '../components/common/Loader';
import { 
  IoCall, 
  IoLogoWhatsapp, 
  IoLocation, 
  IoTime,
  IoLogoInstagram,
  IoLogoFacebook,
  IoShare
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

  useEffect(() => {
    fetchRestaurant();
  }, [slug]);

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
    const url = window.location.href;
    navigator.clipboard.writeText(url);
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
  if (!data) return <div>المطعم غير موجود</div>;

  const { restaurant, categories } = data;
  const filteredItems = getFilteredItems();

  return (
    <>
      <Helmet>
        <title>{restaurant.name} - القائمة الرقمية</title>
        <meta name="description" content={restaurant.description} />
        <meta property="og:title" content={restaurant.name} />
        <meta property="og:description" content={restaurant.description} />
        {restaurant.logo && <meta property="og:image" content={getImageUrl(restaurant.logo)} />}
      </Helmet>

      <div className="min-h-screen" style={{ backgroundColor: restaurant.backgroundColor }}>
        {restaurant.coverImage && (
          <div 
            className="h-64 bg-cover bg-center"
            style={{ backgroundImage: `url(${getImageUrl(restaurant.coverImage)})` }}
          />
        )}

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-6 -mt-20 relative">
            <div className="flex items-start">
              {restaurant.logo && (
                <img
                  src={getImageUrl(restaurant.logo)}
                  alt={restaurant.name}
                  className="w-24 h-24 rounded-full border-4 border-white -mt-12 ml-4"
                />
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h1 className="text-2xl font-bold" style={{ color: restaurant.textColor }}>
                    {restaurant.name}
                  </h1>
                  <button
                    onClick={shareRestaurant}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <IoShare size={20} />
                  </button>
                </div>
                {restaurant.description && (
                  <p className="text-gray-600 mt-2">{restaurant.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  {restaurant.phone && (
                    <a
                      href={`tel:${restaurant.phone}`}
                      className="flex items-center text-gray-600 hover:text-blue-500"
                    >
                      <IoCall className="ml-2" />
                      {restaurant.phone}
                    </a>
                  )}
                  {restaurant.whatsapp && (
                    <a
                      href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-600 hover:text-green-500"
                    >
                      <IoLogoWhatsapp className="ml-2" />
                      واتساب
                    </a>
                  )}
                  {restaurant.address && (
                    <div className="flex items-center text-gray-600">
                      <IoLocation className="ml-2" />
                      {restaurant.address}
                    </div>
                  )}
                  {restaurant.instagram && (
                    <a
                      href={`https://instagram.com/${restaurant.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-600 hover:text-pink-500"
                    >
                      <IoLogoInstagram className="ml-2" />
                      انستغرام
                    </a>
                  )}
                </div>

                {restaurant.openingHours && (
                  <div className="mt-4 flex items-center text-gray-600">
                    <IoTime className="ml-2" />
                    <span>اليوم: {new Date().toLocaleDateString('ar-SA', { weekday: 'long' })}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {(restaurant.openingHours as any)[
                        new Date().toLocaleDateString('en-US', { weekday: 'lowercase' })
                      ]?.closed 
                        ? 'مغلق' 
                        : `${(restaurant.openingHours as any)[
                            new Date().toLocaleDateString('en-US', { weekday: 'lowercase' })
                          ]?.open} - ${(restaurant.openingHours as any)[
                            new Date().toLocaleDateString('en-US', { weekday: 'lowercase' })
                          ]?.close}`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                style={selectedCategory === 'all' ? { backgroundColor: restaurant.primaryColor } : {}}
              >
                الكل
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  style={selectedCategory === cat.id ? { backgroundColor: restaurant.primaryColor } : {}}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {item.image && (
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    {item.description && (
                      <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                    )}
                    <div className="mt-4 flex justify-between items-center">
                      <div>
                        {item.discountedPrice ? (
                          <div>
                            <span className="text-lg font-bold text-green-600">
                              {item.discountedPrice} ر.س
                            </span>
                            <span className="text-sm text-gray-400 line-through mr-2">
                              {item.price} ر.س
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold">{item.price} ر.س</span>
                        )}
                      </div>
                      {!item.isAvailable && (
                        <span className="text-sm text-red-500">غير متوفر</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RestaurantPage;