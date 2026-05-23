// backend/src/services/menu.service.ts

import prisma from './prisma';
import { Decimal } from '@prisma/client/runtime/library';

export class MenuService {
   static async getCategories(restaurantId: string) {
    return prisma.category.findMany({
      where: { restaurantId, isActive: true },
      include: { 
        menuItems: {
          where: { isAvailable: true },
          orderBy: { position: 'asc' }
        } 
      },
      orderBy: { position: 'asc' }
    });
  }

 static async getMenuItems(restaurantId: string, categoryId?: string) {
    return prisma.menuItem.findMany({
      where: {
        restaurantId,
        ...(categoryId && { categoryId }),
        isAvailable: true,
      },
      include: { category: true },  // ✅ إزالة images
      orderBy: { position: 'asc' }
    });
  }

  static async createCategory(data: {
    restaurantId: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }) {
    return prisma.category.create({ data });
  }

 static async createMenuItem(data: {
    restaurantId: string;
    categoryId?: string;
    name: string;
    description?: string;
    price: number | Decimal;
    originalPrice?: number | Decimal;
    image?: string;
    isAvailable?: boolean;
    preparationTime?: number;
    calories?: number;
  }) {
    return prisma.menuItem.create({
      data: {
        restaurantId: data.restaurantId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        price: typeof data.price === 'number' ? new Decimal(data.price) : data.price,
        originalPrice: data.originalPrice ? (typeof data.originalPrice === 'number' ? new Decimal(data.originalPrice) : data.originalPrice) : undefined,
        image: data.image,
        isAvailable: data.isAvailable ?? true,
        preparationTime: data.preparationTime,
        calories: data.calories,
        position: 0
      },
      include: { category: true }
    });
  }

   static async updateMenuItem(id: string, data: any) {
    const updateData: any = { ...data };
    
    if (data.price) {
      updateData.price = typeof data.price === 'number' ? new Decimal(data.price) : data.price;
    }
    if (data.originalPrice) {
      updateData.originalPrice = typeof data.originalPrice === 'number' ? new Decimal(data.originalPrice) : data.originalPrice;
    }

    return prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: { category: true }
    });
  }

  static async deleteMenuItem(id: string) {
    return prisma.menuItem.delete({ where: { id } });
  }

  static async deleteCategory(id: string) {
    return prisma.category.delete({ where: { id } });
  }

  static async searchMenuItems(restaurantId: string, searchTerm: string) {
    return prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ]
      },
      include: { category: true, images: true }
    });
  }
}

export default MenuService;
