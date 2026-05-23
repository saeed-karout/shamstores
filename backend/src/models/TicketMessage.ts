// models/TicketMessage.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface TicketMessageAttributes {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  attachments?: string[];
  isInternal: boolean;
  isAdmin: boolean;
  createdAt?: Date;
}

export interface TicketMessageCreationAttributes extends Optional<TicketMessageAttributes, 'id' | 'isInternal' | 'isAdmin'> {}

class TicketMessage extends Model<TicketMessageAttributes, TicketMessageCreationAttributes> implements TicketMessageAttributes {
  public id!: string;
  public ticketId!: string;
  public userId!: string;
  public message!: string;
  public attachments!: string[];
  public isInternal!: boolean;
  public isAdmin!: boolean;
  public readonly createdAt!: Date;
}

TicketMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ticketId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ticket_id',
      references: { model: 'tickets', key: 'id' }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    isInternal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_internal'
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_admin'
    }
  },
  {
    sequelize,
    modelName: 'TicketMessage',
    tableName: 'ticket_messages',
    timestamps: true,
    underscored: true
  }
);

export default TicketMessage;