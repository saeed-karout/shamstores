// frontend/src/pages/FinancePage.tsx
//
// القسم المالي — سطرٌ لكل طلب بأرقامه، لا عدداً ومجموعاً.
//
// صفحة الإحصائيات تقول للتاجر «١٢٠ طلباً، ٤ ملايين مبيعات». وهو لا يسأل
// ذلك: يسأل كم ربح، وكم عاد إليه. ولا يجيبه رقمٌ واحد — يريد أن يفتح
// السطر ويرى من أين جاء الربح، أو أين ذهب.
//
// **الصفحة مشتركة بين المطعم والمتجر**: الحساب واحد والأعمدة واحدة، ونسخُها
// مرّتين يعني أن تصحيحاً في إحداهما لا يبلغ الأخرى.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IoWallet,
  IoTrendingUp,
  IoTrendingDown,
  IoCube,
  IoRefresh,
  IoArrowUndo,
  IoCalendar,
  IoInformationCircleOutline,
  IoCloseCircle,
  IoDownloadOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import api from '@/services/api';
import Loader from '@/components/common/Loader';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  yellow: '#F59E0B',
  blue: '#60A5FA',
  purple: '#A78BFA',
  green: '#4ADE80'
};

interface FinanceRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  isPaid: boolean;
  customerName: string | null;
  itemsCount: number;
  itemsTotal: number;
  total: number;
  cost: number;
  discount: number;
  deliveryFee: number;
  profit: number;
  returnAmount: number;
  returnedAt: string | null;
  net: number;
  costEstimated: boolean;
}

interface FinanceSummary {
  ordersCount: number;
  itemsTotal: number;
  revenue: number;
  cost: number;
  discount: number;
  deliveryFees: number;
  profit: number;
  returns: number;
  returnsCount: number;
  net: number;
  estimatedCostOrders: number;
}

interface FinanceResponse {
  businessType: 'restaurant' | 'store';
  range: { from: string; to: string };
  summary: FinanceSummary;
  summaryTruncated: boolean;
  orders: FinanceRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'قيد الانتظار',
  preparing: 'قيد التجهيز',
  ready: 'جاهز',
  delivering: 'قيد التوصيل',
  delivered: 'تم التوصيل',
  served: 'مكتمل',
  cancelled: 'ملغي'
};

const toInputDate = (date: Date): string => date.toISOString().slice(0, 10);

const startOfMonth = (): string => {
  const now = new Date();
  return toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
};

// ==================== بطاقة رقم ====================

const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  hint?: string;
}> = ({ label, value, icon, color, hint }) => (
  <div
    style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: 16,
      minWidth: 0
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: `${color}1F`,
          color,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0
        }}
      >
        {icon}
      </span>
      <span style={{ color: C.muted, fontSize: 12.5 }}>{label}</span>
    </div>
    <div
      style={{
        color,
        fontSize: 19,
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        wordBreak: 'break-word'
      }}
    >
      {value}
    </div>
    {hint && <div style={{ color: C.muted, fontSize: 11, marginTop: 5, lineHeight: 1.7 }}>{hint}</div>}
  </div>
);

// ==================== الصفحة ====================

const FinancePage: React.FC = () => {
  const [data, setData] = useState<FinanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(toInputDate(new Date()));
  const [page, setPage] = useState(1);
  const [onlyReturned, setOnlyReturned] = useState(false);

  const [returnTarget, setReturnTarget] = useState<FinanceRow | null>(null);
  const [returnAmount, setReturnAmount] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [savingReturn, setSavingReturn] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const result = await api.get<FinanceResponse>('/finance/orders', {
          from,
          to,
          page,
          limit: 50,
          ...(onlyReturned ? { onlyReturned: 'true' } : {})
        });
        setData(result);
      } catch {
        /* الرسالة تظهر عبر interceptor */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [from, to, page, onlyReturned]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const summary = data?.summary;

  // هامش الربح: النسبة أوضح من الرقم المطلق حين يقارن التاجر شهراً بشهر
  const margin = useMemo(() => {
    if (!summary || summary.revenue <= 0) return null;
    return Math.round((summary.profit / summary.revenue) * 1000) / 10;
  }, [summary]);

  const openReturn = (row: FinanceRow) => {
    setReturnTarget(row);
    setReturnAmount(String(row.total));
    setReturnReason('');
  };

  const submitReturn = async () => {
    if (!returnTarget) return;
    setSavingReturn(true);
    try {
      await api.post(`/finance/orders/${returnTarget.id}/return`, {
        amount: Number(returnAmount),
        reason: returnReason || undefined
      });
      toast.success('تم تسجيل المرتجع');
      setReturnTarget(null);
      await load(true);
    } catch {
      /* الرسالة تظهر عبر interceptor */
    } finally {
      setSavingReturn(false);
    }
  };

  const undoReturn = async (row: FinanceRow) => {
    if (!window.confirm(`إلغاء تسجيل المرتجع للطلب ${row.orderNumber}؟`)) return;
    try {
      await api.delete(`/finance/orders/${row.id}/return`);
      toast.success('تم إلغاء تسجيل المرتجع');
      await load(true);
    } catch {
      /* الرسالة تظهر عبر interceptor */
    }
  };

  /**
   * تصدير CSV.
   *
   * التاجر يريد الأرقام في جدوله ليضمّها إلى دفتره أو يرسلها لمحاسبه، ولا
   * ينسخها سطراً سطراً من الشاشة. و`﻿` في أوله يمنع Excel من قراءة
   * العربية رموزاً مبعثرة.
   */
  const exportCsv = () => {
    if (!data?.orders?.length) return;

    const headers = [
      'رقم الطلب',
      'التاريخ',
      'الزبون',
      'عدد الأصناف',
      'مبيعات الأصناف',
      'الخصم',
      'التوصيل',
      'الإجمالي',
      'التكلفة',
      'الربح',
      'المرتجع',
      'الصافي',
      'الحالة'
    ];

    const rows = data.orders.map((row) => [
      row.orderNumber,
      format(new Date(row.createdAt), 'yyyy-MM-dd HH:mm'),
      row.customerName || '',
      row.itemsCount,
      row.itemsTotal,
      row.discount,
      row.deliveryFee,
      row.total,
      row.cost,
      row.profit,
      row.returnAmount,
      row.net,
      STATUS_LABEL[row.status] || row.status
    ]);

    const csv =
      '﻿' +
      [headers, ...rows]
        .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loader fullScreen />;

  const fieldStyle: React.CSSProperties = {
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    padding: '9px 12px',
    fontSize: 13,
    fontFamily: 'Cairo, sans-serif',
    minHeight: 40,
    outline: 'none'
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 20, direction: 'rtl', color: C.text }}>
      {/* الترويسة */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>القسم المالي</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: '5px 0 0' }}>
            كل طلب بسعره وتكلفته وربحه ومرتجعه
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data?.orders?.length}
            style={{
              ...fieldStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: data?.orders?.length ? 'pointer' : 'not-allowed',
              opacity: data?.orders?.length ? 1 : 0.5,
              fontWeight: 700
            }}
          >
            <IoDownloadOutline size={16} /> تصدير CSV
          </button>
          <button
            type="button"
            onClick={() => load(false)}
            style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700 }}
          >
            <IoRefresh size={16} className={refreshing ? 'fin-spin' : undefined} /> تحديث
          </button>
        </div>
      </div>

      {/* المدى */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 14,
          marginBottom: 18,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <label style={{ display: 'block', color: C.muted, fontSize: 11.5, marginBottom: 6 }}>
            <IoCalendar size={12} style={{ verticalAlign: -1, marginInlineEnd: 4 }} /> من
          </label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} style={fieldStyle} />
        </div>
        <div>
          <label style={{ display: 'block', color: C.muted, fontSize: 11.5, marginBottom: 6 }}>إلى</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} style={fieldStyle} />
        </div>
        <button
          type="button"
          onClick={() => { setOnlyReturned((v) => !v); setPage(1); }}
          style={{
            ...fieldStyle,
            cursor: 'pointer',
            fontWeight: onlyReturned ? 800 : 600,
            borderColor: onlyReturned ? C.red : C.border,
            color: onlyReturned ? C.red : C.text,
            background: onlyReturned ? 'rgba(255,107,107,0.10)' : C.surf,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <IoArrowUndo size={15} /> المرتجعات فقط
        </button>
      </div>

      {/* الأرقام */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 12,
            marginBottom: 18
          }}
        >
          <StatCard
            label="المبيعات"
            value={formatPrice(summary.revenue, DEFAULT_CURRENCY)}
            icon={<IoWallet size={16} />}
            color={C.accent}
            hint={`${summary.ordersCount} طلباً`}
          />
          <StatCard
            label="تكلفة البضاعة"
            value={formatPrice(summary.cost, DEFAULT_CURRENCY)}
            icon={<IoCube size={16} />}
            color={C.blue}
            hint={
              summary.estimatedCostOrders > 0
                ? `${summary.estimatedCostOrders} طلباً بتكلفة تقديرية`
                : undefined
            }
          />
          <StatCard
            label="الربح"
            value={formatPrice(summary.profit, DEFAULT_CURRENCY)}
            icon={<IoTrendingUp size={16} />}
            color={summary.profit >= 0 ? C.green : C.red}
            hint={margin !== null ? `هامش ${margin}%` : undefined}
          />
          <StatCard
            label="المرتجعات"
            value={formatPrice(summary.returns, DEFAULT_CURRENCY)}
            icon={<IoTrendingDown size={16} />}
            color={C.red}
            hint={`${summary.returnsCount} طلباً`}
          />
          <StatCard
            label="الصافي بعد المرتجع"
            value={formatPrice(summary.net, DEFAULT_CURRENCY)}
            icon={<IoWallet size={16} />}
            color={C.purple}
          />
        </div>
      )}

      {/* تنبيه التقدير */}
      {summary && summary.estimatedCostOrders > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'flex-start',
            background: 'rgba(96,165,250,0.08)',
            border: '1px solid rgba(96,165,250,0.25)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 18,
            color: C.muted,
            fontSize: 12,
            lineHeight: 1.9
          }}
        >
          <IoInformationCircleOutline size={17} style={{ color: C.blue, flexShrink: 0, marginTop: 2 }} />
          <span>
            {summary.estimatedCostOrders} من الطلبات بلا تكلفة مسجّلة لحظة البيع، فحُسبت من سعر الشراء
            الحالي أو أُهملت. اضبط «سعر التكلفة» في صفحة المنتجات ليصبح الربح دقيقاً في الطلبات
            القادمة.
          </span>
        </div>
      )}

      {summary && data?.summaryTruncated && (
        <div style={{ color: C.yellow, fontSize: 12, marginBottom: 14 }}>
          المدى يتجاوز ٥٠٠٠ طلب — الملخّص محسوب على أحدث ٥٠٠٠. ضيّق المدى لرقم كامل.
        </div>
      )}

      {/* الجدول */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        {!data?.orders?.length ? (
          <div style={{ padding: '54px 20px', textAlign: 'center', color: C.muted, fontSize: 13.5, lineHeight: 1.9 }}>
            {onlyReturned ? 'لا مرتجعات في هذا المدى.' : 'لا طلبات في هذا المدى.'}
          </div>
        ) : (
          <>
            {/* بطاقات على الجوال — جدول بأحد عشر عموداً يُمرَّر أفقياً بلا فائدة */}
            <div className="show-mobile" style={{ flexDirection: 'column' }}>
              {data.orders.map((row) => (
                <div key={`m-${row.id}`} style={{ padding: 14, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                    <span style={{ color: C.accent, fontWeight: 800, fontSize: 13 }}>{row.orderNumber}</span>
                    <span style={{ color: C.muted, fontSize: 11 }}>
                      {format(new Date(row.createdAt), 'dd/MM/yyyy', { locale: ar })}
                    </span>
                  </div>
                  <div style={{ color: C.text, fontSize: 13, marginBottom: 8 }}>
                    {row.customerName || 'زبون'} · {row.itemsCount} صنف
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12.5 }}>
                    <Cell label="الإجمالي" value={formatPrice(row.total, DEFAULT_CURRENCY)} />
                    <Cell label="التكلفة" value={formatPrice(row.cost, DEFAULT_CURRENCY)} color={C.blue} />
                    <Cell
                      label="الربح"
                      value={formatPrice(row.profit, DEFAULT_CURRENCY)}
                      color={row.profit >= 0 ? C.green : C.red}
                    />
                    <Cell
                      label="المرتجع"
                      value={row.returnAmount ? formatPrice(row.returnAmount, DEFAULT_CURRENCY) : '—'}
                      color={row.returnAmount ? C.red : C.muted}
                    />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    {row.returnedAt ? (
                      <button type="button" onClick={() => undoReturn(row)} style={rowActionStyle(C.muted)}>
                        <IoCloseCircle size={14} /> إلغاء المرتجع
                      </button>
                    ) : (
                      <button type="button" onClick={() => openReturn(row)} style={rowActionStyle(C.red)}>
                        <IoArrowUndo size={14} /> تسجيل مرتجع
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hide-mobile" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: C.surf }}>
                    {['الطلب', 'التاريخ', 'الأصناف', 'مبيعات', 'خصم', 'توصيل', 'الإجمالي', 'التكلفة', 'الربح', 'مرتجع', 'الصافي', ''].map(
                      (head, index) => (
                        <th
                          key={index}
                          style={{
                            textAlign: index === 0 ? 'right' : 'left',
                            padding: '11px 12px',
                            color: C.muted,
                            fontWeight: 700,
                            borderBottom: `1px solid ${C.border}`
                          }}
                        >
                          {head}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((row) => (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ color: C.accent, fontWeight: 700 }}>{row.orderNumber}</div>
                        <div style={{ color: C.muted, fontSize: 11 }}>{row.customerName || 'زبون'}</div>
                      </td>
                      <td style={numCell(C.muted)}>
                        {format(new Date(row.createdAt), 'dd/MM/yyyy', { locale: ar })}
                      </td>
                      <td style={numCell(C.muted)}>{row.itemsCount}</td>
                      <td style={numCell(C.text)}>{formatPrice(row.itemsTotal, DEFAULT_CURRENCY)}</td>
                      <td style={numCell(row.discount ? C.yellow : C.muted)}>
                        {row.discount ? formatPrice(row.discount, DEFAULT_CURRENCY) : '—'}
                      </td>
                      <td style={numCell(C.muted)}>
                        {row.deliveryFee ? formatPrice(row.deliveryFee, DEFAULT_CURRENCY) : '—'}
                      </td>
                      <td style={{ ...numCell(C.text), fontWeight: 700 }}>
                        {formatPrice(row.total, DEFAULT_CURRENCY)}
                      </td>
                      <td style={numCell(C.blue)}>
                        {formatPrice(row.cost, DEFAULT_CURRENCY)}
                        {row.costEstimated && (
                          <span title="تكلفة تقديرية — لم تُسجَّل لحظة البيع" style={{ color: C.yellow, marginInlineStart: 4 }}>
                            *
                          </span>
                        )}
                      </td>
                      <td style={{ ...numCell(row.profit >= 0 ? C.green : C.red), fontWeight: 800 }}>
                        {formatPrice(row.profit, DEFAULT_CURRENCY)}
                      </td>
                      <td style={numCell(row.returnAmount ? C.red : C.muted)}>
                        {row.returnAmount ? formatPrice(row.returnAmount, DEFAULT_CURRENCY) : '—'}
                      </td>
                      <td style={{ ...numCell(C.purple), fontWeight: 700 }}>
                        {formatPrice(row.net, DEFAULT_CURRENCY)}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'left' }}>
                        {row.returnedAt ? (
                          <button type="button" onClick={() => undoReturn(row)} style={rowActionStyle(C.muted)}>
                            <IoCloseCircle size={14} /> إلغاء
                          </button>
                        ) : (
                          <button type="button" onClick={() => openReturn(row)} style={rowActionStyle(C.red)}>
                            <IoArrowUndo size={14} /> مرتجع
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* الصفحات */}
      {data && data.pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ ...fieldStyle, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
          >
            السابق
          </button>
          <span style={{ color: C.muted, fontSize: 13 }}>
            {page} / {data.pagination.pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
            disabled={page >= data.pagination.pages}
            style={{
              ...fieldStyle,
              cursor: page >= data.pagination.pages ? 'not-allowed' : 'pointer',
              opacity: page >= data.pagination.pages ? 0.5 : 1
            }}
          >
            التالي
          </button>
        </div>
      )}

      {/* تسجيل مرتجع */}
      <Modal isOpen={!!returnTarget} onClose={() => setReturnTarget(null)} title="تسجيل مرتجع">
        {returnTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.9 }}>
              الطلب <span style={{ color: C.accent, fontWeight: 700 }}>{returnTarget.orderNumber}</span> —
              إجماليه {formatPrice(returnTarget.total, DEFAULT_CURRENCY)}. المرتجع لا يُلغي الطلب: البضاعة
              سُلّمت ثم عادت.
            </div>

            <div>
              <label style={{ display: 'block', color: C.muted, fontSize: 12.5, marginBottom: 7 }}>
                المبلغ المُعاد
              </label>
              <input
                type="number"
                value={returnAmount}
                onChange={(e) => setReturnAmount(e.target.value)}
                min={0}
                max={returnTarget.total}
                style={{ ...fieldStyle, width: '100%', boxSizing: 'border-box' }}
              />
              <div style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>
                أقلّ من الإجمالي يعني مرتجعاً جزئياً.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: C.muted, fontSize: 12.5, marginBottom: 7 }}>
                السبب (اختياري)
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={3}
                style={{ ...fieldStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 9 }}>
              <Button variant="outline" onClick={() => setReturnTarget(null)} fullWidth>
                إلغاء
              </Button>
              <Button variant="primary" onClick={submitReturn} loading={savingReturn} fullWidth>
                تسجيل
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <style>{'.fin-spin{animation:fin-rot 0.8s linear infinite}@keyframes fin-rot{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
};

const numCell = (color: string): React.CSSProperties => ({
  padding: '11px 12px',
  textAlign: 'left',
  color,
  fontVariantNumeric: 'tabular-nums'
});

const rowActionStyle = (color: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '7px 11px',
  minHeight: 34,
  borderRadius: 9,
  border: `1px solid ${color}44`,
  background: `${color}14`,
  color,
  fontFamily: 'Cairo, sans-serif',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer'
});

const Cell: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div>
    <div style={{ color: C.muted, fontSize: 11 }}>{label}</div>
    <div style={{ color: color || C.text, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
);

export default FinancePage;
