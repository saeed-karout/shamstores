// backend/src/utils/qrGenerator.ts

import QRCode from 'qrcode.react';
import sharp from 'sharp';


interface QROptions {
  logoUrl?: string;
  logoSize?: number;
  backgroundColor?: string;
  foregroundColor?: string;
  margin?: number;
}

class QRGenerator {
  private static qrCache: Map<string, { png: string; svg: string }> = new Map();

  static async generateQR(
    url: string,
    options: QROptions = {}
  ): Promise<{ png: string; svg: string }> {
    const cacheKey = `${url}-${options.backgroundColor}-${options.foregroundColor}-${options.logoUrl}`;
    
    if (this.qrCache.has(cacheKey)) {
      return this.qrCache.get(cacheKey)!;
    }

    const qrOptions: QRCode.QRCodeToBufferOptions = {
      width: 400,
      margin: options.margin || 2,
      color: {
        dark: options.foregroundColor || '#000000',
        light: options.backgroundColor || '#FFFFFF'
      }
    };

    // توليد PNG
    let pngBuffer = await QRCode.toBuffe(url, qrOptions);
    
    // إضافة الشعار إذا وجد
    if (options.logoUrl) {
      try {
        const logoBuffer = await this.loadLogo(options.logoUrl);
        const qrImage = sharp(pngBuffer);
        const qrMetadata = await qrImage.metadata();
        
        const logoSize = Math.min(qrMetadata.width || 400, 400) * (options.logoSize || 0.25);
        const logoPosition = ((qrMetadata.width || 400) - logoSize) / 2;
        
        pngBuffer = await qrImage
          .composite([
            {
              input: await sharp(logoBuffer)
                .resize(logoSize, logoSize)
                .toBuffer(),
              top: Math.round(logoPosition),
              left: Math.round(logoPosition)
            }
          ])
          .png()
          .toBuffer();
      } catch (error) {
        console.error('Error adding logo to QR:', error);
      }
    }

    // توليد SVG
    const svgString = await QRCode.toString(url, { type: 'svg', ...qrOptions });

    const result = {
      png: pngBuffer.toString('base64'),
      svg: svgString
    };

    this.qrCache.set(cacheKey, result);
    
    // تنظيف الكاش بعد 10 دقائق
    setTimeout(() => {
      this.qrCache.delete(cacheKey);
    }, 10 * 60 * 1000);

    return result;
  }

  private static async loadLogo(logoUrl: string): Promise<Buffer> {
    // إذا كان المسار يبدأ بـ /uploads/ أو uploads/
    let cleanPath = logoUrl;
    if (cleanPath.startsWith('/uploads/')) {
      cleanPath = cleanPath.substring(9);
    }
    if (cleanPath.startsWith('uploads/')) {
      cleanPath = cleanPath.substring(8);
    }
    
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.join(process.cwd(), 'uploads', cleanPath);
    
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath);
    }
    
    throw new Error(`Logo not found: ${fullPath}`);
  }

  // ==================== دوال المطعم ====================

  static async generateRestaurantQR(
    slug: string,
    frontendUrl: string,
    options: QROptions = {}
  ): Promise<{ png: string; svg: string }> {
    const url = `${frontendUrl}/${slug}`;
    return this.generateQR(url, options);
  }

  static async generateTableQR(
    slug: string,
    tableId: string,
    tableName: string,
    frontendUrl: string,
    options: QROptions = {}
  ): Promise<{ png: string; svg: string }> {
    const url = `${frontendUrl}/${slug}/table/${tableId}`;
    return this.generateQR(url, options);
  }

  static async generateItemQR(
    slug: string,
    itemId: string,
    itemName: string,
    frontendUrl: string,
    options: QROptions = {}
  ): Promise<{ png: string; svg: string }> {
    const url = `${frontendUrl}/${slug}/item/${itemId}`;
    return this.generateQR(url, options);
  }

  static async generateItemQRWithToken(
    slug: string,
    token: string,
    itemName: string,
    frontendUrl: string,
    options: QROptions = {}
  ): Promise<{ png: string; svg: string }> {
    const url = `${frontendUrl}/${slug}/item/${token}`;
    return this.generateQR(url, options);
  }

  // ==================== دوال المتجر ====================

  static async generateStoreQR(
    slug: string,
    storeName: string,
    frontendUrl: string,
    options: QROptions = {}
  ): Promise<{ png: string; svg: string }> {
    const url = `${frontendUrl}/${slug}`;
    return this.generateQR(url, options);
  }

  static async generateProductQR(
    slug: string,
    productId: string,
    productName: string,
    frontendUrl: string,
    options: QROptions = {}
  ): Promise<{ png: string; svg: string }> {
    const url = `${frontendUrl}/${slug}/product/${productId}`;
    return this.generateQR(url, options);
  }

  // ==================== دوال الأدمن ====================

  static async generateAdminRestaurantQR(
    restaurantId: string,
    slug: string,
    frontendUrl: string,
    options: QROptions = {}
  ): Promise<{ png: string; svg: string }> {
    const url = `${frontendUrl}/${slug}`;
    return this.generateQR(url, options);
  }

  static async generateAdminStoreQR(
    storeId: string,
    slug: string,
    storeName: string,
    frontendUrl: string,
    options: QROptions = {}
  ): Promise<{ png: string; svg: string }> {
    const url = `${frontendUrl}/${slug}`;
    return this.generateQR(url, options);
  }

  // ==================== دوال مساعدة ====================

  static clearCache(): void {
    this.qrCache.clear();
  }

  static async generateBulkQR(
    items: Array<{ type: string; id: string; name: string; slug: string; }>,
    frontendUrl: string
  ): Promise<Array<{ id: string; name: string; png: string; svg: string; url: string }>> {
    const results = [];
    
    for (const item of items) {
      let url = '';
      if (item.type === 'table') {
        url = `${frontendUrl}/${item.slug}/table/${item.id}`;
      } else if (item.type === 'item') {
        url = `${frontendUrl}/${item.slug}/item/${item.id}`;
      } else if (item.type === 'product') {
        url = `${frontendUrl}/${item.slug}/product/${item.id}`;
      } else {
        url = `${frontendUrl}/${item.slug}`;
      }
      
      const qrData = await this.generateQR(url);
      results.push({
        id: item.id,
        name: item.name,
        png: qrData.png,
        svg: qrData.svg,
        url: url
      });
    }
    
    return results;
  }
}

export default QRGenerator;