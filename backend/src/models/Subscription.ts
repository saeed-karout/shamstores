import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface SubscriptionAttributes {
  id: string;
  restaurantId: string;
  planId: string;
  planName: string;
  months: number;
  price: number;
  discount: number;
  totalPaid: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'expired' | 'cancelled';
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
  reminderSent: boolean;
  reminderSentAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubscriptionCreationAttributes extends Optional<SubscriptionAttributes, 'id' | 'reminderSent' | 'status'> {}

class Subscription extends Model<SubscriptionAttributes, SubscriptionCreationAttributes> implements SubscriptionAttributes {
  public id!: string;
  public restaurantId!: string;
  public planId!: string;
  public planName!: string;
  public months!: number;
  public price!: number;
  public discount!: number;
  public totalPaid!: number;
  public startDate!: Date;
  public endDate!: Date;
  public status!: 'active' | 'expired' | 'cancelled';
  public paymentMethod!: string;
  public paymentReference!: string;
  public notes!: string;
  public reminderSent!: boolean;
  public reminderSentAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Subscription.init(
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
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'plan_id'
    },
    planName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'plan_name'
    },
    months: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    totalPaid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'total_paid'
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
    status: {
      type: DataTypes.ENUM('active', 'expired', 'cancelled'),
      defaultValue: 'active'
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'payment_method'
    },
    paymentReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'payment_reference'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reminderSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'reminder_sent'
    },
    reminderSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reminder_sent_at'
    }
  },
  {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    timestamps: true,
    underscored: true
  }
);

export default Subscription;