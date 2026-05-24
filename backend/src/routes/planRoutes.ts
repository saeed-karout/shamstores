// backend/src/routes/planRoutes.ts

import { Router, Request, Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../server';
import {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  getCurrentPlan,
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

// ✅ مسار عام لجلب خطة المتجر/المطعم (لا يحتاج توكن)
router.get('/business/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    
    // البحث في المتاجر أولاً
    let store = await prisma.store.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { subdomain: identifier }
        ],
        isActive: true
      }
    });
    
    if (store) {
      const plan = await prisma.plan.findUnique({
        where: { id: store.planId }
      });
      res.json({ success: true, data: plan });
      return;
    }
    
    // البحث في المطاعم
    let restaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { subdomain: identifier }
        ],
        isActive: true
      }
    });
    
    if (restaurant) {
      const plan = await prisma.plan.findUnique({
        where: { id: restaurant.planId }
      });
      res.json({ success: true, data: plan });
      return;
    }
    
    res.status(404).json({ success: false, error: 'النشاط التجاري غير موجود' });
  } catch (error) {
    console.error('Error fetching business plan:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الخطة' });
  }
});

// ==================== المسارات الخاصة (تحتاج مصادقة) ====================
router.use(authenticate);

// ✅ مسار جلب الخطة الحالية للمستخدم (يحتاج مصادقة)
router.get('/current/me', getCurrentPlan);

// مسارات طلبات الترقية
router.post('/upgrade-request', createUpgradeRequest);
router.get('/user/upgrade-requests', getUserUpgradeRequests);

// ==================== مسارات السوبر أدمن فقط ====================
router.put('/:id', authorize(['super_admin']), updatePlan);
router.delete('/:id', authorize(['super_admin']), deletePlan);
router.post('/', authorize(['super_admin']), createPlan);

router.get('/admin/upgrade-requests', authorize(['super_admin']), getAllUpgradeRequests);
router.post('/admin/approve-upgrade/:requestId', authorize(['super_admin']), approveUpgradeRequest);
router.post('/admin/reject-upgrade/:requestId', authorize(['super_admin']), rejectUpgradeRequest);

export default router;