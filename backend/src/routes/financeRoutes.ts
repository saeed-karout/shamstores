// backend/src/routes/financeRoutes.ts
//
// القسم المالي — للمالك وحده.
//
// الأرقام هنا تشمل التكلفة والربح، وهي ما لا يُطلع التاجر عليه موظّفيه
// عادةً. لذلك `owner` و`super_admin` فقط، بلا `staff`.

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getFinanceOrders, recordReturn, cancelReturn } from '../controllers/financeController';

const router = Router();

router.use(authenticate);
router.use(authorize(['owner', 'super_admin']));

router.get('/orders', getFinanceOrders);
router.post('/orders/:id/return', recordReturn);
router.delete('/orders/:id/return', cancelReturn);

export default router;
