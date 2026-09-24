// frontend/src/components/orders/OrdersBoard.tsx
//
// أجزاء شاشة الطلبات المشتركة بين المطعم والمتجر: شريط الأدوات (بحث،
// تبويبات الحالة بأعدادها، الدفع) وصفّ الطلب في القائمة.
//
// كانت التصفية خلف زرّ «تصفية» يفتح لوحة — والتاجر في ذروة العمل يريد
// «الطلبات المنتظرة» بلمسةٍ واحدة. التبويبات الآن ظاهرة دائماً، والعدد
// بجانب كلٍّ منها يقول أين العمل قبل أن يفتحه.

import React from 'react';
import { IoArrowBack, IoCloseCircle, IoRefresh, IoSearch, IoTimeOutline } from 'react-icons/io5';
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';
import '@/styles/orders.css';

export type BoardTone = 'amber' | 'blue' | 'purple' | 'green' | 'gray' | 'red';

export interface BoardStatus {
  key: string;
  label: string;
  tone: BoardTone;
}

interface ToolbarProps {
  statuses: BoardStatus[];
  counts: Record<string, number>;
  total: number;
  status: string;
  onStatus: (key: string) => void;
  payment: 'all' | 'paid' | 'unpaid';
  onPayment: (key: 'all' | 'paid' | 'unpaid') => void;
  query: string;
  onQuery: (q: string) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  /** زرّ تصديرٍ أو غيره بجانب التحديث */
  extra?: React.ReactNode;
}

export const OrdersToolbar: React.FC<ToolbarProps> = ({
  statuses,
  counts,
  total,
  status,
  onStatus,
  payment,
  onPayment,
  query,
  onQuery,
  onRefresh,
  refreshing,
  extra
}) => (
  <div className="ob-toolbar">
    <div className="ob-row">
      <div className="ob-search-wrap">
        <label className="ob-search">
          <IoSearch size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="رقم الطلب، الاسم أو الهاتف"
            aria-label="بحث في الطلبات"
          />
          {query && (
            <button type="button" onClick={() => onQuery('')} aria-label="مسح البحث">
              <IoCloseCircle size={18} />
            </button>
          )}
        </label>
        <button type="button" className="ob-icon" onClick={onRefresh} aria-label="تحديث الطلبات" title="تحديث">
          <IoRefresh size={18} className={refreshing ? 'ob-spin' : ''} />
        </button>
      </div>
      <div className="ob-actions">
        <div className="ob-seg" role="group" aria-label="حالة الدفع">
          {(
            [
              ['all', 'الكل'],
              ['unpaid', 'غير مدفوع'],
              ['paid', 'مدفوع']
            ] as const
          ).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={payment === key} onClick={() => onPayment(key)}>
              {label}
            </button>
          ))}
        </div>
        {extra}
      </div>
    </div>

    <div className="ob-tabs" role="tablist" aria-label="حالة الطلب">
      <button type="button" role="tab" aria-selected={status === 'all'} className="ob-tab" onClick={() => onStatus('all')}>
        الكل <span>{total}</span>
      </button>
      {statuses.map((s) => (
        <button
          key={s.key}
          type="button"
          role="tab"
          aria-selected={status === s.key}
          className={`ob-tab tone-${s.tone} ${counts[s.key] ? 'has' : ''}`}
          onClick={() => onStatus(s.key)}
        >
          {s.label} <span>{counts[s.key] || 0}</span>
        </button>
      ))}
    </div>
  </div>
);

interface RowProps {
  number: string;
  customer: string;
  sub?: string;
  total: number;
  isPaid: boolean;
  createdAt: string;
  status: BoardStatus;
  selected: boolean;
  onSelect: () => void;
}

const clock = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins >= 0 && mins < 1) return 'الآن';
  if (mins >= 0 && mins < 60) return `قبل ${mins} د`;
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString('ar-SY', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('ar-SY', { day: 'numeric', month: 'short' });
};

export const OrderRow: React.FC<RowProps> = ({ number, customer, sub, total, isPaid, createdAt, status, selected, onSelect }) => (
  <button type="button" className={`ob-order ${selected ? 'is-selected' : ''} ${status.key === 'pending' ? 'is-new' : ''}`} onClick={onSelect} aria-pressed={selected}>
    <span className="ob-order-top">
      <b>{customer || 'زبون'}</b>
      <strong>{formatPrice(total, DEFAULT_CURRENCY)}</strong>
    </span>
    <span className="ob-order-meta">
      <bdi>#{number}</bdi>
      {sub && <span>· {sub}</span>}
      <span className="ob-order-time">
        <IoTimeOutline size={13} aria-hidden="true" />
        {clock(createdAt)}
      </span>
    </span>
    <span className="ob-order-tags">
      <span className={`ob-pill tone-${status.tone}`}>{status.label}</span>
      <span className={`ob-pill ${isPaid ? 'tone-green' : 'tone-gray'} is-soft`}>{isPaid ? 'مدفوع' : 'غير مدفوع'}</span>
    </span>
  </button>
);

export const OrdersEmpty: React.FC<{ filtered: boolean; onReset?: () => void }> = ({ filtered, onReset }) => (
  <div className="ob-empty">
    <b>{filtered ? 'لا طلبات تطابق التصفية' : 'لا طلبات بعد'}</b>
    <p>{filtered ? 'جرّب حالةً أخرى أو امسح البحث.' : 'سيظهر هنا كلّ طلبٍ لحظة وصوله — مع تنبيهٍ صوتيّ.'}</p>
    {filtered && onReset && (
      <button type="button" onClick={onReset}>
        عرض كلّ الطلبات
      </button>
    )}
  </div>
);

/** مطابقة البحث — الأرقام بلا مسافات، والأسماء بلا اعتبارٍ لحالة الأحرف */
export const matchesQuery = (q: string, ...fields: Array<string | null | undefined>) => {
  const needle = q.trim().toLowerCase().replace(/\s+/g, '');
  if (!needle) return true;
  return fields.some((f) => (f || '').toLowerCase().replace(/\s+/g, '').includes(needle));
};

/**
 * الخطوة التالية للطلب — زرٌّ أساسيّ واحد فوق شبكة الحالات.
 *
 * سبعة أزرارٍ متساوية تُجبر التاجر على التفكير في كلّ مرّة: «ماذا بعد
 * "قيد الانتظار"؟». الطلب يسير في خطٍّ معروف، فالخطوة التالية تُقترح
 * والشبكة تبقى للاستثناءات (إلغاء، تصحيح خطأ).
 */
export const nextStep = (status: string, kind: 'store' | 'restaurant', orderType?: string | null): { status: string; label: string } | null => {
  const delivery = kind === 'store' || orderType === 'delivery';
  switch (status) {
    case 'pending':
      return { status: 'preparing', label: kind === 'store' ? 'تأكيد الطلب وبدء التجهيز' : 'قبول الطلب وبدء التحضير' };
    case 'preparing':
      return { status: 'ready', label: 'الطلب جاهز' };
    case 'ready':
      return delivery ? { status: 'delivering', label: 'خرج للتوصيل' } : { status: 'served', label: orderType === 'takeaway' ? 'تم الاستلام' : 'تم التقديم' };
    case 'delivering':
      return { status: 'delivered', label: 'تم التوصيل' };
    default:
      return null;
  }
};

export const NextStepButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button type="button" className="ob-next" onClick={onClick}>
    {label}
    <IoArrowBack size={18} aria-hidden="true" />
  </button>
);
