// backend/src/routes/campaignRoutes.ts
//
// حملات التاجر إلى زبائنه، واشتراك الزبون فيها.
//
// المسارات ثلاثة أنواع بثلاث حمايات مختلفة:
//   - التاجر  : مصادقة + دور مالك/موظّف
//   - الزبون  : مصادقة فقط (يشترك بنفسه لنفسه)
//   - الإلغاء : بلا مصادقة — رمزٌ موقَّع، لأن الزبون يفتحه من تيليجرام أو
//               بريده وقد لا يكون مسجّلاً في ذلك المتصفّح

import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../services/prisma';
import telegram from '../services/telegram.service';
import {
  previewAudience,
  sendCampaign,
  getHistory,
  unsubscribe
} from '../controllers/campaignController';
import { subscribe, isChannel, BusinessType } from '../services/customerReach.service';

const router = Router();

// ==================== إلغاء الاشتراك (عام) ====================
//
// **قبل `authenticate`** — ترتيب express يعني أن أي حارس يُركَّب فوقه سيمنعه
router.get('/u/:token', unsubscribe);

// ==================== الزبون يشترك ====================

/**
 * يُنادى من نافذة تتبّع الطلب.
 *
 * `marketingOptIn` منفصل عمداً: من قبل أن يعرف أين وصل طلبه لم يقبل
 * إعلانات، وافتراضُ موافقته يحرق القناة على كل تجّار المنصّة لا عليه وحده.
 */
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, businessType, channel } = req.body || {};
    const marketingOptIn = req.body?.marketingOptIn === true;

    if (!businessId || (businessType !== 'restaurant' && businessType !== 'store')) {
      res.status(400).json({ success: false, error: 'النشاط غير محدَّد' });
      return;
    }
    if (!isChannel(channel)) {
      res.status(400).json({ success: false, error: 'قناة غير معروفة' });
      return;
    }

    const result = await subscribe({
      userId: req.user!.id,
      businessId,
      businessType: businessType as BusinessType,
      channel,
      marketingOptIn
    });

    if (!result.ok) {
      res.status(409).json({ success: false, error: result.reason });
      return;
    }

    // تيليجرام يحتاج ربط محادثة بعد الإذن — والرابط يُعاد هنا ليفتحه فوراً
    let telegramLinkUrl: string | null = null;
    if (channel === 'telegram') {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { telegramChatId: true }
      });
      if (!user?.telegramChatId && telegram.isConfigured()) {
        const code = await telegram.getOrCreateLinkCode(req.user!.id);
        telegramLinkUrl = telegram.buildLinkUrl(code);
      }
    }

    res.json({
      success: true,
      message: 'تم تفعيل التنبيهات',
      data: { telegramLinkUrl }
    });
  } catch (error) {
    console.error('subscribe failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تفعيل التنبيهات' });
  }
});

/** ما اشترك فيه الزبون لدى هذا النشاط — تقرؤه الواجهة لترسم الأزرار */
router.get('/subscription/:businessId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.customerSubscription.findMany({
      where: { userId: req.user!.id, businessId: req.params.businessId },
      select: { channel: true, marketingOptIn: true, unsubscribedAt: true }
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { telegramChatId: true }
    });

    res.json({
      success: true,
      data: {
        channels: rows.filter((r) => !r.unsubscribedAt).map((r) => r.channel),
        marketingOptIn: rows.some((r) => r.marketingOptIn && !r.unsubscribedAt),
        unsubscribed: rows.length > 0 && rows.every((r) => Boolean(r.unsubscribedAt)),
        telegramLinked: Boolean(user?.telegramChatId),
        telegramAvailable: telegram.isConfigured()
      }
    });
  } catch (error) {
    console.error('get subscription failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر قراءة الاشتراك' });
  }
});

// ==================== التاجر يرسل ====================

router.use(authenticate);
router.use(authorize(['owner', 'staff', 'super_admin']));

router.get('/audience', previewAudience);
router.get('/history', getHistory);
router.post('/send', sendCampaign);

export default router;
