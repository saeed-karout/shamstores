// backend/src/controllers/qrController.ts
import { Response } from 'express';
import { AuthRequest } from '../types';
import QRCode from 'qrcode';
import prisma from '../services/prisma';

// دالة مساعدة للحصول على restaurantId
const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    if (targetRestaurantId) return targetRestaurantId;
    const restaurants = await prisma.restaurant.findMany({ take: 1 });
    return restaurants.length > 0 ? restaurants[0].id : null;
  }
  return req.user?.restaurantId || null;
};

// دالة مساعدة للحصول على storeId
const getStoreId = async (req: AuthRequest): Promise<string | null> => {
  if (req.user?.role === 'super_admin') {
    const targetStoreId = req.query.storeId as string || req.body.storeId;
    if (targetStoreId) return targetStoreId;
    const stores = await prisma.store.findMany({ take: 1 });
    return stores.length > 0 ? stores[0].id : null;
  }
  return req.user?.storeId || null;
};

// دالة مساعدة لتوليد QR
const generateQRData = async (url: string): Promise<{ png: string; svg: string }> => {
  const pngBuffer = await QRCode.toBuffer(url, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  
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
    let restaurant = null;
    
    if (req.user?.role === 'super_admin') {
      const { restaurantId } = req.body;
      if (restaurantId) {
        restaurant = await prisma.restaurant.findUnique({
          where: { id: restaurantId }
        });
      } else {
        const restaurants = await prisma.restaurant.findMany({ take: 1 });
        restaurant = restaurants.length > 0 ? restaurants[0] : null;
      }
    } else {
      const restaurantId = await getRestaurantId(req);
      if (restaurantId) {
        restaurant = await prisma.restaurant.findUnique({
          where: { id: restaurantId }
        });
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

    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurantId }
    });

    if (!table) {
      res.status(404).json({ success: false, error: 'الطاولة غير موجودة' });
      return;
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

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

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId }
    });
    
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!item || !restaurant) {
      res.status(404).json({ success: false, error: 'العنصر غير موجود' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = `${frontendUrl}/${restaurant.slug}/item/${item.id}`;
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
    let store = null;
    
    if (req.user?.role === 'super_admin') {
      const { storeId } = req.body;
      if (storeId) {
        store = await prisma.store.findUnique({
          where: { id: storeId }
        });
      } else {
        const stores = await prisma.store.findMany({ take: 1 });
        store = stores.length > 0 ? stores[0] : null;
      }
    } else {
      const storeId = await getStoreId(req);
      if (storeId) {
        store = await prisma.store.findUnique({
          where: { id: storeId }
        });
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

    const product = await prisma.product.findFirst({
      where: { id: productId, storeId }
    });
    
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });

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
    
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });
    
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
    
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });
    
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

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, error: 'المطعم غير موجود' });
      return;
    }

    const tables = await prisma.table.findMany({ where: { restaurantId } });
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

// ==================== إحصائيات للمطاعم والمتاجر ====================

export const getRestaurantStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { restaurantId } = req.params;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const [menuItemsCount, ordersCount, todayOrders, weekOrders, monthOrders] = await Promise.all([
      prisma.menuItem.count({ where: { restaurantId } }),
      prisma.order.count({ where: { restaurantId } }),
      prisma.order.count({ where: { restaurantId, createdAt: { gte: today } } }),
      prisma.order.count({ where: { restaurantId, createdAt: { gte: weekAgo } } }),
      prisma.order.count({ where: { restaurantId, createdAt: { gte: monthAgo } } })
    ]);
    
    res.json({
      success: true,
      data: {
        menuItemsCount,
        ordersCount,
        todayOrders,
        weekOrders,
        monthOrders
      }
    });
  } catch (error) {
    console.error('Error getting restaurant stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإحصائيات' });
  }
};

export const getStoreStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { storeId } = req.params;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const [productsCount, ordersCount, todayOrders, weekOrders, monthOrders] = await Promise.all([
      prisma.product.count({ where: { storeId } }),
      prisma.order.count({ where: { storeId } }),
      prisma.order.count({ where: { storeId, createdAt: { gte: today } } }),
      prisma.order.count({ where: { storeId, createdAt: { gte: weekAgo } } }),
      prisma.order.count({ where: { storeId, createdAt: { gte: monthAgo } } })
    ]);
    
    res.json({
      success: true,
      data: {
        productsCount,
        ordersCount,
        todayOrders,
        weekOrders,
        monthOrders
      }
    });
  } catch (error) {
    console.error('Error getting store stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإحصائيات' });
  }
};