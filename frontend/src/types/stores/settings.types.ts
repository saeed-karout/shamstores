// src/types/stores/settings.types.ts

export interface DeliverySettings {
  enableDelivery: boolean;
  baseFee: number;
  feePerKm: number;
  minDistance: number;
  maxDistance: number;
  freeDeliveryAbove: number;
  estimatedTime: number;
  cashOnDelivery: boolean;
  onlinePayment: boolean;
}

export interface SocialMediaLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
  snapchat?: string;
}

export interface DesignSettings {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  buttonStyle: 'rounded' | 'pill' | 'square';
  cardStyle: 'shadow' | 'flat' | 'border';
}

export interface PaymentSettings {
  enableCashOnDelivery: boolean;
  enableOnlinePayment: boolean;
  enableCardPayment: boolean;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  paypalClientId?: string;
  paypalSecret?: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  newOrderEmail?: string;
  newOrderPhone?: string;
  lowStockAlert: boolean;
  lowStockThreshold: number;
}

export interface DomainSettings {
  customDomain: string;
  customDomainVerified: boolean;
  customDomainVerifiedAt?: Date;
  customDomainVerificationCode: string;
  subdomain: string;
  sslEnabled: boolean;
}

export interface StoreGeneralInfo {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  currency: string;
  language: string;
}

export interface StoreSettings {
  general: StoreGeneralInfo;
  design: DesignSettings;
  delivery: DeliverySettings;
  social: SocialMediaLinks;
  payment: PaymentSettings;
  notifications: NotificationSettings;
  domain: DomainSettings;
}