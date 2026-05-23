// models/Plan.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PlanAttributes {
  id: string;
  name: 'free' | 'basic' | 'pro' | 'enterprise';
  price: number;
  // حقول المطعم
  maxItems: number;
  maxTables: number;
  maxStaff: number;
  // حقول المتجر
  maxProducts: number;
  maxOrdersPerMonth: number;
  maxStorage: number;
  // الميزات المشتركة
  hasWhatsapp: boolean;
  hasOnlineOrders: boolean;
  hasCustomDomain: boolean;
  hasAnalytics: boolean;
  hasTableQr: boolean;
  hasMultiLanguage: boolean;
  hasPromotions: boolean;
  hasCoupons: boolean;
  // ميزات المتجر الخاصة
  hasInventory: boolean;
  hasReturns: boolean;
  hasReviews: boolean;
  hasWishlist: boolean;
  hasCompare: boolean;
  hasSeo: boolean;
  hasEmailMarketing: boolean;
  hasAbandonedCart: boolean;
  hasBulkImport: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
  // الوصف
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlanCreationAttributes extends Optional<PlanAttributes, 
  'id' | 'isActive' | 'maxProducts' | 'maxOrdersPerMonth' | 'maxStorage' |
  'hasInventory' | 'hasReturns' | 'hasReviews' | 'hasWishlist' | 'hasCompare' |
  'hasSeo' | 'hasEmailMarketing' | 'hasAbandonedCart' | 'hasBulkImport' |
  'hasApiAccess' | 'hasPrioritySupport'
> {}

class Plan extends Model<PlanAttributes, PlanCreationAttributes> implements PlanAttributes {
  public id!: string;
  public name!: 'free' | 'basic' | 'pro' | 'enterprise';
  public price!: number;
  
  // حقول المطعم
  public maxItems!: number;
  public maxTables!: number;
  public maxStaff!: number;
  
  // حقول المتجر
  public maxProducts!: number;
  public maxOrdersPerMonth!: number;
  public maxStorage!: number;
  
  // الميزات المشتركة
  public hasWhatsapp!: boolean;
  public hasOnlineOrders!: boolean;
  public hasCustomDomain!: boolean;
  public hasAnalytics!: boolean;
  public hasTableQr!: boolean;
  public hasMultiLanguage!: boolean;
  public hasPromotions!: boolean;
  public hasCoupons!: boolean;
  
  // ميزات المتجر الخاصة
  public hasInventory!: boolean;
  public hasReturns!: boolean;
  public hasReviews!: boolean;
  public hasWishlist!: boolean;
  public hasCompare!: boolean;
  public hasSeo!: boolean;
  public hasEmailMarketing!: boolean;
  public hasAbandonedCart!: boolean;
  public hasBulkImport!: boolean;
  public hasApiAccess!: boolean;
  public hasPrioritySupport!: boolean;
  
  public description!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Plan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.ENUM('free', 'basic', 'pro', 'enterprise'),
      allowNull: false,
      unique: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // ==================== حقول المطعم ====================
    maxItems: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      field: 'max_items'
    },
    maxTables: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'max_tables'
    },
    maxStaff: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'max_staff'
    },
    
    // ==================== حقول المتجر ====================
    maxProducts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
      field: 'max_products'
    },
    maxOrdersPerMonth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      field: 'max_orders_per_month'
    },
    maxStorage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100, // MB
      field: 'max_storage'
    },
    
    // ==================== الميزات المشتركة ====================
    hasWhatsapp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_whatsapp'
    },
    hasOnlineOrders: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_online_orders'
    },
    hasCustomDomain: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_custom_domain'
    },
    hasAnalytics: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_analytics'
    },
    hasTableQr: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_table_qr'
    },
    hasMultiLanguage: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_multi_language'
    },
    hasPromotions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_promotions'
    },
    hasCoupons: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_coupons'
    },
    
    // ==================== ميزات المتجر الخاصة ====================
    hasInventory: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_inventory'
    },
    hasReturns: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_returns'
    },
    hasReviews: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_reviews'
    },
    hasWishlist: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_wishlist'
    },
    hasCompare: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_compare'
    },
    hasSeo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_seo'
    },
    hasEmailMarketing: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_email_marketing'
    },
    hasAbandonedCart: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_abandoned_cart'
    },
    hasBulkImport: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_bulk_import'
    },
    hasApiAccess: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_api_access'
    },
    hasPrioritySupport: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_priority_support'
    },
    
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  },
  {
    sequelize,
    modelName: 'Plan',
    tableName: 'plans',
    timestamps: true,
    underscored: true
  }
);

export default Plan;