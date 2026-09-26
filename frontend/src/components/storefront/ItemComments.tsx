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
// **القراءة للجميع، والكتابة والتفاعل بحساب (قرار المالك).** الاسم المكتوب
// كان قناعاً يمدح به أيٌّ كان أو يذمّ. الضيف يرى النقاش كاملاً، ومكان
// الحقل دعوةٌ للدخول تعيده إلى الصفحة نفسها بعده (`redirectAfterLogin` —
// النمط نفسه الذي تعتمده السلّة). تعليقات الضيوف القديمة تبقى معروضة.
//
// **ردّ التاجر مميَّزٌ بشارة:** الجواب هو ما يبحث عنه القارئ، وزبونٌ سمّى
// نفسه «بوتيك ياسمين» لا يجوز أن يبدو كالمتجر نفسه — الشارة تأتي من الخادم
// (`isMerchantReply`) لا من الاسم.
//
// **النشر والتفاعل متفائلان:** التعليق يظهر فور الضغط باهتاً ثم يثبت حين
// يؤكّده الخادم، ويُسحب مع إعادة النصّ إلى الحقل إن رُفض — فلا يضيع ما
// كتبه. والإعجاب يُلوَّن ويُعدّ فوراً، ويعود كما كان إن فشل الحفظ.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IoChatbubblesOutline,
  IoCheckmarkCircle,
  IoLogInOutline,
  IoSend,
  IoThumbsDown,
  IoThumbsDownOutline,
  IoThumbsUp,
  IoThumbsUpOutline
} from 'react-icons/io5';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { useT } from '@/i18n/storefront';

export interface ItemCommentsProps {
  kind: 'product' | 'menuItem';
  itemId: string;
}

type Reaction = 1 | -1 | 0;
type SortMode = 'newest' | 'top';

interface PublicComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  isMerchantReply: boolean;
  likes?: number;
  dislikes?: number;
  /** تفاعل القارئ نفسه — صفرٌ للضيف ولمن لم يتفاعل */
  myReaction?: Reaction;
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

interface ReactionResult {
  id: string;
  likes: number;
  dislikes: number;
  myReaction: Reaction;
}

const BODY_MAX = 1000;
const PAGE_SIZE = 10;

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

/** العدّادان بعد الانتقال من تفاعلٍ إلى آخر — نفس حساب الخادم */
const applyReaction = (c: PublicComment, next: Reaction): PublicComment => {
  const prev = c.myReaction || 0;
  return {
    ...c,
    myReaction: next,
    likes: Math.max(0, (c.likes || 0) + (next === 1 ? 1 : 0) - (prev === 1 ? 1 : 0)),
    dislikes: Math.max(0, (c.dislikes || 0) + (next === -1 ? 1 : 0) - (prev === -1 ? 1 : 0))
  };
};

/** يطبّق `fn` على التعليق أو الردّ صاحب المعرّف أينما كان في الشجرة */
const mapComment = (
  list: PublicComment[],
  id: string,
  fn: (c: PublicComment) => PublicComment
): PublicComment[] =>
  list.map((c) => {
    if (c.id === id) return fn(c);
    if (c.replies?.some((r) => r.id === id)) {
      return { ...c, replies: c.replies.map((r) => (r.id === id ? fn(r) : r)) };
    }
    return c;
  });

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
.sf-ic-react:focus-visible, .sf-ic-sort:focus-visible, .sf-ic-cta:focus-visible { outline: 2px solid var(--sf-accent); outline-offset: 2px; }
.sf-ic-react:hover { background: var(--sf-surface, #EEF3EF); }
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

/**
 * زرّا الإعجاب وعدمه تحت تعليقٍ أو ردّ.
 *
 * `aria-pressed` يقول لقارئ الشاشة أيّهما ضغطه القارئ، والعدد جزءٌ من
 * الاسم المقروء («أعجبني، 4»). وللضيف يبقى الزرّ فعّالاً: نقرته تدعوه
 * للدخول بدل أن يبدو معطّلاً بلا سبب.
 */
const ReactionBar: React.FC<{
  comment: PublicComment;
  onReact: (c: PublicComment, value: 1 | -1) => void;
  small?: boolean;
}> = ({ comment, onReact, small }) => {
  const { t } = useT();
  const mine = comment.myReaction || 0;
  const disabled = !!comment.pending;
  const size = small ? 14 : 15;

  const btn = (value: 1 | -1) => {
    const active = mine === value;
    const count = value === 1 ? comment.likes || 0 : comment.dislikes || 0;
    const label = value === 1 ? t('أعجبني') : t('لم يعجبني');
    const Icon = value === 1 ? (active ? IoThumbsUp : IoThumbsUpOutline) : (active ? IoThumbsDown : IoThumbsDownOutline);
    return (
      <button
        type="button"
        className="sf-ic-react"
        aria-pressed={active}
        aria-label={`${label} (${count})`}
        title={label}
        disabled={disabled}
        onClick={() => onReact(comment, value)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          minHeight: 30, minWidth: 44, padding: '0 9px',
          borderRadius: sd.rChip,
          border: `1px solid ${active ? sf.accent : 'transparent'}`,
          background: active ? sf.accentSoft : 'transparent',
          color: active ? sf.accent : sf.muted,
          fontFamily: sf.font, fontSize: 12, fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'background .15s ease, color .15s ease'
        }}
      >
        <Icon size={size} aria-hidden="true" />
        <span aria-hidden="true">{count}</span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 4, marginInlineStart: -9 }}>
      {btn(1)}
      {btn(-1)}
    </div>
  );
};

const ItemComments: React.FC<ItemCommentsProps> = ({ kind, itemId }) => {
  const { t, lang } = useT();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [comments, setComments] = useState<PublicComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sort, setSort] = useState<SortMode>('newest');

  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  /** تعليقاتٌ ينتظر تفاعلها ردّ الخادم — نقرةٌ ثانية قبل الردّ تُتجاهَل */
  const reacting = useRef<Set<string>>(new Set());

  const base = kind === 'product' ? `/comments/product/${itemId}` : `/comments/menu-item/${itemId}`;
  const merchantLabel = kind === 'product' ? t('ردّ المتجر') : t('ردّ المطعم');
  const accountName = isAuthenticated ? (user?.name || '').trim() : '';
  // المعرّف في مفتاح الجلب: الدخول أو الخروج يعيد القراءة، فتظهر أزرار
  // القارئ الجديد ملوّنةً بتفاعله هو لا بتفاعل من سبقه على الجهاز
  const viewerKey = isAuthenticated ? user?.id || 'user' : 'guest';

  const fetchPage = useCallback(async (p: number): Promise<CommentsPage | null> => {
    try {
      return await api.get<CommentsPage>(`${base}?page=${p}&limit=${PAGE_SIZE}&sort=${sort}`);
    } catch {
      return null;
    }
    // viewerKey: الرمز يُرسل تلقائياً، والمفتاح يُجبر إعادة الجلب حين يتغيّر
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, sort, viewerKey]);

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

  /**
   * إلى صفحة الدخول ثم العودة إلى هنا.
   *
   * المسار الحاليّ نفسه (بنطاقه الفرعيّ أو المخصّص — `navigate` نسبيٌّ إلى
   * المضيف)، وتعيده إليه صفحتا الدخول والتسجيل بعد النجاح.
   */
  const goToLogin = useCallback(() => {
    try {
      localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
    } catch {
      /* التصفّح الخاص قد يمنع التخزين — الدخول يبقى ممكناً */
    }
    navigate('/user/login');
  }, [navigate]);

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

  /**
   * إعجابٌ أو عدمه — والضغط على الزرّ المضغوط يُلغيه.
   *
   * يُرسَل التفاعل المقصود صريحاً (1/-1/0) لا «اقلب»: إعادة الطلب بعد
   * انقطاعٍ لا تعكس ما أراده القارئ.
   */
  const react = async (c: PublicComment, value: 1 | -1) => {
    if (!isAuthenticated) {
      toast(t('سجّل الدخول لتتفاعل مع التعليقات'), { id: 'ic-login' });
      goToLogin();
      return;
    }
    if (c.pending || reacting.current.has(c.id)) return;

    const next: Reaction = (c.myReaction || 0) === value ? 0 : value;
    const before = { likes: c.likes, dislikes: c.dislikes, myReaction: c.myReaction };
    reacting.current.add(c.id);
    setComments((list) => mapComment(list, c.id, (x) => applyReaction(x, next)));

    try {
      const saved = await api.put<ReactionResult>(`/comments/${c.id}/reaction`, { value: next });
      // أرقام الخادم هي الحقيقة: غيرنا ربما تفاعل في اللحظة نفسها
      setComments((list) => mapComment(list, c.id, (x) => ({
        ...x, likes: saved.likes, dislikes: saved.dislikes, myReaction: saved.myReaction
      })));
    } catch (err: any) {
      setComments((list) => mapComment(list, c.id, (x) => ({ ...x, ...before })));
      if (err?.response?.status === 401) {
        goToLogin();
      } else if (err?.response && (err.response.status === 404 || !err.response.data?.error)) {
        // رسالة الخادم يعرضها عميل الـ API بنفسه — إلا الـ404 (تعليقٌ أخفاه
        // التاجر للتوّ) فيسكت عنه العميل، وبلا رسالةٍ يبدو الزرّ معطّلاً
        toast.error(t('تعذّر حفظ تفاعلك'), { id: 'ic-react-failed' });
      }
    } finally {
      reacting.current.delete(c.id);
    }
  };

  const trimmed = body.trim();
  const canPost = isAuthenticated && !posting && trimmed.length >= 2 && trimmed.length <= BODY_MAX;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { goToLogin(); return; }
    if (!canPost) {
      if (trimmed.length < 2) textRef.current?.focus();
      return;
    }

    const tempId = `tmp-${Date.now()}`;
    const optimistic: PublicComment = {
      id: tempId,
      authorName: accountName || '…',
      body: trimmed,
      createdAt: new Date().toISOString(),
      isMerchantReply: false,
      likes: 0,
      dislikes: 0,
      myReaction: 0,
      replies: [],
      pending: true
    };

    setPosting(true);
    setComments((list) => [optimistic, ...list]);
    setTotal((n) => n + 1);
    setBody('');

    try {
      const created = await api.post<PublicComment>(base, { body: trimmed });
      setComments((list) => list.map((c) => (c.id === tempId ? { ...created, replies: created.replies || [] } : c)));
      toast.success(t('نُشر تعليقك'));
    } catch (err: any) {
      // سحب المتفائل وإعادة النصّ: من كتب فقرةً لا يجوز أن يخسرها لخطأ شبكة
      setComments((list) => list.filter((c) => c.id !== tempId));
      setTotal((n) => Math.max(0, n - 1));
      setBody(trimmed);
      if (err?.response?.status === 401) {
        // جلسةٌ انتهت بين فتح الصفحة والنشر — النصّ في الحقل، والدخول يعيده هنا
        toast(t('سجّل الدخول لتعلّق'), { id: 'ic-login' });
        goToLogin();
        return;
      }
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

  const sortButton = (mode: SortMode, label: string) => (
    <button
      type="button"
      className="sf-ic-sort"
      aria-pressed={sort === mode}
      onClick={() => setSort(mode)}
      style={{
        minHeight: 30, padding: '0 11px', borderRadius: sd.rChip,
        border: `1px solid ${sort === mode ? sf.accent : sf.border}`,
        background: sort === mode ? sf.accentSoft : 'transparent',
        color: sort === mode ? sf.accent : sf.muted,
        fontFamily: sf.font, fontSize: 12, fontWeight: 800, cursor: 'pointer'
      }}
    >
      {label}
    </button>
  );

  return (
    <section
      aria-label={t('التعليقات')}
      style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${sf.border}`, fontFamily: sf.font }}
    >
      <style>{shimmerCss}</style>

      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>{heading}</div>
        {/* الترتيب يستحقّ مكانه حين يوجد ما يُرتَّب */}
        {total > 1 && (
          <div role="group" aria-label={t('ترتيب التعليقات')} style={{ display: 'flex', gap: 6 }}>
            {sortButton('newest', t('الأحدث'))}
            {sortButton('top', t('الأكثر إعجاباً'))}
          </div>
        )}
      </div>

      {/* ===== الكتابة — أو الدعوة للدخول ===== */}
      {isAuthenticated ? (
        <form
          onSubmit={submit}
          style={{
            background: sf.surface, borderRadius: sd.rCard, padding: sd.padCard,
            display: 'grid', gap: 10, marginBottom: 18
          }}
        >
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
                ? <>{t('تعلّق باسم')} <b style={{ color: sf.text }}><bdi>{accountName}</bdi></b></>
                : t('أضف اسمك في صفحة حسابك ليظهر مع تعليقك')}
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
      ) : (
        <div
          style={{
            background: sf.surface, borderRadius: sd.rCard, padding: sd.padCard,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18
          }}
        >
          <p style={{ margin: 0, flex: '1 1 220px', fontSize: 13, color: sf.muted, lineHeight: 1.8 }}>
            {t('التعليق والتفاعل للزبائن المسجّلين — يظهر اسم حسابك مع ما تكتبه.')}
          </p>
          <button
            type="button"
            className="sf-ic-cta"
            onClick={goToLogin}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              minHeight: 40, padding: '0 18px',
              borderRadius: sd.rButton, border: 0,
              background: sf.accent, color: sf.onAccent,
              fontFamily: sf.font, fontSize: 14, fontWeight: 800, cursor: 'pointer'
            }}
          >
            <IoLogInOutline size={17} aria-hidden="true" style={{ transform: lang === 'en' ? undefined : 'scaleX(-1)' }} />
            {t('سجّل الدخول لتعلّق')}
          </button>
        </div>
      )}

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
                  <ReactionBar comment={c} onReact={react} />

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
                        <ReactionBar comment={r} onReact={react} small />
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
