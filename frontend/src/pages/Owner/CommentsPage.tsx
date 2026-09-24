// pages/Owner/CommentsPage.tsx — تعليقات الزبائن على المنتجات والوجبات
//
// شاشةٌ واحدة للمتجر والمطعم: النشاط يُشتقّ من الرمز في الخادم لا من المسار،
// فالمساران `/store/comments` و`/restaurant/comments` يفتحانها نفسها.
//
// **الردّ في مكانه لا في نافذة:** التاجر يجيب سؤالاً، والسؤال يجب أن يبقى
// أمام عينه وهو يكتب. نافذةٌ فوق القائمة تُخفي بالضبط ما يُجاب عنه.
//
// **الإخفاء قبل الحذف:** المفتاح في كل صفّ يُخفي التعليق عن الواجهة ويُبقيه
// هنا دليلاً؛ الحذف النهائيّ خلف تأكيد، لما لا يستحقّ حتى البقاء (رقم هاتفٍ
// نُشر بالخطأ، إعلانٌ صريح).
//
// **البحث في الخادم لا هنا:** القائمة صفحاتٌ، والبحث في المحمَّل وحده يقول
// «لا نتائج» عن تعليقٍ موجودٍ في الصفحة الثالثة.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  IoArrowUndoOutline,
  IoBagHandleOutline,
  IoRefresh,
  IoSearch,
  IoTrashOutline
} from 'react-icons/io5';
import api from '../../services/api';
import '@/styles/orders.css';
import '@/styles/catalog.css';
import '@/styles/comments.css';

type Status = 'all' | 'visible' | 'hidden';

interface Reply {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  isHidden: boolean;
  isMerchantReply: boolean;
}

interface ManagedComment extends Reply {
  isGuest: boolean;
  item: { kind: 'product' | 'menuItem'; id: string; name: string; image: string | null } | null;
  replies: Reply[];
}

interface ManageResponse {
  comments: ManagedComment[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  counts: { all: number; visible: number; hidden: number };
}

const TABS: Array<{ key: Status; label: string; tone?: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'visible', label: 'ظاهرة', tone: 'green' },
  { key: 'hidden', label: 'مخفية', tone: 'gray' }
];

const REPLY_MAX = 1000;
const PAGE_SIZE = 20;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ar-SY', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** ظلّ القائمة بهيئة الصفّ: صورةٌ واسمٌ ثم سطرا نصّ ثم الأزرار */
const RowsSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <ul className="cm-rows" aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <li key={i} className="cm-row">
        <div className="cm-head">
          <span className="cm-sk" style={{ width: 40, height: 40, borderRadius: 11 }} />
          <div className="cm-head-text" style={{ gap: 7 }}>
            <span className="cm-sk" style={{ width: '38%', height: 12 }} />
            <span className="cm-sk" style={{ width: '22%', height: 10 }} />
          </div>
        </div>
        <span className="cm-sk" style={{ width: i % 2 ? '72%' : '92%', height: 12 }} />
        <span className="cm-sk" style={{ width: '46%', height: 12 }} />
      </li>
    ))}
  </ul>
);

const CommentsPage: React.FC = () => {
  const [comments, setComments] = useState<ManagedComment[]>([]);
  const [counts, setCounts] = useState({ all: 0, visible: 0, hidden: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [status, setStatus] = useState<Status>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // طلبٌ قديم يصل بعد أحدث منه لا يكتب فوقه — الكتابة السريعة في البحث
  // تُطلق عدّة طلبات يعود أبطؤها أخيراً
  const requestSeq = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(id);
  }, [query]);

  const fetchPage = useCallback(
    (p: number) => {
      const params = new URLSearchParams({ status, page: String(p), limit: String(PAGE_SIZE) });
      if (debouncedQuery) params.set('q', debouncedQuery);
      return api.get<ManageResponse>(`/comments/manage?${params.toString()}`);
    },
    [status, debouncedQuery]
  );

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const data = await fetchPage(1);
      if (seq !== requestSeq.current) return;
      setComments(data?.comments || []);
      setCounts(data?.counts || { all: 0, visible: 0, hidden: 0 });
      setTotal(data?.total || 0);
      setHasMore(!!data?.hasMore);
      setPage(1);
    } catch {
      if (seq === requestSeq.current) setComments([]);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await fetchPage(next);
      setComments((list) => {
        const seen = new Set(list.map((c) => c.id));
        return [...list, ...(data?.comments || []).filter((c) => !seen.has(c.id))];
      });
      setHasMore(!!data?.hasMore);
      setTotal(data?.total || 0);
      setPage(next);
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setLoadingMore(false);
    }
  };

  // ==================== الإخفاء ====================

  const toggleHidden = async (c: ManagedComment) => {
    setBusy(c.id);
    const isHidden = !c.isHidden;
    try {
      await api.patch(`/comments/${c.id}/visibility`, { isHidden });
      setCounts((n) => ({
        all: n.all,
        visible: n.visible + (isHidden ? -1 : 1),
        hidden: n.hidden + (isHidden ? 1 : -1)
      }));
      // تبويب «ظاهرة» لا يُبقي ما أُخفي للتوّ، والعكس — وإلا بدا المفتاح بلا أثر
      if (status !== 'all') {
        setComments((list) => list.filter((x) => x.id !== c.id));
        setTotal((n) => Math.max(0, n - 1));
      } else {
        setComments((list) => list.map((x) => (x.id === c.id ? { ...x, isHidden } : x)));
      }
      toast.success(isHidden ? 'أُخفي التعليق عن الزبائن' : 'صار التعليق ظاهراً للزبائن');
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setBusy(null);
    }
  };

  // ==================== الحذف ====================

  const remove = async (c: ManagedComment) => {
    const replies = c.replies.length ? ' وردودك عليه' : '';
    if (!window.confirm(`حذف تعليق «${c.authorName}»${replies} نهائياً؟\nالإخفاء يكفي غالباً — الحذف لا يُتراجع عنه.`)) return;
    setBusy(c.id);
    try {
      await api.delete(`/comments/${c.id}`);
      setComments((list) => list.filter((x) => x.id !== c.id));
      setTotal((n) => Math.max(0, n - 1));
      setCounts((n) => ({
        all: Math.max(0, n.all - 1),
        visible: n.visible - (c.isHidden ? 0 : 1),
        hidden: n.hidden - (c.isHidden ? 1 : 0)
      }));
      toast.success('حُذف التعليق');
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setBusy(null);
    }
  };

  const removeReply = async (parent: ManagedComment, r: Reply) => {
    if (!window.confirm('حذف ردّك هذا؟')) return;
    setBusy(r.id);
    try {
      await api.delete(`/comments/${r.id}`);
      setComments((list) =>
        list.map((x) => (x.id === parent.id ? { ...x, replies: x.replies.filter((y) => y.id !== r.id) } : x))
      );
      toast.success('حُذف الردّ');
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setBusy(null);
    }
  };

  // ==================== الردّ ====================

  const openReply = (c: ManagedComment) => {
    setReplyingTo(c.id);
    setReplyText('');
    // بعد الرسم: الحقل لم يوجد بعد لحظة الضغط
    window.setTimeout(() => replyRef.current?.focus(), 0);
  };

  const sendReply = async (c: ManagedComment) => {
    const body = replyText.trim();
    if (body.length < 2) {
      replyRef.current?.focus();
      return;
    }
    setBusy(c.id);
    try {
      const reply = await api.post<Reply>(`/comments/${c.id}/reply`, { body });
      setComments((list) => list.map((x) => (x.id === c.id ? { ...x, replies: [...x.replies, reply] } : x)));
      setReplyingTo(null);
      setReplyText('');
      toast.success(c.isHidden ? 'نُشر الردّ — والتعليق ما يزال مخفياً' : 'نُشر ردّك تحت التعليق');
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setBusy(null);
    }
  };

  const tabCount = (key: Status) => counts[key];

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
                placeholder="نصّ التعليق، اسم الكاتب أو الصنف"
                aria-label="بحث في التعليقات"
              />
            </label>
            <button
              type="button"
              className="ob-icon"
              onClick={refresh}
              disabled={refreshing}
              aria-label="تحديث"
              title="تحديث"
              style={{ opacity: refreshing ? 0.5 : 1 }}
            >
              <IoRefresh size={18} />
            </button>
          </div>
        </div>

        <div className="ob-tabs" role="tablist" aria-label="حالة التعليق">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={status === tab.key}
              className={`ob-tab ${tab.tone ? `tone-${tab.tone} has` : ''}`}
              onClick={() => setStatus(tab.key)}
            >
              {tab.label} <span>{tabCount(tab.key)}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="ob-list" aria-label="التعليقات" aria-busy={loading}>
        <div className="ob-list-head">
          <span>{loading ? 'جارٍ التحميل…' : `${comments.length} من ${total}`}</span>
          <span>الأحدث أولاً</span>
        </div>

        {loading ? (
          <RowsSkeleton />
        ) : comments.length === 0 ? (
          <div className="ob-empty">
            {debouncedQuery || status !== 'all' ? (
              <>
                <b>لا نتائج</b>
                <p>جرّب كلمةً أخرى أو تبويباً آخر.</p>
              </>
            ) : (
              <>
                <b>لا تعليقات بعد</b>
                <p>حين يسأل زبونٌ عن منتجٍ أو وجبة من صفحة الصنف، يظهر سؤاله هنا ويصلك إشعارٌ لتردّ عليه.</p>
              </>
            )}
          </div>
        ) : (
          <ul className="cm-rows">
            {comments.map((c) => {
              const isBusy = busy === c.id;
              const replying = replyingTo === c.id;
              return (
                <li key={c.id} className={`cm-row ${c.isHidden ? 'is-hidden' : ''}`}>
                  <div className="cm-head">
                    <span className="cm-thumb" aria-hidden="true">
                      {c.item?.image ? <img src={c.item.image} alt="" loading="lazy" /> : <IoBagHandleOutline size={18} />}
                    </span>
                    <span className="cm-head-text">
                      <b>{c.item?.name || 'صنفٌ محذوف'}</b>
                      <small>
                        <bdi style={{ fontWeight: 700, color: '#10231b' }}>{c.authorName}</bdi>
                        {c.isGuest && <span className="ob-pill is-soft">ضيف</span>}
                        {c.isHidden && <span className="ob-pill tone-gray">مخفيّ</span>}
                      </small>
                    </span>
                    <time className="cm-date" dateTime={c.createdAt}>{formatDate(c.createdAt)}</time>
                  </div>

                  <p className="cm-body">{c.body}</p>

                  {c.replies.length > 0 && (
                    <div className="cm-replies">
                      {c.replies.map((r) => (
                        <div key={r.id} className="cm-reply">
                          <div className="cm-reply-head">
                            <b>{r.isMerchantReply ? 'ردّك' : r.authorName}</b>
                            <span>· {formatDate(r.createdAt)}</span>
                            {r.isHidden && <span className="ob-pill tone-gray">مخفيّ</span>}
                            <button
                              type="button"
                              className="pc-act is-danger"
                              style={{ width: 30, height: 30, marginInlineStart: 'auto' }}
                              onClick={() => removeReply(c, r)}
                              disabled={busy === r.id}
                              aria-label="حذف الردّ"
                              title="حذف الردّ"
                            >
                              <IoTrashOutline size={15} />
                            </button>
                          </div>
                          <p>{r.body}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {replying && (
                    <div className="cm-composer">
                      <textarea
                        ref={replyRef}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value.slice(0, REPLY_MAX))}
                        placeholder="اكتب ردّك — يظهر للزبائن باسم نشاطك"
                        aria-label={`الردّ على ${c.authorName}`}
                        maxLength={REPLY_MAX}
                        onKeyDown={(e) => {
                          // Ctrl/⌘ + Enter للإرسال — من يردّ على عشرين سؤالاً لا يمدّ يده للفأرة كل مرّة
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply(c);
                          if (e.key === 'Escape') setReplyingTo(null);
                        }}
                      />
                      <div className="cm-composer-foot">
                        <small>{replyText.length}/{REPLY_MAX}</small>
                        <button type="button" className="ss-btn ss-btn-ghost" onClick={() => setReplyingTo(null)} disabled={isBusy}>
                          إلغاء
                        </button>
                        <button
                          type="button"
                          className="ss-btn ss-btn-primary"
                          onClick={() => sendReply(c)}
                          disabled={isBusy || replyText.trim().length < 2}
                        >
                          {isBusy ? 'جارٍ النشر…' : 'نشر الردّ'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="cm-actions">
                    <button
                      type="button"
                      className={`pc-toggle ${c.isHidden ? '' : 'is-on'}`}
                      role="switch"
                      aria-checked={!c.isHidden}
                      disabled={isBusy}
                      onClick={() => toggleHidden(c)}
                      title={c.isHidden ? 'مخفيّ عن الزبائن — اضغط للإظهار' : 'ظاهرٌ للزبائن — اضغط للإخفاء'}
                    >
                      <span className="pc-toggle-track"><span /></span>
                      <span>{c.isHidden ? 'مخفيّ' : 'ظاهر'}</span>
                    </button>
                    {!replying && (
                      <button type="button" className="cm-reply-btn" onClick={() => openReply(c)} disabled={isBusy}>
                        <IoArrowUndoOutline size={16} aria-hidden="true" />
                        {c.replies.length ? 'ردٌّ آخر' : 'ردّ'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="pc-act is-danger"
                      onClick={() => remove(c)}
                      disabled={isBusy}
                      aria-label={`حذف تعليق ${c.authorName}`}
                      title="حذف نهائي"
                    >
                      <IoTrashOutline size={17} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && hasMore && (
          loadingMore ? (
            <RowsSkeleton rows={2} />
          ) : (
            <div className="cm-more">
              <button type="button" className="ss-btn ss-btn-ghost" onClick={loadMore}>
                عرض المزيد
              </button>
            </div>
          )
        )}
      </section>
    </div>
  );
};

export default CommentsPage;
