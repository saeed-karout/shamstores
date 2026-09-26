// backend/src/routes/souqRoutes.ts
//
// «سوق شام ستورز» — `/api/souq`.
//
//   - عامّ (قراءة فقط): القوائم الثابتة، ودليل المتاجر، والبحث عن منتج.
//   - التاجر: قراءة ظهوره وضبطه. التعديل للمالك وحده — الظهور في دليلٍ عامّ
//     قرارٌ تجاريّ، لا يدخل في صلاحيّات الموظّف المعرَّفة (قائمة، طلبات، مخزون).

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth';
import {
  getSouqMeta,
  listSouqBusinesses,
  searchSouqProducts,
  getMyListing,
  updateMyListing
} from '../controllers/souqController';

const router = Router();

/**
 * البحث أثقل منافذ السوق — لكل عبارةٍ جديدة استعلامان. ستون في الدقيقة
 * تكفي من يكتب ويعدّل، وتوقف من يمسح الكتالوج آلياً فيحجز اتصالات القاعدة.
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: false,
  legacyHeaders: false,
  message: { success: false, error: 'طلبات بحث كثيرة — انتظر قليلاً' }
});

router.get('/meta', getSouqMeta);
router.get('/businesses', listSouqBusinesses);
router.get('/products', searchLimiter, searchSouqProducts);

router.get('/my-listing', authenticate, authorize(['owner', 'staff']), getMyListing);
router.put('/my-listing', authenticate, authorize(['owner']), updateMyListing);

export default router;
