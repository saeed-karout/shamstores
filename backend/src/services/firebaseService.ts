// backend/src/services/firebaseService.ts

import admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

// تأكد من إضافة ملف serviceAccountKey.json في مجلد config
let serviceAccount: ServiceAccount;

try {
  // محاولة قراءة الملف إذا كان موجوداً
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/serviceAccountKey.json';
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.warn('Firebase service account not found, using environment variables');
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  } as ServiceAccount;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
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

class FirebaseService {
  private messaging = admin.messaging();

  async sendToDevice(
    deviceToken: string,
    notification: NotificationData,
    data?: Record<string, string>
  ): Promise<boolean> {
    try {
      if (!deviceToken) return false;

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
          priority: 'high',
          notification: {
            sound: notification.sound || 'default',
            priority: 'high',
            channelId: 'delivery_orders',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: notification.sound || 'default',
              badge: 1,
            },
          },
        },
      };

      await this.messaging.send(message);
      console.log(`✅ Notification sent to device: ${deviceToken.substring(0, 10)}...`);
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  async sendToMultipleDevices(
    deviceTokens: string[],
    notification: NotificationData,
    data?: Record<string, string>
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = await Promise.all(
      deviceTokens.map(async (token) => {
        const success = await this.sendToDevice(token, notification, data);
        return { token, success };
      })
    );

    return {
      success: results.filter(r => r.success).map(r => r.token),
      failed: results.filter(r => !r.success).map(r => r.token),
    };
  }

  async subscribeToTopic(topic: string, deviceTokens: string[]): Promise<void> {
    try {
      await this.messaging.subscribeToTopic(deviceTokens, topic);
      console.log(`✅ Subscribed ${deviceTokens.length} devices to topic: ${topic}`);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
    }
  }

  async unsubscribeFromTopic(topic: string, deviceTokens: string[]): Promise<void> {
    try {
      await this.messaging.unsubscribeFromTopic(deviceTokens, topic);
      console.log(`✅ Unsubscribed ${deviceTokens.length} devices from topic: ${topic}`);
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
    }
  }
}

export default new FirebaseService();