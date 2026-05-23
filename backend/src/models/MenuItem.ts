import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import crypto from 'crypto';

export interface MenuItemAttributes {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  discountedPrice?: number;
  image?: string;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
  preparationTime?: number;
  calories?: number;
  hasSizes: boolean;
  hasAddons: boolean;
  sizes?: object;
  addons?: object;
  shareToken: string;
  viewsCount: number;
  ordersCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MenuItemCreationAttributes extends Optional<MenuItemAttributes, 'id' | 'isAvailable' | 'isFeatured' | 'sortOrder' | 'hasSizes' | 'hasAddons' | 'viewsCount' | 'ordersCount' | 'shareToken'> {}

class MenuItem extends Model<MenuItemAttributes, MenuItemCreationAttributes> implements MenuItemAttributes {
  public id!: string;
  public restaurantId!: string;
  public categoryId!: string;
  public name!: string;
  public nameEn!: string;
  public description!: string;
  public descriptionEn!: string;
  public price!: number;
  public discountedPrice!: number;
  public image!: string;
  public isAvailable!: boolean;
  public isFeatured!: boolean;
  public sortOrder!: number;
  public preparationTime!: number;
  public calories!: number;
  public hasSizes!: boolean;
  public hasAddons!: boolean;
  public sizes!: object;
  public addons!: object;
  public shareToken!: string;
  public viewsCount!: number;
  public ordersCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MenuItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    restaurantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'restaurant_id',
      references: {
        model: 'restaurants',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'category_id',
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    nameEn: {
      type: DataTypes.STRING(200),
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
      allowNull: false
    },
    discountedPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'discounted_price'
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_available'
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_featured'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order'
    },
    preparationTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'preparation_time'
    },
    calories: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    hasSizes: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_sizes'
    },
    hasAddons: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_addons'
    },
    sizes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    addons: {
      type: DataTypes.JSON,
      allowNull: true
    },
    shareToken: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      defaultValue: () => crypto.randomBytes(16).toString('hex'),
      field: 'share_token'
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'views_count'
    },
    ordersCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'orders_count'
    }
  },
  {
    sequelize,
    modelName: 'MenuItem',
    tableName: 'menu_items',
    timestamps: true,
    underscored: true
  }
);

export default MenuItem;