// backend/src/services/plan.service.ts

import prisma from './prisma';
import { Decimal } from '@prisma/client/runtime/library';

export class PlanService {
  static async findById(id: string) {
    return prisma.plan.findUnique({
      where: { id },
      include: {
        restaurants: true,
        stores: true,
      }
    });
  }

  static async findBySlug(slug: string) {
    return prisma.plan.findUnique({
      where: { slug }
    });
  }

  static async findAll(includeInactive = false) {
    return prisma.plan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { position: 'asc' }
    });
  }

  static async create(data: {
    name: string;
    slug: string;
    description?: string;
    price: number | Decimal;
    billingCycle?: string;
    maxRestaurants?: number;
    maxStores?: number;
    maxUsers?: number;
    maxMenuItems?: number;
    maxProducts?: number;
    maxOrders?: number;
    features?: any;
    isActive?: boolean;
    position?: number;
    isPopular?: boolean;
  }) {
    return prisma.plan.create({
      data: {
        ...data,
        price: new Decimal(data.price.toString()),
      },
      include: {
        restaurants: true,
        stores: true,
      }
    });
  }

  static async update(id: string, data: any) {
    if (data.price) {
      data.price = new Decimal(data.price.toString());
    }

    return prisma.plan.update({
      where: { id },
      data,
      include: {
        restaurants: true,
        stores: true,
      }
    });
  }

  static async delete(id: string) {
    return prisma.plan.delete({ where: { id } });
  }

  static async getPopularPlans() {
    return prisma.plan.findMany({
      where: { isActive: true, isPopular: true },
      orderBy: { position: 'asc' }
    });
  }

  static async getFeatures(planId: string) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    return plan?.features || [];
  }

  static async updateFeatures(planId: string, features: any) {
    return prisma.plan.update({
      where: { id: planId },
      data: { features }
    });
  }
}

export default PlanService;
