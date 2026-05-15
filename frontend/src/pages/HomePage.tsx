// pages/HomePage.tsx

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  IoRestaurant, IoStorefront, IoMenu, IoClose, IoArrowForward,
  IoCheckmarkCircle, IoQrCode, IoCart, IoStatsChart, IoPhonePortrait,
  IoGlobe, IoTrophy, IoCloud, IoShield, IoHeart, IoStar, IoPeople,
  IoTime, IoCash, IoWallet, IoAnalytics, IoLanguage, IoChatbubble,
  IoCall, IoLogoWhatsapp, IoLogoInstagram, IoLogoFacebook, IoLogoTwitter,
  IoArrowUp, IoPlay, IoDownload, IoRocket, IoLibrary, IoServer,
  IoLockClosed, IoMail, IoPerson, IoBusiness, IoGrid, IoLayers,
  IoWarning, IoFlash, IoTrendingUp, IoHappy, IoThumbsUp, IoBulb
} from 'react-icons/io5';
import { Helmet } from 'react-helmet-async';

// ── Brand palette ────────────────────────────────────────────────
const C = {
  bg:     '#082E24',   // dark forest green background
  prim:   '#0D4A3A',   // primary green
  surf:   '#0F3D31',   // surface/card bg
  card:   '#112E23',   // elevated card
  accent: '#C8E235',   // lime yellow — THE signature color
  acDk:   '#A8C220',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activePlan, setActivePlan] = useState<'monthly' | 'yearly'>('monthly');
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.95]);
  const heroY = useTransform(scrollY, [0, 500], [0, 100]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.5]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMenuOpen(false);
  };

  // ── Data ──────────────────────────────────────────────────────

  const features = [
    { icon: IoQrCode,      title: 'قوائم رقمية ذكية',    description: 'قوائم طعام رقمية تفاعلية يمكن تحديثها بسهولة في أي وقت',         delay: 0   },
    { icon: IoCart,        title: 'طلبات أونلاين',        description: 'استقبل الطلبات عبر الإنترنت مع نظام دفع متكامل وآمن',             delay: 0.1 },
    { icon: IoStatsChart,  title: 'تحليلات متقدمة',       description: 'تقارير وإحصائيات دقيقة عن المبيعات والمنتجات الأكثر طلباً',       delay: 0.2 },
    { icon: IoFlash,       title: 'توصيل فوري',           description: 'نظام توصيل ذكي مع تتبع لحظي للسائقين وإشعارات تلقائية للعملاء',   delay: 0.3 },
    { icon: IoTrophy,      title: 'كوبونات وعروض',        description: 'أنشئ عروضاً ترويجية وكوبونات خصم لجذب المزيد من الزبائن',         delay: 0.4 },
    { icon: IoShield,      title: 'أمان عالي',            description: 'نظام حماية متقدم يضمن أمان بياناتك ومدفوعاتك بتشفير SSL/TLS',     delay: 0.5 },
  ];

  const plans = [
    {
      id: 'free',
      name: 'مجاني',
      price: '0',
      yearlyPrice: '0',
      period: 'شهر',
      description: 'مناسب للبدء والتجربة',
      features: [
        'حتى 20 صنف في القائمة',
        'طاولة واحدة فقط',
        'QR Code أساسي',
        'طلبات داخلية فقط',
        'دعم فني محدود',
        'إحصائيات أساسية',
      ],
      recommended: false,
      buttonText: 'ابدأ مجاناً',
    },
    {
      id: 'basic',
      name: 'أساسي',
      price: '49.99',
      yearlyPrice: '499.99',
      period: 'شهر',
      description: 'مناسب للمطاعم المتوسطة',
      features: [
        'حتى 100 صنف في القائمة',
        'حتى 5 طاولات',
        'QR Code متقدم',
        'طلبات أونلاين وتوصيل',
        'واتساب متكامل',
        'دعم فني 24/7',
        'تحليلات متقدمة',
      ],
      recommended: false,
      buttonText: 'ابدأ الآن',
      saveAmount: 'احفظ 100 ريال سنوياً',
    },
    {
      id: 'professional',
      name: 'احترافي',
      price: '99.99',
      yearlyPrice: '999.99',
      period: 'شهر',
      description: 'حلول متكاملة للمطاعم الكبيرة',
      features: [
        'عناصر غير محدودة',
        'طاولات غير محدودة',
        'دومين مخصص',
        'تحليلات متقدمة مع AI',
        'موظفين غير محدودين',
        'دعم VIP على مدار الساعة',
        'تقارير مالية متقدمة',
        'نظام ولاء للعملاء',
      ],
      recommended: true,
      buttonText: 'تواصل مع المبيعات',
    },
  ];

  const testimonials = [
    { name: 'أحمد السيد',  role: 'مالك مطعم الأندلس',   content: 'منذ استخدام شام ستورز، زادت مبيعاتنا بنسبة 40%! النظام سهل وسريع والزبائن يحبونه.',       rating: 5, image: 'https://randomuser.me/api/portraits/men/1.jpg'   },
    { name: 'نورا خالد',   role: 'مديرة مطعم روز',       content: 'أفضل استثمار قمنا به! الكيو آر كود سهل على الزبائن والطلبات أصبحت منظمة جداً.',             rating: 5, image: 'https://randomuser.me/api/portraits/women/2.jpg' },
    { name: 'محمد علي',    role: 'صاحب كافيه مودرن',     content: 'التحليلات والإحصائيات ساعدتنا نفهم احتياجات زبائننا بشكل أفضل. أنصح به بشدة!',             rating: 5, image: 'https://randomuser.me/api/portraits/men/3.jpg'   },
    { name: 'سارة أحمد',   role: 'مالكة متجر هدايا',     content: 'نظام المتجر سهل جداً وإدارة المخزون ممتازة. المبيعات زادت 60% خلال 3 أشهر!',               rating: 5, image: 'https://randomuser.me/api/portraits/women/4.jpg' },
  ];

  const stats = [
    { value: '1000+', label: 'مطعم ومتجر'     },
    { value: '50K+',  label: 'طلب شهرياً'     },
    { value: '99.9%', label: 'وقت التشغيل'    },
    { value: '4.9★',  label: 'تقييم العملاء'  },
  ];

  const handleRegisterClick = (planId?: string) => {
    if (planId) {
      localStorage.setItem('selectedPlan', planId);
    }
    navigate('/register');
  };

  // ── Shared style helpers ──────────────────────────────────────

  const accentBtn: React.CSSProperties = {
    background: C.accent,
    color: '#082E24',
    border: 'none',
    borderRadius: 10,
    padding: '12px 28px',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    transition: 'background 0.2s',
  };

  const outlineBtn: React.CSSProperties = {
    background: 'transparent',
    color: C.accent,
    border: `1.5px solid ${C.accent}`,
    borderRadius: 10,
    padding: '11px 26px',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    transition: 'background 0.2s, color 0.2s',
  };

  // ─────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
        <title>شام ستورز | الحل الرقمي المتكامل للمطاعم والمتاجر</title>
        <meta name="description" content="حوّل مطعمك أو متجرك إلى تجربة رقمية متكاملة مع شام ستورز. قوائم ذكية، طلبات أونلاين، QR Code، وتحليلات متقدمة." />
        <meta name="keywords" content="قائمة رقمية, منيو مطعم, طلبات اونلاين, QR Code للمطاعم, متجر إلكتروني, نظام مطاعم, شام ستورز" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://shamstores.com" />
      </Helmet>

      <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: 'inherit' }} dir="rtl">

        {/* ── NAVBAR ─────────────────────────────────────────── */}
        <motion.header style={{ opacity: headerOpacity }}>
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 50,
            background: 'rgba(8,46,36,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <nav style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>

                {/* Logo */}
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                  <div style={{
                    width: 38, height: 38,
                    background: C.accent,
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 20, color: '#082E24',
                  }}>
                    S
                  </div>
                  <span style={{ color: C.accent, fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>
                    SHAM STORES
                  </span>
                </Link>

                {/* Desktop nav links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hide-mobile">
                  {[
                    ['features',    'المميزات'],
                    ['solutions',   'الحلول'],
                    ['pricing',     'الأسعار'],
                    ['testimonials','آراء العملاء'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      style={{ background: 'none', border: 'none', color: C.muted, fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Desktop auth buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="hide-mobile">
                  <Link
                    to="/user/login"
                    style={{ ...outlineBtn, textDecoration: 'none', padding: '9px 20px', fontSize: 14 }}
                  >
                    تسجيل الدخول
                  </Link>
                  <Link
                    to="/register"
                    style={{ ...accentBtn, textDecoration: 'none', padding: '10px 20px', fontSize: 14 }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.acDk)}
                    onMouseLeave={e => (e.currentTarget.style.background = C.accent)}
                  >
                    ابدأ مجاناً
                  </Link>
                </div>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="show-mobile"
                  style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: 4 }}
                >
                  {isMenuOpen ? <IoClose size={26} /> : <IoMenu size={26} />}
                </button>
              </div>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    background: C.prim,
                    borderTop: `1px solid ${C.border}`,
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      ['features',    'المميزات'],
                      ['solutions',   'الحلول'],
                      ['pricing',     'الأسعار'],
                      ['testimonials','آراء العملاء'],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => scrollToSection(id)}
                        style={{ background: 'none', border: 'none', color: C.text, textAlign: 'right', padding: '8px 0', fontSize: 15, cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}
                      >
                        {label}
                      </button>
                    ))}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      <Link to="/user/login" style={{ ...outlineBtn, textDecoration: 'none', justifyContent: 'center' }}>
                        تسجيل الدخول
                      </Link>
                      <Link to="/register" style={{ ...accentBtn, textDecoration: 'none', justifyContent: 'center' }}>
                        ابدأ مجاناً
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.header>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 64 }}>
          {/* Subtle background glow blobs */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 80,  right: '10%', width: 380, height: 380, borderRadius: '50%', background: 'rgba(200,226,53,0.06)', filter: 'blur(80px)' }} />
            <div style={{ position: 'absolute', bottom: 60, left: '8%',  width: 300, height: 300, borderRadius: '50%', background: 'rgba(13,74,58,0.5)',   filter: 'blur(60px)' }} />
          </div>

          <motion.div
            style={{ y: heroY, opacity: heroOpacity, position: 'relative', zIndex: 1 }}
          >
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(200,226,53,0.1)',
                  border: `1px solid ${C.border}`,
                  borderRadius: 999,
                  padding: '6px 16px',
                  marginBottom: 28,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, animation: 'pulse 1.5s infinite' }} />
                <span style={{ color: C.accent, fontSize: 14, fontWeight: 600 }}>بوابتك الآمنة للتجارة الإلكترونية</span>
              </motion.div>

              {/* H1 */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800, lineHeight: 1.2, marginBottom: 20, color: C.text }}
              >
                حوّل عملك إلى{' '}
                <span style={{ color: C.accent }}>تجربة رقمية</span>{' '}
                متكاملة
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: 18, color: C.muted, maxWidth: 600, margin: '0 auto 36px', lineHeight: 1.7 }}
              >
                شام ستورز هو الحل الذكي للمطاعم والمتاجر — قوائم رقمية تفاعلية، طلبات أونلاين، QR Code ذكي، وتحليلات متقدمة لتنمية أعمالك.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 56 }}
              >
                <Link
                  to="/register"
                  style={{ ...accentBtn, textDecoration: 'none', fontSize: 16, padding: '14px 32px' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.acDk)}
                  onMouseLeave={e => (e.currentTarget.style.background = C.accent)}
                >
                  ابدأ الآن مجاناً
                  <IoArrowForward size={18} />
                </Link>
                <button
                  onClick={() => scrollToSection('features')}
                  style={{ ...outlineBtn, fontSize: 16, padding: '13px 30px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,226,53,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  اكتشف المزيد
                </button>
              </motion.div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 1,
                  background: C.border,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                {stats.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      background: C.surf,
                      padding: '22px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 26, fontWeight: 800, color: C.accent, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{s.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* ── FEATURES ───────────────────────────────────────── */}
        <section id="features" style={{ padding: '80px 24px', background: C.prim }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ textAlign: 'center', marginBottom: 52 }}
            >
              <span style={{ color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>مميزاتنا</span>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: C.text, margin: '10px 0 12px' }}>
                لماذا تختار شام ستورز؟
              </h2>
              <p style={{ color: C.muted, fontSize: 16, maxWidth: 540, margin: '0 auto' }}>
                نقدم لك كل ما تحتاجه لإدارة مطعمك أو متجرك بكفاءة واحترافية
              </p>
            </motion.div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}>
              {features.map((f, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: f.delay }}
                  whileHover={{ y: -4 }}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 16,
                    padding: '28px 24px',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,226,53,0.4)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = C.border)}
                >
                  <div style={{
                    width: 48, height: 48,
                    background: 'rgba(200,226,53,0.12)',
                    borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 18,
                  }}>
                    <f.icon size={24} style={{ color: C.accent }} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{f.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOLUTIONS ──────────────────────────────────────── */}
        <section id="solutions" style={{ padding: '80px 24px', background: C.bg }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ textAlign: 'center', marginBottom: 52 }}
            >
              <span style={{ color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>حلول متكاملة</span>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: C.text, margin: '10px 0 12px' }}>
                نقدم حلولاً لمختلف الأنشطة
              </h2>
              <p style={{ color: C.muted, fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
                نظام واحد يدير جميع احتياجاتك الرقمية بكل سهولة ومرونة
              </p>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

              {/* Restaurant Card */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden' }}
              >
                {/* Header strip */}
                <div style={{ background: C.surf, borderBottom: `1px solid ${C.border}`, padding: '28px 28px 24px' }}>
                  <IoRestaurant size={44} style={{ color: C.accent, marginBottom: 12 }} />
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>حلول المطاعم</h3>
                  <p style={{ fontSize: 14, color: C.muted }}>أدر مطعمك رقمياً بكل سهولة</p>
                </div>
                <div style={{ padding: '24px 28px 28px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      'قوائم طعام رقمية تفاعلية',
                      'رموز QR للطاولات',
                      'طلبات أونلاين وتوصيل',
                      'نظام إدارة الطاولات',
                      'تحليلات المبيعات المتقدمة',
                      'إدارة الموظفين والصلاحيات',
                      'نظام ولاء للعملاء',
                      'تقارير مالية لحظية',
                    ].map((item, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: C.text }}>
                        <IoCheckmarkCircle size={18} style={{ color: C.accent, flexShrink: 0 }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    style={{
                      ...outlineBtn,
                      textDecoration: 'none',
                      display: 'flex',
                      justifyContent: 'center',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,226,53,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    ابدأ الآن
                  </Link>
                </div>
              </motion.div>

              {/* Store Card */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                style={{ background: C.card, border: `1px solid rgba(200,226,53,0.35)`, borderRadius: 20, overflow: 'hidden' }}
              >
                <div style={{ background: 'rgba(200,226,53,0.08)', borderBottom: `1px solid ${C.border}`, padding: '28px 28px 24px' }}>
                  <IoStorefront size={44} style={{ color: C.accent, marginBottom: 12 }} />
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>حلول المتاجر</h3>
                  <p style={{ fontSize: 14, color: C.muted }}>أدر متجرك الإلكتروني باحترافية</p>
                </div>
                <div style={{ padding: '24px 28px 28px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      'عرض المنتجات والتصنيفات',
                      'نظام إدارة المخزون المتقدم',
                      'طلبات أونلاين وتوصيل',
                      'عروض وخصومات مخصصة',
                      'تحليلات المبيعات المتقدمة',
                      'إدارة العملاء والتواصل',
                      'نظام نقاط ولاء',
                      'تقارير المخزون التلقائية',
                    ].map((item, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: C.text }}>
                        <IoCheckmarkCircle size={18} style={{ color: C.accent, flexShrink: 0 }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    style={{
                      ...accentBtn,
                      textDecoration: 'none',
                      display: 'flex',
                      justifyContent: 'center',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.acDk; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.accent; }}
                  >
                    ابدأ الآن
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── PLANS PREVIEW ──────────────────────────────────── */}
        <section id="pricing" style={{ padding: '80px 24px', background: C.prim }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ textAlign: 'center', marginBottom: 52 }}
            >
              <span style={{ color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>خطط مرنة</span>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: C.text, margin: '10px 0 12px' }}>
                اختر الخطة المناسبة لعملك
              </h2>
              <p style={{ color: C.muted, fontSize: 16, maxWidth: 520, margin: '0 auto 32px' }}>
                خطط تناسب جميع الأحجام والميزانيات، ابدأ مجاناً ثم ترقَّ عندما تنمو أعمالك
              </p>

              {/* Billing toggle */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
                <span style={{ fontWeight: 600, color: activePlan === 'monthly' ? C.accent : C.muted, fontSize: 14 }}>شهري</span>
                <button
                  onClick={() => setActivePlan(activePlan === 'monthly' ? 'yearly' : 'monthly')}
                  style={{
                    position: 'relative',
                    width: 52, height: 28,
                    background: activePlan === 'yearly' ? C.accent : C.surf,
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.3s',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: 4,
                    right: activePlan === 'yearly' ? 4 : 'auto',
                    left: activePlan === 'monthly' ? 4 : 'auto',
                    width: 20, height: 20,
                    borderRadius: '50%',
                    background: activePlan === 'yearly' ? '#082E24' : C.accent,
                    transition: 'all 0.3s',
                    display: 'block',
                  }} />
                </button>
                <span style={{ fontWeight: 600, color: activePlan === 'yearly' ? C.accent : C.muted, fontSize: 14 }}>
                  سنوي <span style={{ fontSize: 12, color: C.accent }}>(وفر 20%)</span>
                </span>
              </div>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, alignItems: 'start' }}>
              {plans.map((plan, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -6 }}
                  style={{
                    position: 'relative',
                    background: C.card,
                    border: plan.recommended
                      ? `2px solid ${C.accent}`
                      : `1px solid ${C.border}`,
                    borderRadius: 18,
                    overflow: 'hidden',
                  }}
                >
                  {plan.recommended && (
                    <div style={{
                      position: 'absolute',
                      top: 16, left: 16,
                      background: C.accent,
                      color: '#082E24',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: 999,
                    }}>
                      الأكثر شعبية
                    </div>
                  )}

                  {/* Plan header */}
                  <div style={{
                    padding: '28px 24px 20px',
                    borderBottom: `1px solid ${C.border}`,
                    background: plan.recommended ? 'rgba(200,226,53,0.06)' : C.surf,
                  }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>{plan.name}</h3>
                    <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{plan.description}</p>
                    <div>
                      <span style={{ fontSize: 36, fontWeight: 900, color: plan.recommended ? C.accent : C.text }}>
                        {activePlan === 'monthly' ? plan.price : plan.yearlyPrice}
                      </span>
                      <span style={{ fontSize: 13, color: C.muted, marginRight: 6 }}>
                        ريال / {activePlan === 'monthly' ? plan.period : 'سنة'}
                      </span>
                    </div>
                    {activePlan === 'yearly' && (plan as any).saveAmount && (
                      <p style={{ fontSize: 12, color: C.accent, marginTop: 4 }}>{(plan as any).saveAmount}</p>
                    )}
                  </div>

                  {/* Plan features */}
                  <div style={{ padding: '20px 24px 24px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {plan.features.map((feat, fi) => (
                        <li key={fi} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: C.text }}>
                          <IoCheckmarkCircle size={16} style={{ color: C.accent, flexShrink: 0 }} />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleRegisterClick(plan.id)}
                      style={plan.recommended ? { ...accentBtn, width: '100%', justifyContent: 'center', boxSizing: 'border-box' } : { ...outlineBtn, width: '100%', justifyContent: 'center', boxSizing: 'border-box' }}
                      onMouseEnter={e => {
                        if (plan.recommended) e.currentTarget.style.background = C.acDk;
                        else e.currentTarget.style.background = 'rgba(200,226,53,0.1)';
                      }}
                      onMouseLeave={e => {
                        if (plan.recommended) e.currentTarget.style.background = C.accent;
                        else e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {plan.buttonText}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 28 }}>
              * جميع الخطط تشمل تحديثات مجانية ودعم فني &nbsp;|&nbsp; يمكنك الترقية أو التخفيض في أي وقت
            </p>
          </div>
        </section>

        {/* ── TESTIMONIALS ───────────────────────────────────── */}
        <section id="testimonials" style={{ padding: '80px 24px', background: C.bg }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ textAlign: 'center', marginBottom: 48 }}
            >
              <span style={{ color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>آراء العملاء</span>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: C.text, margin: '10px 0 12px' }}>
                ماذا يقول عملاؤنا؟
              </h2>
              <p style={{ color: C.muted, fontSize: 15 }}>نفخر بثقة آلاف المطاعم والمتاجر التي تختارنا</p>
            </motion.div>

            <div style={{ position: 'relative', background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '36px 36px 28px' }}>
              <div style={{ position: 'absolute', top: 20, right: 28, fontSize: 64, color: C.border, lineHeight: 1, userSelect: 'none' }}>"</div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestimonial}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.4 }}
                  style={{ position: 'relative', zIndex: 1 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <img
                      src={testimonials[activeTestimonial].image}
                      alt={testimonials[activeTestimonial].name}
                      style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.accent}` }}
                    />
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 2 }}>{testimonials[activeTestimonial].name}</h4>
                      <p style={{ fontSize: 13, color: C.muted }}>{testimonials[activeTestimonial].role}</p>
                      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                        {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                          <IoStar key={i} size={13} style={{ color: C.accent }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 16, color: C.text, lineHeight: 1.75 }}>
                    "{testimonials[activeTestimonial].content}"
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTestimonial(i)}
                    style={{
                      height: 8,
                      width: i === activeTestimonial ? 28 : 8,
                      borderRadius: 999,
                      background: i === activeTestimonial ? C.accent : 'rgba(200,226,53,0.2)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'width 0.3s, background 0.3s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA SECTION ────────────────────────────────────── */}
        <section style={{ padding: '80px 24px', background: C.surf, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, color: C.accent, marginBottom: 16, lineHeight: 1.25 }}>
                جاهز لتحويل عملك إلى تجربة رقمية؟
              </h2>
              <p style={{ fontSize: 17, color: C.muted, marginBottom: 36 }}>
                انضم إلى آلاف المطاعم والمتاجر التي تثق بشام ستورز
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 20 }}>
                <Link
                  to="/register"
                  style={{ ...accentBtn, textDecoration: 'none', fontSize: 16, padding: '14px 34px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.acDk; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.accent; }}
                >
                  <IoRocket size={18} /> ابدأ الآن مجاناً
                </Link>
                <Link
                  to="/user/login"
                  style={{ ...outlineBtn, textDecoration: 'none', fontSize: 16, padding: '13px 32px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,226,53,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  تسجيل الدخول
                </Link>
              </div>
              <p style={{ fontSize: 13, color: C.muted }}>لا حاجة لبطاقة ائتمان • يمكنك الإلغاء في أي وقت • دعم فني على مدار الساعة</p>
            </motion.div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer style={{ background: C.card, borderTop: `1px solid ${C.border}`, padding: '48px 24px 28px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 36, marginBottom: 40 }}>

              {/* Brand */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, background: C.accent, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#082E24' }}>S</div>
                  <span style={{ color: C.accent, fontWeight: 700, fontSize: 16, letterSpacing: 1 }}>SHAM STORES</span>
                </div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
                  الحل الرقمي المتكامل للمطاعم والمتاجر. قوائم ذكية، طلبات أونلاين، وتحليلات متقدمة.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[IoLogoWhatsapp, IoLogoInstagram, IoLogoFacebook, IoLogoTwitter].map((Icon, i) => (
                    <a
                      key={i}
                      href="#"
                      style={{
                        width: 36, height: 36,
                        borderRadius: '50%',
                        background: C.surf,
                        border: `1px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: C.muted,
                        textDecoration: 'none',
                        transition: 'border-color 0.2s, color 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
                    >
                      <Icon size={16} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Product */}
              <div>
                <h4 style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>المنتج</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[['features','المميزات'],['pricing','الأسعار']].map(([id, label]) => (
                    <li key={id}>
                      <button onClick={() => scrollToSection(id)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
                        onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                      >{label}</button>
                    </li>
                  ))}
                  {['تحديثات','API'].map(l => (
                    <li key={l}><Link to="/" style={{ color: C.muted, fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                    >{l}</Link></li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>الدعم</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['مركز المساعدة','تواصل معنا','الأسئلة الشائعة','حالة النظام'].map(l => (
                    <li key={l}><Link to="/" style={{ color: C.muted, fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                    >{l}</Link></li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 14 }}>القانوني</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['شروط الاستخدام','سياسة الخصوصية','ملفات الارتباط'].map(l => (
                    <li key={l}><Link to="/" style={{ color: C.muted, fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                    >{l}</Link></li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 22, textAlign: 'center', color: C.muted, fontSize: 13 }}>
              © {new Date().getFullYear()} شام ستورز. جميع الحقوق محفوظة.
            </div>
          </div>
        </footer>

        {/* ── SCROLL TO TOP ───────────────────────────────────── */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              onClick={scrollToTop}
              style={{
                position: 'fixed',
                bottom: 24, left: 24,
                zIndex: 40,
                width: 46, height: 46,
                borderRadius: '50%',
                background: C.accent,
                border: 'none',
                color: '#082E24',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 20px rgba(200,226,53,0.35)`,
              }}
            >
              <IoArrowUp size={20} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.3); }
        }

        /* Responsive helpers */
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
};

export default HomePage;
