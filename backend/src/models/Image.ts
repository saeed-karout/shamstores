import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type ImageProvider = 'cloudflare' | 'local';
export type ImageBusinessType = 'restaurant' | 'store' | 'unknown';

export interface ImageAttributes {
  id: string;
  userId?: string | null;
  businessType: ImageBusinessType;
  businessId?: string | null;
  uploadType?: string | null;
  subType?: string | null;
  provider: ImageProvider;
  imageUrl: string;
  cloudflareImageId?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ImageCreationAttributes
  extends Optional<
    ImageAttributes,
    | 'id'
    | 'userId'
    | 'businessType'
    | 'businessId'
    | 'uploadType'
    | 'subType'
    | 'cloudflareImageId'
    | 'originalName'
    | 'mimeType'
    | 'sizeBytes'
  > {}

class Image extends Model<ImageAttributes, ImageCreationAttributes> implements ImageAttributes {
  public id!: string;
  public userId!: string | null;
  public businessType!: ImageBusinessType;
  public businessId!: string | null;
  public uploadType!: string | null;
  public subType!: string | null;
  public provider!: ImageProvider;
  public imageUrl!: string;
  public cloudflareImageId!: string | null;
  public originalName!: string | null;
  public mimeType!: string | null;
  public sizeBytes!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Image.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id'
    },
    businessType: {
      type: DataTypes.ENUM('restaurant', 'store', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
      field: 'business_type'
    },
    businessId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'business_id'
    },
    uploadType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'upload_type'
    },
    subType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'sub_type'
    },
    provider: {
      type: DataTypes.ENUM('cloudflare', 'local'),
      allowNull: false,
      defaultValue: 'cloudflare'
    },
    imageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: false,
      field: 'image_url'
    },
    cloudflareImageId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'cloudflare_image_id'
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'original_name'
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'mime_type'
    },
    sizeBytes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'size_bytes'
    }
  },
  {
    sequelize,
    modelName: 'Image',
    tableName: 'images',
    timestamps: true,
    underscored: true
  }
);

export default Image;