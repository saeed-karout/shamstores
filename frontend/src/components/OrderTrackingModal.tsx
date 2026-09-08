// components/OrderTrackingModal.tsx
//
// تتبّع الزبون لطلبه — بهوية التاجر، وبمراحل تخصّ نوع نشاطه، ويتحرّك وحده.
//
// **ثلاث علل عولجت هنا:**
//
// ١) **لوحة ألوان غريبة.** كانت الشاشة تستعمل ألوان شام ستورز مكتوبةً في
//    الملف. فيتصفّح الزبون متجراً أزرق ثم يفتح طلبه فتقفز أمامه نافذة خضراء
//    — كأنه غادر المتجر. الآن كلّها `var(--sf-*)`، وهي ألوان التاجر التي
//    يضبطها من إعداداته.
//
// ٢) **مراحل واحدة للجميع.** «قيد التجهيز» في مطعم تعني الطبخ، وفي متجر
//    تعني التغليف. و«جاهز» في مطعم لطلبٍ يُستلم من المحلّ، وفي متجر تعني
//    بانتظار المندوب. نصٌّ واحد للاثنين يقول نصف الحقيقة لكليهما.
//
// ٣) **لا مكان للتقييم.** ثلاثة أعمدة في المخطّط لتقييم المندوب لم يكن
//    يكتبها شيء، لأن الواجهة لم تحوِ نجمةً واحدة.

import React, { useEffect, useMemo, useState } from 'react';
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
  IoReceiptOutline,
  IoCube,
  IoBagCheck,
  IoStar,
  IoStarOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import Modal from './common/Modal';
import api from '../services/api';
import FollowOrderPrompt from './storefront/FollowOrderPrompt';
import { Order, OrderStatus } from '../services/types';
import { sf } from '@/utils/storefrontTheme';

export type TrackingKind = 'store' | 'restaurant';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingOrder: Order | null;
  orders: Order[];
  onSelectOrder: (order: Order | null) => void;
  formatPrice: (price: number) => string;
  loading: boolean;
  /** نوع النشاط — يغيّر نصوص المراحل وأيقوناتها */
  kind?: TrackingKind;
  /** يُستدعى بعد تقييم ناجح ليعيد الصفحة الأم جلب الطلبات */
  onRated?: () => void;
  /** النشاط — تحتاجه دعوة متابعة الطلب لتعرف لمن يشترك الزبون */
  businessId?: string;
  isAuthenticated?: boolean;
}

interface Step {
  key: OrderStatus;
  label: string;
  icon: React.ReactNode;
  hint: string;
}

/** مراحل المطعم: طبخٌ ثم استلام */
const RESTAURANT_STEPS: Step[] = [
  { key: 'pending', label: 'وصل طلبك', icon: <IoReceiptOutline size={17} />, hint: 'بانتظار تأكيد المطعم' },
  { key: 'preparing', label: 'قيد التحضير', icon: <IoRestaurant size={17} />, hint: 'يُطبخ الآن' },
  { key: 'ready', label: 'جاهز', icon: <IoBagCheck size={17} />, hint: 'جاهز للاستلام أو التوصيل' },
  { key: 'delivering', label: 'في الطريق إليك', icon: <IoBicycle size={17} />, hint: 'المندوب خرج بالطلب' },
  { key: 'delivered', label: 'تمّ التسليم', icon: <IoHome size={17} />, hint: 'بالهناء والشفاء' }
];

/** مراحل المتجر: تجهيزٌ وتغليف ثم شحن */
const STORE_STEPS: Step[] = [
  { key: 'pending', label: 'وصل طلبك', icon: <IoReceiptOutline size={17} />, hint: 'بانتظار تأكيد المتجر' },
  { key: 'preparing', label: 'قيد التجهيز', icon: <IoCube size={17} />, hint: 'يُجهَّز ويُغلَّف' },
  { key: 'ready', label: 'جاهز للشحن', icon: <IoBagCheck size={17} />, hint: 'بانتظار المندوب' },
  { key: 'delivering', label: 'في الطريق إليك', icon: <IoBicycle size={17} />, hint: 'المندوب خرج بالطلب' },
  { key: 'delivered', label: 'تمّ التسليم', icon: <IoHome size={17} />, hint: 'وصل الطلب' }
];

const STATUS_META: Record<string, { label: string; tone: 'wait' | 'work' | 'done' | 'bad' }> = {
  pending: { label: 'قيد الانتظار', tone: 'wait' },
  preparing: { label: 'قيد التجهيز', tone: 'work' },
  ready: { label: 'جاهز', tone: 'work' },
  delivering: { label: 'في الطريق', tone: 'work' },
  delivered: { label: 'تمّ التسليم', tone: 'done' },
  served: { label: 'مكتمل', tone: 'done' },
  cancelled: { label: 'ملغي', tone: 'bad' }
};

const TONE_COLOR: Record<string, string> = {
  wait: '#F59E0B',
  work: sf.accent,
  done: '#4ADE80',
  bad: '#FF6B6B'
};

const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  trackingOrder,
  orders,
  onSelectOrder,
  formatPrice,
  loading,
  kind = 'store',
  onRated,
  businessId,
  isAuthenticated
}) => {
  const STEPS = kind === 'restaurant' ? RESTAURANT_STEPS : STORE_STEPS;

  const [orderStars, setOrderStars] = useState(0);
  const [driverStars, setDriverStars] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  // بطاقة جديدة تعني تقييماً جديداً — بلا هذا يحمل الطلبُ الثاني نجومَ الأول
  useEffect(() => {
    setOrderStars(0);
    setDriverStars(0);
    setComment('');
  }, [trackingOrder?.id]);

  /** `served` نهاية المسار كـ`delivered` — ولا مرحلة بعدها */
  const stepIndexOf = (status: string): number => {
    if (status === 'served') return STEPS.length - 1;
    return STEPS.findIndex((s) => s.key === status);
  };

  const currentStep = useMemo(
    () => (trackingOrder ? stepIndexOf(trackingOrder.status) : -1),
    [trackingOrder, kind]
  );

  const meta = (status: string) => STATUS_META[status] || { label: status, tone: 'wait' as const };
  const colorOf = (status: string) => TONE_COLOR[meta(status).tone];

  const isFinished =
    trackingOrder?.status === 'delivered' || trackingOrder?.status === 'served';
  const alreadyRated = Boolean((trackingOrder as any)?.ratedAt || (trackingOrder as any)?.rating);
  const hasDriver = Boolean((trackingOrder as any)?.assignedDriverId);

  /**
   * تقييم كل منتج على حدة — بعد تقييم الطلب لا معه.
   *
   * تقييم الطلب يقول «كانت التجربة جيدة»، ولا يقول أي صنفٍ استحقّها. ومن
   * يفكّر بالشراء يقرأ عن المنتج لا عن الطلب — فتقييمٌ لا ينزل إلى مستوى
   * المنتج لا يُعرض له أصلاً.
   *
   * ويُطلب **بعد** إرسال تقييم الطلب: سؤالان معاً على شاشة واحدة يُفقدان
   * الزبون قبل أن يجيب أحدهما.
   */
  const [reviewables, setReviewables] = useState<any[]>([]);
  const [productStars, setProductStars] = useState<Record<string, number>>({});
  const [savingProduct, setSavingProduct] = useState<string | null>(null);

  const loadReviewables = async (orderId: string) => {
    try {
      const items: any = await api.get(`/orders/${orderId}/reviewable`);
      if (Array.isArray(items) && items.length > 0) {
        setReviewables(items);
        setProductStars(
          Object.fromEntries(items.filter((i: any) => i.myRating).map((i: any) => [i.productId, i.myRating]))
        );
      }
    } catch {
      // المطاعم لا منتجات لها في هذا المسار — الغياب طبيعي لا خطأ
    }
  };

  const rateProduct = async (productId: string, value: number) => {
    if (!trackingOrder) return;
    setProductStars((prev) => ({ ...prev, [productId]: value }));
    setSavingProduct(productId);
    try {
      await api.post(`/orders/${trackingOrder.id}/reviewable/${productId}`, { rating: value });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر حفظ تقييم المنتج');
    } finally {
      setSavingProduct(null);
    }
  };

  // من قيّم الطلب في زيارة سابقة لا يمرّ بـ`submitRating` — ولولا هذا لما
  // رأى تقييم المنتجات أبداً
  useEffect(() => {
    if (isFinished && alreadyRated && trackingOrder?.id && reviewables.length === 0) {
      loadReviewables(trackingOrder.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, alreadyRated, trackingOrder?.id]);

  const submitRating = async () => {
    if (!trackingOrder || orderStars < 1) return;
    setSending(true);
    try {
      await api.post(`/orders/${trackingOrder.id}/rate`, {
        rating: orderStars,
        comment: comment.trim() || undefined,
        driverRating: driverStars > 0 ? driverStars : undefined
      });
      toast.success('شكراً لتقييمك');
      // بعد تقييم الطلب يُعرض تقييم المنتجات — لا قبله
      await loadReviewables(trackingOrder.id);
      onRated?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'تعذّر إرسال التقييم');
    } finally {
      setSending(false);
    }
  };

  const badge = (status: string) => {
    const color = colorOf(status);
    return (
      <span
        style={{
          background: `${color}22`,
          color,
          borderRadius: 999,
          padding: '3px 11px',
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}
      >
        {meta(status).label}
      </span>
    );
  };

  const stars = (value: number, onPick: (n: number) => void, label: string) => (
    <div>
      <div style={{ color: sf.muted, fontSize: 12.5, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            aria-label={`${n} من 5`}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: n <= value ? '#F5C518' : sf.muted,
              display: 'flex'
            }}
          >
            {n <= value ? <IoStar size={26} /> : <IoStarOutline size={26} />}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="طلباتي" size="lg">
      <div style={{ fontFamily: sf.font }}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: sf.muted, fontSize: 14 }}>
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
                color: sf.accent,
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
                <div style={{ color: sf.accent, fontWeight: 800, fontSize: 16 }}>
                  #{trackingOrder.orderNumber}
                </div>
                <div
                  style={{
                    color: sf.muted,
                    fontSize: 12,
                    marginTop: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
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
                  background: '#FF6B6B14',
                  border: '1px solid #FF6B6B44',
                  borderRadius: 12,
                  padding: 14,
                  color: '#FF6B6B',
                  fontSize: 13.5,
                  fontWeight: 700,
                  marginBottom: 18
                }}
              >
                <IoCloseCircle size={20} />
                أُلغي هذا الطلب. تواصل مع {kind === 'restaurant' ? 'المطعم' : 'المتجر'} إن كان ذلك غير
                متوقّع.
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                {STEPS.map((step, index) => {
                  const done = currentStep >= index;
                  const active = currentStep === index;
                  return (
                    <div key={step.key} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          width: 34
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            background: done ? sf.accent : sf.surface,
                            color: done ? sf.onAccent : sf.muted,
                            border: `1px solid ${done ? sf.accent : sf.border}`,
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
                              background: currentStep > index ? sf.accent : sf.border
                            }}
                          />
                        )}
                      </div>

                      <div style={{ paddingBottom: index < STEPS.length - 1 ? 14 : 0, paddingTop: 4 }}>
                        <div
                          style={{
                            color: done ? sf.text : sf.muted,
                            fontSize: 13.5,
                            fontWeight: active ? 800 : 600
                          }}
                        >
                          {step.label}
                        </div>
                        <div style={{ color: sf.muted, fontSize: 11.5, marginTop: 2 }}>{step.hint}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* متابعة الطلب — تُعرض ما دام الطلب لم ينتهِ: بعد التسليم لا
                معنى لعرضٍ يقول «تابع طلبك» */}
            {!isFinished && businessId && (
              <FollowOrderPrompt
                businessId={businessId}
                businessType={kind === 'restaurant' ? 'restaurant' : 'store'}
                isAuthenticated={Boolean(isAuthenticated)}
              />
            )}

            {/* التقييم — بعد التسليم وقبل أن يُقيَّم */}
            {isFinished && !alreadyRated && (
              <div
                style={{
                  background: sf.surface,
                  border: `1px solid ${sf.border}`,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12
                }}
              >
                <div style={{ color: sf.text, fontSize: 14, fontWeight: 800, marginBottom: 12 }}>
                  كيف كانت تجربتك؟
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  {stars(orderStars, setOrderStars, kind === 'restaurant' ? 'تقييم الطلب' : 'تقييم المنتجات')}
                  {hasDriver && stars(driverStars, setDriverStars, 'تقييم المندوب')}
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="ملاحظة (اختياري)"
                  rows={2}
                  maxLength={400}
                  style={{
                    width: '100%',
                    marginTop: 12,
                    background: sf.card,
                    border: `1px solid ${sf.border}`,
                    borderRadius: 10,
                    padding: '10px 12px',
                    color: sf.text,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />

                <button
                  type="button"
                  onClick={submitRating}
                  disabled={orderStars < 1 || sending}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    minHeight: 44,
                    borderRadius: 10,
                    border: 'none',
                    background: orderStars < 1 ? sf.border : sf.accent,
                    color: orderStars < 1 ? sf.muted : sf.onAccent,
                    fontFamily: 'inherit',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: orderStars < 1 || sending ? 'not-allowed' : 'pointer'
                  }}
                >
                  {sending ? 'جاري الإرسال...' : 'أرسل التقييم'}
                </button>
              </div>
            )}

            {/* تقييم المنتجات — يظهر بعد تقييم الطلب، ولمنتجات المتجر فقط */}
            {isFinished && reviewables.length > 0 && (
              <div
                style={{
                  background: sf.surface,
                  border: `1px solid ${sf.border}`,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12
                }}
              >
                <div style={{ color: sf.text, fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
                  قيّم ما اشتريت
                </div>
                <div style={{ color: sf.muted, fontSize: 12, marginBottom: 12, lineHeight: 1.7 }}>
                  رأيك يظهر لمن يفكّر بشراء نفس المنتج. يُحفظ فور اختيارك.
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {reviewables.map((item: any) => (
                    <div
                      key={item.productId}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: savingProduct === item.productId ? 0.6 : 1 }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <span style={{
                          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                          background: sf.card, display: 'grid', placeItems: 'center',
                          color: sf.muted, fontSize: 15
                        }}>
                          ◦
                        </span>
                      )}

                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: sf.text }}>
                        {item.name}
                      </span>

                      <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => rateProduct(item.productId, n)}
                            aria-label={`${n} من 5 لـ${item.name}`}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              padding: 2, fontSize: 17, lineHeight: 1,
                              color: n <= (productStars[item.productId] || 0) ? '#F5B301' : sf.border
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isFinished && alreadyRated && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: sf.surface,
                  border: `1px solid ${sf.border}`,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                  color: sf.muted,
                  fontSize: 13
                }}
              >
                <IoCheckmarkCircle size={16} style={{ color: '#4ADE80' }} />
                شكراً — سجّلنا تقييمك لهذا الطلب.
              </div>
            )}

            {/* العنوان */}
            {trackingOrder.deliveryAddress && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  background: sf.surface,
                  border: `1px solid ${sf.border}`,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                  color: sf.muted,
                  fontSize: 12.5,
                  lineHeight: 1.8
                }}
              >
                <IoLocation size={15} style={{ flexShrink: 0, marginTop: 3, color: sf.accent }} />
                {trackingOrder.deliveryAddress}
              </div>
            )}

            {/* الأصناف */}
            {trackingOrder.orderItems && trackingOrder.orderItems.length > 0 && (
              <div
                style={{
                  background: sf.surface,
                  border: `1px solid ${sf.border}`,
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
                      borderTop: index === 0 ? 'none' : `1px solid ${sf.border}`
                    }}
                  >
                    <span style={{ color: sf.text, fontSize: 13 }}>
                      {item.menuItem?.name || item.product?.name || 'صنف'}
                      <span style={{ color: sf.muted, fontSize: 12 }}> × {item.quantity}</span>
                    </span>
                    <span style={{ color: sf.muted, fontSize: 12.5, whiteSpace: 'nowrap' }}>
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
                background: sf.card,
                border: `1px solid ${sf.border}`,
                borderRadius: 12,
                padding: 14
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: trackingOrder.isPaid ? '#4ADE801F' : '#F59E0B1F',
                  color: trackingOrder.isPaid ? '#4ADE80' : '#F59E0B',
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 11.5,
                  fontWeight: 700
                }}
              >
                <IoWallet size={12} />
                {trackingOrder.isPaid ? 'مدفوع' : 'يُدفع عند الاستلام'}
              </span>
              <span style={{ color: sf.accent, fontWeight: 800, fontSize: 17 }}>
                {formatPrice(Number(trackingOrder.total))}
              </span>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '44px 20px', textAlign: 'center' }}>
            <IoReceiptOutline size={40} style={{ color: sf.muted, opacity: 0.5, marginBottom: 12 }} />
            <div style={{ color: sf.text, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              لا طلبات بعد
            </div>
            <div style={{ color: sf.muted, fontSize: 13 }}>سيظهر طلبك هنا فور إرساله.</div>
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
                  background: sf.surface,
                  border: `1px solid ${sf.border}`,
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
                  <span style={{ color: sf.accent, fontWeight: 800, fontSize: 13.5 }}>
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
                  <span style={{ color: sf.muted, fontSize: 12 }}>
                    {new Date(order.createdAt).toLocaleString('ar-SY', {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                  <span style={{ color: sf.text, fontWeight: 700, fontSize: 13.5 }}>
                    {formatPrice(Number(order.total))}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{'@keyframes ot-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}'}</style>
    </Modal>
  );
};

export default OrderTrackingModal;
