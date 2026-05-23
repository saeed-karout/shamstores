// backend/src/models/Order.ts

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { OrderStatus, PaymentMethod } from '../types';

export interface OrderAttributes {
  id: string;
  restaurantId: string;
  storeId?: string;
  tableId?: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  status: OrderStatus;
  total: number;
  subtotal?: number;
  discountAmount?: number;
  couponCode?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  isPaid: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  
  // حقول التوصيل
  orderType: 'dine_in' | 'delivery' | 'takeaway';
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryLocation?: string;
  assignedDriverId?: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  
  // حقول جديدة للتوصيل المتقدم
  deliveryFee?: number;
  deliveryDistance?: number;
  driverAcceptedAt?: Date;
  driverReachedAt?: Date;
  paymentCollectedAt?: Date;
  rating?: number;
  ratingComment?: string;
  ratedAt?: Date;
  
  // مصدر الطلب
  orderSource: 'restaurant' | 'store';
  
  orderItems?: any[];
  
  // إثبات التسليم
  deliveryProofImage?: string;
  deliveryProofSignature?: string;
  deliveryProofType?: 'photo' | 'signature';
  proofTakenAt?: Date;
  
  // تقييم السائق
  driverRating?: number;
  driverRatingComment?: string;
  driverRatedAt?: Date;
}

export interface OrderCreationAttributes extends Optional<OrderAttributes, 
  'id' | 'status' | 'isPaid' | 'paymentMethod' | 'orderNumber' | 
  'subtotal' | 'discountAmount' | 'couponCode' | 'orderType' |
  'deliveryFee' | 'deliveryDistance' | 'driverAcceptedAt' | 
  'driverReachedAt' | 'paymentCollectedAt' | 'rating' | 'ratingComment' | 'ratedAt' |
  'orderSource' | 'storeId' | 'deliveryProofImage' | 'deliveryProofSignature' |
  'deliveryProofType' | 'proofTakenAt' | 'driverRating' | 'driverRatingComment' | 'driverRatedAt'
> {}

class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  public id!: string;
  public restaurantId!: string;
  public storeId!: string | undefined;
  public tableId!: string;
  public orderNumber!: string;
  public customerName!: string;
  public customerPhone!: string;
  public status!: OrderStatus;
  public total!: number;
  public subtotal!: number;
  public discountAmount!: number;
  public couponCode!: string;
  public notes!: string;
  public paymentMethod!: PaymentMethod;
  public isPaid!: boolean;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  public orderType!: 'dine_in' | 'delivery' | 'takeaway';
  public deliveryAddress!: string;
  public deliveryLat!: number;
  public deliveryLng!: number;
  public deliveryLocation!: string;
  public assignedDriverId!: string;
  public estimatedDeliveryTime!: Date;
  public actualDeliveryTime!: Date;
  
  public deliveryFee!: number;
  public deliveryDistance!: number;
  public driverAcceptedAt!: Date;
  public driverReachedAt!: Date;
  public paymentCollectedAt!: Date;
  public rating!: number;
  public ratingComment!: string;
  public ratedAt!: Date;
  
  public orderSource!: 'restaurant' | 'store';
  
  // إثبات التسليم
  public deliveryProofImage!: string;
  public deliveryProofSignature!: string;
  public deliveryProofType!: 'photo' | 'signature';
  public proofTakenAt!: Date;
  
  // تقييم السائق
  public driverRating!: number;
  public driverRatingComment!: string;
  public driverRatedAt!: Date;
}

Order.init(
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
    tableId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'table_id',
      references: {
        model: 'tables',
        key: 'id'
      }
    },
    orderNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      defaultValue: () => `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`,
      field: 'order_number'
    },
    customerName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'customer_name'
    },
    customerPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'customer_phone'
    },
    status: {
      type: DataTypes.ENUM('pending', 'preparing', 'ready', 'delivering', 'delivered', 'served', 'cancelled'),
      defaultValue: 'pending'
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'subtotal'
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'discount_amount'
    },
    couponCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'coupon_code'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.ENUM('cash', 'card', 'online'),
      defaultValue: 'cash',
      field: 'payment_method'
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_paid'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    orderType: {
      type: DataTypes.ENUM('dine_in', 'delivery', 'takeaway'),
      defaultValue: 'dine_in',
      field: 'order_type'
    },
    deliveryAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'delivery_address'
    },
    deliveryLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      field: 'delivery_lat'
    },
    deliveryLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      field: 'delivery_lng'
    },
    deliveryLocation: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'delivery_location'
    },
    assignedDriverId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_driver_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    estimatedDeliveryTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'estimated_delivery_time'
    },
    actualDeliveryTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'actual_delivery_time'
    },
    deliveryFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'delivery_fee',
      defaultValue: 0
    },
    deliveryDistance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'delivery_distance'
    },
    driverAcceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'driver_accepted_at'
    },
    driverReachedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'driver_reached_at'
    },
    paymentCollectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'payment_collected_at'
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 5 }
    },
    ratingComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rating_comment'
    },
    ratedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'rated_at'
    },
    orderSource: {
      type: DataTypes.ENUM('restaurant', 'store'),
      allowNull: false,
      defaultValue: 'restaurant',
      field: 'order_source'
    },
    // إثبات التسليم
    deliveryProofImage: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'delivery_proof_image'
    },
    deliveryProofSignature: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'delivery_proof_signature'
    },
    deliveryProofType: {
      type: DataTypes.ENUM('photo', 'signature'),
      allowNull: true,
      field: 'delivery_proof_type'
    },
    proofTakenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'proof_taken_at'
    },
    // تقييم السائق
    driverRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'driver_rating',
      validate: { min: 1, max: 5 }
    },
    driverRatingComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'driver_rating_comment'
    },
    driverRatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'driver_rated_at'
    }
  },
  {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
    underscored: true
  }
);

export default Order;