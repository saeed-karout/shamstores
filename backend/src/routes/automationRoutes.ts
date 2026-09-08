// backend/src/routes/automationRoutes.ts
//
// الرسائل التلقائية.
//
// مساران بحمايتين مختلفتين:
//   - إعدادات القواعد : التاجر وحده (مالك أو موظّف مخوَّل)
//   - التقاط السلّة   : عامّ — الضيوف هم من نستهدفهم أصلاً

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { optionalAuthenticate } from '../middleware/optionalAuth';
import {
  getAutomations,
  updateAutomations,
  runNow,
  snapshotCart
} from '../controllers/automationController';

const router = Router();

// ==================== عامّ ====================
//
// **قبل `authenticate`**: ترتيب express يعني أن أي حارس يُركَّب فوقه سيمنعه
router.post('/cart-snapshot', optionalAuthenticate, snapshotCart);

// ==================== التاجر ====================

router.use(authenticate);
router.use(authorize(['owner', 'staff', 'super_admin']));

router.get('/', getAutomations);
router.put('/', updateAutomations);
router.post('/run/:rule', runNow);

export default router;
