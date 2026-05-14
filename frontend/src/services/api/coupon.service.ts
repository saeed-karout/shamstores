// frontend/src/services/api/coupon.service.ts

import apiClient from './client';

export type CouponType = 'percentage' | 'fixed';
export type CouponStatus = 'active' | 'expired' | 'used' | 'disabled';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: CouponStatus;
  restaurantId?: string;
  storeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponData {
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startDate: string;
  endDate: string;
}

export interface ApplyCouponResponse {
  isValid: boolean;
  discount: number;
  finalAmount: number;
  message?: string;
}

class CouponService {
  // Business owner routes
  async getCoupons(params?: { status?: string; page?: number; limit?: number }): Promise<Coupon[]> {
    return apiClient.get('/coupons', params);
  }

  async getCoupon(id: string): Promise<Coupon> {
    return apiClient.get(`/coupons/${id}`);
  }

  async createCoupon(data: CreateCouponData): Promise<Coupon> {
    return apiClient.post('/coupons', data);
  }

  async updateCoupon(id: string, data: Partial<CreateCouponData>): Promise<Coupon> {
    return apiClient.put(`/coupons/${id}`, data);
  }

  async deleteCoupon(id: string): Promise<void> {
    return apiClient.delete(`/coupons/${id}`);
  }

  async toggleCouponStatus(id: string, isActive: boolean): Promise<Coupon> {
    return apiClient.patch(`/coupons/${id}/toggle`, { isActive });
  }

  // Customer routes
  async applyCoupon(code: string, orderAmount: number): Promise<ApplyCouponResponse> {
    return apiClient.post('/coupons/apply', { code, orderAmount });
  }

  async getValidCoupons(): Promise<Coupon[]> {
    return apiClient.get('/coupons/valid');
  }

  // Admin routes
  async getAllCoupons(params?: { businessType?: string; businessId?: string }): Promise<Coupon[]> {
    return apiClient.get('/admin/coupons', params);
  }

  async deleteCouponAsAdmin(id: string): Promise<void> {
    return apiClient.delete(`/admin/coupons/${id}`);
  }
}

export const couponService = new CouponService();