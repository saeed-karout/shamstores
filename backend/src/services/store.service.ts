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
      data: {
        planId: data.planId,
        name: data.name,
        slug: data.slug,
        email: data.email,
        phone: data.phone,
        userId: data.userId,
        address: data.address,
        description: data.description,
        logo: data.logo,
        coverImage: data.coverImage,
        subdomain: data.subdomain,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        isActive: true
      },
      include: {
        plan: true,
        owner: true,
      }
    });
  }

  static async update(id: string, data: any) {
    const updateData: any = { ...data };
    
    // إزالة الحقول التي لا يجب تحديثها
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.planId;  // لا يمكن تغيير الخطة مباشرة
    
    return prisma.store.update({
      where: { id },
      data: updateData,
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
      prisma.category.count({ where: { storeId } }),
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
        movements: true,
      }
    });

    // ✅ تصحيح: استخدام stock مباشرة (price من نوع number)
    const lowStock = products.filter(p => (p.stock || 0) <= (p.minStockLevel || 5));
    const totalValue = products.reduce((sum, p) => {
      const price = typeof p.price === 'number' ? p.price : Number(p.price);
      const stock = p.stock || 0;
      return sum + (price * stock);
    }, 0);

    return {
      totalProducts: products.length,
      lowStockItems: lowStock.length,
      totalInventoryValue: totalValue,
    };
  }

  // ✅ دوال إضافية مفيدة
  static async findBySubdomainOrSlug(identifier: string) {
    return prisma.store.findFirst({
      where: {
        OR: [
          { subdomain: identifier },
          { slug: identifier }
        ],
        isActive: true
      },
      include: {
        plan: true,
        categories: {
          where: { isActive: true },
          orderBy: { position: 'asc' }
        }
      }
    });
  }

  static async getStoreWithDetails(storeId: string) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        plan: true,
        owner: true,
        users: {
          where: { role: 'staff' },
          select: { id: true, name: true, email: true, phone: true, isActive: true }
        },
        categories: {
          where: { isActive: true },
          include: {
            products: {
              where: { isAvailable: true },
              take: 10
            }
          },
          orderBy: { position: 'asc' }
        },
        products: {
          where: { isAvailable: true },
          take: 20,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return store;
  }

  static async updateStoreSettings(storeId: string, settings: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    timezone?: string;
    currency?: string;
    language?: string;
  }) {
    return prisma.store.update({
      where: { id: storeId },
      data: settings
    });
  }

  static async updateContactInfo(storeId: string, contact: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
  }) {
    return prisma.store.update({
      where: { id: storeId },
      data: contact
    });
  }

  static async updateSocialLinks(storeId: string, social: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  }) {
    return prisma.store.update({
      where: { id: storeId },
      data: social
    });
  }

  static async getStoreRevenue(storeId: string, startDate?: Date, endDate?: Date) {
    const where: any = { storeId, status: 'delivered' };
    
    if (startDate) where.createdAt = { gte: startDate };
    if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };
    
    const revenue = await prisma.order.aggregate({
      where,
      _sum: { total: true }
    });

    const ordersCount = await prisma.order.count({ where });

    return {
      totalRevenue: revenue._sum.total || 0,
      ordersCount,
      averageOrderValue: ordersCount > 0 ? (revenue._sum.total || 0) / ordersCount : 0
    };
  }
}

export default StoreService;