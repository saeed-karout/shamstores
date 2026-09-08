// frontend/src/components/storefront/FollowOrderPrompt.tsx
//
// دعوة الزبون لمتابعة طلبه — وهي اللحظة الوحيدة التي يقبل فيها بسرور.
//
// **لماذا هنا لا في مكان آخر:** طلبٌ في الطريق يجعل الزبون يريد أن يعرف
// أين وصل. فالعرض يخدمه هو، لا يخدم التسويق — ولذلك يُقبل. وسؤاله في أي
// موضع آخر («اشترك في نشرتنا») يُرفض ويُحرق معه الطلب.
//
// **والتسويق خانةٌ منفصلة غير مؤشَّرة:** من قبل تتبّع طلبه لم يقبل إعلانات.
// افتراضُ موافقته يحرق القناة على كل تجّار المنصّة لا على متجرٍ واحد —
// تيليجرام يحظر البوت المُبلَّغ عنه، والمتصفّح يحجب الموقع نهائياً.

import React, { useCallback, useEffect, useState } from 'react';
import { IoPaperPlaneOutline, IoNotificationsOutline, IoCheckmarkCircle } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { sf } from '@/utils/storefrontTheme';
import { enablePush } from '@/services/webPush';

interface Props {
  businessId: string;
  businessType: 'restaurant' | 'store';
  /** يُعرض للمسجّلين فقط — الضيف بلا حساب لا عنوان له نراسله عليه */
  isAuthenticated: boolean;
}

interface SubState {
  channels: string[];
  marketingOptIn: boolean;
  unsubscribed: boolean;
  telegramLinked: boolean;
  telegramAvailable: boolean;
}

const FollowOrderPrompt: React.FC<Props> = ({ businessId, businessType, isAuthenticated }) => {
  const [state, setState] = useState<SubState | null>(null);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated || !businessId) return;
    try {
      const data: any = await api.get(`/campaigns/subscription/${businessId}`);
      setState(data);
      setMarketing(Boolean(data?.marketingOptIn));
    } catch {
      // الاشتراك تحسينٌ لا شرط لتتبّع الطلب
    }
  }, [businessId, isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  if (!isAuthenticated || !state || state.unsubscribed) return null;

  const hasTelegram = state.channels.includes('telegram') && state.telegramLinked;
  const hasPush = state.channels.includes('push');
  if (hasTelegram && hasPush) return null;

  const subscribe = async (channel: 'telegram' | 'push') => {
    setBusy(channel);
    try {
      // الإذن أولاً ثم التسجيل: إذنٌ مرفوض يعني اشتراكاً بلا عنوان —
      // سطرٌ في القاعدة لا يوصل شيئاً
      if (channel === 'push') {
        const result = await enablePush();
        if (!result.ok) {
          toast.error(result.error || 'تعذّر تفعيل الإشعارات', { duration: 6000 });
          return;
        }
      }

      const data: any = await api.post('/campaigns/subscribe', {
        businessId,
        businessType,
        channel,
        marketingOptIn: marketing
      });

      // تيليجرام يحتاج ضغطة Start بعد الإذن — الرابط يُفتح فوراً وإلا
      // بقي الإذن بلا عنوان يوصل إليه
      if (channel === 'telegram' && data?.telegramLinkUrl) {
        window.open(data.telegramLinkUrl, '_blank', 'noopener');
      }

      toast.success('سيصلك تحديث طلبك أولاً بأول');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر التفعيل');
    } finally {
      setBusy(null);
    }
  };

  const buttonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    minWidth: 130,
    minHeight: 42,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '9px 14px',
    borderRadius: 11,
    border: `1px solid ${active ? sf.accent : sf.border}`,
    background: active ? sf.accentSoft : 'transparent',
    color: active ? sf.accent : sf.text,
    fontFamily: sf.font,
    fontSize: 13,
    fontWeight: 700,
    cursor: active ? 'default' : 'pointer'
  });

  return (
    <div
      style={{
        background: sf.surface,
        border: `1px solid ${sf.border}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        fontFamily: sf.font
      }}
    >
      <div style={{ color: sf.text, fontSize: 14, fontWeight: 800, marginBottom: 3 }}>
        تابع طلبك أولاً بأول
      </div>
      <p style={{ color: sf.muted, fontSize: 12, margin: '0 0 12px', lineHeight: 1.7 }}>
        يصلك تنبيه فور تغيّر حالة طلبك — بلا أن تُبقي هذه الصفحة مفتوحة.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {state.telegramAvailable && (
          <button
            type="button"
            onClick={() => !hasTelegram && subscribe('telegram')}
            disabled={hasTelegram || busy === 'telegram'}
            style={buttonStyle(hasTelegram)}
          >
            {hasTelegram ? <IoCheckmarkCircle size={15} /> : <IoPaperPlaneOutline size={15} />}
            {hasTelegram ? 'تيليجرام مُفعّل' : 'عبر تيليجرام'}
          </button>
        )}

        <button
          type="button"
          onClick={() => !hasPush && subscribe('push')}
          disabled={hasPush || busy === 'push'}
          style={buttonStyle(hasPush)}
        >
          {hasPush ? <IoCheckmarkCircle size={15} /> : <IoNotificationsOutline size={15} />}
          {hasPush ? 'الإشعارات مُفعّلة' : 'إشعار المتصفّح'}
        </button>
      </div>

      {/* غير مؤشَّرة افتراضياً — الموافقة تُطلب لا تُفترض */}
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          marginTop: 12,
          cursor: 'pointer',
          color: sf.muted,
          fontSize: 11.5,
          lineHeight: 1.7
        }}
      >
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          style={{ marginTop: 3, accentColor: sf.accent, flexShrink: 0 }}
        />
        <span>أرغب أيضاً بمعرفة العروض والخصومات. يمكنك الإلغاء من أي رسالة.</span>
      </label>
    </div>
  );
};

export default FollowOrderPrompt;
