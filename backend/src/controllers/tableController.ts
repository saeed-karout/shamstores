import { Response } from 'express';
import { AuthRequest } from '../types';
import Table from '../models/Table';
import Restaurant from '../models/Restaurant';
import QRGenerator from '../utils/qrGenerator';
import { Op } from 'sequelize';

// دالة مساعدة للحصول على restaurantId
const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  // إذا كان سوبر ادمن
  if (req.user?.role === 'super_admin') {
    // يمكنه تحديد restaurantId من query أو body
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    
    if (targetRestaurantId) {
      return targetRestaurantId;
    }
    
    // إذا لم يحدد، جلب أول مطعم في قاعدة البيانات
    const restaurants = await Restaurant.findAll({ limit: 1 });
    if (restaurants.length > 0) {
      return restaurants[0].id;
    }
    
    return null;
  }
  
  // للمالك والموظفين
  return req.user?.restaurantId || null;
};

// دالة مساعدة للحصول على Restaurant (لـ super_admin)
const getRestaurant = async (req: AuthRequest): Promise<Restaurant | null> => {
  const restaurantId = await getRestaurantId(req);
  if (!restaurantId) return null;
  return await Restaurant.findByPk(restaurantId);
};

export const getTables = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const tables = await Table.findAll({
      where: { restaurantId },
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    console.error('خطأ في جلب الطاولات:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

export const createTable = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { name, nameEn, seats, notes } = req.body;

    const table = await Table.create({
      restaurantId,
      name,
      nameEn,
      seats: seats || 2,
      notes
    } as any);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطاولة بنجاح',
      data: table
    });
  } catch (error) {
    console.error('خطأ في إنشاء الطاولة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء الطاولة' 
    });
  }
};

export const updateTable = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { id } = req.params;
    const { name, nameEn, seats, notes, isActive } = req.body;

    const table = await Table.findOne({
      where: { 
        id,
        restaurantId 
      }
    });

    if (!table) {
      res.status(404).json({ 
        success: false,
        error: 'الطاولة غير موجودة' 
      });
      return;
    }

    await table.update({
      name: name || table.name,
      nameEn: nameEn !== undefined ? nameEn : table.nameEn,
      seats: seats !== undefined ? seats : table.seats,
      notes: notes !== undefined ? notes : table.notes,
      isActive: isActive !== undefined ? isActive : table.isActive
    });

    res.json({
      success: true,
      message: 'تم تحديث الطاولة بنجاح',
      data: table
    });
  } catch (error) {
    console.error('خطأ في تحديث الطاولة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث الطاولة' 
    });
  }
};

export const deleteTable = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { id } = req.params;

    const table = await Table.findOne({
      where: { 
        id,
        restaurantId 
      }
    });

    if (!table) {
      res.status(404).json({ 
        success: false,
        error: 'الطاولة غير موجودة' 
      });
      return;
    }

    await table.destroy();

    res.json({
      success: true,
      message: 'تم حذف الطاولة بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف الطاولة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في حذف الطاولة' 
    });
  }
};

export const generateTableQR = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { id } = req.params;

    const table = await Table.findOne({
      where: { 
        id,
        restaurantId 
      }
    });

    const restaurant = await Restaurant.findByPk(restaurantId);

    if (!table) {
      res.status(404).json({ 
        success: false,
        error: 'الطاولة غير موجودة' 
      });
      return;
    }

    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

    const qrData = await QRGenerator.generateTableQR(
      restaurant.slug,
      table.id,
      table.name,
      baseUrl
    );

    await table.update({
      qrCode: qrData.png,
      qrSvg: qrData.svg
    });

    res.json({
      success: true,
      data: qrData
    });
  } catch (error) {
    console.error('خطأ في إنشاء QR:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء رمز QR' 
    });
  }
};

export const generateAllTableQRs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const restaurant = await Restaurant.findByPk(restaurantId);

    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }

    const tables = await Table.findAll({
      where: { restaurantId }
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const results = [];

    for (const table of tables) {
      const qrData = await QRGenerator.generateTableQR(
        restaurant.slug,
        table.id,
        table.name,
        baseUrl
      );

      await table.update({
        qrCode: qrData.png,
        qrSvg: qrData.svg
      });

      // إزالة خاصية tableName من qrData إذا كانت موجودة
      const { tableName, ...qrDataWithoutTableName } = qrData as any;
      
      results.push({
        tableId: table.id,
        tableName: table.name,
        ...qrDataWithoutTableName
      });
    }

    res.json({
      success: true,
      data: results,
      message: `تم إنشاء ${results.length} رمز QR بنجاح`
    });
  } catch (error) {
    console.error('خطأ في إنشاء رموز QR:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في إنشاء رموز QR' 
    });
  }
};

export const getTable = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // إذا كان المستخدم غير مسجل (زيارة عامة)، نسمح بالوصول بدون مصادقة
    if (!req.user) {
      const table = await Table.findByPk(id, {
        attributes: ['id', 'name', 'restaurantId']
      });

      if (!table) {
        res.status(404).json({ 
          success: false,
          error: 'الطاولة غير موجودة' 
        });
        return;
      }

      res.json({
        success: true,
        data: table
      });
      return;
    }

    // إذا كان المستخدم مسجل، نتحقق من الصلاحية
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const table = await Table.findOne({
      where: { 
        id,
        restaurantId 
      }
    });

    if (!table) {
      res.status(404).json({ 
        success: false,
        error: 'الطاولة غير موجودة' 
      });
      return;
    }

    res.json({
      success: true,
      data: table
    });
  } catch (error) {
    console.error('خطأ في جلب الطاولة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};