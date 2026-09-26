// backend/src/routes/itemCommentRoutes.ts
//
// التعليقات على المنتجات والوجبات — `/api/comments`.
//
// **شطران في ملفٍ واحد:** عامٌّ يقرأه الجميع ويكتب فيه الزبون المسجَّل،
// وإشرافٌ للتاجر. جمعُهما
// هنا يُبقي قواعد الشيء الواحد في مكانٍ واحد؛ وكلّ مسار إشرافٍ يحمل حرّاسه
// بنفسه بدل `router.use` كي لا يُغلق الشطر العامّ بالخطأ.

import { Router, Request } from 'express';
import rateLimit, { Options, ipKeyGenerator } from 'express-rate-limit';
import { authenticate, authorize, requireStaffPermission } from '../middleware/auth';
import { optionalAuthenticate } from '../middleware/optionalAuth';
import env from '../config/env';
import { AuthRequest } from '../types';
import {
  getProductComments,
  getMenuItemComments,
  createProductComment,
  createMenuItemComment,
  setCommentReaction,
  getManageComments,
  replyToComment,
  setCommentVisibility,
  deleteComment
} from '../controllers/itemCommentController';

const router = Router();

/**
 * حدّ النشر العامّ: خمسة تعليقات كلّ عشر دقائق لكل عنوان.
 *
 * زبونٌ حقيقيّ لا يسأل خمسة أسئلة في عشر دقائق — ومن يفعل يتجاوز الاستعمال
 * إلى الإغراق. والحدّ على النشر وحده: القراءة يغطّيها الحدّ العامّ للـ API،
 * وحجبُها يُخفي التعليقات عن متصفّحٍ لم يكتب شيئاً.
 */
const commentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // المرفوض (نصٌّ قصير، روابط كثيرة، ضيفٌ بلا حساب) لا يُحتسب: لم يُكتب
  // صفّ، ومن يصحّح نموذجه لا يجوز أن يستنفد حصّته
  skipFailedRequests: true,
  skip: () => env.DISABLE_RATE_LIMIT,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'نشرت تعليقات كثيرة في وقتٍ قصير. حاول بعد دقائق.',
      retryAfter: true
    });
  }
} as Partial<Options>);

/**
 * حدّ التفاعل: ستّون نقرة إعجابٍ كلّ عشر دقائق لكل حساب.
 *
 * بالحساب لا بالعنوان: زبائن مقهى واحد يتشاركون عنواناً، وحسابٌ واحد يتنقّل
 * بين الشبكات. والستّون تتّسع لمن يقرأ نقاشاً طويلاً ويبدّل رأيه، وتضيق على
 * سكربتٍ ينفخ عدّاداً.
 */
const reactionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as AuthRequest).user?.id || ipKeyGenerator(req.ip || ''),
  skip: () => env.DISABLE_RATE_LIMIT,
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'تفاعلاتٌ كثيرة في وقتٍ قصير. حاول بعد دقائق.', retryAfter: true });
  }
} as Partial<Options>);

// ==================== عامّ ====================
// القراءة للجميع، و`optionalAuthenticate` فيها ليعرف القارئ المسجَّل أيّ
// زرٍّ ضغطه — والرمز التالف يُعامَل ضيفاً لا مرفوضاً.
// والكتابة والتفاعل بحسابٍ فقط (`authenticate`): الاسم يُؤخذ من الحساب.
router.get('/product/:productId', optionalAuthenticate, getProductComments);
router.post('/product/:productId', commentLimiter, authenticate, createProductComment);
router.get('/menu-item/:menuItemId', optionalAuthenticate, getMenuItemComments);
router.post('/menu-item/:menuItemId', commentLimiter, authenticate, createMenuItemComment);
router.put('/:id/reaction', authenticate, reactionLimiter, setCommentReaction);

// ==================== إشراف التاجر ====================
// القراءة كالتقييمات والزبائن: المالك وموظّفوه. والكتابة (ردّ، إخفاء، حذف)
// لمن يملك تعديل الكتالوج — الردّ يُنشر باسم النشاط، فلا يُمنح لكل موظّف.
const staff = [authenticate, authorize(['owner', 'staff', 'super_admin'])];
const canModerate = requireStaffPermission('updateProducts', 'updateMenu');

router.get('/manage', ...staff, getManageComments);
router.post('/:id/reply', ...staff, canModerate, replyToComment);
router.patch('/:id/visibility', ...staff, canModerate, setCommentVisibility);
router.delete('/:id', ...staff, canModerate, deleteComment);

export default router;
