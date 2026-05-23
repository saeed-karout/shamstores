// backend/src/services/table.service.ts

import prisma from './prisma';

export class TableService {
  static async findById(id: string) {
    return prisma.table.findUnique({
      where: { id },
      include: { restaurant: true, orders: true }
    });
  }

  static async getRestaurantTables(restaurantId: string) {
    return prisma.table.findMany({
      where: { restaurantId },
      orderBy: { number: 'asc' }
    });
  }

  static async getAvailableTables(restaurantId: string) {
    return prisma.table.findMany({
      where: {
        restaurantId,
        isAvailable: true,
      },
      orderBy: { number: 'asc' }
    });
  }

  static async createTable(data: {
    restaurantId: string;
    number: number;
    capacity: number;
    qrCode?: string;
    position?: string;
  }) {
    return prisma.table.create({ data });
  }

  static async updateTable(id: string, data: any) {
    return prisma.table.update({
      where: { id },
      data
    });
  }

  static async deleteTable(id: string) {
    return prisma.table.delete({ where: { id } });
  }

  static async setTableStatus(id: string, isAvailable: boolean) {
    return prisma.table.update({
      where: { id },
      data: { isAvailable }
    });
  }

  static async getTableByNumber(restaurantId: string, number: number) {
    return prisma.table.findFirst({
      where: { restaurantId, number }
    });
  }

  static async getTableOrders(tableId: string) {
    return prisma.order.findMany({
      where: { tableId },
      include: { orderItems: true }
    });
  }
}

export default TableService;
