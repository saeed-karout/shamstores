// models/ProductCategory.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ProductCategoryAttributes {
  id: string;
  storeId: string;
  name: string;
  nameEn?: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductCategoryCreationAttributes extends Optional<ProductCategoryAttributes, 'id' | 'sortOrder' | 'isActive'> {}

class ProductCategory extends Model<ProductCategoryAttributes, ProductCategoryCreationAttributes> implements ProductCategoryAttributes {
  public id!: string;
  public storeId!: string;
  public name!: string;
  public nameEn!: string;
  public description!: string;
  public image!: string;
  public sortOrder!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProductCategory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'store_id',
      references: { model: 'stores', key: 'id' }
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
    image: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  },
  {
    sequelize,
    modelName: 'ProductCategory',
    tableName: 'product_categories',
    timestamps: true,
    underscored: true
  }
);

export default ProductCategory;