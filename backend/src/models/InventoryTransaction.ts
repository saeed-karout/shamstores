// models/InventoryTransaction.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface InventoryTransactionAttributes {
  id: string;
  productId: string;
  type: 'stock_in' | 'stock_out' | 'adjustment' | 'return' | 'damage';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  referenceId?: string;
  referenceType?: string;
  createdBy?: string;
  createdAt?: Date;
}

export interface InventoryTransactionCreationAttributes extends Optional<InventoryTransactionAttributes, 'id'> {}

class InventoryTransaction extends Model<InventoryTransactionAttributes, InventoryTransactionCreationAttributes> implements InventoryTransactionAttributes {
  public id!: string;
  public productId!: string;
  public type!: 'stock_in' | 'stock_out' | 'adjustment' | 'return' | 'damage';
  public quantity!: number;
  public previousStock!: number;
  public newStock!: number;
  public reason!: string;
  public referenceId!: string;
  public referenceType!: string;
  public createdBy!: string;
  public readonly createdAt!: Date;
}

InventoryTransaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_id',
      references: { model: 'products', key: 'id' }
    },
    type: {
      type: DataTypes.ENUM('stock_in', 'stock_out', 'adjustment', 'return', 'damage'),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    previousStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'previous_stock'
    },
    newStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'new_stock'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'reference_id'
    },
    referenceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'reference_type'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: { model: 'users', key: 'id' }
    }
  },
  {
    sequelize,
    modelName: 'InventoryTransaction',
    tableName: 'inventory_transactions',
    timestamps: true,
    underscored: true
  }
);

export default InventoryTransaction;