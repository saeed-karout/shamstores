// backend/src/controllers/campaignController.ts
//
// حملات التاجر إلى زبائنه.
//
// **ما يحمي القناة أهمّ ممّا يرسل عليها.** تيليجرام يحظر البوتات المُبلَّغ
// عنها، والمتصفّح يحجب الموقع نهائياً بعد تجاهلٍ متكرّر — وكلاهما لا
// يُسترجع، ويسقط معه كل تجّار المنصّة لا التاجر المسيء وحده. لذلك السقف
// والإلغاء والإذن المنفصل قيودٌ في الشيفرة لا نصائح في الوثائق.

import { Response } from 'express';
import { randomUUID } from 'crypto';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import telegram from '../services/telegram.service';
import firebaseService from '../services/firebaseService';
import emailService from '../services/emailService';
import env from '../config/env';
import {
  resolveAudience,
  buildUnsubscribeToken,
  unsubscribeByToken,
  Segment
} from '../services/customerReach.service';

const SEGMENTS: Segment[] = ['all', 'returning', 'lapsed'];
const isSegment = (v: unknown): v is Segment => typeof v === 'string' && SEGMENTS.includes(v as Segment);

const MAX_TITLE = 70;
const MAX_BODY = 320;

/**
 * سقف الإرسال: حملتان في الأسبوع.
 *
 * ليس تقنياً بل حمايةٌ للقناة. تاجرٌ يرسل يومياً يُفقد المنصّة قناتها كلها
 * — والحدّ يُفرض هنا لأن نيّة التاجر ليست ضماناً.
 */
const WINDOW_DAYS = 7;
const MAX_PER_WINDOW = 2;

const getBusiness = (req: AuthRequest): { id: string; type: 'restaurant' | 'store' } | null => {
  if (req.user?.restaurantId) return { id: req.user.restaurantId, type: 'restaurant' };
  if (req.user?.storeId) return { id: req.user.storeId, type: 'store' };
  return null;
};

/**
 * رابط إلغاء الاشتراك — أو `null` للضيف.
 *
 * الرمز موقَّعٌ بمعرّف المستخدم، والضيف لا معرّف له. وإخراج رابطٍ بمعرّفٍ
 * فارغ كان سيعطي زبوناً رابطاً لا يُلغي شيئاً — وهو أسرع طريق إلى بلاغٍ
 * يحظر البوت. الضيف يُلغي من الشاشة التي اشترك منها.
 */
const unsubscribeUrl = (userId: string | null, businessId: string): string | null => {
  if (!userId) return null;
  const base = env.CLIENT_URL || `https://${env.APP_DOMAIN}`;
  return `${base}/api/campaigns/u/${buildUnsubscribeToken(userId, businessId)}`;
};

/** كم حملة أُرسلت في النافذة الجارية */
const sentInWindow = async (businessId: string): Promise<number> => {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.notification.findMany({
    where: { type: 'merchant_campaign', link: { contains: businessId }, createdAt: { gte: since } },
    distinct: ['entityId'],
    select: { entityId: true }
  });
  return rows.length;
};

// ==================== المعاينة ====================

export const previewAudience = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const segment = isSegment(req.query.segment) ? req.query.segment : 'all';
    const audience = await resolveAudience(business.id, business.type, segment);
    const used = await sentInWindow(business.id);

    res.json({
      success: true,
      data: {
        segment,
        // القابلون للوصول لا المشتركون: من أذن بلا عنوان لا يصله شيء
        reachable: audience.recipients.filter(
          (r) =>
            (r.telegramChatId && r.channels.includes('telegram')) ||
            (r.tokens.length > 0 && r.channels.includes('push')) ||
            (r.email && r.channels.includes('email'))
        ).length,
        subscribers: audience.segmentSize,
        byChannel: audience.byChannel,
        quota: { used, max: MAX_PER_WINDOW, windowDays: WINDOW_DAYS },
        telegramReady: telegram.isConfigured(),
        pushReady: firebaseService.isConfigured
      }
    });
  } catch (error) {
    console.error('previewAudience failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر حساب الجمهور' });
  }
};

// ==================== الإرسال ====================

export const sendCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const segment = isSegment(req.body?.segment) ? req.body.segment : 'all';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

    if (!title || !body) {
      res.status(400).json({ success: false, error: 'العنوان والنصّ مطلوبان' });
      return;
    }
    if (title.length > MAX_TITLE || body.length > MAX_BODY) {
      res.status(400).json({
        success: false,
        error: `العنوان حتى ${MAX_TITLE} حرفاً والنصّ حتى ${MAX_BODY}`
      });
      return;
    }

    const used = await sentInWindow(business.id);
    if (used >= MAX_PER_WINDOW) {
      res.status(429).json({
        success: false,
        error: `بلغت الحدّ: ${MAX_PER_WINDOW} حملتين كل ${WINDOW_DAYS} أيام. ` +
          'الحدّ يحمي قناتك — زبونٌ يُزعَج يحظر ولا يعود.'
      });
      return;
    }

    const audience = await resolveAudience(business.id, business.type, segment);
    if (audience.recipients.length === 0) {
      res.status(400).json({ success: false, error: 'لا مشترك في هذه الشريحة بعد' });
      return;
    }

    const businessRow =
      business.type === 'restaurant'
        ? await prisma.restaurant.findUnique({ where: { id: business.id }, select: { name: true, slug: true } })
        : await prisma.store.findUnique({ where: { id: business.id }, select: { name: true, slug: true } });

    const shopName = businessRow?.name || 'متجرنا';
    const shopUrl = `${env.CLIENT_URL || `https://${env.APP_DOMAIN}`}/${businessRow?.slug || ''}`;
    const campaignId = randomUUID();

    let telegramSent = 0;
    let pushSent = 0;
    let emailSent = 0;

    await Promise.all(
      audience.recipients.map(async (recipient) => {
        const unsub = unsubscribeUrl(recipient.userId, business.id);

        // السجلّ أولاً: به تُحسب الحصّة ويُقرأ التاريخ، ولو فشلت كل قناة.
        //
        // وللضيوف لا سجلّ: `Notification.userId` إلزاميّ، وإنشاء صفٍّ
        // بمعرّفٍ فارغ يرمي فيُسقط إرسال ذلك الزبون كلّه. عدد المستقبلين
        // يُحسب من `audience.recipients` لا من هذا الجدول.
        if (recipient.userId) {
          await prisma.notification
          .create({
            data: {
              userId: recipient.userId,
              type: 'merchant_campaign',
              event: 'campaign.sent',
              title,
              message: body,
              // معرّف النشاط داخل الرابط — به تُحسب حصّته دون جدول إضافي
              link: `${shopUrl}?from=campaign&biz=${business.id}`,
              entityId: campaignId
            }
          })
          .catch(() => undefined);
        }

        if (recipient.channels.includes('telegram') && recipient.telegramChatId) {
          const ok = await telegram.sendMessage(recipient.telegramChatId, {
            text:
              `<b>${telegram.escapeHtml(title)}</b>\n\n` +
              `${telegram.escapeHtml(body)}\n\n` +
              `— ${telegram.escapeHtml(shopName)}\n` +
              `<a href="${unsub}">إلغاء الاشتراك</a>`,
            buttonText: 'زيارة المتجر',
            buttonUrl: shopUrl
          });
          if (ok) telegramSent += 1;
        }

        if (recipient.channels.includes('push')) {
          for (const token of recipient.tokens) {
            const result = await firebaseService.sendToDevice(
              token,
              { title: `${shopName}: ${title}`, body, type: 'alert' },
              { link: shopUrl, campaignId }
            );
            if (result.ok) pushSent += 1;
            if (result.invalidToken) {
              await prisma.deviceToken.deleteMany({ where: { token } }).catch(() => undefined);
            }
          }
        }

        if (recipient.channels.includes('email') && recipient.email) {
          try {
            await emailService.sendEmail({
              to: recipient.email,
              subject: `${shopName} — ${title}`,
              html:
                `<div dir="rtl" style="font-family:system-ui,sans-serif;line-height:1.8">` +
                `<h2 style="margin:0 0 12px">${title}</h2>` +
                `<p style="margin:0 0 16px;white-space:pre-line">${body}</p>` +
                `<p><a href="${shopUrl}">زيارة ${shopName}</a></p>` +
                `<hr style="border:none;border-top:1px solid #ddd;margin:20px 0">` +
                `<p style="font-size:12px;color:#777">` +
                `وصلتك هذه الرسالة لأنك اشتركت في تنبيهات ${shopName}.` +
                (unsub ? ` <a href="${unsub}">إلغاء الاشتراك</a>` : '') +
                `</p></div>`
            });
            emailSent += 1;
          } catch {
            // البريد قناة احتياطية — فشلها لا يُفشل الحملة
          }
        }
      })
    );

    res.json({
      success: true,
      message: `أُرسلت إلى ${telegramSent + pushSent + emailSent} وجهة`,
      data: {
        campaignId,
        recipients: audience.recipients.length,
        telegramSent,
        pushSent,
        emailSent,
        quotaLeft: MAX_PER_WINDOW - used - 1
      }
    });
  } catch (error) {
    console.error('sendCampaign failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر إرسال الحملة' });
  }
};

// ==================== السجلّ ====================

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = getBusiness(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط غير موجود' });
      return;
    }

    const groups = await prisma.notification.groupBy({
      by: ['entityId'],
      where: { type: 'merchant_campaign', link: { contains: business.id } },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      take: 20
    });

    const ids = groups.map((g) => g.entityId).filter((id): id is string => Boolean(id));
    const samples = ids.length
      ? await prisma.notification.findMany({
          where: { entityId: { in: ids }, type: 'merchant_campaign' },
          distinct: ['entityId'],
          select: { entityId: true, title: true, message: true }
        })
      : [];
    const byId = new Map(samples.map((s) => [s.entityId, s]));

    res.json({
      success: true,
      data: groups.map((g) => ({
        campaignId: g.entityId,
        title: byId.get(g.entityId)?.title || '',
        message: byId.get(g.entityId)?.message || '',
        recipients: g._count._all,
        sentAt: g._max.createdAt
      }))
    });
  } catch (error) {
    console.error('campaign history failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر قراءة السجلّ' });
  }
};

// ==================== إلغاء الاشتراك ====================

/**
 * يُفتح من تيليجرام أو البريد — بلا تسجيل دخول.
 *
 * يردّ صفحةً لا JSON: الزبون يفتحه في متصفّح، و`{"success":true}` عارياً
 * يُقرأ عطلاً لا تأكيداً.
 */
export const unsubscribe = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await unsubscribeByToken(String(req.params.token || ''));

  const message = result.ok
    ? 'أُلغي اشتراكك. لن تصلك رسائل تسويقية من هذا المتجر بعد الآن.'
    : result.error || 'رابط غير صالح';

  res
    .status(result.ok ? 200 : 400)
    .type('html')
    .send(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>إلغاء الاشتراك</title></head>` +
      `<body style="margin:0;display:grid;place-items:center;min-height:100vh;` +
      `background:#082E24;color:#E8F5E9;font-family:system-ui,sans-serif;text-align:center;padding:24px">` +
      `<div style="max-width:26rem"><div style="font-size:44px;margin-bottom:12px">` +
      `${result.ok ? '✅' : '⚠️'}</div>` +
      `<p style="font-size:16px;line-height:1.9;margin:0">${message}</p>` +
      `${result.ok ? '<p style="font-size:13px;color:#9DC4AC;margin-top:14px">تنبيهات طلباتك تبقى كما هي.</p>' : ''}` +
      `</div></body></html>`
    );
};

export default { previewAudience, sendCampaign, getHistory, unsubscribe };
