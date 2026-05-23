// backend/src/services/restaurant.service.ts

import prisma from './prisma';

export class RestaurantService {
  static async findById(id: string) {
    return prisma.restaurant.findUnique({
      where: { id },
      include: {
        plan: true,
        owner: true,
        users: true,
        categories: true,
        menuItems: true,
        tables: true,
      }
    });
  }

  static async findBySlug(slug: string) {
    return prisma.restaurant.findUnique({
      where: { slug }
    });
  }

  static async findBySubdomain(subdomain: string) {
    return prisma.restaurant.findUnique({
      where: { subdomain }
    });
  }

  static async findByCustomDomain(domain: string) {
    return prisma.restaurant.findUnique({
      where: { customDomain: domain }
    });
  }

  static async findByUserId(userId: string) {
    return prisma.restaurant.findFirst({
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
  }) {
    return prisma.restaurant.create({
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
        primaryColor: data.primaryColor || '#3B82F6',
        secondaryColor: data.secondaryColor || '#10B981',
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
    
    // إزالة الحقول غير الموجودة في Schema
    delete updateData.openingHours;  // ❌ غير موجود في Schema
    delete updateData.backgroundColor;  // ❌ غير موجود في Restaurant
    delete updateData.textColor;  // ❌ غير موجود في Restaurant
    delete updateData.fontFamily;  // ❌ غير موجود في Restaurant
    
    return prisma.restaurant.update({
      where: { id },
      data: updateData,
      include: {
        plan: true,
        owner: true,
      }
    });
  }

  static async delete(id: string) {
    return prisma.restaurant.delete({ where: { id } });
  }

  static async findAll(filter?: any) {
    return prisma.restaurant.findMany({
      where: filter,
      include: {
        plan: true,
        owner: true,
      }
    });
  }

  static async getStats(restaurantId: string) {
    const [ordersCount, itemsCount, tablesCount, staffCount] = await Promise.all([
      prisma.order.count({ where: { restaurantId } }),
      prisma.menuItem.count({ where: { restaurantId } }),
      prisma.table.count({ where: { restaurantId } }),
      prisma.user.count({ where: { restaurantId, role: 'staff' } }),
    ]);

    return {
      ordersCount,
      itemsCount,
      tablesCount,
      staffCount,
    };
  }

  static async verifyCustomDomain(restaurantId: string, verificationCode: string) {
    return prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        customDomainVerified: true,
        customDomainVerifiedAt: new Date(),
        customDomainVerificationCode: null,
      }
    });
  }

  static async updateDeliverySettings(restaurantId: string, settings: any) {
    return prisma.restaurant.update({
      where: { id: restaurantId },
      data: { deliverySettings: settings }
    });
  }

  // ✅ الحل: تخزين أوقات العمل في حقل منفصل أو استخدام JSON
  static async updateBusinessHours(restaurantId: string, hours: any) {
    // إذا كان لديك حقل businessHours في Schema، استخدمه
    // أو قم بتخزينه في حقل JSON موجود
    
    // الخيار 1: إذا كان لديك حقل businessHours
    // return prisma.restaurant.update({
    //   where: { id: restaurantId },
    //   data: { businessHours: hours }
    // });
    
    // الخيار 2: تخزين في deliverySettings أو حقل JSON آخر
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { deliverySettings: true }
    });
    
    const currentSettings = restaurant?.deliverySettings as any || {};
    
    return prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        deliverySettings: {
          ...currentSettings,
          openingHours: hours
        }
      }
    });
  }

  // ✅ دوال إضافية مفيدة
  static async findWithDetails(id: string) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        plan: true,
        owner: true,
        categories: {
          where: { isActive: true },
          include: {
            menuItems: {
              where: { isAvailable: true },
              orderBy: { position: 'asc' }
            }
          },
          orderBy: { position: 'asc' }
        },
        menuItems: {
          where: { isAvailable: true },
          take: 20,
          orderBy: { position: 'asc' }
        },
        tables: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      }
    });
    
    return restaurant;
  }

  static async updateContactInfo(restaurantId: string, contact: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
  }) {
    return prisma.restaurant.update({
      where: { id: restaurantId },
      data: contact
    });
  }

  static async updateSocialLinks(restaurantId: string, social: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  }) {
    return prisma.restaurant.update({
      where: { id: restaurantId },
      data: social
    });
  }

  static async getRestaurantRevenue(restaurantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { restaurantId, status: 'delivered' };
    
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

  static async getTopMenuItems(restaurantId: string, limit: number = 10) {
    const items = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        menuItem: { restaurantId },
        order: { status: 'delivered' }
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit
    });
    
    const menuItemIds = items.filter(i => i.menuItemId).map(i => i.menuItemId!);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } }
    });
    
    return items.map(item => ({
      ...menuItems.find(m => m.id === item.menuItemId),
      totalSold: item._sum.quantity || 0
    }));
  }
}

export default RestaurantService;