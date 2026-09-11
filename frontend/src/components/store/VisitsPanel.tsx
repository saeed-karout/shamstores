// frontend/src/components/store/VisitsPanel.tsx
//
// تقرير الزيارات — القسم الذي كان غائباً عن صفحة الإحصائيات.
//
// **لماذا القُمع أوّلاً:** الأرقام المنفصلة («٤٠٠ زيارة»، «١٢ طلباً») لا
// تقول للتاجر ما يفعل. والقُمع يقول: أربع مئة دخلوا، ستّون فتحوا منتجاً،
// عشرون أضافوا للسلّة، اثنا عشر طلبوا. فيرى **أين يسقط الناس** — وهذا
// وحده قرارٌ قابل للتنفيذ.

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  IoEyeOutline,
  IoPeopleOutline,
  IoCartOutline,
  IoBagCheckOutline,
  IoTrendingUpOutline,
  IoLockClosedOutline,
  IoPhonePortraitOutline,
  IoDesktopOutline
} from 'react-icons/io5';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Report {
  visits: number;
  storeViews: number;
  productViews: number;
  addToCart: number;
  beginCheckout: number;
  ordersPlaced: number;
  conversionRate: number;
  byDay: Array<{ day: string; visits: number; orders: number }>;
  sources: Array<{ source: string; visits: number }>;
  devices: Array<{ device: string; visits: number }>;
  topProducts: Array<{ productId: string; name: string; views: number; addToCart: number }>;
}

interface Props {
  /** فترة الصفحة: today | week | month */
  period: 'today' | 'week' | 'month';
  colors: {
    bg: string; card: string; surf: string; accent: string;
    text: string; muted: string; border: string; blue: string; purple: string; yellow: string;
  };
}

const SOURCE_LABELS: Record<string, string> = {
  direct: 'مباشر / رابط محفوظ',
  instagram: 'إنستغرام',
  facebook: 'فيسبوك',
  whatsapp: 'واتساب',
  telegram: 'تلغرام',
  tiktok: 'تيك توك',
  snapchat: 'سناب شات',
  google: 'غوغل',
  youtube: 'يوتيوب',
  x: 'X'
};

const VisitsPanel: React.FC<Props> = ({ period, colors: C }) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setLocked(false);
      try {
        // فترات الصفحة بأسماءٍ أخرى — التحويل هنا لا في الخادم، فالخادم
        // يتكلّم بمُدَدٍ صريحة تفهمها أي واجهة
        const map = { today: 'today', week: '7d', month: '30d' } as const;
        const data: any = await api.get(`/store/analytics/visits?period=${map[period]}`);
        if (alive) setReport(data || null);
      } catch (error: any) {
        // 403 = الخطة لا تشمل التحليلات. حالةٌ متوقّعة لا خطأ
        if (alive) setLocked(error?.response?.status === 403);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [period]);

  const card: React.CSSProperties = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: 18
  };

  if (locked) {
    return (
      <div style={{ ...card, display: 'flex', gap: 14, alignItems: 'center' }}>
        <IoLockClosedOutline style={{ color: C.accent, fontSize: 26, flexShrink: 0 }} />
        <div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>تقارير الزيارات ضمن ميزة التحليلات</div>
          <div style={{ color: C.muted, fontSize: 12.5, marginTop: 5, lineHeight: 1.8 }}>
            زيارات متجرك تُسجَّل من الآن حتى قبل الاشتراك — فحين تُفعّل الميزة تجد تاريخك
            كاملاً لا صفحةً تبدأ من الصفر.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ ...card, color: C.muted, fontSize: 13 }}>جاري تحميل تقرير الزيارات…</div>
    );
  }

  if (!report) {
    return <div style={{ ...card, color: C.muted, fontSize: 13 }}>تعذّر تحميل تقرير الزيارات.</div>;
  }

  if (!report.visits) {
    return (
      <div style={{ ...card }}>
        <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          لا زيارات في هذه الفترة
        </div>
        <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.9 }}>
          شارك رابط متجرك في إنستغرام أو واتساب، وسيظهر هنا عدد من دخل، ومن أين جاء،
          وأيّ منتجٍ فتحه — وأين توقّف قبل الطلب.
        </div>
      </div>
    );
  }

  /** خطوة في القُمع — النسبة من الزيارات لا من الخطوة السابقة، فالمقياس واحد */
  const step = (
    icon: React.ReactNode,
    label: string,
    value: number,
    hint: string
  ) => {
    const pct = report.visits ? Math.round((value / report.visits) * 1000) / 10 : 0;
    return (
      <div key={label} style={{ ...card, flex: '1 1 170px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12 }}>
          {icon}
          {label}
        </div>
        <div style={{ color: C.text, fontSize: 26, fontWeight: 800, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
          {value.toLocaleString('ar-SY')}
        </div>
        <div style={{ color: C.accent, fontSize: 11.5, marginTop: 3 }}>
          {pct}% من الزيارات
        </div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 6, lineHeight: 1.7 }}>{hint}</div>
      </div>
    );
  };

  const maxSource = Math.max(...report.sources.map((s) => s.visits), 1);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ===== القُمع ===== */}
      <div>
        <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
          رحلة الزائر
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ ...card, flex: '1 1 170px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12 }}>
              <IoPeopleOutline />
              زيارات
            </div>
            <div style={{ color: C.accent, fontSize: 26, fontWeight: 800, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
              {report.visits.toLocaleString('ar-SY')}
            </div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 9, lineHeight: 1.7 }}>
              زائرٌ تنقّل بين عشر صفحات زيارةٌ واحدة لا عشر
            </div>
          </div>
          {step(<IoEyeOutline />, 'فتحوا منتجاً', report.productViews, 'مشاهدةٌ واحدة لكل منتجٍ في الزيارة')}
          {step(<IoCartOutline />, 'أضافوا للسلّة', report.addToCart, 'كلُّ إضافةٍ تُحسب')}
          {step(<IoBagCheckOutline />, 'بدأوا الدفع', report.beginCheckout, 'ضغط «إتمام الطلب» ببياناتٍ مكتملة')}
          {step(<IoTrendingUpOutline />, 'أتمّوا طلباً', report.ordersPlaced, `نسبة التحويل ${report.conversionRate}%`)}
        </div>
      </div>

      {/* ===== الزيارات يوماً بيوم ===== */}
      {report.byDay.length > 1 && (
        <div style={card}>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
            الزيارات والطلبات يوماً بيوم
          </div>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <ResponsiveContainer width="100%" height={240} minWidth={280}>
              <BarChart data={report.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis
                  dataKey="day"
                  stroke={C.muted}
                  tick={{ fill: C.muted, fontSize: 11 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
                <Bar dataKey="visits" name="زيارات" fill={C.accent} radius={[5, 5, 0, 0]} />
                <Bar dataKey="orders" name="طلبات" fill={C.blue} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {/* ===== المصادر ===== */}
        <div style={card}>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            من أين يأتي زوّارك
          </div>
          <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 14, lineHeight: 1.7 }}>
            مصدرُ **الزيارة** لا الصفحة: من دخل من إنستغرام يبقى محسوباً عليه وإن تنقّل بعدها
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {report.sources.map((s) => (
              <div key={s.source}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: C.text, marginBottom: 5 }}>
                  <span>{SOURCE_LABELS[s.source] || s.source}</span>
                  <span style={{ color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{s.visits}</span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: C.surf, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max((s.visits / maxSource) * 100, 3)}%`,
                      height: '100%',
                      background: C.accent,
                      borderRadius: 99
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* الأجهزة — سطرٌ صغير لا رسمٌ دائريّ لقيمتين */}
          <div style={{ display: 'flex', gap: 16, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            {report.devices.map((d) => (
              <div key={d.device} style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.muted, fontSize: 12.5 }}>
                {d.device === 'desktop' ? <IoDesktopOutline /> : <IoPhonePortraitOutline />}
                {d.device === 'desktop' ? 'حاسب' : 'جوّال'}
                <span style={{ color: C.text, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.visits}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== الأكثر مشاهدة ===== */}
        <div style={card}>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            الأكثر مشاهدةً
          </div>
          <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 14, lineHeight: 1.7 }}>
            منتجٌ يُشاهَد كثيراً ولا يُضاف للسلّة: راجع سعره أو صورته
          </div>
          {report.topProducts.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 12.5 }}>لم يفتح أحدٌ صفحة منتجٍ بعد.</div>
          ) : (
            <div style={{ display: 'grid', gap: 9 }}>
              {report.topProducts.map((p, i) => (
                <div
                  key={p.productId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 11px',
                    borderRadius: 10,
                    background: C.surf
                  }}
                >
                  <span style={{ color: C.muted, fontSize: 11.5, minWidth: 16, fontVariantNumeric: 'tabular-nums' }}>
                    {i + 1}
                  </span>
                  <span style={{ color: C.text, fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  <span style={{ color: C.muted, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IoEyeOutline />
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.views}</span>
                  </span>
                  <span
                    style={{
                      color: p.addToCart ? C.accent : C.muted,
                      fontSize: 11.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <IoCartOutline />
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.addToCart}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitsPanel;
