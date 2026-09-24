// frontend/src/components/storefront/ItemComments.tsx
//
// التعليقات تحت المنتج أو الوجبة — نقاشٌ مفتوح لا تقييم.
//
// **الفرق عن `ProductReviews`:** ذاك آراء المشترين بالنجوم، ولا يُعرض بلا
// تقييمات لأن «لا تقييمات بعد» تزرع شكّاً. هنا العكس: القسم يظهر دائماً،
// لأن مكان السؤال نفسه هو الدعوة — زبونٌ لا يرى أين يسأل «هل فيها بصل؟»
// يغادر بلا جواب وبلا شراء. والقائمة الفارغة تقول «كن أوّل من يسأل» لا
// «لا أحد مهتمّ».
//
// **ردّ التاجر مميَّزٌ بشارة:** الجواب هو ما يبحث عنه القارئ، وضيفٌ سمّى
// نفسه «بوتيك ياسمين» لا يجوز أن يبدو كالمتجر نفسه — الشارة تأتي من الخادم
// (`isMerchantReply`) لا من الاسم.
//
// **النشر متفائل:** التعليق يظهر فور الضغط باهتاً ثم يثبت حين يؤكّده
// الخادم، ويُسحب مع إعادة النصّ إلى الحقل إن رُفض — فلا يضيع ما كتبه.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { IoChatbubblesOutline, IoCheckmarkCircle, IoSend } from 'react-icons/io5';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { useT } from '@/i18n/storefront';

export interface ItemCommentsProps {
  kind: 'product' | 'menuItem';
  itemId: string;
}

interface PublicComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  isMerchantReply: boolean;
  replies?: PublicComment[];
  /** محلّيّ: نُشر متفائلاً ولم يؤكّده الخادم بعد */
  pending?: boolean;
}

interface CommentsPage {
  comments: PublicComment[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const BODY_MAX = 1000;
const PAGE_SIZE = 10;
/** الاسم الذي كتبه الضيف آخر مرّة — راحةٌ لمن يعود ليسأل ثانيةً */
const NAME_KEY = 'sf_comment_name';

const readSavedName = (): string => {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
};
const saveName = (name: string) => {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* تخزينٌ محجوب — لا بأس */ }
};

/**
 * «منذ ٣ ساعات» بلغة الواجهة.
 *
 * نسبيٌّ لا مطلق: في نقاشٍ حيّ يهمّ القارئ إن كان السؤال قديماً فأُجيب
 * عنه أم طُرح للتوّ. وبعد شهرٍ يصير التاريخ نفسه أوضح من «منذ ٥ أسابيع».
 */
const relativeTime = (iso: string, lang: 'ar' | 'en'): string => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const locale = lang === 'en' ? 'en' : 'ar';
  if (abs < 45) return lang === 'en' ? 'just now' : 'الآن';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / (86400 * 7)), 'week');
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-SY', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

// ظلّ التحميل بألوان المتجر نفسه — لا دائرةٌ تدور (قرار المالك)، بل هيئة
// ما سيأتي: دائرةٌ للحرف الأوّل وسطران للنصّ
const shimmerCss = `
@keyframes sf-ic-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.sf-ic-skel {
  display: block;
  background: linear-gradient(90deg, var(--sf-surface, #EEF3EF) 25%, var(--sf-card, #FFFFFF) 50%, var(--sf-surface, #EEF3EF) 75%);
  background-size: 200% 100%;
  animation: sf-ic-shimmer 1.4s ease-in-out infinite;
  border-radius: 8px;
}
.sf-ic-field:focus { outline: none; border-color: var(--sf-accent) !important; box-shadow: 0 0 0 3px var(--sf-accent-soft); }
@media (prefers-reduced-motion: reduce) { .sf-ic-skel { animation: none; } }
`;

const Skeleton: React.FC = () => (
  <div aria-hidden="true" style={{ display: 'grid', gap: 12 }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 0' }}>
        <span className="sf-ic-skel" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'grid', gap: 8, paddingTop: 3 }}>
          <span className="sf-ic-skel" style={{ width: '32%', height: 11 }} />
          <span className="sf-ic-skel" style={{ width: i === 1 ? '64%' : '88%', height: 11 }} />
        </div>
      </div>
    ))}
  </div>
);

const Avatar: React.FC<{ name: string; merchant?: boolean; size?: number }> = ({ name, merchant, size = 32 }) => (
  <span
    aria-hidden="true"
    style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: merchant ? sf.accent : sf.primarySoft,
      color: merchant ? sf.onAccent : sf.text,
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.4, fontWeight: 800
    }}
  >
    {(name || '؟').trim().charAt(0)}
  </span>
);

const ItemComments: React.FC<ItemCommentsProps> = ({ kind, itemId }) => {
  const { t, lang } = useT();
  const { user, isAuthenticated } = useAuth();

  const [comments, setComments] = useState<PublicComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const [body, setBody] = useState('');
  const [name, setName] = useState(readSavedName);
  const [posting, setPosting] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const base = kind === 'product' ? `/comments/product/${itemId}` : `/comments/menu-item/${itemId}`;
  const merchantLabel = kind === 'product' ? t('ردّ المتجر') : t('ردّ المطعم');
  const accountName = isAuthenticated ? (user?.name || '').trim() : '';

  const fetchPage = useCallback(async (p: number): Promise<CommentsPage | null> => {
    try {
      return await api.get<CommentsPage>(`${base}?page=${p}&limit=${PAGE_SIZE}`);
    } catch {
      return null;
    }
  }, [base]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    (async () => {
      const data = await fetchPage(1);
      if (cancelled) return;
      if (data) {
        setComments(data.comments || []);
        setTotal(data.total || 0);
        setHasMore(!!data.hasMore);
        setPage(1);
      } else {
        // القسم إضافةٌ لا شرط: فشله لا يُعرض خطأً أحمر فوق صفحة شراء
        setFailed(true);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchPage]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    const data = await fetchPage(next);
    if (data) {
      // تعليقٌ نُشر بعد الصفحة الأولى يُزيح الإزاحة صفّاً، فيعود آخرُ ما
      // عُرض في أوّل التالية — نُسقط المكرَّر بالمعرّف
      setComments((list) => {
        const seen = new Set(list.map((c) => c.id));
        return [...list, ...(data.comments || []).filter((c) => !seen.has(c.id))];
      });
      setTotal(data.total || 0);
      setHasMore(!!data.hasMore);
      setPage(next);
    } else {
      toast.error(t('تعذّر تحميل المزيد'));
    }
    setLoadingMore(false);
  };

  const trimmed = body.trim();
  const authorName = accountName || name.trim();
  const canPost = !posting && trimmed.length >= 2 && trimmed.length <= BODY_MAX && authorName.length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPost) {
      if (authorName.length < 2) toast.error(t('اكتب اسمك ليظهر مع تعليقك'));
      else if (trimmed.length < 2) textRef.current?.focus();
      return;
    }

    const tempId = `tmp-${Date.now()}`;
    const optimistic: PublicComment = {
      id: tempId,
      authorName,
      body: trimmed,
      createdAt: new Date().toISOString(),
      isMerchantReply: false,
      replies: [],
      pending: true
    };

    setPosting(true);
    setComments((list) => [optimistic, ...list]);
    setTotal((n) => n + 1);
    setBody('');
    if (!accountName) saveName(name.trim());

    try {
      const created = await api.post<PublicComment>(base, {
        body: trimmed,
        ...(accountName ? {} : { authorName: name.trim() })
      });
      setComments((list) => list.map((c) => (c.id === tempId ? { ...created, replies: created.replies || [] } : c)));
      toast.success(t('نُشر تعليقك'));
    } catch (err: any) {
      // سحب المتفائل وإعادة النصّ: من كتب فقرةً لا يجوز أن يخسرها لخطأ شبكة
      setComments((list) => list.filter((c) => c.id !== tempId));
      setTotal((n) => Math.max(0, n - 1));
      setBody(trimmed);
      // المعرّف = النصّ: عميل الـ API قد عرض رسالة الخادم نفسها، فلا تتكرّر.
      // وبلا ردٍّ أصلاً (انقطاع) يعرض العميل رسالة الاتصال بنفسه
      const serverMessage: string | undefined = err?.response?.data?.error;
      if (serverMessage) toast.error(serverMessage, { id: serverMessage });
      else if (err?.response) toast.error(t('تعذّر نشر التعليق، حاول مجدداً'));
    } finally {
      setPosting(false);
    }
  };

  const heading = useMemo(() => (
    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: sf.text, display: 'flex', alignItems: 'center', gap: 8 }}>
      <IoChatbubblesOutline size={19} aria-hidden="true" />
      {t('التعليقات')}
      {total > 0 && (
        <span style={{
          fontSize: 12, fontWeight: 800, color: sf.muted, background: sf.surface,
          borderRadius: sd.rChip, padding: '1px 9px', fontVariantNumeric: 'tabular-nums'
        }}>
          {total}
        </span>
      )}
    </h2>
  ), [t, total]);

  // فشل التحميل الأوّل: القسم يختفي كلّه بدل أن يدعو للتعليق على قائمةٍ لم تُقرأ
  if (failed && !loading) return null;

  const fieldStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: sf.card, color: sf.text,
    border: `${sd.borderW} solid ${sf.border}`, borderRadius: sd.rInput,
    fontFamily: sf.font, fontSize: 14, padding: '10px 12px'
  };

  return (
    <section
      aria-label={t('التعليقات')}
      style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${sf.border}`, fontFamily: sf.font }}
    >
      <style>{shimmerCss}</style>

      <div style={{ marginBottom: 14 }}>{heading}</div>

      {/* ===== الكتابة ===== */}
      <form
        onSubmit={submit}
        style={{
          background: sf.surface, borderRadius: sd.rCard, padding: sd.padCard,
          display: 'grid', gap: 10, marginBottom: 18
        }}
      >
        {!accountName && (
          <input
            className="sf-ic-field"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 60))}
            placeholder={t('اسمك')}
            aria-label={t('اسمك')}
            autoComplete="name"
            maxLength={60}
            style={fieldStyle}
          />
        )}
        <textarea
          ref={textRef}
          className="sf-ic-field"
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
          placeholder={kind === 'product' ? t('اسأل عن المنتج أو شارك رأيك…') : t('اسأل عن الوجبة أو شارك رأيك…')}
          aria-label={t('اكتب تعليقك')}
          rows={3}
          maxLength={BODY_MAX}
          style={{ ...fieldStyle, resize: 'vertical', minHeight: 84, lineHeight: 1.7 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: sf.muted, flex: 1, minWidth: 0 }}>
            {accountName
              ? <>{t('تعلّق باسم')} <b style={{ color: sf.text }}>{accountName}</b></>
              : t('يظهر اسمك مع التعليق')}
            {body.length > BODY_MAX * 0.8 && (
              <span style={{ marginInlineStart: 8, fontVariantNumeric: 'tabular-nums' }}>
                {body.length}/{BODY_MAX}
              </span>
            )}
          </span>
          <button
            type="submit"
            disabled={!canPost}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              minHeight: 40, padding: '0 18px',
              borderRadius: sd.rButton, border: 0,
              background: sf.accent, color: sf.onAccent,
              fontFamily: sf.font, fontSize: 14, fontWeight: 800,
              cursor: canPost ? 'pointer' : 'not-allowed',
              opacity: canPost ? 1 : 0.55
            }}
          >
            <IoSend size={15} aria-hidden="true" style={{ transform: lang === 'en' ? undefined : 'scaleX(-1)' }} />
            {posting ? t('جارٍ النشر…') : t('نشر')}
          </button>
        </div>
      </form>

      {/* ===== القائمة ===== */}
      {loading ? (
        <Skeleton />
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '18px 12px 6px', color: sf.muted }}>
          <IoChatbubblesOutline size={30} aria-hidden="true" style={{ opacity: 0.55 }} />
          <p style={{ margin: '6px 0 2px', fontSize: 14, fontWeight: 800, color: sf.text }}>{t('لا تعليقات بعد')}</p>
          <p style={{ margin: 0, fontSize: 12.5 }}>
            {kind === 'product' ? t('كن أوّل من يسأل عن هذا المنتج.') : t('كن أوّل من يسأل عن هذه الوجبة.')}
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 14 }}>
          {comments.map((c) => (
            <li key={c.id} style={{ opacity: c.pending ? 0.6 : 1, transition: 'opacity .2s ease' }}>
              <article style={{ display: 'flex', gap: 10 }}>
                <Avatar name={c.authorName} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13, color: sf.text }}><bdi>{c.authorName}</bdi></b>
                    <time dateTime={c.createdAt} style={{ fontSize: 11.5, color: sf.muted }}>
                      {c.pending ? t('جارٍ النشر…') : relativeTime(c.createdAt, lang)}
                    </time>
                  </div>
                  <p style={{
                    margin: '3px 0 0', fontSize: 13.5, color: sf.text, lineHeight: 1.8,
                    whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'
                  }}>
                    {c.body}
                  </p>

                  {/* ردود التاجر — مسافةٌ وخطٌّ جانبيّ بلون الفعل */}
                  {(c.replies || []).map((r) => (
                    <div
                      key={r.id}
                      style={{
                        marginTop: 10, padding: '10px 12px',
                        background: sf.accentSoft, borderRadius: sd.rImage,
                        borderInlineStart: `3px solid ${sf.accent}`,
                        display: 'flex', gap: 9
                      }}
                    >
                      <Avatar name={r.authorName} merchant={r.isMerchantReply} size={26} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <b style={{ fontSize: 12.5, color: sf.text }}><bdi>{r.authorName}</bdi></b>
                          {r.isMerchantReply && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              fontSize: 10.5, fontWeight: 800,
                              color: sf.onAccent, background: sf.accent,
                              borderRadius: sd.rChip, padding: '1px 8px'
                            }}>
                              <IoCheckmarkCircle size={11} aria-hidden="true" />
                              {merchantLabel}
                            </span>
                          )}
                          <time dateTime={r.createdAt} style={{ fontSize: 11, color: sf.muted }}>
                            {relativeTime(r.createdAt, lang)}
                          </time>
                        </div>
                        <p style={{
                          margin: '3px 0 0', fontSize: 13, color: sf.text, lineHeight: 1.8,
                          whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'
                        }}>
                          {r.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {!loading && hasMore && (
        <div style={{ marginTop: 16 }}>
          {loadingMore ? (
            <Skeleton />
          ) : (
            <button
              type="button"
              onClick={loadMore}
              style={{
                width: '100%', minHeight: 42,
                borderRadius: sd.rButton,
                border: `${sd.borderW} solid ${sf.border}`,
                background: sf.card, color: sf.text,
                fontFamily: sf.font, fontSize: 13.5, fontWeight: 800, cursor: 'pointer'
              }}
            >
              {t('عرض المزيد')}
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default ItemComments;
