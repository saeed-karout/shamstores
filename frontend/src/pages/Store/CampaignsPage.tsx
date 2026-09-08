// frontend/src/pages/Store/CampaignsPage.tsx
//
// حملات التاجر إلى زبائنه — تخدم المتجر والمطعم معاً.
//
// **الصفحة تقول الحقيقة عن الجمهور قبل كل شيء.** «١٢ مشتركاً» و«٣ يصلهم
// فعلاً» رقمان مختلفان: من أذن بلا عنوان (لم يضغط Start، أو رفض الإذن) لا
// يصله شيء. عرضُ الأوّل وحده يَعِد بما لا يحدث.
//
// **والحصّة معروضة دائماً لا عند تجاوزها:** حملتان في الأسبوع قيدٌ يحمي
// القناة — زبونٌ يُزعَج يحظر ولا يعود، والحظر يسقط كل تجّار المنصّة لا
// المسيء وحده.

import React, { useCallback, useEffect, useState } from 'react';
import {
  IoMegaphone, IoSend, IoPeople, IoPaperPlaneOutline,
  IoNotificationsOutline, IoMailOutline, IoTime, IoWarningOutline, IoRefresh
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  warn: '#FB923C',
  red: '#FF6B6B',
  green: '#4ADE80'
};

const MAX_TITLE = 70;
const MAX_BODY = 320;

type Segment = 'all' | 'returning' | 'lapsed';

const SEGMENTS: { key: Segment; label: string; hint: string }[] = [
  { key: 'all', label: 'كل المشتركين', hint: 'من وافق على العروض' },
  { key: 'returning', label: 'من عاد', hint: 'طلب أكثر من مرّة' },
  { key: 'lapsed', label: 'من انقطع', hint: 'بلا طلب منذ 60 يوماً' }
];

interface Audience {
  segment: Segment;
  reachable: number;
  subscribers: number;
  byChannel: { telegram: number; push: number; email: number };
  quota: { used: number; max: number; windowDays: number };
  telegramReady: boolean;
  pushReady: boolean;
}

interface HistoryRow {
  campaignId: string;
  title: string;
  message: string;
  recipients: number;
  sentAt: string;
}

const CampaignsPage: React.FC = () => {
  const [segment, setSegment] = useState<Segment>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const loadAudience = useCallback(async (seg: Segment) => {
    try {
      const data: any = await api.get(`/campaigns/audience?segment=${seg}`);
      setAudience(data);
    } catch {
      setAudience(null);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data: any = await api.get('/campaigns/history');
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      // السجلّ لا يمنع الإرسال
    }
  }, []);

  useEffect(() => { loadAudience(segment); }, [segment, loadAudience]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const quotaLeft = audience ? audience.quota.max - audience.quota.used : 0;
  const canSend =
    Boolean(title.trim() && body.trim()) &&
    title.length <= MAX_TITLE &&
    body.length <= MAX_BODY &&
    (audience?.reachable ?? 0) > 0 &&
    quotaLeft > 0;

  const send = async () => {
    setSending(true);
    try {
      const result: any = await api.post('/campaigns/send', {
        segment,
        title: title.trim(),
        body: body.trim()
      });
      const total = (result?.telegramSent || 0) + (result?.pushSent || 0) + (result?.emailSent || 0);
      toast.success(`وصلت إلى ${total} وجهة`);
      setTitle('');
      setBody('');
      setConfirming(false);
      await Promise.all([loadAudience(segment), loadHistory()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر إرسال الحملة', { duration: 7000 });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '20px 16px', color: C.text }} dir="rtl">
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13, background: `${C.accent}22`,
            display: 'grid', placeItems: 'center'
          }}>
            <IoMegaphone size={20} color={C.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>حملات الزبائن</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: C.muted }}>
              رسالة إلى من اشترى منك ووافق على العروض
            </p>
          </div>
          <button
            onClick={() => { loadAudience(segment); loadHistory(); }}
            style={{ background: 'transparent', border: `1px solid ${C.border}`,
                     color: C.muted, borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}
          >
            <IoRefresh size={15} />
          </button>
        </header>

        {audience && audience.subscribers === 0 && (
          <div style={{
            background: `${C.warn}14`, border: `1px solid ${C.warn}44`, borderRadius: 14,
            padding: 14, margin: '16px 0', display: 'flex', gap: 10, alignItems: 'flex-start'
          }}>
            <IoWarningOutline size={19} color={C.warn} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <strong style={{ color: C.warn }}>لا مشترك بعد.</strong>{' '}
              يُدعى الزبون لمتابعة طلبه من نافذة التتبّع بعد الشراء — وهي اللحظة
              التي يقبل فيها، لأن العرض يخدمه. تُبنى القائمة مع الطلبات القادمة،
              وليست شيئاً يُستورد.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 16, marginTop: 16 }}
             className="camp-grid">

          {/* ============ التحرير ============ */}
          <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px' }}>إلى من؟</h2>

            <div style={{ display: 'grid', gap: 8 }}>
              {SEGMENTS.map((option) => {
                const active = segment === option.key;
                return (
                  <button
                    key={option.key}
                    onClick={() => setSegment(option.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'right',
                      padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
                      background: active ? `${C.accent}18` : C.surf,
                      border: `1px solid ${active ? C.accent : 'transparent'}`,
                      color: C.text, fontFamily: 'inherit'
                    }}
                  >
                    <IoPeople size={16} color={active ? C.accent : C.muted} />
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{option.label}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: C.muted }}>{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <h2 style={{ fontSize: 14, fontWeight: 800, margin: '20px 0 10px' }}>الرسالة</h2>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_TITLE}
              placeholder="مثال: خصم ١٥٪ حتى الجمعة"
              style={{
                width: '100%', padding: '11px 12px', borderRadius: 12, background: C.surf,
                border: `1px solid ${C.border}`, color: C.text, fontSize: 13.5, fontFamily: 'inherit'
              }}
            />
            <div style={{ textAlign: 'left', fontSize: 11, color: C.muted, marginTop: 3 }}>
              {title.length}/{MAX_TITLE}
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX_BODY}
              rows={4}
              placeholder="اكتب العرض بوضوح: ما هو، وحتى متى، وكيف يستفيد منه."
              style={{
                width: '100%', marginTop: 10, padding: '11px 12px', borderRadius: 12,
                background: C.surf, border: `1px solid ${C.border}`, color: C.text,
                fontSize: 13.5, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.8
              }}
            />
            <div style={{ textAlign: 'left', fontSize: 11, color: C.muted, marginTop: 3 }}>
              {body.length}/{MAX_BODY}
            </div>

            {!confirming ? (
              <button
                disabled={!canSend}
                onClick={() => setConfirming(true)}
                style={{
                  width: '100%', marginTop: 16, padding: '13px', borderRadius: 14,
                  background: canSend ? C.accent : C.surf,
                  color: canSend ? '#0A2018' : C.muted,
                  border: 'none', fontWeight: 900, fontSize: 14, fontFamily: 'inherit',
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                <IoSend size={16} />
                {quotaLeft <= 0
                  ? 'بلغتَ حدّ الأسبوع'
                  : audience?.reachable
                  ? `إرسال إلى ${audience.reachable} زبوناً`
                  : 'إرسال'}
              </button>
            ) : (
              <div style={{
                marginTop: 16, padding: 14, borderRadius: 14,
                background: `${C.accent}12`, border: `1px solid ${C.accent}55`
              }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.8 }}>
                  ستصل إلى <b style={{ color: C.accent }}>{audience?.reachable ?? 0}</b> زبوناً،
                  ويتبقّى لك <b>{quotaLeft - 1}</b> من حصّة الأسبوع. لا يمكن سحب الرسالة بعد إرسالها.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={send}
                    disabled={sending}
                    style={{
                      flex: 1, padding: '11px', borderRadius: 12, background: C.accent,
                      color: '#0A2018', border: 'none', fontWeight: 900, fontSize: 13.5,
                      fontFamily: 'inherit', cursor: sending ? 'wait' : 'pointer'
                    }}
                  >
                    {sending ? 'جارٍ الإرسال…' : 'نعم، أرسل'}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={sending}
                    style={{
                      padding: '11px 18px', borderRadius: 12, background: 'transparent',
                      color: C.muted, border: `1px solid ${C.border}`, fontSize: 13.5,
                      fontFamily: 'inherit', cursor: 'pointer'
                    }}
                  >
                    تراجع
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ============ الجمهور والسجلّ ============ */}
          <aside style={{ display: 'grid', gap: 16, alignContent: 'start' }}>

            <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 12px' }}>من سيصله؟</h2>

              {!audience ? (
                <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>جارٍ الحساب…</p>
              ) : (
                <div style={{ display: 'grid', gap: 11 }}>
                  <Row label="مشتركون في الشريحة" value={audience.subscribers} color={C.text} />
                  <Row label="يصلهم فعلاً" value={audience.reachable} color={C.green} />

                  {audience.subscribers > audience.reachable && (
                    <p style={{ fontSize: 11.5, color: C.muted, margin: 0, lineHeight: 1.7 }}>
                      الفرق هم من أذن بلا أن يُكمل: لم يضغط Start في تيليجرام،
                      أو رفض إذن المتصفّح.
                    </p>
                  )}

                  <div style={{ height: 1, background: C.border, margin: '2px 0' }} />

                  <Channel icon={IoPaperPlaneOutline} label="تيليجرام" n={audience.byChannel.telegram}
                           off={!audience.telegramReady} />
                  <Channel icon={IoNotificationsOutline} label="إشعار المتصفّح" n={audience.byChannel.push}
                           off={!audience.pushReady} />
                  <Channel icon={IoMailOutline} label="بريد" n={audience.byChannel.email} />

                  <div style={{ height: 1, background: C.border, margin: '2px 0' }} />

                  <div style={{ fontSize: 11.5, color: quotaLeft > 0 ? C.muted : C.red, lineHeight: 1.7 }}>
                    <IoTime size={12} style={{ verticalAlign: -1, marginLeft: 4 }} />
                    استعملتَ {audience.quota.used} من {audience.quota.max} حملات
                    خلال {audience.quota.windowDays} أيام.
                    {quotaLeft <= 0 && ' الحدّ يحمي قناتك — زبونٌ يُزعَج يحظر ولا يعود.'}
                  </div>
                </div>
              )}
            </section>

            <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 12px' }}>آخر ما أُرسل</h2>
              {history.length === 0 ? (
                <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>لم تُرسل حملة بعد.</p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {history.slice(0, 6).map((row) => (
                    <div key={row.campaignId} style={{ background: C.surf, borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 3 }}>{row.title}</div>
                      <div style={{
                        fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginBottom: 6,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      }}>
                        {row.message}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>{row.recipients} زبوناً</span>
                        <span>
                          {row.sentAt
                            ? new Date(row.sentAt).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })
                            : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .camp-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

const Row: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
    <span style={{ fontSize: 12.5, color: C.muted }}>{label}</span>
    <span style={{ fontSize: 19, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

const Channel: React.FC<{
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string; n: number; off?: boolean;
}> = ({ icon: Icon, label, n, off }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.muted }}>
    <Icon size={14} color={off ? C.red : C.muted} />
    <span style={{ flex: 1 }}>{label}</span>
    <span style={{ color: off ? C.red : C.text, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
      {off ? 'غير مضبوطة' : n}
    </span>
  </div>
);

export default CampaignsPage;
