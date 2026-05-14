import { Router } from 'express';
import {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  getCurrentPlan,
  // upgradePlan
} from '../controllers/planController';
import { authenticate, authorizeAdmin, authorizeOwner } from '../middleware/auth';

const router = Router();

// المسارات العامة
router.get('/', getPlans);
router.get('/:id', getPlan);

// المسارات الخاصة (تحتاج مصادقة)
router.use(authenticate);

// المسارات الخاصة بالمالك
router.get('/current/me', authorizeOwner, getCurrentPlan);
// router.post('/upgrade', authorizeOwner, upgradePlan);

// مسارات الأدمن فقط
router.post('/', authorizeAdmin, createPlan);
router.put('/:id', authorizeAdmin, updatePlan);
router.delete('/:id', authorizeAdmin, deletePlan);

export default router;