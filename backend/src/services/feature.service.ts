// backend/src/services/feature.service.ts

import prisma from './prisma';
import { Decimal } from '@prisma/client/runtime/library';

export class FeatureService {
  static async findByCode(code: string) {
    return prisma.feature.findUnique({
      where: { code },
      include: { businessFeatures: true }
    });
  }

  static async getActiveFeatures() {
    return prisma.feature.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' }
    });
  }

  static async getFeaturesByCategory(category: string) {
    return prisma.feature.findMany({
      where: {
        isActive: true,
        category: category as any,
      }
    });
  }

  static async getFeaturesByGroup(group: string) {
    return prisma.feature.findMany({
      where: {
        isActive: true,
        group: group as any,
      }
    });
  }

  static async createFeature(data: {
    code: string;
    name: string;
    nameEn?: string;
    description?: string;
    descriptionEn?: string;
    category?: string;
    group?: string;
    isCore?: boolean;
    price?: number | Decimal;
    isOneTime?: boolean;
    isActive?: boolean;
    defaultInPlans?: any;
    dependsOn?: any;
    configSchema?: any;
  }) {
    return prisma.feature.create({
      data: {
        ...data,
        price: data.price ? new Decimal(data.price.toString()) : new Decimal(0),
      }
    });
  }

  static async updateFeature(code: string, data: any) {
    if (data.price) {
      data.price = new Decimal(data.price.toString());
    }

    return prisma.feature.update({
      where: { code },
      data
    });
  }

  static async assignFeatureToBusiness(data: {
    businessId: string;
    businessType: 'restaurant' | 'store';
    featureCode: string;
    isEnabled?: boolean;
    config?: any;
    expiresAt?: Date;
  }) {
    return prisma.businessFeature.create({
      data,
      include: { feature: true }
    });
  }

  static async getBusinessFeatures(businessId: string, businessType: 'restaurant' | 'store') {
    return prisma.businessFeature.findMany({
      where: { businessId, businessType },
      include: { feature: true }
    });
  }

  static async hasFeature(businessId: string, businessType: 'restaurant' | 'store', featureCode: string) {
    const feature = await prisma.businessFeature.findUnique({
      where: {
        businessId_businessType_featureCode: {
          businessId,
          businessType,
          featureCode,
        }
      }
    });
    return feature?.isEnabled ?? false;
  }

  static async toggleFeature(businessId: string, businessType: 'restaurant' | 'store', featureCode: string, isEnabled: boolean) {
    return prisma.businessFeature.update({
      where: {
        businessId_businessType_featureCode: {
          businessId,
          businessType,
          featureCode,
        }
      },
      data: { isEnabled }
    });
  }
}

export default FeatureService;
