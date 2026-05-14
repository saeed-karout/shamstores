import React, { useEffect, useState } from 'react';
import { Table } from '../../services/types';
import Modal from '../common/Modal';
import Button from '../common/Button';
import QRCode from 'qrcode.react';
import { IoDownload, IoPrint } from 'react-icons/io5';
import api from '../../services/api';

interface TableQRProps {
  table: Table;
  isOpen: boolean;
  onClose: () => void;
}

const TableQR: React.FC<TableQRProps> = ({ table, isOpen, onClose }) => {
  const [restaurantSlug, setRestaurantSlug] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && table.restaurantId) {
      fetchRestaurantSlug();
    }
  }, [isOpen, table.restaurantId]);

  const fetchRestaurantSlug = async () => {
    try {
      setLoading(true);
      // جلب معلومات المطعم باستخدام restaurantId
      const restaurant = await api.get(`/restaurants/${table.restaurantId}`);
      setRestaurantSlug(restaurant.slug);
    } catch (error) {
      console.error('Error fetching restaurant slug:', error);
      // إذا فشل الجلب، استخدم ID كبديل
      setRestaurantSlug(table.restaurantId);
    } finally {
      setLoading(false);
    }
  };

  const baseUrl = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';
  const qrUrl = `${baseUrl}/${restaurantSlug}/table/${table.id}`;

  const downloadQR = (format: 'png' | 'svg') => {
    if (format === 'png' && table.qrCode) {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${table.qrCode}`;
      link.download = `table-${table.name}-qr.png`;
      link.click();
    } else if (format === 'svg' && table.qrSvg) {
      const blob = new Blob([table.qrSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `table-${table.name}-qr.svg`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${table.name}</title>
          <style>
            body { text-align: center; font-family: Arial; padding: 20px; direction: rtl; }
            .qr-container { margin: 40px auto; max-width: 400px; }
            .title { font-size: 24px; margin-bottom: 20px; }
            .url { color: #666; margin-top: 20px; font-size: 14px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="title">${table.name}</div>
            ${table.qrSvg ? table.qrSvg : `<img src="data:image/png;base64,${table.qrCode}" style="width: 300px;" />`}
            <div class="url">${qrUrl}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`QR Code - ${table.name}`}
      size="sm"
    >
      <div className="text-center">
        {/* رمز QR */}
        <div className="mb-4">
          {loading ? (
            <div className="w-48 h-48 mx-auto flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : table.qrSvg ? (
            <div dangerouslySetInnerHTML={{ __html: table.qrSvg }} className="w-48 h-48 mx-auto" />
          ) : table.qrCode ? (
            <img
              src={`data:image/png;base64,${table.qrCode}`}
              alt={`QR ${table.name}`}
              className="w-48 h-48 mx-auto"
            />
          ) : (
            <QRCode value={qrUrl} size={200} />
          )}
        </div>

        {/* معلومات الطاولة */}
        <h3 className="font-semibold mb-1">{table.name}</h3>
        <p className="text-sm text-gray-500 mb-4 break-all">{qrUrl}</p>

        {/* أزرار الإجراءات */}
        <div className="flex justify-center space-x-2 rtl:space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadQR('png')}
            disabled={!table.qrCode}
          >
            <IoDownload className="inline ml-1" />
            PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadQR('svg')}
            disabled={!table.qrSvg}
          >
            <IoDownload className="inline ml-1" />
            SVG
          </Button>
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
  );
};

export default TableQR;