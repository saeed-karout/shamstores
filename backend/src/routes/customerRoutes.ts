// backend/src/routes/customerRoutes.ts
//
// زبائن النشاط وتقييمات منتجاته — يقرأها التاجر وموظّفوه.
//
// النشاط يُشتقّ من الرمز في كل دالّة، فلا حاجة لتمريره ولا سبيل لتزويره.

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getCustomers, getCustomerOrders } from '../controllers/customerController';
import { getStoreReviews, setReviewVisibility } from '../controllers/productReviewController';

const router = Router();

router.use(authenticate);
router.use(authorize(['owner', 'staff', 'super_admin']));

router.get('/', getCustomers);

/** `key` بصيغة `user:<id>` أو `guest:<هاتف>` — نفس ما تعيده القائمة */
router.get('/:key/orders', getCustomerOrders);

// ==================== إشراف التقييمات ====================
router.get('/reviews/all', getStoreReviews);
router.patch('/reviews/:reviewId/visibility', setReviewVisibility);

export default router;
