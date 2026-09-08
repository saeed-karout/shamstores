// backend/src/routes/alertChannelRoutes.ts
//
// قنوات تنبيه المستخدم: أجهزة المتصفّح ومحادثة تيليجرام.
//
// كلها تعمل على **المستخدم الحالي وحده** — المعرّف من الرمز لا من الطلب،
// فلا سبيل لربط محادثةٍ بحساب غيرك ولا لقراءة أجهزته.

import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate } from '../middleware/auth';
import prisma from '../services/prisma';
import telegram from '../services/telegram.service';
import firebaseService from '../services/firebaseService';

const router = Router();

router.use(authenticate);

// ==================== أجهزة إشعارات المتصفّح ====================

/**
 * تسجيل جهاز.
 *
 * `upsert` على الرمز لا على المستخدم: الرمز فريدٌ عالمياً، وجهازٌ سلّمه
 * صاحبه لغيره ثم سجّل الثاني دخوله يجب أن تنتقل ملكيّته لا أن يبقى يستقبل
 * إشعارات الأوّل.
 */
router.post('/devices', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const platform = typeof req.body?.platform === 'string' ? req.body.platform : 'web';
    const label = typeof req.body?.label === 'string' ? req.body.label.slice(0, 120) : null;

    if (!token) {
      res.status(400).json({ success: false, error: 'رمز الجهاز مطلوب' });
      return;
    }

    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform, label, lastSeenAt: new Date() },
      create: { userId, token, platform, label }
    });

    res.json({ success: true, message: 'تم تفعيل الإشعارات على هذا الجهاز' });
  } catch (error) {
    console.error('registerDevice failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تسجيل الجهاز' });
  }
});

/**
 * إلغاء تفعيل الجهاز الحالي — لا كل أجهزة المستخدم.
 *
 * `POST` لا `DELETE`: الرمز طويل ولا يصلح في المسار، وعميل الواجهة لا يمرّر
 * جسماً مع `DELETE`.
 */
router.post('/devices/remove', async (req: AuthRequest, res: Response) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      res.status(400).json({ success: false, error: 'رمز الجهاز مطلوب' });
      return;
    }
    await prisma.deviceToken.deleteMany({ where: { token, userId: req.user!.id } });
    res.json({ success: true, message: 'تم إيقاف الإشعارات على هذا الجهاز' });
  } catch (error) {
    console.error('unregisterDevice failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر إلغاء الجهاز' });
  }
});

// ==================== حالة القنوات ====================

/**
 * ما يحتاجه قسم الإعدادات في نداء واحد.
 *
 * `telegramAvailable` منفصلٌ عن `telegramLinked` عمداً: بوتٌ غير مضبوط على
 * الخادم يعني زرّ ربطٍ لا يعمل — وعرضه للتاجر يجعله يجرّب ويفشل ويظنّ
 * العطل عنده.
 */
router.get('/channels', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        telegramChatId: true,
        telegramLinkedAt: true,
        deviceTokens: {
          select: { id: true, platform: true, label: true, lastSeenAt: true },
          orderBy: { lastSeenAt: 'desc' }
        }
      }
    });

    const available = telegram.isConfigured() && Boolean(telegram.botUsername());
    const linked = Boolean(user?.telegramChatId);

    // الرابط يُولَّد فقط عند الحاجة: توليده لمن ربط أصلاً يُنشئ رمزاً معلّقاً
    const linkCode = available && !linked
      ? await telegram.getOrCreateLinkCode(req.user!.id)
      : null;

    res.json({
      success: true,
      data: {
        push: {
          available: firebaseService.isConfigured,
          devices: user?.deviceTokens || []
        },
        telegram: {
          available,
          linked,
          linkedAt: user?.telegramLinkedAt || null,
          botUsername: telegram.botUsername() || null,
          linkUrl: linkCode ? telegram.buildLinkUrl(linkCode) : null
        }
      }
    });
  } catch (error) {
    console.error('getChannels failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر قراءة حالة التنبيهات' });
  }
});

router.post('/telegram/unlink', async (req: AuthRequest, res: Response) => {
  try {
    await telegram.unlinkChat(req.user!.id);
    res.json({ success: true, message: 'تم فكّ ارتباط تيليجرام' });
  } catch (error) {
    console.error('unlinkTelegram failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر فكّ الارتباط' });
  }
});

/** رسالة تجريبية — التاجر يتأكّد بنفسه بدل أن ينتظر أوّل طلب ليكتشف العطل */
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true, telegramChatId: true, fcmToken: true, deviceTokens: { select: { token: true } } }
    });

    let telegramSent = false;
    if (user?.telegramChatId) {
      telegramSent = await telegram.sendMessage(user.telegramChatId, {
        text: '✅ <b>تجربة ناجحة</b>\n\nهكذا سيصلك تنبيه الطلب الجديد.'
      });
    }

    const tokens = Array.from(new Set([
      ...(user?.deviceTokens || []).map((d) => d.token),
      ...(user?.fcmToken ? [user.fcmToken] : [])
    ]));

    let pushSent = 0;
    for (const token of tokens) {
      const result = await firebaseService.sendToDevice(token, {
        title: 'تجربة تنبيهات شام ستورز',
        body: 'هكذا سيصلك تنبيه الطلب الجديد ✅',
        type: 'alert'
      });
      if (result.ok) pushSent += 1;
      if (result.invalidToken) await prisma.deviceToken.deleteMany({ where: { token } });
    }

    res.json({
      success: true,
      // أرقامٌ لا كلمة «تم»: صفرٌ في الاثنين يقول للتاجر أن شيئاً لم يصل
      data: { telegramSent, pushSent, devices: tokens.length }
    });
  } catch (error) {
    console.error('test alert failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر إرسال التجربة' });
  }
});

export default router;
