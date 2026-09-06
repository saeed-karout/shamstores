// components/store/StoreOrderDetails.tsx
//
// تفاصيل طلب المتجر — بلوحة اللوحة الداكنة لا بلوحة فاتحة.
//
// كانت هذه البطاقة بيضاء بنصوص رمادية داخل لوحة تحكّم خضراء داكنة: يفتح
// التاجر طلباً فتقفز أمامه بطاقة من تصميم آخر، ونصفُ نصوصها بالكاد يُقرأ
// (رمادي فاتح على أبيض). فرقٌ في التصميم بين شاشتين متجاورتين يُقرأ عطلاً
// لا اختياراً.
//
// وترتيب الأقسام يتبع ما يفعله التاجر بالطلب: يقرأ الحالة، فيغيّرها، ثم
// يحتاج رقم الزبون ليتصل، ثم قائمة ما يجهّزه. الإجمالي في الأسفل حيث
// يتوقّعه من قرأ فاتورة.

import React, { useState } from 'react';
import {
  IoLocation,
  IoCall,
  IoTime,
  IoWallet,
  IoCube,
  IoCheckmark,
  IoCash,
  IoCard,
  IoLogoBitcoin,
  IoPhonePortrait
} from 'react-icons/io5';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '@/services/api';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  yellow: '#F59E0B',
  blue: '#60A5FA',
  purple: '#A78BFA'
};

interface StoreOrder {
  id: string;
  orderNumber: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'served' | 'cancelled';
  total: number | string;
  isPaid: boolean;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  createdAt: string;
  orderItems: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: number | string;
    size?: string | null;
    addons?: string[] | null;
    product?: {
      id?: string;
      name: string;
      image?: string;
      imageUrl?: string;
    };
  }>;
}

interface StoreOrderDetailsProps {
  order: StoreOrder;
  onUpdateStatus: (status: string) => void;
  /** يُستدعى بعد نجاح تحديث الدفع ليعيد الصفحة جلب الطلبات */
  onUpdatePayment?: (isPaid: boolean, paymentMethod: string) => void;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'قيد الانتظار', color: C.yellow },
  preparing: { label: 'قيد التجهيز', color: C.blue },
  ready: { label: 'جاهز للتوصيل', color: C.purple },
  delivering: { label: 'قيد التوصيل', color: C.blue },
  delivered: { label: 'تم التوصيل', color: C.accent },
  served: { label: 'تم التسليم', color: C.accent },
  cancelled: { label: 'ملغي', color: C.red }
};

const STATUS_FLOW = ['pending', 'preparing', 'ready', 'delivering', 'delivered', 'served', 'cancelled'];

// شام كاش مفعّلة في المخطّط ويستعملها التجّار، وكانت تُعرض «أونلاين»
const PAYMENT_LABEL: Record<string, string> = {
  cash: 'نقداً',
  card: 'بطاقة',
  online: 'أونلاين',
  sham_cash: 'شام كاش'
};

const PAYMENT_METHODS = ['cash', 'card', 'online', 'sham_cash'];

const paymentIcon = (method: string, size = 16) => {
  if (method === 'cash') return <IoCash size={size} color={C.accent} />;
  if (method === 'card') return <IoCard size={size} color={C.blue} />;
  if (method === 'online') return <IoLogoBitcoin size={size} color={C.purple} />;
  if (method === 'sham_cash') return <IoPhonePortrait size={size} color={C.accent} />;
  return null;
};

const toNumber = (value: number | string | undefined): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value) || 0;
};

const StoreOrderDetails: React.FC<StoreOrderDetailsProps> = ({ order, onUpdateStatus, onUpdatePayment }) => {
  // تحديد «مدفوع» كان متاحاً لصاحب المطعم دون صاحب المتجر، والمسار نفسه
  // يخدم الاثنين — فبقي التاجر بلا طريقة لتسجيل قبض ثمن الطلب.
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaid, setIsPaid] = useState(Boolean(order.isPaid));
  const [method, setMethod] = useState<string>(order.paymentMethod || 'cash');
  const [saving, setSaving] = useState(false);

  const savePayment = async () => {
    setSaving(true);
    try {
      await api.patch(`/orders/${order.id}/payment`, { isPaid, paymentMethod: method });
      toast.success('تم تحديث حالة الدفع');
      setShowPaymentModal(false);
      onUpdatePayment?.(isPaid, method);
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('فشل تحديث حالة الدفع');
    } finally {
      setSaving(false);
    }
  };

  const total = toNumber(order.total);
  const items = order.orderItems || [];
  const meta = STATUS_META[order.status] || { label: order.status, color: C.muted };

  const itemsTotal = items.reduce((sum, item) => sum + toNumber(item.price) * item.quantity, 0);
  // فرق الإجمالي عن مجموع الأصناف = توصيل أو خصم. عرضه سطراً مستقلاً يمنع
  // سؤال «لماذا الإجمالي أكبر من المنتجات؟»
  const difference = Math.round((total - itemsTotal) * 100) / 100;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
      {/* الترويسة */}
      <div style={{ background: C.surf, padding: '16px 18px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: C.accent, fontWeight: 800, fontSize: 16 }}>#{order.orderNumber}</span>
          <span
            style={{
              background: `${meta.color}22`,
              color: meta.color,
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 12.5,
              fontWeight: 700
            }}
          >
            {meta.label}
          </span>
        </div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
          <IoTime size={13} />
          {format(new Date(order.createdAt), 'dd MMMM yyyy — hh:mm a', { locale: ar })}
        </div>
      </div>

      <div style={{ padding: 18 }}>
        {/* تغيير الحالة */}
        <SectionTitle>تحديث حالة الطلب</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {STATUS_FLOW.map((status) => {
            const active = order.status === status;
            const statusMeta = STATUS_META[status];
            return (
              <button
                key={status}
                type="button"
                onClick={() => !active && onUpdateStatus(status)}
                disabled={active}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '8px 13px',
                  minHeight: 38,
                  borderRadius: 10,
                  border: `1px solid ${active ? statusMeta.color : C.border}`,
                  background: active ? `${statusMeta.color}22` : C.surf,
                  color: active ? statusMeta.color : C.text,
                  fontWeight: active ? 800 : 600,
                  fontSize: 12.5,
                  fontFamily: 'Cairo, sans-serif',
                  cursor: active ? 'default' : 'pointer'
                }}
              >
                {active && <IoCheckmark size={14} />}
                {statusMeta.label}
              </button>
            );
          })}
        </div>

        {/* الزبون */}
        <SectionTitle>الزبون</SectionTitle>
        <div style={box}>
          <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{order.customerName || 'زبون'}</div>
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: C.accent,
                fontSize: 13,
                textDecoration: 'none',
                marginTop: 6
              }}
              dir="ltr"
            >
              <IoCall size={14} /> {order.customerPhone}
            </a>
          )}
          {order.deliveryAddress && (
            <div style={{ color: C.muted, fontSize: 12.5, marginTop: 8, display: 'flex', gap: 6, lineHeight: 1.8 }}>
              <IoLocation size={14} style={{ flexShrink: 0, marginTop: 3 }} />
              {order.deliveryAddress}
            </div>
          )}
        </div>

        {/* المنتجات */}
        <SectionTitle icon={<IoCube size={15} />}>المنتجات ({items.length})</SectionTitle>
        <div style={{ ...box, padding: 0, overflow: 'hidden' }}>
          {items.length === 0 ? (
            <div style={{ padding: 18, color: C.muted, fontSize: 13 }}>لا أصناف في هذا الطلب.</div>
          ) : (
            items.map((item, index) => {
              const image = item.product?.imageUrl || item.product?.image;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: 12,
                    borderTop: index === 0 ? 'none' : `1px solid ${C.border}`
                  }}
                >
                  {image ? (
                    <img
                      src={getImageUrl(sizedImage(image, 'sm'))}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: 9, objectFit: 'cover', flexShrink: 0, background: C.bg }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 9, background: C.bg, display: 'grid', placeItems: 'center', color: C.muted, flexShrink: 0 }}>
                      <IoCube size={18} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.text, fontSize: 13.5, fontWeight: 600 }}>
                      {item.product?.name || 'منتج محذوف'}
                    </div>
                    {/* الخيارات تُعرض للتاجر: بلا اللون والمقاس يجهّز الطلب خطأً */}
                    {(item.size || (item.addons && item.addons.length > 0)) && (
                      <div style={{ color: C.accent, fontSize: 11.5, marginTop: 3 }}>
                        {[item.size, ...(item.addons || [])].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>
                      {item.quantity} × {formatPrice(toNumber(item.price), DEFAULT_CURRENCY)}
                    </div>
                  </div>

                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                    {formatPrice(toNumber(item.price) * item.quantity, DEFAULT_CURRENCY)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* الدفع */}
        <SectionTitle icon={<IoWallet size={15} />}>الدفع</SectionTitle>
        <div style={box}>
          <Row
            label="الطريقة"
            value={PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}
            icon={paymentIcon(order.paymentMethod, 14)}
          />
          <Row
            label="الحالة"
            value={order.isPaid ? 'مدفوع' : 'غير مدفوع'}
            color={order.isPaid ? C.accent : C.yellow}
          />
          <Row label="مجموع المنتجات" value={formatPrice(itemsTotal, DEFAULT_CURRENCY)} />
          {difference !== 0 && (
            <Row
              label={difference > 0 ? 'التوصيل ورسوم أخرى' : 'الخصم'}
              value={formatPrice(Math.abs(difference), DEFAULT_CURRENCY)}
              color={difference > 0 ? C.muted : C.accent}
            />
          )}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 10 }}>
            <Row label="الإجمالي" value={formatPrice(total, DEFAULT_CURRENCY)} color={C.accent} strong />
          </div>

          <div style={{ marginTop: 12 }}>
            <Button variant="outline" onClick={() => setShowPaymentModal(true)} fullWidth>
              تحديث حالة الدفع
            </Button>
          </div>
        </div>
      </div>

      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="تحديث حالة الدفع">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 9 }}>حالة الدفع</label>
            <div style={{ display: 'flex', gap: 9 }}>
              {[true, false].map((paid) => (
                <button
                  key={String(paid)}
                  type="button"
                  onClick={() => setIsPaid(paid)}
                  style={{
                    flex: 1,
                    padding: '11px 12px',
                    minHeight: 44,
                    borderRadius: 10,
                    border: `1px solid ${isPaid === paid ? C.accent : C.border}`,
                    background: isPaid === paid ? `${C.accent}18` : C.surf,
                    color: isPaid === paid ? C.accent : C.text,
                    fontFamily: 'Cairo, sans-serif',
                    fontWeight: isPaid === paid ? 800 : 600,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  {paid ? 'مدفوع' : 'غير مدفوع'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 9 }}>طريقة الدفع</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 9 }}>
              {PAYMENT_METHODS.map((m) => {
                const active = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 7,
                      padding: '13px 8px',
                      borderRadius: 12,
                      border: `1px solid ${active ? C.accent : C.border}`,
                      background: active ? `${C.accent}18` : C.surf,
                      color: active ? C.accent : C.text,
                      fontFamily: 'Cairo, sans-serif',
                      fontWeight: active ? 800 : 600,
                      fontSize: 12.5,
                      cursor: 'pointer'
                    }}
                  >
                    {paymentIcon(m, 22)}
                    {PAYMENT_LABEL[m]}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 9 }}>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} fullWidth>
              إلغاء
            </Button>
            <Button variant="primary" onClick={savePayment} loading={saving} fullWidth>
              حفظ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const Row: React.FC<{
  label: string;
  value: string;
  color?: string;
  strong?: boolean;
  icon?: React.ReactNode;
}> = ({ label, value, color, strong, icon }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '4px 0' }}>
    <span style={{ color: C.muted, fontSize: strong ? 13.5 : 12.5 }}>{label}</span>
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: color || C.text,
        fontSize: strong ? 16 : 13,
        fontWeight: strong ? 800 : 600,
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {icon}
      {value}
    </span>
  </div>
);

/**
 * عنوان قسم بأيقونة.
 *
 * الأيقونة داخل `<h3>` كانت تقفز إلى سطر مستقلّ فوق النصّ: تمهيد Tailwind
 * يجعل `svg { display: block }`، فلا ينفع معها `vertical-align`. الحلّ صفّ
 * مرن لا محاذاة داخل سطر.
 */
const SectionTitle: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <h3
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: C.text,
      fontSize: 13.5,
      fontWeight: 800,
      margin: '0 0 9px'
    }}
  >
    {icon}
    {children}
  </h3>
);

const box: React.CSSProperties = {
  background: C.surf,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 14,
  marginBottom: 20
};

export default StoreOrderDetails;
