// backend/src/services/driverPush.service.ts

import prisma from './prisma';
import firebaseService, { NotificationData } from './firebaseService';

/**
 * إشعارات مندوبي التوصيل خارج التطبيق.
 *
 * **الثغرة التي يسدّها هذا الملفّ:** لم يكن في المنصّة كلّها إلا موضعٌ واحد
 * يرسل إشعاراً للسائق — `assignOrderToDriver`، أي التعيين اليدوي من لوحة
 * التاجر. أمّا المساران اللذان تمرّ منهما كل الطلبات فعلياً فكانا صامتين:
 *
 *   ١. التعيين التلقائي عند إنشاء الطلب: يُسنَد الطلب إلى أقرب سائق متصل
 *      ولا يُخبَر به. يبقى على شاشته حتى يفتح التطبيق فيكتشفه بنفسه.
 *   ٢. بركة الطلبات: طلبٌ يصير `ready` بلا سائق معيَّن فيراه كل سائقي
 *      النشاط — لو فتحوا التطبيق. والسوكِت وحده لا يكفي: يقفل السائق هاتفه
 *      فيقطع النظام الاتصال، فلا يصله شيء حتى يفتحه.
 *
 * فالنتيجة الواحدة للحالتين: طلبٌ ينتظر وسائقٌ لا يعلم.
 */

/** يمسح رمزاً ميّتاً بدل تركه يستهلك محاولةً فاشلة في كل إشعار */
const purgeToken = async (userId: string): Promise<void> => {
  try {
    await prisma.user.update({ where: { id: userId }, data: { fcmToken: null } });
  } catch {
    // مسح الرمز تنظيفٌ لا أكثر — فشله لا يعني فشل الإشعار
  }
};

/** إشعار مستخدم واحد برمزه المسجَّل */
export const pushToUser = async (
  userId: string,
  notification: Omit<NotificationData, 'sound' | 'click_action'>,
  data?: Record<string, string>
): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true }
    });
    if (!user?.fcmToken) return false;

    const result = await firebaseService.sendToDevice(
      user.fcmToken,
      { ...notification, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      data
    );

    if (result.invalidToken) await purgeToken(userId);
    return result.ok;
  } catch (error) {
    console.error('pushToUser failed:', error);
    return false;
  }
};

/** إشعار مجموعة سائقين دفعةً واحدة، مع تنظيف الرموز الميّتة */
const pushToDrivers = async (
  drivers: { id: string; fcmToken: string | null }[],
  notification: Omit<NotificationData, 'sound' | 'click_action'>,
  data?: Record<string, string>
): Promise<number> => {
  const targets = drivers.filter((d): d is { id: string; fcmToken: string } => Boolean(d.fcmToken));
  if (targets.length === 0) return 0;

  const results = await Promise.all(
    targets.map(async (driver) => {
      const result = await firebaseService.sendToDevice(
        driver.fcmToken,
        { ...notification, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        data
      );
      if (result.invalidToken) await purgeToken(driver.id);
      return result.ok;
    })
  );

  return results.filter(Boolean).length;
};

/** شكل الطلب الذي تحتاجه دوالّ الإشعار — أي مصدرٍ يوفّره يكفي */
interface OrderLike {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  assignedDriverId: string | null;
  restaurantId: string | null;
  storeId: string | null;
  total?: unknown;
}

/**
 * يُستدعى بعد كل تغيّر حالة أو إنشاء طلب. يقرّر بنفسه هل ثمّة ما يُرسل:
 *
 * - طلبٌ معيَّن لسائق وصار جاهزاً → إشعارٌ له وحده.
 * - طلبُ توصيلٍ جاهز بلا سائق → إشعارٌ لكل سائقي النشاط المتاحين (البركة).
 * - غير ذلك → صمت. لا يُزعج السائق بتغيّرات لا تعنيه.
 *
 * لا يرمي أبداً: الإشعار أثرٌ جانبي، وفشله لا يجوز أن يُفشل تحديث الحالة.
 */
export const notifyDriversOfOrder = async (order: OrderLike): Promise<void> => {
  try {
    if (order.orderType !== 'delivery') return;
    if (order.status !== 'ready' && order.status !== 'preparing') return;

    const body = `الطلب #${order.orderNumber} ${order.status === 'ready' ? 'جاهز للاستلام' : 'قيد التحضير — استعدّ'}`;
    const payload = { orderId: order.id, orderNumber: order.orderNumber };

    // معيَّن لسائق: هو وحده المعنيّ
    if (order.assignedDriverId) {
      await pushToUser(
        order.assignedDriverId,
        { title: 'طلب جديد لك', body, type: 'new_order', orderId: order.id },
        payload
      );
      return;
    }

    // البركة: الجاهز وحده يُعرض للجميع. الطلب قيد التحضير بلا سائق لا يزال
    // عند التاجر، وإشعارُ الجميع به يعلّم السائقين تجاهل التنبيه.
    if (order.status !== 'ready') return;

    const scope = order.restaurantId
      ? { restaurantId: order.restaurantId }
      : order.storeId
      ? { storeId: order.storeId }
      : null;
    if (!scope) return;

    const drivers = await prisma.user.findMany({
      where: {
        ...scope,
        role: 'delivery_driver',
        isActive: true,
        // المتصلون وحدهم: سائقٌ أنهى نوبته لا يُوقَظ هاتفه
        isOnline: true,
        fcmToken: { not: null }
      },
      select: { id: true, fcmToken: true }
    });

    const sent = await pushToDrivers(
      drivers,
      { title: 'طلب متاح', body: `${body} — أوّل من يقبله يأخذه`, type: 'new_order', orderId: order.id },
      payload
    );

    if (drivers.length > 0) {
      console.log(`📣 إشعار بركة الطلبات: ${sent}/${drivers.length} للطلب ${order.orderNumber}`);
    }
  } catch (error) {
    console.error('notifyDriversOfOrder failed:', error);
  }
};

/** إشعار الزبون بتغيّر حالة طلبه — نفس القناة، جمهورٌ آخر */
export const notifyCustomerOfOrder = async (
  order: OrderLike & { createdBy?: string | null },
  title: string,
  body: string
): Promise<void> => {
  try {
    if (!order.createdBy) return;
    await pushToUser(
      order.createdBy,
      { title, body, type: 'order_status', orderId: order.id },
      { orderId: order.id, orderNumber: order.orderNumber }
    );
  } catch (error) {
    console.error('notifyCustomerOfOrder failed:', error);
  }
};
