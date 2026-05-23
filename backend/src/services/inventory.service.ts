// backend/src/services/inventory.service.ts

import prisma from './prisma';

export class InventoryService {
  static async getProductTransactions(productId: string) {
    return prisma.inventoryTransaction.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getStoreTransactions(storeId: string) {
    const products = await prisma.product.findMany({ where: { storeId } });
    const productIds = products.map(p => p.id);

    return prisma.inventoryTransaction.findMany({
      where: { productId: { in: productIds } },
      include: { product: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async recordIncoming(productId: string, quantity: number, reference?: string, notes?: string) {
    return prisma.inventoryTransaction.create({
      data: {
        productId,
        quantity,
        type: 'in',
        reference,
        notes,
      }
    });
  }

  static async recordOutgoing(productId: string, quantity: number, reference?: string, notes?: string) {
    return prisma.inventoryTransaction.create({
      data: {
        productId,
        quantity: -quantity,
        type: 'out',
        reference,
        notes,
      }
    });
  }

  static async recordAdjustment(productId: string, quantity: number, notes?: string) {
    return prisma.inventoryTransaction.create({
      data: {
        productId,
        quantity,
        type: 'adjustment',
        notes,
      }
    });
  }

  static async getInventorySummary(storeId: string) {
    const products = await prisma.product.findMany({
      where: { storeId },
      include: { transactions: true }
    });

    const summary = {
      totalItems: products.length,
      totalValue: 0,
      lowStockCount: 0,
      outOfStock: 0,
      productDetails: [] as any[]
    };

    products.forEach(product => {
      const value = product.price.toNumber() * product.quantity;
      summary.totalValue += value;

      if (product.quantity <= 0) {
        summary.outOfStock++;
      } else if (product.quantity <= product.reorderLevel) {
        summary.lowStockCount++;
      }

      summary.productDetails.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: product.quantity,
        reorderLevel: product.reorderLevel,
        price: product.price,
        value,
        status: product.quantity <= 0 ? 'OUT_OF_STOCK' : product.quantity <= product.reorderLevel ? 'LOW_STOCK' : 'IN_STOCK'
      });
    });

    return summary;
  }

  static async getTransactionHistory(productId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return prisma.inventoryTransaction.findMany({
      where: {
        productId,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export default InventoryService;
