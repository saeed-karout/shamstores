// backend/src/services/inventory.service.ts

import prisma from './prisma';

export class InventoryService {
  static async getProductMovements(productId: string) {
    return prisma.inventoryMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getStoreMovements(storeId: string) {
    const products = await prisma.product.findMany({ 
      where: { storeId },
      select: { id: true }
    });
    const productIds = products.map(p => p.id);

    return prisma.inventoryMovement.findMany({
      where: { productId: { in: productIds } },
      include: { product: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async recordStockIn(productId: string, quantity: number, reason?: string, referenceId?: string) {
    // تحديث كمية المنتج
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    const newStock = (product.stock || 0) + quantity;

    await prisma.product.update({
      where: { id: productId },
      data: { 
        stock: newStock,
        isAvailable: newStock > 0
      }
    });

    // تسجيل حركة المخزون
    return prisma.inventoryMovement.create({
      data: {
        productId,
        quantity,
        type: 'stock_in',
        reason: reason || 'إضافة مخزون يدوي',
        referenceId,
        referenceType: 'adjustment'
      }
    });
  }

  static async recordStockOut(productId: string, quantity: number, reason?: string, referenceId?: string) {
    // تحديث كمية المنتج
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');
    if ((product.stock || 0) < quantity) {
      throw new Error(`Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`);
    }

    const newStock = (product.stock || 0) - quantity;

    await prisma.product.update({
      where: { id: productId },
      data: { 
        stock: newStock,
        isAvailable: newStock > 0
      }
    });

    // تسجيل حركة المخزون
    return prisma.inventoryMovement.create({
      data: {
        productId,
        quantity: -quantity,
        type: 'stock_out',
        reason: reason || 'سحب مخزون يدوي',
        referenceId,
        referenceType: 'adjustment'
      }
    });
  }

  static async recordAdjustment(productId: string, quantity: number, notes?: string) {
    // تحديث كمية المنتج
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    const newStock = quantity;

    await prisma.product.update({
      where: { id: productId },
      data: { 
        stock: newStock,
        isAvailable: newStock > 0
      }
    });

    const difference = newStock - (product.stock || 0);

    // تسجيل حركة المخزون
    return prisma.inventoryMovement.create({
      data: {
        productId,
        quantity: difference,
        type: 'adjustment',
        reason: notes || `تعديل المخزون من ${product.stock} إلى ${newStock}`,
        referenceType: 'adjustment'
      }
    });
  }

  static async getInventorySummary(storeId: string) {
    const products = await prisma.product.findMany({
      where: { storeId },
      include: { movements: true }
    });

    const summary = {
      totalItems: products.length,
      totalValue: 0,
      lowStockCount: 0,
      outOfStock: 0,
      productDetails: [] as any[]
    };

    products.forEach(product => {
      const price = typeof product.price === 'number' ? product.price : Number(product.price);
      const stock = product.stock || 0;
      const minStockLevel = product.minStockLevel || 5;
      const value = price * stock;
      
      summary.totalValue += value;

      if (stock <= 0) {
        summary.outOfStock++;
      } else if (stock <= minStockLevel) {
        summary.lowStockCount++;
      }

      summary.productDetails.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: stock,
        minStockLevel,
        maxStockLevel: product.maxStockLevel,
        price: price,
        value,
        status: stock <= 0 ? 'OUT_OF_STOCK' : stock <= minStockLevel ? 'LOW_STOCK' : 'IN_STOCK'
      });
    });

    return summary;
  }

  static async getMovementHistory(productId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return prisma.inventoryMovement.findMany({
      where: {
        productId,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ✅ دوال إضافية مفيدة
  static async getLowStockProducts(storeId: string, threshold?: number) {
    const products = await prisma.product.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        minStockLevel: true,
        price: true,
        imageUrl: true
      }
    });

    const lowStock = products.filter(p => {
      const minLevel = threshold || p.minStockLevel || 5;
      return (p.stock || 0) <= minLevel && (p.stock || 0) > 0;
    });

    const outOfStock = products.filter(p => (p.stock || 0) === 0);

    return {
      lowStock,
      outOfStock,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length
    };
  }

  static async getStockValue(storeId: string) {
    const products = await prisma.product.findMany({
      where: { storeId },
      select: { stock: true, price: true, cost: true }
    });

    const totalValueByPrice = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
    const totalValueByCost = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.cost || 0)), 0);

    return {
      totalValueByPrice,
      totalValueByCost,
      profit: totalValueByPrice - totalValueByCost
    };
  }

  static async bulkStockUpdate(updates: Array<{
    productId: string;
    quantity: number;
    type: 'in' | 'out';
    reason?: string;
  }>) {
    const results = [];
    for (const update of updates) {
      if (update.type === 'in') {
        const result = await this.recordStockIn(update.productId, update.quantity, update.reason);
        results.push(result);
      } else {
        const result = await this.recordStockOut(update.productId, update.quantity, update.reason);
        results.push(result);
      }
    }
    return results;
  }
}

export default InventoryService;