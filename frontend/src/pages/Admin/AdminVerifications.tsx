// pages/Admin/AdminVerifications.tsx — مراجعة طلبات «تاجر موثّق»
//
// **الوثيقة تُجلب كـ blob عبر مسارٍ محروس** وتُعرض من رابط `blob:` محلّي —
// لا رابطَ عامّاً لها أصلاً. والرابط المحلّي يُحرَّر عند الإغلاق فلا تبقى
// صورة هويةٍ في ذاكرة التبويب بعد النظر إليها.
//
// **الرفض يتطلّب سبباً:** التاجر يقرؤه في إشعاره وفي صفحة التوثيق، وبدونه لا
// يعرف ما يصحّحه فيرسل الطلب نفسه مرّة ثانية.

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IoCheckmarkCircle,
  IoCloseCircle,
  IoDocumentTextOutline,
  IoImageOutline,
  IoOpenOutline,
  IoRefresh,
  IoBanOutline
} from 'react-icons/io5';
import api from '@/services/api';
import { VerifiedSeal } from '@/components/storefront/VerifiedBadge';
import '@/styles/trust.css';

type Status = 'pending' | 'approved' | 'rejected' | 'revoked';

interface AdminRequest {
  id: string;
  status: Status;
  legalName: string;
  tradeName?: string | null;
  phone: string;
  address?: string | null;
  documentName?: string | null;
  documentMime?: string | null;
  shopPhotoMime?: string | null;
  hasShopPhoto: boolean;
  reason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  businessType: 'restaurant' | 'store';
  businessId: string;
  business: { id: string; name: string; slug: string; verifiedAt: string | null } | null;
  user: { id: string; name: string; email: string; phone?: string | null } | null;
}

const TABS: Array<{ key: Status; label: string; tone: string }> = [
  { key: 'pending', label: 'بانتظار المراجعة', tone: 'amber' },
  { key: 'approved', label: 'موثّقة', tone: 'blue' },
  { key: 'rejected', label: 'مرفوضة', tone: 'red' },
  { key: 'revoked', label: 'مسحوبة', tone: 'gray' }
];

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('ar-SY-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

interface Viewer {
  requestId: string;
  which: 'document' | 'shopPhoto';
  url: string;
  mime: string;
}

const AdminVerifications: React.FC = () => {
  const [status, setStatus] = useState<Status>('pending');
  const [rows, setRows] = useState<AdminRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [reasonFor, setReasonFor] = useState<{ id: string; action: 'reject' | 'revoke' } | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ requests: AdminRequest[]; counts: Record<string, number> }>(
        `/verification/admin/requests?status=${status}`
      );
      setRows(data?.requests || []);
      setCounts(data?.counts || {});
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  // رابط blob يُحرَّر حين يُغلق العارض أو يُستبدل
  useEffect(() => () => {
    if (viewer) URL.revokeObjectURL(viewer.url);
  }, [viewer]);

  const openFile = async (r: AdminRequest, which: Viewer['which']) => {
    if (viewer?.requestId === r.id && viewer.which === which) {
      setViewer(null);
      return;
    }
    setBusy(`${r.id}:${which}`);
    try {
      const blob = await api.downloadBlob(`/verification/admin/requests/${r.id}/file/${which}`);
      const mime = (which === 'document' ? r.documentMime : r.shopPhotoMime) || blob.type;
      setViewer({ requestId: r.id, which, url: URL.createObjectURL(new Blob([blob], { type: mime })), mime });
    } catch {
      toast.error('تعذّر فتح الملف');
    } finally {
      setBusy(null);
    }
  };

  const approve = async (r: AdminRequest) => {
    if (!window.confirm(`توثيق «${r.business?.name || r.legalName}»؟ ستظهر الشارة الزرقاء في واجهته فوراً.`)) return;
    setBusy(r.id);
    try {
      await api.post(`/verification/admin/requests/${r.id}/approve`);
      toast.success('تم توثيق النشاط وإشعار التاجر');
      setViewer(null);
      await load();
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setBusy(null);
    }
  };

  const submitReason = async () => {
    if (!reasonFor) return;
    if (reason.trim().length < 3) {
      toast.error('اكتب السبب ليعرف التاجر ما يصحّحه');
      return;
    }
    setBusy(reasonFor.id);
    try {
      await api.post(`/verification/admin/requests/${reasonFor.id}/${reasonFor.action}`, { reason: reason.trim() });
      toast.success(reasonFor.action === 'reject' ? 'رُفض الطلب وأُشعر التاجر' : 'سُحب التوثيق وأُشعر التاجر');
      setReasonFor(null);
      setReason('');
      setViewer(null);
      await load();
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="ss-page">
      <div className="tr-page" style={{ maxWidth: 1040 }}>
        <header className="tr-head">
          <h1>
            <VerifiedSeal size={26} /> طلبات التوثيق
          </h1>
          <p>
            طابِق الاسم في الوثيقة مع الاسم القانوني المكتوب، وتأكّد أن الرقم فعّال. الوثائق خاصة — لا تنزّلها ولا
            تشاركها خارج اللوحة.
          </p>
        </header>

        <div className="tr-actions" style={{ justifyContent: 'space-between' }}>
          <div className="tr-tabs" role="tablist" aria-label="حالة الطلب">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={status === t.key}
                className={`tr-tab ${status === t.key ? 'is-active' : ''}`}
                onClick={() => {
                  setViewer(null);
                  setReasonFor(null);
                  setStatus(t.key);
                }}
              >
                {t.label}
                {counts[t.key] ? ` (${counts[t.key]})` : ''}
              </button>
            ))}
          </div>
          <button type="button" className="ss-btn ss-btn-ghost" onClick={load} disabled={loading} aria-label="تحديث">
            <IoRefresh size={18} />
          </button>
        </div>

        <section className="ss-card" aria-busy={loading}>
          {loading ? (
            <div style={{ padding: 24, color: 'var(--d-muted)' }}>جارٍ التحميل…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--d-muted)' }}>
              {status === 'pending' ? 'لا طلبات بانتظار المراجعة 👌' : 'لا شيء هنا.'}
            </div>
          ) : (
            rows.map((r) => {
              const tone = TABS.find((t) => t.key === r.status)?.tone || 'gray';
              const adminPath = r.businessType === 'store' ? `/admin/stores/${r.businessId}` : `/admin/restaurants/${r.businessId}`;
              return (
                <div key={r.id} className="tr-admin-row">
                  <div className="tr-actions" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'grid', gap: 2 }}>
                      <b style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {r.business?.name || 'نشاط محذوف'}
                        {r.business?.verifiedAt && <VerifiedSeal size={16} />}
                        <span className={`tr-pill tone-${tone}`}>{r.businessType === 'store' ? 'متجر' : 'مطعم'}</span>
                      </b>
                      <small style={{ color: 'var(--d-muted)', fontSize: 12.5 }}>أُرسل {fmt(r.createdAt)}</small>
                    </div>
                    <div className="tr-files">
                      <Link to={adminPath} className="ss-btn ss-btn-ghost" style={{ minHeight: 36 }}>
                        تفاصيل النشاط
                      </Link>
                      {r.business?.slug && (
                        <a href={`/${r.business.slug}`} target="_blank" rel="noopener noreferrer" className="ss-btn ss-btn-ghost" style={{ minHeight: 36 }}>
                          <IoOpenOutline size={16} /> الواجهة
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="tr-admin-meta">
                    <div><span>الاسم القانوني: </span><b>{r.legalName}</b></div>
                    {r.tradeName && <div><span>الاسم التجاري: </span>{r.tradeName}</div>}
                    <div><span>الهاتف: </span><bdi dir="ltr">{r.phone}</bdi></div>
                    {r.user && <div><span>الحساب: </span>{r.user.name} — <bdi dir="ltr">{r.user.email}</bdi></div>}
                    {r.address && <div style={{ gridColumn: '1 / -1' }}><span>العنوان: </span>{r.address}</div>}
                    {r.reason && <div style={{ gridColumn: '1 / -1' }}><span>السبب: </span>{r.reason}</div>}
                    {r.reviewedAt && <div><span>روجع: </span>{fmt(r.reviewedAt)}</div>}
                  </div>

                  <div className="tr-files">
                    <button type="button" className="ss-btn ss-btn-ghost" onClick={() => openFile(r, 'document')} disabled={busy === `${r.id}:document`}>
                      <IoDocumentTextOutline size={17} />
                      {viewer?.requestId === r.id && viewer.which === 'document' ? 'إخفاء الوثيقة' : 'عرض الوثيقة'}
                    </button>
                    {r.hasShopPhoto && (
                      <button type="button" className="ss-btn ss-btn-ghost" onClick={() => openFile(r, 'shopPhoto')} disabled={busy === `${r.id}:shopPhoto`}>
                        <IoImageOutline size={17} />
                        {viewer?.requestId === r.id && viewer.which === 'shopPhoto' ? 'إخفاء صورة المحلّ' : 'صورة المحلّ'}
                      </button>
                    )}
                    {r.status === 'pending' && (
                      <>
                        <button type="button" className="ss-btn ss-btn-primary" onClick={() => approve(r)} disabled={busy === r.id}>
                          <IoCheckmarkCircle size={18} /> توثيق
                        </button>
                        <button
                          type="button"
                          className="ss-btn ss-btn-ghost"
                          style={{ color: '#b3261e' }}
                          onClick={() => {
                            setReasonFor({ id: r.id, action: 'reject' });
                            setReason('');
                          }}
                        >
                          <IoCloseCircle size={18} /> رفض
                        </button>
                      </>
                    )}
                    {r.status === 'approved' && r.business?.verifiedAt && (
                      <button
                        type="button"
                        className="ss-btn ss-btn-ghost"
                        style={{ color: '#b3261e' }}
                        onClick={() => {
                          setReasonFor({ id: r.id, action: 'revoke' });
                          setReason('');
                        }}
                      >
                        <IoBanOutline size={17} /> سحب التوثيق
                      </button>
                    )}
                  </div>

                  {reasonFor?.id === r.id && (
                    <div className="tr-field">
                      <label htmlFor={`reason-${r.id}`}>{reasonFor.action === 'reject' ? 'سبب الرفض (يراه التاجر)' : 'سبب سحب التوثيق (يراه التاجر)'}</label>
                      <textarea
                        id={`reason-${r.id}`}
                        className="tr-input"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={500}
                        placeholder="مثال: الصورة غير واضحة — صوّر الهوية كاملةً في إضاءة جيدة"
                        autoFocus
                      />
                      <div className="tr-actions">
                        <button type="button" className="ss-btn ss-btn-primary" style={{ background: '#b3261e' }} onClick={submitReason} disabled={busy === r.id}>
                          {reasonFor.action === 'reject' ? 'تأكيد الرفض' : 'تأكيد السحب'}
                        </button>
                        <button type="button" className="ss-btn ss-btn-ghost" onClick={() => setReasonFor(null)}>
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {viewer?.requestId === r.id && (
                    <div className="tr-viewer">
                      {viewer.mime === 'application/pdf' ? (
                        <iframe src={viewer.url} title="وثيقة التوثيق" />
                      ) : (
                        <img src={viewer.url} alt={viewer.which === 'document' ? 'وثيقة التوثيق' : 'صورة المحلّ'} />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminVerifications;
