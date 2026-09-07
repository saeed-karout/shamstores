// frontend/src/pages/Admin/AdminPushNotifications.tsx
//
// بثّ إشعارات إلى تطبيق التوصيل.
//
// **لماذا هذه الصفحة:** إشعارات النظام كلها مربوطة بأحداث — طلبٌ أُنشئ،
// حالةٌ تغيّرت. ولم يكن ثمّة سبيل لإبلاغ السائقين بما ليس طلباً: توقّفٌ
// للصيانة، تعليماتُ نوبة، تحذيرُ طقس، إعلانُ حافز.
//
// **ولماذا معاينةٌ قبل الإرسال:** البثّ لا يُسترجع. إشعارٌ خرج إلى مئتي
// هاتفٍ لا يُلغى، وخطأٌ مطبعي يُقرأ مئتي مرّة. فالجمهور يُحسب ويُعرض أولاً،
// والزرّ يقول عدد من سيصلهم لا كلمة «إرسال» مجرّدة.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IoNotifications, IoSend, IoPeople, IoRadioButtonOn, IoStorefront,
  IoWarningOutline, IoCheckmarkCircle, IoTime, IoPhonePortraitOutline, IoRefresh
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../../services/api';

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  blue: '#60A5FA',
  yellow: '#F59E0B',
  green: '#4ADE80',
};

const MAX_TITLE = 65;
const MAX_BODY = 240;

type Audience = 'drivers_all' | 'drivers_online' | 'drivers_business';

interface AudienceOption {
  value: Audience;
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const AUDIENCES: AudienceOption[] = [
  { value: 'drivers_all', label: 'كل السائقين', hint: 'كل حساب سائق مُفعّل على المنصّة', icon: IoPeople },
  { value: 'drivers_online', label: 'المتصلون الآن', hint: 'من هم في نوبة عمل هذه اللحظة', icon: IoRadioButtonOn },
  { value: 'drivers_business', label: 'سائقو نشاط واحد', hint: 'مطعم أو متجر بعينه', icon: IoStorefront },
];

interface AudienceStats {
  total: number;
  reachable: number;
  withoutToken: number;
  firebaseConfigured: boolean;
  /** الاعتماد يتبع مشروع Firebase غير الذي بُني به التطبيق */
  credentialMismatch?: boolean;
  serverProjectId?: string | null;
}

interface Business {
  id: string;
  name: string;
  type: 'restaurant' | 'store';
  driverCount: number;
}

interface HistoryRow {
  broadcastId: string;
  title: string;
  message: string;
  recipients: number;
  readCount: number;
  sentAt: string;
}

const AdminPushNotifications: React.FC = () => {
  const [audience, setAudience] = useState<Audience>('drivers_online');
  const [businessId, setBusinessId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const [stats, setStats] = useState<AudienceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const selectedBusiness = businesses.find((b) => b.id === businessId);

  // ---- الأنشطة تُشتق من السائقين أنفسهم: لا معنى لبثٍّ إلى نشاطٍ بلا سائق
  useEffect(() => {
    (async () => {
      try {
        const data: any = await api.get('/admin/drivers');
        const list: any[] = Array.isArray(data) ? data : (data?.drivers ?? []);
        const map = new Map<string, Business>();

        list.forEach((d) => {
          const biz = d?.business;
          if (!biz?.id) return;
          const existing = map.get(biz.id);
          if (existing) existing.driverCount += 1;
          else map.set(biz.id, { id: biz.id, name: biz.name, type: biz.type, driverCount: 1 });
        });

        setBusinesses(Array.from(map.values()).sort((a, b) => b.driverCount - a.driverCount));
      } catch {
        // قائمة الأنشطة تحسينٌ لا شرط: الجمهوران الآخران يعملان بدونها
      }
    })();
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data: any = await api.get('/admin/push/history');
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      // السجلّ لا يمنع الإرسال
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ---- معاينة الجمهور: تُعاد الحساب مع كل تغيير في الاختيار
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (audience === 'drivers_business' && !businessId) {
        setStats(null);
        return;
      }

      setStatsLoading(true);
      try {
        const biz = businesses.find((b) => b.id === businessId);
        const params = new URLSearchParams({ audience });
        if (audience === 'drivers_business') {
          params.set('businessId', businessId);
          params.set('businessType', biz?.type || 'store');
        }
        const data: any = await api.get(`/admin/push/audience?${params.toString()}`);
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [audience, businessId, businesses]);

  const canSend = useMemo(() => {
    if (!title.trim() || !body.trim()) return false;
    if (title.length > MAX_TITLE || body.length > MAX_BODY) return false;
    if (audience === 'drivers_business' && !businessId) return false;
    return (stats?.total ?? 0) > 0;
  }, [title, body, audience, businessId, stats]);

  const send = async () => {
    setSending(true);
    try {
      const biz = businesses.find((b) => b.id === businessId);
      const result: any = await api.post('/admin/push/send', {
        audience,
        businessId: audience === 'drivers_business' ? businessId : undefined,
        businessType: audience === 'drivers_business' ? biz?.type : undefined,
        title: title.trim(),
        body: body.trim(),
      });

      toast.success(`وصل إلى ${result?.delivered ?? 0} من ${result?.targeted ?? 0}`);

      if (result?.withoutToken > 0) {
        toast(`${result.withoutToken} سائقاً بلا رمز إشعارات — سيرونه داخل التطبيق فقط`, {
          icon: 'ℹ️', duration: 6000,
        });
      }

      setTitle('');
      setBody('');
      setConfirming(false);
      loadHistory();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر إرسال الإشعار');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px 16px', color: C.text }} dir="rtl">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, background: `${C.accent}22`,
            display: 'grid', placeItems: 'center',
          }}>
            <IoNotifications size={22} color={C.accent} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 900 }}>بثّ إشعارات</h1>
            <p style={{ margin: 0, fontSize: 12.5, color: C.muted }}>
              رسالةٌ تصل هاتف السائق والتطبيق مغلق
            </p>
          </div>
        </header>

        {/* أخطر من الغياب: كل شيء يبدو مضبوطاً ولا يصل شيء */}
        {stats?.credentialMismatch && (
          <div style={{
            background: `${C.red}18`, border: `1px solid ${C.red}55`, borderRadius: 14,
            padding: 14, margin: '16px 0', display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <IoWarningOutline size={20} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <strong style={{ color: C.red }}>مشروع Firebase غير مطابق.</strong>{' '}
              حساب الخدمة على الخادم يتبع مشروع{' '}
              <code style={{ color: C.accent }}>{stats.serverProjectId || '—'}</code>{' '}
              بينما التطبيق بُني على مشروع آخر، فترفض Google كل رسالة
              (<code>messaging/mismatched-credential</code>). الرسائل ستُحفظ وتظهر داخل
              التطبيق، لكنها <b>لن توقظ أي هاتف</b> حتى يُولَّد مفتاح حساب خدمة من
              مشروع التطبيق نفسه.
            </div>
          </div>
        )}

        {stats && !stats.firebaseConfigured && (
          <div style={{
            background: `${C.red}18`, border: `1px solid ${C.red}55`, borderRadius: 14,
            padding: 14, margin: '16px 0', display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <IoWarningOutline size={20} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              <strong style={{ color: C.red }}>Firebase غير مهيّأ على الخادم.</strong>{' '}
              الإشعار سيُحفظ ويظهر داخل التطبيق، لكنه <b>لن يوقظ الهاتف</b>. اضبط
              مفتاح حساب الخدمة أولاً — راجع <code style={{ color: C.accent }}>docs/deployment/push-notifications.md</code>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16, marginTop: 16 }}
             className="apn-grid">

          {/* ============ التحرير ============ */}
          <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>

            <h2 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px' }}>إلى من؟</h2>

            <div style={{ display: 'grid', gap: 8 }}>
              {AUDIENCES.map((opt) => {
                const Icon = opt.icon;
                const active = audience === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAudience(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right',
                      padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                      background: active ? `${C.accent}18` : C.surf,
                      border: `1px solid ${active ? C.accent : 'transparent'}`,
                      color: C.text,
                    }}
                  >
                    <Icon size={18} color={active ? C.accent : C.muted} />
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{opt.label}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: C.muted }}>{opt.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {audience === 'drivers_business' && (
              <select
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                style={{
                  width: '100%', marginTop: 10, padding: '11px 12px', borderRadius: 12,
                  background: C.surf, border: `1px solid ${C.border}`, color: C.text, fontSize: 13,
                }}
              >
                <option value="">— اختر النشاط —</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type === 'restaurant' ? 'مطعم' : 'متجر'}) — {b.driverCount} سائق
                  </option>
                ))}
              </select>
            )}

            {audience === 'drivers_business' && businesses.length === 0 && (
              <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                لا يوجد نشاط له سائقون مرتبطون بعد.
              </p>
            )}

            <h2 style={{ fontSize: 14, fontWeight: 800, margin: '22px 0 12px' }}>الرسالة</h2>

            <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 5 }}>العنوان</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={MAX_TITLE}
              placeholder="مثال: صيانة النظام الليلة"
              style={{
                width: '100%', padding: '11px 12px', borderRadius: 12, background: C.surf,
                border: `1px solid ${title.length >= MAX_TITLE ? C.yellow : C.border}`,
                color: C.text, fontSize: 13.5,
              }}
            />
            <div style={{ textAlign: 'left', fontSize: 11, color: C.muted, marginTop: 3 }}>
              {title.length}/{MAX_TITLE}
            </div>

            <label style={{ fontSize: 12, color: C.muted, display: 'block', margin: '10px 0 5px' }}>النصّ</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX_BODY}
              rows={4}
              placeholder="مثال: سيتوقّف استقبال الطلبات من ١٢ حتى ١ فجراً للصيانة."
              style={{
                width: '100%', padding: '11px 12px', borderRadius: 12, background: C.surf,
                border: `1px solid ${body.length >= MAX_BODY ? C.yellow : C.border}`,
                color: C.text, fontSize: 13.5, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7,
              }}
            />
            <div style={{ textAlign: 'left', fontSize: 11, color: C.muted, marginTop: 3 }}>
              {body.length}/{MAX_BODY}
            </div>

            {/* الإرسال بخطوتين: ما لا يُسترجع لا يُطلق بنقرة واحدة */}
            {!confirming ? (
              <button
                disabled={!canSend}
                onClick={() => setConfirming(true)}
                style={{
                  width: '100%', marginTop: 18, padding: '13px', borderRadius: 14,
                  background: canSend ? C.accent : C.surf,
                  color: canSend ? '#0A2018' : C.muted,
                  border: 'none', fontWeight: 900, fontSize: 14,
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <IoSend size={16} />
                {stats?.total ? `إرسال إلى ${stats.total} سائق` : 'إرسال'}
              </button>
            ) : (
              <div style={{
                marginTop: 18, padding: 14, borderRadius: 14,
                background: `${C.yellow}14`, border: `1px solid ${C.yellow}55`,
              }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.8 }}>
                  سيصل هذا الإشعار إلى <b style={{ color: C.yellow }}>{stats?.total ?? 0}</b> سائقاً
                  ولا يمكن سحبه بعد الإرسال. متأكّد؟
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={send}
                    disabled={sending}
                    style={{
                      flex: 1, padding: '11px', borderRadius: 12, background: C.accent,
                      color: '#0A2018', border: 'none', fontWeight: 900, fontSize: 13.5,
                      cursor: sending ? 'wait' : 'pointer',
                    }}
                  >
                    {sending ? 'جارٍ الإرسال…' : 'نعم، أرسل الآن'}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={sending}
                    style={{
                      padding: '11px 18px', borderRadius: 12, background: 'transparent',
                      color: C.muted, border: `1px solid ${C.border}`, fontSize: 13.5, cursor: 'pointer',
                    }}
                  >
                    تراجع
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ============ المعاينة والسجلّ ============ */}
          <aside style={{ display: 'grid', gap: 16, alignContent: 'start' }}>

            {/* كيف يبدو على الهاتف */}
            <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <IoPhonePortraitOutline size={15} color={C.muted} />
                كما سيراه السائق
              </h2>
              <div style={{
                background: '#1C1C1E', borderRadius: 14, padding: 12,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, background: C.accent,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <IoNotifications size={15} color="#0A2018" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#8E8E93', marginBottom: 2 }}>شام ستورز • الآن</div>
                  <div style={{
                    fontSize: 13, fontWeight: 800, color: '#fff',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {title || 'عنوان الإشعار'}
                  </div>
                  <div style={{
                    fontSize: 12, color: '#C7C7CC', lineHeight: 1.55,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {body || 'نصّ الإشعار يظهر هنا…'}
                  </div>
                </div>
              </div>
            </section>

            {/* أرقام الجمهور */}
            <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 12px' }}>الجمهور</h2>

              {statsLoading ? (
                <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>جارٍ الحساب…</p>
              ) : !stats ? (
                <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>
                  {audience === 'drivers_business' ? 'اختر نشاطاً لرؤية العدد' : 'تعذّر حساب الجمهور'}
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <Stat label="في الجمهور" value={stats.total} color={C.text} />
                  <Stat label="يصلهم إشعار الهاتف" value={stats.reachable} color={C.green} />
                  {stats.withoutToken > 0 && (
                    <>
                      <Stat label="بلا رمز إشعارات" value={stats.withoutToken} color={C.yellow} />
                      {/* رقمٌ يقول الحقيقة: هؤلاء لن يوقَظ هاتفهم، وسيرون
                          الرسالة حين يفتحون التطبيق لا قبل */}
                      <p style={{ fontSize: 11.5, color: C.muted, margin: 0, lineHeight: 1.7 }}>
                        لم يفتحوا التطبيق بعد التحديث، أو رفضوا إذن الإشعارات.
                        سيرون الرسالة داخل التطبيق عند فتحه.
                      </p>
                    </>
                  )}
                  {selectedBusiness && (
                    <p style={{ fontSize: 11.5, color: C.muted, margin: 0 }}>
                      النشاط: {selectedBusiness.name}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* السجلّ */}
            <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>آخر ما أُرسل</h2>
                <button
                  onClick={loadHistory}
                  style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}
                  title="تحديث"
                >
                  <IoRefresh size={15} />
                </button>
              </div>

              {history.length === 0 ? (
                <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>لم يُرسل شيء بعد.</p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {history.slice(0, 8).map((row) => (
                    <div key={row.broadcastId} style={{
                      background: C.surf, borderRadius: 12, padding: '10px 12px',
                    }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 3 }}>{row.title}</div>
                      <div style={{
                        fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginBottom: 6,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {row.message}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.muted, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IoPeople size={11} /> {row.recipients}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: row.readCount > 0 ? C.green : C.muted }}>
                          <IoCheckmarkCircle size={11} /> قرأها {row.readCount}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IoTime size={11} />
                          {row.sentAt ? new Date(row.sentAt).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' }) : ''}
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
        @media (max-width: 900px) {
          .apn-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
    <span style={{ fontSize: 12.5, color: '#9DC4AC' }}>{label}</span>
    <span style={{ fontSize: 19, fontWeight: 900, color }}>{value}</span>
  </div>
);

export default AdminPushNotifications;
