import { Restaurant, Store } from "../models";


export const getBusinessFromUser = async (user: any) => {
  if (user?.restaurantId) {
    return { type: 'restaurant', business: await Restaurant.findByPk(user.restaurantId) };
  }
  if (user?.storeId) {
    return { type: 'store', business: await Store.findByPk(user.storeId) };
  }
  return null;
};