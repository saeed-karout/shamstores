// frontend/src/pages/HomePage.tsx
//
// الموقع التسويقي — استقطاب التجّار. بهوية شام ستورز: الأخضر #084835،
// البنفسجي #C07CDF، وليمونيّ علامة S، بخطّي Cairo وInter.
//
// قاعدة المحتوى باقية كما كانت: لا شهادات عملاء ولا أرقام إنجاز مخترعة.
// الأرقام داخل شاشات الأجهزة أمثلة عرضٍ لواجهةٍ حقيقية، والأسعار تُقرأ حيّةً
// من الخادم بسعر الصرف الموحّد — لا نسخة مكتوبة هنا تتقادم.

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  IoMenu, IoClose, IoArrowBack, IoCheckmarkCircle, IoShieldCheckmark,
  IoRestaurant, IoStorefront, IoArrowUp, IoWallet, IoChatbubbles, IoFlash,
  IoNotificationsOutline, IoColorPaletteOutline, IoPhonePortraitOutline, IoAdd, IoGrid, IoLogOut,
  IoRocketOutline, IoSparkles
} from 'react-icons/io5';
import type { IconType } from 'react-icons';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import '@/styles/brand.css';
import { BrandLogo, BrandMark } from '@/components/marketing/Brand';
import { PhoneFrame, LaptopFrame, useElementWidth } from '@/components/marketing/Devices';
import {
  RestaurantScreen, StoreScreen, DashboardScreen, TrackingScreen, StoreDesktopScreen, THEMES, StoreLayout
} from '@/components/marketing/MockScreens';
import PlatformShowcase from '@/components/marketing/PlatformShowcase';
import FeatureBento from '@/components/marketing/FeatureBento';
// أسماء الخطط من `utils/planLabels` (عبر PricingSection) — الاسم نفسه في لوحة التاجر
import PricingSection, { type PublicPlan } from '@/components/marketing/PricingSection';

// ===== ظهورٌ تدريجيّ عند التمرير =====
const useReveal = () => {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.ss-reveal:not(.is-in)'));
    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((n) => n.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  });
};

// ===== المحتوى =====

const NAV = [
  { id: 'solutions', label: 'الحلول' },
  { id: 'templates', label: 'القوالب' },
  { id: 'features', label: 'المميزات' },
  { id: 'pricing', label: 'الأسعار' },
  { id: 'faq', label: 'الأسئلة' }
];

const TRUST: Array<{ icon: IconType; title: string; desc: string }> = [
  { icon: IoFlash, title: 'جاهز في دقائق', desc: 'سجّل، أضف أصنافك، وشارك رابطك' },
  { icon: IoWallet, title: 'بالليرة وشام كاش', desc: 'نقداً عند الاستلام أو إلى محفظتك' },
  { icon: IoChatbubbles, title: 'عربيّ أولاً', desc: 'الواجهة والدعم بالعربية' },
  { icon: IoShieldCheckmark, title: 'بياناتك ملكك', desc: 'صدّرها متى شئت، بلا احتجاز' }
];

const RESTAURANT_THEMES: Array<{ key: keyof typeof THEMES; label: string }> = [
  { key: 'forest', label: 'كلاسيكي' },
  { key: 'noir', label: 'داكن' },
  { key: 'citrus', label: 'عصري' },
  { key: 'mono', label: 'مينيمال' },
  { key: 'ocean', label: 'بحري' }
];

// القوالب الأربعة الموجودة فعلاً في إعدادات المتجر (`storefrontDesign.shell`)
const STORE_LAYOUTS: Array<{ key: StoreLayout; label: string; desc: string }> = [
  { key: 'classic', label: 'كلاسيكي', desc: 'بانر عروض وشبكة منتجات' },
  { key: 'boutique', label: 'بوتيك', desc: 'صورة كبيرة للمجموعات' },
  { key: 'showcase', label: 'معرض', desc: 'داكن للإلكترونيات' },
  { key: 'landing', label: 'صفحة أقسام', desc: 'لمتاجر متعددة الأقسام' }
];

const STORE_SWATCHES: Array<keyof typeof THEMES> = ['forest', 'tech', 'rose', 'royal', 'citrus', 'mono'];

const STEPS = [
  { title: 'أنشئ حسابك', desc: 'اختر مطعماً أو متجراً. خطة مجانية بلا بطاقة ائتمان.' },
  { title: 'أضف أصنافك وألوانك', desc: 'ارفع الصور، اختر القالب والألوان، وحدّد طرق الدفع والتوصيل.' },
  { title: 'شارك رابطك واستقبل الطلبات', desc: 'رابط باسمك ورموز QR للطاولات، والطلبات تصلك لحظياً.' }
];

const FAQS = [
  { q: 'كم تكلّفني المنصة؟', a: 'تبدأ بخطة مجانية بلا بطاقة ائتمان وبلا التزام. الأسعار أعلاه بالليرة السورية بسعر الصرف الموحّد، ويمكنك الترقية أو البقاء على المجانية ما شئت.' },
  { q: 'هل يحتاج زبوني إلى تطبيق أو حساب؟', a: 'لا. يمسح رمز QR أو يفتح رابط متجرك فتظهر القائمة في المتصفح مباشرة. طلبات المطاعم تتمّ بلا تسجيل دخول.' },
  { q: 'كيف يدفع الزبون؟', a: 'نقداً عند الاستلام، أو تحويلاً عبر شام كاش إلى محفظتك أنت — تُفعّلها وتضع رقمها من إعداداتك، فيظهر للزبون عند الدفع. التحويل يصلك مباشرة ولا نقتطع منه.' },
  { q: 'هل الأسعار بالليرة السورية؟', a: 'نعم، الليرة هي الأساس. ويمكنك عرض متجرك بالدولار أيضاً بسعر صرف موحّد على المنصّة.' },
  { q: 'ماذا لو أردت المغادرة؟', a: 'بياناتك ملكك: قوائمك وطلباتك وزبائنك. تصدّرها بملفّات CSV وتغادر متى شئت، بلا رسوم خروج.' },
  { q: 'هل أحصل على نطاق باسمي؟', a: 'نعم. رابط فرعيّ مجانيّ فوراً مثل name.shamstores.com، وتربط نطاقك الخاص مع شهادة أمان تلقائية في الخطط التي تشمله، أو كإضافة منفردة على أي خطة — جدول المقارنة يبيّن أين.' }
];

// ===== الأسعار الحيّة =====

const usePlans = () => {
  const [plans, setPlans] = useState<PublicPlan[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api
      .get('/plans')
      .then((res: any) => {
        const list: PublicPlan[] = Array.isArray(res) ? res : res?.data || [];
        if (!cancelled) setPlans(list.filter(Boolean));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);
  return { plans, failed };
};

// ===== الصفحة =====

const HomePage: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [galleryTab, setGalleryTab] = useState<'restaurant' | 'store'>('restaurant');
  const [storeTheme, setStoreTheme] = useState<keyof typeof THEMES>('forest');
  const { plans, failed: plansFailed } = usePlans();
  const [stageRef, stageW] = useElementWidth<HTMLDivElement>(520);
  const [laptopRef, laptopW] = useElementWidth<HTMLDivElement>(700);

  useReveal();

  const dashboardPath =
    user?.role === 'super_admin' ? '/admin'
      : user?.role === 'owner' || user?.role === 'staff' ? '/dashboard'
        : user?.role === 'delivery_driver' ? '/driver/dashboard'
          : null;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      setShowTop(window.scrollY > 900);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // مقاسات الأجهزة تتبع الحاوية — الجوال يرى المشهد كاملاً لا مقصوصاً
  const heroPhone = Math.round(Math.min(260, Math.max(170, stageW * 0.5)));
  const heroPhoneB = Math.round(heroPhone * 0.86);

  return (
    <div className="ss" dir="rtl">
      <Helmet>
        <title>شام ستورز | منصة واحدة لمطعمك ومتجرك الإلكتروني</title>
        <meta
          name="description"
          content="أنشئ قائمة طعام رقمية أو متجراً إلكترونياً خلال دقائق: طلبات أونلاين، رموز QR، توصيل وشحن بين المحافظات، دفع نقداً أو عبر شام كاش، وأسعار بالليرة السورية."
        />
      </Helmet>

      {/* ===== التنقّل ===== */}
      <nav className={`ss-nav ${scrolled || menuOpen ? 'is-scrolled' : ''}`} aria-label="التنقّل الرئيسي">
        <div className="ss-container ss-nav-inner">
          <Link to="/" aria-label="شام ستورز — الرئيسية" style={{ textDecoration: 'none' }}>
            <BrandLogo tone="light" size="md" />
          </Link>
          <div className="ss-nav-links">
            {NAV.map((n) => (
              <button key={n.id} className="ss-nav-link" onClick={() => go(n.id)}>{n.label}</button>
            ))}
          </div>
          <div className="ss-nav-actions" style={{ color: '#fff' }}>
            {isAuthenticated ? (
              <>
                {dashboardPath && (
                  <Link to={dashboardPath} className="ss-btn ss-btn-primary ss-btn-sm"><IoGrid /> لوحة التحكم</Link>
                )}
                <button className="ss-nav-link" onClick={() => logout()} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <IoLogOut /> خروج
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="ss-nav-link">دخول التجّار</Link>
                <Link to="/register" className="ss-btn ss-btn-primary ss-btn-sm">ابدأ مجاناً</Link>
              </>
            )}
          </div>
          <button
            className="ss-nav-toggle"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          >
            {menuOpen ? <IoClose size={22} /> : <IoMenu size={22} />}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div className="ss-drawer">
          {NAV.map((n) => (
            <button key={n.id} className="ss-nav-link" onClick={() => go(n.id)}>{n.label}</button>
          ))}
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {isAuthenticated ? (
              <>
                {dashboardPath && <Link to={dashboardPath} className="ss-btn ss-btn-primary"><IoGrid /> لوحة التحكم</Link>}
                <button className="ss-btn ss-btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }} onClick={() => logout()}>
                  <IoLogOut /> تسجيل الخروج
                </button>
              </>
            ) : (
              <>
                <Link to="/register" className="ss-btn ss-btn-primary">ابدأ مجاناً</Link>
                <Link to="/login" className="ss-btn ss-btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>دخول التجّار</Link>
              </>
            )}
          </div>
        </div>
      )}

      <main id="main">
        {/* ===== البطل ===== */}
        <header className="ss-hero">
          <div className="ss-grid-bg" />
          <BrandMark className="ss-hero-watermark" color="#cdef7c" size={520} />
          <div className="ss-container">
            <div className="ss-hero-grid">
              <div className="ss-hero-copy">
                <span className="ss-eyebrow"><IoSparkles /> منصة سورية — بالليرة ودفع عبر شام كاش</span>
                <h1 className="ss-h1">
                  منصة واحدة..
                  <br />
                  <span className="ss-accent-text">لكل أعمالك</span>
                </h1>
                <p className="ss-lead" style={{ maxWidth: 560 }}>
                  ابدأ متجرك الإلكتروني أو قائمة مطعمك الرقمية بسهولة. طلبات أونلاين، رموز QR للطاولات،
                  توصيل وشحن بين المحافظات، ولوحة تحكم تريك كل شيء في مكان واحد.
                </p>
                <div className="ss-hero-actions">
                  {isAuthenticated && dashboardPath ? (
                    <Link to={dashboardPath} className="ss-btn ss-btn-primary">
                      الذهاب إلى لوحتي <IoArrowBack />
                    </Link>
                  ) : (
                    <Link to="/register" className="ss-btn ss-btn-primary">
                      ابدأ الآن مجاناً <IoArrowBack />
                    </Link>
                  )}
                  <button className="ss-btn ss-btn-ghost" onClick={() => go('templates')}>
                    شاهد القوالب
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: 13.5, color: 'var(--ss-on-dark-muted)' }}>
                  {['بلا بطاقة ائتمان', 'رابط باسمك فوراً', 'مطعم أو متجر'].map((t) => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <IoCheckmarkCircle style={{ color: 'var(--ss-lime)' }} /> {t}
                    </span>
                  ))}
                </div>
              </div>

              <div ref={stageRef} className="ss-stage" style={{ height: heroPhone * 2.02 + 40 }} aria-hidden="true">
                <div className="ss-phone-b">
                  <PhoneFrame width={heroPhoneB}>
                    <RestaurantScreen compact />
                  </PhoneFrame>
                </div>
                <div className="ss-phone-a">
                  <PhoneFrame width={heroPhone}>
                    <StoreScreen layout="classic" />
                  </PhoneFrame>
                </div>
                <div className="ss-float" style={{ top: '12%', insetInlineStart: 0 }}>
                  <span className="ss-float-icon" style={{ background: 'var(--ss-purple-soft)', color: 'var(--ss-purple-strong)' }}>
                    <IoNotificationsOutline size={18} />
                  </span>
                  <span>طلب جديد <bdi className="latin">#1256</bdi><small>185,000 ل.س — توصيل</small></span>
                </div>
                <div className="ss-float" style={{ bottom: '14%', insetInlineEnd: 0, animationDelay: '-3s' }}>
                  <span className="ss-float-icon" style={{ background: 'var(--ss-lime-soft)', color: 'var(--ss-forest-700)' }}>
                    <IoWallet size={18} />
                  </span>
                  <span>دفع عبر شام كاش<small>يصل محفظتك مباشرة</small></span>
                </div>
              </div>
            </div>

            <div className="ss-trust">
              {TRUST.map((t) => (
                <div key={t.title} className="ss-trust-item">
                  <span className="ss-float-icon" style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--ss-lime-soft)', color: 'var(--ss-lime)', flexShrink: 0 }}>
                    <t.icon size={19} />
                  </span>
                  <div>
                    <strong>{t.title}</strong>
                    <span>{t.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ===== لوحة التاجر: منصة مصمّمة لتسهّل إدارة متجرك ===== */}
        <PlatformShowcase />

        {/* ===== الحلول ===== */}
        <section id="solutions" className="ss-section">
          <div className="ss-container">
            <div className="ss-section-head ss-reveal">
              <span className="ss-eyebrow">حلّ لكلّ نشاط</span>
              <h2 className="ss-h2">مطعم أو متجر — منصة واحدة</h2>
              <p className="ss-lead">اختر نوع نشاطك عند التسجيل، وتتكيّف اللوحة والواجهة معه تلقائياً.</p>
            </div>
            <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              {[
                {
                  icon: IoRestaurant,
                  title: 'قائمة رقمية للمطاعم',
                  sub: 'للمطاعم والمقاهي ومحلات الوجبات',
                  items: ['قائمة بالصور والأسعار تُحدَّث فوراً', 'رمز QR لكل طاولة والطلب برقمها', 'استلام وتوصيل وطلب داخل المطعم', 'مقاسات وإضافات لكل صنف', 'طلب بلا تسجيل دخول للزبون'],
                  screen: <RestaurantScreen theme={THEMES.forest} compact />
                },
                {
                  icon: IoStorefront,
                  title: 'متجر إلكتروني متكامل',
                  sub: 'للملابس والإلكترونيات والمنزل وغيرها',
                  items: ['أربعة قوالب وألوانك الخاصة', 'مخزون وخيارات مقاس ولون', 'شحن بين المحافظات بأجرة لكل محافظة', 'تقييمات من مشترين موثّقين', 'استيراد وتصدير المنتجات بملفّ CSV'],
                  screen: <StoreScreen theme={THEMES.royal} layout="boutique" />
                }
              ].map((s, idx) => (
                <article key={s.title} className="ss-card ss-solution ss-reveal" style={{ transitionDelay: `${idx * 80}ms` }}>
                  <div style={{ padding: 28, display: 'grid', gap: 16 }}>
                    <span className={`ss-icon-tile ${idx ? 'is-purple' : ''}`}><s.icon size={26} /></span>
                    <div>
                      <h3 className="ss-h3">{s.title}</h3>
                      <p style={{ color: 'var(--ss-muted)', fontSize: 14.5, marginTop: 4 }}>{s.sub}</p>
                    </div>
                    <ul className="ss-checklist" style={{ gap: 8 }}>
                      {s.items.map((i) => (
                        <li key={i} style={{ fontSize: 14.5 }}>
                          <IoCheckmarkCircle size={18} style={{ color: idx ? 'var(--ss-purple)' : 'var(--ss-forest-500)' }} /> {i}
                        </li>
                      ))}
                    </ul>
                    <Link to="/register" className="ss-btn ss-btn-forest" style={{ justifySelf: 'start' }}>
                      ابدأ {idx ? 'متجرك' : 'قائمتك'} <IoArrowBack />
                    </Link>
                  </div>
                  <div className="ss-solution-art" style={{ background: idx ? 'linear-gradient(180deg, #f6eefb, #efe3f7)' : 'linear-gradient(180deg, #eef5ef, #e2ede4)' }}>
                    <PhoneFrame width={220}>{s.screen}</PhoneFrame>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ===== القوالب ===== */}
        <section id="templates" className="ss-section" style={{ background: 'var(--ss-white)' }}>
          <div className="ss-container">
            <div className="ss-section-head ss-reveal">
              <span className="ss-eyebrow"><IoColorPaletteOutline /> قوالب قابلة للتخصيص</span>
              <h2 className="ss-h2">واجهة تشبه علامتك التجارية</h2>
              <p className="ss-lead">اختر القالب، وضع ألوانك وشعارك وخطّك — وشاهد النتيجة مباشرة قبل النشر.</p>
              <div className="ss-tabs" role="tablist" aria-label="نوع الواجهة">
                <button role="tab" className="ss-tab" aria-selected={galleryTab === 'restaurant'} onClick={() => setGalleryTab('restaurant')}>
                  <IoRestaurant /> القائمة الرقمية
                </button>
                <button role="tab" className="ss-tab" aria-selected={galleryTab === 'store'} onClick={() => setGalleryTab('store')}>
                  <IoStorefront /> المتجر الإلكتروني
                </button>
              </div>
            </div>

            {galleryTab === 'restaurant' ? (
              <div className="ss-gallery" role="tabpanel">
                {RESTAURANT_THEMES.map((t) => (
                  <figure key={t.key} className="ss-gallery-item">
                    <PhoneFrame width={200} label={`قالب ${t.label}`}>
                      <RestaurantScreen theme={THEMES[t.key]} />
                    </PhoneFrame>
                    <figcaption>
                      <strong>{t.label}</strong>
                      <span>ألوان {THEMES[t.key].name}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div role="tabpanel">
                <div className="ss-swatches" style={{ marginBottom: 8 }}>
                  {STORE_SWATCHES.map((k) => (
                    <button key={k} className="ss-swatch" aria-pressed={storeTheme === k} onClick={() => setStoreTheme(k)}>
                      <i style={{ background: `linear-gradient(135deg, ${THEMES[k].hero[0]}, ${THEMES[k].primary})` }} />
                      {THEMES[k].name}
                    </button>
                  ))}
                </div>
                <div className="ss-gallery">
                  {STORE_LAYOUTS.map((l) => (
                    <figure key={l.key} className="ss-gallery-item">
                      <PhoneFrame width={210} label={`قالب ${l.label}`}>
                        <StoreScreen layout={l.key} theme={THEMES[storeTheme]} />
                      </PhoneFrame>
                      <figcaption>
                        <strong>{l.label}</strong>
                        <span>{l.desc}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <div ref={laptopRef} className="ss-reveal" style={{ marginTop: 24 }}>
                  <LaptopFrame width={Math.min(860, laptopW)} label="واجهة المتجر على سطح المكتب">
                    <StoreDesktopScreen theme={THEMES[storeTheme]} />
                  </LaptopFrame>
                  <p style={{ textAlign: 'center', color: 'var(--ss-muted)', marginTop: 18, fontSize: 14.5 }}>
                    <IoPhonePortraitOutline style={{ verticalAlign: 'middle' }} /> القالب نفسه يتكيّف مع الجوال والحاسوب تلقائياً
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ===== المميزات ===== */}
        <FeatureBento />

        {/* ===== لوحة التحكم ===== */}
        <section className="ss-section ss-dark" style={{ background: 'linear-gradient(180deg, var(--ss-forest-800), var(--ss-forest-950))', overflow: 'hidden' }}>
          <div className="ss-container">
            <div className="ss-split">
              <div className="ss-reveal" style={{ display: 'grid', gap: 20 }}>
                <span className="ss-eyebrow" style={{ justifySelf: 'start' }}>لوحة التحكم</span>
                <h2 className="ss-h2">تجربة أسهل.. إدارة أذكى.. نموّ أكبر</h2>
                <p className="ss-lead">كل طلب يصلك لحظياً أينما كنت، وتتابعه حتى باب الزبون.</p>
                <ul className="ss-checklist">
                  <li><IoCheckmarkCircle size={20} /> تنبيه صوتيّ وإشعار متصفّح ورسالة تيليغرام مع كل طلب</li>
                  <li><IoCheckmarkCircle size={20} /> موظّفون بصلاحيات تحدّدها أنت لكل شاشة</li>
                  <li><IoCheckmarkCircle size={20} /> تتبّع مباشر للزبون من التحضير حتى التسليم</li>
                  <li><IoCheckmarkCircle size={20} /> تحليلات الزيارات: من أين يأتي زبائنك وأين يتوقّفون</li>
                </ul>
              </div>
              <div className="ss-reveal" style={{ position: 'relative', paddingBottom: 30 }}>
                <DashboardShowcase />
              </div>
            </div>
          </div>
        </section>

        {/* ===== الخطوات ===== */}
        <section className="ss-section">
          <div className="ss-container">
            <div className="ss-section-head ss-reveal">
              <span className="ss-eyebrow"><IoRocketOutline /> ثلاث خطوات</span>
              <h2 className="ss-h2">من التسجيل إلى أول طلب</h2>
            </div>
            <div className="ss-steps">
              {STEPS.map((s, i) => (
                <article key={s.title} className="ss-card ss-step ss-reveal" style={{ transitionDelay: `${i * 90}ms` }}>
                  <span className="ss-step-num">0{i + 1}</span>
                  <h3 className="ss-h3">{s.title}</h3>
                  <p style={{ color: 'var(--ss-muted)', lineHeight: 1.9, fontSize: 15 }}>{s.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ===== الأسعار: البطاقات، أقسام المنتج، وجدول المقارنة ===== */}
        <PricingSection plans={plans} failed={plansFailed} />

        {/* ===== الأسئلة ===== */}
        <section id="faq" className="ss-section">
          <div className="ss-container">
            <div className="ss-section-head ss-reveal">
              <span className="ss-eyebrow">قبل أن تبدأ</span>
              <h2 className="ss-h2">أسئلة يطرحها كل تاجر</h2>
            </div>
            <div className="ss-faq">
              {FAQS.map((f) => (
                <details key={f.q} className="ss-reveal">
                  <summary>
                    {f.q}
                    <IoAdd size={22} />
                  </summary>
                  <div>{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===== الدعوة الختامية ===== */}
        <section className="ss-section" style={{ paddingTop: 0 }}>
          <div className="ss-container">
            <div className="ss-cta ss-reveal">
              <BrandMark color="#cdef7c" size={44} />
              <h2 className="ss-h2">جاهز لنقل تجارتك إلى الإنترنت؟</h2>
              <p className="ss-lead" style={{ maxWidth: 560 }}>ابدأ بخطة مجانية وافتح متجرك اليوم. بلا بطاقة ائتمان وبلا التزام.</p>
              <div className="ss-hero-actions" style={{ justifyContent: 'center' }}>
                {isAuthenticated && dashboardPath ? (
                  <Link to={dashboardPath} className="ss-btn ss-btn-primary"><IoGrid /> الذهاب إلى لوحتي</Link>
                ) : (
                  <>
                    <Link to="/register" className="ss-btn ss-btn-primary">ابدأ الآن مجاناً <IoArrowBack /></Link>
                    <Link to="/contact" className="ss-btn ss-btn-ghost">تحدّث معنا</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== التذييل ===== */}
      <footer className="ss-footer">
        <div className="ss-container">
          <div className="ss-footer-grid">
            <div style={{ display: 'grid', gap: 14, alignContent: 'start', gridColumn: 'span 2' }}>
              <BrandLogo tone="light" />
              <p style={{ maxWidth: 360, lineHeight: 1.9 }}>منصة متكاملة للتجارة الإلكترونية والمطاعم — صُمّمت للسوق السوري.</p>
            </div>
            <div>
              <h4>المنتج</h4>
              <ul>
                <li><button onClick={() => go('solutions')}>الحلول</button></li>
                <li><button onClick={() => go('templates')}>القوالب</button></li>
                <li><button onClick={() => go('pricing')}>الأسعار</button></li>
              </ul>
            </div>
            <div>
              <h4>الدعم</h4>
              <ul>
                <li><Link to="/contact">تواصل معنا</Link></li>
                <li><Link to="/faq">الأسئلة الشائعة</Link></li>
                <li><Link to="/about">من نحن</Link></li>
              </ul>
            </div>
            <div>
              <h4>القانوني</h4>
              <ul>
                <li><Link to="/terms">شروط الاستخدام</Link></li>
                <li><Link to="/privacy">سياسة الخصوصية</Link></li>
              </ul>
            </div>
          </div>
          <div className="ss-footer-bottom">
            <span>© {new Date().getFullYear()} شام ستورز. جميع الحقوق محفوظة.</span>
            <span className="latin">Sham Stores</span>
          </div>
        </div>
      </footer>

      {showTop && (
        <button className="ss-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="العودة إلى أعلى الصفحة">
          <IoArrowUp size={22} />
        </button>
      )}
    </div>
  );
};

/** حاسوبٌ عليه لوحة التاجر وجوالٌ عليه تتبّع الطلب — يتكيّفان مع العرض. */
const DashboardShowcase: React.FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((e) => setW(Math.round(e[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const phone = Math.round(Math.min(200, Math.max(120, w * 0.28)));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ paddingInlineEnd: phone * 0.35 }}>
        <LaptopFrame width={Math.max(280, w - phone * 0.35)} label="لوحة تحكم التاجر">
          <DashboardScreen />
        </LaptopFrame>
      </div>
      <div style={{ position: 'absolute', insetInlineEnd: 0, bottom: -20 }}>
        <PhoneFrame width={phone} label="تتبّع الطلب للزبون">
          <TrackingScreen />
        </PhoneFrame>
      </div>
    </div>
  );
};

export default HomePage;
