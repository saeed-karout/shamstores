import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type MarketingBusinessType = 'restaurant' | 'store';
export type MarketingSectionType = 'announcement' | 'banner' | 'offer';

export interface MarketingSectionAttributes {
  id: string;
  businessType: MarketingBusinessType;
  businessId: string;
  sectionType: MarketingSectionType;
  title?: string | null;
  titleEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  startAt?: Date | null;
  endAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarketingSectionCreationAttributes
  extends Optional<
    MarketingSectionAttributes,
    'id' | 'title' | 'titleEn' | 'description' | 'descriptionEn' | 'imageUrl' | 'linkUrl' | 'isActive' | 'sortOrder' | 'startAt' | 'endAt'
  > {}

class MarketingSection
  extends Model<MarketingSectionAttributes, MarketingSectionCreationAttributes>
  implements MarketingSectionAttributes
{
  public id!: string;
  public businessType!: MarketingBusinessType;
  public businessId!: string;
  public sectionType!: MarketingSectionType;
  public title!: string | null;
  public titleEn!: string | null;
  public description!: string | null;
  public descriptionEn!: string | null;
  public imageUrl!: string | null;
  public linkUrl!: string | null;
  public isActive!: boolean;
  public sortOrder!: number;
  public startAt!: Date | null;
  public endAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MarketingSection.init(
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
    sectionType: {
      type: DataTypes.ENUM('announcement', 'banner', 'offer'),
      allowNull: false,
      field: 'section_type'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    titleEn: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'title_en'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    descriptionEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description_en'
    },
    imageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'image_url'
    },
    linkUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'link_url'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order'
    },
    startAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'start_at'
    },
    endAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_at'
    }
  },
  {
    sequelize,
    modelName: 'MarketingSection',
    tableName: 'marketing_sections',
    timestamps: true,
    underscored: true
  }
);

export default MarketingSection;
