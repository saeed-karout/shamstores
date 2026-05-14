// models/UpgradeRequest.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface UpgradeRequestAttributes {
  id: string;
  userId: string;
  restaurantId?: string | null;
  storeId?: string | null;
  currentPlanId: string;
  requestedPlanId: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface UpgradeRequestCreationAttributes extends Optional<UpgradeRequestAttributes, 'id' | 'status' | 'notes'> {}

class UpgradeRequest extends Model<UpgradeRequestAttributes, UpgradeRequestCreationAttributes> implements UpgradeRequestAttributes {
  public id!: string;
  public userId!: string;
  public restaurantId!: string | null;
  public storeId!: string | null;
  public currentPlanId!: string;
  public requestedPlanId!: string;
  public status!: 'pending' | 'approved' | 'rejected';
  public notes!: string | null;
  public reviewedBy!: string | null;
  public reviewedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UpgradeRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    restaurantId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'restaurant_id'
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'store_id'
    },
    currentPlanId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'current_plan_id'
    },
    requestedPlanId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'requested_plan_id'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'reviewed_by'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at'
    }
  },
  {
    sequelize,
    modelName: 'UpgradeRequest',
    tableName: 'upgrade_requests',
    timestamps: true,
    underscored: true
  }
);

export default UpgradeRequest;