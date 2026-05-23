// backend/src/routes/subscriptionRoutes.ts
import { Router } from 'express';
import { authenticate, authorizeOwner, authorizeAdmin } from '../middleware/auth';
import {
  createSubscription,
  getSubscriptions,
  getCurrentSubscription,
  cancelSubscription,
  getExpiringSubscriptions,
  sendRenewalReminders,
  checkExpiredSubscriptions
} from '../controllers/subscriptionController';

const router = Router();

// ==================== مسارات المالك ====================

/**
 * @route   GET /api/subscriptions
 * @desc    جلب جميع اشتراكات النشاط التجاري
 * @access  Private (Owner)
 */
router.get('/', authenticate, authorizeOwner, getSubscriptions);

/**
 * @route   GET /api/subscriptions/current
 * @desc    جلب الاشتراك الحالي النشط
 * @access  Private (Owner)
 */
router.get('/current', authenticate, authorizeOwner, getCurrentSubscription);

/**
 * @route   POST /api/subscriptions
 * @desc    إنشاء اشتراك جديد
 * @access  Private (Owner)
 */
router.post('/', authenticate, authorizeOwner, createSubscription);

/**
 * @route   POST /api/subscriptions/:id/cancel
 * @desc    إلغاء اشتراك
 * @access  Private (Owner)
 */
router.post('/:id/cancel', authenticate, authorizeOwner, cancelSubscription);

// ==================== مسارات السوبر أدمن ====================

/**
 * @route   GET /api/subscriptions/admin/expiring
 * @desc    جلب الاشتراكات التي ستنتهي قريباً
 * @access  Private (Super Admin)
 */
router.get('/admin/expiring', authenticate, authorizeAdmin, getExpiringSubscriptions);

/**
 * @route   POST /api/subscriptions/admin/send-reminders
 * @desc    إرسال تذكيرات التجديد
 * @access  Private (Super Admin)
 */
router.post('/admin/send-reminders', authenticate, authorizeAdmin, sendRenewalReminders);

/**
 * @route   POST /api/subscriptions/admin/check-expired
 * @desc    التحقق من الاشتراكات المنتهية
 * @access  Private (Super Admin)
 */
router.post('/admin/check-expired', authenticate, authorizeAdmin, checkExpiredSubscriptions);

export default router;