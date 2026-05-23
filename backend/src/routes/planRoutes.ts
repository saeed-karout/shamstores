// backend/src/routes/planRoutes.ts
import { Router } from 'express';
import {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  getCurrentPlan,
  getCurrentPlanMe,
  createUpgradeRequest,
  getUserUpgradeRequests,
  getAllUpgradeRequests,
  approveUpgradeRequest,
  rejectUpgradeRequest
} from '../controllers/planController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ==================== المسارات العامة (لا تحتاج مصادقة) ====================
router.get('/', getPlans);
router.get('/:id', getPlan);

// ==================== المسارات الخاصة (تحتاج مصادقة) ====================
router.use(authenticate);

// مسارات المالك/المستخدم
router.get('/current/me', getCurrentPlan);
router.post('/upgrade', createUpgradeRequest);
router.get('/user/upgrade-requests', getUserUpgradeRequests);

// ==================== مسارات السوبر أدمن فقط ====================
// تحديث وحذف الخطط
router.put('/:id', authorize(['super_admin']), updatePlan);
router.delete('/:id', authorize(['super_admin']), deletePlan);
router.post('/', authorize(['super_admin']), createPlan);

// إدارة طلبات الترقية
router.get('/admin/upgrade-requests', authorize(['super_admin']), getAllUpgradeRequests);
router.post('/admin/approve-upgrade/:requestId', authorize(['super_admin']), approveUpgradeRequest);
router.post('/admin/reject-upgrade/:requestId', authorize(['super_admin']), rejectUpgradeRequest);

export default router;