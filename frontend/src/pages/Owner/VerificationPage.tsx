// pages/Owner/VerificationPage.tsx — «تاجر موثّق»
//
// شاشةٌ واحدة للمتجر والمطعم: حالة التوثيق أوّلاً، ثم النموذج حين يكون
// الإرسال ممكناً (لم يُوثَّق بعد ولا طلب قيد المراجعة).
//
// **لماذا نشرح قبل أن نطلب:** التاجر يُطلب منه صورة هويته — أحسّ طلبٍ يمكن
// أن تطلبه منصّة. بلا جملةٍ تقول من يرى الوثيقة ولماذا، يتردّد أو يرسل صورةً
// مقصوصة لا تنفع. فالنصّ فوق النموذج يقول: المشرفون وحدهم، ولا تُنشر.

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IoCloudUploadOutline,
  IoDocumentTextOutline,
  IoImageOutline,
  IoLockClosedOutline,
  IoTimeOutline,
  IoAlertCircleOutline,
  IoCloseCircleOutline
} from 'react-icons/io5';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { VerifiedSeal } from '@/components/storefront/VerifiedBadge';
import '@/styles/trust.css';

type Status = 'pending' | 'approved' | 'rejected' | 'revoked';

interface MyRequest {
  id: string;
  status: Status;
  legalName: string;
  tradeName?: string | null;
  phone: string;
  address?: string | null;
  documentName?: string | null;
  hasShopPhoto: boolean;
  reason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

interface MyVerification {
  verified: boolean;
  verifiedAt: string | null;
  businessType: 'restaurant' | 'store';
  request: MyRequest | null;
}

const MAX_MB = 8;
const DOC_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('ar-SY-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

/** حالة الطلب في سطر: ما حدث، وما الخطوة التالية */
export const StatusBlock: React.FC<{ data: MyVerification }> = ({ data }) => {
  const r = data.request;
  if (data.verified) {
    return (
      <div className="tr-status">
        <VerifiedSeal size={44} />
        <div>
          <b>نشاطك موثّق</b>
          <small>تظهر شارة «تاجر موثّق» الزرقاء بجانب اسمك في واجهتك وصفحات منتجاتك — منذ {fmtDate(data.verifiedAt)}.</small>
        </div>
      </div>
    );
  }
  if (r?.status === 'pending') {
    return (
      <div className="tr-note tone-amber">
        <IoTimeOutline size={20} />
        <div>
          <b>طلبك قيد المراجعة</b> — أُرسل في {fmtDate(r.createdAt)}. نراجع الطلبات عادةً خلال يومي عمل، وسيصلك إشعار فور البتّ فيه.
        </div>
      </div>
    );
  }
  if (r?.status === 'rejected' || r?.status === 'revoked') {
    return (
      <div className="tr-note tone-red">
        <IoCloseCircleOutline size={20} />
        <div>
          <b>{r.status === 'rejected' ? 'لم يُقبل طلبك السابق' : 'سُحبت شارة التوثيق'}</b>
          {r.reason ? <> — السبب: {r.reason}</> : null}
          <br />
          صحّح ما ذُكر وأرسل طلباً جديداً أدناه.
        </div>
      </div>
    );
  }
  return null;
};

const FilePick: React.FC<{
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onPick: (f: File | null) => void;
  icon: React.ReactNode;
}> = ({ label, hint, accept, file, onPick, icon }) => (
  <label className={`tr-drop ${file ? 'is-set' : ''}`}>
    <input
      type="file"
      accept={accept}
      onChange={(e) => {
        const f = e.target.files?.[0] || null;
        if (f && f.size > MAX_MB * 1024 * 1024) {
          toast.error(`حجم الملف أكبر من ${MAX_MB} ميغابايت`);
          e.target.value = '';
          return;
        }
        onPick(f);
      }}
    />
    {icon}
    <div style={{ minWidth: 0 }}>
      <b>{file ? file.name : label}</b>
      <small>{file ? `${(file.size / 1024 / 1024).toFixed(1)} ميغابايت — اضغط للتغيير` : hint}</small>
    </div>
  </label>
);

const VerificationPage: React.FC = () => {
  const { user, isOwner } = useAuth();
  const [data, setData] = useState<MyVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [document, setDocument] = useState<File | null>(null);
  const [shopPhoto, setShopPhoto] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const load = async () => {
    try {
      const res = await api.get<MyVerification>('/verification/me');
      setData(res);
      // الطلب المرفوض يعبّئ النموذج من جديد — التاجر يصحّح حقلاً لا يعيد الكتابة كلّها
      const prev = res?.request;
      if (prev && (prev.status === 'rejected' || prev.status === 'revoked')) {
        setLegalName(prev.legalName || '');
        setTradeName(prev.tradeName || '');
        setPhone(prev.phone || '');
        setAddress(prev.address || '');
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!phone && (user as any)?.phone) setPhone((user as any).phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const canSubmit = !!data && !data.verified && data.request?.status !== 'pending';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (legalName.trim().length < 3) return toast.error('اكتب الاسم القانوني كما في الوثيقة');
    if (phone.replace(/\D/g, '').length < 9) return toast.error('رقم الهاتف غير صالح');
    if (!document) return toast.error('ارفع صورة الهوية أو السجلّ التجاري');

    const form = new FormData();
    form.append('legalName', legalName.trim());
    form.append('tradeName', tradeName.trim());
    form.append('phone', phone.trim());
    form.append('address', address.trim());
    form.append('document', document);
    if (shopPhoto) form.append('shopPhoto', shopPhoto);

    setSending(true);
    try {
      // `api.upload` يرسل ملفاً واحداً باسم `image` — هنا ملفّان بأسمائهما
      await api.client.post('/verification', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('وصلنا طلبك — نراجعه عادةً خلال يومي عمل');
      setDocument(null);
      setShopPhoto(null);
      await load();
    } catch {
      /* رسالة الخادم يعرضها العميل */
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="ss-page">
        <div className="tr-page">
          <div className="ss-card tr-card" style={{ minHeight: 120 }} aria-busy="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="ss-page">
      <div className="tr-page">
        <header className="tr-head">
          <h1>
            <VerifiedSeal size={26} /> توثيق النشاط
          </h1>
          <p>
            شارة «تاجر موثّق» الزرقاء تقول لزبونك إن وراء هذا المتجر شخصاً حقيقياً تحقّقنا من هويته. مجانية على كل
            الخطط — والثقة أوّل ما يمنع الزبون من الشراء أونلاين.
          </p>
        </header>

        {data && (data.verified || data.request) && (
          <section className="ss-card tr-card">
            <StatusBlock data={data} />
          </section>
        )}

        {canSubmit && !isOwner && (
          <div className="tr-note tone-gray">
            <IoAlertCircleOutline size={20} />
            <div>طلب التوثيق يرسله مالك النشاط من حسابه.</div>
          </div>
        )}

        {canSubmit && isOwner && (
          <form ref={formRef} className="ss-card tr-card" onSubmit={submit} noValidate>
            <h2>بيانات التوثيق</h2>
            <div className="tr-note tone-green">
              <IoLockClosedOutline size={18} />
              <div>
                وثيقتك <b>لا تُنشر أبداً</b> ولا تُحفظ برابطٍ عام — يراها فريق مراجعة شام ستورز وحده للتحقّق من الاسم،
                ولا يظهر للزبون إلا الشارة.
              </div>
            </div>

            <div className="tr-grid">
              <div className="tr-field">
                <label htmlFor="vf-legal">الاسم القانوني *</label>
                <input
                  id="vf-legal"
                  className="tr-input"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  maxLength={160}
                  placeholder="كما يظهر في الهوية أو السجلّ"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="tr-field">
                <label htmlFor="vf-trade">الاسم التجاري</label>
                <input
                  id="vf-trade"
                  className="tr-input"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  maxLength={160}
                  placeholder="إن كان مختلفاً عن اسم المتجر"
                />
              </div>
              <div className="tr-field">
                <label htmlFor="vf-phone">رقم هاتف للتواصل *</label>
                <input
                  id="vf-phone"
                  className="tr-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  dir="ltr"
                  maxLength={30}
                  placeholder="09xxxxxxxx"
                  autoComplete="tel"
                  required
                />
                <small>قد نتّصل به للتأكّد — لا يُعرض للزبائن.</small>
              </div>
            </div>

            <div className="tr-field">
              <label htmlFor="vf-address">عنوان المحلّ (اختياري)</label>
              <textarea
                id="vf-address"
                className="tr-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={500}
                placeholder="المحافظة، المنطقة، الشارع — إن كان لك محلّ فعلي"
              />
            </div>

            <div className="tr-grid">
              <div className="tr-field">
                <label>الهوية الشخصية أو السجلّ التجاري *</label>
                <FilePick
                  label="اختر صورة أو ملف PDF"
                  hint={`JPG أو PNG أو PDF — حتى ${MAX_MB} ميغابايت`}
                  accept={DOC_ACCEPT}
                  file={document}
                  onPick={setDocument}
                  icon={<IoDocumentTextOutline size={26} />}
                />
                <small>صوّر الوثيقة كاملةً وواضحة، والاسم فيها مقروء.</small>
              </div>
              <div className="tr-field">
                <label>صورة المحلّ من الخارج (اختياري)</label>
                <FilePick
                  label="اختر صورة"
                  hint="تُسرّع المراجعة لمن له محلّ فعلي"
                  accept={PHOTO_ACCEPT}
                  file={shopPhoto}
                  onPick={setShopPhoto}
                  icon={<IoImageOutline size={26} />}
                />
              </div>
            </div>

            <div className="tr-actions">
              <button type="submit" className="ss-btn ss-btn-primary" disabled={sending}>
                <IoCloudUploadOutline size={18} />
                {sending ? 'جارٍ الإرسال…' : 'أرسل طلب التوثيق'}
              </button>
              <Link to="/help" className="ss-btn ss-btn-ghost">
                أسئلة؟ مركز المساعدة
              </Link>
            </div>
          </form>
        )}

        <section className="ss-card tr-card">
          <h2>ماذا تعني الشارة للزبون؟</h2>
          <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 6, fontSize: 13.5, lineHeight: 1.8, color: 'var(--d-muted)' }}>
            <li>أن شام ستورز تحقّقت من هوية صاحب النشاط عبر وثيقة رسمية ورقم هاتف فعّال.</li>
            <li>تظهر بجانب اسمك في واجهتك وصفحات منتجاتك، ويشرح الضغط عليها معناها للزبون.</li>
            <li>لا تعني ضماناً لجودة المنتجات — وتُسحب إن ثبت احتيال أو انتقل النشاط لمالكٍ آخر.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default VerificationPage;
