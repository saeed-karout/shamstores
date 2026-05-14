// backend/src/models/ExtendedPlatformSetting.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ExtendedPlatformSettingAttributes {
  id: string;
  key_name: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  setting_group: 'general' | 'auth' | 'business' | 'subscription' | 'payment' | 'domain' | 'storage' | 'delivery' | 'notification' | 'security' | 'analytics';
  description?: string;
  is_public: boolean;
  is_editable: boolean;
  validation?: object;
  created_by?: string;
  updated_by?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface ExtendedPlatformSettingCreationAttributes 
  extends Optional<ExtendedPlatformSettingAttributes, 'id' | 'is_public' | 'is_editable'> {}

class ExtendedPlatformSetting extends Model<ExtendedPlatformSettingAttributes, ExtendedPlatformSettingCreationAttributes> 
  implements ExtendedPlatformSettingAttributes {
  
  public id!: string;
  public key_name!: string;
  public value!: any;
  public type!: 'string' | 'number' | 'boolean' | 'json' | 'array';
  public setting_group!: ExtendedPlatformSettingAttributes['setting_group'];
  public description!: string;
  public is_public!: boolean;
  public is_editable!: boolean;
  public validation!: object;
  public created_by!: string;
  public updated_by!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ExtendedPlatformSetting.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'key_name'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('value');
        const type = this.getDataValue('type');
        if (type === 'json') return JSON.parse(rawValue);
        if (type === 'array') return JSON.parse(rawValue);
        if (type === 'number') return Number(rawValue);
        if (type === 'boolean') return rawValue === 'true';
        return rawValue;
      },
      set(value: any) {
        const type = this.getDataValue('type');
        if (type === 'json') this.setDataValue('value', JSON.stringify(value));
        else if (type === 'array') this.setDataValue('value', JSON.stringify(value));
        else this.setDataValue('value', String(value));
      }
    },
    type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'array'),
      defaultValue: 'string'
    },
    setting_group: {
      type: DataTypes.ENUM(
        'general', 'auth', 'business', 'subscription', 
        'payment', 'domain', 'storage', 'delivery', 
        'notification', 'security', 'analytics'
      ),
      defaultValue: 'general',
      field: 'setting_group'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_public'
    },
    is_editable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_editable'
    },
    validation: {
      type: DataTypes.JSON,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by'
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by'
    }
  },
  {
    sequelize,
    modelName: 'ExtendedPlatformSetting',
    tableName: 'extended_platform_settings',
    timestamps: true,
    underscored: true
  }
);

export default ExtendedPlatformSetting;