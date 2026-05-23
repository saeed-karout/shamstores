// backend/src/models/BusinessFeature.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface BusinessFeatureAttributes {
  id: string;
  businessId: string;
  businessType: 'restaurant' | 'store';
  featureCode: string;
  isEnabled: boolean;
  isOverridden: boolean;
  overrideReason?: string;
  overriddenBy?: string;
  expiresAt?: Date;
  config?: object;
  assignedBy?: string;
  assignedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BusinessFeatureCreationAttributes extends Optional<BusinessFeatureAttributes, 
  'id' | 'isEnabled' | 'isOverridden' | 'config'
> {}

class BusinessFeature extends Model<BusinessFeatureAttributes, BusinessFeatureCreationAttributes> 
  implements BusinessFeatureAttributes {
  
  public id!: string;
  public businessId!: string;
  public businessType!: 'restaurant' | 'store';
  public featureCode!: string;
  public isEnabled!: boolean;
  public isOverridden!: boolean;
  public overrideReason!: string;
  public overriddenBy!: string;
  public expiresAt!: Date;
  public config!: object;
  public assignedBy!: string;
  public assignedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BusinessFeature.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    businessId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'business_id'
    },
    businessType: {
      type: DataTypes.ENUM('restaurant', 'store'),
      allowNull: false,
      field: 'business_type'
    },
    featureCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'feature_code'
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_enabled'
    },
    isOverridden: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_overridden'
    },
    overrideReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'override_reason'
    },
    overriddenBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'overridden_by'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_by'
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'assigned_at'
    }
  },
  {
    sequelize,
    modelName: 'BusinessFeature',
    tableName: 'business_features',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['business_id', 'business_type', 'feature_code']
      }
    ]
  }
);

export default BusinessFeature;