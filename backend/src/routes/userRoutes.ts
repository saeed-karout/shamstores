import { Router } from 'express';
import { authenticate } from '../middleware/auth';
// import { getUserUpgradeRequests } from '../controllers/adminController';

const router = Router();

router.use(authenticate);
// router.get('/upgrade-requests', getUserUpgradeRequests);

export default router;