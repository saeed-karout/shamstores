// frontend/src/components/marketing/FeatureBento.tsx
//
// «أدوات تاجرٍ محترف، بلا تعقيد» — شبكة بنتو في ثلاث مجموعات (البيع، الإدارة،
// النموّ). البطاقات العريضة تحمل مشهداً مصغّراً حيّاً من الواجهة نفسها،
// والأيقونات من Phosphor (ثنائية اللون) بدل مربّعات التدرّج العامّة.
//
// المحتوى صادق: كل ميزة هنا موجودة في اللوحة اليوم، وما يتبع خطةً أعلى أو
// إضافةً مدفوعة مُعلَّم — والتفصيل الكامل لكل خطة في جدول المقارنة بالأسعار.

import React from 'react';
import {
  PiQrCodeDuotone, PiBellRingingDuotone, PiPackageDuotone, PiMopedDuotone, PiUsersThreeDuotone,
  PiTicketDuotone, PiMegaphoneDuotone, PiBarcodeDuotone, PiHandshakeDuotone, PiChartLineUpDuotone,
  PiGlobeHemisphereEastDuotone, PiTranslateDuotone, PiLockKeyDuotone, PiShoppingBagDuotone,
  PiStorefrontDuotone, PiTrendUpBold
} from 'react-icons/pi';
import type { IconType } from 'react-icons';

type Visual = 'orders' | 'pos' | 'stock' | 'domain' | 'coupon' | 'analytics';

interface Tile {
  icon: IconType;
  title: string;
  desc: string;
  tag?: string;
  wide?: boolean;
  visual?: Visual;
}

interface Group {
  key: 'sell' | 'manage' | 'grow';
  num: string;
  title: string;
  lead: string;
  tiles: Tile[];
}

const GROUPS: Group[] = [
  {
    key: 'sell',
    num: '01',
    title: 'البيع',
    lead: 'من أوّل مسحٍ للرمز حتى باب الزبون — وفي محلّك أيضاً.',
    tiles: [
      {
        icon: PiBellRingingDuotone,
        title: 'طلبات حيّة',
        desc: 'كلّ طلب يصل لحظياً مع تنبيه صوتيّ وإشعار متصفّح ورسالة تيليغرام، وزبونك يتابع حالته حتى التسليم.',
        wide: true,
        visual: 'orders'
      },
      {
        icon: PiQrCodeDuotone,
        title: 'قائمة رقمية ورموز QR',
        desc: 'رمز لكل طاولة، والطلب يصل مطبخك برقمها. تعديل الأسعار فوريّ بلا إعادة طباعة.'
      },
      {
        icon: PiMopedDuotone,
        title: 'توصيل وشحن',
        desc: 'سائقوك بتتبّعٍ مباشر، وأجرة شحن لكل محافظة من المحافظات الأربع عشرة.'
      },
      {
        icon: PiBarcodeDuotone,
        title: 'كاشير POS',
        desc: 'بِع من المحلّ بمسح الباركود بكاميرا الهاتف، وإيصال قابل للطباعة، وملخّص الوردية — والمخزون ينقص تلقائياً.',
        tag: 'خطط مختارة أو إضافة',
        wide: true,
        visual: 'pos'
      }
    ]
  },
  {
    key: 'manage',
    num: '02',
    title: 'الإدارة',
    lead: 'منتجاتك وزبائنك وواجهتك — مرتّبة وتحت يدك.',
    tiles: [
      {
        icon: PiPackageDuotone,
        title: 'منتجات ومخزون',
        desc: 'تصنيفات فرعية، وسوم، خيارات مقاس ولون، صور متعددة، وتنبيه قبل نفاد الكمية.',
        wide: true,
        visual: 'stock'
      },
      {
        icon: PiUsersThreeDuotone,
        title: 'زبائنك في مكان واحد',
        desc: 'من يعود ومن انقطع، وسجلّ طلبات كلّ زبون، وتصدير بملفّ CSV.'
      },
      {
        icon: PiTranslateDuotone,
        title: 'عربي وإنجليزي، ليرة ودولار',
        desc: 'واجهة بلغتين، والأسعار بالدولار بسعر صرف موحّد على المنصّة.',
        tag: 'اللغتان: خطة أو إضافة'
      },
      {
        icon: PiGlobeHemisphereEastDuotone,
        title: 'نطاقك الخاص',
        desc: 'رابط فرعيّ مجانيّ فوراً، أو اربط نطاقك بسجلّ CNAME واحد مع شهادة SSL تلقائية.',
        tag: 'النطاق الخاص: خطة أو إضافة',
        wide: true,
        visual: 'domain'
      }
    ]
  },
  {
    key: 'grow',
    num: '03',
    title: 'النموّ',
    lead: 'أدوات تعيد الزبون، وتجلب زبوناً جديداً، وتقول لك ما ينجح.',
    tiles: [
      {
        icon: PiTicketDuotone,
        title: 'كوبونات وعروض',
        desc: 'خصم بنسبة أو مبلغ، بحدّ أدنى وتاريخ انتهاء وعدد استخدامات — وأقسام عروض تبرز ما تريد بيعه.',
        tag: 'الخطط المدفوعة أو إضافة',
        wide: true,
        visual: 'coupon'
      },
      {
        icon: PiMegaphoneDuotone,
        title: 'حملات ورسائل تلقائية',
        desc: 'تذكير بالسلّة المتروكة، ورسالة لمن انقطع — لمن وافق فقط.'
      },
      {
        icon: PiHandshakeDuotone,
        title: 'مسوّقون بالعمولة',
        desc: 'رابط لكل مسوّق، وعمولة تُحسب تلقائياً ولا تُستحقّ إلا باكتمال الطلب.',
        tag: 'خطط مختارة أو إضافة'
      },
      {
        icon: PiChartLineUpDuotone,
        title: 'تحليلات ومالية',
        desc: 'رحلة الزائر حتى الطلب، ومصادر الزيارات، والربح الفعليّ لكل طلب.',
        tag: 'التحليلات: خطة أو إضافة',
        wide: true,
        visual: 'analytics'
      }
    ]
  }
];

// ===== المشاهد المصغّرة =====

// مخطّط باركود ثابت — عرض كل خطّ بالبكسل
const BARS = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 1, 2, 2, 1, 3];

const VisualView: React.FC<{ kind: Visual }> = ({ kind }) => {
  switch (kind) {
    case 'orders':
      return (
        <div className="ss-bn-vis ss-bn-orders" aria-hidden="true">
          {[
            ['#1258', 'توصيل', '95,000'],
            ['#1257', 'طاولة 4', '48,000'],
            ['#1256', 'استلام', '185,000']
          ].map(([id, type, amt], i) => (
            <div key={id} className="ss-bn-toast" style={{ ['--i' as any]: i }}>
              <span className="ss-bn-toast-dot"><PiBellRingingDuotone /></span>
              <span className="ss-bn-toast-txt">
                <b>طلب جديد <bdi className="latin">{id}</bdi></b>
                <small>{type}</small>
              </span>
              <span className="ss-bn-toast-amt"><bdi className="latin">{amt}</bdi> ل.س</span>
            </div>
          ))}
        </div>
      );
    case 'pos':
      return (
        <div className="ss-bn-vis ss-bn-pos" aria-hidden="true">
          <div className="ss-bn-scan">
            <div className="ss-bn-bars">
              {BARS.map((w, i) => <i key={i} style={{ width: w * 2 }} />)}
            </div>
            <span className="ss-bn-beam" />
            <small className="latin">6 291041 500213</small>
          </div>
          <div className="ss-bn-receipt">
            <p><span>قهوة عربية × 2</span><bdi className="latin">24,000</bdi></p>
            <p><span>كعكة بالتمر</span><bdi className="latin">18,000</bdi></p>
            <p className="is-total"><span>المجموع</span><bdi className="latin">42,000 ل.س</bdi></p>
          </div>
        </div>
      );
    case 'stock':
      return (
        <div className="ss-bn-vis ss-bn-stock" aria-hidden="true">
          {[
            { name: 'قميص قطني — M', left: 48, pct: 80 },
            { name: 'حذاء رياضي — 42', left: 21, pct: 45 },
            { name: 'حقيبة جلد — بنّي', left: 3, pct: 8, low: true }
          ].map((r, i) => (
            <div key={r.name} className={`ss-bn-stock-row ${r.low ? 'is-low' : ''}`} style={{ ['--i' as any]: i, ['--w' as any]: `${r.pct}%` }}>
              <span className="ss-bn-thumb"><PiShoppingBagDuotone /></span>
              <span className="ss-bn-stock-name">
                <b>{r.name}</b>
                <span className="ss-bn-meter"><i /></span>
              </span>
              <span className="ss-bn-stock-left">
                <bdi className="latin">{r.left}</bdi> {r.low ? 'متبقية' : 'قطعة'}
              </span>
            </div>
          ))}
        </div>
      );
    case 'domain':
      return (
        <div className="ss-bn-vis ss-bn-domain" aria-hidden="true">
          <div className="ss-bn-urlbar">
            <PiLockKeyDuotone />
            <span className="ss-bn-urls latin">
              <span>name.shamstores.com</span>
              <span>www.mystore.com</span>
            </span>
            <em className="latin">SSL</em>
          </div>
          <div className="ss-bn-site">
            <span className="ss-bn-site-logo"><PiStorefrontDuotone /></span>
            <span className="ss-bn-site-lines"><i /><i /></span>
            <span className="ss-bn-site-grid"><i /><i /><i /></span>
          </div>
        </div>
      );
    case 'coupon':
      return (
        <div className="ss-bn-vis ss-bn-coupon" aria-hidden="true">
          <div className="ss-bn-ticket">
            <div className="ss-bn-ticket-main">
              <small>كود الخصم</small>
              <b className="latin">SHAM20</b>
              <span>ينتهي بعد 7 أيام · حتى 100 استخدام</span>
            </div>
            <div className="ss-bn-ticket-stub">
              <b className="latin">-20%</b>
              <small>على السلّة</small>
            </div>
          </div>
          <div className="ss-bn-applied">
            <span>تمّ تطبيق الخصم</span>
            <bdi className="latin">−18,000 ل.س</bdi>
          </div>
        </div>
      );
    case 'analytics':
      return (
        <div className="ss-bn-vis ss-bn-analytics" aria-hidden="true">
          <div className="ss-bn-funnel">
            {[
              ['زيارات', '100%'],
              ['أضافوا للسلّة', '38%'],
              ['أتمّوا الطلب', '12%']
            ].map(([l, v], i) => (
              <div key={l} style={{ ['--i' as any]: i, ['--w' as any]: v }}>
                <span>{l}</span>
                <i />
                <b className="latin">{v}</b>
              </div>
            ))}
          </div>
          <div className="ss-bn-chart">
            {[34, 48, 40, 62, 55, 74, 88].map((h, i) => (
              <i key={i} style={{ ['--h' as any]: `${h}%`, ['--i' as any]: i }} />
            ))}
            <span className="ss-bn-chart-tag"><PiTrendUpBold /> <bdi className="latin">+18%</bdi></span>
          </div>
        </div>
      );
    default:
      return null;
  }
};

// ضوءٌ خفيف يتبع المؤشّر على البطاقة — متغيّران فقط، بلا إعادة رسم React
const onTileMove = (e: React.PointerEvent<HTMLElement>) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
};

const FeatureBento: React.FC = () => (
  <section id="features" className="ss-section ss-bn" aria-labelledby="features-title">
    <div className="ss-container">
      <div className="ss-section-head ss-reveal">
        <span className="ss-eyebrow">كل ما تحتاجه</span>
        <h2 id="features-title" className="ss-h2">أدوات تاجرٍ محترف، بلا تعقيد</h2>
        <p className="ss-lead">
          كلّ ميزة هنا موجودة في لوحتك اليوم. ما يتبع خطةً أعلى أو إضافةً مدفوعة مُعلَّمٌ بوضوح،
          والتفصيل الكامل في جدول الأسعار.
        </p>
      </div>

      <div className="ss-bn-groups">
        {GROUPS.map((g) => (
          <div key={g.key} className={`ss-bn-group is-${g.key}`} aria-labelledby={`bn-${g.key}`}>
            <header className="ss-bn-ghead ss-reveal">
              <span className="ss-bn-num latin">{g.num}</span>
              <h3 id={`bn-${g.key}`}>{g.title}</h3>
              <p>{g.lead}</p>
            </header>
            <div className="ss-bn-grid">
              {g.tiles.map((t, i) => (
                <article
                  key={t.title}
                  className={`ss-bn-tile ss-reveal ${t.wide ? 'is-wide' : ''}`}
                  style={{ ['--d' as any]: `${i * 90}ms` }}
                  onPointerMove={onTileMove}
                >
                  <div className="ss-bn-copy">
                    <div className="ss-bn-top">
                      <span className="ss-bn-icon"><t.icon /></span>
                      {t.tag && <span className="ss-bn-tag">{t.tag}</span>}
                    </div>
                    <h4>{t.title}</h4>
                    <p>{t.desc}</p>
                  </div>
                  {t.visual && <VisualView kind={t.visual} />}
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeatureBento;
