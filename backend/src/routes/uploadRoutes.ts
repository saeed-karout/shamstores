// backend/src/routes/uploadRoutes.ts
import { Router } from 'express';
import { 
  uploadImage, 
  deleteImage, 
  uploadMultipleImages,
  getBusinessImages,
  createVideoUploadUrl,
  completeVideoUpload,
  uploadVideoDirect
} from '../controllers/uploadController';
import { authenticate, authorize } from '../middleware/auth';
import { upload, uploadVideo, handleUploadError } from '../middleware/upload';

const router = Router();

// جميع المسارات تحتاج مصادقة
router.use(authenticate);

/**
 * @route   POST /api/upload
 * @desc    رفع صورة واحدة
 * @access  Private
 */
router.post('/', upload.single('image'), handleUploadError, uploadImage);

/**
 * @route   POST /api/upload/multiple
 * @desc    رفع عدة صور (حد أقصى 10)
 * @access  Private
 */
router.post('/multiple', upload.array('images', 10), handleUploadError, uploadMultipleImages);

/**
 * @route   POST /api/upload/video/presign
 * @desc    رابط PUT موقّع لرفع الفيديو مباشرة من المتصفح إلى R2
 * @access  Private
 */
router.post('/video/presign', createVideoUploadUrl);

/**
 * @route   POST /api/upload/video/complete
 * @desc    تأكيد الرفع المباشر وتسجيل الفيديو
 * @access  Private
 */
router.post('/video/complete', completeVideoUpload);

/**
 * @route   POST /api/upload/video
 * @desc    مسار احتياطي لرفع فيديو صغير عبر السيرفر
 * @access  Private
 */
router.post('/video', uploadVideo.single('video'), handleUploadError, uploadVideoDirect);

/**
 * @route   DELETE /api/upload
 * @desc    حذف صورة
 * @access  Private
 */
router.delete('/', deleteImage);

/**
 * @route   GET /api/upload/business-images
 * @desc    جلب صور النشاط التجاري
 * @access  Private
 */
router.get('/business-images', getBusinessImages);

export default router;