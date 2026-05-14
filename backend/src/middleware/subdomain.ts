// backend/src/middleware/subdomain.ts

import { Request, Response, NextFunction } from 'express';
import Restaurant from '../models/Restaurant';
import Store from '../models/Store';

export interface SubdomainRequest extends Request {
  business?: {
    type: 'restaurant' | 'store';
    id: string;
    data: any;
  };
  subdomain?: string;
  customDomain?: string;
}

export const extractSubdomain = async (
  req: SubdomainRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let subdomain: string | null = null;

    // 1. من header مخصص
    const xSubdomain = req.headers['x-subdomain'] as string;
    if (xSubdomain && xSubdomain.trim()) {
      subdomain = xSubdomain.trim().toLowerCase();
      console.log('🌐 Subdomain from header:', subdomain);
    } else {
      // 2. من Host header
      const host = req.headers.host || '';
      const hostWithoutPort = host.split(':')[0];
      const parts = hostWithoutPort.split('.');
      
      if (hostWithoutPort.includes('localhost') || hostWithoutPort.includes('127.0.0.1')) {
        if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
          subdomain = parts[0];
          console.log('🌐 Subdomain from localhost host:', subdomain);
        }
      } else if (parts.length >= 3) {
        subdomain = parts[0];
        console.log('🌐 Subdomain from production host:', subdomain);
      }
    }

    if (!subdomain) {
      console.log('⚠️ No subdomain found');
      req.subdomain = undefined;
      return next();
    }

    req.subdomain = subdomain;
    console.log('🌐 Extracted subdomain:', subdomain);

    // ✅ تغيير الأولوية: البحث في المتاجر أولاً
    let store = await Store.findOne({ 
      where: { subdomain, isActive: true }
    });
    
    if (store) {
      req.business = {
        type: 'store',
        id: store.id,
        data: store
      };
      console.log('🛒 Found store:', store.name);
      return next();
    }

    // ثم البحث في المطاعم
    let restaurant = await Restaurant.findOne({ 
      where: { subdomain, isActive: true }
    });
    
    if (restaurant) {
      req.business = {
        type: 'restaurant',
        id: restaurant.id,
        data: restaurant
      };
      console.log('🍽️ Found restaurant:', restaurant.name);
      return next();
    }

    console.log('❌ No business found for subdomain:', subdomain);
    next();
  } catch (error) {
    console.error('Error in extractSubdomain middleware:', error);
    next();
  }
};