// backend/src/routes/telegramRoutes.ts
//
// نقطة استقبال تحديثات تيليجرام.
//
// **بلا مصادقة عمداً** — تيليجرام ليس مستخدماً ولا يحمل رمزنا. الحماية
// بالسرّ الذي نضبطه في `setWebhook` ويعيده تيليجرام في ترويسة كل نداء:
// بدونه يستطيع أي أحد يعرف المسار أن يزعم أنه تيليجرام ويربط محادثته بحساب
// تاجر.

import { Router, Request, Response } from 'express';
import env from '../config/env';
import telegram from '../services/telegram.service';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  // الردّ 200 دائماً وفوراً: تيليجرام يعيد إرسال ما لم يُستلم بنجاح، فخطأٌ
  // في المعالجة يتحوّل إلى إعادة إرسالٍ متكرّرة لنفس الرسالة.
  res.status(200).json({ ok: true });

  try {
    if (env.TELEGRAM_WEBHOOK_SECRET) {
      const provided = req.headers['x-telegram-bot-api-secret-token'];
      if (provided !== env.TELEGRAM_WEBHOOK_SECRET) {
        console.warn('تحديث تيليجرام برأسٍ سرّي خاطئ — أُهمل');
        return;
      }
    }

    await telegram.handleUpdate(req.body);
  } catch (error) {
    console.error('Telegram webhook failed:', error);
  }
});

export default router;
