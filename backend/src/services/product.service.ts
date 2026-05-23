// backend/src/services/product.service.ts

import prisma from './prisma';

export class ProductService {
  static async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        store: true,
        category: true,
        movements: true,  // ✅ movements بدلاً من transactions
      }
    });
  }

  static async findBySku(sku: string) {
    return prisma.product.findUnique({
      where: { sku }
    });
  }

  static async getStoreProducts(storeId: string, categoryId?: string) {
    return prisma.product.findMany({
      where: {
        storeId,
        ...(categoryId && { categoryId }),
        isAvailable: true,  // ✅ isAvailable بدلاً من isActive
      },
      include: { category: true },  // ✅ إزالة images
      orderBy: { sortOrder: 'asc' }  // ✅ sortOrder بدلاً من position
    });
  }

  static async createProduct(data: {
    storeId: string;
    categoryId?: string;
    name: string;
    nameEn?: string;
    sku: string;
    description?: string;
    price: number;
    cost?: number;
    stock?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    imageUrl?: string;
    unit?: string;
    isAvailable?: boolean;
  }) {
    return prisma.product.create({
      data: {
        storeId: data.storeId,
        categoryId: data.categoryId,
        name: data.name,
        nameEn: data.nameEn,
        sku: data.sku,
        description: data.description,
        price: data.price,
        cost: data.cost,
        stock: data.stock || 0,
        reservedStock: 0,
        minStockLevel: data.minStockLevel || 5,
        maxStockLevel: data.maxStockLevel,
        imageUrl: data.imageUrl,
        unit: data.unit || 'piece',
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
        sortOrder: 0
      },
      include: { category: true }
    });
  }

  static async updateProduct(id: string, data: any) {
    const updateData: any = { ...data };
    
    // إزالة الحقول التي لا يجب تحديثها
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.storeId;
    
    // تحويل الأسماء القديمة إلى الجديدة
    if (updateData.quantity !== undefined) {
      updateData.stock = updateData.quantity;
      delete updateData.quantity;
    }
    if (updateData.reorderLevel !== undefined) {
      updateData.minStockLevel = updateData.reorderLevel;
      delete updateData.reorderLevel;
    }
    if (updateData.isActive !== undefined) {
      updateData.isAvailable = updateData.isActive;
      delete updateData.isActive;
    }
    if (updateData.position !== undefined) {
      updateData.sortOrder = updateData.position;
      delete updateData.position;
    }
    if (updateData.image !== undefined) {
      updateData.imageUrl = updateData.image;
      delete updateData.image;
    }
    
    return prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true }
    });
  }

  static async deleteProduct(id: string) {
    return prisma.product.delete({ where: { id } });
  }

  static async getLowStockProducts(storeId: string) {
    return prisma.product.findMany({
      where: {
        storeId,
        stock: {
          lte: prisma.product.fields.minStockLevel  // ✅ minStockLevel بدلاً من reorderLevel
        },
        isAvailable: true
      },
      include: { category: true }
    });
  }

  static async updateStock(productId: string, quantity: number, type: 'in' | 'out' | 'adjustment', reason?: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    let newStock = product.stock;
    if (type === 'in') newStock += quantity;
    else if (type === 'out') newStock = Math.max(0, product.stock - quantity);
    else if (type === 'adjustment') newStock = Math.max(0, quantity);

    const difference = newStock - (product.stock || 0);
    
    // تسجيل حركة المخزون
    if (difference !== 0) {
      await prisma.inventoryMovement.create({
        data: {
          productId,
          quantity: difference,
          type: type === 'in' ? 'stock_in' : type === 'out' ? 'stock_out' : 'adjustment',
          reason: reason || `تحديد المخزون بواسطة ${type}`,
          referenceType: 'adjustment'
        }
      });
    }

    // تحديث المنتج
    return prisma.product.update({
      where: { id: productId },
      data: { 
        stock: newStock,
        isAvailable: newStock > 0
      },
      include: { category: true }
    });
  }

  static async searchProducts(storeId: string, searchTerm: string) {
    return prisma.product.findMany({
      where: {
        storeId,
        isAvailable: true,
        OR: [
          { name: { contains: searchTerm } },
          { sku: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ]
      },
      include: { category: true },
      orderBy: { name: 'asc' }
    });
  }

  // ✅ دوال إضافية مفيدة
  static async getProductsByCategory(storeId: string, categoryId: string) {
    return prisma.product.findMany({
      where: {
        storeId,
        categoryId,
        isAvailable: true
      },
      include: { category: true },
      orderBy: { sortOrder: 'asc' }
    });
  }

  static async updateStockBatch(updates: Array<{ productId: string; quantity: number; type: 'in' | 'out' | 'adjustment'; reason?: string }>) {
    const results = [];
    for (const update of updates) {
      const result = await this.updateStock(update.productId, update.quantity, update.type, update.reason);
      results.push(result);
    }
    return results;
  }

  static async getInventoryValue(storeId: string) {
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
}

export default ProductService;