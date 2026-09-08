// backend/src/services/customerReach.service.ts
//
// من يستطيع التاجر الوصول إليه، وكيف.
//
// **المشكلة التي تسبق الحملات:** بناء محرّك إرسال قبل وجود قائمة يعطي زرّ
// «إرسال» يرسل إلى صفر شخص. فالعمل الحقيقي هنا: جمع الأذونات، وحساب من هو
// قابلٌ للوصول فعلاً، وقطع الطريق على الإرسال لمن لم يأذن.
//
// **ثلاث قنوات لأن SMS ليست خياراً:** أوقف Twilio تسليم الرسائل إلى سوريا
// في ١٥ أيلول ٢٠٢٥، وواتساب الرسمي يحتاج توثيق Meta ورسوماً لكل محادثة.
// وتيليجرام وإشعار المتصفّح والبريد مجّانية وجاهزة في المنصّة.

import jwt from 'jsonwebtoken';
import prisma from './prisma';
import env from '../config/env';

export type Channel = 'telegram' | 'push' | 'email';
export const CHANNELS: Channel[] = ['telegram', 'push', 'email'];

export type BusinessType = 'restaurant' | 'store';

export const isChannel = (value: unknown): value is Channel =>
  typeof value === 'string' && CHANNELS.includes(value as Channel);

/** الطلبات التي تُثبت أن هذا زبونٌ لهذا النشاط */
const COUNTED = ['pending', 'preparing', 'ready', 'delivering', 'delivered', 'served'] as const;

const LAPSED_DAYS = 60;

// ==================== الاشتراك ====================

export interface SubscribeInput {
  userId: string;
  businessId: string;
  businessType: BusinessType;
  channel: Channel;
  marketingOptIn: boolean;
}

/**
 * يسجّل إذناً.
 *
 * **لا يعيد تفعيل من ألغى.** `unsubscribedAt` يبقى محفوظاً، ومن ضغط
 * «إلغاء الاشتراك» لا يُعاد بطلب اشتراكٍ لاحق من الواجهة — يحتاج إلغاءً
 * صريحاً منه. بدون هذا القيد يكفي أن يفتح الزبون صفحة تتبّعٍ ليعود إلى
 * قائمةٍ خرج منها عمداً.
 */
export const subscribe = async (input: SubscribeInput): Promise<{ ok: boolean; reason?: string }> => {
  const existing = await prisma.customerSubscription.findUnique({
    where: {
      userId_businessId_channel: {
        userId: input.userId,
        businessId: input.businessId,
        channel: input.channel
      }
    }
  });

  if (existing?.unsubscribedAt) {
    return { ok: false, reason: 'سبق أن ألغيت الاشتراك من هذا المتجر' };
  }

  await prisma.customerSubscription.upsert({
    where: {
      userId_businessId_channel: {
        userId: input.userId,
        businessId: input.businessId,
        channel: input.channel
      }
    },
    // الترقية إلى تسويق ممكنة، والتراجع عنه كذلك — لكن الإلغاء الكامل
    // يمرّ بـ`unsubscribe` وحدها
    update: { marketingOptIn: input.marketingOptIn },
    create: {
      userId: input.userId,
      businessId: input.businessId,
      businessType: input.businessType,
      channel: input.channel,
      marketingOptIn: input.marketingOptIn
    }
  });

  return { ok: true };
};

// ==================== إلغاء الاشتراك ====================

/**
 * رمز إلغاء موقَّع.
 *
 * **بلا جدول ولا تسجيل دخول:** الزبون يضغط الرابط من تيليجرام أو بريده،
 * وقد لا يكون مسجّلاً في المتصفّح الذي يفتحه. والتوقيع يمنع إلغاء اشتراك
 * غيرك بتخمين معرّف.
 *
 * بلا انتهاء عمداً: رابطٌ ينتهي يعني زبوناً يضغط «إلغاء» فلا يحدث شيء —
 * وهو أسرع طريق إلى بلاغٍ يحظر البوت.
 */
export const buildUnsubscribeToken = (userId: string, businessId: string): string =>
  jwt.sign({ u: userId, b: businessId, k: 'unsub' }, env.JWT_SECRET);

export const unsubscribeByToken = async (
  token: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { u?: string; b?: string; k?: string };
    if (payload.k !== 'unsub' || !payload.u || !payload.b) {
      return { ok: false, error: 'رابط غير صالح' };
    }

    // كل القنوات دفعةً واحدة: من ألغى لا يريد أن يُلاحَق على قناةٍ أخرى
    await prisma.customerSubscription.updateMany({
      where: { userId: payload.u, businessId: payload.b, unsubscribedAt: null },
      data: { unsubscribedAt: new Date(), marketingOptIn: false }
    });

    return { ok: true };
  } catch {
    return { ok: false, error: 'رابط غير صالح أو منتهٍ' };
  }
};

// ==================== الجمهور ====================

export type Segment = 'all' | 'returning' | 'lapsed';

export interface Recipient {
  userId: string;
  name: string;
  channels: Channel[];
  telegramChatId: string | null;
  tokens: string[];
  email: string | null;
}

export interface AudienceResult {
  recipients: Recipient[];
  /** كم زبوناً في الشريحة أصلاً — يُقارَن بالقابلين للوصول */
  segmentSize: number;
  byChannel: Record<Channel, number>;
}

/**
 * من نستطيع مراسلته في هذه الشريحة.
 *
 * يبدأ من الأذونات لا من الزبائن: قائمة الزبائن كبيرة والقابلون للوصول
 * قليلون، والبدء من الطرف الخطأ يُوهم بجمهورٍ لا وجود له.
 */
export const resolveAudience = async (
  businessId: string,
  businessType: BusinessType,
  segment: Segment
): Promise<AudienceResult> => {
  const subs = await prisma.customerSubscription.findMany({
    where: { businessId, businessType, marketingOptIn: true, unsubscribedAt: null },
    select: {
      userId: true,
      channel: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          telegramChatId: true,
          deviceTokens: { select: { token: true } }
        }
      }
    }
  });

  const byUser = new Map<string, Recipient>();
  for (const sub of subs) {
    if (!sub.user) continue;
    const current = byUser.get(sub.userId);
    if (current) {
      if (!current.channels.includes(sub.channel as Channel)) {
        current.channels.push(sub.channel as Channel);
      }
      continue;
    }
    byUser.set(sub.userId, {
      userId: sub.userId,
      name: sub.user.name,
      channels: [sub.channel as Channel],
      telegramChatId: sub.user.telegramChatId,
      tokens: sub.user.deviceTokens.map((d) => d.token),
      email: sub.user.email
    });
  }

  const scope = businessType === 'restaurant' ? { restaurantId: businessId } : { storeId: businessId };
  const ids = Array.from(byUser.keys());

  // سلوك الشريحة يُقاس من الطلبات لا من الاشتراك: من اشترك ولم يشترِ ليس
  // «عائداً» ولا «منقطعاً»
  const orders = ids.length
    ? await prisma.order.findMany({
        where: { ...scope, createdBy: { in: ids }, status: { in: [...COUNTED] } },
        select: { createdBy: true, createdAt: true }
      })
    : [];

  const stats = new Map<string, { count: number; last: Date }>();
  for (const order of orders) {
    if (!order.createdBy) continue;
    const current = stats.get(order.createdBy);
    if (current) {
      current.count += 1;
      if (order.createdAt > current.last) current.last = order.createdAt;
    } else {
      stats.set(order.createdBy, { count: 1, last: order.createdAt });
    }
  }

  const lapsedBefore = new Date(Date.now() - LAPSED_DAYS * 24 * 60 * 60 * 1000);

  const inSegment = (userId: string): boolean => {
    const stat = stats.get(userId);
    if (segment === 'all') return true;
    if (!stat) return false;
    if (segment === 'returning') return stat.count > 1;
    return stat.last < lapsedBefore;
  };

  const recipients = Array.from(byUser.values()).filter((r) => inSegment(r.userId));

  // القناة تُحتسب فقط إن كان لها عنوان فعلاً: إذنٌ بلا عنوان لا يوصل شيئاً،
  // وعدّه في المعاينة يَعِد بما لا يحدث
  const byChannel: Record<Channel, number> = { telegram: 0, push: 0, email: 0 };
  for (const r of recipients) {
    if (r.channels.includes('telegram') && r.telegramChatId) byChannel.telegram += 1;
    if (r.channels.includes('push') && r.tokens.length > 0) byChannel.push += 1;
    if (r.channels.includes('email') && r.email) byChannel.email += 1;
  }

  return { recipients, segmentSize: byUser.size, byChannel };
};

export default {
  CHANNELS,
  isChannel,
  subscribe,
  buildUnsubscribeToken,
  unsubscribeByToken,
  resolveAudience
};
