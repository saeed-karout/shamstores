// models/Coupon.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface CouponAttributes {
  id: string;
  restaurantId?: string;  
  storeId?: string;      
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrder: number;
  usageLimit: number;
  usedCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isRestaurantOnly: boolean;
    isStoreOnly: boolean;   
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CouponCreationAttributes extends Optional<CouponAttributes, 'id' | 'minOrder' | 'usageLimit' | 'usedCount' | 'isActive' | 'isRestaurantOnly' | 'isStoreOnly'> {}

class Coupon extends Model<CouponAttributes, CouponCreationAttributes> implements CouponAttributes {
  public id!: string;
  public restaurantId!: string;
  public storeId!: string;
  public code!: string;
  public description!: string;
  public discountType!: 'percentage' | 'fixed';
  public discountValue!: number;
  public minOrder!: number;
  public usageLimit!: number;
  public usedCount!: number;
  public startDate!: Date;
  public endDate!: Date;
  public isActive!: boolean;
  public isRestaurantOnly!: boolean;
  public isStoreOnly!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Coupon.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    restaurantId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'restaurant_id',
      references: {
        model: 'restaurants',
        key: 'id'
      }
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'store_id',
      references: {
        model: 'stores',
        key: 'id'
      }
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    discountType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      defaultValue: 'percentage',
      field: 'discount_type'
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'discount_value'
    },
    minOrder: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'min_order'
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'usage_limit'
    },
    usedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'used_count'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_date'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'end_date'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    isRestaurantOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_restaurant_only'
    },
    isStoreOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_store_only'
    }
  },
  {
    sequelize,
    modelName: 'Coupon',
    tableName: 'coupons',
    timestamps: true,
    underscored: true
  }
);

export default Coupon;