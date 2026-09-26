// backend/src/routes/aiRoutes.ts
//
// مسارات المساعد الذكي — راجع controllers/aiController.ts.

import { Router, Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authenticate, authorizeOwner, requireStaffPermission } from '../middleware/auth';
import { getAiStatus, extractImport, commitImport, describeProduct } from '../controllers/aiController';
import { AuthRequest } from '../types';

const router = Router();

router.use(authenticate);

/**
 * حدّ دقيقةٍ لكل مستخدم فوق الحصّة اليومية.
 *
 * الحصّة تحمي الميزانية على مدى يوم، وهذا يحمي من نقرٍ متكرّر أو سكربت
 * يطلق مئة طلبٍ في ثانية — كلّها تمرّ فحص الحصّة معاً قبل أن يُسجَّل أوّلها.
 */
const aiBurstLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as AuthRequest).user?.id || ipKeyGenerator(req.ip || ''),
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'طلباتٌ كثيرة للمساعد. انتظر دقيقة.' });
  }
});

router.get('/status', getAiStatus);
router.post('/import/extract', authorizeOwner, aiBurstLimiter, extractImport);
router.post('/import/commit', authorizeOwner, commitImport);
router.post('/describe', requireStaffPermission('updateMenu', 'updateProducts'), aiBurstLimiter, describeProduct);

export default router;
