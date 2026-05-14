// routes/deliveryRoutes.ts

import express from 'express';
import {
  getDeliveryOrders,
  assignDeliveryDriver,
  getDriverOrders,
  updateDriverLocation,
  getDriverLocation,
  updateDeliveryStatus,
  getOrderWithLocation,
  getDeliveryStats,
  acceptOrder,
  rateOrder,
  driverReachedRestaurant,
 
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
  authorize(['owner', 'super_admin']), 
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

// تحديث موقع السائق
router.post('/driver/location', 
  authenticate, 
  authorize(['delivery_driver']), 
  updateDriverLocation
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