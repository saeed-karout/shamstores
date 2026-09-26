// backend/src/routes/checkoutRoutes.ts
//
// إضافات إتمام الطلب — راجع controllers/checkoutController.ts.
//
// الإعدادات: قراءةٌ لطاقم النشاط، وتعديلٌ للمالك وحده (تعليمات الدفع للمغترب
// نصٌّ يُرسل الناسُ المال بناءً عليه). وأفعال الطلب (تأكيد التحويل، العربون،
// الأقساط) لمن يملك صلاحية تحديث الطلبات — كتأكيد الدفع القائم.
//
// بوابة الخطة للهدايا والعربون داخل الخدمة لا هنا: الإعداد يُحفظ ولو نزلت
// الخطة، وإنما يختفي عن الزبائن.

import { Router } from 'express';
import { authenticate, authorize, authorizeOwner, requireStaffPermission } from '../middleware/auth';
import {
  getCheckoutSettings,
  updateCheckoutSettings,
  getOrderExtras,
  confirmGiftPayment,
  setDepositPaid,
  setInstallments,
  setInstallmentPaid,
  getPublicOrderTracking
} from '../controllers/checkoutController';

const router = Router();

// عامّ: صفحة تتبّع الطلب — المعرّف الطويل هو المفتاح
router.get('/track/:orderId', getPublicOrderTracking);

router.use(authenticate);
router.use(authorize(['owner', 'staff', 'super_admin']));

router.get('/settings', getCheckoutSettings);
router.put('/settings', authorizeOwner, updateCheckoutSettings);

router.get('/orders/:id', requireStaffPermission('viewOrders'), getOrderExtras);
router.post('/orders/:id/confirm-payment', requireStaffPermission('updateOrderStatus'), confirmGiftPayment);
router.post('/orders/:id/deposit', requireStaffPermission('updateOrderStatus'), setDepositPaid);
router.put('/orders/:id/installments', requireStaffPermission('updateOrderStatus'), setInstallments);
router.patch('/orders/:id/installments/:installmentId', requireStaffPermission('updateOrderStatus'), setInstallmentPaid);

export default router;
