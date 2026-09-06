// components/orders/OrderDetails.tsx
//
// تفاصيل طلب المطعم — بلوحة اللوحة الداكنة لا بلوحة فاتحة.
//
// كانت هذه البطاقة `bg-white` بنصوص `text-gray-*` داخل لوحة تحكّم خضراء
// داكنة: يفتح صاحب المطعم طلباً فتقفز أمامه بطاقة من تصميم آخر. وهي نفس
// العلّة التي عولجت في بطاقة المتجر، فجُعلت الشاشتان بلوحة واحدة.
//
// وترتيب الأقسام يتبع ما يفعله صاحب المطعم بالطلب: يقرأ الحالة فيغيّرها،
// ثم يحتاج رقم الزبون ليتصل، ثم قائمة ما يجهّزه. الإجمالي في الأسفل حيث
// يتوقّعه من قرأ فاتورة.

import React, { useState } from 'react';
import { Order, OrderStatus, PaymentMethod } from '../../services/types';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  IoCash,
  IoCard,
  IoLogoBitcoin,
  IoPhonePortrait,
  IoTime,
  IoCall,
  IoLocation,
  IoRestaurant,
  IoWallet,
  IoCheckmark,
  IoPricetag
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../../services/api';
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

interface OrderDetailsProps {
  order: Order;
  onUpdateStatus: (status: OrderStatus) => void;
  onUpdatePayment?: (isPaid: boolean, paymentMethod?: PaymentMethod) => void;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'قيد الانتظار', color: C.yellow },
  preparing: { label: 'قيد التحضير', color: C.blue },
  ready: { label: 'جاهز', color: C.purple },
  delivering: { label: 'قيد التوصيل', color: C.blue },
  delivered: { label: 'تم التوصيل', color: C.accent },
  served: { label: 'مكتمل', color: C.accent },
  cancelled: { label: 'ملغي', color: C.red }
};

const STATUS_FLOW: OrderStatus[] = [
  'pending',
  'preparing',
  'ready',
  'delivering',
  'delivered',
  'served',
  'cancelled'
];

const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in: 'في المطعم',
  delivery: 'توصيل',
  takeaway: 'استلام من المحل'
};

/** شام كاش محفظة سورية مفعّلة في المخطّط، وكانت ساقطة من كل قوائم الواجهة */
const PAYMENT_LABEL: Record<string, string> = {
  cash: 'نقدي',
  card: 'بطاقة',
  online: 'إلكتروني',
  sham_cash: 'شام كاش'
};

const toNumber = (value: number | string | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value) || 0;
};

/** الإضافات تصل نصّاً أحياناً ومصفوفة أحياناً — حسب من كتب المسار */
const addonList = (addons: string | string[] | undefined | null): string[] => {
  if (!addons) return [];
  if (Array.isArray(addons)) return addons.filter(Boolean);
  try {
    const parsed = JSON.parse(addons);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    /* نصّ عادي */
  }
  return String(addons).split(',').map(s => s.trim()).filter(Boolean);
};

const OrderDetails: React.FC<OrderDetailsProps> = ({ order, onUpdateStatus, onUpdatePayment }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(order.paymentMethod || 'cash');
  const [isPaid, setIsPaid] = useState(order.isPaid || false);
  const [updating, setUpdating] = useState(false);

  const items = order.orderItems || [];
  const meta = STATUS_META[order.status] || { label: order.status, color: C.muted };

  const total = toNumber(order.total);
  const itemsTotal = items.reduce((sum, item) => sum + toNumber(item.price) * item.quantity, 0);
  const discount = toNumber(order.discountAmount);
  // فرق الإجمالي عن مجموع الأصناف بعد الخصم = توصيل أو رسوم. عرضه سطراً
  // مستقلاً يمنع سؤال «لماذا الإجمالي أكبر من الأصناف؟»
  const extra = Math.round((total - (itemsTotal - discount)) * 100) / 100;

  const handleUpdatePayment = async () => {
    setUpdating(true);
    try {
      await api.patch(`/orders/${order.id}/payment`, {
        isPaid,
        paymentMethod: selectedPaymentMethod
      });
      toast.success('تم تحديث حالة الدفع');
      setShowPaymentModal(false);
      if (onUpdatePayment) onUpdatePayment(isPaid, selectedPaymentMethod);
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('فشل تحديث حالة الدفع');
    } finally {
      setUpdating(false);
    }
  };

  const paymentIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return <IoCash size={16} color={C.accent} />;
      case 'card':
        return <IoCard size={16} color={C.blue} />;
      case 'online':
        return <IoLogoBitcoin size={16} color={C.purple} />;
      case 'sham_cash':
        return <IoPhonePortrait size={16} color={C.accent} />;
      default:
        return null;
    }
  };

  const paymentText = (method: PaymentMethod) =>
    PAYMENT_LABEL[method] || method;

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
        <div style={{ color: C.muted, fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <IoTime size={13} />
          {format(new Date(order.createdAt), 'dd MMMM yyyy — hh:mm a', { locale: ar })}
          {order.table?.name && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <IoRestaurant size={13} /> طاولة {order.table.name}
            </>
          )}
          {order.orderType && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              {ORDER_TYPE_LABEL[order.orderType] || order.orderType}
            </>
          )}
        </div>
      </div>

      <div style={{ padding: 18 }}>
        {/* تغيير الحالة */}
        <SectionTitle>تحديث حالة الطلب</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {STATUS_FLOW.map(status => {
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
        {(order.customerName || order.customerPhone || order.deliveryAddress || order.deliveryLocation) && (
          <>
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
              {(order.deliveryAddress || order.deliveryLocation) && (
                <div style={{ color: C.muted, fontSize: 12.5, marginTop: 8, display: 'flex', gap: 6, lineHeight: 1.8 }}>
                  <IoLocation size={14} style={{ flexShrink: 0, marginTop: 3 }} />
                  {order.deliveryAddress || order.deliveryLocation}
                </div>
              )}
            </div>
          </>
        )}

        {/* الأصناف */}
        <SectionTitle icon={<IoRestaurant size={15} />}>الأصناف ({items.length})</SectionTitle>
        <div style={{ ...box, padding: 0, overflow: 'hidden' }}>
          {items.length === 0 ? (
            <div style={{ padding: 18, color: C.muted, fontSize: 13 }}>لا أصناف في هذا الطلب.</div>
          ) : (
            items.map((item, index) => {
              const addons = addonList(item.addons);
              const name = item.menuItem?.name || (item as any).product?.name || 'صنف محذوف';
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 11,
                    padding: 12,
                    borderTop: index === 0 ? 'none' : `1px solid ${C.border}`
                  }}
                >
                  {/* الكمّية أول ما تُقرأ في المطبخ */}
                  <div
                    style={{
                      minWidth: 30,
                      height: 30,
                      borderRadius: 8,
                      background: `${C.accent}18`,
                      color: C.accent,
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                      flexShrink: 0
                    }}
                  >
                    {item.quantity}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.text, fontSize: 13.5, fontWeight: 600 }}>{name}</div>
                    {/* الخيارات تُعرض للمطبخ: بلا المقاس والإضافات يُجهَّز الطلب خطأً */}
                    {(item.size || addons.length > 0) && (
                      <div style={{ color: C.accent, fontSize: 11.5, marginTop: 3 }}>
                        {[item.size, ...addons].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {item.notes && (
                      <div style={{ color: C.yellow, fontSize: 11.5, marginTop: 3 }}>ملاحظة: {item.notes}</div>
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

        {/* ملاحظة الطلب */}
        {order.notes && (
          <>
            <SectionTitle>ملاحظات الطلب</SectionTitle>
            <div style={{ ...box, color: C.text, fontSize: 13, lineHeight: 1.9 }}>{order.notes}</div>
          </>
        )}

        {/* الدفع */}
        <SectionTitle icon={<IoWallet size={15} />}>الدفع</SectionTitle>
        <div style={box}>
          <Row
            label="الطريقة"
            value={paymentText(order.paymentMethod)}
            icon={paymentIcon(order.paymentMethod)}
          />
          <Row
            label="الحالة"
            value={order.isPaid ? 'مدفوع' : 'غير مدفوع'}
            color={order.isPaid ? C.accent : C.yellow}
          />
          <Row label="مجموع الأصناف" value={formatPrice(itemsTotal, DEFAULT_CURRENCY)} />
          {discount > 0 && (
            <Row
              label={order.couponCode ? `خصم (${order.couponCode})` : 'الخصم'}
              value={`− ${formatPrice(discount, DEFAULT_CURRENCY)}`}
              color={C.accent}
              icon={order.couponCode ? <IoPricetag size={14} color={C.accent} /> : undefined}
            />
          )}
          {extra !== 0 && (
            <Row
              label={extra > 0 ? 'التوصيل ورسوم أخرى' : 'فرق'}
              value={formatPrice(Math.abs(extra), DEFAULT_CURRENCY)}
              color={C.muted}
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

      {/* مودال تحديث الدفع */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="تحديث حالة الدفع">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 9 }}>حالة الدفع</label>
            <div style={{ display: 'flex', gap: 9 }}>
              {[true, false].map(paid => (
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
              {(['cash', 'card', 'online', 'sham_cash'] as PaymentMethod[]).map(method => {
                const active = selectedPaymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(method)}
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
                    {method === 'cash' && <IoCash size={22} />}
                    {method === 'card' && <IoCard size={22} />}
                    {method === 'online' && <IoLogoBitcoin size={22} />}
                    {method === 'sham_cash' && <IoPhonePortrait size={22} />}
                    {paymentText(method)}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 9 }}>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} fullWidth>
              إلغاء
            </Button>
            <Button variant="primary" onClick={handleUpdatePayment} loading={updating} fullWidth>
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

export default OrderDetails;
