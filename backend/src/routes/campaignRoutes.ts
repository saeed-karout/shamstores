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
import { subscribe, isChannel, BusinessType, subjectKeyOf } from '../services/customerReach.service';
import { optionalAuthenticate } from '../middleware/optionalAuth';

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
router.post('/subscribe', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, businessType, channel } = req.body || {};
    const marketingOptIn = req.body?.marketingOptIn === true;
    const visitorId = typeof req.body?.visitorId === 'string' ? req.body.visitorId.trim().slice(0, 64) : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim().slice(0, 32) : '';

    if (!businessId || (businessType !== 'restaurant' && businessType !== 'store')) {
      res.status(400).json({ success: false, error: 'النشاط غير محدَّد' });
      return;
    }
    if (!isChannel(channel)) {
      res.status(400).json({ success: false, error: 'قناة غير معروفة' });
      return;
    }

    // الضيف يُعرَّف بمعرّف زائرٍ يولّده متصفّحه. وبلا أحدهما لا هوية،
    // فيرتدّ الطلب بدل أن يُنشئ صفّاً لا يُعرف صاحبه ولا يمكن مراسلته.
    const userId = req.user?.id || null;
    if (!subjectKeyOf({ userId, visitorId })) {
      res.status(400).json({ success: false, error: 'تعذّر تحديد هويّتك — أعد تحميل الصفحة' });
      return;
    }

    const result = await subscribe({
      userId,
      visitorId: visitorId || null,
      phone: phone || null,
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
    // تيليجرام يشترط حساباً: رمز الربط يُخزَّن على المستخدم، ولا مكان له
    // عند ضيفٍ بلا صفّ في `User`
    if (channel === 'telegram' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramChatId: true }
      });
      if (!user?.telegramChatId && telegram.isConfigured()) {
        const code = await telegram.getOrCreateLinkCode(userId);
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
router.get('/subscription/:businessId', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  try {
    const visitorId = typeof req.query.visitorId === 'string' ? req.query.visitorId.slice(0, 64) : '';
    const subjectKey = subjectKeyOf({ userId: req.user?.id || null, visitorId });
    if (!subjectKey) {
      res.json({ success: true, data: { channels: [], telegramLinked: false } });
      return;
    }

    const rows = await prisma.customerSubscription.findMany({
      where: { subjectKey, businessId: req.params.businessId },
      select: { channel: true, marketingOptIn: true, unsubscribedAt: true }
    });

    // الضيف لا صفّ له في `User` — ولا محادثة تيليجرام بالتالي
    const user = req.user?.id
      ? await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { telegramChatId: true }
        })
      : null;

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
