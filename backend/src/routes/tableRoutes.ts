import { Router } from 'express';
import {
  getTables,
  getTable,           // أضف هذا
  createTable,
  updateTable,
  deleteTable,
  generateTableQR,
  generateAllTableQRs
} from '../controllers/tableController';
import { authenticate, authorizeOwner, authorizeStaff } from '../middleware/auth';
import { checkPlanFeature } from '../middleware/checkPlan';

const router = Router();

// جميع المسارات تحتاج مصادقة
router.use(authenticate);
router.use(checkPlanFeature('table_qr'));

/**
 * @route   GET /api/tables
 * @desc    الحصول على جميع الطاولات
 * @access  Private (Owner/Staff)
 */
router.get('/', authorizeStaff, getTables);

/**
 * @route   GET /api/tables/:id
 * @desc    الحصول على طاولة محددة
 * @access  Private (Owner/Staff)
 */
router.get('/:id', authorizeStaff, getTable);  // أضف هذا

/**
 * @route   POST /api/tables
 * @desc    إنشاء طاولة جديدة
 * @access  Private (Owner)
 */
router.post('/', authorizeOwner, createTable);

/**
 * @route   PUT /api/tables/:id
 * @desc    تحديث طاولة
 * @access  Private (Owner)
 */
router.put('/:id', authorizeOwner, updateTable);

/**
 * @route   DELETE /api/tables/:id
 * @desc    حذف طاولة
 * @access  Private (Owner)
 */
router.delete('/:id', authorizeOwner, deleteTable);

/**
 * @route   POST /api/tables/:id/qr
 * @desc    إنشاء رمز QR لطاولة
 * @access  Private (Owner)
 */
router.post('/:id/qr', authorizeOwner, generateTableQR);

/**
 * @route   POST /api/tables/qr/all
 * @desc    إنشاء رموز QR لجميع الطاولات
 * @access  Private (Owner)
 */
router.post('/qr/all', authorizeOwner, generateAllTableQRs);

export default router;
