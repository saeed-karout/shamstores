// backend/src/services/merchantAlerts.service.ts

import prisma from './prisma';
import firebaseService from './firebaseService';
import telegram from './telegram.service';
import env from '../config/env';

/**
 * تنبيه التاجر بطلبٍ جديد وهو خارج اللوحة.
 *
 * **المشكلة:** الطلب يصل، والسوكِت يبثّه، ولا أحد ينظر. التاجر أغلق التبويب
 * أو ترك الحاسوب أو كان في صفحةٍ أخرى — والطلب يبرد وحده حتى يلغيه الزبون.
 * ولا سبيل عندنا لبلوغه: كل ما نملكه قناةٌ تعمل فقط حين تكون اللوحة مفتوحة.
 *
 * **قناتان لأنهما تفشلان لأسبابٍ مختلفة:**
 * - إشعار المتصفّح يحتاج إذناً يُرفض بالعادة، ولا يعمل على iOS إلا بتثبيت
 *   الموقع على الشاشة الرئيسية، ورمزه يموت مع التدوير.
 * - تيليجرام يحتاج ربطاً يدوياً مرّةً واحدة، لكنه بعدها لا يفشل: لا إذن،
 *   ولا قيد منصّة، ولا رمز ينتهي.
 *
 * فمن ربط تيليجرام يصله ولو رفض إذن المتصفّح، ومن رفض الربط يصله عبر
 * المتصفّح. والاثنان معاً يغطّيان ما لا يغطّيه أحدهما.
 */

/** ما يحتاجه التنبيه من الطلب — أي مصدرٍ يوفّره يكفي */
export interface AlertOrder {
  id: string;
  orderNumber: string;
  total: unknown;
  orderType: string;
  restaurantId: string | null;
  storeId: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  itemCount?: number;
}

/** يُرسل مرّةً لكل مستخدم — لا لكل جهاز ولا لكل قناة على حدة */
interface Recipient {
  id: string;
  name: string;
  telegramChatId: string | null;
  tokens: string[];
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  delivery: 'توصيل',
  dine_in: 'داخل المحلّ',
  takeaway: 'استلام'
};

/**
 * أصحاب النشاط وموظّفوه.
 *
 * الموظّفون معهم عمداً: في محلٍّ فيه كاشير، هو من يرى الطلب أولاً — وقصر
 * التنبيه على المالك يعني طلباً ينتظر عودته من البيت.
 */
const findRecipients = async (order: AlertOrder): Promise<Recipient[]> => {
  const scope = order.restaurantId
    ? { restaurantId: order.restaurantId }
    : order.storeId
    ? { storeId: order.storeId }
    : null;
  if (!scope) return [];

  const users = await prisma.user.findMany({
    where: { ...scope, role: { in: ['owner', 'staff'] }, isActive: true },
    select: {
      id: true,
      name: true,
      telegramChatId: true,
      fcmToken: true,
      deviceTokens: { select: { token: true } }
    }
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    telegramChatId: user.telegramChatId,
    // `fcmToken` المفرد يبقى مقبولاً: حسابات لم تُسجَّل أجهزتها بعد
    tokens: Array.from(new Set([
      ...user.deviceTokens.map((d) => d.token),
      ...(user.fcmToken ? [user.fcmToken] : [])
    ]))
  }));
};

/** رابط الطلب في اللوحة — الزرّ يفتحه مباشرةً بدل البحث عنه */
const orderLink = (order: AlertOrder): string => {
  const base = env.CLIENT_URL || `https://${env.APP_DOMAIN}`;
  const path = order.restaurantId ? '/restaurant/orders' : '/store/orders';
  return `${base}${path}?order=${encodeURIComponent(order.id)}`;
};

const formatAmount = (value: unknown): string => {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toLocaleString('en-US')} ل.س` : '—';
};

const buildTelegramText = (order: AlertOrder, businessName: string): string => {
  const esc = telegram.escapeHtml;
  const lines = [
    '🔔 <b>طلب جديد</b>',
    '',
    `🏬 ${esc(businessName)}`,
    `🧾 رقم الطلب: <b>${esc(order.orderNumber)}</b>`,
    `💰 المبلغ: <b>${formatAmount(order.total)}</b>`,
    `🚚 النوع: ${ORDER_TYPE_LABEL[order.orderType] || order.orderType}`
  ];

  if (order.customerName) lines.push(`👤 الزبون: ${esc(order.customerName)}`);
  if (order.customerPhone) lines.push(`📞 ${esc(order.customerPhone)}`);
  if (order.orderType === 'delivery' && order.deliveryAddress) {
    lines.push(`📍 ${esc(order.deliveryAddress)}`);
  }
  if (order.itemCount) lines.push(`📦 ${order.itemCount} صنفاً`);

  return lines.join('\n');
};

/** يمسح رمزاً ميّتاً — تركُه يعني محاولةً فاشلة في كل تنبيهٍ لاحق */
const purgeToken = async (token: string): Promise<void> => {
  try {
    await prisma.deviceToken.deleteMany({ where: { token } });
    await prisma.user.updateMany({ where: { fcmToken: token }, data: { fcmToken: null } });
  } catch {
    // التنظيف لا يؤثّر في نتيجة التنبيه
  }
};

export interface AlertResult {
  recipients: number;
  telegramSent: number;
  pushSent: number;
}

/**
 * ينبّه أصحاب النشاط بطلبٍ جديد على كل قناة مربوطة.
 *
 * **لا يرمي أبداً.** التنبيه أثرٌ جانبي لإنشاء الطلب، وفشلُه لا يجوز أن
 * يُفشل الطلب نفسه — زبونٌ يرى «تعذّر إنشاء الطلب» لأن تيليجرام تأخّر
 * خسارةٌ أكبر من تنبيهٍ ضاع.
 */
export const alertMerchantOfNewOrder = async (order: AlertOrder): Promise<AlertResult> => {
  const result: AlertResult = { recipients: 0, telegramSent: 0, pushSent: 0 };

  try {
    const recipients = await findRecipients(order);
    result.recipients = recipients.length;
    if (recipients.length === 0) return result;

    const business = order.restaurantId
      ? await prisma.restaurant.findUnique({ where: { id: order.restaurantId }, select: { name: true } })
      : order.storeId
      ? await prisma.store.findUnique({ where: { id: order.storeId }, select: { name: true } })
      : null;

    const businessName = business?.name || 'متجرك';
    const link = orderLink(order);
    const text = buildTelegramText(order, businessName);
    const pushBody =
      `${formatAmount(order.total)} · ${ORDER_TYPE_LABEL[order.orderType] || order.orderType}` +
      (order.customerName ? ` · ${order.customerName}` : '');

    await Promise.all(
      recipients.map(async (recipient) => {
        // ---- سجلّ داخل اللوحة: يبقى ولو فشلت القناتان
        await prisma.notification
          .create({
            data: {
              userId: recipient.id,
              type: 'order',
              event: 'order.created',
              title: `طلب جديد #${order.orderNumber}`,
              message: pushBody,
              link,
              entityId: order.id
            }
          })
          .catch(() => undefined);

        if (recipient.telegramChatId) {
          const sent = await telegram.sendMessage(recipient.telegramChatId, {
            text,
            buttonText: 'فتح الطلب في اللوحة',
            buttonUrl: link
          });
          if (sent) result.telegramSent += 1;
        }

        await Promise.all(
          recipient.tokens.map(async (token) => {
            const sendResult = await firebaseService.sendToDevice(
              token,
              {
                title: `🔔 طلب جديد #${order.orderNumber}`,
                body: pushBody,
                type: 'new_order',
                orderId: order.id
              },
              { link, orderNumber: order.orderNumber }
            );
            if (sendResult.ok) result.pushSent += 1;
            if (sendResult.invalidToken) await purgeToken(token);
          })
        );
      })
    );

    console.log(
      `🔔 تنبيه طلب ${order.orderNumber}: ${result.telegramSent} تيليجرام، ` +
      `${result.pushSent} متصفّح، إلى ${result.recipients} مستخدماً`
    );
  } catch (error) {
    console.error('alertMerchantOfNewOrder failed:', error);
  }

  return result;
};

export default { alertMerchantOfNewOrder };
