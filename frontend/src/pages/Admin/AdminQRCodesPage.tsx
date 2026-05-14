// pages/Admin/AdminQRCodesPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import QRGenerator from '../../components/qr/QRGenerator';
import { 
  IoQrCode, IoSearch, IoRefresh, IoStorefront, 
  IoRestaurant, IoArrowBack, IoLink, IoCopy 
} from 'react-icons/io5';
import toast from 'react-hot-toast';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  isActive: boolean;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  isActive: boolean;
}

const AdminQRCodesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'restaurants' | 'stores'>('restaurants');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'restaurant' | 'store'; data: any } | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'restaurants') {
        const data = await api.get('/admin/restaurants');
        setRestaurants(data?.restaurants || data || []);
      } else {
        const data = await api.get('/admin/stores');
        setStores(data?.stores || data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    if (activeTab === 'restaurants') {
      return restaurants.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.slug.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return stores.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ الرابط');
  };

  if (selectedEntity) {
    return (
      <div className="p-6 max-w-7xl mx-auto" dir="rtl">
        <button
          onClick={() => setSelectedEntity(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <IoArrowBack size={20} />
          العودة إلى القائمة
        </button>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            {selectedEntity.type === 'restaurant' ? (
              <IoRestaurant className="text-blue-500 text-3xl" />
            ) : (
              <IoStorefront className="text-green-500 text-3xl" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{selectedEntity.data.name}</h1>
              <p className="text-gray-500">
                {selectedEntity.type === 'restaurant' ? 'مطعم' : 'متجر'} • {selectedEntity.data.slug}
              </p>
            </div>
          </div>

          {/* QR الرئيسي */}
          <div className="border rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">📱 QR الرئيسي</h2>
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <QRGenerator
                type={selectedEntity.type === 'restaurant' ? 'restaurant' : 'store'}
                slug={selectedEntity.data.slug}
                storeName={selectedEntity.data.name}
                storeLogo={selectedEntity.data.logo}
                buttonText={
                  <div className="flex items-center gap-2">
                   
                    <span>إنشاء QR رئيسي</span>
                  </div>
                }
                variant="primary"
              />
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500 mb-1">رابط {selectedEntity.type === 'restaurant' ? 'المطعم' : 'المتجر'}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-white p-2 rounded border font-mono">
                      {window.location.origin}/{selectedEntity.data.slug}
                    </code>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/${selectedEntity.data.slug}`)}
                      className="p-2 text-gray-500 hover:text-blue-500 transition"
                      title="نسخ الرابط"
                    >
                      <IoCopy size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* روابط إضافية */}
          <div className="border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">🔗 روابط مفيدة</h2>
            <div className="space-y-3">
              {selectedEntity.type === 'restaurant' && (
                <>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500 mb-1">قائمة المطعم</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-white p-2 rounded border font-mono">
                        {window.location.origin}/{selectedEntity.data.slug}/menu
                      </code>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/${selectedEntity.data.slug}/menu`)}
                        className="p-2 text-gray-500 hover:text-blue-500 transition"
                      >
                        <IoCopy size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500 mb-1">لوحة تحكم المطعم</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-white p-2 rounded border font-mono">
                        {window.location.origin}/dashboard
                      </code>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/dashboard`)}
                        className="p-2 text-gray-500 hover:text-blue-500 transition"
                      >
                        <IoCopy size={18} />
                      </button>
                    </div>
                  </div>
                </>
              )}
              {selectedEntity.type === 'store' && (
                <>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500 mb-1">منتجات المتجر</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-white p-2 rounded border font-mono">
                        {window.location.origin}/{selectedEntity.data.slug}/products
                      </code>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/${selectedEntity.data.slug}/products`)}
                        className="p-2 text-gray-500 hover:text-blue-500 transition"
                      >
                        <IoCopy size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500 mb-1">لوحة تحكم المتجر</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-white p-2 rounded border font-mono">
                        {window.location.origin}/dashboard
                      </code>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/dashboard`)}
                        className="p-2 text-gray-500 hover:text-blue-500 transition"
                      >
                        <IoCopy size={18} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🎯 إدارة رموز QR</h1>
        <p className="text-gray-500">إنشاء رموز QR للمطاعم والمتاجر وروابطها</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        <button
          onClick={() => setActiveTab('restaurants')}
          className={`px-6 py-2 rounded-lg transition-all ${
            activeTab === 'restaurants'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <IoRestaurant className="inline ml-2" />
          المطاعم
        </button>
        <button
          onClick={() => setActiveTab('stores')}
          className={`px-6 py-2 rounded-lg transition-all ${
            activeTab === 'stores'
              ? 'bg-green-500 text-white shadow-md'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <IoStorefront className="inline ml-2" />
          المتاجر
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <IoSearch className="absolute right-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder={`بحث عن ${activeTab === 'restaurants' ? 'مطعم' : 'متجر'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <Loader />
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <IoLink className="text-gray-300 text-6xl mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد {activeTab === 'restaurants' ? 'مطاعم' : 'متاجر'}</h3>
          <p className="text-gray-500">لم يتم العثور على {activeTab === 'restaurants' ? 'مطاعم' : 'متاجر'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedEntity({ type: activeTab === 'restaurants' ? 'restaurant' : 'store', data: item })}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    activeTab === 'restaurants' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {activeTab === 'restaurants' ? (
                      <IoRestaurant className={activeTab === 'restaurants' ? 'text-blue-600' : 'text-green-600'} size={20} />
                    ) : (
                      <IoStorefront className={activeTab === 'restaurants' ? 'text-blue-600' : 'text-green-600'} size={20} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{item.slug}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <IoLink size={12} />
                  الرابط: {window.location.origin}/{item.slug}
                </p>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntity({ type: activeTab === 'restaurants' ? 'restaurant' : 'store', data: item });
                  }}
                  className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                >
                  <IoQrCode size={14} />
                  إنشاء QR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminQRCodesPage;