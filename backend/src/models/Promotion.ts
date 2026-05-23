import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Restaurant from './Restaurant';

export type DiscountType = 'percentage' | 'fixed';

export interface PromotionAttributes {
  id: string;
  restaurantId: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  image?: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PromotionCreationAttributes extends Optional<PromotionAttributes, 'id' | 'isActive'> {}

export class Promotion extends Model<PromotionAttributes, PromotionCreationAttributes> implements PromotionAttributes {
  public id!: string;
  public restaurantId!: string;
  public title!: string;
  public titleEn!: string;
  public description!: string;
  public descriptionEn!: string;
  public image!: string;
  public discountType!: DiscountType;
  public discountValue!: number;
  public startDate!: Date;
  public endDate!: Date;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // العلاقات
  public readonly restaurant?: Restaurant;
}

Promotion.init(
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
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    titleEn: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'title_en'
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
    image: {
      type: DataTypes.STRING(255),
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
    }
  },
  {
    sequelize,
    modelName: 'Promotion',
    tableName: 'promotions',
    timestamps: true,
    underscored: true
  }
);

export default Promotion;