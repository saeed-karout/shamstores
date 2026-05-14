// routes/restaurantRoutes.ts

import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadLogo,
  uploadCover,
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  getRestaurantById,
  getDeliverySettings
} from '../controllers/restaurantController';
import { authenticate, authorizeOwner, authorizeAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// ==================== مسارات إعدادات التوصيل (تأتي أولاً) ====================

/**
 * @route   GET /api/restaurants/delivery-settings
 * @desc    الحصول على إعدادات التوصيل
 * @access  Private
 */
router.get('/delivery-settings', authenticate, getDeliverySettings);

// ==================== المسارات الخاصة ====================

/**
 * @route   GET /api/restaurants/profile
 * @desc    الحصول على بيانات المطعم الخاص بالمستخدم
 * @access  Private
 */
router.get('/profile', authenticate, getProfile);

/**
 * @route   PUT /api/restaurants/profile
 * @desc    تحديث بيانات المطعم الخاص بالمستخدم
 * @access  Private (Owner/Super Admin)
 */
router.put('/profile', authenticate, updateProfile);

/**
 * @route   POST /api/restaurants/logo
 * @desc    رفع شعار المطعم
 * @access  Private (Owner/Super Admin)
 */
router.post('/logo', authenticate, upload.single('image'), uploadLogo);

/**
 * @route   POST /api/restaurants/cover
 * @desc    رفع صورة الغلاف
 * @access  Private (Owner/Super Admin)
 */
router.post('/cover', authenticate, upload.single('image'), uploadCover);

/**
 * @route   GET /api/restaurants/staff
 * @desc    الحصول على قائمة الموظفين
 * @access  Private (Owner)
 */
router.get('/staff', authenticate, authorizeOwner, getStaff);

/**
 * @route   POST /api/restaurants/staff
 * @desc    إضافة موظف جديد
 * @access  Private (Owner)
 */
router.post('/staff', authenticate, authorizeOwner, addStaff);

/**
 * @route   PUT /api/restaurants/staff/:id
 * @desc    تحديث بيانات موظف
 * @access  Private (Owner)
 */
router.put('/staff/:id', authenticate, authorizeOwner, updateStaff);

/**
 * @route   DELETE /api/restaurants/staff/:id
 * @desc    حذف موظف
 * @access  Private (Owner)
 */
router.delete('/staff/:id', authenticate, authorizeOwner, deleteStaff);

// ==================== المسارات العامة ====================

/**
 * @route   GET /api/restaurants/:id
 * @desc    الحصول على مطعم بواسطة ID (عام)
 * @access  Public
 */
router.get('/:id', getRestaurantById);

export default router;