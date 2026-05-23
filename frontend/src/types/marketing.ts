// frontend/src/types/marketing.ts

export type MarketingBusinessType = 'restaurant' | 'store';
export type MarketingSectionType = 'announcement' | 'banner' | 'offer';

// تحديد أنواع الأقسام حسب الصلاحيات
export const ADMIN_ONLY_SECTIONS: MarketingSectionType[] = ['announcement'];
export const BUSINESS_SECTIONS: MarketingSectionType[] = ['banner', 'offer'];

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

export interface UpdateSectionOrderPayload {
  businessType: MarketingBusinessType;
  businessId: string;
  sectionOrder: MarketingSectionType[];
}