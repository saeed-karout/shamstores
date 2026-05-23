// backend/src/models/Feature.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface FeatureAttributes {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  category: 'restaurant' | 'store' | 'both';
  feature_group: 'basic' | 'marketing' | 'advanced' | 'payment' | 'delivery' | 'analytics' | 'integration';
  isCore: boolean;
  isActive: boolean;
  price: number;
  isOneTime: boolean;
  defaultInPlans?: string[];
  dependsOn?: string[];
  configSchema?: object;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FeatureCreationAttributes extends Optional<FeatureAttributes, 
  'id' | 'isActive' | 'isOneTime' | 'defaultInPlans' | 'dependsOn' | 'configSchema'
> {}

class Feature extends Model<FeatureAttributes, FeatureCreationAttributes> implements FeatureAttributes {
  public id!: string;
  public code!: string;
  public name!: string;
  public nameEn!: string;
  public description!: string;
  public descriptionEn!: string;
  public category!: 'restaurant' | 'store' | 'both';
  public feature_group!: 'basic' | 'marketing' | 'advanced' | 'payment' | 'delivery' | 'analytics' | 'integration';
  public isCore!: boolean;
  public isActive!: boolean;
  public price!: number;
  public isOneTime!: boolean;
  public defaultInPlans!: string[];
  public dependsOn!: string[];
  public configSchema!: object;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Feature.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z_]+$/
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    nameEn: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'name_en'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    descriptionEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description_en'
    },
    category: {
      type: DataTypes.ENUM('restaurant', 'store', 'both'),
      defaultValue: 'both',
      field: 'category'
    },
    feature_group: {
      type: DataTypes.ENUM('basic', 'marketing', 'advanced', 'payment', 'delivery', 'analytics', 'integration'),
      defaultValue: 'basic',
      field: 'feature_group'
    },
    isCore: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_core'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    isOneTime: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_one_time'
    },
    defaultInPlans: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      field: 'default_in_plans'
    },
    dependsOn: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      field: 'depends_on'
    },
    configSchema: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'config_schema'
    }
  },
  {
    sequelize,
    modelName: 'Feature',
    tableName: 'features',
    timestamps: true,
    underscored: true
  }
);

export default Feature;