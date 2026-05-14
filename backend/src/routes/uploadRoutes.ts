// backend/src/routes/uploadRoutes.ts

import { Router } from 'express';
import { uploadImage, deleteImage, uploadMultipleImages } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';
import { upload, handleUploadError } from '../middleware/upload';

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
 * @desc    رفع عدة صور
 * @access  Private
 */
router.post('/multiple', upload.array('images', 10), handleUploadError, uploadMultipleImages);

/**
 * @route   DELETE /api/upload
 * @desc    حذف صورة
 * @access  Private
 */
router.delete('/', deleteImage);

export default router;