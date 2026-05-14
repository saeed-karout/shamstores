// frontend/src/api/marketing.ts

import apiClient from './client';
import {
  MarketingSection,
  MarketingSettings,
  CreateMarketingSectionPayload,
  UpdateMarketingSectionPayload,
  UpdateSectionOrderPayload,
  MarketingBusinessType
} from '../types/marketing';

const BASE_URL = '/marketing';

export const marketingApi = {
  // Get marketing settings and sections
  getSettings: async (
    businessType: MarketingBusinessType,
    businessId: string
  ): Promise<MarketingSettings> => {
    const response = await apiClient.get(BASE_URL, {
      params: { businessType, businessId }
    });
    return response.data.data;
  },

  // Update section order
  updateSectionOrder: async (payload: UpdateSectionOrderPayload): Promise<{ sectionOrder: string[] }> => {
    const response = await apiClient.put(`${BASE_URL}/section-order`, payload);
    return response.data.data;
  },

  // Create new marketing section
  createSection: async (payload: CreateMarketingSectionPayload): Promise<MarketingSection> => {
    const response = await apiClient.post(`${BASE_URL}/sections`, payload);
    return response.data.data;
  },

  // Update marketing section
  updateSection: async (
    id: string,
    payload: UpdateMarketingSectionPayload,
    businessType: MarketingBusinessType,
    businessId: string
  ): Promise<MarketingSection> => {
    const response = await apiClient.put(`${BASE_URL}/sections/${id}`, {
      ...payload,
      businessType,
      businessId
    });
    return response.data.data;
  },

  // Delete marketing section
  deleteSection: async (
    id: string,
    businessType: MarketingBusinessType,
    businessId: string
  ): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/sections/${id}`, {
      params: { businessType, businessId }
    });
  }
};