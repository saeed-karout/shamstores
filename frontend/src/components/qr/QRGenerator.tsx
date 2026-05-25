// components/qr/QRGenerator.tsx

import React, { useState, useEffect, useContext } from 'react';
import QRCode from 'qrcode.react';
import api from '../../services/api';
import Modal from '../common/Modal';
import { useTheme } from '@/context/ThemeContext';
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
  const theme = useTheme();
  
  const [design, setDesign] = useState<QRDesign>({
    backgroundColor: '#FFFFFF',
    foregroundColor: '#000000',
    size: 200,
    includeLogo: true,
    includeText: true,
    frameStyle: 'modern',
    cornerStyle: 'rounded',
    gradient: false,
    gradientStart: theme.primaryColor || '#C8E235',
    gradientEnd: '#60A5FA',
    shadow: true
  });

  // ✅ الدومين الثابت للمنصة
  const PRODUCTION_DOMAIN = 'https://shamstores.com';

  // ✅ دالة للحصول على الرابط الصحيح
  const getEntityUrl = (): string => {
    if (customDomain) {
      return `https://${customDomain}`;
    }
    if (subdomain) {
      return `https://${subdomain}.shamstores.com`;
    }
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
      
      console.log('🔍 Generating QR for URL:', qrUrl);

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

  // ✅ تحديث الـ variant styles لاستخدام ألوان ThemeContext
  const getVariantStyles = () => {
    const primaryColor = theme.primaryColor || '#3B82F6';
    const accentColor = theme.accentColor || '#C8E235';
    const bgColor = theme.backgroundColor || '#082E24';
    
    switch (variant) {
      case 'primary':
        return `bg-[${primaryColor}] text-[${bgColor}] hover:bg-[${primaryColor}]dd shadow-md`;
      case 'accent':
        return `bg-[${accentColor}] text-[${bgColor}] hover:bg-[${accentColor}]dd shadow-md`;
      default:
        return `border border-[${theme.mutedColor || '#9DC4AC'}] text-[${theme.textColor || '#E8F5E9'}] hover:bg-[${theme.surfaceColor || '#0F3D31'}]`;
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
        style={{
          backgroundColor: variant === 'primary' ? theme.primaryColor : variant === 'accent' ? theme.accentColor : undefined,
          color: variant === 'primary' || variant === 'accent' ? theme.backgroundColor : undefined,
          border: variant === 'outline' ? `1px solid ${theme.primaryColor}` : undefined,
        }}
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

      {/* Design Modal */}
      {showDesignModal && (
        <Modal isOpen={showDesignModal} onClose={() => setShowDesignModal(false)} title="تخصيص تصميم QR Code" size="lg">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">لون الخلفية</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={design.backgroundColor}
                    onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={design.backgroundColor}
                    onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })}
                    className="flex-1 p-2 border rounded bg-gray-800 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">لون الرمز</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={design.foregroundColor}
                    onChange={(e) => setDesign({ ...design, foregroundColor: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={design.foregroundColor}
                    onChange={(e) => setDesign({ ...design, foregroundColor: e.target.value })}
                    className="flex-1 p-2 border rounded bg-gray-800 text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">حجم QR (بكسل): {design.size}px</label>
              <input
                type="range"
                min="150"
                max="400"
                step="10"
                value={design.size}
                onChange={(e) => setDesign({ ...design, size: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">شكل الإطار</label>
                <select
                  value={design.frameStyle}
                  onChange={(e) => setDesign({ ...design, frameStyle: e.target.value as any })}
                  className="w-full p-2 border rounded bg-gray-800 text-white"
                >
                  <option value="none">بدون إطار</option>
                  <option value="simple">بسيط</option>
                  <option value="rounded">مدور</option>
                  <option value="modern">حديث</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">شكل الزوايا</label>
                <select
                  value={design.cornerStyle}
                  onChange={(e) => setDesign({ ...design, cornerStyle: e.target.value as any })}
                  className="w-full p-2 border rounded bg-gray-800 text-white"
                >
                  <option value="square">مربعة</option>
                  <option value="rounded">مدورة</option>
                  <option value="circle">دائرية</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={design.includeLogo}
                  onChange={(e) => setDesign({ ...design, includeLogo: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>إظهار الشعار</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={design.includeText}
                  onChange={(e) => setDesign({ ...design, includeText: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>إظهار النص</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={design.shadow}
                  onChange={(e) => setDesign({ ...design, shadow: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>إظهار الظل</span>
              </label>
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="font-bold mb-3">معاينة التصميم</h4>
              <div className="bg-gray-100 p-6 rounded-xl flex justify-center">
                <div className={`p-4 bg-white ${design.frameStyle === 'rounded' ? 'rounded-2xl' : design.frameStyle === 'modern' ? 'rounded-3xl' : 'rounded-lg'} ${design.shadow ? 'shadow-lg' : ''}`}>
                  <div 
                    className="w-32 h-32 flex items-center justify-center rounded-lg"
                    style={{ backgroundColor: design.backgroundColor }}
                  >
                    <div 
                      className="w-24 h-24 rounded"
                      style={{ backgroundColor: design.foregroundColor }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={saveDesignSettings}
                className="flex-1 bg-[#C8E235] text-[#082E24] py-2.5 rounded-xl font-semibold hover:bg-[#B0C820] transition-all"
              >
                حفظ الإعدادات
              </button>
              <button
                onClick={() => setShowDesignModal(false)}
                className="flex-1 bg-gray-700 text-white py-2.5 rounded-xl font-semibold hover:bg-gray-600 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default QRGenerator;