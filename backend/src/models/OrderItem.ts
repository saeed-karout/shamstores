// backend/src/models/OrderItem.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface OrderItemAttributes {
  id: string;
  orderId: string;
  menuItemId?: string | null;
  productId?: string | null;
  quantity: number;
  price: number;
  size?: string;
  addons?: any;  // ✅ تغيير من object إلى any
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderItemCreationAttributes extends Optional<OrderItemAttributes, 'id'> {}

class OrderItem extends Model<OrderItemAttributes, OrderItemCreationAttributes> implements OrderItemAttributes {
  public id!: string;
  public orderId!: string;
  public menuItemId!: string | null;
  public productId!: string | null;
  public quantity!: number;
  public price!: number;
  public size!: string;
  public addons!: any;  // ✅ تغيير من object إلى any
  public notes!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'order_id',
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    menuItemId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'menu_item_id',
      references: {
        model: 'menu_items',
        key: 'id'
      }
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'product_id',
      references: {
        model: 'products',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    size: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    addons: {
      type: DataTypes.JSON,  // JSON يسمح بـ string أو object
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
    timestamps: true,
    underscored: true
  }
);

export default OrderItem;