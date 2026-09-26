// backend/src/services/cod.service.ts
//
// تسوية مبالغ الدفع عند الاستلام: ما حصّله كلّ مندوب، وما سلّمه للتاجر،
// وما بقي في ذمّته.
//
// **لماذا هذا مهمّ في سوريا تحديداً:** أغلب الطلبات نقدٌ عند الباب، والمال
// يبيت ليلةً أو أسبوعاً في جيب المندوب قبل أن يصل المحلّ. التاجر كان يحسبها
// على ورقة، والخلاف مع المندوب يُحلّ بالذاكرة. هنا كلّ تحصيلٍ سطرٌ مربوطٌ
// بطلب، وكلّ تسليمٍ سطرٌ بتاريخ — والباقي طرحٌ لا تقدير.
//
// **المتبقّي = مجموع التحصيل − مجموع التسليم غير الملغى.** لا رصيد مخزَّن:
// رصيدٌ يُعدَّل يفترق عن سطوره عند أوّل خطأ ولا يُعرف أين.

import prisma from './prisma';
import { businessHasEntitlement, BusinessType } from './entitlement.service';

export type CourierType = 'driver' | 'courier';

export interface CourierRef {
  key: string;
  name: string;
  type: CourierType;
  driverUserId: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const cleanName = (value: unknown): string =>
  String(value ?? '')
    .replace(/[\u0000-\u001f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

/**
 * مفتاح المندوب الحرّ من اسمه.
 *
 * التطبيع يوحّد «أبو محمد» و«ابو محمد » — وإلا انقسم مندوبٌ واحد صفّين
 * ولا يطابق تسليمُه تحصيلَه.
 */
export const courierKeyFromName = (name: string): string =>
  'courier:' +
  cleanName(name)
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .slice(0, 100);

export const driverCourier = (userId: string, name?: string | null): CourierRef => ({
  key: `driver:${userId}`,
  name: cleanName(name) || 'سائق',
  type: 'driver',
  driverUserId: userId
});

/**
 * الميزة لـ«النموّ» فما فوق.
 *
 * `analytics` هي البوابة التي تفتحها «النموّ» و«الأعمال» و«المؤسسات» في
 * config/plans.ts — ولا بوابة منطقية للخطة باسم التسوية، وإضافةُ رمزٍ جديد
 * لحقل `features` لا تصل خطط الإنتاج المحفوظة. و`cod_settlement` يُقبل
 * أيضاً ليمنحه الأدمن نشاطاً بعينه أو يُباع إضافةً لاحقاً.
 */
export const hasSettlementAccess = async (businessId: string, businessType: BusinessType) =>
  (await businessHasEntitlement(businessId, businessType, 'cod_settlement')) ||
  (await businessHasEntitlement(businessId, businessType, 'analytics'));

// ==================== التحصيل ====================

interface RecordInput {
  order: {
    id: string;
    total: number;
    storeId: string | null;
    restaurantId: string | null;
  };
  courier: CourierRef;
  amount?: unknown;
  note?: unknown;
  source: 'driver_app' | 'merchant';
  recordedBy?: string | null;
}

/**
 * يسجّل تحصيل طلبٍ واحد — أو يصحّحه.
 *
 * **سطرٌ واحد لكل طلب (`orderId` فريد):** السائق يعيد الإرسال على شبكةٍ
 * ضعيفة، والتاجر يصحّح مبلغاً أخطأ فيه. في الحالتين يُحدَّث السطر ولا يُضاف
 * ثانٍ — وإلا تضاعف ما «في ذمّة» المندوب بلا أن يقبض قرشاً.
 */
export const recordCollection = async (input: RecordInput) => {
  const { order, courier } = input;
  const businessId = order.storeId || order.restaurantId;
  if (!businessId) throw new Error('NO_BUSINESS');
  const businessType: BusinessType = order.storeId ? 'store' : 'restaurant';

  const raw = input.amount;
  const parsed = raw === undefined || raw === null || raw === '' ? Number(order.total) : Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100_000_000) throw new Error('INVALID_AMOUNT');
  const amount = round2(parsed);
  const note = cleanName(input.note).slice(0, 300) || null;

  const data = {
    businessId,
    businessType,
    courierKey: courier.key,
    courierName: courier.name,
    courierType: courier.type,
    driverUserId: courier.driverUserId,
    amount,
    expectedAmount: round2(Number(order.total) || 0),
    note,
    source: input.source,
    recordedBy: input.recordedBy || null
  };

  return prisma.codCollection.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, ...data, collectedAt: new Date() },
    // إعادة الإرسال بلا ملاحظة لا تمحو ملاحظةً كُتبت في المحاولة الأولى
    update: input.note === undefined ? { ...data, note: undefined } : data
  });
};

/**
 * تحصيلٌ أبلغ عنه تطبيق السائق — من `confirm-payment` أو المسار المخصّص.
 *
 * النقد وحده: شام كاش يحوّله الزبون إلى محفظة التاجر مباشرةً، فلا يمرّ
 * بيد السائق ولا يُطالَب به.
 */
export const recordFromDriver = async (
  orderId: string,
  driverUserId: string,
  amount?: unknown,
  note?: unknown
) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, assignedDriverId: driverUserId },
    select: { id: true, total: true, storeId: true, restaurantId: true, paymentMethod: true }
  });
  if (!order || order.paymentMethod !== 'cash') return null;
  const user = await prisma.user.findUnique({ where: { id: driverUserId }, select: { name: true } });
  return recordCollection({
    order: { ...order, total: Number(order.total) },
    courier: driverCourier(driverUserId, user?.name),
    amount,
    note,
    source: 'driver_app',
    recordedBy: driverUserId
  });
};

// ==================== الملخّص ====================

export interface CourierSummary {
  courierKey: string;
  courierName: string;
  courierType: CourierType;
  driverUserId: string | null;
  collected: number;
  handedOver: number;
  outstanding: number;
  ordersCount: number;
  lastCollectedAt: Date | null;
  lastHandoverAt: Date | null;
}

/**
 * ملخّص كلّ مندوب.
 *
 * **بلا نطاقٍ زمنيّ عمداً:** المتبقّي في الذمّة لا يسقط بمرور الشهر — مندوبٌ
 * حصّل في آذار وسلّم في نيسان يظهر رصيده صفراً فقط حين يُجمع الشهران.
 */
export const summary = async (businessId: string, businessType: BusinessType): Promise<CourierSummary[]> => {
  const [collections, handovers] = await Promise.all([
    prisma.codCollection.groupBy({
      by: ['courierKey'],
      where: { businessId, businessType },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { collectedAt: true }
    }),
    prisma.codHandover.groupBy({
      by: ['courierKey'],
      where: { businessId, businessType, voidedAt: null },
      _sum: { amount: true },
      _max: { createdAt: true }
    })
  ]);

  const keys = new Set([...collections.map((c) => c.courierKey), ...handovers.map((h) => h.courierKey)]);
  if (keys.size === 0) return [];

  // الاسم من آخر سطر: سائقٌ غيّر اسمه في حسابه يظهر بالجديد
  const latest = await prisma.codCollection.findMany({
    where: { businessId, businessType, courierKey: { in: [...keys] } },
    orderBy: { collectedAt: 'desc' },
    distinct: ['courierKey'],
    select: { courierKey: true, courierName: true, courierType: true, driverUserId: true }
  });
  const latestHandoverNames = await prisma.codHandover.findMany({
    where: { businessId, businessType, courierKey: { in: [...keys] } },
    orderBy: { createdAt: 'desc' },
    distinct: ['courierKey'],
    select: { courierKey: true, courierName: true }
  });
  const meta = new Map(latest.map((l) => [l.courierKey, l]));
  const handoverName = new Map(latestHandoverNames.map((h) => [h.courierKey, h.courierName]));
  const col = new Map(collections.map((c) => [c.courierKey, c]));
  const hand = new Map(handovers.map((h) => [h.courierKey, h]));

  return [...keys]
    .map((key) => {
      const c = col.get(key);
      const h = hand.get(key);
      const m = meta.get(key);
      const collected = round2(Number(c?._sum.amount) || 0);
      const handedOver = round2(Number(h?._sum.amount) || 0);
      return {
        courierKey: key,
        courierName: m?.courierName || handoverName.get(key) || key,
        courierType: (m?.courierType === 'driver' || key.startsWith('driver:') ? 'driver' : 'courier') as CourierType,
        driverUserId: m?.driverUserId ?? null,
        collected,
        handedOver,
        outstanding: round2(collected - handedOver),
        ordersCount: c?._count._all || 0,
        lastCollectedAt: c?._max.collectedAt ?? null,
        lastHandoverAt: h?._max.createdAt ?? null
      };
    })
    .sort((a, b) => b.outstanding - a.outstanding || a.courierName.localeCompare(b.courierName, 'ar'));
};

export const courierBalance = async (businessId: string, businessType: BusinessType, courierKey: string) => {
  const [c, h] = await Promise.all([
    prisma.codCollection.aggregate({ where: { businessId, businessType, courierKey }, _sum: { amount: true } }),
    prisma.codHandover.aggregate({
      where: { businessId, businessType, courierKey, voidedAt: null },
      _sum: { amount: true }
    })
  ]);
  const collected = round2(Number(c._sum.amount) || 0);
  const handedOver = round2(Number(h._sum.amount) || 0);
  return { collected, handedOver, outstanding: round2(collected - handedOver) };
};

/** سطور مندوبٍ واحد: التحصيلات مع أرقام طلباتها، والتسليمات */
export const ledger = async (businessId: string, businessType: BusinessType, courierKey: string) => {
  const [collections, handovers, balance] = await Promise.all([
    prisma.codCollection.findMany({
      where: { businessId, businessType, courierKey },
      orderBy: { collectedAt: 'desc' },
      take: 500
    }),
    prisma.codHandover.findMany({
      where: { businessId, businessType, courierKey },
      orderBy: { createdAt: 'desc' },
      take: 500
    }),
    courierBalance(businessId, businessType, courierKey)
  ]);

  const orders = await prisma.order.findMany({
    where: { id: { in: collections.map((c) => c.orderId) } },
    select: { id: true, orderNumber: true, customerName: true, status: true }
  });
  const byId = new Map(orders.map((o) => [o.id, o]));

  return {
    ...balance,
    collections: collections.map((c) => ({
      ...c,
      orderNumber: byId.get(c.orderId)?.orderNumber ?? null,
      customerName: byId.get(c.orderId)?.customerName ?? null,
      orderStatus: byId.get(c.orderId)?.status ?? null
    })),
    handovers
  };
};

// ==================== التسليم ====================

/**
 * تسليمُ مبلغٍ للتاجر — جزئيٌّ مسموح.
 *
 * **ولا يتجاوز المتبقّي:** «٥٠٠٠٠» تُكتب «٥٠٠٠٠٠» بضغطة زائدة، فيظهر المندوب
 * دائناً للمحلّ بلا سبب. التسليم المسبق حالةٌ نادرة تُسجَّل بعد التحصيل.
 */
export const addHandover = async (
  businessId: string,
  businessType: BusinessType,
  courierKey: string,
  amount: unknown,
  note: unknown,
  recordedBy: string | null
) => {
  const value = round2(Number(amount));
  if (!Number.isFinite(value) || value <= 0) throw new Error('INVALID_AMOUNT');

  const balance = await courierBalance(businessId, businessType, courierKey);
  if (balance.collected === 0) throw new Error('UNKNOWN_COURIER');
  if (value > balance.outstanding + 0.01) throw new Error('EXCEEDS_OUTSTANDING');

  const last = await prisma.codCollection.findFirst({
    where: { businessId, businessType, courierKey },
    orderBy: { collectedAt: 'desc' },
    select: { courierName: true }
  });

  return prisma.codHandover.create({
    data: {
      businessId,
      businessType,
      courierKey,
      courierName: last?.courierName || courierKey,
      amount: value,
      note: cleanName(note).slice(0, 300) || null,
      recordedBy
    }
  });
};

/** إلغاء تسليمٍ سُجّل خطأً — يبقى في السجلّ مشطوباً لا محذوفاً */
export const voidHandover = async (businessId: string, businessType: BusinessType, id: string) => {
  const row = await prisma.codHandover.findFirst({ where: { id, businessId, businessType } });
  if (!row) return null;
  if (row.voidedAt) return row;
  return prisma.codHandover.update({ where: { id }, data: { voidedAt: new Date() } });
};

// ==================== الطلبات بانتظار التسجيل ====================

/**
 * طلبات نقدٍ سُلّمت ولم يُسجَّل تحصيلها — للتوصيل بمندوب المحلّ الخاص الذي
 * لا تطبيق له. آخر ستين يوماً: ما قبلها سُوّي على الأرجح بطريقةٍ أخرى.
 */
export const pendingOrders = async (businessId: string, businessType: BusinessType) => {
  const since = new Date(Date.now() - 60 * 24 * 3600 * 1000);
  const owner = businessType === 'store' ? { storeId: businessId } : { restaurantId: businessId };
  const orders = await prisma.order.findMany({
    where: {
      ...owner,
      paymentMethod: 'cash',
      orderType: { in: ['delivery', 'shipping'] },
      status: { in: ['delivering', 'delivered'] },
      createdAt: { gte: since }
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      total: true,
      status: true,
      createdAt: true,
      assignedDriverId: true,
      driver: { select: { name: true } }
    }
  });
  if (orders.length === 0) return [];
  const recorded = await prisma.codCollection.findMany({
    where: { orderId: { in: orders.map((o) => o.id) } },
    select: { orderId: true }
  });
  const done = new Set(recorded.map((r) => r.orderId));
  return orders
    .filter((o) => !done.has(o.id))
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt,
      driverUserId: o.assignedDriverId,
      driverName: o.driver?.name ?? null
    }));
};

// ==================== التصدير ====================

const csvCell = (value: unknown): string => {
  let s = value === null || value === undefined ? '' : String(value);
  // خليةٌ تبدأ بـ= أو + تُنفَّذ صيغةً في Excel — تُحيَّد بفاصلة علوية
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** ملفّ CSV: الملخّص أوّلاً ثمّ كلّ السطور — يفتحه المحاسب في Excel مباشرةً */
export const exportCsv = async (businessId: string, businessType: BusinessType): Promise<string> => {
  const rows = await summary(businessId, businessType);
  const [collections, handovers] = await Promise.all([
    prisma.codCollection.findMany({ where: { businessId, businessType }, orderBy: { collectedAt: 'asc' } }),
    prisma.codHandover.findMany({ where: { businessId, businessType }, orderBy: { createdAt: 'asc' } })
  ]);
  const orders = await prisma.order.findMany({
    where: { id: { in: collections.map((c) => c.orderId) } },
    select: { id: true, orderNumber: true }
  });
  const num = new Map(orders.map((o) => [o.id, o.orderNumber]));

  const lines: unknown[][] = [
    ['المندوب', 'النوع', 'عدد الطلبات', 'المحصَّل', 'المسلَّم للمحل', 'المتبقّي'],
    ...rows.map((r) => [
      r.courierName,
      r.courierType === 'driver' ? 'سائق' : 'مندوب خاص',
      r.ordersCount,
      r.collected,
      r.handedOver,
      r.outstanding
    ]),
    [],
    ['التاريخ', 'المندوب', 'الحركة', 'رقم الطلب', 'المبلغ', 'ملاحظة']
  ];

  const events = [
    ...collections.map((c) => ({
      at: c.collectedAt,
      row: [c.collectedAt.toISOString(), c.courierName, 'تحصيل', num.get(c.orderId) || '', c.amount, c.note || '']
    })),
    ...handovers.map((h) => ({
      at: h.createdAt,
      row: [
        h.createdAt.toISOString(),
        h.courierName,
        h.voidedAt ? 'تسليم (ملغى)' : 'تسليم للمحل',
        '',
        h.voidedAt ? 0 : -h.amount,
        h.note || ''
      ]
    }))
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  lines.push(...events.map((e) => e.row));
  // BOM: بلا علامة الترميز يفتح Excel العربية رموزاً مبعثرة
  return '﻿' + lines.map((l) => l.map(csvCell).join(',')).join('\r\n');
};

export default {
  recordCollection,
  recordFromDriver,
  summary,
  ledger,
  addHandover,
  voidHandover,
  pendingOrders,
  exportCsv,
  hasSettlementAccess,
  courierKeyFromName,
  driverCourier,
  courierBalance
};
