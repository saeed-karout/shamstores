// backend/src/models/Store.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface StoreAttributes {
  id: string;
  userId: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
  subdomain?: string;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  customDomainVerifiedAt?: Date | null;
  customDomainVerificationCode?: string;
  planId: string;
  deliverySettings?: {
    enableDelivery: boolean;
    baseFee: number;
    feePerKm: number;
    minDistance: number;
    maxDistance: number;
    freeDeliveryAbove: number;
    estimatedTime: number;
  };
  settings?: {
    enableDelivery: boolean;
    deliveryFee: number;
    freeDeliveryAbove: number;
    estimatedTime: number;
    returnPolicy?: string;
    exchangePolicy?: string;
  };
  timezone?: string;
  currency?: string;
  language?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StoreCreationAttributes extends Optional<StoreAttributes,
  'id' | 'primaryColor' | 'secondaryColor' | 'isActive' | 'settings' | 'deliverySettings' |
  'subdomain' | 'customDomain' | 'customDomainVerified' |
  'customDomainVerifiedAt' | 'customDomainVerificationCode'
> {}

class Store extends Model<StoreAttributes, StoreCreationAttributes> implements StoreAttributes {
  public id!: string;
  public userId!: string;
  public name!: string;
  public slug!: string;
  public email!: string;
  public phone!: string;
  public logo!: string;
  public coverImage!: string;
  public description!: string;
  public address!: string;
  public latitude!: number;
  public longitude!: number;
  public primaryColor!: string;
  public secondaryColor!: string;
  public isActive!: boolean;
  public subdomain!: string;
  public customDomain!: string | null;
  public customDomainVerified!: boolean;
  public customDomainVerifiedAt!: Date | null;
  public customDomainVerificationCode!: string;
  public planId!: string;
  public deliverySettings!: StoreAttributes['deliverySettings'];
  public settings!: StoreAttributes['settings'];
  public timezone!: string;
  public currency!: string;
  public language!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Store.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { isEmail: true }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    coverImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'cover_image'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    primaryColor: {
      type: DataTypes.STRING(20),
      defaultValue: '#3B82F6',
      field: 'primary_color'
    },
    secondaryColor: {
      type: DataTypes.STRING(20),
      defaultValue: '#10B981',
      field: 'secondary_color'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    subdomain: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      field: 'subdomain'
    },
    customDomain: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'custom_domain'
    },
    customDomainVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'custom_domain_verified'
    },
    customDomainVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'custom_domain_verified_at'
    },
    customDomainVerificationCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'custom_domain_verification_code'
    },
    timezone: {
      type: DataTypes.STRING(50),
      defaultValue: 'Asia/Riyadh',
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'SAR',
      allowNull: true
    },
    language: {
      type: DataTypes.STRING(2),
      defaultValue: 'ar',
      allowNull: true
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'plan_id',
      defaultValue: '11111111-1111-1111-1111-111111111111'
    },
    deliverySettings: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'delivery_settings',
      defaultValue: {
        enableDelivery: true,
        baseFee: 5,
        feePerKm: 2,
        minDistance: 1,
        maxDistance: 20,
        freeDeliveryAbove: 100,
        estimatedTime: 45
      }
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        enableDelivery: true,
        deliveryFee: 5,
        freeDeliveryAbove: 100,
        estimatedTime: 45
      }
    }
  },
  {
    sequelize,
    modelName: 'Store',
    tableName: 'stores',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (store: Store) => {
        if (!store.customDomainVerificationCode) {
          store.customDomainVerificationCode = `verify-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
        }
        if (!store.deliverySettings) {
          store.deliverySettings = {
            enableDelivery: true,
            baseFee: 5,
            feePerKm: 2,
            minDistance: 1,
            maxDistance: 20,
            freeDeliveryAbove: 100,
            estimatedTime: 45
          };
        }
      }
    }
  }
);

export default Store;