// backend/src/routes/affiliateRoutes.ts
//
// المسوّقون بالعمولة. `affiliate` إضافة مدفوعة، والحارس على مسارات التاجر
// وحدها — تتبّع الزيارة عامّ لأن الزائر ليس مسجّلاً ولا يملك خطة.

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { checkPlanFeature } from '../middleware/checkPlan';
import {
  listAffiliates,
  createAffiliate,
  updateAffiliate,
  getReferrals,
  markPaid,
  trackVisit
} from '../controllers/affiliateController';

const router = Router();

/** قبل `authenticate` — ترتيب express يعني أن حارساً فوقه سيمنع الزائر */
router.post('/track', trackVisit);

router.use(authenticate);
router.use(authorize(['owner', 'staff', 'super_admin']));
router.use(checkPlanFeature('affiliate'));

router.get('/', listAffiliates);
router.post('/', createAffiliate);
router.patch('/:id', updateAffiliate);
router.get('/:id/referrals', getReferrals);
router.post('/:id/pay', markPaid);

export default router;
