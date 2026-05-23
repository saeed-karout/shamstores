// أولاً: إنشاء مكون جديد لاختيار الموقع
// components/LocationPicker.tsx

import React, { useState, useEffect } from 'react';
import { IoLocation, IoNavigate, IoClose, IoWarning } from 'react-icons/io5';
import toast from 'react-hot-toast';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number; address: string } | null;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect, initialLocation }) => {
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [showMap, setShowMap] = useState(false);
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [manualAddress, setManualAddress] = useState('');

  // تحميل خريطة Google Maps
  const loadGoogleMaps = () => {
    if (document.querySelector('#google-maps-script')) return;
    
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  };

  // الحصول على الموقع الحالي
  const getCurrentLocation = () => {
    setLoading(true);
    
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // تحويل الإحداثيات إلى عنوان
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`
          );
          const data = await response.json();
          
          const locationData = {
            lat: latitude,
            lng: longitude,
            address: data.display_name || `${latitude}, ${longitude}`
          };
          
          setSelectedLocation(locationData);
          setAddress(locationData.address);
          onLocationSelect(locationData);
          toast.success('تم تحديد موقعك بنجاح');
        } catch (error) {
          console.error('Error getting address:', error);
          const locationData = {
            lat: latitude,
            lng: longitude,
            address: `${latitude}, ${longitude}`
          };
          setSelectedLocation(locationData);
          setAddress(locationData.address);
          onLocationSelect(locationData);
          toast.success('تم تحديد موقعك بنجاح');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'فشل تحديد الموقع';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'الرجاء السماح بالوصول إلى الموقع';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'معلومات الموقع غير متوفرة';
            break;
          case error.TIMEOUT:
            errorMessage = 'انتهى وقت محاولة تحديد الموقع';
            break;
        }
        toast.error(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // البحث عن عنوان
  const searchAddress = async () => {
    if (!manualAddress.trim()) {
      toast.error('يرجى إدخال عنوان');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}&accept-language=ar&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name
        };
        setSelectedLocation(location);
        setAddress(location.address);
        onLocationSelect(location);
        toast.success('تم تحديد الموقع');
        setShowMap(false);
      } else {
        toast.error('لم يتم العثور على العنوان');
      }
    } catch (error) {
      console.error('Error searching address:', error);
      toast.error('فشل البحث عن العنوان');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* زر تحديد الموقع */}
      <button
        onClick={getCurrentLocation}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <IoNavigate size={20} />
        )}
        <span>{selectedLocation ? 'تحديث الموقع' : 'تحديد موقعي الحالي'}</span>
      </button>

      {/* عنوان مختار */}
      {selectedLocation && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <IoLocation className="text-green-600" />
                <span className="font-bold text-green-800">الموقع المحدد:</span>
              </div>
              <p className="text-sm text-gray-700 break-words">{address}</p>
            </div>
            <button
              onClick={() => {
                setSelectedLocation(null);
                setAddress('');
                onLocationSelect(null);
              }}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <IoClose size={18} />
            </button>
          </div>
        </div>
      )}

      {/* إدخال عنوان يدوي */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="أو أدخل عنوانك يدوياً"
            className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 transition-all"
            onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
          />
          <button
            onClick={searchAddress}
            disabled={loading || !manualAddress.trim()}
            className="px-4 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-all disabled:opacity-50"
          >
            بحث
          </button>
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <IoWarning size={12} />
          يرجى التأكد من دقة العنوان لضمان وصول الطلب
        </p>
      </div>
    </div>
  );
};

export default LocationPicker;

