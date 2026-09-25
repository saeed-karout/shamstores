// frontend/src/pages/Store/CustomersPage.tsx
//
// زبائن النشاط — تخدم المتجر والمطعم معاً (النشاط يُشتقّ من الرمز).
//
// **البيانات كانت كاملة والعرض غائباً:** كل طلب يحمل صاحبه، ومع ذلك لم يكن
// للتاجر سبيلٌ ليعرف من زبونه الأوفى ولا من انقطع عنه.
//
// **والترتيب افتراضياً بالإنفاق لا بالتاريخ:** الأحدث معلومة يعرفها التاجر
// من صفحة الطلبات؛ الأوفى هو ما لا يعرفه ولا يستطيع حسابه بنفسه.
//
// **والفلترة على الخادم لا هنا.** كانت الشاشة تجلب القائمة كلّها وتصفّيها
// في المتصفّح — وهذا يعني أن التصدير لا يعرف ما صفّاه التاجر، فيُخرج الكلّ،
// وأن متجراً بآلاف الزبائن يُرسل آلاف الصفوف إلى هاتف ليعرض عشرين. الآن
// الشروط تُرسل في الرابط، والخادم يعيد صفحةً منها، والتصدير يُرسل الشروط
// نفسها فيُخرج ما على الشاشة حرفياً.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IoPeople, IoRepeat, IoTimeOutline, IoWallet, IoSearch,
  IoChevronDown, IoChevronBack, IoCall, IoRefresh, IoOptionsOutline,
  IoClose, IoMegaphoneOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import Loader from '@/components/common/Loader';
import { InlineListSkeleton, SkeletonScope, SkeletonLine } from '@/components/common/Skeleton';
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';
import { CustomerCsvTools } from '@/components/common/CsvTools';
import '@/styles/orders.css';
import '@/styles/catalog.css';
import '@/styles/customers.css';

const C = {
  bg: '#F4F7F4',
  card: '#FFFFFF',
  surf: '#F1F5F2',
  accent: '#084835',
  text: '#10231B',
  muted: '#5F736A',
  border: 'rgba(8,72,53,0.15)',
  warn: '#C2410C',
  blue: '#2563EB'
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

const PAGE_SIZE = 40;

interface Customer {
  key: string;
  userId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  isGuest: boolean;
  isImported?: boolean;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  firstOrderAt: string | null;
  isLapsed: boolean;
  governorate: string | null;
  marketingOptIn: boolean;
}

interface Summary {
  total: number;
  registered: number;
  guests: number;
  returning: number;
  lapsed: number;
  optedIn?: number;
  newCustomers?: number;
  imported?: number;
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

// ==================== الشروط ====================

type Segment = '' | 'returning' | 'new' | 'lapsed' | 'imported';
type Sort = 'spent' | 'orders' | 'recent' | 'oldest' | 'name';
type Tri = '' | '1' | '0';

/**
 * آخر طلب: مُدَدٌ جاهزة، و`old` = «لم يطلب منذ أكثر من ٩٠ يوماً» — جمهور
 * حملة الاسترجاع، وهو السؤال الذي يُطرح فعلاً أكثر من «بين تاريخين».
 */
type LastPreset = '' | '7' | '30' | '90' | 'old' | 'custom';
type FirstPreset = '' | '7' | '30' | '90' | 'custom';

interface Filters {
  segment: Segment;
  type: '' | 'registered' | 'guest';
  minOrders: string;
  maxOrders: string;
  minSpent: string;
  maxSpent: string;
  lastPreset: LastPreset;
  lastFrom: string;
  lastTo: string;
  firstPreset: FirstPreset;
  firstFrom: string;
  firstTo: string;
  governorate: string;
  hasPhone: Tri;
  optIn: Tri;
}

const EMPTY: Filters = {
  segment: '',
  type: '',
  minOrders: '',
  maxOrders: '',
  minSpent: '',
  maxSpent: '',
  lastPreset: '',
  lastFrom: '',
  lastTo: '',
  firstPreset: '',
  firstFrom: '',
  firstTo: '',
  governorate: '',
  hasPhone: '',
  optIn: ''
};

const SEGMENTS: { key: Segment; label: string; count?: (s: Summary) => number | undefined }[] = [
  { key: '', label: 'الكل', count: (s) => s.total },
  { key: 'returning', label: 'عادوا أكثر من مرّة', count: (s) => s.returning },
  { key: 'new', label: 'جدد (30 يوماً)', count: (s) => s.newCustomers },
  { key: 'lapsed', label: 'انقطعوا', count: (s) => s.lapsed },
  { key: 'imported', label: 'مستوردون', count: (s) => s.imported }
];

const SORTS: { key: Sort; label: string }[] = [
  { key: 'spent', label: 'الأكثر إنفاقاً' },
  { key: 'orders', label: 'الأكثر طلباً' },
  { key: 'recent', label: 'الأحدث طلباً' },
  { key: 'oldest', label: 'الأقدم عهداً' },
  { key: 'name', label: 'بالاسم' }
];

const LAST_PRESETS: { key: LastPreset; label: string }[] = [
  { key: '7', label: 'آخر 7 أيام' },
  { key: '30', label: 'آخر 30 يوماً' },
  { key: '90', label: 'آخر 90 يوماً' },
  { key: 'old', label: 'قبل أكثر من 90 يوماً' },
  { key: 'custom', label: 'مدّة مخصّصة' }
];

const FIRST_PRESETS: { key: FirstPreset; label: string }[] = [
  { key: '7', label: 'آخر 7 أيام' },
  { key: '30', label: 'آخر 30 يوماً' },
  { key: '90', label: 'آخر 90 يوماً' },
  { key: 'custom', label: 'مدّة مخصّصة' }
];

/** تاريخ اليوم ناقص N يوماً بصيغة `YYYY-MM-DD` — بتوقيت الجهاز لا UTC */
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * الشروط رابطاً — **دالّةٌ واحدة للقائمة والتصدير**.
 *
 * المُدد الجاهزة تُحوَّل تواريخ لحظة الطلب لا لحظة الاختيار: شاشةٌ تبقى
 * مفتوحة من الأمس تسأل عن «آخر ٧ أيام» من اليوم، لا من أمس.
 */
const toParams = (f: Filters, q: string, sort: Sort): URLSearchParams => {
  const p = new URLSearchParams();
  const set = (k: string, v: string) => { if (v.trim()) p.set(k, v.trim()); };

  set('q', q);
  set('segment', f.segment);
  set('type', f.type);
  set('minOrders', f.minOrders);
  set('maxOrders', f.maxOrders);
  set('minSpent', f.minSpent);
  set('maxSpent', f.maxSpent);

  if (f.lastPreset === 'custom') {
    set('lastFrom', f.lastFrom);
    set('lastTo', f.lastTo);
  } else if (f.lastPreset === 'old') {
    set('lastTo', daysAgo(91));
  } else if (f.lastPreset) {
    set('lastFrom', daysAgo(Number(f.lastPreset)));
  }

  if (f.firstPreset === 'custom') {
    set('firstFrom', f.firstFrom);
    set('firstTo', f.firstTo);
  } else if (f.firstPreset) {
    set('firstFrom', daysAgo(Number(f.firstPreset)));
  }

  set('governorate', f.governorate);
  set('hasPhone', f.hasPhone);
  set('optIn', f.optIn);
  if (sort !== 'spent') p.set('sort', sort);
  return p;
};

const money = (n: number) => formatPrice(n, DEFAULT_CURRENCY);
const plainNumber = (v: string) => Number(v).toLocaleString('en-US');

interface Chip {
  id: string;
  label: string;
  clear: Partial<Filters>;
}

/** الشروط الفعّالة شرائح — كل شريحة تقول ما تفعله وتُزال وحدها */
const activeChips = (f: Filters): Chip[] => {
  const chips: Chip[] = [];
  const range = (min: string, max: string, unit: (v: string) => string) =>
    min && max ? `${unit(min)} – ${unit(max)}` : min ? `${unit(min)} فأكثر` : `حتى ${unit(max)}`;

  if (f.type) chips.push({ id: 'type', label: f.type === 'guest' ? 'بلا حساب' : 'بحساب مسجّل', clear: { type: '' } });
  if (f.minOrders || f.maxOrders) {
    chips.push({
      id: 'orders',
      label: `الطلبات: ${range(f.minOrders, f.maxOrders, (v) => v)}`,
      clear: { minOrders: '', maxOrders: '' }
    });
  }
  if (f.minSpent || f.maxSpent) {
    chips.push({
      id: 'spent',
      label: `الإنفاق: ${range(f.minSpent, f.maxSpent, (v) => `${plainNumber(v)} ل.س`)}`,
      clear: { minSpent: '', maxSpent: '' }
    });
  }
  if (f.lastPreset) {
    const label =
      f.lastPreset === 'custom'
        ? `آخر طلب: ${f.lastFrom || '…'} ← ${f.lastTo || '…'}`
        : f.lastPreset === 'old'
        ? 'لم يطلب منذ 90 يوماً'
        : `آخر طلب خلال ${f.lastPreset} يوماً`;
    chips.push({ id: 'last', label, clear: { lastPreset: '', lastFrom: '', lastTo: '' } });
  }
  if (f.firstPreset) {
    const label =
      f.firstPreset === 'custom'
        ? `أوّل طلب: ${f.firstFrom || '…'} ← ${f.firstTo || '…'}`
        : `زبون جديد خلال ${f.firstPreset} يوماً`;
    chips.push({ id: 'first', label, clear: { firstPreset: '', firstFrom: '', firstTo: '' } });
  }
  if (f.governorate) chips.push({ id: 'gov', label: f.governorate, clear: { governorate: '' } });
  if (f.hasPhone) chips.push({ id: 'phone', label: f.hasPhone === '1' ? 'لديه هاتف' : 'بلا هاتف', clear: { hasPhone: '' } });
  if (f.optIn) {
    chips.push({
      id: 'optin',
      label: f.optIn === '1' ? 'يقبل الرسائل التسويقية' : 'لا يقبل الرسائل التسويقية',
      clear: { optIn: '' }
    });
  }
  return chips;
};

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
  const [governorates, setGovernorates] = useState<string[]>([]);
  const [result, setResult] = useState<{ total: number; totalSpent: number; ordersCount: number } | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  /** أوّل تحميل — هيكل الصفحة كلّها؛ وما بعده ظلال القائمة وحدها */
  const [booting, setBooting] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('spent');
  const [filters, setFilters] = useState<Filters>(EMPTY);
  /** مسوّدة اللوحة — تُطبَّق بزرّ: نداءٌ لكل حرفٍ في «من ١٠٠٠٠٠» يُغرق الشبكة */
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [panelOpen, setPanelOpen] = useState(false);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, OrderRow[]>>({});

  // يُسقط ردّاً وصل بعد ردٍّ أحدث منه — شرطان متتاليان بسرعة لا يتسابقان
  const requestId = useRef(0);

  const params = useMemo(() => toParams(filters, q, sort), [filters, q, sort]);
  const exportQuery = params.toString();

  const load = useCallback(
    async (nextPage = 1) => {
      const id = ++requestId.current;
      if (nextPage === 1) setFetching(true);
      else setLoadingMore(true);

      try {
        const query = new URLSearchParams(params);
        query.set('page', String(nextPage));
        query.set('limit', String(PAGE_SIZE));
        const data: any = await api.get(`/customers?${query.toString()}`);
        if (id !== requestId.current) return;

        const rows: Customer[] = data?.customers || [];
        setCustomers((prev) => (nextPage === 1 ? rows : [...prev, ...rows]));
        setSummary(data?.summary || null);
        setGovernorates(data?.facets?.governorates || []);
        setResult(data?.filtered || null);
        setPage(data?.pagination?.page || nextPage);
        setPages(data?.pagination?.pages || 1);
      } catch {
        if (id === requestId.current) toast.error('تعذّر تحميل الزبائن');
      } finally {
        if (id === requestId.current) {
          setFetching(false);
          setLoadingMore(false);
          setBooting(false);
        }
      }
    },
    [params]
  );

  useEffect(() => { load(1); }, [load]);

  // البحث مؤجَّل: نداءٌ لكل حرف يُبطئ الكتابة نفسها على شبكةٍ بطيئة
  useEffect(() => {
    const t = window.setTimeout(() => setQ(search), 350);
    return () => window.clearTimeout(t);
  }, [search]);

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

  const chips = activeChips(filters);
  // الشريحة (التبويب) ظاهرةٌ في التبويبات، فلا تُعدّ في شارة زرّ الفلاتر
  const panelCount = chips.length;
  const anyFilter = chips.length > 0 || Boolean(filters.segment) || Boolean(q);

  const openPanel = () => {
    setDraft(filters);
    setPanelOpen((v) => !v);
  };
  const apply = () => {
    setFilters({ ...draft, segment: filters.segment });
    setPanelOpen(false);
  };
  const clearAll = () => {
    setFilters(EMPTY);
    setDraft(EMPTY);
    setSearch('');
    setQ('');
  };
  const patchDraft = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));

  if (booting) return <Loader fullScreen variant="list" />;

  return (
    <div className="ss-page ob-page" dir="rtl" style={{ color: C.text }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>الزبائن</h1>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: C.muted }}>
            {SORTS.find((s) => s.key === sort)?.label} أولاً
          </p>
        </div>
        <CustomerCsvTools
          colors={csvColors}
          onDone={() => load(1)}
          exportQuery={exportQuery}
          exportLabel={anyFilter && result ? `تصدير ${result.total} (المفلتر)` : undefined}
        />
        <button className="ob-icon" onClick={() => load(1)} title="تحديث" aria-label="تحديث">
          <IoRefresh size={18} className={fetching ? 'ob-spin' : undefined} />
        </button>
      </header>

      {summary && (
        <div style={{
          display: 'grid', gap: 10,
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'
        }}>
          <Stat icon={IoPeople} label="زبون" value={String(summary.total)} hint={`${summary.registered} بحساب`} />
          <Stat icon={IoRepeat} label="عادوا" value={String(summary.returning)} hint="طلبوا أكثر من مرّة" color={C.accent} />
          <Stat icon={IoTimeOutline} label="انقطعوا" value={String(summary.lapsed)} hint="بلا طلب منذ 60 يوماً" color={C.warn} />
          <Stat icon={IoWallet} label="متوسّط الطلب" value={money(summary.averageOrderValue)} hint={`الإجمالي ${money(summary.totalRevenue)}`} />
        </div>
      )}

      {/* ============ الشريط ============ */}
      <div className="ob-toolbar">
        <div className="ob-row">
          <div className="ob-search-wrap">
            <label className="ob-search">
              <IoSearch size={17} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="الاسم أو الهاتف أو البريد…"
                aria-label="بحث في الزبائن"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="مسح البحث">
                  <IoClose size={16} />
                </button>
              )}
            </label>
            <button
              type="button"
              className="ob-icon cu-filter-btn"
              onClick={openPanel}
              aria-expanded={panelOpen}
              aria-controls="cu-panel"
              title="فلاتر متقدّمة"
            >
              <IoOptionsOutline size={19} />
              {panelCount > 0 && <b>{panelCount}</b>}
            </button>
          </div>

          <select
            className="pc-select cu-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="الترتيب"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>ترتيب: {s.label}</option>
            ))}
          </select>
        </div>

        <div className="ob-tabs" role="tablist" aria-label="شريحة الزبائن">
          {SEGMENTS.map((seg) => {
            const count = summary && seg.count ? seg.count(summary) : undefined;
            return (
              <button
                key={seg.key || 'all'}
                role="tab"
                aria-selected={filters.segment === seg.key}
                className="ob-tab"
                onClick={() => setFilters((f) => ({ ...f, segment: seg.key }))}
              >
                {seg.label}
                {count !== undefined && <span>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ لوحة الفلاتر ============ */}
      {panelOpen && (
        <section id="cu-panel" className="cu-panel" aria-label="فلاتر الزبائن">
          <div className="cu-panel-body">
            <div className="cu-field">
              <span>عدد الطلبات</span>
              <div className="cu-range">
                <input className="cu-input" type="number" inputMode="numeric" min={0} placeholder="من"
                  value={draft.minOrders} onChange={(e) => patchDraft({ minOrders: e.target.value })} />
                <i>—</i>
                <input className="cu-input" type="number" inputMode="numeric" min={0} placeholder="إلى"
                  value={draft.maxOrders} onChange={(e) => patchDraft({ maxOrders: e.target.value })} />
              </div>
            </div>

            <div className="cu-field">
              <span>إجمالي الإنفاق <small>بالليرة السورية، صافٍ من المرتجعات</small></span>
              <div className="cu-range">
                <input className="cu-input" type="number" inputMode="numeric" min={0} placeholder="من"
                  value={draft.minSpent} onChange={(e) => patchDraft({ minSpent: e.target.value })} />
                <i>—</i>
                <input className="cu-input" type="number" inputMode="numeric" min={0} placeholder="إلى"
                  value={draft.maxSpent} onChange={(e) => patchDraft({ maxSpent: e.target.value })} />
              </div>
            </div>

            <div className="cu-field">
              <span>المحافظة</span>
              <select
                className="pc-select"
                value={draft.governorate}
                onChange={(e) => patchDraft({ governorate: e.target.value })}
                disabled={governorates.length === 0}
              >
                <option value="">
                  {governorates.length === 0 ? 'لا محافظات في الطلبات بعد' : 'كل المحافظات'}
                </option>
                {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="cu-field">
              <span>آخر طلب</span>
              <div className="cu-presets">
                {LAST_PRESETS.map((p) => (
                  <button key={p.key} type="button" aria-pressed={draft.lastPreset === p.key}
                    onClick={() => patchDraft({ lastPreset: draft.lastPreset === p.key ? '' : p.key })}>
                    {p.label}
                  </button>
                ))}
              </div>
              {draft.lastPreset === 'custom' && (
                <div className="cu-range">
                  <input className="cu-input" type="date" aria-label="آخر طلب من"
                    value={draft.lastFrom} onChange={(e) => patchDraft({ lastFrom: e.target.value })} />
                  <i>←</i>
                  <input className="cu-input" type="date" aria-label="آخر طلب إلى"
                    value={draft.lastTo} onChange={(e) => patchDraft({ lastTo: e.target.value })} />
                </div>
              )}
            </div>

            <div className="cu-field">
              <span>أوّل طلب <small>زبائن جدد</small></span>
              <div className="cu-presets">
                {FIRST_PRESETS.map((p) => (
                  <button key={p.key} type="button" aria-pressed={draft.firstPreset === p.key}
                    onClick={() => patchDraft({ firstPreset: draft.firstPreset === p.key ? '' : p.key })}>
                    {p.label}
                  </button>
                ))}
              </div>
              {draft.firstPreset === 'custom' && (
                <div className="cu-range">
                  <input className="cu-input" type="date" aria-label="أوّل طلب من"
                    value={draft.firstFrom} onChange={(e) => patchDraft({ firstFrom: e.target.value })} />
                  <i>←</i>
                  <input className="cu-input" type="date" aria-label="أوّل طلب إلى"
                    value={draft.firstTo} onChange={(e) => patchDraft({ firstTo: e.target.value })} />
                </div>
              )}
            </div>

            <div className="cu-field">
              <span>نوع الحساب</span>
              <Seg
                value={draft.type}
                onChange={(v) => patchDraft({ type: v as Filters['type'] })}
                options={[['', 'الكل'], ['registered', 'مسجّل'], ['guest', 'بلا حساب']]}
              />
            </div>

            <div className="cu-field">
              <span>رقم الهاتف</span>
              <Seg
                value={draft.hasPhone}
                onChange={(v) => patchDraft({ hasPhone: v as Tri })}
                options={[['', 'الكل'], ['1', 'لديه هاتف'], ['0', 'بلا هاتف']]}
              />
            </div>

            <div className="cu-field">
              <span>الرسائل التسويقية <small>وافق عند الطلب أو في ملفّ الاستيراد</small></span>
              <Seg
                value={draft.optIn}
                onChange={(v) => patchDraft({ optIn: v as Tri })}
                options={[['', 'الكل'], ['1', 'يقبل'], ['0', 'لا يقبل']]}
              />
            </div>
          </div>

          <div className="cu-panel-foot">
            <button type="button" className="ss-btn ss-btn-ghost" onClick={() => setDraft({ ...EMPTY, segment: filters.segment })}>
              تفريغ الحقول
            </button>
            <button type="button" className="ss-btn ss-btn-primary" onClick={apply}>
              تطبيق الفلاتر
            </button>
          </div>
        </section>
      )}

      {/* ============ الشروط الفعّالة والنتيجة ============ */}
      {(chips.length > 0 || anyFilter) && (
        <div className="cu-chips" aria-label="الفلاتر الفعّالة">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="cu-chip"
              onClick={() => setFilters((f) => ({ ...f, ...chip.clear }))}
              aria-label={`إزالة: ${chip.label}`}
            >
              {chip.label}
              <IoClose size={15} />
            </button>
          ))}
          <button type="button" className="cu-clear" onClick={clearAll}>مسح الكل</button>
        </div>
      )}

      {result && (
        <div className="cu-result" aria-live="polite">
          <span><b>{result.total}</b> زبوناً{anyFilter && summary ? ` من ${summary.total}` : ''}</span>
          <span>أنفقوا <b>{money(result.totalSpent)}</b></span>
          <span>في <b>{result.ordersCount}</b> طلباً</span>
          {filters.optIn !== '1' && summary?.optedIn !== undefined && summary.optedIn > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IoMegaphoneOutline size={13} /> {summary.optedIn} يقبلون الرسائل
            </span>
          )}
        </div>
      )}

      {/* ============ القائمة ============ */}
      {fetching ? (
        <InlineListSkeleton rows={6} />
      ) : customers.length === 0 ? (
        <div className="ob-list">
          <div className="ob-empty">
            <b>{summary?.total ? 'لا زبون يطابق هذه الشروط' : 'لا زبائن بعد'}</b>
            <p>
              {summary?.total
                ? 'خفّف الشروط أو امسحها لترى القائمة كاملة.'
                : 'ستظهر أسماؤهم هنا مع أول طلب.'}
            </p>
            {anyFilter && <button type="button" onClick={clearAll}>مسح الفلاتر</button>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {customers.map((customer) => {
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
                      {/* المستورد قد يظهر بصفر طلبات — والبيان يمنع
                          أن يُقرأ ذلك عيباً في الحساب */}
                      {customer.isImported && <Tag text="مستورد" color={C.warn} />}
                      {customer.isLapsed && <Tag text="انقطع" color={C.warn} />}
                      {customer.marketingOptIn && <Tag text="يقبل الرسائل" color={C.accent} />}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                      {customer.phone || 'بلا رقم'}
                      {customer.governorate ? ` · ${customer.governorate}` : ''}
                      {' · '}آخر طلب {formatDate(customer.lastOrderAt)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'end', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>
                      {money(customer.totalSpent)}
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
                      <SkeletonScope label="جارٍ تحميل الطلبات…" style={{ display: 'grid', gap: 9 }}>
                        <SkeletonLine w="72%" />
                        <SkeletonLine w="58%" />
                        <SkeletonLine w="64%" />
                      </SkeletonScope>
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
                              {money(order.total)}
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

          {loadingMore && <InlineListSkeleton rows={3} />}

          {page < pages && !loadingMore && (
            <button type="button" className="cu-more" onClick={() => load(page + 1)}>
              عرض المزيد ({(result?.total ?? 0) - customers.length} متبقٍّ)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/** مفتاحٌ ثلاثيّ بشكل `.ob-seg` — «الكل / نعم / لا» */
const Seg: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}> = ({ value, onChange, options }) => (
  <div className="ob-seg" role="group">
    {options.map(([key, label]) => (
      <button key={key || 'all'} type="button" aria-pressed={value === key} onClick={() => onChange(key)}>
        {label}
      </button>
    ))}
  </div>
);

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
