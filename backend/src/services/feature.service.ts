// backend/src/services/feature.service.ts

import prisma from './prisma';

export class FeatureService {
  static async findByCode(code: string) {
    return prisma.feature.findUnique({
      where: { code }
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
    price?: number;
    isOneTime?: boolean;
    isActive?: boolean;
    defaultInPlans?: any;
    dependsOn?: any;
    configSchema?: any;
  }) {
    return prisma.feature.create({
      data: {
        code: data.code,
        name: data.name,
        nameEn: data.nameEn,
        description: data.description,
        descriptionEn: data.descriptionEn,
        category: data.category || 'both',
        group: data.group || 'basic',
        isCore: data.isCore || false,
        price: data.price || 0,
        isOneTime: data.isOneTime || false,
        isActive: data.isActive !== undefined ? data.isActive : true,
        defaultInPlans: data.defaultInPlans,
        dependsOn: data.dependsOn,
        configSchema: data.configSchema
      }
    });
  }

  static async updateFeature(code: string, data: any) {
    const updateData: any = { ...data };
    
    delete updateData.code;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    return prisma.feature.update({
      where: { code },
      data: updateData
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
    const existing = await prisma.businessFeature.findUnique({
      where: {
        businessId_businessType_featureCode: {
          businessId: data.businessId,
          businessType: data.businessType,
          featureCode: data.featureCode
        }
      }
    });

    if (existing) {
      return prisma.businessFeature.update({
        where: {
          businessId_businessType_featureCode: {
            businessId: data.businessId,
            businessType: data.businessType,
            featureCode: data.featureCode
          }
        },
        data: {
          isEnabled: data.isEnabled !== undefined ? data.isEnabled : existing.isEnabled,
          config: data.config,
          expiresAt: data.expiresAt
        }
        // ❌ تم إزالة include: { feature: true }
      });
    }

    return prisma.businessFeature.create({
      data: {
        businessId: data.businessId,
        businessType: data.businessType,
        featureCode: data.featureCode,
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
        config: data.config,
        expiresAt: data.expiresAt
      }
      // ❌ تم إزالة include: { feature: true }
    });
  }

  static async getBusinessFeatures(businessId: string, businessType: 'restaurant' | 'store') {
    const features = await prisma.businessFeature.findMany({
      where: { businessId, businessType }
      // ❌ تم إزالة include: { feature: true }
    });

    // ✅ جلب الميزات بشكل منفصل
    const featureDetails = await Promise.all(
      features.map(async (bf) => {
        const feature = await prisma.feature.findUnique({
          where: { code: bf.featureCode }
        });
        return {
          ...bf,
          feature
        };
      })
    );

    // إضافة الميزات الأساسية (isCore = true) التي لم يتم تعيينها بشكل صريح
    const coreFeatures = await prisma.feature.findMany({
      where: { isCore: true, isActive: true }
    });

    const assignedFeatureCodes = new Set(features.map(f => f.featureCode));
    
    for (const coreFeature of coreFeatures) {
      if (!assignedFeatureCodes.has(coreFeature.code)) {
        featureDetails.push({
          id: `temp-${coreFeature.code}`,
          businessId,
          businessType,
          featureCode: coreFeature.code,
          isEnabled: true,
          isOverridden: false,
          overrideReason: null,
          overriddenBy: null,
          expiresAt: null,
          config: null,
          assignedBy: null,
          assignedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          feature: coreFeature
        } as any);
      }
    }

    return featureDetails;
  }

  static async hasFeature(businessId: string, businessType: 'restaurant' | 'store', featureCode: string): Promise<boolean> {
    const feature = await prisma.businessFeature.findUnique({
      where: {
        businessId_businessType_featureCode: {
          businessId,
          businessType,
          featureCode,
        }
      }
    });
    
    if (feature) {
      if (feature.expiresAt && new Date() > feature.expiresAt) {
        return false;
      }
      return feature.isEnabled;
    }
    
    const coreFeature = await prisma.feature.findUnique({
      where: { code: featureCode }
    });
    
    return coreFeature?.isCore === true;
  }

  static async toggleFeature(businessId: string, businessType: 'restaurant' | 'store', featureCode: string, isEnabled: boolean) {
    const existing = await prisma.businessFeature.findUnique({
      where: {
        businessId_businessType_featureCode: {
          businessId,
          businessType,
          featureCode,
        }
      }
    });

    if (existing) {
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

    return prisma.businessFeature.create({
      data: {
        businessId,
        businessType,
        featureCode,
        isEnabled
      }
    });
  }

  static async deleteBusinessFeature(businessId: string, businessType: 'restaurant' | 'store', featureCode: string) {
    return prisma.businessFeature.delete({
      where: {
        businessId_businessType_featureCode: {
          businessId,
          businessType,
          featureCode,
        }
      }
    });
  }

  static async getAvailableFeatures(businessId: string, businessType: 'restaurant' | 'store') {
    const [allFeatures, assignedFeatures] = await Promise.all([
      prisma.feature.findMany({
        where: { isActive: true },
        orderBy: { group: 'asc' }
      }),
      prisma.businessFeature.findMany({
        where: { businessId, businessType }
      })
    ]);

    // ✅ جلب تفاصيل الميزات المعينة
    const assignedWithDetails = await Promise.all(
      assignedFeatures.map(async (af) => {
        const feature = await prisma.feature.findUnique({
          where: { code: af.featureCode }
        });
        return { ...af, feature };
      })
    );

    const assignedMap = new Map(assignedWithDetails.map(f => [f.featureCode, f]));

    return allFeatures.map(feature => ({
      ...feature,
      isEnabled: assignedMap.get(feature.code)?.isEnabled ?? feature.isCore,
      assignedFeature: assignedMap.get(feature.code) || null
    }));
  }
}

export default FeatureService;