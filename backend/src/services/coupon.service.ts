// backend/src/services/coupon.service.ts

import prisma from './prisma';
import { Decimal } from '@prisma/client/runtime/library';

export class CouponService {
  static async findById(id: string) {
    return prisma.coupon.findUnique({
      where: { id },
      include: { restaurant: true, store: true, creator: true }
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
      include: { creator: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getStoreCoupons(storeId: string) {
    return prisma.coupon.findMany({
      where: { storeId, isActive: true },
      include: { creator: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createCoupon(data: {
    restaurantId?: string;
    storeId?: string;
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number | Decimal;
    maxUses?: number;
    minOrderAmount?: number | Decimal;
    maxDiscountAmount?: number | Decimal;
    validFrom: Date;
    validUntil: Date;
    createdBy: string;
  }) {
    return prisma.coupon.create({
      data: {
        ...data,
        discountValue: new Decimal(data.discountValue.toString()),
        minOrderAmount: data.minOrderAmount ? new Decimal(data.minOrderAmount.toString()) : undefined,
        maxDiscountAmount: data.maxDiscountAmount ? new Decimal(data.maxDiscountAmount.toString()) : undefined,
      },
      include: { creator: true }
    });
  }

  static async updateCoupon(id: string, data: any) {
    if (data.discountValue) {
      data.discountValue = new Decimal(data.discountValue.toString());
    }
    if (data.minOrderAmount) {
      data.minOrderAmount = new Decimal(data.minOrderAmount.toString());
    }
    if (data.maxDiscountAmount) {
      data.maxDiscountAmount = new Decimal(data.maxDiscountAmount.toString());
    }

    return prisma.coupon.update({
      where: { id },
      data,
      include: { creator: true }
    });
  }

  static async validateCoupon(code: string, orderAmount: Decimal) {
    const coupon = await prisma.coupon.findUnique({
      where: { code }
    });

    if (!coupon) return { valid: false, error: 'Coupon not found' };
    if (!coupon.isActive) return { valid: false, error: 'Coupon is inactive' };
    if (coupon.validFrom > new Date()) return { valid: false, error: 'Coupon not yet valid' };
    if (coupon.validUntil < new Date()) return { valid: false, error: 'Coupon expired' };
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) return { valid: false, error: 'Coupon usage limit reached' };
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return { valid: false, error: `Minimum order amount: ${coupon.minOrderAmount}` };
    }

    return { valid: true, coupon };
  }

  static async useCoupon(couponId: string) {
    return prisma.coupon.update({
      where: { id: couponId },
      data: { currentUses: { increment: 1 } }
    });
  }

  static async deleteCoupon(id: string) {
    return prisma.coupon.delete({ where: { id } });
  }
}

export default CouponService;
