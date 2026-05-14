// src/types/express.d.ts
import { User as UserModel } from '../models/User';
import { Restaurant as RestaurantModel } from '../models/Restaurant';
import { Store as StoreModel } from '../models/Store';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
        businessId?: string;
        businessType?: 'restaurant' | 'store';
        restaurantId?: string;
        storeId?: string;
      };
    }
  }
}

export {};