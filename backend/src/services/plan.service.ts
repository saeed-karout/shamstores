// backend/src/services/plan.service.ts

import prisma from './prisma';

export interface PlanLimits {
  maxRestaurants: number;
  maxStores: number;
  maxUsers: number;
  maxMenuItems: number;
  maxProducts: number;
  maxOrders: number;
}

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
    price: number;
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
    hasWhatsapp?: boolean;
    hasOnlineOrders?: boolean;
    hasCustomDomain?: boolean;
    hasAnalytics?: boolean;
    hasTableQr?: boolean;
    hasMultiLanguage?: boolean;
    hasPromotions?: boolean;
    hasCoupons?: boolean;
  }) {
    return prisma.plan.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        billingCycle: data.billingCycle,
        maxRestaurants: data.maxRestaurants || 1,
        maxStores: data.maxStores || 1,
        maxUsers: data.maxUsers || 5,
        maxMenuItems: data.maxMenuItems || 100,
        maxProducts: data.maxProducts || 100,
        maxOrders: data.maxOrders || 1000,
        features: data.features ? JSON.stringify(data.features) : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        position: data.position || 0,
        isPopular: data.isPopular || false,
        hasWhatsapp: data.hasWhatsapp || false,
        hasOnlineOrders: data.hasOnlineOrders || false,
        hasCustomDomain: data.hasCustomDomain || false,
        hasAnalytics: data.hasAnalytics || false,
        hasTableQr: data.hasTableQr || false,
        hasMultiLanguage: data.hasMultiLanguage || false,
        hasPromotions: data.hasPromotions || false,
        hasCoupons: data.hasCoupons || false
      },
      include: {
        restaurants: true,
        stores: true,
      }
    });
  }

  static async update(id: string, data: any) {
    const updateData: any = { ...data };
    
    // إزالة الحقول التي لا يجب تحديثها
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // تنظيف القيم
    if (updateData.price !== undefined) {
      updateData.price = typeof updateData.price === 'number' ? updateData.price : Number(updateData.price);
    }
    
    // تحويل features إلى JSON string إذا كان موجوداً
    if (updateData.features !== undefined) {
      updateData.features = JSON.stringify(updateData.features);
    }
    
    return prisma.plan.update({
      where: { id },
      data: updateData,
      include: {
        restaurants: true,
        stores: true,
      }
    });
  }

  static async delete(id: string) {
    const restaurantsCount = await prisma.restaurant.count({ where: { planId: id } });
    const storesCount = await prisma.store.count({ where: { planId: id } });
    
    if (restaurantsCount > 0 || storesCount > 0) {
      throw new Error(`لا يمكن حذف الخطة لأنها مرتبطة بـ ${restaurantsCount} مطعم و ${storesCount} متجر`);
    }
    
    return prisma.plan.delete({ where: { id } });
  }

  static async getPopularPlans() {
    return prisma.plan.findMany({
      where: { isActive: true, isPopular: true },
      orderBy: { position: 'asc' }
    });
  }

  static async getFeatures(planId: string): Promise<string[]> {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return [];
    
    const features: string[] = [];
    
    if (plan.hasWhatsapp) features.push('whatsapp');
    if (plan.hasOnlineOrders) features.push('online_orders');
    if (plan.hasCustomDomain) features.push('custom_domain');
    if (plan.hasAnalytics) features.push('analytics');
    if (plan.hasTableQr) features.push('table_qr');
    if (plan.hasMultiLanguage) features.push('multi_language');
    if (plan.hasPromotions) features.push('promotions');
    if (plan.hasCoupons) features.push('coupons');
    
    // معالجة features كـ JSON
    if (plan.features) {
      try {
        let parsedFeatures = plan.features;
        if (typeof parsedFeatures === 'string') {
          parsedFeatures = JSON.parse(parsedFeatures);
        }
        if (Array.isArray(parsedFeatures)) {
          features.push(...parsedFeatures.map(f => String(f)));
        }
      } catch (error) {
        console.error('Error parsing features:', error);
      }
    }
    
    return features;
  }

  static async updateFeatures(planId: string, features: any) {
    return prisma.plan.update({
      where: { id: planId },
      data: { features: JSON.stringify(features) }
    });
  }

  static async getPlanLimits(planId: string): Promise<PlanLimits | null> {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: {
        maxRestaurants: true,
        maxStores: true,
        maxUsers: true,
        maxMenuItems: true,
        maxProducts: true,
        maxOrders: true
      }
    });
    
    if (!plan) return null;
    
    return {
      maxRestaurants: plan.maxRestaurants,
      maxStores: plan.maxStores,
      maxUsers: plan.maxUsers,
      maxMenuItems: plan.maxMenuItems,
      maxProducts: plan.maxProducts,
      maxOrders: plan.maxOrders
    };
  }

  static async checkBusinessLimit(
    businessId: string, 
    businessType: 'restaurant' | 'store', 
    limitType: keyof PlanLimits
  ): Promise<boolean> {
    let planId: string | null = null;
    
    if (businessType === 'restaurant') {
      const restaurant = await prisma.restaurant.findUnique({ where: { id: businessId }, select: { planId: true } });
      planId = restaurant?.planId || null;
    } else {
      const store = await prisma.store.findUnique({ where: { id: businessId }, select: { planId: true } });
      planId = store?.planId || null;
    }
    
    if (!planId) return false;
    
    const limits = await this.getPlanLimits(planId);
    if (!limits) return false;
    
    const currentCount = await this.getCurrentUsage(businessId, businessType, limitType);
    const limit = limits[limitType];
    
    return currentCount < limit;
  }

  static async getCurrentUsage(
    businessId: string, 
    businessType: 'restaurant' | 'store', 
    type: keyof PlanLimits
  ): Promise<number> {
    switch (type) {
      case 'maxUsers':
        return prisma.user.count({ 
          where: { 
            [businessType === 'restaurant' ? 'restaurantId' : 'storeId']: businessId,
            role: 'staff'
          } 
        });
      case 'maxMenuItems':
        if (businessType === 'restaurant') {
          return prisma.menuItem.count({ where: { restaurantId: businessId } });
        }
        return 0;
      case 'maxProducts':
        if (businessType === 'store') {
          return prisma.product.count({ where: { storeId: businessId } });
        }
        return 0;
      case 'maxOrders':
        return prisma.order.count({ 
          where: { 
            [businessType === 'restaurant' ? 'restaurantId' : 'storeId']: businessId 
          } 
        });
      case 'maxRestaurants':
      case 'maxStores':
        return 1; // كل نشاط تجاري يحسب كواحد
      default:
        return 0;
    }
  }

  // ✅ دالة للحصول على الخطة المناسبة حسب عدد المستخدمين
  static async getRecommendedPlan(userCount: number, productCount: number): Promise<string> {
    if (userCount <= 5 && productCount <= 50) return 'free';
    if (userCount <= 10 && productCount <= 500) return 'basic';
    if (userCount <= 20 && productCount <= 5000) return 'pro';
    return 'enterprise';
  }
}

export default PlanService;