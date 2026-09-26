// frontend/src/components/storefront/checkout/OrderPlacedSheet.tsx
//
// ما يراه الزبون فور تسجيل طلبه: رقم الطلب، وزرّ «أرسل الطلب للتاجر على
// واتساب»، وما عليه دفعه مسبقاً إن وُجد (هدية مغترب أو عربون)، ورابط التتبّع.
//
// **الطلب مسجَّلٌ قبل هذه الشاشة.** زرّ واتساب نسخةٌ للتاجر لا شرطٌ للطلب —
// وكانت الواجهة تفتح واتساب تلقائياً فتخطف المتصفّح وتوهم الزبون أن طلبه لم
// يُرسل. هنا يضغطه الزبون بنفسه، وبرسالةٍ جاهزة بعملة العرض التي رآها.

import React, { useState } from 'react';
import { IoCheckmarkCircle, IoLogoWhatsapp, IoNavigateOutline, IoCopyOutline, IoGiftOutline, IoWalletOutline, IoEyeOutline } from 'react-icons/io5';
import BottomSheet from '../BottomSheet';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { formatPrice } from '@/utils/currency';
import type { CurrencyInput } from '@/utils/currency';
import { useT } from '@/i18n/storefront';
import { customerToMerchantMessage, trackUrlFor, waLink, WaOrderLine } from '@/utils/whatsapp';
import type { CheckoutOptions } from './CheckoutExtras';

export interface PlacedOrder {
  id: string;
  orderNumber: string;
  total: number;
  orderType?: string | null;
  deliveryAddress?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  isGift?: boolean;
  giftPayerName?: string | null;
  paymentStatus?: string | null;
  depositAmount?: number | null;
  remainingAmount?: number | null;
  inspectionAllowed?: boolean;
}

interface Props {
  order: PlacedOrder | null;
  /** أسطر السلّة قبل إفراغها — ردّ الخادم لا يحمل أسماء الأصناف */
  lines: WaOrderLine[];
  options: CheckoutOptions;
  merchantWhatsapp?: string | null;
  shamCash?: { accountNumber: string; accountName?: string } | null;
  currency?: CurrencyInput;
  onClose: () => void;
  /** يفتح تتبّع الطلب داخل الواجهة إن وُجد — وإلا يُفتح رابط التتبّع العامّ */
  onTrack?: () => void;
}

const OrderPlacedSheet: React.FC<Props> = ({ order, lines, options, merchantWhatsapp, shamCash, currency, onClose, onTrack }) => {
  const { t } = useT();
  const [copied, setCopied] = useState<string | null>(null);
  if (!order) return null;

  const trackUrl = trackUrlFor(order.id);
  const awaitingTransfer = order.paymentStatus === 'awaiting_transfer';
  const deposit = Number(order.depositAmount) || 0;
  const showWa = options.whatsappStep !== 'off' && !!merchantWhatsapp;
  const prominent = options.whatsappStep === 'prominent' || awaitingTransfer;

  const message = customerToMerchantMessage(
    {
      orderNumber: order.orderNumber,
      items: lines,
      total: order.total,
      orderType: order.orderType,
      address: order.deliveryAddress,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      notes: order.notes,
      depositAmount: deposit || null,
      isGift: order.isGift,
      giftPayerName: order.giftPayerName,
      trackUrl
    },
    currency
  );

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* الحافظة ممنوعة — النصّ ظاهرٌ ويُنسخ يدوياً */
    }
  };

  const waButton = showWa && (
    <a
      href={waLink(merchantWhatsapp, message)}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        minHeight: prominent ? 56 : 48,
        borderRadius: sd.rButton,
        textDecoration: 'none',
        fontWeight: 800,
        fontSize: prominent ? 15.5 : 13.5,
        ...(prominent
          ? { background: '#25D366', color: '#fff', border: 'none' }
          : { background: 'transparent', color: '#128C4B', border: '1.5px solid #25D366' })
      }}
    >
      <IoLogoWhatsapp size={prominent ? 22 : 18} />
      {t('أرسل الطلب للتاجر على واتساب')}
    </a>
  );

  return (
    <BottomSheet open={!!order} onClose={onClose} title={t('تمّ تسجيل طلبك')}>
      <div style={{ display: 'grid', gap: 14, paddingBottom: 12 }}>
        <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
          <IoCheckmarkCircle size={52} style={{ color: sf.accent }} />
          <div style={{ fontSize: 13, color: sf.muted, marginTop: 6 }}>{t('رقم الطلب')}</div>
          <button
            type="button"
            onClick={() => copy('number', order.orderNumber)}
            style={{ background: 'none', border: 'none', color: sf.text, fontSize: 19, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', direction: 'ltr' }}
          >
            #{order.orderNumber} <IoCopyOutline size={14} style={{ color: sf.muted }} />
          </button>
          {copied === 'number' && <div style={{ fontSize: 11.5, color: sf.accent }}>{t('تم النسخ')}</div>}
        </div>

        {/* خطوة واتساب — بارزةٌ أوّلاً حين يطلبها التاجر أو ينتظر تحويلاً */}
        {prominent && waButton}
        {prominent && showWa && (
          <p style={{ margin: '-6px 0 0', textAlign: 'center', fontSize: 11.5, color: sf.muted, lineHeight: 1.7 }}>
            {t('طلبك وصل المتجر فعلاً — الرسالة نسخةٌ تسرّع التواصل.')}
          </p>
        )}

        {awaitingTransfer && options.gift && (
          <Box icon={<IoGiftOutline size={18} />} title={t('طلب هدية — بانتظار دفعتك')}>
            <p style={{ margin: '0 0 8px' }}>
              {t('ادفع')} <strong style={{ color: sf.text }}>{formatPrice(order.total, currency)}</strong>{' '}
              {t('حسب تعليمات المتجر، ولن يُجهَّز الطلب قبل تأكيد وصول دفعتك:')}
            </p>
            <div style={{ whiteSpace: 'pre-wrap', color: sf.text, background: sf.card, borderRadius: sd.rButton, padding: '10px 12px', border: `1px solid ${sf.border}` }}>
              {options.gift.paymentInstructions}
            </div>
            <p style={{ margin: '8px 0 0' }}>{t('أرسل صورة إيصال التحويل للمتجر على واتساب مع رقم الطلب.')}</p>
          </Box>
        )}

        {deposit > 0 && (
          <Box icon={<IoWalletOutline size={18} />} title={t('العربون المطلوب الآن')}>
            <p style={{ margin: '0 0 6px' }}>
              <strong style={{ color: sf.text, fontSize: 15 }}>{formatPrice(deposit, currency)}</strong>
              {' — '}
              {t('والمتبقّي عند الاستلام')}: {formatPrice(Number(order.remainingAmount) || 0, currency)}
            </p>
            {options.deposits?.instructions && (
              <div style={{ whiteSpace: 'pre-wrap', color: sf.text, marginBottom: 6 }}>{options.deposits.instructions}</div>
            )}
            {shamCash && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span>
                  {t('شام كاش')}: <strong style={{ color: sf.text, direction: 'ltr', display: 'inline-block' }}>{shamCash.accountNumber}</strong>
                  {shamCash.accountName ? ` — ${shamCash.accountName}` : ''}
                </span>
                <button type="button" onClick={() => copy('sham', shamCash.accountNumber)} style={smallBtn}>
                  {copied === 'sham' ? t('تم النسخ') : t('نسخ')}
                </button>
              </div>
            )}
            <p style={{ margin: '6px 0 0' }}>{t('يؤكّد المتجر استلام العربون ثمّ يجهّز طلبك.')}</p>
          </Box>
        )}

        {order.inspectionAllowed && (
          <Box icon={<IoEyeOutline size={18} />} title={t('معاينة قبل الدفع')}>
            {t('افحص طلبك عند الاستلام، وادفع فقط إن كان كما طلبت.')}
          </Box>
        )}

        {!prominent && waButton}

        {onTrack ? (
          <button type="button" onClick={onTrack} style={trackBtn}>
            <IoNavigateOutline size={18} /> {t('تتبّع طلبك')}
          </button>
        ) : (
          <a href={trackUrl} style={{ ...trackBtn, textDecoration: 'none' }}>
            <IoNavigateOutline size={18} /> {t('تتبّع طلبك')}
          </a>
        )}
        <button type="button" onClick={() => copy('link', trackUrl)} style={{ ...smallBtn, justifySelf: 'center' }}>
          <IoCopyOutline size={13} /> {copied === 'link' ? t('تم النسخ') : t('انسخ رابط التتبّع')}
        </button>
      </div>
    </BottomSheet>
  );
};

const Box: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section style={{ background: sf.surface, border: `1px solid ${sf.border}`, borderRadius: sd.rCard, padding: '12px 14px', fontSize: 12.5, color: sf.muted, lineHeight: 1.8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: sf.text, fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>
      <span style={{ color: sf.accent, display: 'inline-flex' }}>{icon}</span>
      {title}
    </div>
    {children}
  </section>
);

const trackBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 50,
  borderRadius: sd.rButton,
  border: 'none',
  background: sf.accent,
  color: sf.onAccent,
  fontSize: 14.5,
  fontWeight: 800,
  fontFamily: 'inherit',
  cursor: 'pointer'
};

const smallBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  background: 'transparent',
  border: `1px solid ${sf.border}`,
  borderRadius: sd.rButton,
  color: sf.text,
  fontSize: 12,
  fontWeight: 700,
  fontFamily: 'inherit',
  padding: '6px 11px',
  cursor: 'pointer'
};

export default OrderPlacedSheet;
