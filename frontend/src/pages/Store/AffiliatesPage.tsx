// frontend/src/pages/Store/AffiliatesPage.tsx
//
// المسوّقون بالعمولة.
//
// **العمولة مالٌ حقيقي، فالأرقام تُفصَّل لا تُجمَع.** «مستحقّ» و«مدفوع»
// و«معلّق» ثلاثة أرقام مختلفة: المعلّق طلبٌ لم يكتمل بعد وقد يُلغى، ودمجُه
// مع المستحقّ يجعل التاجر يدفع عمولةً على بيعةٍ لم تتمّ.
//
// **والرابط ينُسخ بضغطة**: المسوّق يستلمه على واتساب، وكتابته يدوياً تعني
// رمزاً يُخطَأ فيه وبيعةً لا تُسنَد لأحد.

import React, { useCallback, useEffect, useState } from 'react';
import {
  IoPeople, IoAdd, IoCopy, IoCheckmark, IoWallet, IoCart,
  IoEye, IoCash, IoClose, IoLockClosed, IoSparkles, IoChevronDown, IoChevronBack
} from 'react-icons/io5';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import Loader from '@/components/common/Loader';
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  warn: '#FB923C', green: '#4ADE80', red: '#FF6B6B'
};

interface Stats {
  orders: number; approved: number; pending: number; cancelled: number;
  sales: number; commissionEarned: number; commissionPaid: number; commissionDue: number;
}

interface Affiliate {
  id: string; name: string; phone: string | null; code: string;
  commissionRate: number; isActive: boolean; clicks: number;
  link: string; stats: Stats;
}

interface Summary {
  count: number; active: number; sales: number;
  commissionDue: number; commissionPaid: number; orders: number;
}

interface Referral {
  id: string; baseAmount: number; commission: number; commissionRate: number;
  status: string; createdAt: string;
  order: { orderNumber: string; total: number; status: string } | null;
}

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'معلّقة', color: C.warn },
  approved: { label: 'مستحقّة', color: C.green },
  paid: { label: 'مدفوعة', color: C.muted },
  cancelled: { label: 'ملغاة', color: C.red }
};

const money = (n: number) => formatPrice(n, DEFAULT_CURRENCY);

const AffiliatesPage: React.FC = () => {
  const [rows, setRows] = useState<Affiliate[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', commissionRate: '5' });
  const [copied, setCopied] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Record<string, Referral[]>>({});

  const load = useCallback(async () => {
    try {
      const data: any = await api.get('/affiliate');
      setRows(data?.affiliates || []);
      setSummary(data?.summary || null);
      setLocked(false);
    } catch (e: any) {
      if (e?.response?.status === 403) setLocked(true);
      else toast.error('تعذّر تحميل المسوّقين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copy = async (affiliate: Affiliate) => {
    try {
      await navigator.clipboard.writeText(affiliate.link);
      setCopied(affiliate.id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error('تعذّر النسخ — انسخ الرابط يدوياً');
    }
  };

  const create = async () => {
    try {
      await api.post('/affiliate', {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        commissionRate: Number(form.commissionRate)
      });
      toast.success('أُضيف المسوّق');
      setForm({ name: '', phone: '', commissionRate: '5' });
      setAdding(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر الإضافة');
    }
  };

  const toggleOpen = async (affiliate: Affiliate) => {
    if (openId === affiliate.id) { setOpenId(null); return; }
    setOpenId(affiliate.id);
    if (referrals[affiliate.id]) return;
    try {
      const data: any = await api.get(`/affiliate/${affiliate.id}/referrals`);
      setReferrals((prev) => ({ ...prev, [affiliate.id]: Array.isArray(data) ? data : [] }));
    } catch {
      toast.error('تعذّر جلب الإحالات');
    }
  };

  const pay = async (affiliate: Affiliate) => {
    try {
      const data: any = await api.post(`/affiliate/${affiliate.id}/pay`, {});
      toast.success(`سُجّل دفع ${money(data?.amount ?? 0)}`);
      setReferrals((prev) => { const next = { ...prev }; delete next[affiliate.id]; return next; });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر تسجيل الدفع');
    }
  };

  if (loading) return <Loader />;

  if (locked) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', color: C.text, display: 'grid', placeItems: 'center', padding: 24 }} dir="rtl">
        <div style={{ maxWidth: '30rem', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '32px 26px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 16px', background: `${C.accent}1A`, display: 'grid', placeItems: 'center' }}>
            <IoLockClosed size={26} color={C.accent} />
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 900 }}>المسوّقون بالعمولة — إضافة مدفوعة</h1>
          <p style={{ margin: '0 0 18px', fontSize: 13.5, color: C.muted, lineHeight: 1.9 }}>
            أعطِ كل مسوّق رابطاً خاصاً به، وتابع كم زيارة جلب وكم بيعة أتمّ وكم
            استحقّ — والعمولة تُحسب تلقائياً ولا تُستحقّ إلا باكتمال الطلب.
          </p>
          <Link to="/features" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            minHeight: 46, padding: '0 22px', borderRadius: 13, background: C.accent,
            color: '#0A2018', textDecoration: 'none', fontWeight: 900, fontSize: 14
          }}>
            <IoSparkles size={16} /> اطلب تفعيلها من الميزات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '20px 16px', color: C.text }} dir="rtl">
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>

        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>المسوّقون بالعمولة</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: C.muted }}>
              كل مسوّق برابطه، والعمولة تُحسب عند اكتمال الطلب
            </p>
          </div>
          <button
            onClick={() => setAdding(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 42,
              padding: '0 16px', borderRadius: 12, background: C.accent, color: '#0A2018',
              border: 'none', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            <IoAdd size={16} /> مسوّق جديد
          </button>
        </header>

        {summary && (
          <div style={{ display: 'grid', gap: 10, marginBottom: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <Stat icon={IoPeople} label="مسوّق" value={String(summary.count)} hint={`${summary.active} نشط`} />
            <Stat icon={IoCart} label="بيعات مكتملة" value={String(summary.orders)} hint={money(summary.sales)} />
            <Stat icon={IoWallet} label="عمولات مستحقّة" value={money(summary.commissionDue)} hint="لم تُدفع بعد" color={C.green} />
            <Stat icon={IoCash} label="عمولات مدفوعة" value={money(summary.commissionPaid)} hint="خرجت فعلاً" />
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '48px 22px', textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: 13.5, margin: 0, lineHeight: 1.9 }}>
              لا مسوّقين بعد. أضف واحداً وأعطه رابطه — كل بيعة تأتي منه تُسنَد إليه تلقائياً.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 9 }}>
            {rows.map((affiliate) => {
              const open = openId === affiliate.id;
              const list = referrals[affiliate.id];
              return (
                <div key={affiliate.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 15, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 190px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 800 }}>{affiliate.name}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: `${C.accent}1F`, color: C.accent, letterSpacing: '.05em'
                        }}>
                          {affiliate.code}
                        </span>
                        {!affiliate.isActive && (
                          <span style={{ fontSize: 10.5, color: C.red }}>موقوف</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>
                        عمولة {affiliate.commissionRate}% · {affiliate.clicks} زيارة
                        {affiliate.phone ? ` · ${affiliate.phone}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
                      <Mini label="مستحقّ" value={money(affiliate.stats.commissionDue)} color={C.green} />
                      <Mini label="معلّق" value={String(affiliate.stats.pending)} color={C.warn} />
                      <Mini label="بيعات" value={String(affiliate.stats.approved)} color={C.text} />
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <Icon onClick={() => copy(affiliate)} title="نسخ رابط المسوّق">
                        {copied === affiliate.id ? <IoCheckmark size={15} color={C.green} /> : <IoCopy size={15} />}
                      </Icon>
                      <Icon onClick={() => toggleOpen(affiliate)} title="الإحالات">
                        {open ? <IoChevronDown size={15} /> : <IoEye size={15} />}
                      </Icon>
                      {affiliate.stats.commissionDue > 0 && (
                        <button
                          onClick={() => pay(affiliate)}
                          style={{
                            minHeight: 34, padding: '0 12px', borderRadius: 10, cursor: 'pointer',
                            background: C.accent, color: '#0A2018', border: 'none',
                            fontSize: 12, fontWeight: 800, fontFamily: 'inherit', whiteSpace: 'nowrap'
                          }}
                        >
                          سجّل الدفع
                        </button>
                      )}
                    </div>
                  </div>

                  {open && (
                    <div style={{ borderTop: `1px solid ${C.border}`, background: C.surf, padding: '12px 16px' }}>
                      <div style={{
                        fontSize: 11.5, color: C.muted, marginBottom: 10, wordBreak: 'break-all',
                        background: C.card, borderRadius: 9, padding: '8px 10px'
                      }}>
                        {affiliate.link}
                      </div>

                      {!list ? (
                        <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>جارٍ التحميل…</p>
                      ) : list.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>لا إحالات بعد.</p>
                      ) : (
                        <div style={{ display: 'grid', gap: 6 }}>
                          {list.slice(0, 15).map((referral) => {
                            const meta = STATUS[referral.status] || { label: referral.status, color: C.muted };
                            return (
                              <div key={referral.id} style={{
                                display: 'flex', gap: 10, alignItems: 'baseline',
                                fontSize: 12, color: C.muted, flexWrap: 'wrap'
                              }}>
                                <span style={{ color: C.text, fontWeight: 700 }}>
                                  #{referral.order?.orderNumber || '—'}
                                </span>
                                <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                                <span style={{ flex: 1, minWidth: 60 }}>
                                  {money(referral.baseAmount)} × {referral.commissionRate}%
                                </span>
                                <span style={{ color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                                  {money(referral.commission)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {adding && (
        <div
          onClick={() => setAdding(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 900, display: 'grid', placeItems: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20, width: 'min(100%, 24rem)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <b style={{ flex: 1, fontSize: 15 }}>مسوّق جديد</b>
              <button onClick={() => setAdding(false)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}>
                <IoClose size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <Field label="الاسم" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="اسم المسوّق" />
              <Field label="الهاتف (اختياري)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="09xxxxxxxx" />
              <Field label="نسبة العمولة %" value={form.commissionRate} onChange={(v) => setForm({ ...form, commissionRate: v })} placeholder="5" type="number" />
            </div>

            <p style={{ fontSize: 11.5, color: C.muted, margin: '12px 0 0', lineHeight: 1.75 }}>
              يُولَّد رمزٌ فريد ورابطٌ جاهز للمشاركة. والنسبة تُجمَّد مع كل إحالة —
              تعديلها لاحقاً يسري على ما يأتي لا على ما مضى.
            </p>

            <button
              onClick={create}
              disabled={!form.name.trim()}
              style={{
                width: '100%', marginTop: 14, minHeight: 46, borderRadius: 12, border: 'none',
                background: form.name.trim() ? C.accent : C.surf,
                color: form.name.trim() ? '#0A2018' : C.muted,
                fontWeight: 900, fontSize: 14, fontFamily: 'inherit',
                cursor: form.name.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              إضافة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string; value: string; hint: string; color?: string;
}> = ({ icon: Icon2, label, value, hint, color }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '13px 15px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.muted, fontSize: 11.5 }}>
      <Icon2 size={13} color={color || C.muted} /> {label}
    </div>
    <div style={{ fontSize: 18, fontWeight: 900, marginTop: 5, color: color || C.text, fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </div>
    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{hint}</div>
  </div>
);

const Mini: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 13.5, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    <div style={{ fontSize: 10.5, color: C.muted }}>{label}</div>
  </div>
);

const Icon: React.FC<{ onClick: () => void; title: string; children: React.ReactNode }> = ({ onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
      background: C.surf, border: `1px solid ${C.border}`, color: C.text,
      display: 'grid', placeItems: 'center'
    }}
  >
    {children}
  </button>
);

const Field: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}> = ({ label, value, onChange, placeholder, type }) => (
  <label style={{ display: 'grid', gap: 5 }}>
    <span style={{ fontSize: 11.5, color: C.muted }}>{label}</span>
    <input
      type={type || 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: '11px 12px', borderRadius: 11, background: C.surf,
        border: `1px solid ${C.border}`, color: C.text, fontSize: 13.5, fontFamily: 'inherit'
      }}
    />
  </label>
);

export default AffiliatesPage;
