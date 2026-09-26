// frontend/src/components/storefront/checkout/TrackPaymentInfo.tsx
//
// في صفحة تتبّع الطلب العامّة (`/track/:orderId`): رسالة الهدية، وانتظار تحويل
// المغترب، والعربون، وجدول الأقساط، و«معاينة قبل الدفع».
//
// الصفحة تُفتح بلا حساب — فالبيانات تأتي من عرضٍ عامّ مرشَّح على الخادم
// (`publicTrackingView`)، وحين يطلب الدافع إخفاء الأسعار تصل بلا مبالغ أصلاً.

import React from 'react';
import { IoGiftOutline, IoWalletOutline, IoCalendarOutline, IoEyeOutline, IoTimeOutline } from 'react-icons/io5';
import { formatPrice } from '@/utils/currency';

interface Palette {
  card: string;
  surf: string;
  accent: string;
  text: string;
  muted: string;
  border: string;
}

interface Props {
  order: any;
  t: (ar: string) => string;
  colors: Palette;
}

const TrackPaymentInfo: React.FC<Props> = ({ order, t, colors: C }) => {
  if (!order) return null;
  const currency = order.business?.currency || 'SYP';
  const money = (n: unknown) => formatPrice(Number(n) || 0, currency);
  const installments: any[] = order.installments || [];
  const deposit = Number(order.depositAmount) || 0;
  const awaiting = order.paymentStatus === 'awaiting_transfer';

  if (!order.isGift && !deposit && installments.length === 0 && !order.inspectionAllowed) return null;

  const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 24, color: C.text, lineHeight: 1.9 };
  const h: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 17, margin: '0 0 10px' };

  return (
    <>
      {order.isGift && (
        <div style={card}>
          <h2 style={h}>
            <IoGiftOutline style={{ color: C.accent }} /> {t('هدية لك')}
          </h2>
          {order.giftMessage ? (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 15 }}>«{order.giftMessage}»</p>
          ) : (
            <p style={{ margin: 0, color: C.muted }}>{t('أرسل لك أحد أحبّائك هذه الهدية.')}</p>
          )}
          {awaiting && (
            <p style={{ margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 6, color: '#FBBF24' }}>
              <IoTimeOutline /> {t('بانتظار تأكيد الدفعة — يبدأ التجهيز فور وصولها.')}
            </p>
          )}
        </div>
      )}

      {order.inspectionAllowed && (
        <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <IoEyeOutline size={20} style={{ color: C.accent, flexShrink: 0, marginTop: 4 }} />
          <span>
            <b>{t('معاينة قبل الدفع')}</b> — {t('افحص طلبك عند الاستلام، وادفع فقط إن كان كما طلبت.')}
          </span>
        </div>
      )}

      {deposit > 0 && (
        <div style={card}>
          <h2 style={h}>
            <IoWalletOutline style={{ color: C.accent }} /> {t('العربون')}
          </h2>
          <p style={{ margin: 0 }}>
            {money(deposit)} —{' '}
            {order.depositPaidAt ? (
              <span style={{ color: C.accent }}>{t('مستلم')}</span>
            ) : (
              <span style={{ color: '#FBBF24' }}>{t('بانتظار الدفع')}</span>
            )}
          </p>
          <p style={{ margin: 0, color: C.muted }}>
            {t('المتبقّي عند الاستلام')}: {money(order.remainingAmount)}
          </p>
        </div>
      )}

      {installments.length > 0 && (
        <div style={card}>
          <h2 style={h}>
            <IoCalendarOutline style={{ color: C.accent }} /> {t('جدول الأقساط')}
          </h2>
          <div style={{ display: 'grid', gap: 6 }}>
            {installments.map((i) => (
              <div
                key={i.id}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 12px', background: C.surf, borderRadius: 10, flexWrap: 'wrap' }}
              >
                <span>
                  {t('القسط')} {i.seq} · <span dir="ltr">{new Date(i.dueDate).toLocaleDateString('en-GB')}</span>
                </span>
                <span style={{ fontWeight: 700 }}>{money(i.amount)}</span>
                <span style={{ color: i.paidAt ? C.accent : C.muted }}>{i.paidAt ? t('مدفوع') : t('مستحقّ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default TrackPaymentInfo;
