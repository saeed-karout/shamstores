// frontend/src/services/api/plan.service.ts

import apiClient from './client';

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  displayNameEn: string;
  slug?: string;
  price: number;
  duration: number;
  features: Record<string, any>;
  description?: string;
  maxRestaurants?: number;
  maxStores?: number;
  maxUsers?: number;
  maxMenuItems?: number;
  maxProducts?: number;
  maxOrders?: number;
  maxTables?: number;
  maxStaff?: number;
  position?: number;
  isPopular?: boolean;
  isActive: boolean;
  hasWhatsapp?: boolean;
  hasOnlineOrders?: boolean;
  hasCustomDomain?: boolean;
  hasAnalytics?: boolean;
  hasTableQr?: boolean;
  hasMultiLanguage?: boolean;
  hasPromotions?: boolean;
  hasCoupons?: boolean;
  hasMarketing?: boolean;
  hasInventory?: boolean;
  hasReturns?: boolean;
  hasReviews?: boolean;
  hasWishlist?: boolean;
  hasCompare?: boolean;
  hasSeo?: boolean;
  hasEmailMarketing?: boolean;
  hasAbandonedCart?: boolean;
  hasBulkImport?: boolean;
  hasApiAccess?: boolean;
  hasPrioritySupport?: boolean;
  hasBrandingRemoval?: boolean;
}

export interface UpgradeRequest {
  id: string;
  currentPlanId: string;
  requestedPlanId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

class PlanService {
  async getPlans(): Promise<Plan[]> {
    return apiClient.get('/plans');
  }

  async getCurrentPlan(): Promise<Plan & { expiresAt?: string }> {
    return apiClient.get('/plans/current');
  }

  async getCurrentPlanMe(): Promise<Plan & { expiresAt?: string }> {
    return apiClient.get('/plans/current/me');
  }

  async requestUpgrade(planId: string): Promise<UpgradeRequest> {
    return apiClient.post('/plans/upgrade/request', { planId });
  }

  async getUpgradeRequests(params?: { status?: string }): Promise<UpgradeRequest[]> {
    return apiClient.get('/plans/upgrade/requests', params);
  }

  async approveUpgradeRequest(requestId: string): Promise<UpgradeRequest> {
    return apiClient.post(`/plans/upgrade/requests/${requestId}/approve`);
  }

  async rejectUpgradeRequest(requestId: string, reason?: string): Promise<UpgradeRequest> {
    return apiClient.post(`/plans/upgrade/requests/${requestId}/reject`, { reason });
  }

  // Admin only
  async createPlan(data: Partial<Plan>): Promise<Plan> {
    return apiClient.post('/admin/plans', data);
  }

  async updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
    return apiClient.put(`/admin/plans/${id}`, data);
  }

  async deletePlan(id: string): Promise<void> {
    return apiClient.delete(`/admin/plans/${id}`);
  }
}

export const planService = new PlanService();