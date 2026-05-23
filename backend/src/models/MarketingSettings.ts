import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { MarketingBusinessType, MarketingSectionType } from './MarketingSection';

export interface MarketingSettingsAttributes {
  id: string;
  businessType: MarketingBusinessType;
  businessId: string;
  sectionOrder: MarketingSectionType[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarketingSettingsCreationAttributes
  extends Optional<MarketingSettingsAttributes, 'id' | 'sectionOrder'> {}

class MarketingSettings
  extends Model<MarketingSettingsAttributes, MarketingSettingsCreationAttributes>
  implements MarketingSettingsAttributes
{
  public id!: string;
  public businessType!: MarketingBusinessType;
  public businessId!: string;
  public sectionOrder!: MarketingSectionType[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MarketingSettings.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    businessType: {
      type: DataTypes.ENUM('restaurant', 'store'),
      allowNull: false,
      field: 'business_type'
    },
    businessId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'business_id'
    },
    sectionOrder: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['announcement', 'banner', 'offer'],
      field: 'section_order'
    }
  },
  {
    sequelize,
    modelName: 'MarketingSettings',
    tableName: 'marketing_settings',
    timestamps: true,
    underscored: true
  }
);

export default MarketingSettings;
