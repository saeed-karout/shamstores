// backend/src/services/coupon.service.ts

import prisma from './prisma';

export class CouponService {
  static async findById(id: string) {
    return prisma.coupon.findUnique({
      where: { id },
      include: { 
        restaurant: true, 
        store: true 
      }
    });
  }

  static async findByCode(code: string) {
    return prisma.coupon.findUnique({
      where: { code },
      include: { restaurant: true, store: true }
    });
  }

  static async getRestaurantCoupons(restaurantId: string) {
    return prisma.coupon.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getStoreCoupons(storeId: string) {
    return prisma.coupon.findMany({
      where: { storeId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createCoupon(data: {
    restaurantId?: string;
    storeId?: string;
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    usageLimit?: number;
    minOrderAmount?: number;
    startDate: Date;
    endDate: Date;
  }) {
    return prisma.coupon.create({
      data: {
        restaurantId: data.restaurantId,
        storeId: data.storeId,
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        usageLimit: data.usageLimit,
        minOrderAmount: data.minOrderAmount,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: true,
        usageCount: 0
      }
    });
  }

  static async updateCoupon(id: string, data: any) {
    const updateData: any = { ...data };
    
    // إزالة الحقول التي لا يجب تحديثها مباشرة
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.usageCount;
    
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    return prisma.coupon.update({
      where: { id },
      data: updateData
    });
  }

  static async validateCoupon(code: string, orderAmount: number) {
    const now = new Date();
    
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      }
    });

    if (!coupon) {
      return { valid: false, error: 'الكوبون غير موجود' };
    }
    
    // التحقق من عدد الاستخدامات
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, error: 'تم الوصول إلى الحد الأقصى لاستخدام هذا الكوبون' };
    }
    
    // التحقق من الحد الأدنى للطلب
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return { valid: false, error: `الحد الأدنى للطلب هو ${coupon.minOrderAmount}` };
    }

    return { valid: true, coupon };
  }

  static async useCoupon(couponId: string) {
    return prisma.coupon.update({
      where: { id: couponId },
      data: { usageCount: { increment: 1 } }
    });
  }

  static async deleteCoupon(id: string) {
    return prisma.coupon.delete({ where: { id } });
  }
}

export default CouponService;