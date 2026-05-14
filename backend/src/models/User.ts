// backend/src/models/User.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';
import { UserRole } from '../types';

export interface UserAttributes {
  id: string;
  restaurantId?: string;
  storeId?: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  permissions?: object;
  isActive: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  
  // حقول الموقع لمندوبي التوصيل
  lastLocationLat?: number;
  lastLocationLng?: number;
  lastLocationUpdate?: Date;

  // ✅ حقول جديدة للأمان
  isEmailVerified: boolean;
  loginAttempts: number;
  lockedUntil?: Date | null;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 
  'id' | 'isActive' | 'permissions' | 'lastLogin' | 
  'lastLocationLat' | 'lastLocationLng' | 'lastLocationUpdate' | 'storeId' |
  'isEmailVerified' | 'loginAttempts' | 'lockedUntil'
> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public restaurantId!: string;
  public storeId!: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public phone!: string;
  public role!: UserRole;
  public permissions!: object;
  public isActive!: boolean;
  public lastLogin!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // حقول الموقع
  public lastLocationLat!: number;
  public lastLocationLng!: number;
  public lastLocationUpdate!: Date;

  // ✅ حقول جديدة للأمان
  public isEmailVerified!: boolean;
  public loginAttempts!: number;
  public lockedUntil!: Date | null;

  // مقارنة كلمة المرور
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    restaurantId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'restaurant_id',
      references: {
        model: 'restaurants',
        key: 'id'
      }
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'store_id',
      references: {
        model: 'stores',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'owner', 'staff', 'user', 'delivery_driver'),
      allowNull: false,
      defaultValue: 'user'
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login'
    },
    lastLocationLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      field: 'last_location_lat'
    },
    lastLocationLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      field: 'last_location_lng'
    },
    lastLocationUpdate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_location_update'
    },
    // ✅ حقول جديدة للأمان
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_email_verified'
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'login_attempts'
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'locked_until'
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
          console.log('🔐 Password hashed with bcrypt');
        }
        // ✅ تعيين القيم الافتراضية
        if (user.isEmailVerified === undefined) user.isEmailVerified = false;
        if (user.loginAttempts === undefined) user.loginAttempts = 0;
        console.log('📝 Creating user with role:', user.role);
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
          console.log('🔐 Password hashed with bcrypt');
        }
      }
    }
  }
);

export default User;