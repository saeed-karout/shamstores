// frontend/src/components/GlobalNotifications.tsx
//
// مستمع الإشعارات الفورية — يُركَّب مرة واحدة على مستوى التطبيق.
//
// كان useSocket مستخدماً في صفحتَي الطلبات فقط، فالمشرف الذي يتصفّح أي شاشة
// أخرى بلا اتصال سوكِت إطلاقاً: طلب الترقية يصل إلى قاعدة البيانات ولا يصله
// خبر، فلا يراه إلا بتحديث الصفحة يدوياً.
//
// هنا الاتصال قائم ما دام المستخدم مسجّل الدخول، فيصل الإشعار في أي شاشة.

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSocket, NotificationEvent } from '@/hooks/useSocket';

interface Props {
  token: string | null;
}

/** إشعارات لها وجهة معروفة — النقر عليها ينقل المستخدم إليها */
const LINK_BY_TYPE: Record<string, string> = {
  upgrade_request: '/plans',
  order: '/orders'
};

const GlobalNotifications: React.FC<Props> = ({ token }) => {
  const navigate = useNavigate();

  const handleNotification = useCallback(
    (data: NotificationEvent & { link?: string | null }) => {
      const destination = data.link || LINK_BY_TYPE[data.type] || null;

      // يوقظ الجرس ليرفع عدّاده فوراً بلا انتظار فتح اللوحة
      window.dispatchEvent(new CustomEvent('app:notification', { detail: data }));

      toast(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id);
              if (destination) navigate(destination);
            }}
            role={destination ? 'button' : undefined}
            tabIndex={destination ? 0 : undefined}
            onKeyDown={(event) => {
              if (destination && (event.key === 'Enter' || event.key === ' ')) {
                toast.dismiss(t.id);
                navigate(destination);
              }
            }}
            style={{ cursor: destination ? 'pointer' : 'default', lineHeight: 1.7 }}
          >
            <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 2 }}>{data.title}</div>
            <div style={{ fontSize: 12.5, opacity: 0.85 }}>{data.message}</div>
          </div>
        ),
        {
          // أطول من الافتراضي: قرار ترقية ليس تأكيد حفظ عابراً
          duration: 8000,
          icon: '🔔',
          id: `${data.type}:${data.event}:${(data as any).entityId || data.timestamp}`
        }
      );
    },
    [navigate]
  );

  useSocket({
    token,
    enabled: Boolean(token),
    onNotification: handleNotification
  });

  return null;
};

export default GlobalNotifications;
