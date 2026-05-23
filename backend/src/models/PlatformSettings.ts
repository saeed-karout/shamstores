// models/PlatformSetting.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PlatformSettingAttributes {
  id: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  group: 'general' | 'payment' | 'email' | 'sms' | 'app' | 'delivery';
  description?: string;
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlatformSettingCreationAttributes extends Optional<PlatformSettingAttributes, 'id' | 'type' | 'group' | 'isPublic'> {}

class PlatformSetting extends Model<PlatformSettingAttributes, PlatformSettingCreationAttributes> implements PlatformSettingAttributes {
  public id!: string;
  public key!: string;
  public value!: any;
  public type!: 'string' | 'number' | 'boolean' | 'json';
  public group!: 'general' | 'payment' | 'email' | 'sms' | 'app' | 'delivery';
  public description!: string;
  public isPublic!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PlatformSetting.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('value');
        const type = this.getDataValue('type');
        if (type === 'json') return JSON.parse(rawValue);
        if (type === 'number') return Number(rawValue);
        if (type === 'boolean') return rawValue === 'true';
        return rawValue;
      },
      set(value: any) {
        const type = this.getDataValue('type');
        if (type === 'json') this.setDataValue('value', JSON.stringify(value));
        else this.setDataValue('value', String(value));
      }
    },
    type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
      defaultValue: 'string'
    },
    group: {
      type: DataTypes.ENUM('general', 'payment', 'email', 'sms', 'app', 'delivery'),
      defaultValue: 'general'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_public'
    }
  },
  {
    sequelize,
    modelName: 'PlatformSetting',
    tableName: 'platform_settings',
    timestamps: true,
    underscored: true
  }
);

export default PlatformSetting;