// models/Product.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ProductAttributes {
  id: string;
  storeId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;  // ✅ اسم الحقل imageUrl
  stock: number;
  sku?: string;
  categoryId?: string;
  isAvailable: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductCreationAttributes extends Optional<ProductAttributes, 
  'id' | 'createdAt' | 'updatedAt' | 'stock' | 'isAvailable' | 'sortOrder' | 'imageUrl'
> {}

class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  public id!: string;
  public storeId!: string;
  public name!: string;
  public nameEn!: string;
  public description!: string;
  public descriptionEn!: string;
  public price!: number;
  public discountedPrice!: number;
  public imageUrl!: string;  // ✅ imageUrl
  public stock!: number;
  public sku!: string;
  public categoryId!: string;
  public isAvailable!: boolean;
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Product.init(
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
      references: { model: 'stores', key: 'id' }, 
      onDelete: 'CASCADE' 
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
    price: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false, 
      defaultValue: 0 
    },
    discountedPrice: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: true,
      field: 'discounted_price'
    },
    imageUrl: {  // ✅ imageUrl مع field
      type: DataTypes.STRING(255), 
      allowNull: true,
      field: 'image_url'  // ✅ اسم العمود في قاعدة البيانات
    },
    stock: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      defaultValue: 0 
    },
    sku: { 
      type: DataTypes.STRING(50), 
      allowNull: true 
    },
    categoryId: { 
      type: DataTypes.UUID, 
      allowNull: true,
      field: 'category_id'
    },
    isAvailable: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: true,
      field: 'is_available'
    },
    sortOrder: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0,
      field: 'sort_order'
    }
  },
  { 
    sequelize, 
    tableName: 'products', 
    timestamps: true, 
    underscored: true 
  }
);

export default Product;