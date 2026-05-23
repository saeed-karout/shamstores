// backend/src/services/table.service.ts

import prisma from './prisma';

export class TableService {
  static async findById(id: string) {
    return prisma.table.findUnique({
      where: { id },
      include: { restaurant: true }  // ✅ تم إزالة orders (غير موجود)
    });
  }

  static async getRestaurantTables(restaurantId: string) {
    return prisma.table.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' }  // ✅ تم تغيير number → name
    });
  }

  static async getAvailableTables(restaurantId: string) {
    return prisma.table.findMany({
      where: {
        restaurantId,
        isActive: true,  // ✅ تم تغيير isAvailable → isActive
      },
      orderBy: { name: 'asc' }  // ✅ تم تغيير number → name
    });
  }

  static async createTable(data: {
    restaurantId: string;
    name: string;        // ✅ تم تغيير number → name
    nameEn?: string;     // ✅ إضافة الاسم بالإنجليزية
    seats: number;       // ✅ تم تغيير capacity → seats
    qrCode?: string;
    notes?: string;      // ✅ إضافة ملاحظات
    sortOrder?: number;  // ✅ إضافة ترتيب الفرز
  }) {
    return prisma.table.create({
      data: {
        restaurantId: data.restaurantId,
        name: data.name,
        nameEn: data.nameEn,
        seats: data.seats,
        qrCode: data.qrCode,
        notes: data.notes,
        sortOrder: data.sortOrder || 0,
        isActive: true
      }
    });
  }

  static async updateTable(id: string, data: any) {
    const updateData: any = { ...data };
    
    // تنظيف البيانات
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.restaurantId;  // لا يمكن تغيير restaurantId
    
    // تحويل الأسماء القديمة إلى الجديدة إذا وجدت
    if (updateData.number !== undefined) {
      updateData.name = updateData.number.toString();
      delete updateData.number;
    }
    if (updateData.capacity !== undefined) {
      updateData.seats = updateData.capacity;
      delete updateData.capacity;
    }
    if (updateData.isAvailable !== undefined) {
      updateData.isActive = updateData.isAvailable;
      delete updateData.isAvailable;
    }
    
    return prisma.table.update({
      where: { id },
      data: updateData
    });
  }

  static async deleteTable(id: string) {
    return prisma.table.delete({ where: { id } });
  }

  static async setTableStatus(id: string, isActive: boolean) {
    return prisma.table.update({
      where: { id },
      data: { isActive }  // ✅ تم تغيير isAvailable → isActive
    });
  }

  static async getTableByName(restaurantId: string, name: string) {
    return prisma.table.findFirst({
      where: { restaurantId, name }
    });
  }

  static async getTableOrders(tableId: string) {
    return prisma.order.findMany({
      where: { tableId },
      include: { 
        items: true  // ✅ تم تغيير orderItems → items
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ✅ دوال إضافية مفيدة
  static async getTableByQrCode(qrCode: string) {
    return prisma.table.findFirst({
      where: { qrCode, isActive: true },
      include: { restaurant: true }
    });
  }

  static async getTableWithActiveOrders(tableId: string) {
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: { restaurant: true }
    });
    
    if (!table) return null;
    
    const activeOrders = await prisma.order.findMany({
      where: {
        tableId,
        status: { notIn: ['delivered', 'cancelled', 'served'] }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return {
      ...table,
      activeOrders
    };
  }

  static async updateTableOrder(tableId: string, sortOrder: number) {
    return prisma.table.update({
      where: { id: tableId },
      data: { sortOrder }
    });
  }

  static async bulkCreateTables(tables: Array<{
    restaurantId: string;
    name: string;
    seats: number;
    qrCode?: string;
  }>) {
    return prisma.table.createMany({
      data: tables.map(table => ({
        ...table,
        isActive: true,
        sortOrder: 0
      }))
    });
  }

static async getTableStatistics(restaurantId: string) {
  const [total, active] = await Promise.all([
    prisma.table.count({ where: { restaurantId } }),
    prisma.table.count({ where: { restaurantId, isActive: true } })
  ]);

  // الحصول على عدد الطاولات المشغولة (التي لها طلبات نشطة)
  const activeOrders = await prisma.order.findMany({
    where: {
      tableId: { not: null },
      restaurantId,
      status: { notIn: ['delivered', 'cancelled', 'served'] }
    },
    select: { tableId: true },
    distinct: ['tableId']  // ✅ distinct داخل findMany وليس count
  });

  const occupiedTables = activeOrders.length;

  return {
    totalTables: total,
    activeTables: active,
    inactiveTables: total - active,
    occupiedTables: occupiedTables,
    availableTables: active - occupiedTables
  };
}
}

export default TableService;