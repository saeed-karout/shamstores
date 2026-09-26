// frontend/src/components/orders/OrderCheckoutPanel.tsx
//
// إضافات إتمام الطلب في تفاصيل الطلب عند التاجر (المتجر والمطعم):
//
//   - واتساب للزبون: «أرسل التأكيد» و«أرسل رابط التتبّع» برسائل جاهزة، وللدافع
//     في طلب الهدية. روابط `wa.me` — الرقم السوريّ `09…` يُطبَّع إلى `9639…`.
//   - «معاينة قبل الدفع» إن كانت على الطلب.
//   - هدية مغترب: الدافع ورسالته، و«تم استلام الدفعة» ينقل الطلب إلى المسار العاديّ.
//   - العربون: «استُلم العربون»، وجدول أقساطٍ يضعه التاجر ويعلّم كل قسطٍ مدفوعاً.
//
// يُركَّب بسطرٍ واحد تحت أزرار الطباعة؛ ويجلب أقساطه بنفسه.

import React, { useEffect, useMemo, useState } from 'react';
import {
  IoLogoWhatsapp, IoEyeOutline, IoGiftOutline, IoWalletOutline, IoCheckmarkCircle,
  IoCalendarOutline, IoTrashOutline, IoAddCircleOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useBusinessSummary } from '@/hooks/useBusinessSummary';
import OrderPrintActions from '@/components/orders/OrderPrintActions';
import { formatPrice } from '@/utils/currency';
import { merchantConfirmMessage, merchantTrackMessage, trackUrlFor, waLink, toWaNumber } from '@/utils/whatsapp';

const C = {
  card: '#FFFFFF',
  surf: '#F1F5F2',
  accent: '#084835',
  text: '#10231B',
  muted: '#5F736A',
  border: 'rgba(8,72,53,0.15)',
  red: '#B42318',
  amber: '#B45309',
  green: '#0C7A55'
};

interface Installment {
  id: string;
  seq: number;
  dueDate: string;
  amount: number;
  paidAt: string | null;
}

interface Extras {
  inspectionAllowed?: boolean;
  isGift?: boolean;
  giftPayerName?: string | null;
  giftPayerPhone?: string | null;
  giftPayerEmail?: string | null;
  giftMessage?: string | null;
  giftHidePrices?: boolean;
  paymentStatus?: string | null;
  depositAmount?: number | null;
  depositPaidAt?: string | null;
  remainingAmount?: number | null;
  isPaid?: boolean;
  total?: number;
  installments?: Installment[];
  installmentsAllowed?: boolean;
  amountDueOnDelivery?: number;
}

interface Props {
  order: any;
  /** يرسم أزرار الطباعة فوق اللوحة بالطلب **بعد** تحديثات الدفع */
  withPrint?: boolean;
  /** يُستدعى بعد تغيير الدفع — لتحديث القائمة عند الأب إن شاء */
  onChanged?: () => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** جدولٌ مقترح: أقساطٌ متساوية شهرية، والفرق من التقريب على الأخير */
const suggestSchedule = (total: number, count: number, first: string) => {
  const base = Math.floor(total / count);
  const rows = [];
  const start = new Date(first || isoDay(new Date()));
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    rows.push({ dueDate: isoDay(d), amount: i === count - 1 ? round2(total - base * (count - 1)) : base });
  }
  return rows;
};

const OrderCheckoutPanel: React.FC<Props> = ({ order, onChanged, withPrint }) => {
  const { data: business } = useBusinessSummary();
  const currency = business?.currency || 'SYP';
  const money = (n: unknown) => formatPrice(Number(n) || 0, currency);

  const [extras, setExtras] = useState<Extras>(() => ({ ...order }));
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Array<{ dueDate: string; amount: number }> | null>(null);

  useEffect(() => {
    setExtras({ ...order });
    setDraft(null);
    let alive = true;
    api
      .get(`/checkout/orders/${order.id}`)
      .then((res: any) => alive && setExtras((prev) => ({ ...prev, ...(res?.data || res) })))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [order.id, order.updatedAt]);

  const trackUrl = trackUrlFor(order.id, business?.publicUrl);
  const items = useMemo(
    () =>
      (order.orderItems || order.items || []).map((it: any) => ({
        name: it.product?.name || it.menuItem?.name || it.name || 'صنف',
        quantity: it.quantity
      })),
    [order]
  );
  const customerWa = toWaNumber(order.customerPhone);
  const payerWa = toWaNumber(extras.giftPayerPhone);
  const hidePrices = !!extras.isGift && !!extras.giftHidePrices;

  const confirmText = merchantConfirmMessage(
    {
      orderNumber: order.orderNumber,
      items,
      total: order.total,
      customerName: order.customerName,
      trackUrl,
      businessName: business?.name,
      isGift: extras.isGift,
      giftPayerName: extras.giftPayerName,
      inspectionAllowed: extras.inspectionAllowed
    },
    currency,
    hidePrices
  );
  const trackText = merchantTrackMessage({ orderNumber: order.orderNumber, customerName: order.customerName, trackUrl });
  const payerText = `مرحباً ${extras.giftPayerName || ''}، بخصوص طلب الهدية رقم #${order.orderNumber} من ${business?.name || 'متجرنا'}.\nرابط المتابعة: ${trackUrl}`;

  const act = async (key: string, run: () => Promise<any>, ok: string): Promise<boolean> => {
    setBusy(key);
    try {
      const res: any = await run();
      const data = res?.data || res;
      if (data) setExtras((prev) => ({ ...prev, ...data }));
      toast.success(ok);
      onChanged?.();
      return true;
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'تعذّر الحفظ');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const deposit = Number(extras.depositAmount) || 0;
  const installments = extras.installments || [];
  const scheduleTarget = deposit > 0 ? Number(extras.remainingAmount) || 0 : Number(order.total) || 0;
  const draftSum = round2((draft || []).reduce((s, r) => s + (Number(r.amount) || 0), 0));

  const waBtn = (href: string, label: string, primary = false) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 38, padding: '0 14px', borderRadius: 10,
        textDecoration: 'none', fontSize: 13, fontWeight: 800,
        ...(primary ? { background: '#25D366', color: '#fff' } : { background: '#fff', color: '#128C4B', border: '1px solid #25D366' })
      }}
    >
      <IoLogoWhatsapp size={16} /> {label}
    </a>
  );

  const box: React.CSSProperties = { border: `1px solid ${C.border}`, background: C.surf, borderRadius: 12, padding: '12px 14px', fontSize: 13, color: C.text, lineHeight: 1.8 };
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800, marginBottom: 4 };
  const btn = (tone: 'primary' | 'ghost' = 'primary'): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, padding: '0 14px', borderRadius: 10,
    border: tone === 'primary' ? 'none' : `1px solid ${C.border}`, background: tone === 'primary' ? C.accent : '#fff',
    color: tone === 'primary' ? '#fff' : C.text, fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer'
  });
  const input: React.CSSProperties = { minHeight: 34, padding: '4px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: 'inherit', fontSize: 13, background: '#fff', color: C.text };

  return (
    <>
    {withPrint && <OrderPrintActions order={{ ...order, ...extras, id: order.id } as any} />}
    <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
      {/* واتساب */}
      {(customerWa || payerWa) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {customerWa && waBtn(waLink(order.customerPhone, confirmText), extras.isGift ? 'أرسل التأكيد للمستلم' : 'أرسل التأكيد للزبون', true)}
          {customerWa && waBtn(waLink(order.customerPhone, trackText), 'أرسل رابط التتبّع')}
          {payerWa && waBtn(waLink(extras.giftPayerPhone, payerText), 'راسل الدافع')}
        </div>
      )}

      {extras.inspectionAllowed && (
        <div style={{ ...box, display: 'flex', gap: 8, alignItems: 'center' }}>
          <IoEyeOutline size={17} style={{ color: C.accent }} />
          <span><b>معاينة قبل الدفع</b> — الزبون يفحص الطلب عند الاستلام قبل أن يدفع.</span>
        </div>
      )}

      {/* هدية مغترب */}
      {extras.isGift && (
        <div style={{ ...box, borderColor: extras.paymentStatus === 'awaiting_transfer' ? C.amber : C.border }}>
          <div style={head}>
            <IoGiftOutline size={17} style={{ color: C.accent }} /> طلب هدية من مغترب
            {extras.paymentStatus === 'awaiting_transfer' ? (
              <span style={{ color: C.amber, fontSize: 12 }}>· بانتظار التحويل</span>
            ) : (
              <span style={{ color: C.green, fontSize: 12 }}>· الدفعة مستلمة</span>
            )}
          </div>
          <div>
            الدافع: <b>{extras.giftPayerName}</b>{' '}
            <span dir="ltr" style={{ display: 'inline-block' }}>{extras.giftPayerPhone}</span>
            {extras.giftPayerEmail && <> · <span dir="ltr">{extras.giftPayerEmail}</span></>}
          </div>
          <div>المستلم: <b>{order.customerName}</b> <span dir="ltr" style={{ display: 'inline-block' }}>{order.customerPhone}</span></div>
          {extras.giftMessage && <div style={{ whiteSpace: 'pre-wrap' }}>رسالة الهدية: «{extras.giftMessage}»</div>}
          {extras.giftHidePrices && <div style={{ color: C.muted }}>طلب الدافع إخفاء الأسعار عن المستلم — الملصق وصفحة التتبّع بلا أسعار.</div>}
          {extras.paymentStatus === 'awaiting_transfer' && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: C.muted, marginBottom: 6 }}>لا يُجهَّز الطلب حتى تؤكّد وصول {money(order.total)}.</div>
              <button
                type="button"
                disabled={busy === 'gift'}
                style={btn()}
                onClick={() => {
                  if (!window.confirm(`تأكيد استلام ${money(order.total)} من ${extras.giftPayerName}؟`)) return;
                  act('gift', () => api.post(`/checkout/orders/${order.id}/confirm-payment`), 'تم تأكيد الدفعة — الطلب جاهز للتجهيز');
                }}
              >
                <IoCheckmarkCircle size={15} /> تم استلام الدفعة
              </button>
            </div>
          )}
        </div>
      )}

      {/* العربون */}
      {deposit > 0 && (
        <div style={{ ...box, borderColor: extras.depositPaidAt ? C.border : C.amber }}>
          <div style={head}>
            <IoWalletOutline size={17} style={{ color: C.accent }} /> عربون {money(deposit)}
            {extras.depositPaidAt ? (
              <span style={{ color: C.green, fontSize: 12 }}>· مستلم</span>
            ) : (
              <span style={{ color: C.amber, fontSize: 12 }}>· لم يُستلم بعد</span>
            )}
          </div>
          <div>المتبقّي: <b>{money(extras.remainingAmount)}</b></div>
          <button
            type="button"
            disabled={busy === 'deposit'}
            style={{ ...btn(extras.depositPaidAt ? 'ghost' : 'primary'), marginTop: 6 }}
            onClick={() =>
              act(
                'deposit',
                () => api.post(`/checkout/orders/${order.id}/deposit`, { paid: !extras.depositPaidAt }),
                extras.depositPaidAt ? 'أُلغي تسجيل العربون' : 'تم تسجيل استلام العربون'
              )
            }
          >
            {extras.depositPaidAt ? 'تراجع عن الاستلام' : <><IoCheckmarkCircle size={15} /> استُلم العربون</>}
          </button>
        </div>
      )}

      {/* الأقساط */}
      {/* الهدية مدفوعةٌ كاملةً مسبقاً — لا أقساط لها */}
      {extras.installmentsAllowed && !extras.isGift && order.status !== 'cancelled' && (
        <div style={box}>
          <div style={head}>
            <IoCalendarOutline size={17} style={{ color: C.accent }} /> الأقساط
          </div>
          {installments.length > 0 && !draft && (
            <div style={{ display: 'grid', gap: 6 }}>
              {installments.map((i) => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ minWidth: 70 }}>القسط {i.seq}</span>
                  <span dir="ltr">{String(i.dueDate).slice(0, 10)}</span>
                  <b>{money(i.amount)}</b>
                  <button
                    type="button"
                    disabled={busy === i.id}
                    style={btn(i.paidAt ? 'ghost' : 'primary')}
                    onClick={() =>
                      act(i.id, () => api.patch(`/checkout/orders/${order.id}/installments/${i.id}`, { paid: !i.paidAt }), i.paidAt ? 'أُلغي التسجيل' : 'تم تسجيل القسط مدفوعاً')
                    }
                  >
                    {i.paidAt ? `مدفوع ${String(i.paidAt).slice(0, 10)} — تراجع` : 'تم الدفع'}
                  </button>
                </div>
              ))}
              {!installments.some((i) => i.paidAt) && (
                <button type="button" style={{ ...btn('ghost'), justifySelf: 'start' }} onClick={() => setDraft(installments.map((i) => ({ dueDate: String(i.dueDate).slice(0, 10), amount: i.amount })))}>
                  تعديل الجدول
                </button>
              )}
            </div>
          )}
          {installments.length === 0 && !draft && (
            <div>
              <div style={{ color: C.muted, marginBottom: 6 }}>
                قسّط {money(scheduleTarget)} {deposit > 0 ? '(المتبقّي بعد العربون)' : ''} على دفعات يراها الزبون في صفحة التتبّع.
              </div>
              <button type="button" style={btn('ghost')} onClick={() => setDraft(suggestSchedule(scheduleTarget, 3, isoDay(new Date())))}>
                <IoAddCircleOutline size={15} /> ضع جدول أقساط
              </button>
            </div>
          )}
          {draft && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                عدد الأقساط
                <select
                  value={draft.length}
                  style={input}
                  onChange={(e) => setDraft(suggestSchedule(scheduleTarget, Number(e.target.value), draft[0]?.dueDate))}
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span style={{ color: C.muted, fontSize: 12 }}>شهرياً — عدّل التواريخ والمبالغ كما تشاء</span>
              </div>
              {draft.map((r, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ minWidth: 60 }}>القسط {idx + 1}</span>
                  <input type="date" value={r.dueDate} style={input} onChange={(e) => setDraft(draft.map((x, j) => (j === idx ? { ...x, dueDate: e.target.value } : x)))} />
                  <input
                    type="number"
                    min={0}
                    value={r.amount}
                    style={{ ...input, width: 130 }}
                    onChange={(e) => setDraft(draft.map((x, j) => (j === idx ? { ...x, amount: Number(e.target.value) } : x)))}
                  />
                  {draft.length > 1 && (
                    <button type="button" aria-label="حذف القسط" style={{ ...btn('ghost'), padding: '0 8px' }} onClick={() => setDraft(draft.filter((_, j) => j !== idx))}>
                      <IoTrashOutline size={14} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ color: Math.abs(draftSum - scheduleTarget) > 1 ? C.red : C.muted, fontSize: 12.5 }}>
                المجموع {money(draftSum)} من {money(scheduleTarget)}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={busy === 'schedule' || Math.abs(draftSum - scheduleTarget) > 1}
                  style={btn()}
                  onClick={() =>
                    act('schedule', () => api.put(`/checkout/orders/${order.id}/installments`, { installments: draft }), 'تم حفظ جدول الأقساط').then((done) =>
                      done && setDraft(null)
                    )
                  }
                >
                  حفظ الجدول
                </button>
                {installments.length > 0 && (
                  <button
                    type="button"
                    style={{ ...btn('ghost'), color: C.red }}
                    onClick={() =>
                      act('schedule', () => api.put(`/checkout/orders/${order.id}/installments`, { installments: [] }), 'حُذف جدول الأقساط').then((done) => done && setDraft(null))
                    }
                  >
                    حذف الجدول
                  </button>
                )}
                <button type="button" style={btn('ghost')} onClick={() => setDraft(null)}>
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default OrderCheckoutPanel;
