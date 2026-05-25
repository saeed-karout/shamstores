// components/qr/QRGenerator.tsx

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import api from '../../services/api';
import Modal from '../common/Modal';
import { IoDownload, IoPrint, IoQrCode, IoColorPalette, IoCopy } from 'react-icons/io5';
import toast from 'react-hot-toast';

interface QRGeneratorProps {
  type: 'restaurant' | 'table' | 'item' | 'store' | 'store-product';
  id?: string;
  name?: string;
  slug?: string;
  subdomain?: string;
  customDomain?: string;
  buttonText?: string | React.ReactNode;
  className?: string;
  variant?: 'primary' | 'outline' | 'accent';
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
  gradient: boolean;
  gradientStart: string;
  gradientEnd: string;
  shadow: boolean;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({
  type,
  id,
  name,
  slug,
  subdomain,
  customDomain,
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
    cornerStyle: 'rounded',
    gradient: false,
    gradientStart: '#C8E235',
    gradientEnd: '#60A5FA',
    shadow: true
  });

  // ✅ الدومين الثابت للمنصة (وليس localhost)
  const PRODUCTION_DOMAIN = 'https://shamstores.com';

  // ✅ دالة للحصول على الرابط الصحيح
  const getEntityUrl = (): string => {
    // إذا كان هناك customDomain
    if (customDomain) {
      return `https://${customDomain}`;
    }
    
    // إذا كان هناك subdomain
    if (subdomain) {
      return `https://${subdomain}.shamstores.com`;
    }
    
    // الوضع العادي: domain/slug
    return `${PRODUCTION_DOMAIN}/${slug}`;
  };

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

  const saveDesignSettings = () => {
    localStorage.setItem('qr_design_settings', JSON.stringify(design));
    toast.success('تم حفظ إعدادات التصميم');
    setShowDesignModal(false);
  };

  const generateQR = async () => {
    setLoading(true);
    try {
      let response;
      const qrUrl = getEntityUrl();
      
      console.log('🔍 Generating QR for URL:', qrUrl); // ✅ للتأكد

      if (type === 'restaurant' && slug) {
        const endpoint = id ? `/qr/admin/restaurant/${id}` : '/qr/restaurant';
        response = await api.post(endpoint, {
          backgroundColor: design.backgroundColor,
          foregroundColor: design.foregroundColor
        });
      } 
      else if (type === 'store' && slug) {
        const endpoint = id ? `/qr/admin/store/${id}` : '/qr/store';
        response = await api.post(endpoint, {
          backgroundColor: design.backgroundColor,
          foregroundColor: design.foregroundColor
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
        }
      }
      else if (type === 'item' && id && slug) {
        response = await api.post(`/qr/item/${id}`, {
          backgroundColor: design.backgroundColor,
          foregroundColor: design.foregroundColor
        });
      }
      else if (type === 'store-product' && id && slug) {
        response = await api.post(`/qr/store-product/${id}`, {
          backgroundColor: design.backgroundColor,
          foregroundColor: design.foregroundColor
        });
      }

      setQrData({
        png: response?.png || response?.data?.png,
        svg: response?.svg || response?.data?.svg,
        url: qrUrl
      });
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
    toast.success(`تم تحميل رمز QR كملف ${format.toUpperCase()}`);
  };

  const copyUrl = () => {
    if (qrData?.url) {
      navigator.clipboard.writeText(qrData.url);
      toast.success('تم نسخ الرابط');
    }
  };

  const printQR = () => {
    if (!qrData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logo = type === 'restaurant' || type === 'table' || type === 'item' ? restaurantLogo : storeLogo;
    const entityName = type === 'restaurant' || type === 'table' || type === 'item' ? restaurantName : storeName;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${entityName || ''}</title>
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
              max-width: ${design.size + 120}px;
              margin: 0 auto;
              background: white;
              border-radius: ${design.frameStyle === 'rounded' ? '24px' : design.frameStyle === 'modern' ? '32px' : '12px'};
              box-shadow: ${design.shadow ? '0 20px 40px rgba(0,0,0,0.1)' : 'none'};
              overflow: hidden;
              padding: 30px;
            }
            .qr-container { margin: 20px auto; display: flex; justify-content: center; }
            .qr-code { width: ${design.size}px; height: ${design.size}px; }
            .url { color: #666; margin-top: 20px; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 8px; }
            @media print { body { padding: 0; margin: 0; } .qr-card { box-shadow: none; padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <div class="qr-container">
              ${qrData.svg || `<img src="data:image/png;base64,${qrData.png}" class="qr-code" />`}
            </div>
            ${design.includeText ? `<div class="url">${qrData.url}</div>` : ''}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-500 text-white hover:bg-blue-600 shadow-md';
      case 'accent':
        return 'bg-[#C8E235] text-[#082E24] hover:bg-[#B0C820] shadow-md';
      default:
        return 'border border-gray-600 text-gray-300 hover:bg-gray-800';
    }
  };

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
        className={`flex items-center justify-center px-5 py-2.5 rounded-xl disabled:opacity-50 transition-all duration-200 font-semibold ${getVariantStyles()} ${className}`}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <><IoQrCode className="ml-2" size={18} /> {buttonText}</>
        )}
      </button>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={getModalTitle()} size="md">
        <div className="text-center">
          <div className={`p-6 bg-white rounded-2xl ${design.shadow ? 'shadow-xl' : ''} ${design.frameStyle === 'rounded' ? 'rounded-2xl' : design.frameStyle === 'modern' ? 'rounded-3xl' : 'rounded-lg'}`}>
            {qrData?.png ? (
              <img 
                src={`data:image/png;base64,${qrData.png}`} 
                alt="QR Code" 
                className="mx-auto shadow-md rounded-xl"
                style={{ width: design.size, height: design.size }}
              />
            ) : (
              <QRCode 
                value={qrData?.url || ''} 
                size={design.size}
                bgColor={design.backgroundColor}
                fgColor={design.foregroundColor}
                level="H"
                includeMargin={true}
              />
            )}
          </div>

          {design.includeText && qrData?.url && (
            <div className="mt-4 p-3 bg-gray-800 rounded-xl">
              <code className="text-xs text-[#C8E235] break-all font-mono">{qrData.url}</code>
            </div>
          )}

          <div className="flex justify-center gap-2 mt-6 flex-wrap">
            <button
              onClick={copyUrl}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
            >
              <IoCopy size={16} /> نسخ الرابط
            </button>
            <button
              onClick={() => setShowDesignModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all"
            >
              <IoColorPalette size={16} /> تخصيص
            </button>
            <button
              onClick={() => downloadQR('png')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
            >
              <IoDownload size={16} /> PNG
            </button>
            {qrData?.svg && (
              <button
                onClick={() => downloadQR('svg')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all"
              >
                <IoDownload size={16} /> SVG
              </button>
            )}
            <button
              onClick={printQR}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-all"
            >
              <IoPrint size={16} /> طباعة
            </button>
          </div>
        </div>
      </Modal>

      {/* Design Modal - يمكنك إضافته لاحقاً */}
    </>
  );
};

export default QRGenerator;