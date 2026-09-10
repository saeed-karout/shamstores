// frontend/src/pages/Store/CustomersPage.tsx
//
// زبائن النشاط — تخدم المتجر والمطعم معاً (النشاط يُشتقّ من الرمز).
//
// **البيانات كانت كاملة والعرض غائباً:** كل طلب يحمل صاحبه، ومع ذلك لم يكن
// للتاجر سبيلٌ ليعرف من زبونه الأوفى ولا من انقطع عنه.
//
// **والترتيب افتراضياً بالإنفاق لا بالتاريخ:** الأحدث معلومة يعرفها التاجر
// من صفحة الطلبات؛ الأوفى هو ما لا يعرفه ولا يستطيع حسابه بنفسه.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IoPeople, IoRepeat, IoTimeOutline, IoWallet, IoSearch,
  IoChevronDown, IoChevronBack, IoCall, IoRefresh
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import Loader from '@/components/common/Loader';
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';
import { ExportButton } from '@/components/common/CsvTools';

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  warn: '#FB923C',
  blue: '#60A5FA'
};
/** لوحة أدوات CSV — نفس ألوان الشاشة باسمٍ يفهمه المكوّن المشترك */
const csvColors = {
  text: C.text,
  muted: C.muted,
  card: C.card,
  surface: C.surf,
  border: C.border,
  accent: C.accent,
  bg: C.bg
};


interface Customer {
  key: string;
  userId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  isGuest: boolean;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  firstOrderAt: string | null;
  isLapsed: boolean;
}

interface Summary {
  total: number;
  registered: number;
  guests: number;
  returning: number;
  lapsed: number;
  totalRevenue: number;
  averageOrderValue: number;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: { name: string; quantity: number; price: number }[];
}

type Filter = 'all' | 'returning' | 'lapsed' | 'guests';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'returning', label: 'عادوا أكثر من مرّة' },
  { key: 'lapsed', label: 'انقطعوا' },
  { key: 'guests', label: 'بلا حساب' }
];

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, OrderRow[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/customers');
      setCustomers(data?.customers || []);
      setSummary(data?.summary || null);
    } catch {
      toast.error('تعذّر تحميل الزبائن');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (customer: Customer) => {
    if (openKey === customer.key) { setOpenKey(null); return; }
    setOpenKey(customer.key);

    // تُجلب مرّةً وتُحفظ: فتحُ الصفّ وإغلاقه مراراً لا يعيد سؤال الخادم
    if (orders[customer.key]) return;
    try {
      const data: any = await api.get(`/customers/${encodeURIComponent(customer.key)}/orders`);
      setOrders((prev) => ({ ...prev, [customer.key]: Array.isArray(data) ? data : [] }));
    } catch {
      toast.error('تعذّر تحميل طلبات الزبون');
    }
  };

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (filter === 'returning' && customer.ordersCount < 2) return false;
      if (filter === 'lapsed' && !customer.isLapsed) return false;
      if (filter === 'guests' && !customer.isGuest) return false;
      if (!term) return true;
      return (
        customer.name.toLowerCase().includes(term) ||
        (customer.phone || '').includes(term) ||
        (customer.email || '').toLowerCase().includes(term)
      );
    });
  }, [customers, search, filter]);

  if (loading) return <Loader />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '20px 16px', color: C.text }} dir="rtl">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>الزبائن</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: C.muted }}>
              مرتّبون بالإنفاق — الأوفى أولاً
            </p>
          </div>
          <ExportButton path="/customers/export" filename="customers.csv" colors={csvColors} />
          <button
            onClick={load}
            title="تحديث"
            style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted,
                     borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}
          >
            <IoRefresh size={16} />
          </button>
        </header>

        {summary && (
          <div style={{
            display: 'grid', gap: 10, marginBottom: 18,
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'
          }}>
            <Stat icon={IoPeople} label="زبون" value={String(summary.total)} hint={`${summary.registered} بحساب`} />
            <Stat icon={IoRepeat} label="عادوا" value={String(summary.returning)} hint="طلبوا أكثر من مرّة" color={C.accent} />
            <Stat icon={IoTimeOutline} label="انقطعوا" value={String(summary.lapsed)} hint="بلا طلب منذ 60 يوماً" color={C.warn} />
            <Stat icon={IoWallet} label="متوسّط الطلب" value={formatPrice(summary.averageOrderValue, DEFAULT_CURRENCY)} hint={`الإجمالي ${formatPrice(summary.totalRevenue, DEFAULT_CURRENCY)}`} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <IoSearch
              size={15}
              color={C.muted}
              style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الهاتف…"
              style={{
                width: '100%', padding: '10px 34px 10px 12px', borderRadius: 11,
                background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 13
              }}
            />
          </div>

          {FILTERS.map((option) => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key)}
              style={{
                padding: '8px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                background: filter === option.key ? C.accent : 'transparent',
                color: filter === option.key ? '#0A2018' : C.muted,
                border: `1px solid ${filter === option.key ? C.accent : C.border}`
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: '48px 20px', textAlign: 'center', color: C.muted, fontSize: 13.5
          }}>
            {customers.length === 0
              ? 'لا زبائن بعد — ستظهر أسماؤهم هنا مع أول طلب.'
              : 'لا زبون يطابق هذا البحث.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {visible.map((customer) => {
              const open = openKey === customer.key;
              const rows = orders[customer.key];

              return (
                <div
                  key={customer.key}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}
                >
                  <button
                    onClick={() => toggle(customer)}
                    aria-expanded={open}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', background: 'transparent', border: 'none',
                      color: C.text, cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit'
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                      background: `${C.accent}1A`, color: C.accent,
                      display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 15
                    }}>
                      {customer.name.trim().charAt(0) || '؟'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 800 }}>{customer.name}</span>
                        {customer.isGuest && <Tag text="بلا حساب" color={C.blue} />}
                        {customer.isLapsed && <Tag text="انقطع" color={C.warn} />}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                        {customer.phone || 'بلا رقم'} · آخر طلب {formatDate(customer.lastOrderAt)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'end', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>
                        {formatPrice(customer.totalSpent, DEFAULT_CURRENCY)}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{customer.ordersCount} طلب</div>
                    </div>

                    {open ? <IoChevronDown size={15} color={C.muted} /> : <IoChevronBack size={15} color={C.muted} />}
                  </button>

                  {open && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 16px', background: C.surf }}>
                      {customer.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12,
                            fontSize: 12.5, color: C.accent, textDecoration: 'none'
                          }}
                        >
                          <IoCall size={13} /> اتّصل بـ{customer.phone}
                        </a>
                      )}

                      {!rows ? (
                        <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>جارٍ التحميل…</p>
                      ) : rows.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>لا طلبات.</p>
                      ) : (
                        <div style={{ display: 'grid', gap: 7 }}>
                          {rows.slice(0, 10).map((order) => (
                            <div
                              key={order.id}
                              style={{
                                display: 'flex', alignItems: 'baseline', gap: 10,
                                fontSize: 12.5, color: C.muted, flexWrap: 'wrap'
                              }}
                            >
                              <span style={{ color: C.text, fontWeight: 700 }}>#{order.orderNumber}</span>
                              <span>{formatDate(order.createdAt)}</span>
                              <span style={{ flex: 1, minWidth: 120 }}>
                                {order.items.map((i) => `${i.name} ×${i.quantity}`).join('، ') || '—'}
                              </span>
                              <span style={{ color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                                {formatPrice(order.total, DEFAULT_CURRENCY)}
                              </span>
                            </div>
                          ))}
                          {rows.length > 10 && (
                            <p style={{ fontSize: 11.5, color: C.muted, margin: '4px 0 0' }}>
                              و{rows.length - 10} طلباً أقدم…
                            </p>
                          )}
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
    </div>
  );
};

const Tag: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <span style={{
    fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
    background: `${color}1F`, color
  }}>
    {text}
  </span>
);

const Stat: React.FC<{
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string; value: string; hint: string; color?: string;
}> = ({ icon: Icon, label, value, hint, color }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '13px 15px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.muted, fontSize: 11.5 }}>
      <Icon size={13} color={color || C.muted} />
      {label}
    </div>
    <div style={{
      fontSize: 20, fontWeight: 900, marginTop: 5,
      color: color || C.text, fontVariantNumeric: 'tabular-nums'
    }}>
      {value}
    </div>
    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{hint}</div>
  </div>
);

export default CustomersPage;
