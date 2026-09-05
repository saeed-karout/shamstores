// backend/src/services/notification.service.ts
//
// إنشاء الإشعارات وقراءتها.
//
// **الحفظ والبثّ يقعان معاً هنا، لا في مكانين.**
//
// البثّ وحده يضيع كلما كان المستقبِل غير متصل، ولا يعرف بعده أنه فاته شيء.
// والحفظ وحده يعني إشعاراً لا يصل إلا بتحديث الصفحة. وفصلهما في مسارين
// منفصلين يعني حتماً موضعاً يستدعي أحدهما وينسى الآخر.

import prisma from './prisma';
import { emitPlatformNotification, getUserRoom, ADMIN_ROOM } from '../realtime/socket';

export interface CreateNotificationInput {
  type: string;
  event: string;
  title: string;
  message: string;
  link?: string | null;
  entityId?: string | null;
}

/** يقصّ النصوص الطويلة حتى لا يرفض العمود قيمة ولا تنفجر الواجهة */
const clip = (value: string, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const buildRow = (userId: string, input: CreateNotificationInput) => ({
  userId,
  type: clip(input.type, 40),
  event: clip(input.event, 60),
  title: clip(input.title, 160),
  message: clip(input.message, 1000),
  link: input.link ? clip(input.link, 300) : null,
  entityId: input.entityId ? clip(input.entityId, 60) : null
});

/**
 * إشعار لمستخدم واحد: يُحفظ ثم يُبَثّ إلى غرفته.
 *
 * فشل البثّ لا يُسقط العملية — الصفّ محفوظ وسيظهر في مركز الإشعارات عند أول
 * فتح. الإشعار الفوري راحة، والسجل هو الضمان.
 */
export const notifyUser = async (
  userId: string | null | undefined,
  input: CreateNotificationInput
): Promise<void> => {
  if (!userId) return;

  try {
    const row = await prisma.notification.create({ data: buildRow(userId, input) });

    emitPlatformNotification({
      rooms: [getUserRoom(userId)],
      type: row.type,
      event: row.event,
      title: row.title,
      message: row.message,
      link: row.link,
      entityId: row.id,
      extraData: { notificationId: row.id }
    });
  } catch (error) {
    console.error('تعذّر إنشاء الإشعار:', error);
  }
};

/**
 * إشعار لكل مشرفي المنصة.
 *
 * صفّ مستقل لكل مشرف لا صفّ واحد مشترك: «مقروء» حالة شخصية — قراءة مشرف
 * لطلب لا تعني أن زميله رآه.
 */
export const notifyAdmins = async (input: CreateNotificationInput): Promise<void> => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'super_admin', isActive: true },
      select: { id: true }
    });

    if (admins.length === 0) {
      console.warn('⚠️  لا مشرفين نشطين لاستقبال الإشعار:', input.event);
      return;
    }

    await prisma.notification.createMany({
      data: admins.map((admin) => buildRow(admin.id, input))
    });

    // البثّ إلى غرفة المشرفين دفعةً واحدة — أرخص من بثّ لكل غرفة على حدة
    emitPlatformNotification({
      rooms: [ADMIN_ROOM],
      type: input.type,
      event: input.event,
      title: input.title,
      message: input.message,
      link: input.link,
      entityId: input.entityId
    });
  } catch (error) {
    console.error('تعذّر إنشاء إشعار المشرفين:', error);
  }
};

export interface ListOptions {
  /** غير المقروءة وحدها */
  unreadOnly?: boolean;
  /** تصفية بالتصنيف */
  type?: string;
  limit?: number;
  cursor?: string;
}

export const listNotifications = async (userId: string, options: ListOptions = {}) => {
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 50);

  const where: any = { userId };
  if (options.unreadOnly) where.isRead = false;
  if (options.type) where.type = options.type;

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {})
  });

  const hasMore = rows.length > limit;
  return { items: hasMore ? rows.slice(0, limit) : rows, nextCursor: hasMore ? rows[limit - 1].id : null };
};

export const getUnreadCount = (userId: string): Promise<number> =>
  prisma.notification.count({ where: { userId, isRead: false } });

/** الشرط على userId ليس زائداً: بدونه يعلّم أي مستخدم إشعار غيره مقروءاً. */
export const markAsRead = async (userId: string, notificationId: string): Promise<number> => {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId, isRead: false },
    data: { isRead: true, readAt: new Date() }
  });
  return result.count;
};

export const markAllAsRead = async (userId: string): Promise<number> => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() }
  });
  return result.count;
};

/** التصنيفات الموجودة فعلاً لدى المستخدم — تُغذّي قائمة التصفية في الواجهة. */
export const getUserNotificationTypes = async (userId: string): Promise<string[]> => {
  const rows = await prisma.notification.findMany({
    where: { userId },
    select: { type: true },
    distinct: ['type']
  });
  return rows.map((row) => row.type);
};

export default {
  notifyUser,
  notifyAdmins,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getUserNotificationTypes
};
