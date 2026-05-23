// backend/src/controllers/tableController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import QRGenerator from '../utils/qrGenerator';

// ==================== دوال مساعدة ====================

const getRestaurantId = async (req: AuthRequest): Promise<string | null> => {
  // إذا كان سوبر ادمن
  if (req.user?.role === 'super_admin') {
    // يمكنه تحديد restaurantId من query أو body
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    
    if (targetRestaurantId) {
      return targetRestaurantId;
    }
    
    // إذا لم يحدد، جلب أول مطعم في قاعدة البيانات
    const restaurants = await prisma.restaurant.findMany({ take: 1 });
    if (restaurants.length > 0) {
      return restaurants[0].id;
    }
    
    return null;
  }
  
  // للمالك والموظفين
  return req.user?.restaurantId || null;
};

// ==================== جلب جميع الطاولات ====================

export const getTables = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const tables = await prisma.table.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' }
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

// ==================== جلب طاولة محددة ====================

export const getTable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // إذا كان المستخدم غير مسجل (زيارة عامة)، نسمح بالوصول بدون مصادقة
    if (!req.user) {
      const table = await prisma.table.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          nameEn: true,
          seats: true,
          restaurantId: true,
          isActive: true
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

    const table = await prisma.table.findFirst({
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

// ==================== إنشاء طاولة جديدة ====================

export const createTable = async (req: AuthRequest, res: Response): Promise<void> => {
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

    if (!name) {
      res.status(400).json({ 
        success: false,
        error: 'اسم الطاولة مطلوب' 
      });
      return;
    }

    const table = await prisma.table.create({
      data: {
        restaurantId,
        name,
        nameEn: nameEn || null,
        seats: seats || 2,
        notes: notes || null,
        isActive: true
      }
    });

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

// ==================== تحديث طاولة ====================

export const updateTable = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const table = await prisma.table.findFirst({
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

    const updatedTable = await prisma.table.update({
      where: { id },
      data: {
        name: name !== undefined ? name : table.name,
        nameEn: nameEn !== undefined ? nameEn : table.nameEn,
        seats: seats !== undefined ? seats : table.seats,
        notes: notes !== undefined ? notes : table.notes,
        isActive: isActive !== undefined ? isActive : table.isActive
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث الطاولة بنجاح',
      data: updatedTable
    });
  } catch (error) {
    console.error('خطأ في تحديث الطاولة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث الطاولة' 
    });
  }
};

// ==================== حذف طاولة ====================

export const deleteTable = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const table = await prisma.table.findFirst({
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

    await prisma.table.delete({
      where: { id }
    });

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

// ==================== إنشاء رمز QR لطاولة ====================

export const generateTableQR = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const table = await prisma.table.findFirst({
      where: { 
        id,
        restaurantId 
      }
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

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

    await prisma.table.update({
      where: { id },
      data: {
        qrCode: qrData.png,
        qrSvg: qrData.svg
      }
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

// ==================== إنشاء رموز QR لجميع الطاولات ====================

export const generateAllTableQRs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) {
      res.status(404).json({ 
        success: false,
        error: 'المطعم غير موجود' 
      });
      return;
    }

    const tables = await prisma.table.findMany({
      where: { restaurantId }
    });

    if (tables.length === 0) {
      res.status(404).json({ 
        success: false,
        error: 'لا توجد طاولات في هذا المطعم' 
      });
      return;
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const results = [];

    for (const table of tables) {
      const qrData = await QRGenerator.generateTableQR(
        restaurant.slug,
        table.id,
        table.name,
        baseUrl
      );

      await prisma.table.update({
        where: { id: table.id },
        data: {
          qrCode: qrData.png,
          qrSvg: qrData.svg
        }
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

// ==================== تنزيل رمز QR للطاولة ====================

export const downloadTableQR = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const { format = 'png' } = req.query;

    const table = await prisma.table.findFirst({
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

    let qrData: string;
    let contentType: string;
    let filename: string;

    if (format === 'svg' && table.qrSvg) {
      qrData = table.qrSvg;
      contentType = 'image/svg+xml';
      filename = `table-${table.name}-qr.svg`;
    } else if (table.qrCode) {
      // إزالة prefix base64 إذا كان موجوداً
      let base64Data = table.qrCode;
      if (base64Data.includes('base64,')) {
        base64Data = base64Data.split('base64,')[1];
      }
      qrData = base64Data;
      contentType = 'image/png';
      filename = `table-${table.name}-qr.png`;
    } else {
      res.status(404).json({ 
        success: false,
        error: 'رمز QR غير موجود، يرجى إنشائه أولاً' 
      });
      return;
    }

    const buffer = Buffer.from(qrData, 'base64');
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('خطأ في تنزيل رمز QR:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تنزيل رمز QR' 
    });
  }
};

// ==================== تحديث حالة الطاولة (تفعيل/تعطيل) ====================

export const toggleTableStatus = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const table = await prisma.table.findFirst({
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

    const updatedTable = await prisma.table.update({
      where: { id },
      data: { isActive: !table.isActive }
    });

    res.json({
      success: true,
      message: updatedTable.isActive ? 'تم تفعيل الطاولة' : 'تم تعطيل الطاولة',
      data: updatedTable
    });
  } catch (error) {
    console.error('خطأ في تغيير حالة الطاولة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تغيير حالة الطاولة' 
    });
  }
};

// ==================== الحصول على إحصائيات الطاولات ====================

export const getTableStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const [totalTables, activeTables, inactiveTables, totalSeats] = await Promise.all([
      prisma.table.count({ where: { restaurantId } }),
      prisma.table.count({ where: { restaurantId, isActive: true } }),
      prisma.table.count({ where: { restaurantId, isActive: false } }),
      prisma.table.aggregate({
        where: { restaurantId },
        _sum: { seats: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalTables,
        active: activeTables,
        inactive: inactiveTables,
        totalSeats: totalSeats._sum.seats || 0,
        averageSeats: totalTables > 0 ? (totalSeats._sum.seats || 0) / totalTables : 0
      }
    });
  } catch (error) {
    console.error('خطأ في جلب إحصائيات الطاولات:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب الإحصائيات' 
    });
  }
};

// ==================== الحصول على الطاولات النشطة ====================

export const getActiveTables = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const tables = await prisma.table.findMany({
      where: { 
        restaurantId,
        isActive: true 
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    console.error('خطأ في جلب الطاولات النشطة:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

// ==================== الحصول على طاولة برقم محدد ====================

export const getTableByName = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { name } = req.params;

    const table = await prisma.table.findFirst({
      where: { 
        restaurantId,
        name: name 
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
    console.error('خطأ في جلب الطاولة بالاسم:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في جلب البيانات' 
    });
  }
};

// ==================== تحديث ترتيب الطاولات (Batch Update) ====================

export const updateTablesOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurantId = await getRestaurantId(req);
    
    if (!restaurantId) {
      res.status(400).json({ 
        success: false,
        error: 'معرف المطعم غير موجود' 
      });
      return;
    }

    const { tables } = req.body;

    if (!tables || !Array.isArray(tables)) {
      res.status(400).json({ 
        success: false,
        error: 'بيانات غير صالحة' 
      });
      return;
    }

    // تحديث كل طاولة على حدة
    const updates = tables.map(async (item: { id: string; sortOrder?: number }) => {
      if (!item.id) return null;
      
      return prisma.table.update({
        where: { id: item.id },
        data: {
          sortOrder: item.sortOrder || 0
        }
      });
    });

    await Promise.all(updates.filter(Boolean));

    res.json({
      success: true,
      message: 'تم تحديث ترتيب الطاولات بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تحديث ترتيب الطاولات:', error);
    res.status(500).json({ 
      success: false,
      error: 'حدث خطأ في تحديث الترتيب' 
    });
  }
};