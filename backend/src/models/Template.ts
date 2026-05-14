import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TemplateAttributes {
  id: number;
  name: string;
  previewImage?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TemplateCreationAttributes extends Optional<TemplateAttributes, 'id' | 'isActive'> {}

export class Template extends Model<TemplateAttributes, TemplateCreationAttributes> implements TemplateAttributes {
  public id!: number;
  public name!: string;
  public previewImage!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Template.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    previewImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'preview_image'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  },
  {
    sequelize,
    modelName: 'Template',
    tableName: 'templates',
    timestamps: true,
    underscored: true
  }
);

export default Template;