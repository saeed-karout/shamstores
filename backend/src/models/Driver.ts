// routes/driverRoutes.ts

import express from 'express';
import {
  getDrivers,
  createDriver,
  updateDriverStatus,
  deleteDriver
} from '../controllers/driverController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();


router.use(authenticate);
router.use(authorize(['owner', 'super_admin']));

router.get('/', getDrivers);
router.post('/', createDriver);
router.patch('/:driverId/status', updateDriverStatus);
router.delete('/:driverId', deleteDriver);

export default router;