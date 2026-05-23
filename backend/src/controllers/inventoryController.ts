// backend/src/controllers/inventoryController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../server';

// ==================== الأنواع والواجهات ====================

interface InventoryMovement {
  productId: string;
  quantity: number;
  type: 'stock_in' | 'stock_out' | 'adjustment' | 'return';
  reason?: string;
  referenceId?: string;
  referenceType?: 'order' | 'purchase' | 'return' | 'adjustment';
}

interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStockLevel: number;
}

interface StockReport {
  productId: string;
  name: string;
  sku: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStockLevel: number;
  maxStockLevel: number | null;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
}

// ==================== دوال مساعدة ====================

const getBusinessContext = async (req: AuthRequest): Promise<{ storeId: string } | null> => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) return null;

  if (userRole === 'super_admin') {
    const storeId = req.query.storeId as string || req.body.storeId;
    if (storeId) return { storeId };
    
    const firstStore = await prisma.store.findFirst();
    if (firstStore) return { storeId: firstStore.id };
    return null;
  }

  if (userRole === 'owner') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storeId: true }
    });
    if (user?.storeId) return { storeId: user.storeId };
    return null;
  }

  if (userRole === 'staff') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storeId: true, permissions: true }
    });
    if (user?.storeId && (user.permissions as any)?.inventory?.manage) {
      return { storeId: user.storeId };
    }
    return null;
  }

  return null;
};

const checkInventoryPermission = (userRole: string, permissions: any, action: 'view' | 'manage'): boolean => {
  if (userRole === 'super_admin' || userRole === 'owner') return true;
  if (userRole === 'staff') {
    return permissions?.inventory?.[action] === true;
  }
  return false;
};

const calculateStockStatus = (
  currentStock: number,
  minStockLevel: number,
  maxStockLevel: number | null
): 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock' => {
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= minStockLevel) return 'low_stock';
  if (maxStockLevel && currentStock >= maxStockLevel) return 'overstock';
  return 'in_stock';
};

// ==================== جرد المخزون الأساسي ====================

export const getInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح بالوصول إلى المخزون' });
      return;
    }

    const { storeId } = context;
    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'view')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية عرض المخزون' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const categoryId = req.query.categoryId as string;
    const sortBy = req.query.sortBy as string || 'name';
    const sortOrder = req.query.sortOrder as string || 'asc';

    const skip = (page - 1) * limit;

    const where: any = { storeId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc'
      },
      skip,
      take: limit
    });

    const inventoryStats = products.map(product => {
      const currentStock = product.stock || 0;
      const minStockLevel = product.minStockLevel || 5;
      const maxStockLevel = product.maxStockLevel || null;
      const reservedStock = product.reservedStock || 0;
      
      return {
        ...product,
        currentStock,
        reservedStock,
        availableStock: currentStock - reservedStock,
        minStockLevel,
        maxStockLevel,
        status: calculateStockStatus(currentStock, minStockLevel, maxStockLevel)
      };
    });

    let filteredProducts = inventoryStats;
    if (status) {
      filteredProducts = inventoryStats.filter(p => p.status === status);
    }

    const total = filteredProducts.length;

    const summary = {
      totalProducts: products.length,
      totalStock: products.reduce((sum, p) => sum + (p.stock || 0), 0),
      lowStockCount: inventoryStats.filter(p => p.status === 'low_stock').length,
      outOfStockCount: inventoryStats.filter(p => p.status === 'out_of_stock').length,
      totalValue: products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0)
    };

    res.json({
      success: true,
      data: {
        products: filteredProducts.slice(skip, skip + limit),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary
      }
    });
  } catch (error) {
    console.error('Error getting inventory:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المخزون' });
  }
};

// ==================== إدارة المنتجات ====================

export const addProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'manage')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية إدارة المخزون' });
      return;
    }

    const {
      name,
      nameEn,
      sku,
      description,
      price,
      cost,
      stock = 0,
      minStockLevel = 5,
      maxStockLevel,
      categoryId,
      imageUrl,
      unit = 'piece'
    } = req.body;

    if (!name || !sku) {
      res.status(400).json({ success: false, error: 'اسم المنتج و SKU مطلوبان' });
      return;
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        storeId: context.storeId,
        sku
      }
    });

    if (existingProduct) {
      res.status(400).json({ success: false, error: 'المنتج موجود مسبقاً' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        storeId: context.storeId,
        name,
        nameEn: nameEn || null,
        sku,
        description: description || null,
        price: price || 0,
        cost: cost || 0,
        stock,
        reservedStock: 0,
        minStockLevel,
        maxStockLevel: maxStockLevel || null,
        categoryId: categoryId || null,
        imageUrl: imageUrl || null,
        unit,
        isAvailable: stock > 0
      },
      include: {
        category: {
          select: { id: true, name: true }
        }
      }
    });

    if (stock > 0) {
      await createInventoryMovement({
        productId: product.id,
        quantity: stock,
        type: 'stock_in',
        reason: 'إضافة منتج جديد',
        referenceType: 'adjustment'
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم إضافة المنتج بنجاح',
      data: product
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إضافة المنتج' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'manage')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية إدارة المخزون' });
      return;
    }

    const { productId } = req.params;
    const {
      name,
      nameEn,
      sku,
      description,
      price,
      cost,
      minStockLevel,
      maxStockLevel,
      categoryId,
      imageUrl,
      unit,
      isAvailable
    } = req.body;

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: context.storeId
      }
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }

    if (sku && sku !== product.sku) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          storeId: context.storeId,
          sku,
          id: { not: productId }
        }
      });
      if (existingProduct) {
        res.status(400).json({ success: false, error: 'SKU موجود مسبقاً' });
        return;
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name || product.name,
        nameEn: nameEn !== undefined ? nameEn : product.nameEn,
        sku: sku || product.sku,
        description: description !== undefined ? description : product.description,
        price: price !== undefined ? price : product.price,
        cost: cost !== undefined ? cost : product.cost,
        minStockLevel: minStockLevel !== undefined ? minStockLevel : product.minStockLevel,
        maxStockLevel: maxStockLevel !== undefined ? maxStockLevel : product.maxStockLevel,
        categoryId: categoryId !== undefined ? categoryId : product.categoryId,
        imageUrl: imageUrl !== undefined ? imageUrl : product.imageUrl,
        unit: unit || product.unit,
        isAvailable: isAvailable !== undefined ? isAvailable : product.isAvailable
      },
      include: {
        category: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المنتج' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'manage')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية حذف المنتجات' });
      return;
    }

    const { productId } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: context.storeId
      }
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }

    await prisma.product.delete({
      where: { id: productId }
    });

    res.json({
      success: true,
      message: 'تم حذف المنتج بنجاح'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المنتج' });
  }
};

// ==================== إدارة المخزون (تعديل الكميات) ====================

const createInventoryMovement = async (movement: InventoryMovement) => {
  return await prisma.inventoryMovement.create({
    data: {
      productId: movement.productId,
      quantity: movement.quantity,
      type: movement.type,
      reason: movement.reason || null,
      referenceId: movement.referenceId || null,
      referenceType: movement.referenceType || null,
      createdAt: new Date()
    }
  });
};

export const addStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'manage')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية إدارة المخزون' });
      return;
    }

    const { productId } = req.params;
    const { quantity, reason } = req.body;

    if (!quantity || quantity <= 0) {
      res.status(400).json({ success: false, error: 'الكمية المضافة يجب أن تكون أكبر من صفر' });
      return;
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: context.storeId
      }
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }

    const newStock = (product.stock || 0) + quantity;

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        stock: newStock,
        isAvailable: newStock > 0
      }
    });

    await createInventoryMovement({
      productId,
      quantity,
      type: 'stock_in',
      reason: reason || 'إضافة مخزون يدوي',
      referenceType: 'adjustment'
    });

    res.json({
      success: true,
      message: `تم إضافة ${quantity} قطعة إلى المخزون`,
      data: {
        product: updatedProduct,
        newStock,
        addedQuantity: quantity
      }
    });
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إضافة المخزون' });
  }
};

export const removeStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'manage')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية إدارة المخزون' });
      return;
    }

    const { productId } = req.params;
    const { quantity, reason } = req.body;

    if (!quantity || quantity <= 0) {
      res.status(400).json({ success: false, error: 'الكمية المخصومة يجب أن تكون أكبر من صفر' });
      return;
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: context.storeId
      }
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }

    const currentStock = product.stock || 0;
    if (currentStock < quantity) {
      res.status(400).json({ 
        success: false, 
        error: `الكمية المطلوبة (${quantity}) أكبر من المتوفر (${currentStock})` 
      });
      return;
    }

    const newStock = currentStock - quantity;

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        stock: newStock,
        isAvailable: newStock > 0
      }
    });

    await createInventoryMovement({
      productId,
      quantity: -quantity,
      type: 'stock_out',
      reason: reason || 'سحب مخزون يدوي',
      referenceType: 'adjustment'
    });

    res.json({
      success: true,
      message: `تم خصم ${quantity} قطعة من المخزون`,
      data: {
        product: updatedProduct,
        newStock,
        removedQuantity: quantity
      }
    });
  } catch (error) {
    console.error('Error removing stock:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في خصم المخزون' });
  }
};

export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'manage')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية إدارة المخزون' });
      return;
    }

    const { productId } = req.params;
    const { newStock, reason } = req.body;

    if (newStock === undefined || newStock < 0) {
      res.status(400).json({ success: false, error: 'الكمية الجديدة يجب أن تكون صفر أو أكثر' });
      return;
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: context.storeId
      }
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }

    const oldStock = product.stock || 0;
    const difference = newStock - oldStock;

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        stock: newStock,
        isAvailable: newStock > 0
      }
    });

    if (difference !== 0) {
      await createInventoryMovement({
        productId,
        quantity: difference,
        type: 'adjustment',
        reason: reason || `تعديل المخزون من ${oldStock} إلى ${newStock}`,
        referenceType: 'adjustment'
      });
    }

    res.json({
      success: true,
      message: `تم تعديل المخزون بنجاح`,
      data: {
        product: updatedProduct,
        oldStock,
        newStock,
        difference
      }
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تعديل المخزون' });
  }
};

// ==================== التقارير والتحليلات ====================

export const getLowStockAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'view')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية عرض المخزون' });
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        storeId: context.storeId,
        stock: { lte: prisma.product.fields.minStockLevel }
      },
      include: {
        category: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        stock: 'asc'
      }
    });

    const lowStockAlerts: LowStockAlert[] = products.map(product => ({
      productId: product.id,
      productName: product.name,
      currentStock: product.stock || 0,
      minStockLevel: product.minStockLevel || 5
    }));

    res.json({
      success: true,
      data: {
        alerts: lowStockAlerts,
        count: lowStockAlerts.length,
        criticalCount: lowStockAlerts.filter(a => a.currentStock === 0).length
      }
    });
  } catch (error) {
    console.error('Error getting low stock alerts:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تنبيهات المخزون' });
  }
};

export const getInventoryMovements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'view')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية عرض المخزون' });
      return;
    }

    const { productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    if (productId) {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          storeId: context.storeId
        }
      });
      if (!product) {
        res.status(404).json({ success: false, error: 'المنتج غير موجود' });
        return;
      }
    }

    const where: any = productId ? { productId } : {};
    where.product = { storeId: context.storeId };

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    const total = await prisma.inventoryMovement.count({ where });

    res.json({
      success: true,
      data: {
        movements,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting inventory movements:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب حركات المخزون' });
  }
};

export const getInventoryStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'view')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية عرض المخزون' });
      return;
    }

    const products = await prisma.product.findMany({
      where: { storeId: context.storeId },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        reservedStock: true,
        minStockLevel: true,
        maxStockLevel: true,
        price: true,
        cost: true
      }
    });

    const stockReport: StockReport[] = products.map(product => {
      const currentStock = product.stock || 0;
      const reservedStock = product.reservedStock || 0;
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        currentStock,
        reservedStock,
        availableStock: currentStock - reservedStock,
        minStockLevel: product.minStockLevel || 5,
        maxStockLevel: product.maxStockLevel || null,
        status: calculateStockStatus(
          currentStock,
          product.minStockLevel || 5,
          product.maxStockLevel || null
        )
      };
    });

    const summary = {
      totalProducts: products.length,
      totalStock: products.reduce((sum, p) => sum + (p.stock || 0), 0),
      totalValue: products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0),
      totalCost: products.reduce((sum, p) => sum + ((p.stock || 0) * (p.cost || 0)), 0),
      lowStockCount: stockReport.filter(s => s.status === 'low_stock').length,
      outOfStockCount: stockReport.filter(s => s.status === 'out_of_stock').length,
      overstockCount: stockReport.filter(s => s.status === 'overstock').length,
      healthyCount: stockReport.filter(s => s.status === 'in_stock').length
    };

    res.json({
      success: true,
      data: {
        stockReport,
        summary
      }
    });
  } catch (error) {
    console.error('Error getting inventory stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات المخزون' });
  }
};

export const exportInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'view')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية عرض المخزون' });
      return;
    }

    const products = await prisma.product.findMany({
      where: { storeId: context.storeId },
      include: {
        category: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const csvData = products.map(product => ({
      'اسم المنتج': product.name,
      'SKU': product.sku,
      'التصنيف': product.category?.name || '',
      'الكمية الحالية': product.stock || 0,
      'الكمية المحجوزة': product.reservedStock || 0,
      'الكمية المتاحة': (product.stock || 0) - (product.reservedStock || 0),
      'الحد الأدنى': product.minStockLevel || 5,
      'الحد الأقصى': product.maxStockLevel || '',
      'السعر': product.price || 0,
      'التكلفة': product.cost || 0,
      'الحالة': (product.stock || 0) <= 0 ? 'نفد' : (product.stock || 0) <= (product.minStockLevel || 5) ? 'منخفض' : 'متوفر',
      'متاح للبيع': product.isAvailable ? 'نعم' : 'لا'
    }));

    res.json({
      success: true,
      data: {
        products: csvData,
        count: csvData.length,
        exportedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error exporting inventory:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تصدير المخزون' });
  }
};

// ==================== دوال إضافية للتوافق مع الـ Routes ====================

export const getInventoryItems = async (req: AuthRequest, res: Response): Promise<void> => {
  return getInventory(req, res);
};

export const getInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح بالوصول إلى المخزون' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'view')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية عرض المخزون' });
      return;
    }

    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        storeId: context.storeId
      },
      include: {
        category: {
          select: { id: true, name: true }
        }
      }
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }

    const currentStock = product.stock || 0;
    const reservedStock = product.reservedStock || 0;
    const minStockLevel = product.minStockLevel || 5;
    const maxStockLevel = product.maxStockLevel || null;

    const productWithStats = {
      ...product,
      currentStock,
      reservedStock,
      availableStock: currentStock - reservedStock,
      minStockLevel,
      maxStockLevel,
      status: calculateStockStatus(currentStock, minStockLevel, maxStockLevel)
    };

    res.json({
      success: true,
      data: productWithStats
    });
  } catch (error) {
    console.error('Error getting inventory item:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنتج' });
  }
};

export const updateInventoryQuantity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'manage')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية إدارة المخزون' });
      return;
    }

    const { id } = req.params;
    const { quantity, operation = 'set', reason } = req.body;

    if (quantity === undefined) {
      res.status(400).json({ success: false, error: 'الكمية مطلوبة' });
      return;
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        storeId: context.storeId
      }
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }

    let newStock: number;
    let oldStock = product.stock || 0;

    switch (operation) {
      case 'add':
        newStock = oldStock + quantity;
        break;
      case 'subtract':
        newStock = oldStock - quantity;
        break;
      case 'set':
      default:
        newStock = quantity;
        break;
    }

    if (newStock < 0) {
      res.status(400).json({ success: false, error: 'الكمية لا يمكن أن تكون سالبة' });
      return;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        stock: newStock,
        isAvailable: newStock > 0
      }
    });

    const difference = newStock - oldStock;
    if (difference !== 0) {
      await createInventoryMovement({
        productId: id,
        quantity: difference,
        type: 'adjustment',
        reason: reason || `تحديث الكمية من ${oldStock} إلى ${newStock}`,
        referenceType: 'adjustment'
      });
    }

    res.json({
      success: true,
      message: `تم تحديث الكمية بنجاح`,
      data: {
        product: updatedProduct,
        oldStock,
        newStock,
        difference
      }
    });
  } catch (error) {
    console.error('Error updating inventory quantity:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الكمية' });
  }
};

export const reorderProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'manage')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية إدارة المخزون' });
      return;
    }

    const { id } = req.params;
    const { quantity = 0 } = req.body;

    const product = await prisma.product.findFirst({
      where: {
        id,
        storeId: context.storeId
      }
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }

    res.json({
      success: true,
      message: `تم إضافة ${product.name} إلى قائمة إعادة الطلب`,
      data: {
        productId: id,
        productName: product.name,
        requestedQuantity: quantity || product.minStockLevel || 5,
        currentStock: product.stock || 0
      }
    });
  } catch (error) {
    console.error('Error reordering product:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إعادة طلب المنتج' });
  }
};

export const getInventoryTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  return getInventoryMovements(req, res);
};

export const getInventoryAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  return getLowStockAlerts(req, res);
};

export const updateInventorySettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const context = await getBusinessContext(req);
    if (!context) {
      res.status(403).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const userRole = req.user?.role;
    const userPermissions = req.user?.permissions as any;

    if (!checkInventoryPermission(userRole, userPermissions, 'manage')) {
      res.status(403).json({ success: false, error: 'لا تملك صلاحية إدارة المخزون' });
      return;
    }

    const { id } = req.params;
    const {
      minStockLevel,
      maxStockLevel
    } = req.body;

    const product = await prisma.product.findFirst({
      where: {
        id,
        storeId: context.storeId
      }
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'المنتج غير موجود' });
      return;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        minStockLevel: minStockLevel !== undefined ? minStockLevel : product.minStockLevel,
        maxStockLevel: maxStockLevel !== undefined ? maxStockLevel : product.maxStockLevel,
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث إعدادات المخزون بنجاح',
      data: {
        productId: updatedProduct.id,
        minStockLevel: updatedProduct.minStockLevel,
        maxStockLevel: updatedProduct.maxStockLevel
      }
    });
  } catch (error) {
    console.error('Error updating inventory settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث إعدادات المخزون' });
  }
};