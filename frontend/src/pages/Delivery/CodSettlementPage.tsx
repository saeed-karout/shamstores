// frontend/src/pages/Delivery/CodSettlementPage.tsx
//
// «تسوية التحصيل» — ما في ذمّة كلّ مندوب من مبالغ الدفع عند الاستلام.
//
// **سؤال التاجر كلّ مساء:** «كم مع أبو محمد؟». كان الجواب ورقةً في الدرج
// وذاكرةَ الطرفين. هنا: كم حصّل، كم سلّم، كم بقي — وسجلٌّ بالتواريخ يُحسم
// به أيّ خلاف. والتسليم الجزئيّ مسموح: المندوب يسلّم ما معه اليوم ويكمل غداً.
//
// للمالك وحده كالقسم المالي، وفي خطة «النموّ» فما فوق.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IoCashOutline,
  IoDownloadOutline,
  IoChevronDown,
  IoChevronUp,
  IoCarOutline,
  IoPersonOutline,
  IoReturnDownBackOutline,
  IoLockClosedOutline,
  IoInformationCircleOutline
} from 'react-icons/io5';
import api from '@/services/api';
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';

interface CourierRow {
  courierKey: string;
  courierName: string;
  courierType: 'driver' | 'courier';
  collected: number;
  handedOver: number;
  outstanding: number;
  ordersCount: number;
  lastCollectedAt: string | null;
  lastHandoverAt: string | null;
}

interface PendingOrder {
  id: string;
  orderNumber: string;
  customerName: string | null;
  total: number;
  status: string;
  createdAt: string;
  driverName: string | null;
}

const C = {
  accent: '#084835',
  text: '#10231B',
  muted: '#5F736A',
  surf: '#F1F5F2',
  card: '#FFFFFF',
  border: 'rgba(8,72,53,0.15)',
  warn: '#B45309',
  red: '#B42318'
};

const money = (n: number) => formatPrice(Number(n) || 0, DEFAULT_CURRENCY);
const dateText = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('ar-SY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const CodSettlementPage: React.FC = () => {
  const { pathname } = useLocation();
  const plansPath = pathname.startsWith('/store') ? '/store/plans' : '/plans';

  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [couriers, setCouriers] = useState<CourierRow[]>([]);
  const [totals, setTotals] = useState({ collected: 0, handedOver: 0, outstanding: 0 });
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [summary, pend]: any = await Promise.all([api.get('/cod/summary'), api.get('/cod/pending-orders')]);
      setCouriers(summary?.couriers || []);
      setTotals(summary?.totals || { collected: 0, handedOver: 0, outstanding: 0 });
      setPending(Array.isArray(pend) ? pend : []);
      setLocked(false);
    } catch (error: any) {
      if (error?.response?.status === 403) setLocked(true);
      else toast.error(error?.response?.data?.error || 'تعذّر جلب التسوية');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    try {
      const blob = await api.downloadBlob('/cod/export.csv');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cod-settlement-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('تعذّر التصدير');
    }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: C.muted }}>جارٍ التحميل…</div>;

  if (locked) {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, textAlign: 'center', padding: 28 }}>
          <IoLockClosedOutline size={30} color={C.accent} />
          <h2 style={{ ...s.h1, marginTop: 10 }}>تسوية التحصيل مع المندوبين</h2>
          <p style={s.lede}>
            اعرف كم حصّل كلّ مندوب نقداً، وكم سلّمك، وكم بقي في ذمّته — مع سجلٍّ بالتواريخ وتصدير لملف Excel.
            متاحة في خطة «النموّ» فما فوق.
          </p>
          <Link to={plansPath} style={{ ...s.primary, display: 'inline-flex', marginTop: 12, textDecoration: 'none' }}>
            عرض الخطط
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1 style={s.h1}>
            <IoCashOutline size={20} style={{ verticalAlign: -3, marginLeft: 6 }} />
            تسوية التحصيل
          </h1>
          <p style={s.lede}>ما قبضه كلّ مندوب نقداً عند التسليم، وما سلّمه لك، وما بقي في ذمّته.</p>
        </div>
        <button type="button" onClick={exportCsv} style={s.ghost} disabled={couriers.length === 0}>
          <IoDownloadOutline size={16} /> تصدير CSV
        </button>
      </header>

      <div style={s.stats}>
        <Stat label="المحصَّل" value={money(totals.collected)} />
        <Stat label="المسلَّم لك" value={money(totals.handedOver)} />
        <Stat label="في ذمّة المندوبين" value={money(totals.outstanding)} strong={totals.outstanding > 0} />
      </div>

      {couriers.length === 0 ? (
        <div style={{ ...s.card, color: C.muted, fontSize: 13, lineHeight: 1.9 }}>
          لا تحصيل مسجَّل بعد. يُسجَّل تلقائياً حين يؤكّد السائق قبض المبلغ من تطبيقه، أو تسجّله أنت من تفاصيل
          الطلب أو من قائمة «بانتظار التسجيل» أدناه لمندوبك الخاص.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {couriers.map((c) => (
            <CourierCard
              key={c.courierKey}
              row={c}
              open={openKey === c.courierKey}
              onToggle={() => setOpenKey((k) => (k === c.courierKey ? null : c.courierKey))}
              onChanged={load}
            />
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <section style={{ marginTop: 8 }}>
          <h2 style={s.h2}>بانتظار التسجيل ({pending.length})</h2>
          <p style={{ ...s.lede, marginTop: 0 }}>
            طلبات نقدٍ خرجت للتوصيل ولم يُسجَّل من قبض ثمنها — آخر ستين يوماً.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pending.map((o) => (
              <PendingRow key={o.id} order={o} onDone={load} />
            ))}
          </div>
        </section>
      )}

      <div style={s.note}>
        <IoInformationCircleOutline size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          المتبقّي = كلّ ما حُصّل − كلّ ما سُلّم، بلا حدٍّ زمنيّ: مبلغٌ حُصّل الشهر الماضي ولم يُسلَّم يبقى ظاهراً
          حتى يُسلَّم. والتسليم الخاطئ يُلغى ويبقى في السجلّ مشطوباً.
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div style={{ ...s.card, padding: 14 }}>
    <div style={{ fontSize: 12, color: C.muted }}>{label}</div>
    <div style={{ fontSize: 19, fontWeight: 800, color: strong ? C.warn : C.text, marginTop: 4 }} className="num">
      {value}
    </div>
  </div>
);

const CourierCard: React.FC<{ row: CourierRow; open: boolean; onToggle: () => void; onChanged: () => void }> = ({
  row,
  open,
  onToggle,
  onChanged
}) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [ledger, setLedger] = useState<any>(null);

  const loadLedger = useCallback(async () => {
    try {
      setLedger(await api.get(`/cod/couriers/${encodeURIComponent(row.courierKey)}/ledger`));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر جلب السجلّ');
    }
  }, [row.courierKey]);

  useEffect(() => {
    if (open) {
      loadLedger();
      setAmount(row.outstanding > 0 ? String(row.outstanding) : '');
    }
  }, [open, loadLedger, row.outstanding]);

  const handover = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error('اكتب المبلغ المسلَّم');
      return;
    }
    setSaving(true);
    try {
      await api.post('/cod/handovers', { courierKey: row.courierKey, amount: value, note: note.trim() || undefined });
      toast.success(`سُجّل تسليم ${money(value)} من ${row.courierName}`);
      setNote('');
      onChanged();
      loadLedger();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر التسجيل');
    } finally {
      setSaving(false);
    }
  };

  const voidHandover = async (id: string) => {
    if (!window.confirm('إلغاء هذا التسليم؟ يعود المبلغ إلى ذمّة المندوب ويبقى السطر مشطوباً في السجلّ.')) return;
    try {
      await api.post(`/cod/handovers/${id}/void`);
      toast.success('أُلغي التسليم');
      onChanged();
      loadLedger();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر الإلغاء');
    }
  };

  // السجلّ مدموجاً بالتاريخ: تحصيلٌ ثمّ تسليم كما جرى فعلاً
  const events = useMemo(() => {
    if (!ledger) return [];
    return [
      ...(ledger.collections || []).map((c: any) => ({ kind: 'in' as const, at: c.collectedAt, row: c })),
      ...(ledger.handovers || []).map((h: any) => ({ kind: 'out' as const, at: h.createdAt, row: h }))
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [ledger]);

  return (
    <div style={s.card}>
      <button type="button" onClick={onToggle} style={s.rowBtn} aria-expanded={open}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 160px' }}>
          {row.courierType === 'driver' ? <IoCarOutline size={17} color={C.accent} /> : <IoPersonOutline size={17} color={C.accent} />}
          <span style={{ fontWeight: 800, color: C.text, fontSize: 14.5 }}>{row.courierName}</span>
          <span style={s.badge}>{row.courierType === 'driver' ? 'سائق' : 'مندوب خاص'}</span>
        </span>
        <span style={s.nums}>
          <Num label="حصّل" value={row.collected} sub={`${row.ordersCount} طلب`} />
          <Num label="سلّم" value={row.handedOver} />
          <Num label="بقي" value={row.outstanding} warn={row.outstanding > 0} />
        </span>
        {open ? <IoChevronUp size={16} color={C.muted} /> : <IoChevronDown size={16} color={C.muted} />}
      </button>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {row.outstanding > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
              <label style={s.field}>
                <span style={s.label}>المبلغ المسلَّم الآن (جزئيّ مسموح)</span>
                <input type="number" min={0} max={row.outstanding} value={amount} onChange={(e) => setAmount(e.target.value)} style={s.input} />
              </label>
              <label style={{ ...s.field, flex: '2 1 180px' }}>
                <span style={s.label}>ملاحظة</span>
                <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" style={s.input} />
              </label>
              <button type="button" onClick={handover} disabled={saving} style={s.primary}>
                {saving ? '…' : 'تسجيل التسليم'}
              </button>
            </div>
          )}

          {!ledger ? (
            <div style={{ color: C.muted, fontSize: 12.5 }}>جارٍ تحميل السجلّ…</div>
          ) : events.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12.5 }}>لا حركات.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {events.map((e) => {
                const voided = e.kind === 'out' && e.row.voidedAt;
                return (
                  <div key={`${e.kind}-${e.row.id}`} style={{ ...s.event, opacity: voided ? 0.5 : 1 }}>
                    <span style={{ color: C.muted, fontSize: 11.5, minWidth: 92 }}>{dateText(e.at)}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: C.text }}>
                      {e.kind === 'in' ? (
                        <>
                          تحصيل طلب <b className="num">#{e.row.orderNumber || '—'}</b>
                          {e.row.customerName ? ` · ${e.row.customerName}` : ''}
                          {e.row.expectedAmount != null && Math.abs(e.row.amount - e.row.expectedAmount) >= 1 && (
                            <span style={{ color: C.warn }}> · الإجمالي {money(e.row.expectedAmount)}</span>
                          )}
                        </>
                      ) : (
                        <span style={{ textDecoration: voided ? 'line-through' : 'none' }}>
                          تسليم للمحلّ{e.row.note ? ` · ${e.row.note}` : ''}
                        </span>
                      )}
                    </span>
                    <b className="num" style={{ color: e.kind === 'in' ? C.text : C.accent, fontSize: 13 }}>
                      {e.kind === 'in' ? '+' : '−'}
                      {money(e.row.amount)}
                    </b>
                    {e.kind === 'out' && !voided && (
                      <button type="button" onClick={() => voidHandover(e.row.id)} style={s.iconBtn} title="إلغاء التسليم">
                        <IoReturnDownBackOutline size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Num: React.FC<{ label: string; value: number; sub?: string; warn?: boolean }> = ({ label, value, sub, warn }) => (
  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 84 }}>
    <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
    <b className="num" style={{ fontSize: 13.5, color: warn ? C.warn : C.text }}>
      {money(value)}
    </b>
    {sub && <span style={{ fontSize: 10.5, color: C.muted }}>{sub}</span>}
  </span>
);

const PendingRow: React.FC<{ order: PendingOrder; onDone: () => void }> = ({ order, onDone }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(String(order.total));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() && !order.driverName) {
      toast.error('اكتب اسم المندوب');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/cod/orders/${order.id}/collection`, {
        courierName: name.trim() || undefined,
        amount: Number(amount)
      });
      toast.success(`سُجّل تحصيل الطلب #${order.orderNumber}`);
      onDone();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر التسجيل');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...s.card, padding: 11, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ flex: '1 1 150px', fontSize: 12.5, color: C.text, minWidth: 0 }}>
        <b className="num">#{order.orderNumber}</b> · {order.customerName || 'زبون'}
        <span style={{ color: C.muted }}> · {dateText(order.createdAt)}</span>
      </span>
      <input
        value={name}
        maxLength={100}
        onChange={(e) => setName(e.target.value)}
        placeholder={order.driverName ? `السائق: ${order.driverName}` : 'اسم المندوب'}
        style={{ ...s.input, flex: '1 1 130px', width: 'auto' }}
      />
      <input
        type="number"
        min={0}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        aria-label="المبلغ المحصَّل"
        style={{ ...s.input, flex: '0 1 120px', width: 'auto' }}
      />
      <button type="button" onClick={save} disabled={saving} style={s.primary}>
        {saving ? '…' : 'تسجيل'}
      </button>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: { padding: 16, maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 },
  h1: { fontSize: 20, fontWeight: 800, margin: 0, color: C.text },
  h2: { fontSize: 15.5, fontWeight: 800, margin: '0 0 4px', color: C.text },
  lede: { fontSize: 13.5, color: C.muted, margin: '6px 0 0', lineHeight: 1.7 },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 9 },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 13 },
  rowBtn: {
    width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, background: 'none',
    border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start'
  },
  nums: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  badge: { background: 'rgba(8,72,53,0.1)', color: C.accent, borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 700 },
  field: { display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 140px', minWidth: 0 },
  label: { fontSize: 11.5, color: C.muted },
  input: {
    background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 11px',
    fontSize: 13.5, fontFamily: 'inherit', color: C.text, width: '100%', minWidth: 0
  },
  event: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px dashed ${C.border}`, flexWrap: 'wrap' },
  iconBtn: {
    background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, width: 30, height: 30,
    display: 'grid', placeItems: 'center', color: C.red, cursor: 'pointer'
  },
  primary: {
    alignItems: 'center', gap: 6, background: C.accent, color: '#FFFFFF', border: 'none', borderRadius: 10,
    padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit'
  },
  ghost: {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: C.card, color: C.accent,
    border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit'
  },
  note: {
    display: 'flex', gap: 9, fontSize: 12.5, color: C.muted, lineHeight: 1.9, padding: '12px 14px',
    background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.22)', borderRadius: 14
  }
};

export default CodSettlementPage;
