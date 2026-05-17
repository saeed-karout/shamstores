// backend/src/models/Ticket.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TicketAttributes {
  id: string;
  userId: string;
  restaurantId?: string;
  storeId?: string;
  orderId?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: 'technical' | 'billing' | 'delivery' | 'order' | 'other';
  type: 'delivery' | 'restaurant' | 'store' | 'general';
  attachments?: string[];
  assignedTo?: string;
  response?: string;
  respondedBy?: string;
  respondedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  rating?: number;
  feedback?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TicketCreationAttributes extends Optional<TicketAttributes, 
  'id' | 'priority' | 'status' | 'category' | 'type' | 'attachments' | 
  'response' | 'respondedBy' | 'respondedAt' | 'resolvedAt' | 'closedAt' | 
  'rating' | 'feedback' | 'restaurantId' | 'storeId' | 'orderId'
> {}

class Ticket extends Model<TicketAttributes, TicketCreationAttributes> implements TicketAttributes {
  public id!: string;
  public userId!: string;
  public restaurantId!: string;
  public storeId!: string;
  public orderId!: string;
  public title!: string;
  public description!: string;
  public priority!: 'low' | 'medium' | 'high' | 'urgent';
  public status!: 'open' | 'in_progress' | 'resolved' | 'closed';
  public category!: 'technical' | 'billing' | 'delivery' | 'order' | 'other';
  public type!: 'delivery' | 'restaurant' | 'store' | 'general';
  public attachments!: string[];
  public assignedTo!: string;
  public response!: string;
  public respondedBy!: string;
  public respondedAt!: Date;
  public resolvedAt!: Date;
  public closedAt!: Date;
  public rating!: number;
  public feedback!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Ticket.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' }
    },
    restaurantId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'restaurant_id',
      references: { model: 'restaurants', key: 'id' }
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'store_id',
      references: { model: 'stores', key: 'id' }
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'order_id',
      references: { model: 'orders', key: 'id' }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
      defaultValue: 'open'
    },
    category: {
      type: DataTypes.ENUM('technical', 'billing', 'delivery', 'order', 'other'),
      defaultValue: 'other'
    },
    type: {
      type: DataTypes.ENUM('delivery', 'restaurant', 'store', 'general'),
      defaultValue: 'general'
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_to',
      references: { model: 'users', key: 'id' }
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    respondedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'responded_by',
      references: { model: 'users', key: 'id' }
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'responded_at'
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at'
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'closed_at'
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 5 }
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Ticket',
    tableName: 'tickets',
    timestamps: true,
    underscored: true
  }
);

export default Ticket;