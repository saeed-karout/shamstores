// backend/src/controllers/qrController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import QRCode from 'qrcode';
import Restaurant from '../models/Restaurant';
import Store from '../models/Store';
import Table from '../models/Table';
import MenuItem from '../models/MenuItem';
import Product from '../models/Product';
import { Op } from 'sequelize';

// دالة مساعدة للحصول على restaurantId
const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    if (targetRestaurantId) return targetRestaurantId;
    const restaurants = await Restaurant.findAll({ limit: 1 });
    return restaurants.length > 0 ? restaurants[0].id : null;
  }
  return req.user?.restaurantId || null;
};

// دالة مساعدة للحصول على storeId
const getStoreId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetStoreId = req.query.storeId as string || req.body.storeId;
    if (targetStoreId) return targetStoreId;
    const stores = await Store.findAll({ limit: 1 });
    return stores.length > 0 ? stores[0].id : null;
  }
  return req.user?.storeId || null;
};

// دالة مساعدة لتوليد QR
const generateQRData = async (url: string): Promise<{ png: string; svg: string }> => {
  // توليد PNG
  const pngBuffer = await QRCode.toBuffer(url, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  
  // توليد SVG
  const svgString = await QRCode.toString(url, {
    type: 'svg',
    width: 400,
    margin: 2
  });
  
  return {
    png: pngBuffer.toString('base64'),
    svg: svgString
  };
};

// ==================== دوال المطعم ====================

export const generateRestaurantQR = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    let restaurant: Restaurant | null = null;
    
    if (req.user?.role === 'super_admin') {
      const { restaurantId } = req.body;
      if (restaurantId) {
        restaurant = await Restaurant.findByPk(restaurantId);
      } else {
        const restaurants = await Restaurant.findAll({ limit: 1 });
        restaurant = restaurants.length > 0 ? restaurants[0] : null;
      }
    } else {
      const restaurantId = await getRestaurantId(req);
      if (restaurantId) {
        restaurant = await Restaurant.findByPk(restaurantId);
      }
    }
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = `${frontendUrl}/${restaurant.slug}`;
    const qrData = await generateQRData(url);

    res.json({
      success: true,
      data: {
        png: qrData.png,
        svg: qrData.svg,
        url: url
      }
    });
  } catch (error) {
    console.error('خطأ في إنشاء QR:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء رمز QR' });
  }
};

export const generateTableQR = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    const { tableId } = req.params;
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const table = await Table.findOne({
      where: { id: tableId, restaurantId },
      include: [{ model: Restaurant, as: 'restaurant' }]
    });

    if (!table) {
      res.status(404).json({ success: false, error: 'الطاولة غير موجودة' });
      return;
    }

    const restaurant = (table as any).restaurant;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = `${frontendUrl}/${restaurant.slug}/table/${table.id}`;
    const qrData = await generateQRData(url);

    res.json({
      success: true,
      data: {
        png: qrData.png,
        svg: qrData.svg,
        url: url
      }
    });
  } catch (error) {
    console.error('خطأ في إنشاء QR للطاولة:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء رمز QR' });
  }
};

export const generateItemQR = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    const { itemId } = req.params;
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const item = await MenuItem.findOne({ where: { id: itemId, restaurantId } });
    const restaurant = await Restaurant.findByPk(restaurantId);

    if (!item || !restaurant) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const token = item.shareToken || item.id;
    const url = `${frontendUrl}/${restaurant.slug}/item/${token}`;
    const qrData = await generateQRData(url);

    res.json({
      success: true,
      data: {
        png: qrData.png,
        svg: qrData.svg,
        url: url
      }
    });
  } catch (error) {
    console.error('خطأ في إنشاء QR للعنصر:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء رمز QR' });
  }
};

// ==================== دوال المتجر ====================

export const generateStoreQR = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    let store: Store | null = null;
    
    if (req.user?.role === 'super_admin') {
      const { storeId } = req.body;
      if (storeId) {
        store = await Store.findByPk(storeId);
      } else {
        const stores = await Store.findAll({ limit: 1 });
        store = stores.length > 0 ? stores[0] : null;
      }
    } else {
      const storeId = await getStoreId(req);
      if (storeId) {
        store = await Store.findByPk(storeId);
      }
    }
    
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = `${frontendUrl}/${store.slug}`;
    const qrData = await generateQRData(url);

    res.json({
      success: true,
      data: {
        png: qrData.png,
        svg: qrData.svg,
        url: url
      }
    });
  } catch (error) {
    console.error('خطأ في إنشاء QR للمتجر:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء رمز QR' });
  }
};

export const generateStoreProductQR = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const storeId = await getStoreId(req);
    const { productId } = req.params;
    
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    const product = await Product.findOne({ where: { id: productId, storeId } });
    const store = await Store.findByPk(storeId);

    if (!product || !store) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = `${frontendUrl}/${store.slug}/product/${product.id}`;
    const qrData = await generateQRData(url);

    res.json({
      success: true,
      data: {
        png: qrData.png,
        svg: qrData.svg,
        url: url
      }
    });
  } catch (error) {
    console.error('خطأ في إنشاء QR للمنتج:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء رمز QR' });
  }
};

// ==================== دوال السوبر أدمن ====================

export const generateAdminRestaurantQR = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = `${frontendUrl}/${restaurant.slug}`;
    const qrData = await generateQRData(url);

    res.json({
      success: true,
      data: {
        png: qrData.png,
        svg: qrData.svg,
        url: url
      }
    });
  } catch (error) {
    console.error('خطأ في إنشاء QR للمطعم:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء رمز QR' });
  }
};

export const generateAdminStoreQR = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { storeId } = req.params;
    
    const store = await Store.findByPk(storeId);
    if (!store) {
      res.status(404).json({ success: false, error: 'المتجر غير موجود' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = `${frontendUrl}/${store.slug}`;
    const qrData = await generateQRData(url);

    res.json({
      success: true,
      data: {
        png: qrData.png,
        svg: qrData.svg,
        url: url
      }
    });
  } catch (error) {
    console.error('خطأ في إنشاء QR للمتجر:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء رمز QR' });
  }
};

export const generateAllTablesQR = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    const tables = await Table.findAll({ where: { restaurantId } });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const results = [];

    for (const table of tables) {
      const url = `${frontendUrl}/${restaurant.slug}/table/${table.id}`;
      const qrData = await generateQRData(url);
      results.push({
        tableId: table.id,
        tableName: table.name,
        png: qrData.png,
        svg: qrData.svg,
        url: url
      });
    }

    res.json({
      success: true,
      data: results,
      message: `تم إنشاء ${results.length} رمز QR بنجاح`
    });
  } catch (error) {
    console.error('خطأ في إنشاء رموز QR:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء رموز QR' });
  }
};