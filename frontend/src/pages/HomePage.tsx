// frontend/src/pages/HomePage.tsx

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  IoMenu, IoClose, IoArrowForward, IoCheckmarkCircle,
  IoQrCode, IoCart, IoStatsChart, IoFlash, IoTrophy, IoShield,
  IoRestaurant, IoStorefront, IoCall, IoLogoWhatsapp,
  IoLogoInstagram, IoLogoFacebook, IoLogoTwitter,
  IoArrowUp, IoRocket, IoBusiness, IoServer,
  IoStar, IoPeople, IoTime, IoWallet, IoAnalytics
} from 'react-icons/io5';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMenuOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // بيانات الصفحة
  const features = [
    { icon: IoQrCode, title: 'قوائم رقمية ذكية', desc: 'قوائم طعام رقمية تفاعلية يمكن تحديثها بسهولة', color: '#C8E235' },
    { icon: IoCart, title: 'طلبات أونلاين', desc: 'استقبل الطلبات عبر الإنترنت مع نظام دفع متكامل', color: '#C8E235' },
    { icon: IoStatsChart, title: 'تحليلات متقدمة', desc: 'تقارير وإحصائيات دقيقة عن المبيعات', color: '#C8E235' },
    { icon: IoFlash, title: 'توصيل فوري', desc: 'نظام توصيل ذكي مع تتبع لحظي للسائقين', color: '#C8E235' },
    { icon: IoTrophy, title: 'كوبونات وعروض', desc: 'أنشئ عروضاً ترويجية وكوبونات خصم', color: '#C8E235' },
    { icon: IoShield, title: 'أمان عالي', desc: 'نظام حماية متقدم يضمن أمان بياناتك', color: '#C8E235' },
  ];

  const testimonials = [
    { name: 'أحمد السيد', role: 'مالك مطعم', content: 'منذ استخدام شام ستورز، زادت مبيعاتنا بنسبة 40%!', rating: 5, image: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { name: 'نورا خالد', role: 'مديرة متجر', content: 'أفضل استثمار قمنا به! النظام سهل وسريع.', rating: 5, image: 'https://randomuser.me/api/portraits/women/2.jpg' },
  ];

  const stats = [
    { value: '1000+', label: 'عميل' },
    { value: '50K+', label: 'طلب شهرياً' },
    { value: '99.9%', label: 'وقت تشغيل' },
    { value: '4.9★', label: 'تقييم' },
  ];

  return (
    <>
      <Helmet>
        <title>شام ستورز | الحل الرقمي المتكامل للمطاعم والمتاجر</title>
        <meta name="description" content="حوّل مطعمك أو متجرك إلى تجربة رقمية متكاملة مع شام ستورز" />
      </Helmet>

      <div className="min-h-screen" style={{ backgroundColor: '#082E24', color: '#E8F5E9' }} dir="rtl">

        {/* ===== NAVBAR ===== */}
        <nav className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: 'rgba(8,46,36,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(200,226,53,0.15)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3">
                <img src="/images/logo-width1.png" width={200} alt="logo width" />
              </Link>

              {/* Desktop Menu */}
              <div className="hidden md:flex items-center gap-8">
                {['المميزات', 'الحلول', 'الأسعار', 'آراء العملاء'].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToSection(['features', 'solutions', 'pricing', 'testimonials'][idx])}
                    className="text-sm font-medium transition-colors hover:text-[#C8E235]"
                    style={{ color: '#9DC4AC' }}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {/* Desktop Buttons */}
              <div className="hidden md:flex items-center gap-3">
                <Link to="/user/login" className="px-4 py-2 text-sm font-medium transition-colors hover:text-[#C8E235]" style={{ color: '#9DC4AC' }}>
                  تسجيل الدخول
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: '#C8E235', color: '#082E24' }}
                >
                  ابدأ مجاناً
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 rounded-lg" style={{ backgroundColor: 'rgba(200,226,53,0.1)' }}>
                {isMenuOpen ? <IoClose size={24} style={{ color: '#C8E235' }} /> : <IoMenu size={24} style={{ color: '#C8E235' }} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden border-t" style={{ backgroundColor: '#082E24', borderColor: 'rgba(200,226,53,0.15)' }}>
                <div className="p-4 space-y-3">
                  {['المميزات', 'الحلول', 'الأسعار', 'آراء العملاء'].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => scrollToSection(['features', 'solutions', 'pricing', 'testimonials'][idx])}
                      className="block w-full text-right p-3 rounded-lg transition-colors"
                      style={{ color: '#9DC4AC' }}
                    >
                      {item}
                    </button>
                  ))}
                  <div className="pt-3 space-y-2">
                    <Link to="/user/login" className="block w-full text-center p-3 rounded-lg border transition-colors" style={{ borderColor: 'rgba(200,226,53,0.3)', color: '#C8E235' }}>
                      تسجيل الدخول
                    </Link>
                    <Link to="/register" className="block w-full text-center p-3 rounded-lg font-semibold" style={{ background: '#C8E235', color: '#082E24' }}>
                      ابدأ مجاناً
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ===== HERO SECTION (مثل الصورة) ===== */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#C8E235 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
          <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8" style={{ backgroundColor: 'rgba(200,226,53,0.1)', border: '1px solid rgba(200,226,53,0.2)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#C8E235' }} />
              <span className="text-sm font-medium" style={{ color: '#C8E235' }}>بوابتك الآمنة للتجارة الإلكترونية</span>
            </motion.div>

            {/* Main Title */}
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6">
              حوّل عملك إلى{' '}
              <span style={{ color: '#C8E235' }}>تجربة رقمية</span>{' '}
              متكاملة
            </motion.h1>

            {/* Subtitle */}
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto" style={{ color: '#9DC4AC' }}>
              شام ستورز هو الحل الذكي للمطاعم والمتاجر — قوائم رقمية تفاعلية، طلبات أونلاين،
              QR Code ذكي، وتحليلات متقدمة لتنمية أعمالك.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-4 justify-center mb-16">
              <Link to="/register" className="px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105" style={{ background: '#C8E235', color: '#082E24' }}>
                <IoRocket size={20} /> ابدأ الآن مجاناً <IoArrowForward size={18} />
              </Link>
              <button onClick={() => scrollToSection('features')} className="px-8 py-3 rounded-xl font-semibold transition-all" style={{ border: '1px solid rgba(200,226,53,0.5)', color: '#C8E235' }}>
                اكتشف المزيد
              </button>
            </motion.div>

            {/* Stats Row */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-2xl p-6" style={{ backgroundColor: 'rgba(13,74,58,0.5)', border: '1px solid rgba(200,226,53,0.1)' }}>
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-3xl font-bold" style={{ color: '#C8E235' }}>{stat.value}</div>
                  <div className="text-sm mt-1" style={{ color: '#9DC4AC' }}>{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ===== FEATURES SECTION ===== */}
        <section id="features" className="py-24 px-4" style={{ backgroundColor: '#0D4A3A' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold tracking-wider uppercase" style={{ color: '#C8E235' }}>المميزات</span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3 mb-4">لماذا تختار شام ستورز؟</h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: '#9DC4AC' }}>نقدم لك كل ما تحتاجه لإدارة مطعمك أو متجرك بكفاءة واحترافية</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -4 }} className="rounded-2xl p-6 transition-all" style={{ backgroundColor: '#112E23', border: '1px solid rgba(200,226,53,0.1)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(200,226,53,0.15)' }}>
                    <feature.icon size={24} style={{ color: '#C8E235' }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#9DC4AC' }}>{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SOLUTIONS SECTION (مطاعم + متاجر) ===== */}
        <section id="solutions" className="py-24 px-4" style={{ backgroundColor: '#082E24' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold tracking-wider uppercase" style={{ color: '#C8E235' }}>حلول متكاملة</span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3 mb-4">حلول مخصصة لمختلف الأنشطة</h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: '#9DC4AC' }}>نظام واحد يدير جميع احتياجاتك الرقمية بكل سهولة ومرونة</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Restaurant Card */}
              <div className="rounded-2xl overflow-hidden transition-all hover:-translate-y-1" style={{ backgroundColor: '#0F3D31', border: '1px solid rgba(200,226,53,0.15)' }}>
                <div className="p-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(200,226,53,0.15)' }}>
                    <IoRestaurant size={32} style={{ color: '#C8E235' }} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">حلول المطاعم</h3>
                  <p className="mb-6" style={{ color: '#9DC4AC' }}>أدر مطعمك رقمياً بكل سهولة</p>
                  <ul className="space-y-3 mb-8">
                    {['قوائم طعام رقمية', 'رموز QR للطاولات', 'طلبات أونلاين', 'نظام إدارة الطاولات', 'تحليلات المبيعات'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3"><IoCheckmarkCircle style={{ color: '#C8E235' }} /><span>{item}</span></li>
                    ))}
                  </ul>
                  <Link to="/register" className="block w-full text-center px-6 py-3 rounded-xl font-semibold transition-all" style={{ border: '1px solid rgba(200,226,53,0.3)', color: '#C8E235' }}>
                    ابدأ الآن
                  </Link>
                </div>
              </div>

              {/* Store Card */}
              <div className="rounded-2xl overflow-hidden transition-all hover:-translate-y-1" style={{ backgroundColor: '#0F3D31', border: '2px solid #C8E235' }}>
                <div className="p-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(200,226,53,0.15)' }}>
                    <IoStorefront size={32} style={{ color: '#C8E235' }} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">حلول المتاجر</h3>
                  <p className="mb-6" style={{ color: '#9DC4AC' }}>أدر متجرك الإلكتروني باحترافية</p>
                  <ul className="space-y-3 mb-8">
                    {['عرض المنتجات', 'نظام إدارة المخزون', 'طلبات أونلاين', 'عروض وخصومات', 'تحليلات المبيعات'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3"><IoCheckmarkCircle style={{ color: '#C8E235' }} /><span>{item}</span></li>
                    ))}
                  </ul>
                  <Link to="/register" className="block w-full text-center px-6 py-3 rounded-xl font-semibold transition-all" style={{ background: '#C8E235', color: '#082E24' }}>
                    ابدأ الآن
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== CTA SECTION ===== */}
        <section className="py-24 px-4" style={{ backgroundColor: '#0D4A3A' }}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">جاهز لتحويل عملك إلى تجربة رقمية؟</h2>
            <p className="text-lg mb-8" style={{ color: '#9DC4AC' }}>انضم إلى آلاف المطاعم والمتاجر التي تثق بشام ستورز</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/register" className="px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105" style={{ background: '#C8E235', color: '#082E24' }}>
                ابدأ الآن مجاناً
              </Link>
              <Link to="/user/login" className="px-8 py-3 rounded-xl font-semibold transition-all" style={{ border: '1px solid rgba(200,226,53,0.5)', color: '#C8E235' }}>
                تسجيل الدخول
              </Link>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="py-12 px-4 border-t" style={{ backgroundColor: '#082E24', borderColor: 'rgba(200,226,53,0.1)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#C8E235' }}>
                    <span className="font-bold text-sm" style={{ color: '#082E24' }}>ش</span>
                  </div>
                  <span className="font-bold">شام ستورز</span>
                </div>
                <p className="text-sm" style={{ color: '#9DC4AC' }}>الحل الرقمي المتكامل للمطاعم والمتاجر</p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">المنتج</h4>
                <ul className="space-y-2 text-sm" style={{ color: '#9DC4AC' }}>
                  <li><button onClick={() => scrollToSection('features')}>المميزات</button></li>
                  <li><button onClick={() => scrollToSection('pricing')}>الأسعار</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">الدعم</h4>
                <ul className="space-y-2 text-sm" style={{ color: '#9DC4AC' }}>
                  <li><Link to="/contact">تواصل معنا</Link></li>
                  <li><Link to="/faq">الأسئلة الشائعة</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">القانوني</h4>
                <ul className="space-y-2 text-sm" style={{ color: '#9DC4AC' }}>
                  <li><Link to="/terms">شروط الاستخدام</Link></li>
                  <li><Link to="/privacy">سياسة الخصوصية</Link></li>
                  <li><Link to="/about">من نحن</Link></li>
                </ul>
              </div>
            </div>
            <div className="text-center pt-8 border-t" style={{ borderColor: 'rgba(200,226,53,0.1)' }}>
              <p className="text-sm" style={{ color: '#9DC4AC' }}>© {new Date().getFullYear()} شام ستورز. جميع الحقوق محفوظة.</p>
            </div>
          </div>
        </footer>

        {/* Scroll to Top */}
        {showScrollTop && (
          <button onClick={scrollToTop} className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105" style={{ background: '#C8E235', color: '#082E24' }}>
            <IoArrowUp size={22} />
          </button>
        )}
      </div>
    </>
  );
};

export default HomePage;