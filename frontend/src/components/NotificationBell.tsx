// frontend/src/components/NotificationBell.tsx
//
// مركز الإشعارات: جرس بعدّاد غير المقروء، ولوحة تعرض السجل مع تصفية.
//
// السوكِت وحده لا يكفي: المستخدم غير المتصل لحظة وقوع الحدث لا يعرف بعدها
// أنه فاته شيء إطلاقاً. الجرس يقرأ السجل المحفوظ، فيظهر ما فات عند أول فتح
// بلا تحديث صفحة — والسوكِت يرفع العدّاد فوراً لمن هو متصل.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoNotificationsOutline,
  IoCheckmarkDoneOutline,
  IoEllipse,
  IoRefreshOutline
} from 'react-icons/io5';
import api from '@/services/api';

interface NotificationRow {
  id: string;
  type: string;
  event: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface Palette {
  card: string; surf: string; accent: string; bg: string;
  text: string; muted: string; border: string;
}

const TYPE_LABELS: Record<string, string> = {
  upgrade_request: 'طلبات الترقية',
  order: 'الطلبات',
  ticket: 'الدعم'
};

/** «قبل ٣ دقائق» أقرب للفهم من طابع زمني كامل في قائمة يمسحها المستخدم بسرعة */
const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return '';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `قبل ${days} يوم`;
  return new Date(iso).toLocaleDateString('ar');
};

const NotificationBell: React.FC<{ colors: Palette }> = ({ colors: C }) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [types, setTypes] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (unreadOnly) params.set('unread', 'true');
      if (filterType) params.set('type', filterType);

      // ⚠️ عقد عميل الـ API: `api.get` يُرجع `response.data.data` — أي
      // الحمولة مفكوكة التغليف بالكامل. فكّها مجدداً هنا يُنتج undefined
      // بصمت: لا خطأ ولا تحذير، فقط قائمة فارغة.
      const data: any = await api.get(`/notifications?${params.toString()}`);
      setRows(data?.items || []);
      setUnreadCount(data?.unreadCount ?? 0);
      setTypes(data?.types || []);
    } catch {
      /* الجرس لا يزعج المستخدم برسالة خطأ — يبقى صامتاً ويعيد المحاولة لاحقاً */
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, filterType]);

  const refreshCount = useCallback(async () => {
    try {
      const data: any = await api.get('/notifications/unread-count');
      setUnreadCount(data?.unreadCount ?? 0);
    } catch {
      /* صامت */
    }
  }, []);

  // العدّاد عند أول تحميل — هذا ما يُظهر ما فات المستخدم وهو غير متصل
  useEffect(() => { refreshCount(); }, [refreshCount]);

  useEffect(() => { if (open) load(); }, [open, load]);

  // السوكِت يرفع العدّاد فوراً لمن هو متصل، بلا انتظار فتح اللوحة
  useEffect(() => {
    const onIncoming = () => {
      setUnreadCount((count) => count + 1);
      if (open) load();
    };
    window.addEventListener('app:notification', onIncoming);
    return () => window.removeEventListener('app:notification', onIncoming);
  }, [open, load]);

  // الإغلاق بالنقر خارج اللوحة أو بمفتاح Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openRow = async (row: NotificationRow) => {
    if (!row.isRead) {
      // تفاؤلياً: العدّاد ينزل فوراً ولا ينتظر الشبكة
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, isRead: true } : r)));
      setUnreadCount((count) => Math.max(0, count - 1));
      try { await api.patch(`/notifications/${row.id}/read`, {}); } catch { /* صامت */ }
    }
    if (row.link) { setOpen(false); navigate(row.link); }
  };

  const markAll = async () => {
    setRows((list) => list.map((r) => ({ ...r, isRead: true })));
    setUnreadCount(0);
    try { await api.patch('/notifications/read-all', {}); } catch { /* صامت */ }
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `الإشعارات — ${unreadCount} غير مقروء` : 'الإشعارات'}
        aria-expanded={open}
        style={{
          position: 'relative', width: 40, height: 40, minWidth: 40, minHeight: 40,
          borderRadius: 11, border: `1px solid ${C.border}`, background: C.surf,
          color: C.text, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}
      >
        <IoNotificationsOutline size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute', top: -5, insetInlineEnd: -5, minWidth: 19, height: 19,
              padding: '0 5px', borderRadius: 999, background: C.accent, color: C.bg,
              fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontVariantNumeric: 'tabular-nums'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="الإشعارات"
          style={{
            position: 'absolute', top: 48, insetInlineEnd: 0, width: 'min(360px, 90vw)',
            maxHeight: 480, display: 'flex', flexDirection: 'column',
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
            boxShadow: '0 18px 44px rgba(0,0,0,0.4)', zIndex: 1000, overflow: 'hidden'
          }}
        >
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: C.text, fontWeight: 800, fontSize: 14, flex: 1 }}>الإشعارات</span>
            <button type="button" onClick={load} aria-label="تحديث" className="btn-inline" style={iconBtn(C)}>
              <IoRefreshOutline size={15} />
            </button>
            {unreadCount > 0 && (
              <button type="button" onClick={markAll} aria-label="تعليم الكل كمقروء" className="btn-inline" style={iconBtn(C)}>
                <IoCheckmarkDoneOutline size={16} />
              </button>
            )}
          </div>

          {/* التصفية */}
          <div style={{ display: 'flex', gap: 6, padding: '9px 12px', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }} className="no-scrollbar">
            <FilterChip active={unreadOnly} onClick={() => setUnreadOnly((v) => !v)} label="غير المقروء" C={C} />
            <FilterChip active={filterType === ''} onClick={() => setFilterType('')} label="الكل" C={C} />
            {types.map((type) => (
              <FilterChip
                key={type}
                active={filterType === type}
                onClick={() => setFilterType(type)}
                label={TYPE_LABELS[type] || type}
                C={C}
              />
            ))}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: 26, textAlign: 'center', color: C.muted, fontSize: 13 }}>جارٍ التحميل…</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: C.muted, fontSize: 13, lineHeight: 1.9 }}>
                {unreadOnly || filterType ? 'لا إشعارات بهذه التصفية' : 'لا إشعارات بعد'}
              </div>
            ) : (
              rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openRow(row)}
                  style={{
                    width: '100%', textAlign: 'start', padding: '12px 14px', border: 'none',
                    borderBottom: `1px solid ${C.border}`, cursor: 'pointer',
                    background: row.isRead ? 'transparent' : `${C.accent}0F`,
                    display: 'flex', gap: 9, alignItems: 'flex-start', fontFamily: 'inherit'
                  }}
                >
                  <IoEllipse
                    size={8}
                    style={{ color: row.isRead ? 'transparent' : C.accent, flexShrink: 0, marginTop: 6 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.text, fontWeight: row.isRead ? 600 : 800, fontSize: 13, marginBottom: 3 }}>
                      {row.title}
                    </div>
                    <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.75 }}>{row.message}</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 4, opacity: 0.75 }}>
                      {relativeTime(row.createdAt)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FilterChip: React.FC<{ active: boolean; onClick: () => void; label: string; C: Palette }> = ({
  active, onClick, label, C
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className="btn-inline"
    style={{
      flex: '0 0 auto', padding: '4px 11px', minHeight: 26, borderRadius: 999,
      border: `1px solid ${active ? C.accent : C.border}`,
      background: active ? C.accent : 'transparent',
      color: active ? C.bg : C.muted,
      fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
    }}
  >
    {label}
  </button>
);

const iconBtn = (C: Palette): React.CSSProperties => ({
  width: 28, height: 28, minWidth: 28, minHeight: 28, padding: 0,
  borderRadius: 8, border: 'none', background: C.surf, color: C.muted, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
});

export default NotificationBell;
