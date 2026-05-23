import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Restaurant from './Restaurant';
import Feature from './Feature';

export interface RestaurantFeatureAttributes {
  id: string;
  restaurantId: string;
  featureId: string;
  purchasedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RestaurantFeatureCreationAttributes extends Optional<RestaurantFeatureAttributes, 'id' | 'isActive'> {}

export class RestaurantFeature extends Model<RestaurantFeatureAttributes, RestaurantFeatureCreationAttributes> implements RestaurantFeatureAttributes {
  public id!: string;
  public restaurantId!: string;
  public featureId!: string;
  public purchasedAt!: Date;
  public expiresAt!: Date;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // العلاقات
  public readonly restaurant?: Restaurant;
  public readonly feature?: Feature;
}

RestaurantFeature.init(
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
    featureId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'feature_id',
      references: {
        model: 'features',
        key: 'id'
      }
    },
    purchasedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'purchased_at'
    },
    expiresAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'expires_at'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  },
  {
    sequelize,
    modelName: 'RestaurantFeature',
    tableName: 'restaurant_features',
    timestamps: true,
    underscored: true
  }
);

export default RestaurantFeature;