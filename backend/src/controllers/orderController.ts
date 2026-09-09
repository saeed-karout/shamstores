// backend/src/controllers/orderController.ts

import { Response } from 'express';
import shippingService from '../services/shipping.service';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { isPaymentMethodAllowed } from '../services/payment.service';
import { verifyToken } from '../config/auth';
import { emitOrderRealtimeEvent, RealtimeOrderPayload } from '../realtime/socket';
import { notifyDriversOfOrder, notifyCustomerOfOrder } from '../services/driverPush.service';
import { alertMerchantOfNewOrder } from '../services/merchantAlerts.service';
import { attributeOrder, syncReferralStatus } from '../services/affiliate.service';
import { canAcceptOrder } from '../services/orderQuota.service';
import { validateSelection } from '../services/productOptions.service';

// ==================== دوال مساعدة ====================

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getBusinessId = async (req: AuthRequest): Promise<{ type: 'restaurant' | 'store', id: string } | null> => {
  if (req.user?.role === 'super_admin') {
    const targetRestaurantId = req.query.restaurantId as string || req.body.restaurantId;
    if (targetRestaurantId) return { type: 'restaurant', id: targetRestaurantId };
    const targetStoreId = req.query.storeId as string || req.body.storeId;
    if (targetStoreId) return { type: 'store', id: targetStoreId };
    
    const restaurants = await prisma.restaurant.findMany({ take: 1 });
    if (restaurants.length > 0) return { type: 'restaurant', id: restaurants[0].id };
    const stores = await prisma.store.findMany({ take: 1 });
    if (stores.length > 0) return { type: 'store', id: stores[0].id };
    return null;
  }
  if (req.user?.restaurantId) return { type: 'restaurant', id: req.user.restaurantId };
  if (req.user?.storeId) return { type: 'store', id: req.user.storeId };
  return null;
};

const toRealtimeOrderPayload = (order: any): RealtimeOrderPayload => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  isPaid: order.isPaid || false,
  total: Number(order.total),
  orderType: order.orderType,
  restaurantId: order.restaurantId || null,
  storeId: order.storeId || null,
  createdBy: order.createdBy || null,
  assignedDriverId: order.assignedDriverId || null
});

const emitOrderRealtimeNotification = (
  order: any,
  event: string,
  title: string,
  message: string,
  actorId?: string | null,
  extraData?: Record<string, unknown>
): void => {
  emitOrderRealtimeEvent({
    event,
    title,
    message,
    actorId,
    order: toRealtimeOrderPayload(order),
    extraData
  });
};

// ==================== التوزيع التلقائي للسائقين ====================

const findBestDriver = async (
  storeId: string,
  deliveryLat?: number,
  deliveryLng?: number
): Promise<any | null> => {
  try {
    const drivers = await prisma.user.findMany({
      where: {
        storeId,
        role: 'delivery_driver',
        isActive: true,
        isOnline: true
      },
      select: {
        id: true,
        name: true,
        phone: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationUpdate: true
      }
    });

    if (drivers.length === 0) return null;

    if (deliveryLat && deliveryLng) {
      let bestDriver = null;
      let shortestDistance = Infinity;

      for (const driver of drivers) {
        if (driver.lastLocationLat && driver.lastLocationLng) {
          const distance = calculateDistance(
            driver.lastLocationLat,
            driver.lastLocationLng,
            deliveryLat,
            deliveryLng
          );
          if (distance < shortestDistance) {
            shortestDistance = distance;
            bestDriver = driver;
          }
        }
      }
      if (bestDriver) return bestDriver;
    }

    const driversWithStats = await Promise.all(
      drivers.map(async (driver) => {
        const activeOrdersCount = await prisma.order.count({
          where: {
            assignedDriverId: driver.id,
            status: { in: ['pending', 'preparing', 'ready', 'delivering'] }
          }
        });
        return { driver, activeOrdersCount };
      })
    );

    driversWithStats.sort((a, b) => a.activeOrdersCount - b.activeOrdersCount);
    return driversWithStats[0]?.driver || drivers[0];
  } catch (error) {
    console.error('Error finding best driver:', error);
    return null;
  }
};

// ==================== جلب الطلبات ====================

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const { status, limit = 50 } = req.query;
    const where: any = {};
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      // الواجهة تعرض «طاولة كذا» ولم تكن العلاقة تُرسَل أصلاً
      include: { table: { select: { id: true, name: true } } }
    });

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      // الاسم والصورة معاً: بلا الاسم يقرأ التاجر «×1» بلا أن يعرف ماذا
      // يجهّز — وهو أول ما يحتاجه من الشاشة.
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: order.id },
        include: {
          menuItem: { select: { name: true, image: true } },
          product: { select: { name: true, imageUrl: true } }
        }
      });
      return { ...order, orderItems };
    }));

    res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    console.error('خطأ في جلب الطلبات:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const getOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const { id } = req.params;
    const where: any = { id };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const order = await prisma.order.findFirst({
      where,
      include: { table: { select: { id: true, name: true } } }
    });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      include: {
        menuItem: { select: { name: true, image: true } },
        product: { select: { name: true, imageUrl: true } }
      }
    });

    res.json({ success: true, data: { ...order, orderItems } });
  } catch (error) {
    console.error('خطأ في جلب الطلب:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== إنشاء الطلب ====================

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded) userId = decoded.id;
      } catch (error) {
        console.log('⚠️ Invalid token, continuing as guest');
      }
    }

    const {
      tableId, customerName, customerPhone,
      items: orderItemsData, notes, paymentMethod = 'cash',
      subtotal, couponCode, discountAmount, total,
      orderSource = 'restaurant',
      storeId: providedStoreId,
      restaurantId: providedRestaurantId,
      orderType = 'dine_in',
      deliveryAddress, deliveryLat, deliveryLng,
      deliveryFee: providedDeliveryFee,
      governorate,
      deliveryDistance: providedDeliveryDistance
    } = req.body;


    if (!orderItemsData || !Array.isArray(orderItemsData) || orderItemsData.length === 0) {
      res.status(400).json({ success: false, error: 'الطلب يجب أن يحتوي على عناصر على الأقل' });
      return;
    }

    if (!tableId && (!customerName || !customerPhone)) {
      res.status(400).json({ success: false, error: 'يرجى إدخال الاسم ورقم الهاتف' });
      return;
    }

    // تحديد restaurantId أو storeId
    let restaurantId: string | undefined;
    let storeId: string | undefined;

    if (tableId) {
  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table) {
    res.status(404).json({ success: false, error: 'الطاولة غير موجودة' });
    return;
  }
  restaurantId = table.restaurantId;
}
    else if (providedStoreId) {
      const store = await prisma.store.findFirst({
        where: { id: providedStoreId, isActive: true },
        select: { id: true }
      });
      if (!store) {
        res.status(404).json({ success: false, error: 'المتجر غير موجود' });
        return;
      }
      storeId = providedStoreId;
    }
    // زائر يطلب من واجهة مطعم بلا طاولة (استلام/توصيل) — كان هذا يفشل دائماً
    else if (providedRestaurantId) {
      const restaurant = await prisma.restaurant.findFirst({
        where: { id: providedRestaurantId, isActive: true },
        select: { id: true }
      });
      if (!restaurant) {
        res.status(404).json({ success: false, error: 'المطعم غير موجود' });
        return;
      }
      restaurantId = providedRestaurantId;
    }
    else if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.restaurantId) restaurantId = user.restaurantId;
      else if (user?.storeId) storeId = user.storeId;
    }

    if (!restaurantId && !storeId) {
      res.status(400).json({ success: false, error: 'معرف المطعم أو المتجر غير موجود' });
      return;
    }

    // حصّة الطلبات الشهرية — تُفحص قبل أي كتابة.
    //
    // كان `maxOrders` رقماً في جدول الخطط لا يقرأه أحد: خطة بصفر طلبات
    // تقبل كل شيء. الفحص هنا لأنه آخر نقطة يُعرف فيها النشاط قبل الإنشاء.
    const quotaCheck = await canAcceptOrder(
      (restaurantId || storeId)!,
      restaurantId ? 'restaurant' : 'store'
    );
    if (!quotaCheck.allowed) {
      // 409 لا 403: الطلب سليم والمانع حالة مؤقتة تزول أول الشهر
      res.status(409).json({ success: false, error: quotaCheck.error });
      return;
    }

    // طريقة الدفع تأتي من العميل، فتُفحص على الخادم لا في الواجهة وحدها:
    // إخفاء الخيار لا يمنع أحداً من إرساله مباشرة إلى الـ API.
    const businessPaymentSettings = restaurantId
      ? (await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { paymentSettings: true } }))?.paymentSettings
      : (await prisma.store.findUnique({ where: { id: storeId! }, select: { paymentSettings: true } }))?.paymentSettings;

    if (!isPaymentMethodAllowed(businessPaymentSettings, paymentMethod)) {
      res.status(400).json({
        success: false,
        error: 'طريقة الدفع المختارة غير متاحة لهذا النشاط.'
      });
      return;
    }

    // التحقق من الكوبون
    let coupon = null;
    if (couponCode) {
      // ملاحظة: كان الاستعلام يستخدم أعمدة غير موجودة (validUntil / usedCount)
      // فيرمي Prisma ويعود الطلب بخطأ 500 عند تطبيق أي كوبون.
      const now = new Date();
      const couponWhere: any = {
        code: String(couponCode).toUpperCase(),
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }]
      };
      if (restaurantId) couponWhere.restaurantId = restaurantId;
      else if (storeId) couponWhere.storeId = storeId;

      coupon = await prisma.coupon.findFirst({ where: couponWhere });
      if (!coupon) {
        res.status(400).json({ success: false, error: 'الكوبون غير صالح' });
        return;
      }
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        res.status(400).json({ success: false, error: 'تم استنفاذ عدد استخدامات الكوبون' });
        return;
      }
    }

    // حساب عناصر الطلب
    let calculatedTotal = 0;
    const orderItemsToCreate = [];

    for (const item of orderItemsData) {
      if ((!item.menuItemId && !item.productId) || !item.quantity) {
        res.status(400).json({ success: false, error: 'بيانات العنصر غير مكتملة' });
        return;
      }

      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 500) {
        res.status(400).json({ success: false, error: 'الكمية غير صالحة' });
        return;
      }
      item.quantity = quantity;

      let price = item.price || 0;
      // تكلفة الوحدة تُلتقط الآن لا وقت التقرير: قراءتها لاحقاً من المنتج
      // تجعل أرباح الشهر الماضي تتغيّر كلّما عدّل التاجر سعر الشراء.
      let unitCost: number | null = null;
      // ما يختاره الزبون من خيارات المنتج — يُتحقّق منه ويُسعَّر على الخادم
      let selectedSize: string | null = item.size || null;
      let selectedAddons: string[] | null = Array.isArray(item.addons) ? item.addons : null;

      if (item.menuItemId) {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
        if (!menuItem) {
          res.status(404).json({ success: false, error: 'العنصر غير موجود' });
          return;
        }
        if (!menuItem.isAvailable) {
          res.status(400).json({ success: false, error: `العنصر ${menuItem.name} غير متاح` });
          return;
        }
        if (restaurantId && menuItem.restaurantId !== restaurantId) {
          res.status(400).json({ success: false, error: 'العنصر لا ينتمي لهذا المطعم' });
          return;
        }
        // ⚠️ السعر يُحسب من قاعدة البيانات فقط. هذا مسار عام بلا مصادقة،
        // وقبول السعر من العميل كان يسمح بشراء أي صنف بأي مبلغ.
        price = Number(menuItem.price) || 0;

        const picked = validateSelection((menuItem as any).options, item.selectedOptions);
        if (!picked.ok) {
          res.status(400).json({ success: false, error: `${menuItem.name}: ${picked.error}` });
          return;
        }
        if (item.selectedOptions !== undefined) {
          price += picked.priceDelta;
          selectedSize = picked.size ?? null;
          selectedAddons = picked.addons && picked.addons.length > 0 ? picked.addons : null;
        }
      }
      else if (item.productId) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          res.status(404).json({ success: false, error: 'المنتج غير موجود' });
          return;
        }
        if (!product.isAvailable) {
          res.status(400).json({ success: false, error: `المنتج ${product.name} غير متاح` });
          return;
        }
        if (product.stock < item.quantity) {
          res.status(400).json({ success: false, error: `المنتج ${product.name} غير متوفر بالكمية المطلوبة` });
          return;
        }
        if (storeId && product.storeId !== storeId) {
          res.status(400).json({ success: false, error: 'المنتج لا ينتمي لهذا المتجر' });
          return;
        }
        price = Number(product.price) || 0;
        unitCost = product.cost === null || product.cost === undefined ? null : Number(product.cost);

        // ⚠️ فرق سعر الخيار يُحسب هنا لا في المتصفح: «مقاس كبير +5000»
        // قابل للتزوير في جسم الطلب لو صدّقناه.
        const picked = validateSelection((product as any).options, item.selectedOptions);
        if (!picked.ok) {
          res.status(400).json({ success: false, error: `${product.name}: ${picked.error}` });
          return;
        }
        price += picked.priceDelta;
        selectedSize = picked.size ?? selectedSize;
        selectedAddons = picked.addons && picked.addons.length > 0 ? picked.addons : selectedAddons;
      }

      const itemTotal = price * item.quantity;
      calculatedTotal += itemTotal;

      orderItemsToCreate.push({
        menuItemId: item.menuItemId || null,
        productId: item.productId || null,
        quantity: item.quantity,
        price: price,
        cost: unitCost,
        size: selectedSize,
        addons: selectedAddons,
        notes: item.notes || null
      });
    }

    // ⚠️ المجاميع تُحسب على الخادم. كانت تُؤخذ من جسم الطلب مباشرة، فكان
    // بإمكان أي زائر إرسال total = 0 لطلب بأي قيمة.
    const computedSubtotal = Math.round(calculatedTotal * 100) / 100;

    let computedDiscount = 0;
    if (coupon) {
      if (computedSubtotal < (coupon.minOrderAmount || 0)) {
        res.status(400).json({
          success: false,
          error: `الحد الأدنى لاستخدام هذا الكوبون هو ${coupon.minOrderAmount}`
        });
        return;
      }
      const value = Number(coupon.discountValue) || 0;
      computedDiscount =
        String(coupon.discountType).toLowerCase() === 'percentage'
          ? (computedSubtotal * value) / 100
          : value;
      computedDiscount = Math.min(Math.max(computedDiscount, 0), computedSubtotal);
      computedDiscount = Math.round(computedDiscount * 100) / 100;
    }

    // ==================== أجرة المحافظة ====================
    //
    // **تُحسَب هنا لا تُقبَل من الواجهة.** الأجرة تدخل في مبلغ الطلب، وقبولُ
    // ما يُرسَل يعني زبوناً يبدّل الرقم في أدوات المطوّر فيدفع صفراً. ما
    // يُقبل من الواجهة اختيارُ محافظةٍ فقط.
    //
    // وحين لا تُرسَل محافظة يبقى السلوك القديم كما هو — متاجرُ لم تضبط
    // مناطقها بعد تعمل بلا تغيير.
    let finalDeliveryFee = Math.max(0, Number(providedDeliveryFee) || 0);
    let effectiveOrderType = orderType;

    const zoneBusinessId = storeId || restaurantId;
    const zoneBusinessType = storeId ? 'store' : 'restaurant';

    if (governorate && zoneBusinessId && (orderType === 'delivery' || orderType === 'shipping')) {
      const zoneQuote = await shippingService.quote(
        zoneBusinessId,
        zoneBusinessType as 'store' | 'restaurant',
        String(governorate),
        Math.max(0, computedSubtotal - computedDiscount)
      );

      if (!zoneQuote.ok) {
        res.status(400).json({ success: false, error: zoneQuote.error || 'محافظة غير مدعومة' });
        return;
      }

      finalDeliveryFee = zoneQuote.fee;

      // **هنا يُحسم من يُسلّم.** المنطقة المضبوطة على `shipping` تُنتج طلباً
      // من نوع `shipping` — ولا يمرّ بالتوزيع التلقائي أدناه، ولا يُشعَر به
      // أي سائق (`driverPush` يتخطّى ما ليس `delivery`).
      effectiveOrderType = zoneQuote.deliveryMode === 'driver' ? 'delivery' : 'shipping';
    }
    const finalDeliveryDistance = Math.max(0, Number(providedDeliveryDistance) || 0);
    const finalTotal = Math.max(0, computedSubtotal - computedDiscount);

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`;

    const orderData: any = {
      orderNumber,
      restaurantId: restaurantId || null,
      storeId: storeId || null,
      tableId: tableId || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      subtotal: computedSubtotal,
      discountAmount: computedDiscount,
      couponCode: coupon ? coupon.code : null,
      total: Math.round((finalTotal + finalDeliveryFee) * 100) / 100,
      notes: notes || null,
      paymentMethod,
      orderType: effectiveOrderType,
      governorate: governorate || null,
      deliveryAddress: deliveryAddress || null,
      deliveryLat: deliveryLat || null,
      deliveryLng: deliveryLng || null,
      deliveryFee: finalDeliveryFee,
      deliveryDistance: finalDeliveryDistance,
      orderSource: orderSource,
      status: 'pending',
      // النقد وشام كاش كلاهما يُحصَّل خارج النظام: النقد عند التسليم،
      // وشام كاش تحويل يدوي إلى محفظة التاجر. وضعهما «مدفوعاً» تلقائياً
      // يعني طلباً يظهر مسدَّداً بلا أن يصل قرش — التاجر هو من يؤكّد.
      isPaid: paymentMethod !== 'cash' && paymentMethod !== 'sham_cash'
    };

    if (userId) orderData.createdBy = userId;

    // التوزيع التلقائي للسائق (للمتاجر فقط).
    //
    // `effectiveOrderType` لا `orderType`: طلبُ محافظةٍ بعيدة صار `shipping`
    // أعلاه، وإسنادُه إلى سائقٍ في مدينة المتجر يعني سائقاً يرفض وطلباً
    // يتعطّل بلا سببٍ ظاهر لأحد.
    if (storeId && effectiveOrderType === 'delivery') {
      const bestDriver = await findBestDriver(storeId, deliveryLat, deliveryLng);
      if (bestDriver) {
        orderData.assignedDriverId = bestDriver.id;
        orderData.status = 'preparing';
        orderData.estimatedDeliveryTime = 60; // دقائق
        console.log(`✅ Auto-assigned driver: ${bestDriver.name} (${bestDriver.id})`);
      } else {
        console.log('⚠️ No active drivers available, order pending');
      }
    }

    const order = await prisma.order.create({
      data: orderData
    });
    console.log('✅ Order created with ID:', order.id);

    // إنشاء عناصر الطلب
    for (const itemData of orderItemsToCreate) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: itemData.menuItemId,
          productId: itemData.productId,
          quantity: itemData.quantity,
          price: itemData.price,
          cost: itemData.cost,
          size: itemData.size,
          addons: itemData.addons,
          notes: itemData.notes
        }
      });

      if (itemData.productId) {
        await prisma.product.update({
          where: { id: itemData.productId },
          data: { stock: { decrement: itemData.quantity } }
        });
      }
    }

    // تحديث استخدام الكوبون
    if (coupon) {
  await prisma.coupon.update({
    where: { id: coupon.id },
    data: { usageCount: { increment: 1 } }
  });
}

    const orderItemsResult = await prisma.orderItem.findMany({
      where: { orderId: order.id }
    });

    const completedOrder = { ...order, orderItems: orderItemsResult };

    emitOrderRealtimeNotification(
      completedOrder,
      'order.created',
      'طلب جديد',
      `تم إنشاء طلب جديد برقم ${order.orderNumber}`,
      userId,
      { orderSource: order.orderSource }
    );

    // التعيين التلقائي أعلاه يُسنِد الطلب إلى أقرب سائق متصل — وكان يفعل
    // ذلك بصمت. فيبقى الطلب على شاشة السائق حتى يفتح التطبيق بنفسه.
    // `void`: الردّ لا ينتظر Firebase.
    void notifyDriversOfOrder(order);

    // السلّة المتروكة تُغلق عند الطلب — وإلا طارد المجدول زبوناً اشترى
    // فعلاً برسالة «سلّتك بانتظارك». الإغلاق بالهاتف **وبالهوية** معاً:
    // الضيف قد يطلب من متصفّحٍ آخر غير الذي التُقطت سلّته فيه.
    void (async () => {
      try {
        const orderPhone = order.customerPhone?.trim();
        const businessId = order.storeId || order.restaurantId;
        if (!businessId) return;

        const or: any[] = [];
        if (userId) or.push({ subjectKey: `u:${userId}` });
        if (orderPhone) or.push({ phone: orderPhone });
        if (or.length === 0) return;

        await prisma.abandonedCart.updateMany({
          where: { businessId, recoveredAt: null, OR: or },
          data: { recoveredAt: new Date() }
        });
      } catch (error) {
        console.error('تعذّر إغلاق السلّة المتروكة:', error);
      }
    })();

    // إحالة المسوّق — أساسها المنتجات بعد الخصم لا الفاتورة: رسوم التوصيل
    // ليست بيعاً حقّقه المسوّق، ودفعُ عمولةٍ عليها خسارةٌ صافية للتاجر.
    if (req.body?.referralCode) {
      const businessId = order.restaurantId || order.storeId;
      if (businessId) {
        void attributeOrder({
          code: String(req.body.referralCode),
          orderId: order.id,
          businessId,
          businessType: order.restaurantId ? 'restaurant' : 'store',
          buyerUserId: userId,
          baseAmount: Number(order.subtotal) - (Number(order.discountAmount) || 0)
        });
      }
    }

    // والتاجر كذلك: السوكِت يبثّ الطلب، لكنه لا يبلغ من أغلق اللوحة. فيبرد
    // الطلب حتى يلغيه الزبون، والتاجر لا يعلم أنه كان عنده طلب.
    void alertMerchantOfNewOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      orderType: order.orderType,
      restaurantId: order.restaurantId,
      storeId: order.storeId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      itemCount: orderItemsToCreate.length
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: completedOrder
    });
  } catch (error) {
    console.error('❌ Error in createOrder:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الطلب' });
  }
};

// ==================== تحديث حالة الطلب ====================

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    const where: any = { id };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const order = await prisma.order.findFirst({ where });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status }
    });

    // حالةٌ لم تتغيّر لا تُشعِر أحداً: التاجر قد يضغط الزرّ نفسه مرّتين،
    // وتنبيهٌ يتكرّر بلا جديد يعلّم السائق تجاهل التنبيهات
    if (order.status !== updated.status) {
      void notifyDriversOfOrder(updated);
      // العمولة لا تُستحقّ قبل اكتمال الطلب وتسقط عند إلغائه
      void syncReferralStatus(updated.id, updated.status);
    }

    emitOrderRealtimeNotification(
      updated,
      'order.status.updated',
      'تحديث حالة الطلب',
      `تم تحديث حالة الطلب ${updated.orderNumber} إلى ${updated.status}`,
      req.user?.id
    );

    res.json({ success: true, message: 'تم تحديث حالة الطلب', data: { status: updated.status } });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الطلب' });
  }
};

// ==================== تحديث حالة الدفع ====================

/** طرق الدفع كما في تعداد Prisma — قيمة خارجها ترتدّ 500 بلا سبب مفهوم */
const PAYMENT_METHODS = ['cash', 'card', 'online', 'sham_cash'];

export const updatePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const { id } = req.params;
    const { isPaid, paymentMethod } = req.body;

    const where: any = { id };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const order = await prisma.order.findFirst({ where });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    const data: any = { isPaid: Boolean(isPaid) };
    if (paymentMethod) {
      if (!PAYMENT_METHODS.includes(paymentMethod)) {
        res.status(400).json({ success: false, error: 'طريقة دفع غير معروفة' });
        return;
      }
      data.paymentMethod = paymentMethod;
    }

    const updated = await prisma.order.update({
      where: { id },
      data
    });

    emitOrderRealtimeNotification(
      updated,
      'order.payment.updated',
      'تحديث حالة الدفع',
      `تم تحديث حالة الدفع للطلب ${updated.orderNumber}`,
      req.user?.id
    );

    res.json({
      success: true,
      message: 'تم تحديث حالة الدفع',
      data: { isPaid: updated.isPaid, paymentMethod: updated.paymentMethod }
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الدفع' });
  }
};

// ==================== طلبات اليوم ====================

export const getTodayOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = { createdAt: { gte: today } };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      // الاسم والصورة معاً: بلا الاسم يقرأ التاجر «×1» بلا أن يعرف ماذا
      // يجهّز — وهو أول ما يحتاجه من الشاشة.
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: order.id },
        include: {
          menuItem: { select: { name: true, image: true } },
          product: { select: { name: true, imageUrl: true } }
        }
      });
      return { ...order, orderItems };
    }));

    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      delivering: orders.filter(o => o.status === 'delivering').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalSales: orders.reduce((sum, o) => sum + Number(o.total), 0)
    };

    res.json({ success: true, data: { orders: ordersWithItems, stats } });
  } catch (error) {
    console.error('Error getting today orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== إحصائيات الطلبات ====================

export const getOrderStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const { period = 'week' } = req.query;
    let startDate: Date;

    if (period === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    const where: any = { createdAt: { gte: startDate }, status: { not: 'cancelled' } };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const orders = await prisma.order.findMany({ where });

    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

    const dailyStats: { [key: string]: { orders: number; sales: number } } = {};
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { orders: 0, sales: 0 };
      }
      dailyStats[date].orders++;
      dailyStats[date].sales += Number(order.total);
    });

    res.json({
      success: true,
      data: {
        period,
        totalOrders,
        totalSales,
        averageOrder,
        dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({ date, ...stats }))
      }
    });
  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإحصائيات' });
  }
};

// ==================== طلبات المستخدم ====================

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: 'يجب تسجيل الدخول أولاً' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: { createdBy: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      // الاسم والصورة معاً: بلا الاسم يقرأ التاجر «×1» بلا أن يعرف ماذا
      // يجهّز — وهو أول ما يحتاجه من الشاشة.
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: order.id },
        include: {
          menuItem: { select: { name: true, image: true } },
          product: { select: { name: true, imageUrl: true } }
        }
      });
      return { ...order, orderItems };
    }));

    res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلبات' });
  }
};

// ==================== دوال التوصيل (مختصرة) ====================

export const getDeliveryOrdersForRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business || business.type !== 'restaurant') {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { status } = req.query;
    const where: any = { restaurantId: business.id, orderType: 'delivery' };
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('خطأ في جلب طلبات التوصيل:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const getDeliveryOrdersForDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driverId = req.user?.id;
    if (!driverId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        assignedDriverId: driverId,
        orderType: 'delivery',
        status: { in: ['ready', 'delivering'] }
      },
      orderBy: { estimatedDeliveryTime: 'asc' }
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('خطأ في جلب طلبات المندوب:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const assignDeliveryDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business || business.type !== 'restaurant') {
      res.status(400).json({ success: false, error: 'معرف المطعم غير موجود' });
      return;
    }

    const { orderId } = req.params;
    const { driverId, estimatedMinutes = 30 } = req.body;

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: business.id, orderType: 'delivery' }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود أو ليس طلب توصيل' });
      return;
    }

    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: 'delivery_driver' }
    });

    if (!driver) {
      res.status(404).json({ success: false, error: 'مندوب التوصيل غير موجود' });
      return;
    }

    if (!driver.isActive || !driver.isOnline) {
      res.status(403).json({ success: false, error: 'المندوب غير متاح حالياً' });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        assignedDriverId: driverId,
        estimatedDeliveryTime: estimatedMinutes,
        status: 'ready'
      }
    });

    void notifyDriversOfOrder(updated);

    emitOrderRealtimeNotification(
      updated,
      'order.driver.assigned',
      'تعيين مندوب توصيل',
      `تم تعيين المندوب ${driver.name} للطلب ${updated.orderNumber}`,
      req.user?.id,
      { driverId: driver.id, driverName: driver.name, estimatedDeliveryTime: estimatedMinutes }
    );

    res.json({
      success: true,
      message: 'تم تعيين مندوب التوصيل بنجاح',
      data: { orderId: updated.id, driverId, driverName: driver.name, estimatedDeliveryTime: estimatedMinutes }
    });
  } catch (error) {
    console.error('خطأ في تعيين مندوب التوصيل:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تعيين مندوب التوصيل' });
  }
};

export const updateDeliveryOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const driverId = req.user?.id;
    const userRole = req.user?.role;
    const isOwner = userRole === 'owner' || userRole === 'super_admin';

    const where: any = { id: orderId, orderType: 'delivery' };
    if (!isOwner && driverId) where.assignedDriverId = driverId;

    const order = await prisma.order.findFirst({ where });
    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    const validTransitions: Record<string, string[]> = {
      'pending': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['delivering', 'cancelled'],
      'delivering': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    };

    if (validTransitions[order.status] && !validTransitions[order.status].includes(status)) {
      res.status(400).json({ success: false, error: `لا يمكن تغيير الحالة من ${order.status} إلى ${status}` });
      return;
    }

    const updateData: any = { status };
    if (status === 'delivering') updateData.driverAcceptedAt = new Date();
    if (status === 'delivered') updateData.actualDeliveryTime = Math.floor(new Date().getTime() / 60000);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

    let successMessage = 'تم تحديث حالة الطلب بنجاح';
    if (status === 'delivering') successMessage = 'تم قبول الطلب وبدء التوصيل';
    if (status === 'delivered') successMessage = 'تم إكمال التوصيل بنجاح';

    if (order.status !== updated.status) {
      void notifyDriversOfOrder(updated);
      void syncReferralStatus(updated.id, updated.status);
    }

    if (status === 'delivered') {
      void notifyCustomerOfOrder(
        updated,
        'وصل طلبك',
        `تم تسليم الطلب #${updated.orderNumber}. نتمنّى لك وجبةً هنيّة`
      );
    }

    emitOrderRealtimeNotification(
      updated,
      'order.delivery.status.updated',
      'تحديث حالة التوصيل',
      `تم تحديث حالة الطلب ${updated.orderNumber} إلى ${updated.status}`,
      req.user?.id
    );

    res.json({ success: true, message: successMessage, data: { status: updated.status } });
  } catch (error) {
    console.error('خطأ في تحديث حالة الطلب:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الطلب' });
  }
};

export const getOrderWithDeliveryInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findFirst({
      where: { id: orderId, orderType: 'delivery' }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('خطأ في جلب معلومات التوصيل:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

export const getDeliveryStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await getBusinessId(req);
    if (!business) {
      res.status(400).json({ success: false, error: 'معرف النشاط التجاري غير موجود' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = { orderType: 'delivery' };
    if (business.type === 'restaurant') where.restaurantId = business.id;
    else where.storeId = business.id;

    const todayDeliveryOrders = await prisma.order.count({
      where: { ...where, createdAt: { gte: today } }
    });

    const activeDeliveryOrders = await prisma.order.findMany({
      where: { ...where, status: { in: ['ready', 'delivering'] } }
    });

    const activeDrivers = await prisma.user.count({
      where: {
        [business.type === 'restaurant' ? 'restaurantId' : 'storeId']: business.id,
        role: 'delivery_driver',
        isActive: true
      }
    });

    const deliveredOrders = await prisma.order.findMany({
      where: { ...where, status: 'delivered' }
    });

    const validDeliveredOrders = deliveredOrders.filter(order => order.actualDeliveryTime !== null);

    let avgDeliveryTime = 0;
    let totalDeliveryFees = 0;
    let avgDeliveryDistance = 0;

    if (validDeliveredOrders.length > 0) {
      const totalMinutes = validDeliveredOrders.reduce((sum, order) => {
        if (order.actualDeliveryTime) {
          const orderMinutes = Math.floor(new Date(order.createdAt).getTime() / 60000);
          return sum + (order.actualDeliveryTime - orderMinutes);
        }
        return sum;
      }, 0);
      avgDeliveryTime = totalMinutes / validDeliveredOrders.length;
      totalDeliveryFees = validDeliveredOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);
      avgDeliveryDistance = validDeliveredOrders.reduce((sum, order) => sum + (order.deliveryDistance || 0), 0) / validDeliveredOrders.length;
    }

    res.json({
      success: true,
      data: {
        todayDeliveryOrders,
        activeDeliveryOrders: activeDeliveryOrders.length,
        activeDrivers,
        avgDeliveryTime: Math.round(avgDeliveryTime),
        totalDeliveredOrders: validDeliveredOrders.length,
        totalDeliveryFees: Math.round(totalDeliveryFees),
        avgDeliveryDistance: Math.round(avgDeliveryDistance * 100) / 100
      }
    });
  } catch (error) {
    console.error('خطأ في جلب إحصائيات التوصيل:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب البيانات' });
  }
};

// ==================== تقييم الطلب ====================

/**
 * تقييم الزبون للطلب — وللمندوب معه.
 *
 * **ما كان ناقصاً:** ثلاثة أعمدة في المخطّط (`driverRating` و
 * `driverRatingComment` و`driverRatedAt`) لم يكتبها شيء إطلاقاً. ودالّة
 * `rateOrderAdvanced` التي تحدّث معدّل المندوب لم تكن موصولة بأي مسار —
 * شيفرةٌ ميّتة. فمعدّل كل مندوب في المنصّة ثابتٌ على صفر مهما وصّل.
 *
 * **والمعدّل كان يُحسب خطأً:** `(القديم + الجديد) / 2` ليس متوسّطاً — هو
 * متوسّط متحرّك يعطي آخر تقييم نصف الوزن إلى الأبد. مندوبٌ بخمس نجوم في
 * مئة توصيلة يهبط إلى ٣ بتقييم واحد سيّئ. والعدد محفوظ عندنا
 * (`driverRatingCount`) فالمتوسّط الصحيح متاح بلا كلفة.
 */
export const rateOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { rating, comment, driverRating, driverComment } = req.body;
    const userId = req.user?.id;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ success: false, error: 'يرجى إدخال تقييم بين 1 و 5 نجوم' });
      return;
    }

    if (driverRating !== undefined && driverRating !== null) {
      if (driverRating < 1 || driverRating > 5) {
        res.status(400).json({ success: false, error: 'تقييم المندوب يجب أن يكون بين 1 و 5' });
        return;
      }
    }

    // `served` مثل `delivered`: كلاهما نهاية المسار، والطلب في المطعم
    // ينتهي عندها
    const order = await prisma.order.findFirst({
      where: { id: orderId, createdBy: userId, status: { in: ['delivered', 'served'] } }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود أو لم يتم تسليمه بعد' });
      return;
    }

    if (order.ratedAt) {
      res.status(409).json({ success: false, error: 'سبق أن قيّمت هذا الطلب' });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        rating: rating,
        ratingComment: comment || null,
        ratedAt: new Date(),
        ...(driverRating
          ? {
              driverRating,
              driverRatingComment: driverComment || null,
              driverRatedAt: new Date()
            }
          : {})
      }
    });

    // معدّل المندوب: متوسّطٌ حقيقي محسوبٌ من العدد المحفوظ
    if (driverRating && order.assignedDriverId) {
      const driver = await prisma.user.findUnique({
        where: { id: order.assignedDriverId },
        select: { driverRating: true, driverRatingCount: true }
      });

      if (driver) {
        const count = driver.driverRatingCount || 0;
        const sum = (driver.driverRating || 0) * count;
        const nextCount = count + 1;

        await prisma.user.update({
          where: { id: order.assignedDriverId },
          data: {
            driverRating: Math.round(((sum + driverRating) / nextCount) * 100) / 100,
            driverRatingCount: nextCount
          }
        });
      }
    }

    res.json({
      success: true,
      message: 'شكراً لتقييمك',
      data: { rating, comment, driverRating: driverRating || null }
    });
  } catch (error) {
    console.error('Error rating order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال التقييم' });
  }
};

export const rateOrderAdvanced = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { overallRating, comment } = req.body;
    const userId = req.user?.id;

    const order = await prisma.order.findFirst({
      where: { id: orderId, createdBy: userId, status: 'delivered' }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'الطلب غير موجود أو لم يتم تسليمه بعد' });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        rating: overallRating,
        ratingComment: comment || null,
        ratedAt: new Date()
      }
    });

    if (order.assignedDriverId) {
      const driver = await prisma.user.findUnique({ where: { id: order.assignedDriverId } });
      if (driver) {
        const newRating = ((driver.driverRating || 0) + overallRating) / 2;
        await prisma.user.update({
          where: { id: order.assignedDriverId },
          data: {
            driverRating: newRating,
            driverRatingCount: (driver.driverRatingCount || 0) + 1
          }
        });
      }
    }

    res.json({ success: true, message: 'شكراً لتقييمك', data: { orderId, overallRating, comment } });
  } catch (error) {
    console.error('Error in advanced rating:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال التقييم' });
  }
};

export const updateDriverLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const driverId = req.user?.id;
    const { lat, lng } = req.body;

    if (!driverId) {
      res.status(401).json({ success: false, error: 'غير مصرح' });
      return;
    }

    if (lat === undefined || lng === undefined) {
      res.status(400).json({ success: false, error: 'الإحداثيات مطلوبة' });
      return;
    }

    await prisma.user.update({
      where: { id: driverId },
      data: {
        lastLocationLat: lat,
        lastLocationLng: lng,
        lastLocationUpdate: new Date()
      }
    });

    res.json({ success: true, message: 'تم تحديث الموقع بنجاح', data: { lat, lng, timestamp: new Date() } });
  } catch (error) {
    console.error('خطأ في تحديث موقع المندوب:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الموقع' });
  }
};

export const getDriverLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { driverId } = req.params;
    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: 'delivery_driver' },
      select: {
        id: true,
        name: true,
        lastLocationLat: true,
        lastLocationLng: true,
        lastLocationUpdate: true
      }
    });

    if (!driver) {
      res.status(404).json({ success: false, error: 'مندوب التوصيل غير موجود' });
      return;
    }

    res.json({
      success: true,
      data: {
        driverId: driver.id,
        name: driver.name,
        lat: driver.lastLocationLat,
        lng: driver.lastLocationLng,
        lastUpdate: driver.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('خطأ في جلب موقع المندوب:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الموقع' });
  }
};