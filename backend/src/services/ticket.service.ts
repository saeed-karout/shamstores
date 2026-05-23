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
        messages: {
          include: { user: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  static async getUserTickets(userId: string) {
    return prisma.ticket.findMany({
      where: { userId },
      include: { messages: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getRestaurantTickets(restaurantId: string) {
    return prisma.ticket.findMany({
      where: { restaurantId },
      include: { user: true, messages: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getStoreTickets(storeId: string) {
    return prisma.ticket.findMany({
      where: { storeId },
      include: { user: true, messages: true },
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
    category?: string;
    priority?: string;
    attachments?: any;
  }) {
    return prisma.ticket.create({
      data,
      include: { user: true, messages: true }
    });
  }

  static async addTicketMessage(ticketId: string, userId: string, message: string, attachments?: any) {
    return prisma.ticketMessage.create({
      data: {
        ticketId,
        userId,
        message,
        attachments,
      },
      include: { user: true }
    });
  }

  static async updateTicketStatus(id: string, status: 'open' | 'in_progress' | 'resolved' | 'closed') {
    return prisma.ticket.update({
      where: { id },
      data: {
        status,
        ...(status === 'closed' && { closedAt: new Date() })
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
}

export default TicketService;
