// components/OrderTrackingModal.tsx
//
// تتبّع الزبون لطلبه — خطٌّ زمني يتحرّك وحده.
//
// **ما كان:** بطاقات بأصناف Tailwind فاتحة (`bg-yellow-100 text-yellow-800`)
// داخل نافذة خضراء داكنة، فنصفُ نصوصها بالكاد يُقرأ. وقائمة الحالات تعرف
// أربعاً — `pending` و`preparing` و`ready` و`served` — وتجهل `delivering`
// و`delivered` وهما أهمّ ما ينتظره الزبون: «خرج الطلب» و«وصل».
//
// **وما هو أهمّ:** الشاشة كانت ساكنة. يجهّز التاجر الطلب ويخرج به السائق
// والزبون ينظر إلى «قيد الانتظار» لأنه لم يحدّث الصفحة. فيتّصل بالمتجر
// ليسأل — وهو بالضبط ما تُفترض هذه الشاشة أن تمنعه.

import React, { useMemo } from 'react';
import {
  IoLocation,
  IoCheckmarkCircle,
  IoWallet,
  IoArrowForward,
  IoTime,
  IoRestaurant,
  IoBicycle,
  IoHome,
  IoCloseCircle,
  IoReceiptOutline
} from 'react-icons/io5';
import Modal from './common/Modal';
import { Order, OrderStatus } from '../services/types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingOrder: Order | null;
  orders: Order[];
  onSelectOrder: (order: Order | null) => void;
  formatPrice: (price: number) => string;
  loading: boolean;
}

const C = {
  card: '#0F3D31',
  surf: '#134838',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  yellow: '#F59E0B',
  blue: '#60A5FA',
  green: '#4ADE80'
};

/** المراحل التي يمرّ بها الطلب، بالترتيب الذي يعيشه الزبون */
const STEPS: Array<{ key: OrderStatus; label: string; icon: React.ReactNode; hint: string }> = [
  { key: 'pending', label: 'تمّ استلام طلبك', icon: <IoReceiptOutline size={17} />, hint: 'وصل الطلب إلى المتجر' },
  { key: 'preparing', label: 'قيد التجهيز', icon: <IoRestaurant size={17} />, hint: 'يُحضَّر الآن' },
  { key: 'ready', label: 'جاهز', icon: <IoCheckmarkCircle size={17} />, hint: 'بانتظار المندوب' },
  { key: 'delivering', label: 'في الطريق إليك', icon: <IoBicycle size={17} />, hint: 'المندوب خرج بالطلب' },
  { key: 'delivered', label: 'تمّ التسليم', icon: <IoHome size={17} />, hint: 'وصل الطلب' }
];

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'قيد الانتظار', color: C.yellow },
  preparing: { label: 'قيد التجهيز', color: C.blue },
  ready: { label: 'جاهز', color: C.accent },
  delivering: { label: 'في الطريق', color: C.blue },
  delivered: { label: 'تمّ التسليم', color: C.green },
  served: { label: 'مكتمل', color: C.green },
  cancelled: { label: 'ملغي', color: C.red }
};

/** `served` نهاية المسار كـ`delivered` — ولا مرحلة بعدها */
const stepIndexOf = (status: string): number => {
  if (status === 'served') return STEPS.length - 1;
  const index = STEPS.findIndex((s) => s.key === status);
  return index;
};

const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  trackingOrder,
  orders,
  onSelectOrder,
  formatPrice,
  loading
}) => {
  const meta = (status: string) => STATUS_META[status] || { label: status, color: C.muted };

  const currentStep = useMemo(
    () => (trackingOrder ? stepIndexOf(trackingOrder.status) : -1),
    [trackingOrder]
  );

  const badge = (status: string) => {
    const m = meta(status);
    return (
      <span
        style={{
          background: `${m.color}22`,
          color: m.color,
          borderRadius: 999,
          padding: '3px 11px',
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}
      >
        {m.label}
      </span>
    );
  };

  const paymentBadge = (isPaid: boolean) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: isPaid ? `${C.green}1F` : `${C.yellow}1F`,
        color: isPaid ? C.green : C.yellow,
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: 11.5,
        fontWeight: 700
      }}
    >
      <IoWallet size={12} />
      {isPaid ? 'مدفوع' : 'يُدفع عند الاستلام'}
    </span>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="طلباتي" size="lg">
      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 14 }}>
          جاري التحميل...
        </div>
      ) : trackingOrder ? (
        <div>
          <button
            type="button"
            onClick={() => onSelectOrder(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              color: C.accent,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              marginBottom: 16
            }}
          >
            <IoArrowForward size={15} /> كل طلباتي
          </button>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 18
            }}
          >
            <div>
              <div style={{ color: C.accent, fontWeight: 800, fontSize: 16 }}>
                #{trackingOrder.orderNumber}
              </div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                <IoTime size={12} />
                {new Date(trackingOrder.createdAt).toLocaleString('ar-SY', {
                  day: 'numeric',
                  month: 'long',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            </div>
            {badge(trackingOrder.status)}
          </div>

          {/* الخطّ الزمني */}
          {trackingOrder.status === 'cancelled' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: `${C.red}14`,
                border: `1px solid ${C.red}44`,
                borderRadius: 12,
                padding: 14,
                color: C.red,
                fontSize: 13.5,
                fontWeight: 700,
                marginBottom: 18
              }}
            >
              <IoCloseCircle size={20} />
              أُلغي هذا الطلب. تواصل مع المتجر إن كان ذلك غير متوقّع.
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              {STEPS.map((step, index) => {
                const done = currentStep >= index;
                const active = currentStep === index;
                return (
                  <div key={step.key} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                    {/* العمود: الدائرة والخطّ */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 34 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background: done ? C.accent : C.surf,
                          color: done ? '#082E24' : C.muted,
                          border: `1px solid ${done ? C.accent : C.border}`,
                          flexShrink: 0,
                          // نبضةٌ على المرحلة الحالية: العين تجدها بلا بحث
                          animation: active ? 'ot-pulse 1.6s ease-in-out infinite' : undefined
                        }}
                      >
                        {step.icon}
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          style={{
                            flex: 1,
                            width: 2,
                            minHeight: 22,
                            background: currentStep > index ? C.accent : C.border
                          }}
                        />
                      )}
                    </div>

                    <div style={{ paddingBottom: index < STEPS.length - 1 ? 14 : 0, paddingTop: 4 }}>
                      <div
                        style={{
                          color: done ? C.text : C.muted,
                          fontSize: 13.5,
                          fontWeight: active ? 800 : 600
                        }}
                      >
                        {step.label}
                      </div>
                      <div style={{ color: C.muted, fontSize: 11.5, marginTop: 2 }}>{step.hint}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* العنوان */}
          {trackingOrder.deliveryAddress && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                background: C.surf,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
                color: C.muted,
                fontSize: 12.5,
                lineHeight: 1.8
              }}
            >
              <IoLocation size={15} style={{ flexShrink: 0, marginTop: 3, color: C.accent }} />
              {trackingOrder.deliveryAddress}
            </div>
          )}

          {/* الأصناف */}
          {trackingOrder.orderItems && trackingOrder.orderItems.length > 0 && (
            <div
              style={{
                background: C.surf,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 12
              }}
            >
              {trackingOrder.orderItems.map((item: any, index: number) => (
                <div
                  key={item.id || index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderTop: index === 0 ? 'none' : `1px solid ${C.border}`
                  }}
                >
                  <span style={{ color: C.text, fontSize: 13 }}>
                    {item.menuItem?.name || item.product?.name || 'صنف'}
                    <span style={{ color: C.muted, fontSize: 12 }}> × {item.quantity}</span>
                  </span>
                  <span style={{ color: C.muted, fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    {formatPrice(Number(item.price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* الإجمالي */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 14
            }}
          >
            {paymentBadge(Boolean(trackingOrder.isPaid))}
            <span style={{ color: C.accent, fontWeight: 800, fontSize: 17 }}>
              {formatPrice(Number(trackingOrder.total))}
            </span>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ padding: '44px 20px', textAlign: 'center' }}>
          <IoReceiptOutline size={40} style={{ color: C.muted, opacity: 0.5, marginBottom: 12 }} />
          <div style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>لا طلبات بعد</div>
          <div style={{ color: C.muted, fontSize: 13 }}>سيظهر طلبك هنا فور إرساله.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => onSelectOrder(order)}
              style={{
                textAlign: 'right',
                background: C.surf,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                width: '100%'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8
                }}
              >
                <span style={{ color: C.accent, fontWeight: 800, fontSize: 13.5 }}>
                  #{order.orderNumber}
                </span>
                {badge(order.status)}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <span style={{ color: C.muted, fontSize: 12 }}>
                  {new Date(order.createdAt).toLocaleString('ar-SY', {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </span>
                <span style={{ color: C.text, fontWeight: 700, fontSize: 13.5 }}>
                  {formatPrice(Number(order.total))}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <style>{'@keyframes ot-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}'}</style>
    </Modal>
  );
};

export default OrderTrackingModal;
