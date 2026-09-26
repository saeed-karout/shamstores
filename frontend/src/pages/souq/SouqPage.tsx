// frontend/src/pages/souq/SouqPage.tsx
//
// «سوق شام ستورز» — دليلٌ عامّ يصل منه الزبون إلى المتاجر والمطاعم.
//
// **ليس سلّةً مشتركة ولا وسيطاً:** كل بطاقة رابطٌ إلى واجهة التاجر نفسها
// (نطاقه الخاصّ ثمّ نطاقه الفرعيّ)، والطلب يتمّ هناك بشروطه وأسعاره. السوق
// يجلب الزبون ويتنحّى — وهذا ما يجعله مصدر زبائن للتاجر لا منافساً له.
//
// **حالة الصفحة في الرابط** (`/souq/<محافظة>?q=&cat=&tab=`): الزبون يرسل
// «نتائج آيفون في حلب» لصديقه فيفتحها كما رآها، وجوجل يفهرس صفحة كل محافظة.
//
// الترتيب يُشرح على الصفحة نفسها (config/souq.ts في الخادم) — ومنه أنّ
// الاشتراك المدفوع يمنح أولوية. لا نخفي ذلك في «الأفضل».

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  IoSearch, IoLocationOutline, IoStorefront, IoRestaurant, IoCheckmarkCircle, IoStar,
  IoArrowBack, IoCubeOutline, IoImageOutline
} from 'react-icons/io5';
import api from '@/services/api';
import '@/styles/brand.css';
import '@/styles/souq.css';
import { BrandLogo } from '@/components/marketing/Brand';
import { formatPrice } from '@/utils/currency';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import { APP_DOMAIN } from '@/utils/subdomain';

// ===== الأنواع — تطابق services/souq.service.ts =====

interface Governorate { code: string; name: string; nameEn: string }
interface Category { code: string; name: string; nameEn: string; kinds: Array<'store' | 'restaurant'> }
interface Meta {
  governorates: Governorate[];
  categories: Category[];
  weights: Record<string, number>;
  ordersWindowDays: number;
}

interface BusinessRef {
  id: string;
  type: 'store' | 'restaurant';
  name: string;
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
  url: string;
  logo: string | null;
  verified: boolean;
  governorateName: string | null;
}

interface SouqBusiness extends BusinessRef {
  nameEn: string | null;
  description: string | null;
  coverImage: string | null;
  governorate: string | null;
  category: string;
  categoryName: string;
  paid: boolean;
  itemCount: number;
  recentOrders: number;
  ratingAvg: number;
  ratingCount: number;
}

interface ProductCard {
  id: string;
  kind: 'product' | 'menuItem';
  name: string;
  nameEn: string | null;
  price: number;
  originalPrice: number | null;
  image: string | null;
  soldOut: boolean;
  comingSoon: boolean;
  ratingAvg: number;
  ratingCount: number;
  business: BusinessRef;
}

interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
}

type Tab = 'products' | 'stores';
const PAGE_SIZE = 24;

// ===== الروابط =====
//
// في الإنتاج: الرابط القانونيّ للتاجر كما يبنيه الخادم (نطاقه الموثَّق ثمّ
// الفرعيّ) — نفس `canonicalOrigin` في seo.service. ومحلياً لا نطاقات فرعية
// تعمل، فيُستعمل مسار `/:slug` كما تفعل قائمة الأدمن.
//
// `?ref=souq` يجعل الزيارة تظهر في تقرير مصادر التاجر باسم السوق (services/track.ts).

const isLocal = () => /localhost|127\.0\.0\.1/.test(window.location.hostname);
const withRef = (url: string) => `${url}${url.includes('?') ? '&' : '?'}ref=souq`;
const trimSlash = (url: string) => url.replace(/\/+$/, '');

const businessHref = (b: BusinessRef): string =>
  withRef(isLocal() ? `/${b.slug}` : `${trimSlash(b.url)}/`);

const productHref = (p: ProductCard): string => {
  const b = p.business;
  if (p.kind === 'product') {
    return withRef(isLocal() ? `/${b.slug}/product/${p.id}` : `${trimSlash(b.url)}/product/${p.id}`);
  }
  // صفحة الصنف المستقلّة لا توجد إلا على مسار المنصّة (`/:slug/item/:id`) —
  // النطاق الفرعيّ والمخصّص يعرضان القائمة كاملة ولا مسار صنفٍ فيهما
  return withRef(isLocal() ? `/${b.slug}/item/${p.id}` : `https://${APP_DOMAIN}/${b.slug}/item/${p.id}`);
};

const img = (url?: string | null) => (url ? getImageUrl(sizedImage(url, 'md')) : '');
const discount = (p: ProductCard) =>
  p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;

// ===== البطاقات =====

const ProductTile: React.FC<{ p: ProductCard }> = ({ p }) => {
  const off = discount(p);
  return (
    <a className="sq-card" href={productHref(p)}>
      <div className={`sq-media ${p.soldOut ? 'is-dim' : ''}`}>
        {p.image ? <img src={img(p.image)} alt={p.name} loading="lazy" decoding="async" /> : <IoImageOutline size={34} aria-hidden />}
        {p.soldOut ? (
          <span className="sq-badge">نفد</span>
        ) : p.comingSoon ? (
          <span className="sq-badge is-soon">قريباً</span>
        ) : off >= 5 ? (
          <span className="sq-badge is-sale">خصم {off}%</span>
        ) : null}
      </div>
      <div className="sq-body">
        <div className="sq-name">{p.name}</div>
        <div className="sq-price">
          <strong>{formatPrice(p.price, 'SYP')}</strong>
          {p.originalPrice ? <s>{formatPrice(p.originalPrice, 'SYP')}</s> : null}
        </div>
        <div className="sq-seller">
          {p.business.logo ? <img className="sq-logo" src={img(p.business.logo)} alt="" loading="lazy" /> : null}
          <span>{p.business.name}</span>
          {p.business.verified && <IoCheckmarkCircle className="sq-verified" title="تاجر موثَّق" aria-label="تاجر موثَّق" />}
          {p.business.governorateName && <span>· {p.business.governorateName}</span>}
        </div>
      </div>
    </a>
  );
};

const StoreTile: React.FC<{ b: SouqBusiness }> = ({ b }) => (
  <a className="sq-card" href={businessHref(b)}>
    <div className="sq-cover">
      {b.coverImage ? <img src={img(b.coverImage)} alt="" loading="lazy" decoding="async" /> : null}
      {b.logo ? (
        <img className="sq-store-logo" src={img(b.logo)} alt={`شعار ${b.name}`} loading="lazy" />
      ) : (
        <span className="sq-store-logo" aria-hidden>{b.name.trim().charAt(0)}</span>
      )}
    </div>
    <div className="sq-store-body">
      <div className="sq-store-name">
        <span>{b.name}</span>
        {b.verified && <IoCheckmarkCircle className="sq-verified" title="تاجر موثَّق" aria-label="تاجر موثَّق" />}
      </div>
      <div className="sq-meta">
        <span>{b.type === 'restaurant' ? <IoRestaurant aria-hidden /> : <IoStorefront aria-hidden />} {b.categoryName}</span>
        {b.governorateName && <span><IoLocationOutline aria-hidden /> {b.governorateName}</span>}
        <span><IoCubeOutline aria-hidden /> {b.itemCount} {b.type === 'restaurant' ? 'صنف' : 'منتج'}</span>
        {/* ثلاثة تقييمات فأكثر — متوسّط تقييمٍ واحد ضجيجٌ لا إشارة */}
        {b.ratingCount >= 3 && (
          <span><IoStar aria-hidden style={{ color: '#E0A100' }} /> {b.ratingAvg.toFixed(1)} ({b.ratingCount})</span>
        )}
      </div>
      {b.description && <p className="sq-desc">{b.description}</p>}
      <span className="sq-visit">زيارة {b.type === 'restaurant' ? 'المطعم' : 'المتجر'} <IoArrowBack aria-hidden /></span>
    </div>
  </a>
);

const Skeletons: React.FC<{ n?: number }> = ({ n = 8 }) => (
  <>
    {Array.from({ length: n }, (_, i) => <div key={i} className="sq-skel" aria-hidden />)}
  </>
);

// ===== الصفحة =====

const SouqPage: React.FC = () => {
  const params = useParams<{ gov?: string }>();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();

  const [meta, setMeta] = useState<Meta | null>(null);
  const gov = meta?.governorates.some((g) => g.code === params.gov) ? params.gov! : '';
  const q = (search.get('q') || '').trim();
  const cat = search.get('cat') || '';
  const tab: Tab = search.get('tab') === 'stores' ? 'stores' : 'products';
  const kind = search.get('type') === 'store' || search.get('type') === 'restaurant' ? search.get('type')! : '';

  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);

  const [stores, setStores] = useState<(Paged<SouqBusiness> & { facets?: { governorates: Record<string, number>; categories: Record<string, number> } }) | null>(null);
  const [products, setProducts] = useState<(Paged<ProductCard> & { mode?: string }) | null>(null);
  const [loading, setLoading] = useState({ stores: true, products: true, more: false });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.get<Meta>('/souq/meta').then(setMeta).catch(() => setFailed(true));
  }, []);

  /** يبني الرابط بالحالة الجديدة — المحافظة في المسار والباقي في الاستعلام */
  const go = useCallback(
    (next: Partial<{ gov: string; q: string; cat: string; tab: Tab; type: string }>) => {
      const state = { gov, q, cat, tab, type: kind, ...next };
      const qs = new URLSearchParams();
      if (state.q) qs.set('q', state.q);
      if (state.cat) qs.set('cat', state.cat);
      if (state.tab === 'stores') qs.set('tab', 'stores');
      if (state.type) qs.set('type', state.type);
      const path = state.gov ? `/souq/${state.gov}` : '/souq';
      const query = qs.toString();
      if (state.gov === gov) setSearch(qs, { replace: false });
      else navigate(query ? `${path}?${query}` : path);
    },
    [gov, q, cat, tab, kind, navigate, setSearch]
  );

  // حارسٌ من ردٍّ متأخّر يكتب فوق ردٍّ أحدث حين يبدّل الزبون الفلتر بسرعة
  const storesReq = useRef(0);
  const productsReq = useRef(0);

  const loadStores = useCallback(
    async (page = 1) => {
      const id = ++storesReq.current;
      setLoading((l) => ({ ...l, stores: page === 1, more: page > 1 }));
      try {
        const data = await api.get<any>('/souq/businesses', {
          gov: gov || undefined, cat: cat || undefined, type: kind || undefined, q: q || undefined, page, limit: PAGE_SIZE
        });
        if (id !== storesReq.current) return;
        setStores((prev) => (page > 1 && prev ? { ...data, items: [...prev.items, ...data.items] } : data));
      } catch {
        if (id === storesReq.current) setFailed(true);
      } finally {
        if (id === storesReq.current) setLoading((l) => ({ ...l, stores: false, more: false }));
      }
    },
    [gov, cat, kind, q]
  );

  const loadProducts = useCallback(
    async (page = 1) => {
      const id = ++productsReq.current;
      setLoading((l) => ({ ...l, products: page === 1, more: page > 1 }));
      try {
        const data = await api.get<any>('/souq/products', {
          gov: gov || undefined, cat: cat || undefined, q: q || undefined, page, limit: PAGE_SIZE
        });
        if (id !== productsReq.current) return;
        setProducts((prev) => (page > 1 && prev ? { ...data, items: [...prev.items, ...data.items] } : data));
      } catch {
        if (id === productsReq.current) setFailed(true);
      } finally {
        if (id === productsReq.current) setLoading((l) => ({ ...l, products: false, more: false }));
      }
    },
    [gov, cat, q]
  );

  // المتاجر تُحمَّل دائماً (عدّادات الفلاتر منها)، والمنتجات حين تبويبها ظاهر
  useEffect(() => {
    if (meta) loadStores(1);
  }, [meta, loadStores]);
  useEffect(() => {
    if (meta && tab === 'products') loadProducts(1);
  }, [meta, tab, loadProducts]);

  const govName = meta?.governorates.find((g) => g.code === gov)?.name || '';
  const catName = meta?.categories.find((c) => c.code === cat)?.name || '';
  const facets = stores?.facets;

  const title = useMemo(() => {
    const where = govName ? ` في ${govName}` : ' في سوريا';
    if (q) return `${q}${where} — سوق شام ستورز`;
    return `${catName || 'متاجر ومطاعم'}${where} — سوق شام ستورز`;
  }, [q, govName, catName]);
  const description = `تصفّح ${catName || 'المتاجر والمطاعم'}${govName ? ` في ${govName}` : ' السورية'} وقارن المنتجات والأسعار، واطلب مباشرةً من التاجر عبر واجهته — بلا وسيط.`;
  const canonical = `https://${APP_DOMAIN}/souq${gov ? `/${gov}` : ''}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    go({ q: draft.trim().slice(0, 80) });
  };

  const W = meta?.weights || {};
  const active = tab === 'products' ? products : stores;
  const isLoading = tab === 'products' ? loading.products : loading.stores;

  return (
    <div className="ss sq" dir="rtl">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {/* نتائج البحث صفحاتٌ لا نهائية — تُتصفَّح ولا تُفهرَس */}
        {q && <meta name="robots" content="noindex, follow" />}
      </Helmet>

      <header className="sq-top">
        <div className="ss-container sq-top-inner">
          <Link to="/" aria-label="شام ستورز — الرئيسية"><BrandLogo tone="light" size="sm" /></Link>
          <div className="sq-top-actions">
            <Link to="/register" className="ss-btn ss-btn-primary ss-btn-sm">أضف متجرك مجاناً</Link>
          </div>
        </div>
      </header>

      <section className="sq-hero">
        <div className="ss-container">
          <span className="sq-eyebrow"><IoStorefront aria-hidden /> سوق شام ستورز</span>
          <h1>{govName ? `تسوّق من متاجر ${govName}` : 'متاجر ومطاعم سوريا في مكانٍ واحد'}</h1>
          <p>ابحث عن المنتج، قارن بين المتاجر، ثمّ اطلب من التاجر مباشرةً عبر واجهته — نحن نوصلك إليه فقط.</p>
          <form className="sq-search" onSubmit={submit} role="search">
            <label className="sq-search-field">
              <IoSearch aria-hidden />
              <input
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="ابحث عن منتج أو متجر: آيفون، عطر، شاورما…"
                aria-label="ابحث في السوق"
                maxLength={80}
              />
            </label>
            <label className="sq-search-field sq-search-gov">
              <IoLocationOutline aria-hidden />
              <select value={gov} onChange={(e) => go({ gov: e.target.value })} aria-label="المحافظة">
                <option value="">كل المحافظات</option>
                {meta?.governorates.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.name}{facets?.governorates?.[g.code] ? ` (${facets.governorates[g.code]})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="ss-btn ss-btn-forest">بحث</button>
          </form>
        </div>
      </section>

      <main className="ss-container">
        <div className="sq-chips" role="group" aria-label="التصنيف">
          <button className="sq-chip" aria-pressed={!cat} onClick={() => go({ cat: '' })}>الكل</button>
          {meta?.categories
            .filter((c) => c.code === cat || (facets?.categories?.[c.code] ?? 0) > 0)
            .map((c) => (
              <button key={c.code} className="sq-chip" aria-pressed={cat === c.code} onClick={() => go({ cat: cat === c.code ? '' : c.code })}>
                {c.name} <small>{facets?.categories?.[c.code] ?? 0}</small>
              </button>
            ))}
        </div>

        <div className="sq-bar">
          <div className="sq-tabs" role="tablist" aria-label="نوع النتائج">
            <button className="sq-tab" role="tab" aria-selected={tab === 'products'} onClick={() => go({ tab: 'products' })}>
              المنتجات
            </button>
            <button className="sq-tab" role="tab" aria-selected={tab === 'stores'} onClick={() => go({ tab: 'stores' })}>
              المتاجر والمطاعم{stores ? ` (${stores.total})` : ''}
            </button>
          </div>
          {tab === 'stores' ? (
            <div className="sq-tabs" role="group" aria-label="نوع النشاط">
              {[['', 'الكل'], ['store', 'متاجر'], ['restaurant', 'مطاعم']].map(([value, label]) => (
                <button key={value} className="sq-tab" aria-selected={kind === value} onClick={() => go({ type: value })}>{label}</button>
              ))}
            </div>
          ) : (
            <span className="sq-note">
              {products?.mode === 'popular' ? 'الأكثر طلباً الآن — ابحث لترى الكل' : products ? `${products.total} نتيجة` : ''}
            </span>
          )}
        </div>

        {failed && !active ? (
          <div className="sq-empty">تعذّر تحميل السوق الآن. حدّث الصفحة بعد قليل.</div>
        ) : isLoading ? (
          <div className={`sq-grid ${tab === 'stores' ? 'is-stores' : ''}`}><Skeletons n={tab === 'stores' ? 6 : 8} /></div>
        ) : tab === 'products' ? (
          products && products.items.length ? (
            <div className="sq-grid">{products.items.map((p) => <ProductTile key={`${p.kind}-${p.id}`} p={p} />)}</div>
          ) : (
            <div className="sq-empty">
              {q ? <>لا نتائج لـ «{q}»{govName ? ` في ${govName}` : ''}. جرّب كلمةً أقصر أو محافظةً أخرى.</> : 'لا منتجات هنا بعد.'}
              {stores && stores.total > 0 && (
                <div style={{ marginTop: 12 }}>
                  <button className="ss-btn ss-btn-forest ss-btn-sm" onClick={() => go({ tab: 'stores' })}>تصفّح المتاجر ({stores.total})</button>
                </div>
              )}
            </div>
          )
        ) : stores && stores.items.length ? (
          <div className="sq-grid is-stores">{stores.items.map((b) => <StoreTile key={b.id} b={b} />)}</div>
        ) : (
          <div className="sq-empty">لا متاجر مطابقة{govName ? ` في ${govName}` : ''} بعد.</div>
        )}

        {active?.hasMore && !isLoading && (
          <div className="sq-more">
            <button
              className="ss-btn ss-btn-ghost ss-btn-sm"
              disabled={loading.more}
              onClick={() => (tab === 'products' ? loadProducts(active.page + 1) : loadStores(active.page + 1))}
            >
              {loading.more ? 'جارٍ التحميل…' : 'عرض المزيد'}
            </button>
          </div>
        )}

        <details className="sq-explain">
          <summary>كيف نرتّب النتائج؟</summary>
          <ul>
            <li>في البحث: الأقرب لما كتبته أوّلاً — تطابق رمز المنتج أو اسمه قبل ما ورد في وصفه.</li>
            <li>ثمّ نشاط المتجر: طلباته في آخر {meta?.ordersWindowDays ?? 30} يوماً ({W.recentOrders ?? 25} نقطة)، وتقييمات مشتريه ({W.reviews ?? 15})، واكتمال واجهته ({W.completeness ?? 15})، وحداثة تحديثها ({W.freshness ?? 5}).</li>
            <li>المتاجر المشتركة بخطةٍ مدفوعة تحصل على أولوية ({W.paidPlan ?? 30} نقطة من نحو 100)، والتاجر الموثَّق على {W.verified ?? 10} — ولا يستطيع أحد شراء المركز الأوّل مباشرةً.</li>
            <li>المنتج النافد يبقى ظاهراً بعد المتوفّر، ولا يملأ متجرٌ واحد الصفحة الأولى وحده.</li>
          </ul>
        </details>

        <aside className="sq-cta">
          <div>
            <h2>عندك متجر أو مطعم؟</h2>
            <p>أنشئ واجهتك في دقائق، وتظهر في السوق لزبائن محافظتك تلقائياً.</p>
          </div>
          <Link to="/register" className="ss-btn ss-btn-primary">ابدأ مجاناً <IoArrowBack aria-hidden /></Link>
        </aside>
      </main>
    </div>
  );
};

export default SouqPage;
