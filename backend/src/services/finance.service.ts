// backend/src/services/finance.service.ts
//
// الحساب المالي للطلبات — تعريف واحد للربح لا تعريف لكل شاشة.
//
// **لماذا خدمة لا استعلام في المتحكّم:** «الربح» كلمة تحتمل خمسة معانٍ.
// أهي الفرق بين البيع والشراء؟ أيُخصم منها التوصيل؟ الخصم؟ المرتجع؟ لو
// حسبتها كل شاشة على هواها لاختلفت أرقام صفحة الطلبات عن صفحة التقارير،
// ولن يعرف التاجر أيّهما يصدّق. فالتعريف هنا، مكتوباً:
//
//   مبيعات الأصناف = Σ (سعر البيع × الكمية)
//   التكلفة        = Σ (تكلفة الوحدة × الكمية)
//   الخصم          = discountAmount على الطلب
//   الربح          = مبيعات الأصناف − الخصم − التكلفة
//   الصافي         = إجمالي الطلب − المرتجع
//
// **التوصيل خارج الربح عمداً**: أجرةٌ تُقبض وتُدفع للسائق، فإدخالها يضخّم
// الربح بمال ليس ربحاً. تُعرض في عمود مستقلّ.
//
// **الطلب الملغى لا يُحسب**: لم يُبَع شيء. والمرتجع يُحسب ثم يُطرح، لأن
// البيع حدث فعلاً ثم عاد — وطمسُه يخفي عن التاجر أن بضاعته ترتدّ.

import prisma from './prisma';

export type BusinessType = 'restaurant' | 'store';

/** حالات لم يحدث فيها بيع، فلا تدخل الحساب */
const NON_SALE_STATUSES = ['cancelled'];

export interface OrderFinanceRow {
  id: string;
  orderNumber: string;
  createdAt: Date;
  status: string;
  isPaid: boolean;
  customerName: string | null;
  itemsCount: number;
  /** مجموع (سعر × كمية) للأصناف */
  itemsTotal: number;
  /** ما يدفعه الزبون فعلاً */
  total: number;
  cost: number;
  discount: number;
  deliveryFee: number;
  profit: number;
  returnAmount: number;
  returnedAt: Date | null;
  net: number;
  /** التكلفة مقدَّرة من سعر المنتج الحالي لا من لحظة البيع */
  costEstimated: boolean;
}

export interface FinanceSummary {
  ordersCount: number;
  itemsTotal: number;
  revenue: number;
  cost: number;
  discount: number;
  deliveryFees: number;
  profit: number;
  returns: number;
  returnsCount: number;
  net: number;
  /** كم طلباً حُسبت تكلفته بالتقدير — رقمٌ يقول للتاجر كم يثق بالربح */
  estimatedCostOrders: number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * يحوّل طلباً بأصنافه إلى سطر مالي.
 *
 * `item.cost` هو تكلفة لحظة البيع. غيابه في الطلبات القديمة يُعوَّض بتكلفة
 * المنتج الحالية — تقديرٌ يُعلَّم كذلك بدل أن يُقدَّم كرقم مؤكّد.
 */
export const toFinanceRow = (order: any): OrderFinanceRow => {
  const items = order.items || order.orderItems || [];

  let itemsTotal = 0;
  let cost = 0;
  let costEstimated = false;

  for (const item of items) {
    const quantity = toNumber(item.quantity) || 1;
    itemsTotal += toNumber(item.price) * quantity;

    if (item.cost !== null && item.cost !== undefined) {
      cost += toNumber(item.cost) * quantity;
    } else {
      const fallback = item.product?.cost;
      if (fallback !== null && fallback !== undefined) {
        cost += toNumber(fallback) * quantity;
      }
      // بلا تكلفة أصلاً: يبقى صفراً، والعلَم يقول إن الربح غير مؤكّد
      costEstimated = true;
    }
  }

  const total = toNumber(order.total);
  const discount = toNumber(order.discountAmount);
  const deliveryFee = toNumber(order.deliveryFee);
  const returnAmount = order.returnedAt ? toNumber(order.returnAmount) || total : 0;

  const grossProfit = itemsTotal - discount - cost;
  // المرتجع يأكل من الربح بنسبة ما عاد من الطلب
  const returnedShare = total > 0 ? Math.min(returnAmount / total, 1) : 0;
  const profit = round(grossProfit * (1 - returnedShare));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    isPaid: Boolean(order.isPaid),
    customerName: order.customerName ?? null,
    itemsCount: items.length,
    itemsTotal: round(itemsTotal),
    total: round(total),
    cost: round(cost),
    discount: round(discount),
    deliveryFee: round(deliveryFee),
    profit,
    returnAmount: round(returnAmount),
    returnedAt: order.returnedAt ?? null,
    net: round(total - returnAmount),
    costEstimated
  };
};

export const summarize = (rows: OrderFinanceRow[]): FinanceSummary => {
  const summary: FinanceSummary = {
    ordersCount: rows.length,
    itemsTotal: 0,
    revenue: 0,
    cost: 0,
    discount: 0,
    deliveryFees: 0,
    profit: 0,
    returns: 0,
    returnsCount: 0,
    net: 0,
    estimatedCostOrders: 0
  };

  for (const row of rows) {
    summary.itemsTotal += row.itemsTotal;
    summary.revenue += row.total;
    summary.cost += row.cost;
    summary.discount += row.discount;
    summary.deliveryFees += row.deliveryFee;
    summary.profit += row.profit;
    summary.returns += row.returnAmount;
    summary.net += row.net;
    if (row.returnAmount > 0) summary.returnsCount += 1;
    if (row.costEstimated) summary.estimatedCostOrders += 1;
  }

  for (const key of Object.keys(summary) as Array<keyof FinanceSummary>) {
    summary[key] = round(summary[key]);
  }

  return summary;
};

export interface FinanceQuery {
  from?: Date;
  to?: Date;
  /** 'all' يشمل الملغاة — لقراءة ما ضاع، لا لحساب الربح */
  includeCancelled?: boolean;
  onlyReturned?: boolean;
  skip?: number;
  take?: number;
}

const buildWhere = (businessId: string, type: BusinessType, query: FinanceQuery) => {
  const where: any =
    type === 'restaurant' ? { restaurantId: businessId } : { storeId: businessId };

  if (!query.includeCancelled) where.status = { notIn: NON_SALE_STATUSES };
  if (query.onlyReturned) where.returnedAt = { not: null };

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = query.from;
    if (query.to) where.createdAt.lte = query.to;
  }

  return where;
};

const ITEM_INCLUDE = {
  items: {
    include: {
      product: { select: { name: true, cost: true, imageUrl: true } },
      menuItem: { select: { name: true, image: true } }
    }
  }
} as const;

/**
 * سقف الطلبات التي يُحسب عليها الملخّص.
 *
 * الربح يحتاج حساباً على مستوى الصنف، فلا تكفيه `aggregate`. وتحميل عشرين
 * ألف طلب بأصنافها ليُجمَع رقمان يخنق الدينو. المدى الافتراضي شهر، والسقف
 * يحمي من مدى مفتوح — والواجهة تُعلم التاجر حين يُبلَغ.
 */
const SUMMARY_CAP = 5000;

/**
 * الصفحة المعروضة والملخّص.
 *
 * **الملخّص يُحسب على المدى كلّه لا على الصفحة**: تاجرٌ يقرأ «ربح الشهر»
 * فيجده ربح عشرين طلباً من مئتين رقمٌ كاذب، وهو أسوأ من غياب الرقم.
 */
export const getOrdersFinance = async (
  businessId: string,
  type: BusinessType,
  query: FinanceQuery = {}
): Promise<{
  rows: OrderFinanceRow[];
  summary: FinanceSummary;
  total: number;
  summaryTruncated: boolean;
}> => {
  const where = buildWhere(businessId, type, query);

  const [pageOrders, summaryOrders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: query.skip ?? 0,
      take: query.take ?? 50,
      include: ITEM_INCLUDE
    }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: SUMMARY_CAP,
      include: ITEM_INCLUDE
    }),
    prisma.order.count({ where })
  ]);

  return {
    rows: pageOrders.map(toFinanceRow),
    summary: summarize(summaryOrders.map(toFinanceRow)),
    total,
    summaryTruncated: total > SUMMARY_CAP
  };
};

export default { getOrdersFinance, toFinanceRow, summarize };
