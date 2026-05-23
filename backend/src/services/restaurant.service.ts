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
    backgroundColor?: string;
    textColor?: string;
  }) {
    return prisma.restaurant.create({
      data,
      include: {
        plan: true,
        owner: true,
      }
    });
  }

  static async update(id: string, data: any) {
    return prisma.restaurant.update({
      where: { id },
      data,
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
      prisma.user.count({ where: { restaurantId } }),
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

  static async updateOpeningHours(restaurantId: string, hours: any) {
    return prisma.restaurant.update({
      where: { id: restaurantId },
      data: { openingHours: hours }
    });
  }
}

export default RestaurantService;
