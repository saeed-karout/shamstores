// backend/src/controllers/souqController.ts
//
// منافذ «سوق شام ستورز» — عامّةٌ للتصفّح والبحث، ومنفذان للتاجر يضبط بهما
// ظهوره. المنطق كلّه في services/souq.service.ts؛ هنا قراءة الطلب والردّ.

import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import souq, { SouqKind, SouqListingError } from '../services/souq.service';
import { isGovernorate } from '../config/syria';
import { isSouqCategory } from '../config/souq';

const MAX_LIMIT = 48;

const pageOf = (req: Request, fallback = 24) => {
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit || fallback), 10) || fallback));
  const page = Math.max(1, Math.min(200, parseInt(String(req.query.page || '1'), 10) || 1));
  return { limit, page, offset: (page - 1) * limit };
};

const filtersOf = (req: Request) => ({
  governorate: isGovernorate(req.query.gov) ? String(req.query.gov) : null,
  category: isSouqCategory(req.query.cat) ? String(req.query.cat) : null,
  type: req.query.type === 'store' || req.query.type === 'restaurant' ? (req.query.type as SouqKind) : null
});

/** الدليل يتغيّر كل بضع دقائق — ودقيقتان في المتصفّح وCDN تكفيان */
const cachePublic = (res: Response, seconds = 120) =>
  res.setHeader('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=300`);

export const getSouqMeta = (_req: Request, res: Response): void => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({ success: true, data: souq.souqMeta() });
};

export const listSouqBusinesses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, page, offset } = pageOf(req);
    const filters = filtersOf(req);
    const q = String(req.query.q || '').trim().slice(0, 60);
    const all = await souq.getDirectory();

    // العدّادات من الدليل بلا فلتر المحافظة/التصنيف الآخر — كي يرى الزائر
    // كم متجراً في كل محافظة ضمن التصنيف الذي اختاره، والعكس. وبلا عبارة
    // البحث: العبارة غالباً اسم منتج («شاورما») لا اسم متجر، ولو صفّت
    // العدّادات لاختفت شرائح التصنيف كلّها أثناء البحث عن منتج
    const facets = {
      governorates: souq.facetsOf(souq.filterDirectory(all, { ...filters, governorate: null })).governorates,
      categories: souq.facetsOf(souq.filterDirectory(all, { ...filters, category: null })).categories
    };

    const filtered = souq.filterDirectory(all, { ...filters, q });
    cachePublic(res);
    res.json({
      success: true,
      data: {
        items: filtered.slice(offset, offset + limit).map(souq.publicBusiness),
        total: filtered.length,
        page,
        hasMore: offset + limit < filtered.length,
        facets
      }
    });
  } catch (error) {
    console.error('خطأ في دليل السوق:', error);
    res.status(503).json({ success: false, error: 'السوق غير متاح الآن — حاول بعد قليل' });
  }
};

export const searchSouqProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, page, offset } = pageOf(req);
    const { governorate, category } = filtersOf(req);
    const q = String(req.query.q || '').trim();
    const { items, capped } = await souq.searchSouqProducts({ q, governorate, category });
    cachePublic(res, 60);
    res.json({
      success: true,
      data: {
        items: items.slice(offset, offset + limit),
        total: items.length,
        page,
        hasMore: offset + limit < items.length,
        // بلا عبارة: «الأكثر طلباً» لا نتائج بحث — تقوله الواجهة
        mode: q ? 'search' : 'popular',
        capped
      }
    });
  } catch (error) {
    console.error('خطأ في بحث السوق:', error);
    res.status(503).json({ success: false, error: 'تعذّر البحث الآن' });
  }
};

// ==================== التاجر ====================

const businessOf = (req: AuthRequest): { id: string; type: SouqKind } | null => {
  if (req.user?.storeId) return { id: req.user.storeId, type: 'store' };
  if (req.user?.restaurantId) return { id: req.user.restaurantId, type: 'restaurant' };
  return null;
};

export const getMyListing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = businessOf(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'لا يوجد متجر أو مطعم مرتبط بحسابك' });
      return;
    }
    const listing = await souq.readListing(business.id, business.type);
    if (!listing) {
      res.status(404).json({ success: false, error: 'النشاط غير موجود' });
      return;
    }
    res.json({ success: true, data: { ...listing, type: business.type, ...souq.souqMeta() } });
  } catch (error) {
    console.error('getMyListing failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب إعداد السوق' });
  }
};

export const updateMyListing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = businessOf(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'لا يوجد متجر أو مطعم مرتبط بحسابك' });
      return;
    }
    const { listed, governorate, category } = req.body || {};
    const listing = await souq.updateListing(business.id, business.type, { listed, governorate, category });
    res.json({ success: true, data: { ...listing, type: business.type } });
  } catch (error) {
    if (error instanceof SouqListingError) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    console.error('updateMyListing failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر حفظ إعداد السوق' });
  }
};

export default { getSouqMeta, listSouqBusinesses, searchSouqProducts, getMyListing, updateMyListing };
