import QRCode from 'qrcode';
import sharp from 'sharp';
import axios from 'axios';

interface QRResult {
  png: string;
  svg: string;
  url: string;
}

interface TableQRResult extends QRResult {
  tableName: string;
}

interface ItemQRResult extends QRResult {
  itemName: string;
}

interface QRWithLogoOptions {
  logoUrl?: string;
  logoSize?: number; // نسبة حجم الشعار مقارنة بحجم QR (0.2 = 20%)
  backgroundColor?: string;
  foregroundColor?: string;
}

class QRGenerator {
  
  // دالة مساعدة لجلب الصورة من URL أو مسار محلي
  private static async getImageBuffer(imageUrl: string): Promise<Buffer> {
    if (imageUrl.startsWith('http')) {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } else {
      // مسار محلي - نضبط المسار الصحيح
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.cwd(), 'uploads', imageUrl.replace(/^\/uploads\//, ''));
      return fs.readFileSync(fullPath);
    }
  }

  // دالة لإضافة شعار في منتصف QR
  private static async addLogoToQR(
    qrBuffer: Buffer,
    logoUrl: string | undefined,
    logoSize: number = 0.25 // 25% من حجم QR
  ): Promise<Buffer> {
    if (!logoUrl) return qrBuffer;

    try {
      // جلب صورة الشعار
      const logoBuffer = await this.getImageBuffer(logoUrl);
      
      // الحصول على أبعاد QR
      const qrImage = sharp(qrBuffer);
      const qrMetadata = await qrImage.metadata();
      
      // حساب حجم الشعار
      const logoWidth = Math.floor(qrMetadata.width! * logoSize);
      const logoHeight = Math.floor(qrMetadata.height! * logoSize);
      
      // تحجيم الشعار
      const resizedLogo = await sharp(logoBuffer)
        .resize(logoWidth, logoHeight, { fit: 'contain' })
        .toBuffer();
      
      // حساب موضع الشعار في المنتصف
      const left = Math.floor((qrMetadata.width! - logoWidth) / 2);
      const top = Math.floor((qrMetadata.height! - logoHeight) / 2);
      
      // دمج الشعار مع QR
      const result = await sharp(qrBuffer)
        .composite([{
          input: resizedLogo,
          left: left,
          top: top,
          blend: 'over'
        }])
        .png()
        .toBuffer();
      
      return result;
    } catch (error) {
      console.error('Error adding logo to QR:', error);
      return qrBuffer;
    }
  }

  // دالة لإضافة شعار في SVG (للمعاينة)
  private static addLogoToSVG(svgString: string, logoUrl: string | undefined, logoSize: number = 0.25): string {
    if (!logoUrl) return svgString;
    
    // نضيف تعليق أو نعدل SVG لإضافة الشعار
    // لكن الأسهل هو استخدام PNG للطباعة مع الشعار
    return svgString;
  }

  static async generateRestaurantQR(
    restaurantSlug: string,
    baseUrl: string,
    options?: QRWithLogoOptions
  ): Promise<QRResult> {
    const url = `${baseUrl}/${restaurantSlug}`;
    
    try {
      // إنشاء QR كـ PNG Buffer
      const qrBuffer = await QRCode.toBuffer(url, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
          dark: options?.foregroundColor || '#000000',
          light: options?.backgroundColor || '#ffffff'
        }
      });
      
      // إضافة الشعار إذا وجد
      const qrWithLogo = await this.addLogoToQR(
        qrBuffer, 
        options?.logoUrl, 
        options?.logoSize || 0.25
      );
      
      // إنشاء SVG بدون شعار (لأن SVG مع الشعار معقد)
      const svgString = await QRCode.toString(url, {
        type: 'svg',
        width: 400,
        margin: 2,
        color: {
          dark: options?.foregroundColor || '#000000',
          light: options?.backgroundColor || '#ffffff'
        }
      });
      
      return {
        png: qrWithLogo.toString('base64'),
        svg: svgString,
        url: url
      };
    } catch (error) {
      console.error('خطأ في إنشاء QR:', error);
      throw error;
    }
  }

  static async generateTableQR(
    restaurantSlug: string,
    tableId: string,
    tableName: string,
    baseUrl: string,
    options?: QRWithLogoOptions
  ): Promise<TableQRResult> {
    const url = `${baseUrl}/${restaurantSlug}/table/${tableId}`;
    
    try {
      const qrBuffer = await QRCode.toBuffer(url, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
          dark: options?.foregroundColor || '#000000',
          light: options?.backgroundColor || '#ffffff'
        }
      });
      
      const qrWithLogo = await this.addLogoToQR(
        qrBuffer, 
        options?.logoUrl, 
        options?.logoSize || 0.25
      );
      
      const svgString = await QRCode.toString(url, {
        type: 'svg',
        width: 400,
        margin: 2
      });
      
      return {
        png: qrWithLogo.toString('base64'),
        svg: svgString,
        url: url,
        tableName: tableName
      };
    } catch (error) {
      console.error('خطأ في إنشاء QR للطاولة:', error);
      throw error;
    }
  }

  static async generateItemQR(
    restaurantSlug: string,
    itemId: string,
    itemName: string,
    baseUrl: string,
    options?: QRWithLogoOptions
  ): Promise<ItemQRResult> {
    const url = `${baseUrl}/${restaurantSlug}/item/${itemId}`;
    
    try {
      const qrBuffer = await QRCode.toBuffer(url, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
          dark: options?.foregroundColor || '#000000',
          light: options?.backgroundColor || '#ffffff'
        }
      });
      
      const qrWithLogo = await this.addLogoToQR(
        qrBuffer, 
        options?.logoUrl, 
        options?.logoSize || 0.25
      );
      
      const svgString = await QRCode.toString(url, {
        type: 'svg',
        width: 400,
        margin: 2
      });
      
      return {
        png: qrWithLogo.toString('base64'),
        svg: svgString,
        url: url,
        itemName: itemName
      };
    } catch (error) {
      console.error('خطأ في إنشاء QR للمنتج:', error);
      throw error;
    }
  }

  static async generateItemQRWithToken(
    restaurantSlug: string,
    shareToken: string,
    itemName: string,
    baseUrl: string,
    options?: QRWithLogoOptions
  ): Promise<ItemQRResult> {
    const url = `${baseUrl}/${restaurantSlug}/item/${shareToken}`;
    
    try {
      const qrBuffer = await QRCode.toBuffer(url, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
          dark: options?.foregroundColor || '#000000',
          light: options?.backgroundColor || '#ffffff'
        }
      });
      
      const qrWithLogo = await this.addLogoToQR(
        qrBuffer, 
        options?.logoUrl, 
        options?.logoSize || 0.25
      );
      
      const svgString = await QRCode.toString(url, {
        type: 'svg',
        width: 400,
        margin: 2
      });
      
      return {
        png: qrWithLogo.toString('base64'),
        svg: svgString,
        url: url,
        itemName: itemName
      };
    } catch (error) {
      console.error('خطأ في إنشاء QR للمنتج:', error);
      throw error;
    }
  }
}

export default QRGenerator;