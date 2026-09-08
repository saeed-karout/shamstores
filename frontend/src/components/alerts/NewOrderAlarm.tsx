// frontend/src/components/alerts/NewOrderAlarm.tsx
//
// منبّه الطلب الجديد داخل اللوحة.
//
// **العلّة التي يسدّها:** مستمع السوكِت كان في صفحة الطلبات وحدها. فالتاجر
// الذي يتصفّح منتجاته أو تقاريره «نشطٌ على اللوحة» ولا يحدث عنده شيء عند
// وصول طلب. ولا صوت أصلاً في أي صفحة — ولا شارة في عنوان التبويب. فطلبٌ
// يصل وتبويبٌ في الخلفية يعني طلباً يبرد.
//
// **ولماذا صوتٌ مولَّد لا ملفّ:** الشيفرة القائمة تشير إلى
// `/sounds/notification.mp3` وهو غير موجود في `public/` — نداءٌ يفشل بصمت.
// النغمة المولَّدة لا تُفقَد ولا تحتاج تحميلاً ولا تعتمد على الشبكة.
//
// **ويرنّ حتى يُقرّ التاجر لا مرّةً واحدة:** رنّةٌ واحدة أثناء مكالمة أو
// انشغال تضيع، وهي كل الغرض.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoNotifications, IoClose, IoArrowForward } from 'react-icons/io5';
import { useAuth } from '@/hooks/useAuth';
import { useSocket, NotificationEvent } from '@/hooks/useSocket';
import { onForegroundPush } from '@/services/webPush';

/** الفاصل بين رنّة وأخرى، وسقفُ الإلحاح — الرنين الأبدي يُطفأ فلا يعود ينفع */
const REPEAT_MS = 7000;
const MAX_REPEATS = 12;

interface PendingOrder {
  id: string;
  orderNumber: string;
  message: string;
  at: number;
}

/**
 * نغمة تنبيه من مذبذبين متتاليين.
 *
 * `AudioContext` يبدأ معلّقاً حتى يتفاعل المستخدم مع الصفحة — قاعدةُ
 * متصفّحٍ لا خللٌ عندنا. لذلك نستأنفه عند أوّل نقرة ونحتفظ به.
 */
const useChime = () => {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlock = () => {
      try {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return;
        if (!ctxRef.current) ctxRef.current = new Ctor();
        if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
      } catch {
        // متصفّح بلا Web Audio: يبقى التنبيه بصرياً
      }
    };

    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== 'running') return;

    // نغمتان صاعدتان: نمطٌ يميّزها عن أصوات النظام فلا تُخلط بها
    [0, 0.18].forEach((offset, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = index === 0 ? 740 : 988;

      const start = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);

      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  }, []);
};

/** شارةٌ في عنوان التبويب — يراها التاجر في شريط التبويبات بلا أن يفتحه */
const useTitleBadge = (count: number) => {
  const originalRef = useRef<string>('');

  useEffect(() => {
    if (!originalRef.current) originalRef.current = document.title;
    const base = originalRef.current;

    if (count === 0) {
      document.title = base;
      return;
    }

    let flip = false;
    const tick = () => {
      document.title = flip ? base : `(${count}) 🔔 طلب جديد`;
      flip = !flip;
    };
    tick();
    const timer = window.setInterval(tick, 1200);

    return () => {
      window.clearInterval(timer);
      document.title = base;
    };
  }, [count]);
};

const NewOrderAlarm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  // `useAuth` لا يُصدِّر الرمز — بقية الصفحات تقرأه من التخزين مباشرةً
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const chime = useChime();
  const repeatsRef = useRef(0);

  // التاجر وموظّفوه وحدهم: السائق والزبون لهما مساراتهما
  const isMerchant = user?.role === 'owner' || user?.role === 'staff';
  const ordersPath = user?.restaurantId ? '/restaurant/orders' : '/store/orders';

  const push = useCallback((order: PendingOrder) => {
    setPending((current) => (
      current.some((o) => o.id === order.id) ? current : [order, ...current].slice(0, 20)
    ));
    repeatsRef.current = 0;
  }, []);

  const handleNotification = useCallback((data: NotificationEvent) => {
    if (data?.event !== 'order.created') return;
    push({
      id: data.orderId,
      orderNumber: data.orderNumber,
      message: data.message || '',
      at: Date.now()
    });
  }, [push]);

  useSocket({
    token: token || null,
    enabled: Boolean(isMerchant && token),
    onNotification: handleNotification
  });

  // الرسالة الواردة من FCM واللوحة مفتوحة: نعرضها هنا لا كإشعار نظامٍ ثانٍ
  // يغطّي الشاشة التي ينظر إليها التاجر أصلاً
  useEffect(() => {
    if (!isMerchant) return;
    return onForegroundPush((payload: any) => {
      const orderId = payload?.data?.orderId;
      if (!orderId) return;
      push({
        id: orderId,
        orderNumber: payload?.data?.orderNumber || '',
        message: payload?.notification?.body || '',
        at: Date.now()
      });
    });
  }, [isMerchant, push]);

  // الرنين المتكرّر حتى الإقرار أو بلوغ السقف
  useEffect(() => {
    if (pending.length === 0) return;

    chime();
    repeatsRef.current = 1;

    const timer = window.setInterval(() => {
      if (repeatsRef.current >= MAX_REPEATS) {
        window.clearInterval(timer);
        return;
      }
      repeatsRef.current += 1;
      chime();
    }, REPEAT_MS);

    return () => window.clearInterval(timer);
  }, [pending.length, chime]);

  useTitleBadge(pending.length);

  if (!isMerchant || pending.length === 0) return null;

  const latest = pending[0];

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        insetInlineStart: 16,
        bottom: 16,
        zIndex: 9999,
        maxWidth: 380,
        background: '#0D4A3A',
        border: '1px solid #C8E235',
        borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        color: '#E8F5E9',
        padding: 16,
        direction: 'rtl',
        fontFamily: 'Cairo, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: '#C8E235',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <IoNotifications size={20} color="#0A2018" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>
            {pending.length > 1 ? `${pending.length} طلبات جديدة` : 'طلب جديد'}
          </div>
          <div style={{ fontSize: 12.5, color: '#9DC4AC', marginTop: 3, lineHeight: 1.6 }}>
            #{latest.orderNumber}
            {latest.message ? ` · ${latest.message}` : ''}
          </div>
        </div>

        <button
          onClick={() => setPending([])}
          aria-label="تجاهل"
          style={{
            background: 'transparent', border: 'none', color: '#9DC4AC',
            cursor: 'pointer', padding: 4, flexShrink: 0,
          }}
        >
          <IoClose size={18} />
        </button>
      </div>

      <button
        onClick={() => { setPending([]); navigate(ordersPath); }}
        style={{
          width: '100%', marginTop: 14, padding: '11px', borderRadius: 12,
          background: '#C8E235', color: '#0A2018', border: 'none',
          fontWeight: 900, fontSize: 13.5, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          fontFamily: 'inherit',
        }}
      >
        <IoArrowForward size={15} />
        عرض الطلبات
      </button>
    </div>
  );
};

export default NewOrderAlarm;
