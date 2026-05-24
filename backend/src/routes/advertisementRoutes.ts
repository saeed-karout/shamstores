// backend/src/routes/advertisementRoutes.ts

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllAdvertisements,
  getAdvertisement,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  toggleAdvertisementStatus,
  getAdvertisementsStats,
  getPublicAdvertisements
} from '../controllers/advertisementController';

const router = Router();

// ✅ استخدم as any للتجاوز
router.get('/public', getPublicAdvertisements as any);

router.use(authenticate);
router.use(authorize(['super_admin']));

router.get('/', getAllAdvertisements as any);
router.get('/stats', getAdvertisementsStats as any);
router.get('/:id', getAdvertisement as any);
router.post('/', createAdvertisement as any);
router.put('/:id', updateAdvertisement as any);
router.delete('/:id', deleteAdvertisement as any);
router.patch('/:id/toggle', toggleAdvertisementStatus as any);

export default router;