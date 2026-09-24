// backend/src/routes/itemCommentRoutes.ts
//
// التعليقات على المنتجات والوجبات — `/api/comments`.
//
// **شطران في ملفٍ واحد:** عامٌّ يقرأ ويكتب بلا حساب، وإشرافٌ للتاجر. جمعُهما
// هنا يُبقي قواعد الشيء الواحد في مكانٍ واحد؛ وكلّ مسار إشرافٍ يحمل حرّاسه
// بنفسه بدل `router.use` كي لا يُغلق الشطر العامّ بالخطأ.

import { Router } from 'express';
import rateLimit, { Options } from 'express-rate-limit';
import { authenticate, authorize, requireStaffPermission } from '../middleware/auth';
import { optionalAuthenticate } from '../middleware/optionalAuth';
import env from '../config/env';
import {
  getProductComments,
  getMenuItemComments,
  createProductComment,
  createMenuItemComment,
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
  // المرفوض (اسمٌ ناقص، روابط كثيرة) لا يُحتسب: لم يُكتب صفّ، والزبون
  // الذي نسي اسمه لا يجوز أن يستنفد حصّته في تصحيح نموذجه
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

// ==================== عامّ ====================
// `optionalAuthenticate`: الزبون المسجَّل يعلّق باسم حسابه، والضيف باسمٍ
// يكتبه — والرمز التالف يُعامَل ضيفاً لا مرفوضاً.
router.get('/product/:productId', getProductComments);
router.post('/product/:productId', commentLimiter, optionalAuthenticate, createProductComment);
router.get('/menu-item/:menuItemId', getMenuItemComments);
router.post('/menu-item/:menuItemId', commentLimiter, optionalAuthenticate, createMenuItemComment);

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
