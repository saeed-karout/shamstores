// backend/src/services/automation.service.ts
//
// الرسائل التلقائية.
//
// **الفرق عن الحملات:** الحملة يكتبها التاجر ويضغط «إرسال». والقاعدة
// التلقائية تنطلق وحدها حين يتحقّق شرطها — سلّةٌ تُركت، زبونٌ غاب. وهذا
// هو الفرق بين ميزةٍ تُستعمل أوّل أسبوع ثم تُنسى، وميزةٍ تعمل وحدها.
//
// **حدودٌ مفروضة في المحرّك لا في الواجهة:** كل قاعدة تمرّ بأربعة حرّاس —
// إذن تسويقيّ، عدم إلغاء، سقف تكرار لكل زبون، وسقفٌ يوميّ للمتجر. وضعُها
// هنا يعني أن أي مسارٍ جديد يرث الحماية، لا أن يتذكّرها كاتبه.

import prisma from './prisma';
import telegram from './telegram.service';
import firebaseService from './firebaseService';
import emailService from './emailService';
import { buildUnsubscribeToken, Channel } from './customerReach.service';
import { env } from '../config/env';

/// نفس اشتقاق campaignController — مصدرٌ واحد للرابط العام
const appUrl = (): string => env.CLIENT_URL || `https://${env.APP_DOMAIN}`;

export type BusinessType = 'restaurant' | 'store';
export type RuleKey = 'lapsed' | 'abandonedCart';

export interface RuleConfig {
  enabled: boolean;
  /** «بعد كم» — يوماً للغياب، ساعةً للسلّة المتروكة */
  after: number;
  title: string;
  body: string;
}

export type AutomationSettings = Record<RuleKey, RuleConfig>;

/**
 * الافتراضات — **متوقّفة كلّها**.
 *
 * قاعدةٌ تُشحن مفعّلة تعني أن تاجراً حدّث المنصّة فأرسلت باسمه رسائل لم
 * يكتبها إلى زبائن لم يخترهم. الموافقة تُطلب ولا تُفترض.
 */
export const DEFAULTS: AutomationSettings = {
  lapsed: {
    enabled: false,
    after: 30,
    title: 'اشتقنا لك 👋',
    body: 'مضى وقتٌ على آخر طلب لك. عندنا جديدٌ يستحقّ النظر — تفضّل بزيارتنا.'
  },
  abandonedCart: {
    enabled: false,
    after: 2,
    title: 'سلّتك بانتظارك 🛒',
    body: 'تركت أصنافاً في السلّة ولم تُكمل الطلب. أكمِله الآن قبل أن ينفد.'
  }
};

/** حدود صلبة لا يستطيع التاجر تجاوزها من الواجهة */
const LIMITS = {
  /** لا يُذكَّر الزبون نفسه بنفس القاعدة قبل مرور هذه المدّة */
  perSubjectCooldownDays: { lapsed: 30, abandonedCart: 3 },
  /** سقف يوميّ لكل متجر — حارسٌ ضدّ خطأ إعدادٍ يرسل ألف رسالة */
  perBusinessDaily: 200,
  /** أقصى عددٍ يُعالَج في دورةٍ واحدة، فلا تشغل دورةٌ الخادم دقائق */
  batchSize: 100
} as const;

const clampAfter = (rule: RuleKey, value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULTS[rule].after;
  // الحدود تمنع «بعد ٠» التي تعني إرسالاً فورياً لكل زائر
  return rule === 'lapsed'
    ? Math.min(365, Math.max(7, Math.round(n)))
    : Math.min(72, Math.max(1, Math.round(n)));
};

const clampText = (value: unknown, fallback: string, max: number): string => {
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? s.slice(0, max) : fallback;
};

/** يقرأ الإعدادات المخزّنة ويملأ ما نقص — لا يرمي على شكلٍ فاسد */
export const parseSettings = (raw: unknown): AutomationSettings => {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const out = {} as AutomationSettings;

  (Object.keys(DEFAULTS) as RuleKey[]).forEach((key) => {
    const value = (source[key] && typeof source[key] === 'object' ? source[key] : {}) as Record<string, unknown>;
    out[key] = {
      enabled: value.enabled === true,
      after: clampAfter(key, value.after),
      title: clampText(value.title, DEFAULTS[key].title, 80),
      body: clampText(value.body, DEFAULTS[key].body, 400)
    };
  });

  return out;
};

const businessWhere = (businessType: BusinessType) =>
  businessType === 'restaurant' ? prisma.restaurant : prisma.store;

export const getSettings = async (
  businessId: string,
  businessType: BusinessType
): Promise<AutomationSettings> => {
  const row = await (businessWhere(businessType) as any).findUnique({
    where: { id: businessId },
    select: { automations: true }
  });
  return parseSettings(row?.automations);
};

export const saveSettings = async (
  businessId: string,
  businessType: BusinessType,
  incoming: unknown
): Promise<AutomationSettings> => {
  const settings = parseSettings(incoming);
  await (businessWhere(businessType) as any).update({
    where: { id: businessId },
    data: { automations: settings as any }
  });
  return settings;
};

// ==================== الوجهات ====================

interface Target {
  subjectKey: string;
  channels: Channel[];
  telegramChatId: string | null;
  tokens: string[];
  email: string | null;
  userId: string | null;
  name: string;
}

/**
 * يجمع وجهات الإرسال لمشتركٍ واحد.
 *
 * **الزائر بلا حساب مشمول:** أجهزته مرتبطة بـ`visitorId` لا بمستخدم، وكان
 * تجاهله يعني أن الميزة كلّها للزبائن المسجّلين — وهم أقلّية ضئيلة.
 */
const resolveTargets = async (
  businessId: string,
  businessType: BusinessType,
  subjectKeys: string[]
): Promise<Map<string, Target>> => {
  const map = new Map<string, Target>();
  if (subjectKeys.length === 0) return map;

  const subs = await prisma.customerSubscription.findMany({
    where: {
      businessId,
      businessType,
      subjectKey: { in: subjectKeys },
      marketingOptIn: true,
      unsubscribedAt: null
    },
    include: {
      user: { select: { id: true, name: true, email: true, telegramChatId: true } }
    }
  });

  // الأجهزة تُجلب دفعةً واحدة: استعلامٌ لكل مشترك يعني مئة رحلة إلى القاعدة
  const visitorIds = subs.map((s) => s.visitorId).filter((v): v is string => !!v);
  const userIds = subs.map((s) => s.userId).filter((v): v is string => !!v);

  const devices = await prisma.deviceToken.findMany({
    where: {
      OR: [
        ...(userIds.length ? [{ userId: { in: userIds } }] : []),
        ...(visitorIds.length ? [{ visitorId: { in: visitorIds } }] : [])
      ]
    },
    select: { token: true, userId: true, visitorId: true }
  });

  for (const sub of subs) {
    const key = sub.subjectKey;
    const current = map.get(key);
    const channel = sub.channel as Channel;

    if (current) {
      if (!current.channels.includes(channel)) current.channels.push(channel);
      continue;
    }

    const tokens = devices
      .filter((d) => (sub.userId && d.userId === sub.userId) || (sub.visitorId && d.visitorId === sub.visitorId))
      .map((d) => d.token);

    map.set(key, {
      subjectKey: key,
      channels: [channel],
      telegramChatId: sub.user?.telegramChatId ?? null,
      tokens,
      email: sub.user?.email ?? null,
      userId: sub.userId,
      name: sub.user?.name || 'زبوننا'
    });
  }

  return map;
};

// ==================== الحرّاس ====================

const recentlySent = async (
  businessId: string,
  rule: RuleKey,
  subjectKeys: string[],
  days: number
): Promise<Set<string>> => {
  if (subjectKeys.length === 0) return new Set();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.automationSend.findMany({
    where: { businessId, rule, subjectKey: { in: subjectKeys }, ok: true, sentAt: { gte: since } },
    select: { subjectKey: true }
  });
  return new Set(rows.map((r) => r.subjectKey));
};

const sentToday = async (businessId: string): Promise<number> => {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  return prisma.automationSend.count({ where: { businessId, sentAt: { gte: since } } });
};

// ==================== الإرسال ====================

const deliver = async (
  target: Target,
  businessId: string,
  businessType: BusinessType,
  rule: RuleKey,
  shopName: string,
  title: string,
  body: string,
  link: string
): Promise<boolean> => {
  let delivered = false;
  const channelsUsed: string[] = [];

  if (target.channels.includes('telegram') && target.telegramChatId) {
    try {
      const unsubscribe = target.userId
        ? `\n\n<a href="${appUrl()}/api/campaigns/unsubscribe?t=${buildUnsubscribeToken(target.userId, businessId)}">إيقاف الرسائل</a>`
        : '';
      const ok = await telegram.sendMessage(target.telegramChatId, {
        text:
          `<b>${telegram.escapeHtml(title)}</b>\n\n` +
          `${telegram.escapeHtml(body)}\n\n` +
          `— ${telegram.escapeHtml(shopName)}` +
          unsubscribe
      });
      if (ok) { delivered = true; channelsUsed.push('telegram'); }
    } catch (error) {
      console.error('automation telegram failed:', error);
    }
  }

  if (target.channels.includes('push')) {
    for (const token of target.tokens) {
      try {
        const result = await firebaseService.sendToDevice(
          token,
          { title, body, type: 'alert' },
          { link, rule }
        );
        if (result.ok) { delivered = true; channelsUsed.push('push'); }
        // رمزٌ ميّت يُحذف فوراً: تركه يعني محاولةً فاشلة كل ليلة إلى الأبد
        if (result.invalidToken) {
          await prisma.deviceToken.deleteMany({ where: { token } });
        }
      } catch (error) {
        console.error('automation push failed:', error);
      }
    }
  }

  if (target.channels.includes('email') && target.email) {
    try {
      await emailService.sendEmail({
        to: target.email,
        subject: `${title} — ${shopName}`,
        html:
          `<div dir="rtl" style="font-family:system-ui,sans-serif;line-height:1.9">` +
          `<h2 style="margin:0 0 12px">${title}</h2>` +
          `<p style="margin:0 0 16px">${body}</p>` +
          `<p style="margin:0 0 16px"><a href="${link}">زيارة ${shopName}</a></p>` +
          (target.userId
            ? `<p style="font-size:12px;color:#777">لإيقاف هذه الرسائل: ` +
              `<a href="${appUrl()}/api/campaigns/unsubscribe?t=${buildUnsubscribeToken(target.userId, businessId)}">اضغط هنا</a></p>`
            : '') +
          `</div>`
      });
      delivered = true;
      channelsUsed.push('email');
    } catch (error) {
      console.error('automation email failed:', error);
    }
  }

  await prisma.automationSend.create({
    data: {
      businessId,
      businessType,
      rule,
      subjectKey: target.subjectKey,
      channel: channelsUsed.join(',') || 'none',
      ok: delivered
    }
  });

  return delivered;
};

export interface RuleResult {
  rule: RuleKey;
  considered: number;
  sent: number;
  skipped: number;
}

const businessLink = (businessType: BusinessType, slug: string | null): string =>
  `${appUrl()}/${businessType === 'restaurant' ? 'menu' : 'store'}/${slug || ''}`;

// ==================== القاعدة: زبونٌ غاب ====================

export const runLapsedRule = async (
  businessId: string,
  businessType: BusinessType,
  config: RuleConfig,
  shopName: string,
  slug: string | null
): Promise<RuleResult> => {
  const result: RuleResult = { rule: 'lapsed', considered: 0, sent: 0, skipped: 0 };
  if (!config.enabled) return result;

  const cutoff = new Date(Date.now() - config.after * 24 * 60 * 60 * 1000);

  // المشتركون أوّلاً ثمّ طلباتهم: البدء من الطلبات يعني مسح جدولٍ ضخم
  // لاستبعاد معظمه بعد ذلك لأن أصحابه لم يأذنوا أصلاً
  const subs = await prisma.customerSubscription.findMany({
    where: { businessId, businessType, marketingOptIn: true, unsubscribedAt: null },
    select: { subjectKey: true, userId: true, phone: true },
    take: LIMITS.batchSize * 3
  });
  if (subs.length === 0) return result;

  const phones = subs.map((s) => s.phone).filter((p): p is string => !!p);
  const recentOrders = phones.length
    ? await prisma.order.findMany({
        where: {
          ...(businessType === 'restaurant' ? { restaurantId: businessId } : { storeId: businessId }),
          customerPhone: { in: phones },
          createdAt: { gte: cutoff }
        },
        select: { customerPhone: true }
      })
    : [];
  const activePhones = new Set(recentOrders.map((o) => o.customerPhone).filter(Boolean) as string[]);

  // من طلب حديثاً ليس غائباً — ورسالة «اشتقنا لك» إليه تُقرأ سخريةً
  const candidates = subs.filter((s) => !s.phone || !activePhones.has(s.phone));
  result.considered = candidates.length;

  const keys = candidates.map((c) => c.subjectKey);
  const alreadySent = await recentlySent(businessId, 'lapsed', keys, LIMITS.perSubjectCooldownDays.lapsed);
  const fresh = candidates.filter((c) => !alreadySent.has(c.subjectKey)).slice(0, LIMITS.batchSize);
  result.skipped = result.considered - fresh.length;

  if (fresh.length === 0) return result;

  const targets = await resolveTargets(businessId, businessType, fresh.map((f) => f.subjectKey));
  const link = businessLink(businessType, slug);
  let budget = LIMITS.perBusinessDaily - (await sentToday(businessId));

  for (const target of targets.values()) {
    if (budget <= 0) break;
    const ok = await deliver(target, businessId, businessType, 'lapsed', shopName, config.title, config.body, link);
    if (ok) { result.sent += 1; budget -= 1; }
  }

  return result;
};

// ==================== القاعدة: سلّة متروكة ====================

export const runAbandonedCartRule = async (
  businessId: string,
  businessType: BusinessType,
  config: RuleConfig,
  shopName: string,
  slug: string | null
): Promise<RuleResult> => {
  const result: RuleResult = { rule: 'abandonedCart', considered: 0, sent: 0, skipped: 0 };
  if (!config.enabled) return result;

  const cutoff = new Date(Date.now() - config.after * 60 * 60 * 1000);

  const carts = await prisma.abandonedCart.findMany({
    where: {
      businessId,
      businessType,
      recoveredAt: null,
      notifiedAt: null,
      lastActiveAt: { lte: cutoff },
      // سلّةٌ مضى عليها أسبوع ليست «متروكة» بل منسيّة — وتذكيرٌ بها مزعج
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    take: LIMITS.batchSize
  });
  result.considered = carts.length;
  if (carts.length === 0) return result;

  const keys = carts.map((c) => c.subjectKey);
  const alreadySent = await recentlySent(businessId, 'abandonedCart', keys, LIMITS.perSubjectCooldownDays.abandonedCart);
  const fresh = carts.filter((c) => !alreadySent.has(c.subjectKey));
  result.skipped = result.considered - fresh.length;

  const targets = await resolveTargets(businessId, businessType, fresh.map((f) => f.subjectKey));
  const link = businessLink(businessType, slug);
  let budget = LIMITS.perBusinessDaily - (await sentToday(businessId));

  for (const cart of fresh) {
    const target = targets.get(cart.subjectKey);
    // بلا قناةٍ لا محاولة — لكن السلّة تُعلَّم مُنبَّهاً عليها كي لا
    // تُفحص كل ليلة إلى الأبد
    if (!target || budget <= 0) {
      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data: { notifiedAt: new Date() }
      }).catch(() => undefined);
      continue;
    }

    const body = `${config.body}\n\n(${cart.itemCount} صنف بقيمة ${Math.round(cart.total).toLocaleString('en')} ل.س)`;
    const ok = await deliver(target, businessId, businessType, 'abandonedCart', shopName, config.title, body, link);

    await prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { notifiedAt: new Date() }
    }).catch(() => undefined);

    if (ok) { result.sent += 1; budget -= 1; }
  }

  return result;
};

// ==================== الدورة الكاملة ====================

export interface RunSummary {
  businesses: number;
  sent: number;
  results: Array<{ businessId: string; name: string } & Record<string, unknown>>;
}

/**
 * يمرّ على كل نشاطٍ فعّل قاعدةً واحدة على الأقلّ.
 *
 * **الترشيح في القاعدة لا في الشيفرة:** `automations` عمود JSON، ولا سبيل
 * لفهرسته. لكن عدد الأنشطة بالمئات لا بالملايين، وقراءتها كلّها مرّةً
 * كل ساعة أرخص بكثير من جدولٍ إضافيّ يُصان.
 */
export const runAllAutomations = async (): Promise<RunSummary> => {
  const summary: RunSummary = { businesses: 0, sent: 0, results: [] };

  const [restaurants, stores] = await Promise.all([
    prisma.restaurant.findMany({ select: { id: true, name: true, slug: true, automations: true } }),
    prisma.store.findMany({ select: { id: true, name: true, slug: true, automations: true } })
  ]);

  const all: Array<{ id: string; name: string; slug: string | null; automations: unknown; type: BusinessType }> = [
    ...restaurants.map((r) => ({ ...r, type: 'restaurant' as BusinessType })),
    ...stores.map((s) => ({ ...s, type: 'store' as BusinessType }))
  ];

  for (const business of all) {
    const settings = parseSettings(business.automations);
    if (!settings.lapsed.enabled && !settings.abandonedCart.enabled) continue;

    summary.businesses += 1;
    try {
      const [lapsed, cart] = [
        await runLapsedRule(business.id, business.type, settings.lapsed, business.name, business.slug),
        await runAbandonedCartRule(business.id, business.type, settings.abandonedCart, business.name, business.slug)
      ];
      summary.sent += lapsed.sent + cart.sent;
      summary.results.push({ businessId: business.id, name: business.name, lapsed, cart });
    } catch (error) {
      // نشاطٌ يفشل لا يوقف البقيّة: خطأ في متجرٍ واحد كان سيحرم كل
      // المتاجر التالية من دورتها
      console.error(`automations failed for ${business.id}:`, error);
    }
  }

  return summary;
};

export default {
  DEFAULTS,
  parseSettings,
  getSettings,
  saveSettings,
  runLapsedRule,
  runAbandonedCartRule,
  runAllAutomations
};
