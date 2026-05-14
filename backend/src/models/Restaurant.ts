// backend/src/models/Restaurant.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface RestaurantAttributes {
  id: string;
  planId: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  ownerId?: string;
  whatsapp?: string;
  address?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  openingHours?: object;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  latitude?: number;
  longitude?: number;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  templateId: number;
  subdomain?: string;
  customDomain?: string;
  customDomainVerified?: boolean;
  customDomainVerifiedAt?: Date | null;  
  customDomainVerificationCode?: string;
  metaTitle?: string;
  metaDescription?: string;
  isActive: boolean;
  subscriptionStart?: Date;
  subscriptionEnd?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  
  deliverySettings?: {
    enableDelivery: boolean;
    baseFee: number;
    feePerKm: number;
    minDistance: number;
    maxDistance: number;
    freeDeliveryAbove: number;
    estimatedTime: number;
  };
}

export interface RestaurantCreationAttributes extends Optional<RestaurantAttributes, 
  'id' | 'primaryColor' | 'secondaryColor' | 'backgroundColor' | 'textColor' | 
  'fontFamily' | 'templateId' | 'isActive' | 'subdomain' | 'customDomain' | 
  'customDomainVerified' | 'customDomainVerifiedAt' | 'customDomainVerificationCode' |
  'metaTitle' | 'metaDescription' | 'deliverySettings'
> {}

class Restaurant extends Model<RestaurantAttributes, RestaurantCreationAttributes> implements RestaurantAttributes {
  public id!: string;
  public planId!: string;
  public name!: string;
  public slug!: string;
  public email!: string;
  public phone!: string;
  public whatsapp!: string;
  public address!: string;
  public description!: string;
  public logo!: string;
  public coverImage!: string;
  public openingHours!: object;
  public instagram!: string;
  public facebook!: string;
  public tiktok!: string;
  public latitude!: number;
  public longitude!: number;
  public primaryColor!: string;
  public secondaryColor!: string;
  public backgroundColor!: string;
  public textColor!: string;
  public fontFamily!: string;
  public templateId!: number;
  public subdomain!: string;
  public customDomain!: string;
  public customDomainVerified!: boolean;
  public customDomainVerifiedAt!: Date | null;  // ✅ متوافق مع Interface
  public customDomainVerificationCode!: string;
  public metaTitle!: string;
  public metaDescription!: string;
  public isActive!: boolean;
  public subscriptionStart!: Date;
  public subscriptionEnd!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deliverySettings!: RestaurantAttributes['deliverySettings'];
}

Restaurant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: '11111111-1111-1111-1111-111111111111',
      field: 'plan_id',
      references: {
        model: 'plans',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'owner_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    whatsapp: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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
    openingHours: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'opening_hours'
    },
    instagram: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    facebook: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    tiktok: {
      type: DataTypes.STRING(100),
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
    backgroundColor: {
      type: DataTypes.STRING(20),
      defaultValue: '#FFFFFF',
      field: 'background_color'
    },
    textColor: {
      type: DataTypes.STRING(20),
      defaultValue: '#000000',
      field: 'text_color'
    },
    fontFamily: {
      type: DataTypes.STRING(50),
      defaultValue: 'Cairo',
      field: 'font_family'
    },
    templateId: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'template_id'
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
    metaTitle: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'meta_title'
    },
    metaDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'meta_description'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    subscriptionStart: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'subscription_start'
    },
    subscriptionEnd: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'subscription_end'
    },
    deliverySettings: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'delivery_settings',
      defaultValue: {
        enableDelivery: true,
        baseFee: 200,
        feePerKm: 30,
        minDistance: 5,
        maxDistance: 20,
        freeDeliveryAbove: 200,
        estimatedTime: 15
      }
    }
  },
  {
    sequelize,
    modelName: 'Restaurant',
    tableName: 'restaurants',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (restaurant: Restaurant) => {
        if (!restaurant.deliverySettings) {
          restaurant.deliverySettings = {
            enableDelivery: true,
            baseFee: 200,
            feePerKm: 30,
            minDistance: 5,
            maxDistance: 20,
            freeDeliveryAbove: 200,
            estimatedTime: 15
          };
        }
        
        // توليد رمز تحقق عشوائي للدومين المخصص
        if (!restaurant.customDomainVerificationCode) {
          restaurant.customDomainVerificationCode = `verify-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
        }
      }
    }
  }
);

export default Restaurant;