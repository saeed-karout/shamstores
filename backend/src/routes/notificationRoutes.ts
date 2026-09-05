// backend/src/routes/notificationRoutes.ts
//
// مركز الإشعارات. كل المسارات تعمل على إشعارات **المستخدم الحالي وحده** —
// المعرّف يأتي من الرمز لا من الطلب، فلا سبيل لقراءة إشعارات غيرك.

import { Router } from 'express';
import { Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate } from '../middleware/auth';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getUserNotificationTypes
} from '../services/notification.service';

const router = Router();

router.use(authenticate);

/** القائمة مع التصفية والترقيم */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await listNotifications(userId, {
      unreadOnly: req.query.unread === 'true',
      type: typeof req.query.type === 'string' && req.query.type ? req.query.type : undefined,
      limit: Number(req.query.limit) || 20,
      cursor: typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    });

    // العدّاد والتصنيفات مع القائمة: نداء واحد يكفي لرسم الجرس واللوحة معاً
    const [unreadCount, types] = await Promise.all([
      getUnreadCount(userId),
      getUserNotificationTypes(userId)
    ]);

    res.json({ success: true, data: { ...result, unreadCount, types } });
  } catch (error) {
    console.error('Error listing notifications:', error);
    res.status(500).json({ success: false, error: 'تعذّر جلب الإشعارات' });
  }
});

/** عدّاد غير المقروء وحده — نداء خفيف للجرس */
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    res.json({ success: true, data: { unreadCount: await getUnreadCount(req.user!.id) } });
  } catch (error) {
    console.error('Error counting notifications:', error);
    res.status(500).json({ success: false, error: 'تعذّر قراءة العدّاد' });
  }
});

router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const updated = await markAsRead(req.user!.id, req.params.id);
    // صفر تعني: غير موجود، أو مقروء أصلاً، أو ليس لك. لا نميّز بينها في الردّ
    // حتى لا تكشف الاستجابة وجود إشعار لمستخدم آخر.
    res.json({ success: true, data: { updated } });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ success: false, error: 'تعذّر تعليم الإشعار' });
  }
});

router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    res.json({ success: true, data: { updated: await markAllAsRead(req.user!.id) } });
  } catch (error) {
    console.error('Error marking all read:', error);
    res.status(500).json({ success: false, error: 'تعذّر تعليم الإشعارات' });
  }
});

export default router;
