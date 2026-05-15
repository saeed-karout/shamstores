// backend/src/middleware/subdomain.ts

import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
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

// اسم الـ host الخاص بالسيرفر (يُستخدم لتجاهل الطلبات الداخلية)
const BACKEND_HOSTNAME = (process.env.BACKEND_HOSTNAME || '').toLowerCase();

const isInternalHost = (host: string): boolean => {
  if (!BACKEND_HOSTNAME) return false;
  return host === BACKEND_HOSTNAME || host.startsWith(BACKEND_HOSTNAME + ':');
};

export const extractSubdomain = async (
  req: SubdomainRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let subdomain: string | null = null;

    // 1. من X-Subdomain header (أعلى أولوية — يُرسَل من الـ frontend)
    const xSubdomain = req.headers['x-subdomain'] as string;
    if (xSubdomain && xSubdomain.trim()) {
      subdomain = xSubdomain.trim().toLowerCase();
      console.log('🌐 Subdomain from header:', subdomain);
    } else {
      // 2. من Host header (للطلبات المباشرة على الدومين)
      const host = req.headers.host || '';
      const hostWithoutPort = host.split(':')[0];

      // تجاهل الـ host الداخلي للسيرفر
      if (isInternalHost(hostWithoutPort)) {
        return next();
      }

      const parts = hostWithoutPort.split('.');

      if (hostWithoutPort.includes('localhost') || hostWithoutPort.includes('127.0.0.1')) {
        if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
          subdomain = parts[0];
          console.log('🌐 Subdomain from localhost host:', subdomain);
        }
      } else if (parts.length >= 3 && parts[0] !== 'www') {
        subdomain = parts[0];
        console.log('🌐 Subdomain from production host:', subdomain);
      }
    }

    if (!subdomain) {
      req.subdomain = undefined;
      return next();
    }

    req.subdomain = subdomain;
    console.log('🌐 Extracted subdomain:', subdomain);

    // البحث في المتاجر أولاً (بالـ subdomain أو slug كـ fallback)
    const store = await Store.findOne({
      where: {
        [Op.or]: [{ subdomain }, { slug: subdomain }],
        isActive: true
      }
    });

    if (store) {
      req.business = { type: 'store', id: store.id, data: store };
      console.log('🛒 Found store:', store.name);
      return next();
    }

    // ثم البحث في المطاعم (بالـ subdomain أو slug كـ fallback)
    const restaurant = await Restaurant.findOne({
      where: {
        [Op.or]: [{ subdomain }, { slug: subdomain }],
        isActive: true
      }
    });

    if (restaurant) {
      req.business = { type: 'restaurant', id: restaurant.id, data: restaurant };
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
