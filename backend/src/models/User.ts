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
  isOnline: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  
  // حقول الموقع لمندوبي التوصيل
  lastLocationLat?: number;
  lastLocationLng?: number;
  lastLocationUpdate?: Date;

  // ✅ حقول تقييم السائق
  driverRating?: number;      // متوسط تقييم السائق (1-5)
  driverRatingCount?: number; // عدد التقييمات التي حصل عليها
  
  // ✅ حقول الأمان
  isEmailVerified: boolean;
  loginAttempts: number;
  lockedUntil?: Date | null;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 
  'id' | 'isActive' | 'isOnline' | 'permissions' | 'lastLogin' | 
  'lastLocationLat' | 'lastLocationLng' | 'lastLocationUpdate' | 'storeId' |
  'isEmailVerified' | 'loginAttempts' | 'lockedUntil' | 'driverRating' | 'driverRatingCount'
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
  public isOnline!: boolean;
  public lastLogin!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // حقول الموقع
  public lastLocationLat!: number;
  public lastLocationLng!: number;
  public lastLocationUpdate!: Date;

  // ✅ حقول تقييم السائق
  public driverRating!: number;
  public driverRatingCount!: number;

  // حقول الأمان
  public isEmailVerified!: boolean;
  public loginAttempts!: number;
  public lockedUntil!: Date | null;

  // مقارنة كلمة المرور
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
  
  // ✅ دالة مساعدة لتحديث متوسط تقييم السائق
  public async updateDriverRating(newRating: number): Promise<void> {
    const currentTotal = (this.driverRating || 0) * (this.driverRatingCount || 0);
    const newCount = (this.driverRatingCount || 0) + 1;
    const newAverage = (currentTotal + newRating) / newCount;
    
    this.driverRating = Math.round(newAverage * 10) / 10; // تقريب لرقم واحد بعد الفاصلة
    this.driverRatingCount = newCount;
    await this.save();
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
    isOnline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_online'
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
    // ✅ حقول تقييم السائق
    driverRating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: true,
      defaultValue: 0,
      validate: { min: 0, max: 5 },
      field: 'driver_rating'
    },
    driverRatingCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'driver_rating_count'
    },
    // حقول الأمان
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
        // القيم الافتراضية
        if (user.isEmailVerified === undefined) user.isEmailVerified = false;
        if (user.loginAttempts === undefined) user.loginAttempts = 0;
        if (user.driverRating === undefined) user.driverRating = 0;
        if (user.driverRatingCount === undefined) user.driverRatingCount = 0;
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