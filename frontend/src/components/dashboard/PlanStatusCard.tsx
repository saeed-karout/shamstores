// frontend/src/components/dashboard/PlanStatusCard.tsx
//
// حالة الخطة أمام التاجر: ما يملكه، وكم استهلك، ومتى يُغلق.
//
// كانت هذه المعلومة موجودة في قاعدة البيانات وغائبة عن الشاشة تماماً:
// الحصّة رقمٌ في جدول الخطط، وتاريخ الانتهاء عمودٌ لا يُعرض. فيكتشف
// التاجر انتهاء اشتراكه حين تُغلق ميزاته فجأةً، ويكتشف بلوغ الحصّة حين
// يشكو زبون أن الطلب لم يُرسَل.
//
// البطاقة تُخفي نفسها عند العطل بدل عرض أرقام قد تكون خاطئة: «٠ من ٥»
// كذباً أسوأ من لا شيء — التاجر يوقف حملته الإعلانية بناءً عليه.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IoTimeOutline,
  IoWarningOutline,
  IoInfiniteOutline,
  IoTrendingUpOutline
} from 'react-icons/io5';
import api from '@/services/api';

interface OrderQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string;
  exceeded: boolean;
}

interface PlanStatus {
  plan: { id: string; name: string; price: number; hasOnlineOrders: boolean } | null;
  orders: OrderQuota | null;
  subscription: {
    planName: string;
    endDate: string;
    daysRemaining: number | null;
    expiringSoon: boolean;
  } | null;
}

const C = {
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  orange: '#FB923C'
};

const PLAN_LABELS: Record<string, string> = {
  free: 'المجانية',
  basic: 'الأساسية',
  pro: 'الاحترافية',
  enterprise: 'المتقدمة'
};

const PlanStatusCard: React.FC = () => {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // api.get يُرجع الحمولة مفكوكة التغليف — لا تفكّها مجدداً
        const data: any = await api.get('/subscriptions/plan-status');
        if (!data?.plan) throw new Error('no plan');
        setStatus(data);
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  if (failed || !status?.plan) return null;

  const { plan, orders, subscription } = status;
  const planLabel = PLAN_LABELS[plan.name] || plan.name;

  const unlimited = !orders || orders.limit === null;
  const used = orders?.used ?? 0;
  const limit = orders?.limit ?? 0;
  const ratio = unlimited || limit === 0 ? 0 : Math.min(1, used / limit);

  // ثلاث حالات لا اثنتان: «اقترب» تنبيه، و«بلغ» توقّف — ولونٌ واحد
  // لهما كان يخفي الفرق بين تحذير وقفٍ فعلي
  const barColor = orders?.exceeded ? C.red : ratio >= 0.8 ? C.orange : C.accent;

  const resetLabel = orders
    ? new Date(orders.resetsAt).toLocaleDateString('ar', { day: 'numeric', month: 'long' })
    : '';

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${orders?.exceeded ? `${C.red}55` : C.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 24
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ color: C.muted, fontSize: 13 }}>خطتك الحالية</span>
        <span
          style={{
            background: 'rgba(200,226,53,0.14)',
            color: C.accent,
            borderRadius: 999,
            padding: '3px 12px',
            fontSize: 13,
            fontWeight: 800
          }}
        >
          {planLabel}
        </span>

        {subscription?.daysRemaining !== null && subscription?.daysRemaining !== undefined && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: subscription.expiringSoon ? C.orange : C.muted,
              fontSize: 12.5,
              fontWeight: subscription.expiringSoon ? 700 : 400
            }}
          >
            <IoTimeOutline size={14} />
            {subscription.daysRemaining === 0
              ? 'ينتهي اليوم'
              : `يتبقّى ${subscription.daysRemaining} ${subscription.daysRemaining === 1 ? 'يوم' : 'يوماً'}`}
          </span>
        )}

        <Link
          to="/plans"
          style={{
            marginInlineStart: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: C.accent,
            fontSize: 12.5,
            fontWeight: 700,
            textDecoration: 'none'
          }}
        >
          <IoTrendingUpOutline size={15} />
          {plan.name === 'enterprise' ? 'إدارة الخطة' : 'ترقية'}
        </Link>
      </div>

      {/* الطلبات — الحدّ الوحيد الذي يوقف العمل فعلاً حين يُبلَغ */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
          <span style={{ color: C.muted, fontSize: 12.5 }}>طلبات هذا الشهر</span>
          <span style={{ color: C.text, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {unlimited ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.muted }}>
                <IoInfiniteOutline size={15} /> بلا حدّ
              </span>
            ) : (
              <>
                {used} <span style={{ color: C.muted, fontWeight: 400 }}>من {limit}</span>
              </>
            )}
          </span>
        </div>

        {!unlimited && (
          <>
            <div
              style={{ height: 7, borderRadius: 999, background: C.surf, overflow: 'hidden' }}
              role="progressbar"
              aria-valuenow={used}
              aria-valuemin={0}
              aria-valuemax={limit}
              aria-label="الطلبات المستهلكة هذا الشهر"
            >
              <div
                style={{
                  width: `${ratio * 100}%`,
                  height: '100%',
                  background: barColor,
                  transition: 'width 0.4s ease'
                }}
              />
            </div>

            <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.85 }}>
              {orders?.exceeded ? (
                <span style={{ color: C.red, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <IoWarningOutline size={14} style={{ flexShrink: 0, marginTop: 3 }} />
                  <span>
                    بلغتَ حصّة الشهر — <strong>لا تصلك طلبات جديدة</strong> حتى {resetLabel}.
                    الترقية تفتحها الآن.
                  </span>
                </span>
              ) : ratio >= 0.8 ? (
                <span style={{ color: C.orange, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <IoWarningOutline size={14} />
                  اقتربت من الحصّة — يتبقّى {orders?.remaining} فقط.
                </span>
              ) : (
                <span style={{ color: C.muted }}>يُصفَّر العدّاد في {resetLabel}.</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlanStatusCard;
