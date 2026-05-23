// frontend/src/services/api/marketing.service.ts

import apiClient from './client';

export type MarketingBusinessType = 'restaurant' | 'store';
export type MarketingSectionType = 'announcement' | 'banner' | 'offer';

export interface MarketingSection {
  id: string;
  businessType: MarketingBusinessType;
  businessId: string;
  sectionType: MarketingSectionType;
  title: string | null;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingSettings {
  sectionOrder: MarketingSectionType[];
  sections: MarketingSection[];
}

export interface CreateMarketingSectionPayload {
  sectionType: MarketingSectionType;
  title?: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  startAt?: string | null;
  endAt?: string | null;
}

export interface UpdateMarketingSectionPayload extends Partial<CreateMarketingSectionPayload> {}

class MarketingService {
  private getBaseParams(businessType: MarketingBusinessType, businessId: string) {
    return { businessType, businessId };
  }

  async getSettings(businessType: MarketingBusinessType, businessId: string): Promise<MarketingSettings> {
    return apiClient.get('/marketing', this.getBaseParams(businessType, businessId));
  }

  async updateSectionOrder(
    businessType: MarketingBusinessType,
    businessId: string,
    sectionOrder: MarketingSectionType[]
  ): Promise<{ sectionOrder: MarketingSectionType[] }> {
    return apiClient.put('/marketing/section-order', {
      businessType,
      businessId,
      sectionOrder
    });
  }

  async createSection(
    businessType: MarketingBusinessType,
    businessId: string,
    data: CreateMarketingSectionPayload
  ): Promise<MarketingSection> {
    return apiClient.post('/marketing/sections', {
      businessType,
      businessId,
      ...data
    });
  }

  async updateSection(
    id: string,
    businessType: MarketingBusinessType,
    businessId: string,
    data: UpdateMarketingSectionPayload
  ): Promise<MarketingSection> {
    return apiClient.put(`/marketing/sections/${id}`, {
      businessType,
      businessId,
      ...data
    });
  }

  async deleteSection(id: string, businessType: MarketingBusinessType, businessId: string): Promise<void> {
    return apiClient.delete(`/marketing/sections/${id}?businessType=${businessType}&businessId=${businessId}`);
  }

  // Public marketing data (used in subdomains)
  async getPublicMarketingData(businessType: MarketingBusinessType, businessId: string): Promise<{
    sectionOrder: MarketingSectionType[];
    announcements: MarketingSection[];
    banners: MarketingSection[];
    offers: MarketingSection[];
  }> {
    return apiClient.get(`/public/marketing/${businessType}/${businessId}`);
  }
}

export const marketingService = new MarketingService();