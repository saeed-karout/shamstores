import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Restaurant from './Restaurant';

export interface DailyAnalyticsAttributes {
  id: string;
  restaurantId: string;
  date: Date;
  totalOrders: number;
  totalSales: number;
  totalViews: number;
  popularItems?: object;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DailyAnalyticsCreationAttributes extends Optional<DailyAnalyticsAttributes, 'id' | 'popularItems'> {}

export class DailyAnalytics extends Model<DailyAnalyticsAttributes, DailyAnalyticsCreationAttributes> implements DailyAnalyticsAttributes {
  public id!: string;
  public restaurantId!: string;
  public date!: Date;
  public totalOrders!: number;
  public totalSales!: number;
  public totalViews!: number;
  public popularItems!: object;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // العلاقات
  public readonly restaurant?: Restaurant;
}

DailyAnalytics.init(
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    totalOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_orders'
    },
    totalSales: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'total_sales'
    },
    totalViews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_views'
    },
    popularItems: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'popular_items'
    }
  },
  {
    sequelize,
    modelName: 'DailyAnalytics',
    tableName: 'daily_analytics',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['restaurant_id', 'date']
      }
    ]
  }
);

export default DailyAnalytics;