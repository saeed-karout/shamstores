// backend/src/routes/couponRoutes.ts
import { Router } from 'express';
import {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon
} from '../controllers/couponController';
import { authenticate, authorizeOwner, authorizeStaff } from '../middleware/auth';
import { checkPlanFeature } from '../middleware/checkPlan';

const router = Router();

// جميع المسارات تتطلب مصادقة
router.use(authenticate);
router.use(checkPlanFeature('coupons'));

/**
 * @route   GET /api/coupons
 * @desc    الحصول على جميع الكوبونات
 * @access  Private (Owner/Staff)
 */
router.get('/', authorizeStaff, getCoupons);

/**
 * @route   GET /api/coupons/:id
 * @desc    الحصول على كوبون محدد
 * @access  Private (Owner/Staff)
 */
router.get('/:id', authorizeStaff, getCoupon);

/**
 * @route   GET /api/coupons/validate/:code
 * @desc    التحقق من صحة كوبون
 * @access  Public/Private
 */
router.get('/validate/:code', validateCoupon);

/**
 * @route   POST /api/coupons
 * @desc    إنشاء كوبون جديد
 * @access  Private (Owner)
 */
router.post('/', authorizeOwner, createCoupon);

/**
 * @route   PUT /api/coupons/:id
 * @desc    تحديث كوبون
 * @access  Private (Owner)
 */
router.put('/:id', authorizeOwner, updateCoupon);

/**
 * @route   DELETE /api/coupons/:id
 * @desc    حذف كوبون
 * @access  Private (Owner)
 */
router.delete('/:id', authorizeOwner, deleteCoupon);

export default router;
