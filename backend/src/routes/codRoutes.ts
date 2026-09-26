// backend/src/routes/codRoutes.ts
//
// تسوية التحصيل عند الاستلام — للتاجر، ولتطبيق السائق.
//
// الملخّص والتسليمات مالٌ في ذمّة أشخاص، فهي للمالك وحده كالقسم المالي
// (financeRoutes). أمّا تسجيل تحصيل طلبٍ واحد فيقع عند تسليم الطلب، فيملكه
// أيضاً الموظّف الذي يملك تحديث حالة الطلبات.
//
// ==================== لتطبيق السائق ====================
//   POST /api/cod/driver/orders/:orderId/collected   { amount?, note? }
//        يسجّل ما قبضه السائق نقداً للطلب المُسنَد إليه. بلا `amount` يُعتبر
//        إجمالي الطلب. يضع الطلب «مدفوعاً» أيضاً (كـ confirm-payment)، ويُعاد
//        إرساله بأمان: السطر يُحدَّث لا يُكرَّر.
//   GET  /api/cod/driver/summary
//        ما في ذمّة السائق لكل نشاط: المحصَّل والمسلَّم والمتبقّي.
//   (و POST /api/delivery/orders/:orderId/confirm-payment القائم يقبل الآن
//    `amountCollected` اختيارياً ويسجّل التحصيل تلقائياً.)

import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize, requireStaffPermission } from '../middleware/auth';
import prisma from '../services/prisma';
import cod, { courierKeyFromName, driverCourier } from '../services/cod.service';
import { BusinessType } from '../services/entitlement.service';

const router = Router();

const businessOf = (req: AuthRequest): { id: string; type: BusinessType } | null => {
  if (req.user?.storeId) return { id: req.user.storeId, type: 'store' };
  if (req.user?.restaurantId) return { id: req.user.restaurantId, type: 'restaurant' };
  return null;
};

const ERRORS: Record<string, [number, string]> = {
  INVALID_AMOUNT: [400, 'المبلغ غير صالح'],
  EXCEEDS_OUTSTANDING: [400, 'المبلغ أكبر من المتبقّي في ذمّة المندوب'],
  UNKNOWN_COURIER: [404, 'لا تحصيل مسجَّل لهذا المندوب'],
  NO_BUSINESS: [400, 'الطلب غير مرتبط بنشاط']
};

const fail = (res: Response, error: unknown, fallback: string) => {
  const known = error instanceof Error ? ERRORS[error.message] : undefined;
  if (known) {
    res.status(known[0]).json({ success: false, error: known[1] });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ success: false, error: fallback });
};

// ==================== السائق ====================

router.post(
  '/driver/orders/:orderId/collected',
  authenticate,
  authorize(['delivery_driver']),
  async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.user!.id;
      const order = await prisma.order.findFirst({
        where: {
          id: req.params.orderId,
          assignedDriverId: driverId,
          status: { in: ['delivering', 'delivered'] }
        },
        select: { id: true, paymentMethod: true, isPaid: true, paymentCollectedAt: true }
      });
      if (!order) {
        res.status(404).json({ success: false, error: 'الطلب غير موجود أو ليس قيد التوصيل' });
        return;
      }
      if (order.paymentMethod !== 'cash') {
        res.status(400).json({ success: false, error: 'الطلب ليس دفعاً نقدياً عند الاستلام' });
        return;
      }

      const row = await cod.recordFromDriver(order.id, driverId, req.body?.amount, req.body?.note);

      // كما يفعل confirm-payment: التحصيل يعني أن الطلب دُفع — وإلا رفض
      // `complete` إكمالَه وطالب بتسجيل الدفع مرّةً ثانية
      if (!order.paymentCollectedAt || !order.isPaid) {
        await prisma.order.update({
          where: { id: order.id },
          data: { isPaid: true, paymentCollectedAt: order.paymentCollectedAt || new Date() }
        });
      }

      res.json({ success: true, message: 'سُجّل المبلغ المحصَّل', data: row });
    } catch (error) {
      fail(res, error, 'تعذّر تسجيل التحصيل');
    }
  }
);

router.get(
  '/driver/summary',
  authenticate,
  authorize(['delivery_driver']),
  async (req: AuthRequest, res: Response) => {
    try {
      const key = `driver:${req.user!.id}`;
      const [collections, handovers] = await Promise.all([
        prisma.codCollection.groupBy({
          by: ['businessId', 'businessType'],
          where: { courierKey: key },
          _sum: { amount: true },
          _count: { _all: true }
        }),
        prisma.codHandover.groupBy({
          by: ['businessId', 'businessType'],
          where: { courierKey: key, voidedAt: null },
          _sum: { amount: true }
        })
      ]);
      const handed = new Map(handovers.map((h) => [`${h.businessType}:${h.businessId}`, Number(h._sum.amount) || 0]));
      const data = collections.map((c) => {
        const collected = Number(c._sum.amount) || 0;
        const handedOver = handed.get(`${c.businessType}:${c.businessId}`) || 0;
        return {
          businessId: c.businessId,
          businessType: c.businessType,
          ordersCount: c._count._all,
          collected,
          handedOver,
          outstanding: Math.round((collected - handedOver) * 100) / 100
        };
      });
      res.json({ success: true, data });
    } catch (error) {
      fail(res, error, 'تعذّر جلب ملخّص التحصيل');
    }
  }
);

// ==================== التاجر ====================

router.use(authenticate);

/** بوابة الخطة — «النموّ» فما فوق، راجع cod.service.hasSettlementAccess */
const requireSettlement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const business = businessOf(req);
  if (!business) {
    res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
    return;
  }
  if (req.user?.role !== 'super_admin' && !(await cod.hasSettlementAccess(business.id, business.type))) {
    res.status(403).json({
      success: false,
      error: 'تسوية التحصيل متاحة في خطة «النموّ» فما فوق',
      requiresUpgrade: true,
      featureCode: 'cod_settlement'
    });
    return;
  }
  next();
};

const ownerOnly = authorize(['owner', 'super_admin']);

router.get('/summary', ownerOnly, requireSettlement, async (req: AuthRequest, res: Response) => {
  try {
    const b = businessOf(req)!;
    const rows = await cod.summary(b.id, b.type);
    const totals = rows.reduce(
      (t, r) => ({
        collected: t.collected + r.collected,
        handedOver: t.handedOver + r.handedOver,
        outstanding: t.outstanding + r.outstanding
      }),
      { collected: 0, handedOver: 0, outstanding: 0 }
    );
    res.json({ success: true, data: { couriers: rows, totals } });
  } catch (error) {
    fail(res, error, 'تعذّر جلب التسوية');
  }
});

router.get('/couriers/:courierKey/ledger', ownerOnly, requireSettlement, async (req: AuthRequest, res: Response) => {
  try {
    const b = businessOf(req)!;
    res.json({ success: true, data: await cod.ledger(b.id, b.type, String(req.params.courierKey)) });
  } catch (error) {
    fail(res, error, 'تعذّر جلب سجلّ المندوب');
  }
});

router.post('/handovers', ownerOnly, requireSettlement, async (req: AuthRequest, res: Response) => {
  try {
    const b = businessOf(req)!;
    const row = await cod.addHandover(
      b.id,
      b.type,
      String(req.body?.courierKey || ''),
      req.body?.amount,
      req.body?.note,
      req.user?.id || null
    );
    res.status(201).json({ success: true, message: 'سُجّل التسليم', data: row });
  } catch (error) {
    fail(res, error, 'تعذّر تسجيل التسليم');
  }
});

router.post('/handovers/:id/void', ownerOnly, requireSettlement, async (req: AuthRequest, res: Response) => {
  try {
    const b = businessOf(req)!;
    const row = await cod.voidHandover(b.id, b.type, String(req.params.id));
    if (!row) {
      res.status(404).json({ success: false, error: 'التسليم غير موجود' });
      return;
    }
    res.json({ success: true, message: 'أُلغي التسليم', data: row });
  } catch (error) {
    fail(res, error, 'تعذّر إلغاء التسليم');
  }
});

router.get('/pending-orders', ownerOnly, requireSettlement, async (req: AuthRequest, res: Response) => {
  try {
    const b = businessOf(req)!;
    res.json({ success: true, data: await cod.pendingOrders(b.id, b.type) });
  } catch (error) {
    fail(res, error, 'تعذّر جلب الطلبات');
  }
});

router.get('/export.csv', ownerOnly, requireSettlement, async (req: AuthRequest, res: Response) => {
  try {
    const b = businessOf(req)!;
    const csv = await cod.exportCsv(b.id, b.type);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="cod-settlement-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) {
    fail(res, error, 'تعذّر التصدير');
  }
});

/** تحصيل طلبٍ واحد كما سُجّل — لبطاقة تفاصيل الطلب */
router.get(
  '/orders/:orderId/collection',
  requireStaffPermission('viewOrders', 'updateOrderStatus'),
  requireSettlement,
  async (req: AuthRequest, res: Response) => {
    try {
      const b = businessOf(req)!;
      const row = await prisma.codCollection.findFirst({
        where: { orderId: String(req.params.orderId), businessId: b.id, businessType: b.type }
      });
      res.json({ success: true, data: row });
    } catch (error) {
      fail(res, error, 'تعذّر جلب التحصيل');
    }
  }
);

/**
 * التاجر يسجّل تحصيل طلب — مندوبه الخاص (اسمٌ حرّ) أو سائقٌ في النظام.
 *
 * بلا `courierName` يُنسب للسائق المُسنَد إن وُجد؛ وإلا يُرفض: تحصيلٌ بلا
 * مندوب لا يدخل ذمّة أحد ولا يُسوّى.
 */
router.post(
  '/orders/:orderId/collection',
  requireStaffPermission('updateOrderStatus'),
  requireSettlement,
  async (req: AuthRequest, res: Response) => {
    try {
      const b = businessOf(req)!;
      const order = await prisma.order.findFirst({
        where: {
          id: String(req.params.orderId),
          ...(b.type === 'store' ? { storeId: b.id } : { restaurantId: b.id })
        },
        select: {
          id: true,
          total: true,
          storeId: true,
          restaurantId: true,
          paymentMethod: true,
          status: true,
          assignedDriverId: true,
          driver: { select: { name: true } }
        }
      });
      if (!order) {
        res.status(404).json({ success: false, error: 'الطلب غير موجود' });
        return;
      }
      // الملغى لم يُسلَّم فلا مال فيه — تحصيلٌ عليه يُحمّل المندوب ما لم يقبضه
      if (order.status === 'cancelled') {
        res.status(400).json({ success: false, error: 'الطلب ملغى' });
        return;
      }
      if (order.paymentMethod !== 'cash') {
        res.status(400).json({ success: false, error: 'الطلب ليس دفعاً نقدياً عند الاستلام' });
        return;
      }

      const name = String(req.body?.courierName || '').trim();
      const courier = name
        ? { key: courierKeyFromName(name), name: name.slice(0, 100), type: 'courier' as const, driverUserId: null }
        : order.assignedDriverId
          ? driverCourier(order.assignedDriverId, order.driver?.name)
          : null;
      if (!courier) {
        res.status(400).json({ success: false, error: 'اكتب اسم المندوب الذي حصّل المبلغ' });
        return;
      }

      const row = await cod.recordCollection({
        order: { ...order, total: Number(order.total) },
        courier,
        amount: req.body?.amount,
        note: req.body?.note,
        source: 'merchant',
        recordedBy: req.user?.id || null
      });
      // المال قُبض — فالطلب مدفوع، وإلا بقي «غير مدفوع» في الطلبات والقسم المالي
      await prisma.order.updateMany({
        where: { id: order.id, isPaid: false },
        data: { isPaid: true, paymentCollectedAt: new Date() }
      });
      res.json({ success: true, message: 'سُجّل التحصيل', data: row });
    } catch (error) {
      fail(res, error, 'تعذّر تسجيل التحصيل');
    }
  }
);

/** أسماء المندوبين الخاصّين السابقين — للإكمال التلقائي بدل كتابة الاسم كلّ مرّة */
router.get(
  '/couriers',
  requireStaffPermission('viewOrders', 'updateOrderStatus'),
  requireSettlement,
  async (req: AuthRequest, res: Response) => {
    try {
      const b = businessOf(req)!;
      const rows = await prisma.codCollection.findMany({
        where: { businessId: b.id, businessType: b.type, courierType: 'courier' },
        orderBy: { collectedAt: 'desc' },
        distinct: ['courierKey'],
        take: 30,
        select: { courierName: true }
      });
      res.json({ success: true, data: rows.map((r) => r.courierName) });
    } catch (error) {
      fail(res, error, 'تعذّر جلب المندوبين');
    }
  }
);

export default router;
