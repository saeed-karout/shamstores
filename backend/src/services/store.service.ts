// backend/src/services/store.service.ts

import prisma from './prisma';

export class StoreService {
  static async findById(id: string) {
    return prisma.store.findUnique({
      where: { id },
      include: {
        plan: true,
        owner: true,
        users: true,
        categories: true,
        products: true,
      }
    });
  }

  static async findBySlug(slug: string) {
    return prisma.store.findUnique({
      where: { slug }
    });
  }

  static async findBySubdomain(subdomain: string) {
    return prisma.store.findUnique({
      where: { subdomain }
    });
  }

  static async findByCustomDomain(domain: string) {
    return prisma.store.findUnique({
      where: { customDomain: domain }
    });
  }

  static async findByUserId(userId: string) {
    return prisma.store.findFirst({
      where: { userId }
    });
  }

  static async create(data: {
    planId: string;
    name: string;
    slug: string;
    email?: string;
    phone?: string;
    userId?: string;
    address?: string;
    description?: string;
    logo?: string;
    coverImage?: string;
    subdomain?: string;
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  }) {
    return prisma.store.create({
      data,
      include: {
        plan: true,
        owner: true,
      }
    });
  }

  static async update(id: string, data: any) {
    return prisma.store.update({
      where: { id },
      data,
      include: {
        plan: true,
        owner: true,
      }
    });
  }

  static async delete(id: string) {
    return prisma.store.delete({ where: { id } });
  }

  static async findAll(filter?: any) {
    return prisma.store.findMany({
      where: filter,
      include: {
        plan: true,
        owner: true,
      }
    });
  }

  static async getStats(storeId: string) {
    const [ordersCount, productsCount, categoriesCount, staffCount] = await Promise.all([
      prisma.order.count({ where: { storeId } }),
      prisma.product.count({ where: { storeId } }),
      prisma.productCategory.count({ where: { storeId } }),
      prisma.user.count({ where: { storeId } }),
    ]);

    return {
      ordersCount,
      productsCount,
      categoriesCount,
      staffCount,
    };
  }

  static async verifyCustomDomain(storeId: string, verificationCode: string) {
    return prisma.store.update({
      where: { id: storeId },
      data: {
        customDomainVerified: true,
        customDomainVerifiedAt: new Date(),
        customDomainVerificationCode: null,
      }
    });
  }

  static async getInventoryStats(storeId: string) {
    const products = await prisma.product.findMany({
      where: { storeId },
      include: {
        movements: true,  // تغيير من transactions إلى movements
      }
    });

    // ✅ تصحيح: استخدام stock بدلاً من quantity
    const lowStock = products.filter(p => (p.stock || 0) <= (p.minStockLevel || 5));
    const totalValue = products.reduce((sum, p) => {
      const price = p.price instanceof Decimal ? p.price.toNumber() : Number(p.price);
      const stock = p.stock || 0;
      return sum + (price * stock);
    }, 0);

    return {
      totalProducts: products.length,
      lowStockItems: lowStock.length,
      totalInventoryValue: totalValue,
    };
  }
}

export default StoreService;
