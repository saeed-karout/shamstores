// backend/src/routes/pricingRoutes.ts
//
// التسعير بالدولار — القراءة لكل من يعدّل الأصناف (المعاينة الحيّة في
// النموذج تحتاجها)، والتعديل للمالك وحده: سعر الصرف يغيّر كل أسعار النشاط.
//
// بلا بوابة خطة: التسعير يمسّ مبلغ كل طلب، وقفلُه عند تخفيض الخطة يترك
// أسعاراً مجمّدة بسعر صرفٍ قديم بلا طريقٍ لتحديثها.

import { Router } from 'express';
import { authenticate, authorize, authorizeOwner } from '../middleware/auth';
import { getPricing, previewPricing, updatePricing, quotePrice } from '../controllers/pricingController';

const router = Router();

router.use(authenticate);
router.use(authorize(['owner', 'staff', 'super_admin']));

router.get('/', getPricing);
router.get('/quote', quotePrice);
router.post('/preview', authorizeOwner, previewPricing);
router.put('/', authorizeOwner, updatePricing);

export default router;
