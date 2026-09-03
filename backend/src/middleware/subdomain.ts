import { Request, Response, NextFunction } from 'express';
import prisma from '../services/prisma';
import {
  RESERVED_PATHS,
  isReservedSubdomain,
  extractSubdomainFromHost,
  resolveBusinessByCustomDomain,
  normalizeDomain
} from '../services/domain.service';

export interface SubdomainRequest extends Request {
  business?: {
    type: 'restaurant' | 'store';
    id: string;
    data: any;
  };
  subdomain?: string;
  customDomain?: string;
}

const isReservedPath = (path: string): boolean => {
  if (!path || path === '/' || path === '') return false;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const firstSegment = cleanPath.split('/')[0];
  return RESERVED_PATHS.has(firstSegment.toLowerCase());
};

/**
 * يحدّد النشاط التجاري من المضيف:
 *   1. النطاق المخصص الموثّق (mystore.com)
 *   2. النطاق الفرعي (mystore.shamstores.com)
 *   3. ترويسة X-Subdomain (تُستخدم من الواجهة أثناء التطوير)
 *
 * ملاحظة أمنية: ترويسة X-Subdomain يتحكم بها العميل، لذا تُستخدم
 * لتحديد المحتوى العام فقط ولا يُبنى عليها أي قرار صلاحيات.
 */
export const extractSubdomain = async (
  req: SubdomainRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (isReservedPath(req.path)) {
      req.subdomain = undefined;
      req.business = undefined;
      return next();
    }

    const host = normalizeDomain(req.headers.host || '');

    // 1) النطاق المخصص الموثّق له الأولوية
    if (host) {
      const byCustomDomain = await resolveBusinessByCustomDomain(host);
      if (byCustomDomain) {
        req.customDomain = host;
        req.subdomain = byCustomDomain.subdomain || byCustomDomain.slug;
        req.business = {
          type: byCustomDomain.type,
          id: byCustomDomain.id,
          data: byCustomDomain.data
        };
        return next();
      }
    }

    // 2) النطاق الفرعي من المضيف، أو ترويسة X-Subdomain
    const headerSubdomain = (req.headers['x-subdomain'] as string | undefined)?.trim().toLowerCase();
    const subdomain = extractSubdomainFromHost(host) || (headerSubdomain || null);

    if (!subdomain) {
      req.subdomain = undefined;
      return next();
    }

    if (isReservedSubdomain(subdomain)) {
      req.subdomain = subdomain;
      req.business = undefined;
      return next();
    }

    req.subdomain = subdomain;

    const store = await prisma.store.findFirst({
      where: {
        OR: [{ subdomain }, { slug: subdomain }],
        isActive: true
      }
    });

    if (store) {
      req.business = { type: 'store', id: store.id, data: store };
      return next();
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [{ subdomain }, { slug: subdomain }],
        isActive: true
      }
    });

    if (restaurant) {
      req.business = { type: 'restaurant', id: restaurant.id, data: restaurant };
      return next();
    }

    next();
  } catch (error) {
    console.error('Error in extractSubdomain middleware:', error);
    next();
  }
};
