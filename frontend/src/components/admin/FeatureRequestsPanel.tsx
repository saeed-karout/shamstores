// frontend/src/components/admin/FeatureRequestsPanel.tsx
//
// طلبات شراء الميزات المفردة أمام السوبر أدمن.
//
// صفحة `/admin/features` تعرّف الميزات وتسعّرها — أي أنها شاشة **تعريف**.
// أما الاختيار فللتجّار، وما يصل الإدارة منه هو هذا: طلبات تنتظر قبولاً.
// بلا هذه اللوحة يبقى الطلب في قاعدة البيانات بلا من يراه، ويظنّ التاجر
// أن أحداً لم يهتم.

import { useCallback, useEffect, useState } from 'react';
import { IoLogoWhatsapp, IoTimeOutline, IoRefreshOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';

interface FeatureRequest {
  id: string;
  featureCode: string;
  featureName: string;
  businessName: string | null;
  businessType: string;
  userName: string | null;
  userEmail: string | null;
  whatsapp: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string | null;
  priceUsd: number | null;
  priceSyp: number | null;
  createdAt: string;
}

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  yellow: '#FBBF24'
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'قيد الانتظار', color: C.yellow },
  approved: { label: 'مفعّلة', color: C.accent },
  rejected: { label: 'مرفوض', color: C.red }
};

const FeatureRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/features/requests');
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      /* اللوحة ثانوية — لا تُسقط الصفحة برسالة خطأ */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (request: FeatureRequest) => {
    setBusyId(request.id);
    try {
      await api.post(`/features/requests/${request.id}/approve`, {});
      toast.success('فُعِّلت الميزة وأُبلغ التاجر');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر قبول الطلب');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (request: FeatureRequest) => {
    // الخادم يرفض بلا سبب — والتاجر يقرأ السبب في إشعاره
    const reason = window.prompt(`سبب رفض طلب «${request.featureName}»؟`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      toast.error('اكتب سبباً مفهوماً — يقرأه التاجر');
      return;
    }

    setBusyId(request.id);
    try {
      await api.post(`/features/requests/${request.id}/reject`, { reason: reason.trim() });
      toast.success('رُفض الطلب وأُبلغ التاجر');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر رفض الطلب');
    } finally {
      setBusyId(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'pending');

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.text, fontSize: 16.5, fontWeight: 800, margin: 0 }}>طلبات شراء الميزات</h2>
        {pending.length > 0 && (
          <span style={{ background: `${C.yellow}22`, color: C.yellow, borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
            {pending.length} بانتظارك
          </span>
        )}
        <button
          type="button"
          onClick={load}
          aria-label="تحديث"
          style={{ marginInlineStart: 'auto', background: C.surf, border: 'none', borderRadius: 9, width: 32, height: 32, color: C.muted, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
        >
          <IoRefreshOutline size={16} />
        </button>
      </div>

      <p style={{ color: C.muted, fontSize: 12.5, margin: '0 0 14px', lineHeight: 1.9 }}>
        الميزات تُعرَّف وتُسعَّر هنا، ويختارها التجّار من قسم الميزات في
        لوحاتهم. لا دفع إلكتروني: تواصل مع التاجر ثم فعّلها.
      </p>

      {loading ? (
        <div style={{ color: C.muted, fontSize: 13, padding: '18px 0' }}>جارٍ التحميل…</div>
      ) : requests.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 13, padding: '18px 0' }}>لا طلبات بعد.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.surf }}>
                {['النشاط', 'الميزة', 'المبلغ', 'التاريخ', 'الحالة', 'الإجراءات'].map((head) => (
                  <th key={head} style={{ padding: '10px 14px', color: C.muted, fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ color: C.text, fontWeight: 600, fontSize: 13.5 }}>
                      {request.businessName || '—'}
                    </div>
                    <div style={{ color: C.muted, fontSize: 11.5 }}>
                      {request.userName || request.userEmail || '—'}
                    </div>
                    {request.whatsapp && (
                      <a
                        href={`https://wa.me/${request.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.accent, fontSize: 11.5, textDecoration: 'none', marginTop: 3 }}
                      >
                        <IoLogoWhatsapp size={13} /> {request.whatsapp}
                      </a>
                    )}
                  </td>
                  <td style={{ padding: '11px 14px', color: C.text, fontSize: 13 }}>{request.featureName}</td>
                  <td style={{ padding: '11px 14px', color: C.accent, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                    {request.priceSyp != null
                      ? `${request.priceSyp.toLocaleString('en-US')} ل.س`
                      : request.priceUsd != null
                        ? `$${request.priceUsd}`
                        : '—'}
                  </td>
                  <td style={{ padding: '11px 14px', color: C.muted, fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    {new Date(request.createdAt).toLocaleDateString('ar')}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: STATUS_META[request.status]?.color, fontSize: 12.5, fontWeight: 700 }}>
                      {request.status === 'pending' && <IoTimeOutline size={13} />}
                      {STATUS_META[request.status]?.label || request.status}
                    </span>
                    {request.rejectReason && (
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{request.rejectReason}</div>
                    )}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {request.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 7 }}>
                        <button
                          type="button"
                          onClick={() => approve(request)}
                          disabled={busyId === request.id}
                          style={{ background: C.accent, color: C.bg, padding: '5px 13px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
                        >
                          تفعيل
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(request)}
                          disabled={busyId === request.id}
                          style={{ background: 'transparent', color: C.red, padding: '5px 13px', borderRadius: 8, border: `1px solid ${C.red}55`, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
                        >
                          رفض
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FeatureRequestsPanel;
