// frontend/src/components/storefront/NotifyMeForm.tsx
//
// «أعلمني حين يتوفّر» — لمنتجٍ نافد أو قادم.
//
// **صاحب الحساب بنقرةٍ واحدة:** نعرفه من جلسته، فلا نسأله شيئاً — الإشعار
// يصله في المنصّة وعلى جهازه. **والزائر بحقلٍ واحد:** بريدٌ أو هاتف، أيّهما
// شاء. حقلان إلزاميّان واسمٌ وتأكيد كانت ستجعل أغلب الزوّار يغلقون النموذج.
//
// والبريد أوّلاً في التلميح: الهاتف لا قناة آلية له بعد (لا SMS)، فالتاجر
// يتواصل مع صاحبه بنفسه — وهو ما يُقال بصدق في رسالة النجاح.

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IoNotificationsOutline, IoCheckmarkCircle } from 'react-icons/io5';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';

interface Props {
  productId: string;
  /** «قريباً» أم «نفد» — يغيّر العنوان وحده */
  comingSoon?: boolean;
  availableAt?: string | null;
  t: (arabic: string) => string;
}

const NotifyMeForm: React.FC<Props> = ({ productId, comingSoon, availableAt, t }) => {
  const { isAuthenticated } = useAuth();
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ waiting: number; byPhone: boolean } | null>(null);

  const isEmail = contact.includes('@');
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = contact.trim();
    if (!isAuthenticated && !value) {
      toast.error(t('اكتب بريدك أو رقم هاتفك'));
      return;
    }
    setSending(true);
    try {
      const data: any = await api.post(`/public/products/${productId}/notify`, {
        ...(value && isEmail ? { email: value } : {}),
        ...(value && !isEmail ? { phone: value } : {})
      });
      const payload = data?.waiting !== undefined ? data : data?.data || {};
      setDone({ waiting: Number(payload.waiting) || 1, byPhone: !isAuthenticated && !isEmail });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t('تعذّر تسجيل طلبك الآن'));
    } finally {
      setSending(false);
    }
  };

  const when =
    comingSoon && availableAt
      ? new Date(availableAt).toLocaleDateString('ar-SY', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

  return (
    <div
      style={{
        border: `${sd.borderW} solid ${sf.border}`,
        background: sf.surface,
        borderRadius: sd.rCard,
        padding: 16,
        marginBottom: 24
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: sf.text, fontWeight: 800, fontSize: 15 }}>
        <IoNotificationsOutline size={19} style={{ color: sf.accent }} />
        {comingSoon ? t('قريباً — كن أوّل من يعلم') : t('نفدت الكمية — نُعلمك حين يعود')}
      </div>
      {when && (
        <p style={{ margin: '6px 0 0', color: sf.muted, fontSize: 13 }}>
          {t('يتوفّر المتوقّع:')} <b style={{ color: sf.text }}>{when}</b>
        </p>
      )}

      {done ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12, color: sf.text, fontSize: 13.5, lineHeight: 1.8 }}>
          <IoCheckmarkCircle size={19} style={{ color: sf.accent, flexShrink: 0, marginTop: 3 }} />
          <span>
            {done.byPhone
              ? t('سُجّل رقمك — سيتواصل معك المتجر حين يتوفّر.')
              : t('سنُعلمك فور توفّره.')}{' '}
            {done.waiting > 1 && (
              <span style={{ color: sf.muted }}>
                ({done.waiting} {t('ينتظرونه معك')})
              </span>
            )}
          </span>
        </div>
      ) : isAuthenticated ? (
        <button
          type="button"
          onClick={() => submit()}
          disabled={sending}
          style={{
            marginTop: 12,
            width: '100%',
            minHeight: 46,
            borderRadius: sd.rButton,
            border: 'none',
            background: sf.accent,
            color: sf.onAccent,
            fontWeight: 800,
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: sending ? 'wait' : 'pointer'
          }}
        >
          {sending ? t('جارٍ التسجيل…') : t('أعلمني حين يتوفّر')}
        </button>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={t('بريدك الإلكتروني أو رقم هاتفك')}
            dir="auto"
            inputMode="email"
            aria-label={t('بريدك الإلكتروني أو رقم هاتفك')}
            style={{
              flex: '1 1 200px',
              minHeight: 46,
              padding: '0 14px',
              borderRadius: sd.rButton,
              border: `1px solid ${sf.border}`,
              background: sf.card,
              color: sf.text,
              fontSize: 14,
              fontFamily: 'inherit'
            }}
          />
          <button
            type="submit"
            disabled={sending}
            style={{
              flex: '0 0 auto',
              minHeight: 46,
              padding: '0 18px',
              borderRadius: sd.rButton,
              border: 'none',
              background: sf.accent,
              color: sf.onAccent,
              fontWeight: 800,
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: sending ? 'wait' : 'pointer'
            }}
          >
            {sending ? t('جارٍ التسجيل…') : t('أعلمني')}
          </button>
        </form>
      )}
    </div>
  );
};

export default NotifyMeForm;
