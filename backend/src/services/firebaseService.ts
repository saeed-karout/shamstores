// backend/src/services/firebaseService.ts

import admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

/**
 * إشعارات Firebase.
 *
 * **التهيئة لا يجوز أن تُسقط الخادم.** كانت `initializeApp` تُستدعى في أعلى
 * الملفّ بلا حماية: فإن نقص متغيّر بيئة واحد رمت `credential.cert` عند
 * تحميل الوحدة، ووحدة التوصيل تستوردها، والمسارات تستورد وحدة التوصيل —
 * فيموت الخادم كلّه عند الإقلاع بسبب إشعار. الإشعار تحسينٌ لا شرط: غيابه
 * يُسجَّل ويكمل النظام بالسوكِت والاستطلاع.
 */

let serviceAccount: ServiceAccount | null = null;

try {
  // مسار نسبيّ يُحلّ من مجلّد هذا الملفّ لا من مجلّد التشغيل — غيابه هو
  // الحالة الطبيعية على Heroku، ولذلك لا يُسجَّل كخطأ
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/serviceAccountKey.json';
  serviceAccount = require(serviceAccountPath);
} catch {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // المفتاح يُخزَّن في متغيّر بيئة بسطرٍ واحد، فتصير أسطره `\n` نصّية
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    serviceAccount = { projectId, clientEmail, privateKey };
  }
}

let ready = false;

if (!serviceAccount) {
  console.warn(
    '⚠️  Firebase غير مُهيّأ: تنقص FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY. ' +
    'الإشعارات خارج التطبيق لن تُرسل.'
  );
} else {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    ready = true;
    console.log('✅ Firebase مُهيّأ — الإشعارات خارج التطبيق تعمل');
  } catch (error) {
    console.error('❌ فشلت تهيئة Firebase — الإشعارات معطّلة:', (error as Error).message);
  }
}

export interface NotificationData {
  title: string;
  body: string;
  type: 'new_order' | 'order_status' | 'alert';
  orderId?: string;
  sound?: string;
  icon?: string;
  click_action?: string;
}

/** نتيجة الإرسال — `invalidToken` يعني رمزاً ميّتاً يجب حذفه من قاعدة البيانات */
export interface SendResult {
  ok: boolean;
  invalidToken: boolean;
}

/**
 * معرّف قناة أندرويد.
 *
 * **يجب أن يطابق ما ينشئه التطبيق حرفاً بحرف.** أندرويد ٨ فما فوق يُسقط
 * الإشعار بصمت إن أشار إلى قناة غير موجودة على الجهاز — لا خطأ عند المرسِل
 * ولا أثر عند المستقبِل. كان الخادم يرسل إلى `delivery_orders` والتطبيق
 * ينشئ `sham_orders_v2`، فكل إشعارٍ أُرسل ضاع.
 */
export const ANDROID_ORDERS_CHANNEL = 'sham_orders_v2';

/** اسم المورد الخام في التطبيق (`res/raw/notification.mp3`) — بلا لاحقة */
const DEFAULT_SOUND = 'notification';

/** رموز FCM التي تعني أن الرمز لم يعد صالحاً */
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument'
]);

class FirebaseService {
  // ==================== Messaging Methods ====================

  /** هل الإشعارات مُهيّأة فعلاً — تستعمله الفحوص الصحّية والتشخيص */
  get isConfigured(): boolean {
    return ready;
  }

  private get messaging(): admin.messaging.Messaging | null {
    return ready ? admin.messaging() : null;
  }

  private get auth(): admin.auth.Auth | null {
    return ready ? admin.auth() : null;
  }

  async sendToDevice(
    deviceToken: string,
    notification: NotificationData,
    data?: Record<string, string>
  ): Promise<SendResult> {
    const messaging = this.messaging;
    if (!messaging || !deviceToken) return { ok: false, invalidToken: false };

    try {
      const sound = notification.sound || DEFAULT_SOUND;

      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.icon && { imageUrl: notification.icon }),
        },
        data: {
          type: notification.type,
          orderId: notification.orderId || '',
          click_action: notification.click_action || 'FLUTTER_NOTIFICATION_CLICK',
          ...data,
        },
        android: {
          // `high` يوقظ الجهاز من وضع التوفير — وطلب توصيل يبرد إن انتظر
          // دورة المزامنة التالية
          priority: 'high',
          notification: {
            sound,
            priority: 'high',
            channelId: ANDROID_ORDERS_CHANNEL,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: {
            aps: {
              sound: `${sound}.mp3`,
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      await messaging.send(message);
      return { ok: true, invalidToken: false };
    } catch (error) {
      const code = (error as { code?: string })?.code || '';
      const invalidToken = DEAD_TOKEN_CODES.has(code);
      if (!invalidToken) {
        console.error('Error sending notification:', code || error);
      }
      return { ok: false, invalidToken };
    }
  }

  async sendToMultipleDevices(
    deviceTokens: string[],
    notification: NotificationData,
    data?: Record<string, string>
  ): Promise<{ success: string[]; failed: string[]; invalid: string[] }> {
    const results = await Promise.all(
      deviceTokens.map(async (token) => ({ token, ...(await this.sendToDevice(token, notification, data)) }))
    );

    return {
      success: results.filter(r => r.ok).map(r => r.token),
      failed: results.filter(r => !r.ok).map(r => r.token),
      invalid: results.filter(r => r.invalidToken).map(r => r.token),
    };
  }

  async subscribeToTopic(topic: string, deviceTokens: string[]): Promise<void> {
    try {
      await this.messaging?.subscribeToTopic(deviceTokens, topic);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
    }
  }

  async unsubscribeFromTopic(topic: string, deviceTokens: string[]): Promise<void> {
    try {
      await this.messaging?.unsubscribeFromTopic(deviceTokens, topic);
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
    }
  }

  // ==================== Firebase Auth Methods ====================

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken | null> {
    try {
      return (await this.auth?.verifyIdToken(idToken)) || null;
    } catch (error) {
      console.error('Error verifying ID token:', error);
      return null;
    }
  }

  async getUserByFirebaseUid(uid: string): Promise<admin.auth.UserRecord | null> {
    try {
      return (await this.auth?.getUser(uid)) || null;
    } catch (error) {
      console.error('Error retrieving Firebase user:', error);
      return null;
    }
  }

  async createCustomToken(uid: string): Promise<string | null> {
    try {
      return (await this.auth?.createCustomToken(uid)) || null;
    } catch (error) {
      console.error('Error creating custom token:', error);
      return null;
    }
  }

  async setCustomUserClaims(uid: string, customClaims: Record<string, any>): Promise<boolean> {
    try {
      if (!this.auth) return false;
      await this.auth.setCustomUserClaims(uid, customClaims);
      return true;
    } catch (error) {
      console.error('Error setting custom claims:', error);
      return false;
    }
  }

  async disableUser(uid: string): Promise<boolean> {
    try {
      if (!this.auth) return false;
      await this.auth.updateUser(uid, { disabled: true });
      return true;
    } catch (error) {
      console.error('Error disabling user:', error);
      return false;
    }
  }

  async enableUser(uid: string): Promise<boolean> {
    try {
      if (!this.auth) return false;
      await this.auth.updateUser(uid, { disabled: false });
      return true;
    } catch (error) {
      console.error('Error enabling user:', error);
      return false;
    }
  }

  async deleteFirebaseUser(uid: string): Promise<boolean> {
    try {
      if (!this.auth) return false;
      await this.auth.deleteUser(uid);
      return true;
    } catch (error) {
      console.error('Error deleting Firebase user:', error);
      return false;
    }
  }
}

export default new FirebaseService();
