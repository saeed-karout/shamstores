import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface SettingAttributes {
  id: number;
  keyName: string;
  value: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SettingCreationAttributes extends Optional<SettingAttributes, 'id'> {}

export class Setting extends Model<SettingAttributes, SettingCreationAttributes> implements SettingAttributes {
  public id!: number;
  public keyName!: string;
  public value!: string;
  public description!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Setting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    keyName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'key_name'
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Setting',
    tableName: 'settings',
    timestamps: true,
    underscored: true
  }
);

export default Setting;