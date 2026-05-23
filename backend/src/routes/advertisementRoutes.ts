// backend/src/routes/advertisementRoutes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getActiveAdvertisements,
  getAllAdvertisements,
  getAdvertisement,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  toggleAdvertisementStatus,
  getAdvertisementsStats
} from '../controllers/advertisementController';

const router = Router();

// ==================== مسارات عامة (بدون مصادقة) ====================
router.get('/public', getActiveAdvertisements);

// ==================== مسارات السوبر أدمن فقط ====================
router.use(authenticate);
router.use(authorize(['super_admin']));

router.get('/', getAllAdvertisements);
router.get('/stats', getAdvertisementsStats);
router.get('/:id', getAdvertisement);
router.post('/', createAdvertisement);
router.put('/:id', updateAdvertisement);
router.delete('/:id', deleteAdvertisement);
router.patch('/:id/toggle', toggleAdvertisementStatus);

export default router;