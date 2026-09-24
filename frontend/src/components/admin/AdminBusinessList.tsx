// frontend/src/components/admin/AdminBusinessList.tsx
//
// قائمة المطاعم أو المتاجر للسوبر أدمن — مكوّنٌ واحد للنوعين. كانت
// الصفحتان نسختين شبه متطابقتين (٤٨٠ سطراً لكلٍّ) بجدولٍ من عشرة أعمدة
// يتمرّر أفقياً حتى على الحاسوب، وسعرُ الخطة فيه دولارٌ مكتوبٌ «ر.س».
//
// هنا صفٌّ واحد لكلّ نشاط يصير بطاقةً على الجوال، وتبويبات حالةٍ بأعدادها،
// وبحثٌ يشمل المالك والنطاق. تفاصيل النشاط في صفحته (`/admin/{type}/:id`).

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IoChevronBack,
  IoOpenOutline,
  IoRefresh,
  IoRestaurantOutline,
  IoSearch,
  IoStorefrontOutline,
  IoTrashOutline
} from 'react-icons/io5';
import api from '@/services/api';
import Loader from '@/components/common/Loader';
import { buildSubdomainUrl, getBaseUrl } from '@/utils/subdomain';
import '@/styles/orders.css';
import '@/styles/catalog.css';
import '@/styles/admin.css';

type Kind = 'restaurant' | 'store';

interface Business {
  id: string;
  name: string;
  slug?: string;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
  logo?: string | null;
  subdomain?: string | null;
  customDomain?: string | null;
  createdAt: string;
  plan?: { id: string; name: string; price: number } | null;
  owner?: { id: string; name: string; email: string } | null;
  user?: { id: string; name: string; email: string } | null;
}

const COPY: Record<Kind, { plural: string; one: string; path: string; key: string; icon: React.ComponentType<{ size?: number }> }> = {
  restaurant: { plural: 'المطاعم', one: 'المطعم', path: 'restaurants', key: 'restaurants', icon: IoRestaurantOutline },
  store: { plural: 'المتاجر', one: 'المتجر', path: 'stores', key: 'stores', icon: IoStorefrontOutline }
};

const PLAN_LABEL: Record<string, string> = { free: 'المجانية', basic: 'الأساسية', pro: 'الاحترافية', enterprise: 'المؤسسية' };

/** سعر الخطة بالدولار — وحدة الحساب التي يُدخلها الأدمن نفسه في شاشة الخطط */
const planText = (plan?: Business['plan']) => {
  if (!plan) return 'بلا خطة';
  const label = PLAN_LABEL[plan.name] || plan.name;
  // عزلٌ يساريّ للمبلغ: «$45» وسط نصٍّ عربيّ كانت تنقلب إلى «45$»
  return plan.price > 0 ? `${label} · ⁦$${plan.price}⁩ شهرياً` : label;
};

const publicUrl = (b: Business) => {
  const local = /localhost|127\.0\.0\.1/.test(window.location.hostname);
  if (b.subdomain && !local) return buildSubdomainUrl(b.subdomain);
  return b.slug ? `${getBaseUrl()}/${b.slug}` : null;
};

const AdminBusinessList: React.FC<{ kind: Kind }> = ({ kind }) => {
  const copy = COPY[kind];
  const [items, setItems] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const res: any = await api.get(`/admin/${copy.path}`);
      const list = res?.[copy.key] || res?.data?.[copy.key] || (Array.isArray(res) ? res : []);
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggle = async (b: Business) => {
    setBusy(b.id);
    try {
      await api.patch(`/admin/${copy.path}/${b.id}/toggle`);
      setItems((list) => list.map((x) => (x.id === b.id ? { ...x, isActive: !x.isActive } : x)));
      toast.success(b.isActive ? `أُوقف «${b.name}» — واجهته لم تعد تقبل طلبات` : `فُعّل «${b.name}»`);
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setBusy(null);
    }
  };

  const remove = async (b: Business) => {
    // الاسم كتابةً لا نقرة «موافق»: الحذف يمسح القائمة والطلبات والزبائن بلا رجعة
    const typed = window.prompt(
      `حذف «${b.name}» نهائياً يمسح كلّ منتجاته وطلباته وبياناته، ولا يمكن التراجع عنه.\n\nاكتب اسم ${copy.one} للتأكيد:`
    );
    if (typed === null) return;
    if (typed.trim() !== b.name.trim()) {
      toast.error('الاسم غير مطابق — لم يُحذف شيء');
      return;
    }
    setBusy(b.id);
    try {
      await api.delete(`/admin/${copy.path}/${b.id}`);
      setItems((list) => list.filter((x) => x.id !== b.id));
      toast.success(`حُذف «${b.name}»`);
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setBusy(null);
    }
  };

  const counts = useMemo(
    () => ({ all: items.length, active: items.filter((b) => b.isActive).length, inactive: items.filter((b) => !b.isActive).length }),
    [items]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((b) => {
      if (status === 'active' && !b.isActive) return false;
      if (status === 'inactive' && b.isActive) return false;
      if (!q) return true;
      const owner = b.owner || b.user;
      return [b.name, b.email, b.phone, b.slug, b.subdomain, b.customDomain, owner?.name, owner?.email].some((f) =>
        (f || '').toLowerCase().includes(q)
      );
    });
  }, [items, query, status]);

  if (loading) return <Loader fullScreen />;

  const Icon = copy.icon;

  return (
    <div className="ss-page ob-page">
      <div className="ob-toolbar">
        <div className="ob-row">
          <div className="ob-search-wrap">
            <label className="ob-search">
              <IoSearch size={18} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="الاسم، المالك، البريد أو النطاق"
                aria-label={`بحث في ${copy.plural}`}
              />
            </label>
            <button type="button" className="ob-icon" onClick={refresh} aria-label="تحديث" title="تحديث">
              <IoRefresh size={18} className={refreshing ? 'ob-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="ob-tabs" role="tablist" aria-label="الحالة">
          {(
            [
              ['all', 'الكل', 'gray'],
              ['active', 'نشط', 'green'],
              ['inactive', 'موقوف', 'red']
            ] as const
          ).map(([key, label, tone]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={status === key}
              className={`ob-tab tone-${tone} ${counts[key] ? 'has' : ''}`}
              onClick={() => setStatus(key)}
            >
              {label} <span>{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="ob-list" aria-label={copy.plural}>
        <div className="ob-list-head">
          <span>
            {visible.length} من {items.length}
          </span>
          <span>الأحدث أولاً</span>
        </div>
        {visible.length === 0 ? (
          <div className="ob-empty">
            <b>{items.length === 0 ? `لا ${copy.plural} بعد` : 'لا نتائج'}</b>
            <p>{items.length === 0 ? 'سيظهر هنا كلّ من يسجّل على المنصّة.' : 'جرّب كلمةً أخرى أو حالةً أخرى.'}</p>
          </div>
        ) : (
          <ul className="ad-rows">
            {[...visible]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((b) => {
                const owner = b.owner || b.user;
                const url = publicUrl(b);
                return (
                  <li key={b.id} className={`ad-row ${b.isActive ? '' : 'is-off'}`}>
                    <Link to={`/admin/${copy.path}/${b.id}`} className="ad-row-main">
                      <span className="ad-avatar" aria-hidden="true">
                        <Icon size={20} />
                        {/* فوق الأيقونة: شعارٌ برابطٍ معطوب يختفي فتظهر الأيقونة بدل صورةٍ مكسورة */}
                        {b.logo && <img src={b.logo} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                      </span>
                      <span className="ad-row-text">
                        <b>{b.name}</b>
                        <small>
                          <bdi>{owner?.name || 'بلا مالك'}</bdi>
                          {(owner?.email || b.email) && (
                            <>
                              {' · '}
                              <bdi>{owner?.email || b.email}</bdi>
                            </>
                          )}
                        </small>
                      </span>
                    </Link>

                    <span className="ad-row-meta">
                      <span className={`ob-pill ${b.plan && b.plan.price > 0 ? 'tone-purple' : 'tone-gray'}`}>{planText(b.plan)}</span>
                      <span className="ad-date">
                        {new Date(b.createdAt).toLocaleDateString('ar-SY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </span>

                    <span className="ad-row-actions">
                      <button
                        type="button"
                        className={`pc-toggle ${b.isActive ? 'is-on' : ''}`}
                        role="switch"
                        aria-checked={b.isActive}
                        disabled={busy === b.id}
                        onClick={() => toggle(b)}
                        title={b.isActive ? 'نشط — اضغط للإيقاف' : 'موقوف — اضغط للتفعيل'}
                      >
                        <span className="pc-toggle-track"><span /></span>
                        <span className="ad-toggle-text">{b.isActive ? 'نشط' : 'موقوف'}</span>
                      </button>
                      {url && (
                        <a href={url} target="_blank" rel="noreferrer" className="pc-act" aria-label={`فتح واجهة ${b.name}`} title="فتح الواجهة">
                          <IoOpenOutline size={17} />
                        </a>
                      )}
                      <button type="button" className="pc-act is-danger" onClick={() => remove(b)} disabled={busy === b.id} aria-label={`حذف ${b.name}`} title="حذف">
                        <IoTrashOutline size={17} />
                      </button>
                      <Link to={`/admin/${copy.path}/${b.id}`} className="pc-act ad-go" aria-label={`تفاصيل ${b.name}`}>
                        <IoChevronBack size={17} />
                      </Link>
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AdminBusinessList;
