// frontend/src/components/settings/OrderAlertsSettings.tsx
//
// تنبيهات الطلبات الجديدة — قنوات التاجر خارج اللوحة.
//
// **الرسالة التي يجب أن تصل أولاً:** اللوحة تنبّهك ما دامت مفتوحة. وهذه
// القنوات لما بعد إغلاقها. الخلط بينهما يجعل التاجر يظنّ أنه محميّ وهو
// ليس كذلك.
//
// **ولماذا قناتان:** تفشلان لأسبابٍ مختلفة. إشعار المتصفّح يحتاج إذناً
// يُرفض بالعادة ولا يعمل على iPhone إلا بتثبيت الموقع، وتيليجرام يحتاج
// ربطاً يدوياً مرّة — لكنه بعدها لا يفشل. فمن سقط من إحداهما تلقفته الأخرى.

import React, { useCallback, useEffect, useState } from 'react';
import {
  IoNotificationsOutline, IoPaperPlaneOutline, IoCheckmarkCircle,
  IoLinkOutline, IoUnlinkOutline, IoPhonePortraitOutline, IoFlaskOutline,
  IoInformationCircleOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { enablePush, disablePush, getPushState, PushState } from '@/services/webPush';

interface Palette {
  card: string; surf: string; accent: string; text: string;
  muted: string; border: string; red?: string;
}

interface DeviceRow {
  id: string;
  platform: string;
  label: string | null;
  lastSeenAt: string;
}

interface ChannelState {
  push: { available: boolean; devices: DeviceRow[] };
  telegram: {
    available: boolean;
    linked: boolean;
    linkedAt: string | null;
    botUsername: string | null;
    linkUrl: string | null;
  };
}

const OrderAlertsSettings: React.FC<{ colors: Palette }> = ({ colors: C }) => {
  const [state, setState] = useState<ChannelState | null>(null);
  const [pushState, setPushState] = useState<PushState>('default');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data: any = await api.get('/alert-channels/channels');
      setState(data);
    } catch {
      toast.error('تعذّر قراءة حالة التنبيهات');
    }
    setPushState(await getPushState());
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePush = async () => {
    setBusy('push');
    try {
      if (pushState === 'granted' && (state?.push.devices.length ?? 0) > 0) {
        await disablePush();
        toast.success('أُوقفت الإشعارات على هذا الجهاز');
      } else {
        const result = await enablePush();
        if (result.ok) toast.success('فُعّلت الإشعارات على هذا الجهاز');
        // الرسالة تقول ماذا يفعل، لا «فشل»: الرفض والقيد وiOS حالاتٌ
        // مختلفة ولكلٍّ مخرج
        else toast.error(result.error || 'تعذّر التفعيل', { duration: 7000 });
      }
      await load();
    } finally {
      setBusy(null);
    }
  };

  const unlinkTelegram = async () => {
    setBusy('telegram');
    try {
      await api.post('/alert-channels/telegram/unlink', {});
      toast.success('فُكّ ارتباط تيليجرام');
      await load();
    } catch {
      toast.error('تعذّر فكّ الارتباط');
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy('test');
    try {
      const result: any = await api.post('/alert-channels/test', {});
      const parts: string[] = [];
      if (result?.telegramSent) parts.push('تيليجرام');
      if (result?.pushSent) parts.push(`${result.pushSent} جهاز`);

      if (parts.length === 0) {
        toast.error('لم تُرسل تجربة — فعّل قناةً واحدة على الأقل أولاً', { duration: 6000 });
      } else {
        toast.success(`أُرسلت التجربة إلى: ${parts.join(' و')}`);
      }
    } catch {
      toast.error('تعذّر إرسال التجربة');
    } finally {
      setBusy(null);
    }
  };

  const pushOn = pushState === 'granted' && (state?.push.devices.length ?? 0) > 0;

  const pushHint = (() => {
    if (!state?.push.available) return 'الإشعارات غير مضبوطة على المنصّة بعد';
    if (pushState === 'ios-needs-pwa') return 'على iPhone: أضف الموقع إلى الشاشة الرئيسية أولاً';
    if (pushState === 'unsupported') return 'متصفّحك لا يدعم إشعارات الويب';
    if (pushState === 'not-configured') return 'ينقص إعداد الإشعارات على المنصّة';
    if (pushState === 'denied') return 'محظورة من إعدادات المتصفّح — فعّلها من أيقونة القفل بجانب العنوان';
    return pushOn ? 'مفعّلة على هذا الجهاز' : 'غير مفعّلة على هذا الجهاز';
  })();

  const row = (children: React.ReactNode) => (
    <div style={{
      background: C.surf, borderRadius: 14, padding: 16,
      display: 'flex', gap: 13, alignItems: 'flex-start',
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
      <h2 style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 15, fontWeight: 800, color: C.text, margin: '0 0 6px',
      }}>
        <IoNotificationsOutline size={17} color={C.accent} />
        تنبيهات الطلبات الجديدة
      </h2>

      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.8, margin: '0 0 16px' }}>
        اللوحة ترنّ وتنبّهك ما دامت مفتوحة. هذه القنوات <b style={{ color: C.text }}>لما
        بعد إغلاقها</b> — فعّل واحدة على الأقل حتى لا يبرد طلبٌ وأنت لا تعلم به.
      </p>

      <div style={{ display: 'grid', gap: 10 }}>

        {/* ---------- تيليجرام ---------- */}
        {row(
          <>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: state?.telegram.linked ? `${C.accent}22` : 'rgba(255,255,255,0.06)',
              display: 'grid', placeItems: 'center',
            }}>
              <IoPaperPlaneOutline size={18} color={state?.telegram.linked ? C.accent : C.muted} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>تيليجرام</span>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: `${C.accent}1F`, color: C.accent,
                }}>
                  الأكثر موثوقية
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: C.muted, margin: '4px 0 0', lineHeight: 1.7 }}>
                {!state?.telegram.available
                  ? 'البوت غير مضبوط على المنصّة بعد — تواصل مع الإدارة'
                  : state.telegram.linked
                  ? 'مرتبط — يصلك التنبيه والهاتف مقفل'
                  : 'يصلك التنبيه والهاتف مقفل، بلا إذن ولا تطبيق إضافي. اربطه بضغطة.'}
              </p>

              {state?.telegram.available && !state.telegram.linked && state.telegram.linkUrl && (
                <a
                  href={state.telegram.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { setTimeout(load, 8000); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                    padding: '8px 14px', borderRadius: 10, background: C.accent,
                    color: '#0A2018', fontSize: 12.5, fontWeight: 800, textDecoration: 'none',
                  }}
                >
                  <IoLinkOutline size={14} />
                  ربط حسابي بتيليجرام
                </a>
              )}

              {state?.telegram.linked && (
                <button
                  onClick={unlinkTelegram}
                  disabled={busy === 'telegram'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                    padding: '7px 12px', borderRadius: 10, background: 'transparent',
                    border: `1px solid ${C.border}`, color: C.muted,
                    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <IoUnlinkOutline size={13} />
                  فكّ الارتباط
                </button>
              )}
            </div>

            {state?.telegram.linked && <IoCheckmarkCircle size={19} color={C.accent} style={{ flexShrink: 0 }} />}
          </>
        )}

        {/* ---------- إشعار المتصفّح ---------- */}
        {row(
          <>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: pushOn ? `${C.accent}22` : 'rgba(255,255,255,0.06)',
              display: 'grid', placeItems: 'center',
            }}>
              <IoPhonePortraitOutline size={18} color={pushOn ? C.accent : C.muted} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>إشعار المتصفّح</div>
              <p style={{ fontSize: 11.5, color: C.muted, margin: '4px 0 0', lineHeight: 1.7 }}>
                {pushHint}
              </p>

              {(state?.push.devices.length ?? 0) > 0 && (
                <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
                  {state!.push.devices.map((device) => (
                    <li key={device.id} style={{ fontSize: 11, color: C.muted }}>
                      • {device.label || device.platform}
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={togglePush}
                disabled={busy === 'push' || !state?.push.available || pushState === 'unsupported'}
                style={{
                  marginTop: 10, padding: '8px 14px', borderRadius: 10,
                  background: pushOn ? 'transparent' : C.accent,
                  border: pushOn ? `1px solid ${C.border}` : 'none',
                  color: pushOn ? C.muted : '#0A2018',
                  fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  opacity: !state?.push.available ? 0.5 : 1,
                }}
              >
                {pushOn ? 'إيقاف على هذا الجهاز' : 'تفعيل على هذا الجهاز'}
              </button>
            </div>

            {pushOn && <IoCheckmarkCircle size={19} color={C.accent} style={{ flexShrink: 0 }} />}
          </>
        )}
      </div>

      {/* التجربة قبل أوّل طلب: اكتشافُ العطل حين يصل الطلب اكتشافٌ متأخّر */}
      <button
        onClick={sendTest}
        disabled={busy === 'test'}
        style={{
          width: '100%', marginTop: 14, padding: '11px', borderRadius: 12,
          background: 'transparent', border: `1px solid ${C.border}`, color: C.text,
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}
      >
        <IoFlaskOutline size={15} />
        {busy === 'test' ? 'جارٍ الإرسال…' : 'أرسل تنبيهاً تجريبياً'}
      </button>

      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-start',
        marginTop: 12, fontSize: 11.5, color: C.muted, lineHeight: 1.75,
      }}>
        <IoInformationCircleOutline size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          تصل التنبيهات إلى صاحب المحلّ وموظّفيه معاً. وكلٌّ يفعّل قنواته من حسابه.
        </span>
      </div>
    </div>
  );
};

export default OrderAlertsSettings;
