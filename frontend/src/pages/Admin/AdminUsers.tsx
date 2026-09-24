// pages/Admin/AdminUsers.tsx — مستخدمو المنصّة
//
// تبويبات الأدوار بأعدادها بدل قائمةٍ منسدلة، وبحثٌ يشمل الهاتف، وصفٌّ
// يصير بطاقةً على الجوال. حسابات مدير المنصّة بلا أزرار إيقافٍ أو حذف:
// إيقافُ الحساب الوحيد يُغلق المنصّة على صاحبها.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { IoChevronBack, IoRefresh, IoSearch, IoTrashOutline } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import '@/styles/orders.css';
import '@/styles/catalog.css';
import '@/styles/admin.css';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  restaurantId?: string | null;
  storeId?: string | null;
  restaurant?: { name: string } | null;
  store?: { name: string } | null;
}

const ROLES: Array<{ key: string; label: string; tone: string }> = [
  { key: 'owner', label: 'التجّار', tone: 'green' },
  { key: 'staff', label: 'الموظّفون', tone: 'blue' },
  { key: 'delivery_driver', label: 'السائقون', tone: 'amber' },
  { key: 'user', label: 'الزبائن', tone: 'gray' },
  { key: 'super_admin', label: 'مدراء المنصّة', tone: 'purple' }
];

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'مدير المنصّة',
  owner: 'تاجر',
  staff: 'موظّف',
  delivery_driver: 'سائق',
  user: 'زبون'
};

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const res: any = await api.get('/admin/users');
      const list = res?.data?.users || res?.users || res;
      setUsers(Array.isArray(list) ? list : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggle = async (u: User) => {
    setBusy(u.id);
    try {
      await api.patch(`/admin/users/${u.id}/toggle`);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)));
      toast.success(u.isActive ? `أُوقف حساب ${u.name} — لن يستطيع الدخول` : `فُعّل حساب ${u.name}`);
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setBusy(null);
    }
  };

  const remove = async (u: User) => {
    if (!window.confirm(`حذف حساب «${u.name}» (${u.email}) نهائياً؟ لا يمكن التراجع عن هذا.`)) return;
    setBusy(u.id);
    try {
      await api.delete(`/admin/users/${u.id}`);
      setUsers((list) => list.filter((x) => x.id !== u.id));
      toast.success('حُذف الحساب');
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setBusy(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: users.length };
    ROLES.forEach((r) => (c[r.key] = users.filter((u) => u.role === r.key).length));
    return c;
  }, [users]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, '');
    return users
      .filter((u) => (role === 'all' || u.role === role) && (!q || [u.name, u.email, u.phone].some((f) => (f || '').toLowerCase().replace(/\s+/g, '').includes(q))))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users, query, role]);

  if (loading) return <Loader fullScreen variant="list" />;

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
                placeholder="الاسم، البريد أو الهاتف"
                aria-label="بحث في المستخدمين"
              />
            </label>
            <button type="button" className="ob-icon" onClick={refresh} aria-label="تحديث" title="تحديث">
              <IoRefresh size={18} className={refreshing ? 'ob-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="ob-tabs" role="tablist" aria-label="الدور">
          <button type="button" role="tab" aria-selected={role === 'all'} className="ob-tab" onClick={() => setRole('all')}>
            الكل <span>{counts.all}</span>
          </button>
          {ROLES.filter((r) => counts[r.key] > 0).map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={role === r.key}
              className={`ob-tab tone-${r.tone} has`}
              onClick={() => setRole(r.key)}
            >
              {r.label} <span>{counts[r.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="ob-list" aria-label="المستخدمون">
        <div className="ob-list-head">
          <span>
            {visible.length} من {users.length}
          </span>
          <span>الأحدث أولاً</span>
        </div>
        {visible.length === 0 ? (
          <div className="ob-empty">
            <b>لا نتائج</b>
            <p>جرّب كلمةً أخرى أو دوراً آخر.</p>
          </div>
        ) : (
          <ul className="ad-rows">
            {visible.map((u) => {
              const tone = ROLES.find((r) => r.key === u.role)?.tone || 'gray';
              const biz = u.restaurantId
                ? { label: u.restaurant?.name || 'مطعمه ←', to: `/admin/restaurants/${u.restaurantId}` }
                : u.storeId
                  ? { label: u.store?.name || 'متجره ←', to: `/admin/stores/${u.storeId}` }
                  : null;
              const protectedAccount = u.role === 'super_admin';
              return (
                <li key={u.id} className={`ad-row ${u.isActive ? '' : 'is-off'}`}>
                  <Link to={`/admin/users/${u.id}`} className="ad-row-main">
                    <span className="ad-avatar" aria-hidden="true" style={{ fontWeight: 900 }}>
                      {(u.name || '؟').trim().charAt(0)}
                    </span>
                    <span className="ad-row-text">
                      <b>{u.name}</b>
                      <small>
                        <bdi>{u.email}</bdi>
                        {u.phone && (
                          <>
                            {' · '}
                            <bdi>{u.phone}</bdi>
                          </>
                        )}
                      </small>
                    </span>
                  </Link>

                  <span className="ad-row-meta">
                    <span className={`ob-pill tone-${tone}`}>{ROLE_LABEL[u.role] || u.role}</span>
                    {biz && (
                      <Link to={biz.to} className="ad-biz-link">
                        {biz.label}
                      </Link>
                    )}
                    <span className="ad-date">{new Date(u.createdAt).toLocaleDateString('ar-SY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </span>

                  <span className="ad-row-actions">
                    {protectedAccount ? (
                      <span className="ad-date" style={{ marginInlineEnd: 'auto' }}>حسابٌ محميّ</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`pc-toggle ${u.isActive ? 'is-on' : ''}`}
                          role="switch"
                          aria-checked={u.isActive}
                          disabled={busy === u.id}
                          onClick={() => toggle(u)}
                          title={u.isActive ? 'نشط — اضغط للإيقاف' : 'موقوف — اضغط للتفعيل'}
                        >
                          <span className="pc-toggle-track"><span /></span>
                          <span>{u.isActive ? 'نشط' : 'موقوف'}</span>
                        </button>
                        <button type="button" className="pc-act is-danger" onClick={() => remove(u)} disabled={busy === u.id} aria-label={`حذف ${u.name}`} title="حذف">
                          <IoTrashOutline size={17} />
                        </button>
                      </>
                    )}
                    <Link to={`/admin/users/${u.id}`} className="pc-act" aria-label={`تفاصيل ${u.name}`}>
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

export default AdminUsers;
