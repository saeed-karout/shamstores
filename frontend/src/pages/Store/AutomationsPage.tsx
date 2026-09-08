// frontend/src/pages/Store/AutomationsPage.tsx
//
// الرسائل التلقائية — قواعد تنطلق وحدها.
//
// **الفرق عن صفحة الحملات:** الحملة تحتاج تاجراً يتذكّر ويكتب ويضغط. وهذه
// تعمل وهو نائم. لذلك التركيز هنا على الثقة لا على التحرير: كم أُرسل
// فعلاً، وكم زبوناً يمكن الوصول إليه أصلاً — لأن قاعدةً لا يعرف التاجر أنها
// تعمل هي قاعدةٌ يطفئها.

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  IoMailOutline,
  IoCartOutline,
  IoTimeOutline,
  IoPlayOutline,
  IoInformationCircleOutline,
  IoPeopleOutline
} from 'react-icons/io5';
import api from '@/services/api';

type RuleKey = 'lapsed' | 'abandonedCart';

interface RuleConfig {
  enabled: boolean;
  after: number;
  title: string;
  body: string;
}

type Settings = Record<RuleKey, RuleConfig>;

interface Stats {
  last30Days: Record<string, number>;
  pendingCarts: number;
  reachable: number;
}

const META: Record<RuleKey, {
  label: string;
  icon: React.ReactNode;
  unit: string;
  min: number;
  max: number;
  when: (n: number) => string;
  why: string;
}> = {
  abandonedCart: {
    label: 'سلّة متروكة',
    icon: <IoCartOutline size={19} />,
    unit: 'ساعة',
    min: 1,
    max: 72,
    when: (n) => `تُرسل بعد ${n} ساعة من ترك السلّة بلا إتمام`,
    why: 'الزبون وصل إلى الدفع وتردّد. التذكير في نفس اليوم يعيد جزءاً منهم.'
  },
  lapsed: {
    label: 'زبونٌ غاب',
    icon: <IoMailOutline size={19} />,
    unit: 'يوم',
    min: 7,
    max: 365,
    when: (n) => `تُرسل لمن لم يطلب منذ ${n} يوماً`,
    why: 'استعادة زبونٍ سابق أرخص من كسب زبونٍ جديد — وهو يعرف متجرك أصلاً.'
  }
};

const AutomationsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<RuleKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/automations');
      setSettings(data?.settings ?? null);
      setStats(data?.stats ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = (rule: RuleKey, changes: Partial<RuleConfig>) => {
    setSettings((prev) => (prev ? { ...prev, [rule]: { ...prev[rule], ...changes } } : prev));
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const data: any = await api.put('/automations', { settings });
      setSettings(data?.settings ?? settings);
      toast.success('حُفظت الإعدادات');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // التشغيل اليدوي موجودٌ لأن قاعدةً تعمل ليلاً لا سبيل للتأكّد منها إلا
  // بالانتظار إلى الغد — فيظنّها التاجر معطّلة ويطفئها
  const runNow = async (rule: RuleKey) => {
    setRunning(rule);
    try {
      const data: any = await api.post(`/automations/run/${rule}`);
      toast.success(data?.sent > 0 ? `أُرسلت ${data.sent} رسالة` : 'لا أحد ينطبق عليه الشرط الآن');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر التشغيل');
    } finally {
      setRunning(null);
    }
  };

  if (loading) {
    return <div style={s.center}>جارٍ التحميل…</div>;
  }

  if (!settings) {
    return <div style={s.center}>تعذّر تحميل الإعدادات — أعد المحاولة.</div>;
  }

  const noAudience = (stats?.reachable ?? 0) === 0;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <h1 style={s.h1}>الرسائل التلقائية</h1>
        <p style={s.lede}>
          قواعد تنطلق وحدها حين يتحقّق شرطها — بلا أن تفتح اللوحة.
        </p>
      </header>

      {/* الجمهور أوّلاً: قاعدةٌ مفعّلة بلا مشتركين لا ترسل شيئاً، وإخفاء
          ذلك يجعل التاجر يظنّ الميزة معطّلة */}
      <div style={{ ...s.card, ...(noAudience ? s.warn : {}) }}>
        <div style={s.row}>
          <IoPeopleOutline size={19} color={noAudience ? '#FB923C' : '#4ADE80'} />
          <div style={{ flex: 1 }}>
            <div style={s.cardTitle}>
              {noAudience ? 'لا أحد مشترك بعد' : `${stats?.reachable} زبوناً يمكن الوصول إليه`}
            </div>
            <div style={s.cardSub}>
              {noAudience
                ? 'الرسائل لا تصل إلا لمن أذِن. يظهر طلب الإذن لزبائنك في نافذة تتبّع الطلب وبعد تثبيت المتجر على هواتفهم.'
                : 'هؤلاء أذِنوا باستقبال رسائلك ولم يُلغوا.'}
            </div>
          </div>
        </div>
      </div>

      {(Object.keys(META) as RuleKey[]).map((rule) => {
        const config = settings[rule];
        const meta = META[rule];
        const sent = stats?.last30Days?.[rule] ?? 0;

        return (
          <div key={rule} style={s.card}>
            <div style={s.row}>
              <span style={{ color: config.enabled ? '#C8E235' : '#9DC4AC' }}>{meta.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={s.cardTitle}>{meta.label}</div>
                <div style={s.cardSub}>{meta.why}</div>
              </div>
              <label style={s.switch}>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => patch(rule, { enabled: e.target.checked })}
                  style={s.checkbox}
                />
              </label>
            </div>

            {config.enabled && (
              <div style={s.body}>
                <div style={s.field}>
                  <label style={s.label}>
                    <IoTimeOutline size={14} style={{ marginLeft: 5, verticalAlign: -2 }} />
                    التوقيت
                  </label>
                  <div style={s.inline}>
                    <input
                      type="number"
                      min={meta.min}
                      max={meta.max}
                      value={config.after}
                      onChange={(e) => patch(rule, { after: Number(e.target.value) })}
                      style={{ ...s.input, width: 90 }}
                    />
                    <span style={s.unit}>{meta.unit}</span>
                  </div>
                  <div style={s.hint}>{meta.when(config.after)}</div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>العنوان</label>
                  <input
                    type="text"
                    maxLength={80}
                    value={config.title}
                    onChange={(e) => patch(rule, { title: e.target.value })}
                    style={s.input}
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>النصّ</label>
                  <textarea
                    rows={3}
                    maxLength={400}
                    value={config.body}
                    onChange={(e) => patch(rule, { body: e.target.value })}
                    style={{ ...s.input, resize: 'vertical' }}
                  />
                </div>

                <div style={s.footer}>
                  <span style={s.sentCount}>
                    {sent > 0 ? `أُرسلت ${sent} رسالة خلال ٣٠ يوماً` : 'لم تُرسل رسائل بعد'}
                    {rule === 'abandonedCart' && (stats?.pendingCarts ?? 0) > 0 &&
                      ` · ${stats?.pendingCarts} سلّة بانتظار الشرط`}
                  </span>
                  <button
                    type="button"
                    onClick={() => runNow(rule)}
                    disabled={running === rule}
                    style={s.ghostBtn}
                  >
                    <IoPlayOutline size={14} style={{ marginLeft: 4, verticalAlign: -2 }} />
                    {running === rule ? 'جارٍ…' : 'شغّلها الآن'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div style={s.note}>
        <IoInformationCircleOutline size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          حدودٌ مفروضة لحمايتك ولحماية زبائنك: لا يُذكَّر الزبون نفسه بنفس
          القاعدة أكثر من مرّة كل بضعة أيام، ولا يتجاوز متجرك ٢٠٠ رسالة في
          اليوم. ومن ضغط «إيقاف الرسائل» لا يُعاد إلى القائمة أبداً.
        </div>
      </div>

      <button type="button" onClick={save} disabled={saving} style={s.saveBtn}>
        {saving ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}
      </button>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: { padding: 16, maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 },
  center: { padding: 48, textAlign: 'center', color: '#9DC4AC' },
  header: { marginBottom: 4 },
  h1: { fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text, #E8F5E9)' },
  lede: { fontSize: 13.5, color: '#9DC4AC', margin: '6px 0 0', lineHeight: 1.7 },
  card: {
    background: 'var(--card, #112E23)',
    border: '1px solid rgba(200,226,53,0.16)',
    borderRadius: 16,
    padding: 14
  },
  warn: { borderColor: 'rgba(251,146,60,0.4)', background: 'rgba(251,146,60,0.08)' },
  row: { display: 'flex', alignItems: 'flex-start', gap: 11 },
  cardTitle: { fontSize: 14.5, fontWeight: 700, color: 'var(--text, #E8F5E9)' },
  cardSub: { fontSize: 12.5, color: '#9DC4AC', marginTop: 4, lineHeight: 1.7 },
  switch: { position: 'relative', display: 'inline-flex', flexShrink: 0 },
  checkbox: { width: 42, height: 24, accentColor: '#C8E235', cursor: 'pointer' },
  body: { marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(200,226,53,0.12)', display: 'flex', flexDirection: 'column', gap: 13 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12.5, color: '#9DC4AC' },
  inline: { display: 'flex', alignItems: 'center', gap: 8 },
  unit: { fontSize: 13, color: '#9DC4AC' },
  input: {
    background: 'var(--surface, #0F3D31)',
    border: '1px solid rgba(200,226,53,0.16)',
    borderRadius: 11,
    padding: '11px 13px',
    color: 'var(--text, #E8F5E9)',
    fontSize: 14,
    fontFamily: 'inherit',
    width: '100%'
  },
  hint: { fontSize: 12, color: '#9DC4AC', opacity: 0.85 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  sentCount: { fontSize: 12, color: '#9DC4AC' },
  ghostBtn: {
    background: 'transparent',
    border: '1px solid rgba(200,226,53,0.35)',
    color: '#C8E235',
    borderRadius: 10,
    padding: '8px 13px',
    fontSize: 12.5,
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  note: {
    display: 'flex',
    gap: 9,
    fontSize: 12.5,
    color: '#9DC4AC',
    lineHeight: 1.8,
    padding: '12px 14px',
    background: 'rgba(96,165,250,0.08)',
    border: '1px solid rgba(96,165,250,0.22)',
    borderRadius: 14
  },
  saveBtn: {
    background: '#C8E235',
    color: '#0A2018',
    border: 'none',
    borderRadius: 13,
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'inherit'
  }
};

export default AutomationsPage;
