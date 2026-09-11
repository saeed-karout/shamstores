import express from 'express';
import {
  getBusinessBySlug,
  getTableById,
  getProductById,
  getCategoriesBySlug,
  getMenuItemsBySlug,
  getProductsBySlug,
  getMenuItemById,
  createContactMessage,
  resolveHost,
  getHostBrand
} from '../controllers/publicController';
import { getProductReviews } from '../controllers/productReviewController';
import { getStoreManifest, getStoreIcon, getPwaStatus, getSeoSummary } from '../controllers/pwaController';
import rateLimit from 'express-rate-limit';
import { ingestEvents } from '../controllers/storefrontEventController';

const router = express.Router();

// ==================== المسارات العامة (بدون مصادقة) ====================

router.post('/contact-messages', createContactMessage);

/**
 * مدخل أحداث الإحصاء — **المسار الوحيد الذي يكتب بلا مصادقة.**
 *
 * فله حدٌّ صريح: متصفّحٌ واحد يُرسل دفعةً كلّ بضع ثوانٍ، ومئةٌ في الدقيقة
 * تكفي زائراً نشطاً بأريحيّة وتوقف من يقصد ملء الجدول. والمتحكّم يتأكّد
 * فوق ذلك من وجود النشاط قبل أن يكتب صفّاً واحداً.
 */
const eventsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: false,
  legacyHeaders: false,
  // 429 لا يبلغ `sendBeacon` أحداً، فالسقوط صامتٌ بلا جسم
  handler: (_req, res) => res.status(204).end()
});

router.post('/events', eventsLimiter, ingestEvents);

// حل النطاق المخصص/الفرعي إلى معرّف نشاط تجاري (يجب أن يسبق /:identifier)
router.get('/resolve-host', resolveHost);

// هوية التاجر لصفحات الدخول والتسجيل — قبل `/:identifier` وإلا ابتلعها
router.get('/brand', getHostBrand);

// ✅ هذا هو المسار المطلوب - جلب بيانات المطعم/المتجر (باستخدام slug أو subdomain)
// ==================== التطبيق المثبَّت لكل متجر ====================
//
// **قبل `/:identifier`** — express يطابق بالترتيب، و`/:identifier` يبتلع
// أي مسارٍ من جزءٍ واحد. ولو وُضعت بعده لعاد البيانُ بيانات النشاط.
router.get('/:slug/manifest.webmanifest', getStoreManifest);
router.get('/:slug/pwa-icon/:file', getStoreIcon);
router.get('/:slug/pwa-status', getPwaStatus);
router.get('/:slug/seo', getSeoSummary);

router.get('/:identifier', getBusinessBySlug);

// جلب فئات المطعم (باستخدام slug)
router.get('/:slug/categories', getCategoriesBySlug);

// جلب أطباق المطعم (باستخدام slug)
router.get('/:slug/menu', getMenuItemsBySlug);

// جلب منتجات المتجر (باستخدام slug)
router.get('/:slug/products', getProductsBySlug);

// جلب طاولة محددة (باستخدام ID)
router.get('/table/:tableId', getTableById);

// جلب طبق محدد (باستخدام ID)
router.get('/item/:itemId', getMenuItemById);

// جلب منتج محدد (باستخدام ID)
router.get('/product/:productId', getProductById);

// تقييمات المنتج — عامّة بلا مصادقة: يقرؤها من يفكّر بالشراء قبل أن يسجّل
router.get('/product/:productId/reviews', getProductReviews);

export default router;