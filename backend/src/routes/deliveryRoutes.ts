// backend/src/routes/deliveryRoutes.ts

import express from 'express';
import {
  getDeliveryOrders,
  assignDeliveryDriver,
  getDriverOrders,
  updateDriverLocation,
  registerFcmToken,
  getDriverLocation,
  getMyDriverLocation,
  getDriverAvailability,
  updateDriverAvailability,
  updateDeliveryStatus,
  getOrderWithLocation,
  getDeliveryStats,
  acceptOrder,
  rateOrder,
  driverReachedRestaurant,
  confirmPayment,
  completeOrder,
  calculateDeliveryFee,
  // الميزات الجديدة
  uploadDeliveryProof,
  getDeliveryProof,
  getDriverEarnings,
  getDriverOrderHistory,
  getSupportContact,
  createSupportTicket,
  getDriverTickets,
  sendNotificationToDriver
} from '../controllers/deliveryController';

import { getDrivers, createDriver, updateDriverStatus, deleteDriver } from '../controllers/driverController';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../services/prisma';
import firebaseService from '../services/firebaseService';
import { checkPlanFeature } from '../middleware/checkPlan';

const router = express.Router();

// ==================== مسارات عامة (بدون مصادقة محددة) ====================
// حساب سعر التوصيل
router.post('/calculate-fee', calculateDeliveryFee);

// ==================== مسارات المطعم/المتجر ====================

// جلب طلبات التوصيل للمطعم/المتجر
router.get('/orders', 
  authenticate, 
  checkPlanFeature('online_orders'),
  authorize(['owner', 'super_admin', 'staff']), 
  getDeliveryOrders
);

// إحصائيات التوصيل — للتاجر أرقام نشاطه، وللسائق أرقامه هو.
//
// بوّابة الخطة تُفحص للتاجر وحده: خطة التاجر ليست شأن السائق، وإسقاطها
// عليه كان يمنعه من رؤية أرباحه لأن متجراً غيره لم يدفع.
router.get('/stats',
  authenticate,
  authorize(['owner', 'super_admin', 'delivery_driver']),
  (req: any, res: any, next: any) =>
    req.user?.role === 'delivery_driver' ? next() : checkPlanFeature('online_orders')(req, res, next),
  getDeliveryStats
);

// جلب قائمة السائقين
router.get('/drivers', 
  authenticate, 
  checkPlanFeature('online_orders'),
  authorize(['owner', 'super_admin']), 
  getDrivers
);

// إنشاء سائق جديد
router.post('/drivers', 
  authenticate, 
  checkPlanFeature('online_orders'),
  authorize(['owner', 'super_admin']), 
  createDriver
);

// تحديث حالة السائق
router.patch('/drivers/:driverId/status', 
  authenticate, 
  checkPlanFeature('online_orders'),
  authorize(['owner', 'super_admin']), 
  updateDriverStatus
);

// حذف سائق
router.delete('/drivers/:driverId', 
  authenticate, 
  checkPlanFeature('online_orders'),
  authorize(['owner', 'super_admin']), 
  deleteDriver
);

// تعيين سائق للطلب
router.post('/orders/:orderId/assign-driver', 
  authenticate, 
  checkPlanFeature('online_orders'),
  authorize(['owner', 'super_admin']), 
  assignDeliveryDriver
);

// جلب طلب مع معلومات الموقع
router.get('/orders/:orderId/with-location', 
  authenticate, 
  authorize(['owner', 'super_admin', 'delivery_driver']), 
  getOrderWithLocation
);

// جلب إثبات التسليم (للمالك فقط)
router.get('/orders/:orderId/proof', 
  authenticate, 
  checkPlanFeature('online_orders'),
  authorize(['owner', 'super_admin']), 
  getDeliveryProof
);

// ==================== مسارات مندوب التوصيل ====================

// جلب طلبات السائق الحالية
router.get('/driver/orders', 
  authenticate, 
  authorize(['delivery_driver']), 
  getDriverOrders
);

// جلب سجل طلبات السائق (الأرشيف)
router.get('/driver/history', 
  authenticate, 
  authorize(['delivery_driver']), 
  getDriverOrderHistory
);

// جلب أرباح السائق
router.get('/driver/earnings', 
  authenticate, 
  authorize(['delivery_driver']), 
  getDriverEarnings
);

// جلب حالة التواجد الحالية للمندوب
router.get('/driver/availability',
  authenticate,
  authorize(['delivery_driver']),
  getDriverAvailability
);

// تحديث حالة التواجد الحالية للمندوب
router.patch('/driver/availability',
  authenticate,
  authorize(['delivery_driver']),
  updateDriverAvailability
);

// Aliases للموبايل (تشغيل/إيقاف الحضور)
router.post('/driver/online',
  authenticate,
  authorize(['delivery_driver']),
  (req, res) => {
    req.body.isOnline = true;
    return updateDriverAvailability(req as any, res);
  }
);

router.post('/driver/offline',
  authenticate,
  authorize(['delivery_driver']),
  (req, res) => {
    req.body.isOnline = false;
    return updateDriverAvailability(req as any, res);
  }
);

// رمز الإشعارات — يتغيّر مع إعادة التثبيت والتدوير الدوري، فيُسجَّل عند كل
// إقلاع لا مرّةً واحدة
router.post('/driver/fcm-token',
  authenticate,
  authorize(['delivery_driver']),
  registerFcmToken
);

// تحديث موقع السائق
router.post('/driver/location', 
  authenticate, 
  authorize(['delivery_driver']), 
  updateDriverLocation
);

router.patch('/driver/location', 
  authenticate, 
  authorize(['delivery_driver']), 
  updateDriverLocation
);

router.put('/driver/location', 
  authenticate, 
  authorize(['delivery_driver']), 
  updateDriverLocation
);

// جلب موقع السائق الحالي
router.get('/driver/location', 
  authenticate, 
  authorize(['delivery_driver']), 
  getMyDriverLocation
);

// جلب موقع سائق معين (للمالك)
router.get('/driver/:driverId/location', 
  authenticate, 
  authorize(['owner', 'super_admin', 'delivery_driver']), 
  getDriverLocation
);

// ==================== مسارات الطلبات للمندوب ====================

// قبول الطلب
router.post('/orders/:orderId/accept', 
  authenticate, 
  authorize(['delivery_driver']), 
  acceptOrder
);

// تأكيد وصول المندوب للمطعم/المتجر
router.post('/orders/:orderId/reached-restaurant', 
  authenticate, 
  authorize(['delivery_driver']), 
  driverReachedRestaurant
);

// تأكيد الدفع (التحصيل النقدي)
router.post('/orders/:orderId/confirm-payment', 
  authenticate, 
  authorize(['delivery_driver', 'owner', 'super_admin']), 
  confirmPayment
);

// تحديث حالة طلب التوصيل
router.patch('/orders/:orderId/status', 
  authenticate, 
  authorize(['delivery_driver', 'owner', 'super_admin']), 
  updateDeliveryStatus
);

// إكمال الطلب (تسليم العميل)
router.post('/orders/:orderId/complete', 
  authenticate, 
  authorize(['delivery_driver', 'owner', 'super_admin']), 
  completeOrder
);

// رفع إثبات التسليم (صورة أو توقيع)
router.post('/orders/:orderId/proof', 
  authenticate, 
  authorize(['delivery_driver']), 
  uploadDeliveryProof
);

// تقييم الطلب
router.post('/orders/:orderId/rate', 
  authenticate, 
  authorize(['delivery_driver']), 
  rateOrder
);

// ==================== مسارات التواصل والدعم ====================

// جلب معلومات التواصل مع الدعم
router.get('/support/contact', 
  authenticate, 
  authorize(['delivery_driver', 'owner', 'super_admin']), 
  getSupportContact
);

// إنشاء تذكرة دعم جديدة
router.post('/support/ticket', 
  authenticate, 
  authorize(['delivery_driver', 'owner', 'super_admin']), 
  createSupportTicket
);

// جلب تذاكر الدعم الخاصة بالمستخدم
router.get('/support/tickets', 
  authenticate, 
  authorize(['delivery_driver', 'owner', 'super_admin']), 
  getDriverTickets
);

// ==================== مسارات الإشعارات ====================

/**
 * تشخيص الإشعارات.
 *
 * إشعارٌ لا يصل له ثلاثة أسباب محتملة لا يفرّق بينها المستخدم: الخادم غير
 * مهيّأ بـFirebase، أو السائق لم يسجّل رمزاً، أو الرمز ميّت. هذا المسار
 * يقول أيّها — بلا أن يكشف الرمز نفسه.
 */
router.get('/notifications/diagnostics',
  authenticate,
  authorize(['delivery_driver', 'owner', 'super_admin']),
  async (req: any, res) => {
    try {
      const targetId = (req.query.driverId as string) || req.user?.id;

      const driver = targetId
        ? await prisma.user.findUnique({
            where: { id: targetId },
            select: { id: true, name: true, role: true, isOnline: true, isActive: true, fcmToken: true }
          })
        : null;

      res.json({
        success: true,
        data: {
          firebaseConfigured: firebaseService.isConfigured,
          // المشروع الذي يتبعه الخادم — يُقارَن بـ`project_id` في
          // `google-services.json` داخل التطبيق. اختلافهما يعني أن كل
          // إشعارٍ يُرفض وإن بدا كل شيء مضبوطاً.
          serverProjectId: firebaseService.projectId,
          credentialMismatch: firebaseService.hasCredentialMismatch,
          lastSendError: firebaseService.lastError,
          driver: driver && {
            id: driver.id,
            name: driver.name,
            role: driver.role,
            isOnline: driver.isOnline,
            isActive: driver.isActive,
            hasToken: Boolean(driver.fcmToken),
            // بصمة لا قيمة: تكفي لمعرفة أن الرمز تغيّر بين تشغيلين
            tokenFingerprint: driver.fcmToken ? driver.fcmToken.slice(-8) : null
          },
          hint: !firebaseService.isConfigured
            ? 'اضبط FIREBASE_PROJECT_ID و FIREBASE_CLIENT_EMAIL و FIREBASE_PRIVATE_KEY على الخادم'
            : firebaseService.hasCredentialMismatch
            ? `حساب الخدمة يتبع مشروع "${firebaseService.projectId}" بينما التطبيق بُني على مشروع آخر. ` +
              'ولّد مفتاح حساب خدمة من مشروع التطبيق نفسه — راجع project_id في google-services.json'
            : !driver?.fcmToken
            ? 'لم يسجّل التطبيق رمز إشعارات — تأكّد من إذن الإشعارات ومن تسجيل الدخول'
            : !driver.isOnline
            ? 'السائق غير متصل، فلا تصله إشعارات البركة'
            : 'الإعداد سليم'
        }
      });
    } catch (error) {
      console.error('notifications diagnostics failed:', error);
      res.status(500).json({ success: false, error: 'فشل التشخيص' });
    }
  }
);

// إرسال إشعار تجريبي لمندوب (للتطوير والاختبار)
router.post('/test-notification/:driverId',
  authenticate,
  authorize(['super_admin']),
  async (req, res) => {
    try {
      const { driverId } = req.params;
      const { title, body } = req.body;

      if (!firebaseService.isConfigured) {
        res.status(503).json({ success: false, error: 'Firebase غير مهيّأ على الخادم' });
        return;
      }

      const driver = await prisma.user.findUnique({
        where: { id: driverId },
        select: { fcmToken: true }
      });

      if (!driver?.fcmToken) {
        res.status(400).json({ success: false, error: 'المندوب لم يسجّل رمز إشعارات' });
        return;
      }

      await sendNotificationToDriver(
        driverId,
        title || 'إشعار تجريبي',
        body || 'هذا إشعار تجريبي من النظام',
        'alert'
      );
      res.json({ success: true, message: 'تم إرسال الإشعار' });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ success: false, error: 'فشل إرسال الإشعار' });
    }
  }
);

export default router;
