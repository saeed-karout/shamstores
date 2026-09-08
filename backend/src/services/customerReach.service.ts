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
  /** صاحب حساب — أو `null` لضيفٍ يُعرَّف بـ`visitorId` */
  userId: string | null;
  /** معرّف زائرٍ يولّده المتصفّح ويحفظه */
  visitorId?: string | null;
  /** هاتفه كما أدخله عند الطلب — يربط اشتراكه بطلباته لاحقاً */
  phone?: string | null;
  businessId: string;
  businessType: BusinessType;
  channel: Channel;
  marketingOptIn: boolean;
}

/**
 * المفتاح الثابت للمشترك.
 *
 * **لماذا عمودٌ مستقلّ لا `userId` يقبل الفراغ:** مايسكيوإل يسمح بتكرار
 * القيم الفارغة في الفهرس الفريد، فكان ضيفٌ واحد يستطيع إنشاء اشتراكاتٍ
 * لا نهائية لنفس المتجر — ويتلقّى الرسالة نفسها عشر مرّات.
 */
export const subjectKeyOf = (input: { userId?: string | null; visitorId?: string | null }): string | null => {
  if (input.userId) return `u:${input.userId}`;
  if (input.visitorId) return `v:${input.visitorId}`;
  return null;
};

/**
 * يسجّل إذناً.
 *
 * **لا يعيد تفعيل من ألغى.** `unsubscribedAt` يبقى محفوظاً، ومن ضغط
 * «إلغاء الاشتراك» لا يُعاد بطلب اشتراكٍ لاحق من الواجهة — يحتاج إلغاءً
 * صريحاً منه. بدون هذا القيد يكفي أن يفتح الزبون صفحة تتبّعٍ ليعود إلى
 * قائمةٍ خرج منها عمداً.
 */
export const subscribe = async (input: SubscribeInput): Promise<{ ok: boolean; reason?: string }> => {
  const subjectKey = subjectKeyOf(input);
  if (!subjectKey) return { ok: false, reason: 'لا يمكن تحديد هوية المشترك' };

  const identity = {
    subjectKey,
    businessId: input.businessId,
    channel: input.channel
  };

  const existing = await prisma.customerSubscription.findUnique({
    where: { subjectKey_businessId_channel: identity }
  });

  if (existing?.unsubscribedAt) {
    return { ok: false, reason: 'سبق أن ألغيت الاشتراك من هذا المتجر' };
  }

  await prisma.customerSubscription.upsert({
    where: { subjectKey_businessId_channel: identity },
    // الترقية إلى تسويق ممكنة، والتراجع عنه كذلك — لكن الإلغاء الكامل
    // يمرّ بـ`unsubscribe` وحدها.
    //
    // والهاتف يُحدَّث دائماً: الضيف يشترك أوّلاً ثمّ يطلب، فرقمه لا يُعرف
    // إلا في الطلب — وبلا تحديثٍ تبقى قاعدة «زبونٌ غاب» عمياء عنه.
    update: {
      marketingOptIn: input.marketingOptIn,
      ...(input.phone ? { phone: input.phone } : {})
    },
    create: {
      subjectKey,
      userId: input.userId,
      visitorId: input.visitorId || null,
      phone: input.phone || null,
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
  /** المفتاح الثابت — موجودٌ دائماً، لحسابٍ كان أو لضيف */
  subjectKey: string;
  /** `null` للضيف: لا حساب له، فلا رابط إلغاءٍ موقَّعاً باسمه */
  userId: string | null;
  phone: string | null;
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
      subjectKey: true,
      userId: true,
      visitorId: true,
      phone: true,
      channel: true,
      user: { select: { id: true, name: true, email: true, telegramChatId: true } }
    }
  });

  // الأجهزة دفعةً واحدة: الضيف لا يملك علاقة `user`، فأجهزته لا تصل عبرها
  const userIds = subs.map((s) => s.userId).filter((v): v is string => !!v);
  const visitorIds = subs.map((s) => s.visitorId).filter((v): v is string => !!v);
  const devices = (userIds.length || visitorIds.length)
    ? await prisma.deviceToken.findMany({
        where: {
          OR: [
            ...(userIds.length ? [{ userId: { in: userIds } }] : []),
            ...(visitorIds.length ? [{ visitorId: { in: visitorIds } }] : [])
          ]
        },
        select: { token: true, userId: true, visitorId: true }
      })
    : [];

  const bySubject = new Map<string, Recipient>();
  for (const sub of subs) {
    const key = sub.subjectKey;
    const current = bySubject.get(key);
    if (current) {
      if (!current.channels.includes(sub.channel as Channel)) {
        current.channels.push(sub.channel as Channel);
      }
      continue;
    }

    bySubject.set(key, {
      subjectKey: key,
      userId: sub.userId,
      phone: sub.phone,
      name: sub.user?.name || 'زبوننا',
      channels: [sub.channel as Channel],
      telegramChatId: sub.user?.telegramChatId ?? null,
      tokens: devices
        .filter((d) => (sub.userId && d.userId === sub.userId) || (sub.visitorId && d.visitorId === sub.visitorId))
        .map((d) => d.token),
      email: sub.user?.email ?? null
    });
  }

  const scope = businessType === 'restaurant' ? { restaurantId: businessId } : { storeId: businessId };
  const ids = Array.from(bySubject.values()).map((r) => r.userId).filter((v): v is string => !!v);
  const phones = Array.from(bySubject.values()).map((r) => r.phone).filter((v): v is string => !!v);

  // سلوك الشريحة يُقاس من الطلبات لا من الاشتراك: من اشترك ولم يشترِ ليس
  // «عائداً» ولا «منقطعاً».
  //
  // والضيف يُقاس **بهاتفه** لا بحسابه: `createdBy` فارغٌ في طلبات الضيوف،
  // وقياسهم به وحده كان يضعهم كلّهم خارج كل شريحة سلوكية.
  const orders = (ids.length || phones.length)
    ? await prisma.order.findMany({
        where: {
          ...scope,
          status: { in: [...COUNTED] },
          OR: [
            ...(ids.length ? [{ createdBy: { in: ids } }] : []),
            ...(phones.length ? [{ customerPhone: { in: phones } }] : [])
          ]
        },
        select: { createdBy: true, customerPhone: true, createdAt: true }
      })
    : [];

  const stats = new Map<string, { count: number; last: Date }>();
  const bump = (key: string | null, at: Date) => {
    if (!key) return;
    const current = stats.get(key);
    if (current) {
      current.count += 1;
      if (at > current.last) current.last = at;
    } else {
      stats.set(key, { count: 1, last: at });
    }
  };
  for (const order of orders) {
    bump(order.createdBy ? `u:${order.createdBy}` : null, order.createdAt);
    bump(order.customerPhone ? `p:${order.customerPhone}` : null, order.createdAt);
  }

  const lapsedBefore = new Date(Date.now() - LAPSED_DAYS * 24 * 60 * 60 * 1000);

  const inSegment = (r: Recipient): boolean => {
    if (segment === 'all') return true;
    // الحساب أوّلاً ثمّ الهاتف: من له الاثنان تُحتسب طلباته من أيّهما وُجد
    const stat =
      (r.userId ? stats.get(`u:${r.userId}`) : undefined) ||
      (r.phone ? stats.get(`p:${r.phone}`) : undefined);
    if (!stat) return false;
    if (segment === 'returning') return stat.count > 1;
    return stat.last < lapsedBefore;
  };

  const recipients = Array.from(bySubject.values()).filter(inSegment);

  // القناة تُحتسب فقط إن كان لها عنوان فعلاً: إذنٌ بلا عنوان لا يوصل شيئاً،
  // وعدّه في المعاينة يَعِد بما لا يحدث
  const byChannel: Record<Channel, number> = { telegram: 0, push: 0, email: 0 };
  for (const r of recipients) {
    if (r.channels.includes('telegram') && r.telegramChatId) byChannel.telegram += 1;
    if (r.channels.includes('push') && r.tokens.length > 0) byChannel.push += 1;
    if (r.channels.includes('email') && r.email) byChannel.email += 1;
  }

  return { recipients, segmentSize: bySubject.size, byChannel };
};

export default {
  CHANNELS,
  isChannel,
  subscribe,
  buildUnsubscribeToken,
  unsubscribeByToken,
  resolveAudience
};
