// components/qr/QRGenerator.tsx

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import api from '../../services/api';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { IoDownload, IoPrint, IoQrCode, IoColorPalette, IoImage, IoText, IoRefresh } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/utils/imageHelpers';

interface QRGeneratorProps {
  type: 'restaurant' | 'table' | 'item' | 'store' | 'store-product';
  id?: string;
  name?: string;
  slug?: string;
  buttonText?: string | React.ReactNode;
  className?: string;
  variant?: 'primary' | 'outline';
  shareToken?: string;
  restaurantLogo?: string;
  restaurantName?: string;
  storeLogo?: string;
  storeName?: string;
}

interface QRDesign {
  backgroundColor: string;
  foregroundColor: string;
  size: number;
  includeLogo: boolean;
  includeText: boolean;
  frameStyle: 'none' | 'simple' | 'rounded' | 'modern';
  cornerStyle: 'square' | 'circle' | 'rounded';
}

const QRGenerator: React.FC<QRGeneratorProps> = ({
  type,
  id,
  name,
  slug,
  shareToken,
  buttonText = 'إنشاء QR',
  className = '',
  variant = 'primary',
  restaurantLogo,
  restaurantName,
  storeLogo,
  storeName
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [qrData, setQrData] = useState<{ png?: string; svg?: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<QRDesign>({
    backgroundColor: '#FFFFFF',
    foregroundColor: '#000000',
    size: 200,
    includeLogo: true,
    includeText: true,
    frameStyle: 'modern',
    cornerStyle: 'rounded'
  });

  // تعريف أنماط الإطار
  const frameStyles = {
    none: '',
    simple: 'shadow-md rounded-lg',
    rounded: 'shadow-xl rounded-2xl',
    modern: 'shadow-2xl rounded-3xl bg-gradient-to-br from-white to-gray-50'
  };

  // تعريف أنماط الزوايا
  const cornerStyles = {
    square: 'rounded-none',
    circle: 'rounded-full',
    rounded: 'rounded-xl'
  };

  // تحميل إعدادات التصميم من localStorage
  useEffect(() => {
    const savedDesign = localStorage.getItem('qr_design_settings');
    if (savedDesign) {
      try {
        setDesign(JSON.parse(savedDesign));
      } catch (e) {
        console.error('Error loading QR design:', e);
      }
    }
  }, []);

  // حفظ إعدادات التصميم
  const saveDesignSettings = () => {
    localStorage.setItem('qr_design_settings', JSON.stringify(design));
    toast.success('تم حفظ إعدادات التصميم');
    setShowDesignModal(false);
  };

  const generateQR = async () => {
    setLoading(true);
    try {
      let response;
      const frontendUrl = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';
      let qrUrl = '';

      // ==================== المطاعم ====================
      if (type === 'restaurant' && slug) {
        response = await api.post('/qr/restaurant', {
          backgroundColor: design.backgroundColor,
          foregroundColor: design.foregroundColor
        });
        qrUrl = `${frontendUrl}/${slug}`;
        setQrData({
          png: response.png,
          svg: response.svg,
          url: qrUrl
        });
      } 
      else if (type === 'table' && id) {
        if (id === 'all') {
          response = await api.post('/qr/tables/all');
          toast.success(`تم إنشاء ${response.length} رمز QR`);
          setLoading(false);
          return;
        } else {
          response = await api.post(`/qr/table/${id}`, {
            backgroundColor: design.backgroundColor,
            foregroundColor: design.foregroundColor
          });
          qrUrl = `${frontendUrl}/${slug}/table/${id}`;
          setQrData({
            png: response.png,
            svg: response.svg,
            url: qrUrl
          });
        }
      } 
      else if (type === 'item' && id && slug) {
        try {
          const item = await api.get(`/menu/items/${id}`);
          const token = item.shareToken;
          
          if (!token) {
            toast.error('رمز المشاركة غير موجود للعنصر');
            setLoading(false);
            return;
          }
          
          response = await api.post(`/qr/item/${id}`, {
            backgroundColor: design.backgroundColor,
            foregroundColor: design.foregroundColor
          });
          qrUrl = `${frontendUrl}/${slug}/item/${token}`;
          setQrData({
            png: response.png,
            svg: response.svg,
            url: qrUrl
          });
        } catch (error) {
          console.error('Error fetching item:', error);
          toast.error('فشل في جلب معلومات العنصر');
          setLoading(false);
          return;
        }
      }
      
      // ==================== المتاجر ====================
      else if (type === 'store' && slug) {
        response = await api.post('/qr/store', {
          storeId: id,
          backgroundColor: design.backgroundColor,
          foregroundColor: design.foregroundColor
        });
        qrUrl = `${frontendUrl}/${slug}`;
        setQrData({
          png: response.png,
          svg: response.svg,
          url: qrUrl
        });
      }
      else if (type === 'store-product' && id && slug) {
        response = await api.post(`/qr/store-product/${id}`, {
          backgroundColor: design.backgroundColor,
          foregroundColor: design.foregroundColor
        });
        qrUrl = `${frontendUrl}/${slug}/product/${id}`;
        setQrData({
          png: response.png,
          svg: response.svg,
          url: qrUrl
        });
      }

      setShowModal(true);
    } catch (error: any) {
      console.error('QR Generation Error:', error);
      toast.error(error.response?.data?.error || 'فشل إنشاء رمز QR');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = (format: 'png' | 'svg') => {
    if (!qrData) return;

    let fileName = '';
    if (type === 'restaurant') fileName = `restaurant-${slug}-qr.${format}`;
    else if (type === 'store') fileName = `store-${slug}-qr.${format}`;
    else if (type === 'table') fileName = `table-${name || id}-qr.${format}`;
    else if (type === 'item') fileName = `item-${name || id}-qr.${format}`;
    else if (type === 'store-product') fileName = `product-${name || id}-qr.${format}`;

    if (format === 'png' && qrData.png) {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${qrData.png}`;
      link.download = fileName;
      link.click();
    } else if (format === 'svg' && qrData.svg) {
      const blob = new Blob([qrData.svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const printQR = () => {
    if (!qrData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let title = '';
    let subtitle = '';
    let footerText = '';

    if (type === 'restaurant') {
      title = `QR Code - ${restaurantName || 'المطعم'}`;
      subtitle = 'امسح الرمز لفتح القائمة الرقمية';
      footerText = `${restaurantName || 'المطعم'} | القائمة الرقمية`;
    } else if (type === 'store') {
      title = `QR Code - ${storeName || 'المتجر'}`;
      subtitle = 'امسح الرمز لزيارة المتجر الإلكتروني';
      footerText = `${storeName || 'المتجر'} | المتجر الإلكتروني`;
    } else if (type === 'table') {
      title = `QR Code - ${name || 'طاولة'}`;
      subtitle = 'امسح الرمز لطلب الطعام';
      footerText = `${restaurantName || 'المطعم'} | طاولة ${name || ''}`;
    } else if (type === 'item') {
      title = `QR Code - ${name || 'عنصر'}`;
      subtitle = 'امسح الرمز لعرض تفاصيل العنصر';
      footerText = `${restaurantName || 'المطعم'} | ${name || ''}`;
    } else if (type === 'store-product') {
      title = `QR Code - ${name || 'منتج'}`;
      subtitle = 'امسح الرمز لعرض تفاصيل المنتج';
      footerText = `${storeName || 'المتجر'} | ${name || ''}`;
    }

    const logo = type === 'restaurant' || type === 'table' || type === 'item' ? restaurantLogo : storeLogo;
    const entityName = type === 'restaurant' || type === 'table' || type === 'item' ? restaurantName : storeName;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              text-align: center; 
              font-family: 'Cairo', Arial, sans-serif; 
              padding: 40px;
              direction: rtl;
              background: ${design.backgroundColor};
            }
            .qr-card {
              max-width: ${design.size + 100}px;
              margin: 0 auto;
              background: white;
              border-radius: ${design.frameStyle === 'rounded' ? '24px' : design.frameStyle === 'modern' ? '32px' : '12px'};
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              overflow: hidden;
              padding: 30px;
            }
            .qr-header { text-align: center; margin-bottom: 20px; }
            .logo { max-width: 80px; margin-bottom: 15px; }
            .title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
            .subtitle { color: #666; font-size: 14px; }
            .qr-container { margin: 20px auto; display: flex; justify-content: center; padding: 20px; background: white; border-radius: 16px; }
            .qr-code { width: ${design.size}px; height: ${design.size}px; }
            .url { color: #666; margin-top: 20px; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 8px; }
            .footer { margin-top: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            @media print { body { padding: 0; margin: 0; } .qr-card { box-shadow: none; padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <div class="qr-header">
              ${design.includeLogo && logo ? `<img src="${getImageUrl(logo)}" class="logo" alt="Logo" />` : ''}
              <div class="title">${title}</div>
              <div class="subtitle">${subtitle}</div>
            </div>
            <div class="qr-container">
              ${qrData.svg ? qrData.svg : `<img src="data:image/png;base64,${qrData.png}" class="qr-code" />`}
            </div>
            ${design.includeText ? `<div class="url">${qrData.url}</div>` : ''}
            <div class="footer">${footerText}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateStyledQR = () => {
    if (!qrData) return null;
    
    const logo = type === 'restaurant' || type === 'table' || type === 'item' ? restaurantLogo : storeLogo;
    const entityName = type === 'restaurant' || type === 'table' || type === 'item' ? restaurantName : storeName;
    
    return (
      <div className={`bg-white p-6 ${frameStyles[design.frameStyle]} ${cornerStyles[design.cornerStyle]}`}>
        {/* الهيدر مع الشعار */}
        {design.includeLogo && (logo || entityName) && (
          <div className="text-center mb-4">
            {logo && (
              <img 
                src={getImageUrl(logo)}
                alt="Logo"
                className="w-16 h-16 mx-auto mb-2 rounded-full object-cover border-2 border-gray-200 shadow-md"
              />
            )}
            {entityName && design.includeText && (
              <h3 className="font-bold text-gray-800 text-lg">{entityName}</h3>
            )}
          </div>
        )}

        {/* رمز QR مع الشعار في المنتصف */}
        <div className="flex justify-center p-4 bg-white rounded-xl">
          {qrData?.png ? (
            <div className="relative">
              <img
                src={`data:image/png;base64,${qrData.png}`}
                alt="QR Code"
                className="shadow-lg rounded-xl"
                style={{ 
                  width: design.size,
                  height: design.size,
                  backgroundColor: design.backgroundColor
                }}
              />
              {/* إضافة شعار إضافي كتراكب (اختياري) */}
              {design.includeLogo && logo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white rounded-full p-1 shadow-md">
                    <img 
                      src={getImageUrl(logo)}
                      alt="Logo Overlay"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <QRCode 
              value={qrData?.url || ''} 
              size={design.size}
              bgColor={design.backgroundColor}
              fgColor={design.foregroundColor}
              level="H"
              includeMargin={true}
              imageSettings={design.includeLogo && logo ? {
                src: getImageUrl(logo),
                height: design.size * 0.25,
                width: design.size * 0.25,
                excavate: true
              } : undefined}
            />
          )}
        </div>

        {/* النص */}
        {design.includeText && (
          <div className="text-center mt-4">
            <p className="text-sm text-gray-500 break-all font-mono">{qrData?.url}</p>
            <p className="text-xs text-gray-400 mt-2">
              {type === 'restaurant' ? 'امسح الرمز لفتح القائمة الرقمية' : 
               type === 'store' ? 'امسح الرمز لزيارة المتجر الإلكتروني' :
               type === 'table' ? 'امسح الرمز لطلب الطعام' : 
               type === 'store-product' ? 'امسح الرمز لعرض تفاصيل المنتج' :
               'امسح الرمز لعرض التفاصيل'}
            </p>
          </div>
        )}
      </div>
    );
  };

  const buttonClasses = variant === 'primary' 
    ? 'bg-blue-500 text-white hover:bg-blue-600' 
    : 'border border-gray-300 text-gray-700 hover:bg-gray-50';

  const getModalTitle = () => {
    if (type === 'restaurant') return 'QR Code المطعم';
    if (type === 'store') return 'QR Code المتجر';
    if (type === 'table') return `QR Code ${name || 'الطاولة'}`;
    if (type === 'item') return `QR Code ${name || 'العنصر'}`;
    if (type === 'store-product') return `QR Code ${name || 'المنتج'}`;
    return 'QR Code';
  };

  return (
    <>
      <button
        onClick={generateQR}
        disabled={loading}
        className={`flex items-center justify-center px-4 py-2 rounded-lg disabled:opacity-50 transition-all ${buttonClasses} ${className}`}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <><IoQrCode className="ml-2" /> {buttonText}</>
        )}
      </button>

      {/* نافذة معاينة QR */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={getModalTitle()}
        size="md"
      >
        <div className="text-center">
          {/* معاينة QR بتصميم */}
          {generateStyledQR()}

          {/* أزرار التحكم */}
          <div className="flex justify-center gap-2 mt-6 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDesignModal(true)}
            >
              <IoColorPalette className="inline ml-1" />
              تخصيص التصميم
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadQR('png')}
            >
              <IoDownload className="inline ml-1" />
              PNG
            </Button>
            {qrData?.svg && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadQR('svg')}
              >
                <IoDownload className="inline ml-1" />
                SVG
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={printQR}
            >
              <IoPrint className="inline ml-1" />
              طباعة
            </Button>
          </div>
        </div>
      </Modal>

      {/* نافذة تخصيص التصميم */}
      <Modal
        isOpen={showDesignModal}
        onClose={() => setShowDesignModal(false)}
        title="تخصيص تصميم QR Code"
        size="md"
      >
        <div className="space-y-4">
          {/* الألوان */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">لون الخلفية</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={design.backgroundColor}
                  onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })}
                  className="w-12 h-10 rounded border"
                />
                <input
                  type="text"
                  value={design.backgroundColor}
                  onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })}
                  className="flex-1 p-2 border rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">لون الرمز</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={design.foregroundColor}
                  onChange={(e) => setDesign({ ...design, foregroundColor: e.target.value })}
                  className="w-12 h-10 rounded border"
                />
                <input
                  type="text"
                  value={design.foregroundColor}
                  onChange={(e) => setDesign({ ...design, foregroundColor: e.target.value })}
                  className="flex-1 p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* الحجم */}
          <div>
            <label className="block text-sm font-medium mb-1">حجم QR (بكسل)</label>
            <input
              type="range"
              min="150"
              max="300"
              value={design.size}
              onChange={(e) => setDesign({ ...design, size: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="text-center text-sm text-gray-500 mt-1">{design.size}px</div>
          </div>

          {/* إطار وتدوير */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">شكل الإطار</label>
              <select
                value={design.frameStyle}
                onChange={(e) => setDesign({ ...design, frameStyle: e.target.value as any })}
                className="w-full p-2 border rounded"
              >
                <option value="none">بدون إطار</option>
                <option value="simple">بسيط</option>
                <option value="rounded">مدور</option>
                <option value="modern">حديث</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">شكل الزوايا</label>
              <select
                value={design.cornerStyle}
                onChange={(e) => setDesign({ ...design, cornerStyle: e.target.value as any })}
                className="w-full p-2 border rounded"
              >
                <option value="square">مربعة</option>
                <option value="rounded">مدورة</option>
                <option value="circle">دائرية</option>
              </select>
            </div>
          </div>

          {/* خيارات إضافية */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={design.includeLogo}
                onChange={(e) => setDesign({ ...design, includeLogo: e.target.checked })}
                className="w-4 h-4"
              />
              <span>إظهار الشعار</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={design.includeText}
                onChange={(e) => setDesign({ ...design, includeText: e.target.checked })}
                className="w-4 h-4"
              />
              <span>إظهار النص</span>
            </label>
          </div>

          {/* معاينة التصميم */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-bold mb-2">معاينة التصميم</h4>
            <div className="bg-gray-100 p-4 rounded-lg flex justify-center">
              <div className={`p-4 bg-white ${frameStyles[design.frameStyle]}`}>
                <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded-lg">
                  <IoQrCode size={48} className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" onClick={saveDesignSettings} fullWidth>
              حفظ الإعدادات
            </Button>
            <Button variant="outline" onClick={() => setShowDesignModal(false)} fullWidth>
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default QRGenerator;