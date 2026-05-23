// backend/src/services/ticket.service.ts

import prisma from './prisma';

export class TicketService {
  static async findById(id: string) {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        user: true,
        restaurant: true,
        store: true,
        // ❌ تم إزالة messages (غير موجود)
      }
    });
  }

  static async getUserTickets(userId: string) {
    return prisma.ticket.findMany({
      where: { userId },
      // ❌ تم إزالة include: { messages: true }
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getRestaurantTickets(restaurantId: string) {
    return prisma.ticket.findMany({
      where: { restaurantId },
      include: { user: true },  // ✅ فقط user
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getStoreTickets(storeId: string) {
    return prisma.ticket.findMany({
      where: { storeId },
      include: { user: true },  // ✅ فقط user
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getOpenTickets() {
    return prisma.ticket.findMany({
      where: { status: 'open' },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createTicket(data: {
    userId: string;
    restaurantId?: string;
    storeId?: string;
    subject: string;
    description?: string;
    priority?: string;
  }) {
    return prisma.ticket.create({
      data: {
        userId: data.userId,
        restaurantId: data.restaurantId,
        storeId: data.storeId,
        subject: data.subject,
        description: data.description,
        priority: data.priority || 'medium',
        status: 'open'
      },
      include: { user: true }
    });
  }

  // ✅ دالة لإضافة تحديث إلى التذكرة (بدلاً من رسائل منفصلة)
  static async addTicketUpdate(id: string, updateMessage: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new Error('Ticket not found');
    
    // إضافة التحديث إلى حقل description مع التاريخ
    const newDescription = ticket.description 
      ? `${ticket.description}\n\n[${new Date().toISOString()}] ${updateMessage}`
      : `[${new Date().toISOString()}] ${updateMessage}`;
    
    return prisma.ticket.update({
      where: { id },
      data: { description: newDescription }
    });
  }

  static async updateTicketStatus(id: string, status: 'open' | 'in_progress' | 'resolved' | 'closed') {
    return prisma.ticket.update({
      where: { id },
      data: {
        status,
        ...(status === 'closed' && { updatedAt: new Date() })
      }
    });
  }

  static async updateTicketPriority(id: string, priority: 'low' | 'medium' | 'high') {
    return prisma.ticket.update({
      where: { id },
      data: { priority }
    });
  }

  static async deleteTicket(id: string) {
    return prisma.ticket.delete({ where: { id } });
  }

  static async getStatistics() {
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'open' } }),
      prisma.ticket.count({ where: { status: 'in_progress' } }),
      prisma.ticket.count({ where: { status: 'resolved' } }),
      prisma.ticket.count({ where: { status: 'closed' } }),
    ]);

    return { total, open, inProgress, resolved, closed };
  }

  // ✅ دوال إضافية مفيدة
  static async getTicketsByBusiness(businessId: string, businessType: 'restaurant' | 'store') {
    const where: any = {};
    if (businessType === 'restaurant') {
      where.restaurantId = businessId;
    } else {
      where.storeId = businessId;
    }
    
    return prisma.ticket.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async assignTicket(id: string, userId: string) {
    return prisma.ticket.update({
      where: { id },
      data: { 
        userId,
        status: 'in_progress'
      }
    });
  }

  static async resolveTicket(id: string, resolution?: string) {
    const updateData: any = { status: 'resolved' };
    if (resolution) {
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      const newDescription = ticket?.description 
        ? `${ticket.description}\n\n[RESOLVED] ${resolution}`
        : `[RESOLVED] ${resolution}`;
      updateData.description = newDescription;
    }
    
    return prisma.ticket.update({
      where: { id },
      data: updateData
    });
  }

  static async getTicketStatsByPriority() {
    const priorities = ['low', 'medium', 'high'];
    const results = await Promise.all(
      priorities.map(async (priority) => ({
        priority,
        count: await prisma.ticket.count({ where: { priority: priority as any } }),
        open: await prisma.ticket.count({ where: { priority: priority as any, status: 'open' } })
      }))
    );
    return results;
  }
}

export default TicketService;