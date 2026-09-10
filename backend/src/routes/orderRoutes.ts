import { Router } from 'express';
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  getTodayOrders,
  getOrderStats,
  getMyOrders,
  getDeliveryOrdersForRestaurant,
  getDeliveryOrdersForDriver,
  assignDeliveryDriver,
  updateDeliveryOrderStatus
} from '../controllers/orderController';
import { authenticate, authorizeOwner, authorizeStaff, authorize } from '../middleware/auth';
import { checkPlanFeature } from '../middleware/checkPlan';
import { rateOrder } from '../controllers/deliveryController';
import { getReviewableItems, submitReview } from '../controllers/productReviewController';
import { exportOrders } from '../controllers/orderCsvController';

const router = Router();

// ==================== المسارات العامة ====================

/**
 * @route   POST /api/orders
 * @desc    إنشاء طلب جديد (من الزبون)
 * @access  Public
 */
router.post('/', createOrder);

// ==================== المسارات الخاصة ====================

/**
 * @route   GET /api/orders/my-orders
 * @desc    الحصول على طلبات المستخدم الحالي
 * @access  Private
 */
router.get('/my-orders', authenticate, getMyOrders);

/**
 * @route   GET /api/orders
 * @desc    الحصول على جميع الطلبات
 * @access  Private (Owner/Staff)
 */
router.get('/', authenticate, checkPlanFeature('online_orders'), authorizeStaff, getOrders);

/**
 * @route   GET /api/orders/today
 * @desc    الحصول على طلبات اليوم
 * @access  Private (Owner/Staff)
 */
/**
 * تصدير الطلبات.
 *
 * **قبل `/:id`** لأن إكسبريس يطابق بترتيب التعريف — ولولا ذلك لالتُقطت
 * كلمة «export» معرّفَ طلب.
 *
 * **وبنفس حرّاس `GET /`:** هذا الملفّ يحرس كل مسارٍ على حدة لا بـ
 * `router.use`، فسطرٌ بلا `authenticate` يصير مساراً عامّاً. رُصد فعلاً:
 * ردّ ٤٠٠ بلا رمزٍ إطلاقاً — أي أنه بلغ المعالج، ولم يسرّب شيئاً لأن شرط
 * «لا معرّف نشاط» أوقفه، وهو حظٌّ لا تصميم.
 */
router.get(
  '/export',
  authenticate,
  checkPlanFeature('online_orders'),
  authorizeStaff,
  exportOrders
);
router.get('/today', authenticate, checkPlanFeature('online_orders'), authorizeStaff, getTodayOrders);

/**
 * @route   GET /api/orders/stats
 * @desc    الحصول على إحصائيات الطلبات
 * @access  Private (Owner)
 */
router.get('/stats', authenticate, checkPlanFeature('online_orders'), authorizeOwner, getOrderStats);

/**
 * @route   GET /api/orders/:id
 * @desc    الحصول على طلب محدد
 * @access  Private (Owner/Staff)
 */
router.get('/:id', authenticate, checkPlanFeature('online_orders'), authorizeStaff, getOrder);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    تحديث حالة الطلب
 * @access  Private (Owner/Staff)
 */
router.patch('/:id/status', authenticate, checkPlanFeature('online_orders'), authorizeStaff, updateOrderStatus);

/**
 * @route   PATCH /api/orders/:id/payment
 * @desc    تحديث حالة الدفع
 * @access  Private (Owner/Staff)
 */
router.patch('/:id/payment', authenticate, checkPlanFeature('online_orders'), authorizeStaff, updatePaymentStatus);

// ==================== مسارات التوصيل الجديدة ====================

/**
 * @route   GET /api/orders/restaurant/delivery
 * @desc    جلب طلبات التوصيل للمطعم
 * @access  Private (Owner/Staff)
 */
router.get(
  '/restaurant/delivery',
  authenticate,
  checkPlanFeature('online_orders'),
  authorize(['owner', 'super_admin', 'staff']),
  getDeliveryOrdersForRestaurant
);

/**
 * @route   GET /api/orders/driver/orders
 * @desc    جلب طلبات التوصيل لمندوب معين
 * @access  Private (Delivery Driver)
 */
router.get(
  '/driver/orders',
  authenticate,
  authorize(['delivery_driver']),
  getDeliveryOrdersForDriver
);

/**
 * @route   POST /api/orders/:orderId/assign-driver
 * @desc    تعيين مندوب توصيل للطلب
 * @access  Private (Owner/Super Admin)
 */
router.post(
  '/:orderId/assign-driver',
  authenticate,
  checkPlanFeature('online_orders'),
  authorize(['owner', 'super_admin']),
  assignDeliveryDriver
);

/**
 * @route   PATCH /api/orders/delivery/:orderId/status
 * @desc    تحديث حالة طلب التوصيل (للمندوب)
 * @access  Private (Delivery Driver/Owner/Super Admin)
 */
router.patch(
  '/delivery/:orderId/status',
  authenticate,
  authorize(['delivery_driver', 'owner', 'super_admin']),
  updateDeliveryOrderStatus
);


router.post('/:orderId/rate', authenticate, rateOrder);

// ==================== تقييم المنتجات ====================
//
// منفصلٌ عن تقييم الطلب عمداً: ذاك يقول «كانت التجربة جيدة»، وهذا يقول أي
// صنفٍ استحقّها — وهو ما يقرؤه من يفكّر بالشراء.

/** ما اشتراه الزبون في هذا الطلب ولم يقيّمه بعد */
router.get('/:orderId/reviewable', authenticate, getReviewableItems);

router.post('/:orderId/reviewable/:productId', authenticate, submitReview);

export default router;
