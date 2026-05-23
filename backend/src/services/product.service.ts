// backend/src/services/product.service.ts

import prisma from './prisma';
import { Decimal } from '@prisma/client/runtime/library';

export class ProductService {
  static async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        store: true,
        category: true,
        images: true,
        transactions: true,
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
        isActive: true,
      },
      include: { category: true, images: true },
      orderBy: { position: 'asc' }
    });
  }

  static async createProduct(data: {
    storeId: string;
    categoryId?: string;
    name: string;
    sku?: string;
    description?: string;
    price: number | Decimal;
    originalPrice?: number | Decimal;
    quantity?: number;
    reorderLevel?: number;
    image?: string;
    tags?: any;
  }) {
    return prisma.product.create({
      data: {
        ...data,
        price: new Decimal(data.price.toString()),
        originalPrice: data.originalPrice ? new Decimal(data.originalPrice.toString()) : undefined,
      },
      include: { category: true, images: true }
    });
  }

  static async updateProduct(id: string, data: any) {
    if (data.price) {
      data.price = new Decimal(data.price.toString());
    }
    if (data.originalPrice) {
      data.originalPrice = new Decimal(data.originalPrice.toString());
    }

    return prisma.product.update({
      where: { id },
      data,
      include: { category: true, images: true }
    });
  }

  static async deleteProduct(id: string) {
    return prisma.product.delete({ where: { id } });
  }

  static async getLowStockProducts(storeId: string) {
    return prisma.product.findMany({
      where: {
        storeId,
        quantity: {
          lte: prisma.product.fields.reorderLevel
        }
      }
    });
  }

  static async updateStock(productId: string, quantity: number, type: 'in' | 'out' | 'adjustment', reference?: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    let newQuantity = product.quantity;
    if (type === 'in') newQuantity += quantity;
    else if (type === 'out') newQuantity -= quantity;
    else if (type === 'adjustment') newQuantity = quantity;

    // Create transaction
    await prisma.inventoryTransaction.create({
      data: {
        productId,
        quantity: type === 'out' ? -quantity : quantity,
        type,
        reference,
      }
    });

    // Update product
    return prisma.product.update({
      where: { id: productId },
      data: { quantity: Math.max(0, newQuantity) }
    });
  }

  static async searchProducts(storeId: string, searchTerm: string) {
    return prisma.product.findMany({
      where: {
        storeId,
        isActive: true,
        OR: [
          { name: { contains: searchTerm } },
          { sku: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ]
      },
      include: { category: true, images: true }
    });
  }
}

export default ProductService;
