import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Restaurant from './Restaurant'; // أضف هذا الاستيراد

export interface TableAttributes {
  id: string;
  restaurantId: string;
  name: string;
  nameEn?: string;
  qrCode?: string;
  qrSvg?: string;
  seats: number;
  notes?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TableCreationAttributes extends Optional<TableAttributes, 'id' | 'seats' | 'isActive'> {}

class Table extends Model<TableAttributes, TableCreationAttributes> implements TableAttributes {
  public id!: string;
  public restaurantId!: string;
  public name!: string;
  public nameEn!: string;
  public qrCode!: string;
  public qrSvg!: string;
  public seats!: number;
  public notes!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // تعريف العلاقة مع Restaurant
  public readonly restaurant?: Restaurant;
}

Table.init(
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
    name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    nameEn: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'name_en'
    },
    qrCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'qr_code'
    },
    qrSvg: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'qr_svg'
    },
    seats: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  },
  {
    sequelize,
    modelName: 'Table',
    tableName: 'tables',
    timestamps: true,
    underscored: true
  }
);

export default Table;