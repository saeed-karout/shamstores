// src/components/settings/ImageSettingsTab.tsx

import React, { useState } from 'react';
import { IoImage, IoCloudUpload, IoTrash, IoRefresh } from 'react-icons/io5';
import { getImageUrl } from '@/utils/imageHelpers';
// import Button from '@/components/common/Button';

interface ImageSettingsTabProps {
  logo?: string;
  coverImage?: string;
  favicon?: string;
  onUploadLogo: (file: File) => Promise<void>;
  onUploadCover: (file: File) => Promise<void>;
  onUploadFavicon?: (file: File) => Promise<void>;
  onRemoveLogo?: () => Promise<void>;
  onRemoveCover?: () => Promise<void>;
  uploading?: boolean;
}

const ImageSettingsTab: React.FC<ImageSettingsTabProps> = ({
  logo,
  coverImage,
  favicon,
  onUploadLogo,
  onUploadCover,
  onUploadFavicon,
  onRemoveLogo,
  onRemoveCover,
  uploading
}) => {
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [previewCover, setPreviewCover] = useState<string | null>(null);
  const [previewFavicon, setPreviewFavicon] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewLogo(URL.createObjectURL(file));
      onUploadLogo(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewCover(URL.createObjectURL(file));
      onUploadCover(file);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadFavicon) {
      setPreviewFavicon(URL.createObjectURL(file));
      onUploadFavicon(file);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <IoImage className="text-green-600" />
        صور المتجر
      </h2>

      {/* الشعار */}
      <div className="border rounded-xl p-4">
        <label className="block text-sm font-medium mb-2">شعار المتجر</label>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="relative">
            {(previewLogo || logo) && (
              <img
                src={previewLogo || getImageUrl(logo || '')}
                alt="Logo"
                className="w-32 h-32 object-cover rounded-xl border shadow-sm"
              />
            )}
            {onRemoveLogo && (previewLogo || logo) && (
              <button
                type="button"
                onClick={onRemoveLogo}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              >
                <IoTrash size={14} />
              </button>
            )}
          </div>
          <div className="flex-1">
            <label className="cursor-pointer">
              <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg hover:bg-gray-50 transition">
                <IoCloudUpload className="text-green-500" />
                <span>اختر صورة للشعار</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            </label>
            <p className="text-sm text-gray-500 mt-2">
              يفضل صورة مربعة بحجم 200×200 بكسل. الصيغ المدعومة: PNG, JPG, SVG
            </p>
          </div>
        </div>
      </div>

      {/* صورة الغلاف */}
      <div className="border rounded-xl p-4">
        <label className="block text-sm font-medium mb-2">صورة الغلاف</label>
        <div className="space-y-3">
          <div className="relative">
            {(previewCover || coverImage) && (
              <img
                src={previewCover || getImageUrl(coverImage || '')}
                alt="Cover"
                className="w-full h-48 object-cover rounded-xl border shadow-sm"
              />
            )}
            {onRemoveCover && (previewCover || coverImage) && (
              <button
                type="button"
                onClick={onRemoveCover}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
              >
                <IoTrash size={16} />
              </button>
            )}
          </div>
          <label className="cursor-pointer">
            <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg hover:bg-gray-50 transition">
              <IoCloudUpload className="text-green-500" />
              <span>اختر صورة للغلاف</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </label>
          <p className="text-sm text-gray-500">
            يفضل صورة بحجم 1200×400 بكسل للحصول على أفضل ظهور
          </p>
        </div>
      </div>

      {/* الصورة المصغرة للمتصفح (Favicon) - اختياري */}
      {onUploadFavicon && (
        <div className="border rounded-xl p-4">
          <label className="block text-sm font-medium mb-2">الصورة المصغرة (Favicon)</label>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div>
              {(previewFavicon || favicon) && (
                <img
                  src={previewFavicon || getImageUrl(favicon || '')}
                  alt="Favicon"
                  className="w-16 h-16 object-cover rounded-lg border shadow-sm"
                />
              )}
            </div>
            <div className="flex-1">
              <label className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg hover:bg-gray-50 transition">
                  <IoCloudUpload className="text-green-500" />
                  <span>اختر صورة مصغرة</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFaviconChange}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>
              </label>
              <p className="text-sm text-gray-500 mt-2">
                صورة مربعة بحجم 32×32 بكسل. الصيغ المدعومة: PNG, ICO
              </p>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-green-600">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
          <span>جاري رفع الصورة...</span>
        </div>
      )}
    </div>
  );
};

export default ImageSettingsTab;