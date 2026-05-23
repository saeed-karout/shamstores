// backend/src/utils/businessHelpers.ts

import { prisma } from '../server';

export const getBusinessFromUser = async (user: any) => {
  if (user?.restaurantId) {
    const business = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId }
    });
    return { type: 'restaurant', business };
  }
  
  if (user?.storeId) {
    const business = await prisma.store.findUnique({
      where: { id: user.storeId }
    });
    return { type: 'store', business };
  }
  
  return null;
};

export const getBusinessIdFromUser = (user: any): { type: 'restaurant' | 'store' | null; id: string | null } => {
  if (user?.restaurantId) {
    return { type: 'restaurant', id: user.restaurantId };
  }
  if (user?.storeId) {
    return { type: 'store', id: user.storeId };
  }
  return { type: null, id: null };
};