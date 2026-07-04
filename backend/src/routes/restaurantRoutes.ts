// backend/src/routes/restaurantRoutes.ts
import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadLogo,
  uploadCover,
  getRestaurantById,
  getDeliverySettings,
  createRestaurant,
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  createRestaurantBranch,
  getAllBranchesMenuItems,
  updateShowAllBranchesMenuItems
} from '../controllers/restaurantController';
import { authenticate, authorizeOwner, authorizeAdmin } from '../middleware/auth';
import { checkPlanFeature, requirePaidPlanForStaff } from '../middleware/checkPlan';
import { upload } from '../middleware/upload';

const router = Router();

// ==================== مسارات إعدادات التوصيل ====================
router.get('/delivery-settings', authenticate, checkPlanFeature('online_orders'), getDeliverySettings);

// ==================== المسارات الخاصة ====================
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/logo', authenticate, upload.single('image'), uploadLogo);
router.post('/cover', authenticate, upload.single('image'), uploadCover);
router.post('/', authenticate, authorizeOwner, createRestaurant);

// ==================== مسارات الموظفين ====================
router.get('/staff', authenticate, authorizeOwner, requirePaidPlanForStaff('restaurant'), getStaff);
router.post('/staff', authenticate, authorizeOwner, requirePaidPlanForStaff('restaurant'), addStaff);
router.put('/staff/:id', authenticate, authorizeOwner, requirePaidPlanForStaff('restaurant'), updateStaff);
router.delete('/staff/:id', authenticate, authorizeOwner, requirePaidPlanForStaff('restaurant'), deleteStaff);

// ==================== المسارات العامة ====================
router.get('/:identifier', getRestaurantById);




// ==================== مسارات الفروع ====================
router.post('/branches', authenticate, createRestaurantBranch);
router.get('/branches/all-menu-items', authenticate, getAllBranchesMenuItems);
router.patch('/branches/show-all-menu-items', authenticate, updateShowAllBranchesMenuItems);

export default router;
