import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';

export interface SubdomainRequest extends Request {
  business?: {
    type: 'restaurant' | 'store';
    id: string;
    data: any;
  };
  subdomain?: string;
  customDomain?: string;
}

// ✅ قائمة الـ subdomains المحجوزة
const RESERVED_SUBDOMAINS = [
  'www', 'api', 'admin', 'cdn', 'images', 'media', 
  'static', 'assets', 'auth', 'dashboard', 'app'
];

// ✅ قائمة المسارات المحجوزة (لا تتعامل معها كـ business)
const RESERVED_PATHS = [
  'terms', 'privacy', 'about', 'faq', 'contact',
  'login', 'register', 'dashboard', 'admin'
];

const isReservedSubdomain = (subdomain: string): boolean => {
  return RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase());
};

const isReservedPath = (path: string): boolean => {
  // تجاهل المسارات الفارغة أو الرئيسية
  if (!path || path === '/' || path === '') return false;
  
  // إزالة الـ slash البداية
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const firstSegment = cleanPath.split('/')[0];
  
  return RESERVED_PATHS.includes(firstSegment.toLowerCase());
};

export const extractSubdomain = async (
  req: SubdomainRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // ✅ إذا كان المسار محجوزاً، لا تتعامل معه كـ business
    if (isReservedPath(req.path)) {
      console.log('🚫 Reserved path, skipping business lookup:', req.path);
      req.subdomain = undefined;
      req.business = undefined;
      return next();
    }

    let subdomain: string | null = null;

    // 1. من X-Subdomain header
    const xSubdomain = req.headers['x-subdomain'] as string;
    if (xSubdomain && xSubdomain.trim()) {
      subdomain = xSubdomain.trim().toLowerCase();
      console.log('🌐 Subdomain from header:', subdomain);
    } else {
      // 2. من Host header
      const host = req.headers.host || '';
      const hostWithoutPort = host.split(':')[0];
      const parts = hostWithoutPort.split('.');

      // دعم localhost مع subdomain
      if (hostWithoutPort.includes('localhost') || hostWithoutPort.includes('127.0.0.1')) {
        if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
          subdomain = parts[0];
          console.log('🌐 Subdomain from localhost:', subdomain);
        }
      } 
      // دعم الإنتاج
      else if (parts.length >= 3 && parts[0] !== 'www') {
        subdomain = parts[0];
        console.log('🌐 Subdomain from production:', subdomain);
      }
    }

    if (!subdomain) {
      req.subdomain = undefined;
      return next();
    }

    // تجاهل subdomains المحجوزة
    if (isReservedSubdomain(subdomain)) {
      console.log(`🚫 Reserved subdomain: ${subdomain}`);
      req.subdomain = subdomain;
      req.business = undefined;
      return next();
    }

    req.subdomain = subdomain;
    console.log('🌐 Looking for business with subdomain:', subdomain);

    // البحث في المتاجر أولاً
    const store = await prisma.store.findFirst({
      where: {
        OR: [
          { subdomain: subdomain },
          { slug: subdomain }
        ],
        isActive: true
      }
    });

    if (store) {
      req.business = { type: 'store', id: store.id, data: store };
      console.log('🛒 Found store:', store.name);
      return next();
    }

    // البحث في المطاعم
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [
          { subdomain: subdomain },
          { slug: subdomain }
        ],
        isActive: true
      }
    });

    if (restaurant) {
      req.business = { type: 'restaurant', id: restaurant.id, data: restaurant };
      console.log('🍽️ Found restaurant:', restaurant.name);
      return next();
    }

    console.log('❌ No business found for:', subdomain);
    next();
  } catch (error) {
    console.error('Error in extractSubdomain middleware:', error);
    next();
  }
};