// backend/src/controllers/pushBroadcastController.ts

import { Response } from 'express';
import { randomUUID } from 'crypto';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import firebaseService from '../services/firebaseService';
import { emitPlatformNotification, getUserRoom } from '../realtime/socket';

/**
 * بثّ إشعارات من السوبر أدمن إلى تطبيق التوصيل.
 *
 * **لماذا لا يكفي إشعار الطلبات:** إشعارات النظام مربوطة بأحداث — طلبٌ
 * أُنشئ، حالةٌ تغيّرت. ولا سبيل لإبلاغ السائقين بما ليس طلباً: توقّفٌ
 * للصيانة، تعليماتُ نوبةٍ، تحذيرُ طقس، إعلانُ حافز. فكان الوحيد المتاح
 * مسارَ اختبارٍ يرسل لسائق واحد بالمعرّف.
 *
 * **ولماذا معاينة قبل الإرسال:** البثّ لا يُسترجع. إشعارٌ خرج إلى مئتي
 * هاتفٍ لا يُلغى، ورسالةٌ خاطئة تُقرأ مئتي مرّة. لذلك `audience` تُحسب
 * أولاً وتُعرض، ثم يُرسل.
 */

/** من يُرسَل إليه */
type Audience = 'drivers_all' | 'drivers_online' | 'drivers_business' | 'users_selected';

const AUDIENCES: Audience[] = ['drivers_all', 'drivers_online', 'drivers_business', 'users_selected'];

const isAudience = (v: unknown): v is Audience =>
  typeof v === 'string' && AUDIENCES.includes(v as Audience);

/** حدٌّ للنصّ: الإشعار يُقتطع على الشاشة، وما زاد لا يقرؤه أحد */
const MAX_TITLE = 65;
const MAX_BODY = 240;

/**
 * يبني شرط البحث عن الجمهور.
 *
 * `fcmToken: { not: null }` **ليس** في الشرط عمداً: نريد أن نعرف كم مستخدماً
 * في الجمهور بلا رمز — وهو رقمٌ يقول للمشرف إن نصف سائقيه لن يصلهم شيء،
 * بدل أن يظنّ البثّ نجح لأنه لم يخطئ.
 */
const buildAudienceWhere = (audience: Audience, params: {
  businessType?: string;
  businessId?: string;
  userIds?: string[];
}): any | null => {
  if (audience === 'users_selected') {
    const ids = (params.userIds || []).filter((id) => typeof id === 'string' && id.length > 0);
    return ids.length > 0 ? { id: { in: ids } } : null;
  }

  const base: any = { role: 'delivery_driver', isActive: true };

  if (audience === 'drivers_online') base.isOnline = true;

  if (audience === 'drivers_business') {
    if (!params.businessId) return null;
    if (params.businessType === 'restaurant') base.restaurantId = params.businessId;
    else base.storeId = params.businessId;
  }

  return base;
};

/** معاينة الجمهور قبل الإرسال */
export const previewAudience = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const audience = req.query.audience;
    if (!isAudience(audience)) {
      res.status(400).json({ success: false, error: 'الجمهور غير معروف' });
      return;
    }

    const userIds = typeof req.query.userIds === 'string'
      ? (req.query.userIds as string).split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const where = buildAudienceWhere(audience, {
      businessType: req.query.businessType as string,
      businessId: req.query.businessId as string,
      userIds
    });

    if (!where) {
      res.json({
        success: true,
        data: { total: 0, reachable: 0, withoutToken: 0, firebaseConfigured: firebaseService.isConfigured }
      });
      return;
    }

    const [total, reachable] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...where, fcmToken: { not: null } } })
    ]);

    res.json({
      success: true,
      data: {
        total,
        reachable,
        withoutToken: total - reachable,
        firebaseConfigured: firebaseService.isConfigured
      }
    });
  } catch (error) {
    console.error('previewAudience failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر حساب الجمهور' });
  }
};

/** إرسال البثّ */
export const sendBroadcast = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { audience, businessType, businessId, userIds, link } = req.body || {};
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

    if (!isAudience(audience)) {
      res.status(400).json({ success: false, error: 'الجمهور غير معروف' });
      return;
    }
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

    const where = buildAudienceWhere(audience, { businessType, businessId, userIds });
    if (!where) {
      res.status(400).json({ success: false, error: 'حدّد النشاط أو المستخدمين المقصودين' });
      return;
    }

    const recipients = await prisma.user.findMany({
      where,
      select: { id: true, fcmToken: true }
    });

    if (recipients.length === 0) {
      res.status(400).json({ success: false, error: 'لا يوجد أحد في هذا الجمهور' });
      return;
    }

    // معرّف واحد يجمع صفوف البثّ الواحد — به يُقرأ السجلّ لاحقاً بلا جدول جديد
    const broadcastId = randomUUID();

    // السجلّ أولاً: الإشعار داخل التطبيق يصل ولو تعذّر FCM. وهو الفرق بين
    // رسالةٍ ضاعت وأخرى تنتظر السائق حين يفتح التطبيق.
    await prisma.notification.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        type: 'admin_broadcast',
        event: 'admin.push.sent',
        title,
        message: body,
        link: typeof link === 'string' && link ? link : null,
        entityId: broadcastId
      }))
    });

    const withToken = recipients.filter((u): u is { id: string; fcmToken: string } => Boolean(u.fcmToken));

    const results = await Promise.all(
      withToken.map(async (user) => {
        const result = await firebaseService.sendToDevice(
          user.fcmToken,
          { title, body, type: 'alert', click_action: 'FLUTTER_NOTIFICATION_CLICK' },
          { broadcastId }
        );
        // رمزٌ ميّت يُمسح فوراً: تركُه يعني محاولةً فاشلة في كل بثّ لاحق
        if (result.invalidToken) {
          await prisma.user.update({ where: { id: user.id }, data: { fcmToken: null } }).catch(() => {});
        }
        return result.ok;
      })
    );

    const delivered = results.filter(Boolean).length;

    // البثّ اللحظي لمن كان التطبيق مفتوحاً عنده
    try {
      emitPlatformNotification({
        rooms: recipients.map((u) => getUserRoom(u.id)),
        type: 'admin_broadcast',
        event: 'admin.push.sent',
        title,
        message: body,
        link: typeof link === 'string' && link ? link : undefined,
        entityId: broadcastId
      });
    } catch (err) {
      console.error('تعذّر البثّ اللحظي للإشعار الإداري:', err);
    }

    res.json({
      success: true,
      message: `أُرسل إلى ${delivered} من ${recipients.length}`,
      data: {
        broadcastId,
        targeted: recipients.length,
        delivered,
        withoutToken: recipients.length - withToken.length,
        failed: withToken.length - delivered,
        firebaseConfigured: firebaseService.isConfigured
      }
    });
  } catch (error) {
    console.error('sendBroadcast failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر إرسال الإشعار' });
  }
};

/**
 * سجلّ ما أُرسل.
 *
 * يُقرأ من `Notification` مجمَّعاً بـ`entityId` — بلا جدول جديد. البثّ الذي
 * لا يُرى بعد إرساله يُعاد إرساله بالخطأ.
 */
export const getBroadcastHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const groups = await prisma.notification.groupBy({
      by: ['entityId'],
      where: { type: 'admin_broadcast', entityId: { not: null } },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      take: limit
    });

    const ids = groups.map((g) => g.entityId).filter((id): id is string => Boolean(id));

    // صفٌّ واحد لكل بثّ يكفي لقراءة العنوان والنصّ — البقية نسخٌ منه
    const samples = ids.length
      ? await prisma.notification.findMany({
          where: { entityId: { in: ids }, type: 'admin_broadcast' },
          distinct: ['entityId'],
          select: { entityId: true, title: true, message: true, link: true, createdAt: true }
        })
      : [];

    const byId = new Map(samples.map((s) => [s.entityId, s]));

    // المقروء يُحسب فعلاً لا يُفترض صفراً: هو الفرق بين «أُرسلت» و«وصلت
    // وقُرئت»، وهو ما يريد المشرف معرفته بعد بثّ تعليماتٍ للنوبة
    const readGroups = ids.length
      ? await prisma.notification.groupBy({
          by: ['entityId'],
          where: { type: 'admin_broadcast', entityId: { in: ids }, isRead: true },
          _count: { _all: true }
        })
      : [];

    const readById = new Map(readGroups.map((g) => [g.entityId, g._count._all]));

    res.json({
      success: true,
      data: groups.map((g) => {
        const sample = byId.get(g.entityId);
        return {
          broadcastId: g.entityId,
          title: sample?.title || '',
          message: sample?.message || '',
          link: sample?.link || null,
          recipients: g._count._all,
          readCount: readById.get(g.entityId) || 0,
          sentAt: g._max.createdAt
        };
      })
    });
  } catch (error) {
    console.error('getBroadcastHistory failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر قراءة السجلّ' });
  }
};
