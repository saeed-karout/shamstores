// backend/src/routes/verificationRoutes.ts
//
// توثيق التاجر — مسارات التاجر ومسارات المشرف في ملفٍ واحد، كلّها خلف
// المصادقة. مسارات المشرف تحت `/admin` بحارس `super_admin`.

import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import { handleUploadError } from '../middleware/upload';
import { PRIVATE_DOC_TYPES, MAX_PRIVATE_DOC_BYTES } from '../services/privateDocs.service';
import {
  getMyVerification,
  submitVerification,
  listVerificationRequests,
  streamVerificationFile,
  approveVerification,
  rejectVerification,
  revokeVerification
} from '../controllers/verificationController';

const router = Router();

/**
 * رافعٌ خاصّ بالوثائق لا `upload` العامّ:
 *   - يقبل PDF (السجلّ التجاري غالباً ملف ممسوح) والعامّ صورٌ فقط.
 *   - في الذاكرة لا على القرص: الملف يُكتب مرّة واحدة إلى مخزنه الخاص، ولا
 *     تبقى نسخةٌ من هوية أحدٍ في `temp/` إن سقط الطلب في منتصفه.
 */
const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PRIVATE_DOC_BYTES, files: 2, fields: 10 },
  fileFilter: (_req, file, cb) => {
    if (PRIVATE_DOC_TYPES[file.mimetype]) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم. ارفع صورة JPG أو PNG أو WEBP أو ملف PDF'));
  }
});

router.use(authenticate);

// ==================== التاجر ====================
router.get('/me', getMyVerification);
router.post(
  '/',
  (req, res, next) =>
    docUpload.fields([
      { name: 'document', maxCount: 1 },
      { name: 'shopPhoto', maxCount: 1 }
    ])(req, res, (err: any) => (err ? handleUploadError(err, req, res, next) : next())),
  submitVerification
);

// ==================== المشرف ====================
router.get('/admin/requests', authorize(['super_admin']), listVerificationRequests);
router.get('/admin/requests/:id/file/:which', authorize(['super_admin']), streamVerificationFile);
router.post('/admin/requests/:id/approve', authorize(['super_admin']), approveVerification);
router.post('/admin/requests/:id/reject', authorize(['super_admin']), rejectVerification);
router.post('/admin/requests/:id/revoke', authorize(['super_admin']), revokeVerification);

export default router;
