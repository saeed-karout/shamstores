// routes/deliveryRoutes.ts

import express from 'express';
import {
  getDeliveryOrders,
  assignDeliveryDriver,
  getDriverOrders,
  updateDriverLocation,
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
 
} from '../controllers/deliveryController';

import { getDrivers, createDriver, updateDriverStatus, deleteDriver } from '../controllers/driverController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// ==================== مسارات المطعم ====================

// جلب طلبات التوصيل للمطعم
router.get('/restaurant/orders', 
  authenticate, 
  authorize(['owner', 'super_admin', 'staff']), 
  getDeliveryOrders
);

// إحصائيات التوصيل
router.get('/restaurant/stats', 
  authenticate, 
  authorize(['owner', 'super_admin', 'delivery_driver']), 
  getDeliveryStats
);

// Alias لتوافق تطبيقات الموبايل/الواجهة التي تطلب /api/delivery/stats
router.get('/stats', 
  authenticate, 
  authorize(['owner', 'super_admin', 'delivery_driver']), 
  getDeliveryStats
);

// جلب قائمة السائقين
router.get('/drivers', 
  authenticate, 
  authorize(['owner', 'super_admin']), 
  getDrivers
);

// إنشاء سائق جديد
router.post('/drivers', 
  authenticate, 
  authorize(['owner', 'super_admin']), 
  createDriver
);

// تحديث حالة السائق
router.patch('/drivers/:driverId/status', 
  authenticate, 
  authorize(['owner', 'super_admin']), 
  updateDriverStatus
);

// حذف سائق
router.delete('/drivers/:driverId', 
  authenticate, 
  authorize(['owner', 'super_admin']), 
  deleteDriver
);

// تعيين سائق للطلب
router.post('/orders/:orderId/assign-driver', 
  authenticate, 
  authorize(['owner', 'super_admin']), 
  assignDeliveryDriver
);

// جلب طلب مع معلومات الموقع
router.get('/orders/:orderId/with-location', 
  authenticate, 
  getOrderWithLocation
);

// ==================== مسارات مندوب التوصيل ====================

// جلب طلبات السائق
router.get('/driver/orders', 
  authenticate, 
  authorize(['delivery_driver']), 
  getDriverOrders
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

// Aliases للموبايل
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

// تحديث موقع السائق
router.post('/driver/location', 
  authenticate, 
  authorize(['delivery_driver']), 
  updateDriverLocation
);

// توافق مع تطبيقات الموبايل التي تستخدم PATCH/PUT
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

router.post('/orders/:orderId/confirm-payment', 
  authenticate, 
  authorize(['delivery_driver', 'owner', 'super_admin']), 
  confirmPayment
);

router.post('/orders/:orderId/complete', 
  authenticate, 
  authorize(['delivery_driver', 'owner', 'super_admin']), 
  completeOrder
);

// جلب موقع السائق الحالي
router.get('/driver/location', 
  authenticate, 
  authorize(['delivery_driver']), 
  getMyDriverLocation
);

// جلب موقع سائق معين
router.get('/driver/:driverId/location', 
  authenticate, 
  authorize(['owner', 'super_admin', 'delivery_driver']), 
  getDriverLocation
);

// تحديث حالة طلب التوصيل
router.patch('/orders/:orderId/status', 
  authenticate, 
  authorize(['delivery_driver', 'owner', 'super_admin']), 
  updateDeliveryStatus
);


router.post('/orders/:orderId/accept', 
  authenticate, 
  authorize(['delivery_driver']), 
  acceptOrder
);


router.post('/orders/:orderId/rate', 
  authenticate, 
  authorize(['delivery_driver']), 
  rateOrder
);


router.post('/orders/:orderId/reached-restaurant', 
  authenticate, 
  authorize(['delivery_driver']), 
  driverReachedRestaurant
);
export default router;