// backend/src/services/menu.service.ts

import prisma from './prisma';

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
      include: { category: true },
      orderBy: { position: 'asc' }
    });
  }

  static async createCategory(data: {
    restaurantId: string;
    name: string;
    description?: string;
    image?: string;
  }) {
    return prisma.category.create({
      data: {
        restaurantId: data.restaurantId,
        name: data.name,
        description: data.description,
        image: data.image,
        isActive: true,
        position: 0
      }
    });
  }

  static async createMenuItem(data: {
    restaurantId: string;
    categoryId?: string;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    image?: string;
    isAvailable?: boolean;
  }) {
    return prisma.menuItem.create({
      data: {
        restaurantId: data.restaurantId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        price: data.price,
        originalPrice: data.originalPrice,
        image: data.image,
        isAvailable: data.isAvailable ?? true,
        position: 0,
        ordersCount: 0
      },
      include: { category: true }
    });
  }

  static async updateMenuItem(id: string, data: any) {
    const updateData: any = { ...data };
    
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.restaurantId;
    delete updateData.ordersCount;
    
    if (updateData.price !== undefined) {
      updateData.price = typeof updateData.price === 'number' ? updateData.price : Number(updateData.price);
    }
    if (updateData.originalPrice !== undefined) {
      updateData.originalPrice = typeof updateData.originalPrice === 'number' ? updateData.originalPrice : Number(updateData.originalPrice);
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
    await prisma.menuItem.updateMany({
      where: { categoryId: id },
      data: { categoryId: null }
    });
    
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
      include: { category: true },
      orderBy: { position: 'asc' }
    });
  }

  static async getMenuItemsByCategory(restaurantId: string, categoryId: string) {
    return prisma.menuItem.findMany({
      where: {
        restaurantId,
        categoryId,
        isAvailable: true
      },
      include: { category: true },
      orderBy: { position: 'asc' }
    });
  }

  static async getPopularItems(restaurantId: string, limit: number = 10) {
    return prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
      },
      take: limit,
      orderBy: { ordersCount: 'desc' }
    });
  }

  static async updateCategoryOrder(categories: { id: string; position: number }[]) {
    const updates = categories.map(cat =>
      prisma.category.update({
        where: { id: cat.id },
        data: { position: cat.position }
      })
    );
    await Promise.all(updates);
  }

  static async updateMenuItemsOrder(items: { id: string; position: number }[]) {
    const updates = items.map(item =>
      prisma.menuItem.update({
        where: { id: item.id },
        data: { position: item.position }
      })
    );
    await Promise.all(updates);
  }
}

export default MenuService;