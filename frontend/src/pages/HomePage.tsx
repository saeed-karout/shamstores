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

  const features = [
    { icon: IoQrCode, title: 'قوائم رقمية ذكية', description: 'قوائم طعام رقمية تفاعلية يمكن تحديثها بسهولة في أي وقت', color: 'from-blue-500 to-blue-600', delay: 0 },
    { icon: IoCart, title: 'طلبات أونلاين', description: 'استقبل الطلبات عبر الإنترنت مع نظام دفع متكامل وآمن', color: 'from-green-500 to-green-600', delay: 0.1 },
    { icon: IoStatsChart, title: 'تحليلات متقدمة', description: 'تقارير وإحصائيات دقيقة عن المبيعات والمنتجات الأكثر طلباً', color: 'from-purple-500 to-purple-600', delay: 0.2 },
    { icon: IoPhonePortrait, title: 'QR Code ذكي', description: 'رمز QR خاص لكل طاولة، يسهل على الزبائن طلب الطعام', color: 'from-orange-500 to-orange-600', delay: 0.3 },
    { icon: IoGlobe, title: 'دومين مخصص', description: 'احصل على دومين خاص بمطعمك لتعزيز هويتك الرقمية', color: 'from-cyan-500 to-cyan-600', delay: 0.4 },
    { icon: IoAnalytics, title: 'إدارة ذكية', description: 'لوحة تحكم متكاملة لإدارة المنيو والطلبات والموظفين', color: 'from-pink-500 to-pink-600', delay: 0.5 },
    { icon: IoShield, title: 'أمان عالي', description: 'نظام حماية متقدم يضمن أمان بياناتك ومدفوعاتك', color: 'from-indigo-500 to-indigo-600', delay: 0.6 },
    { icon: IoLanguage, title: 'دعم لغات متعددة', description: 'واجهة متعددة اللغات تناسب جميع العملاء', color: 'from-red-500 to-red-600', delay: 0.7 },
    { icon: IoPeople, title: 'إدارة الموظفين', description: 'صلاحيات متعددة للموظفين لإدارة المطعم بكفاءة', color: 'from-teal-500 to-teal-600', delay: 0.8 },
    { icon: IoTime, title: 'توفير الوقت', description: 'أتمتة العمليات وتقليل الأخطاء البشرية', color: 'from-yellow-500 to-yellow-600', delay: 0.9 },
  ];

  const plans = [
    { 
      id: 'free',
      name: 'مجاني', 
      price: '0', 
      yearlyPrice: '0',
      period: 'شهر', 
      description: 'مناسب للمطاعم الصغيرة للبدء', 
      features: [
        'حتى 20 صنف في القائمة',
        'طاولة واحدة فقط',
        'QR Code أساسي',
        'طلبات داخلية فقط',
        'دعم فني محدود',
        'إحصائيات أساسية'
      ], 
      recommended: false, 
      color: 'from-gray-400 to-gray-500',
      buttonText: 'ابدأ مجاناً'
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
        'تحليلات متقدمة'
      ], 
      recommended: true, 
      color: 'from-blue-500 to-blue-600',
      buttonText: 'ابدأ الآن',
      saveAmount: 'احفظ 100 ريال سنوياً'
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
        'نظام ولاء للعملاء'
      ], 
      recommended: false, 
      color: 'from-purple-500 to-purple-600',
      buttonText: 'تواصل مع المبيعات'
    }
  ];

  const testimonials = [
    { name: 'أحمد السيد', role: 'مالك مطعم الأندلس', content: 'منذ استخدام ديجيتال مينو، زادت مبيعاتنا بنسبة 40%! النظام سهل وسريع والزبائن يحبونه.', rating: 5, image: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { name: 'نورا خالد', role: 'مديرة مطعم روز', content: 'أفضل استثمار قمنا به! الكيو آر كود سهل على الزبائن والطلبات أصبحت منظمة جداً.', rating: 5, image: 'https://randomuser.me/api/portraits/women/2.jpg' },
    { name: 'محمد علي', role: 'صاحب كافيه مودرن', content: 'التحليلات والإحصائيات ساعدتنا نفهم احتياجات زبائننا بشكل أفضل. أنصح به بشدة!', rating: 5, image: 'https://randomuser.me/api/portraits/men/3.jpg' },
    { name: 'سارة أحمد', role: 'مالكة متجر هدايا', content: 'نظام المتجر سهل جداً وإدارة المخزون ممتازة. المبيعات زادت 60% خلال 3 أشهر!', rating: 5, image: 'https://randomuser.me/api/portraits/women/4.jpg' }
  ];

  const stats = [
    { value: '1000+', label: 'مطاعم ومتاجر', icon: IoBusiness, color: 'blue' },
    { value: '50K+', label: 'طلب شهرياً', icon: IoCart, color: 'green' },
    { value: '99.9%', label: 'وقت تشغيل', icon: IoCloud, color: 'purple' },
    { value: '4.9', label: 'تقييم المستخدمين', icon: IoStar, color: 'yellow' }
  ];

  const faqs = [
    { question: 'هل يمكنني تغيير القائمة في أي وقت؟', answer: 'نعم، يمكنك تحديث وإضافة وحذف الأصناف في أي وقت من خلال لوحة التحكم بكل سهولة وبدون أي تكلفة إضافية.' },
    { question: 'هل الدفع آمن؟', answer: 'نعم، نستخدم أحدث تقنيات التشفير SSL/TLS لحماية بيانات العملاء والمدفوعات، وجميع المعاملات المالية مشفرة بالكامل.' },
    { question: 'هل أحتاج إلى خبرة تقنية؟', answer: 'لا على الإطلاق! النظام مصمم ليكون سهلاً وبسيطاً، ونقدم فيديوهات تعليمية ودعم فني لمساعدتك في كل خطوة.' },
    { question: 'كيف يحصل الزبائن على القائمة؟', answer: 'عن طريق مسح QR Code على الطاولة، أو من خلال رابط مخصص لمطعمك يمكن مشاركته عبر وسائل التواصل الاجتماعي.' },
    { question: 'هل يمكنني إضافة سائقين توصيل؟', answer: 'نعم، يمكنك إضافة عدد غير محدود من السائقين وتتبع موقعهم في الوقت الفعلي وتوزيع الطلبات عليهم بسهولة.' },
    { question: 'ما هي طرق الدفع المتاحة؟', answer: 'ندعم الدفع نقداً، والبطاقات البنكية (فيزا، ماستركارد)، والمحافظ الإلكترونية (Apple Pay، Google Pay).' }
  ];

  const handleRegisterClick = (planId?: string) => {
    // حفظ الخطة المختارة للتسجيل
    if (planId) {
      localStorage.setItem('selectedPlan', planId);
    }
    navigate('/register');
  };

  return (
    <>
      <Helmet>
        <title>ديجيتال مينو | الحل الرقمي المتكامل للمطاعم والمتاجر</title>
        <meta name="description" content="حوّل مطعمك أو متجرك إلى تجربة رقمية متكاملة مع ديجيتال مينو. قوائم ذكية، طلبات أونلاين، QR Code، وتحليلات متقدمة." />
        <meta name="keywords" content="قائمة رقمية, منيو مطعم, طلبات اونلاين, QR Code للمطاعم, متجر إلكتروني, نظام مطاعم" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://digitalmenu.com" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50" dir="rtl">
        
        {/* Hero Section */}
        <section className="relative min-h-screen overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-6000"></div>
          </div>

          {/* Header */}
          <motion.header style={{ opacity: headerOpacity }} className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl shadow-sm">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <Link to="/" className="flex items-center gap-2 group">
                  <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <IoRestaurant className="text-white text-xl" />
                  </motion.div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">ديجيتال مينو</span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                  {['features', 'solutions', 'pricing', 'testimonials', 'faq'].map((section) => (
                    <button key={section} onClick={() => scrollToSection(section)} className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                      {section === 'features' ? 'المميزات' : section === 'solutions' ? 'الحلول' : section === 'pricing' ? 'الأسعار' : section === 'testimonials' ? 'آراء العملاء' : 'الأسئلة الشائعة'}
                    </button>
                  ))}
                </div>

                <div className="hidden md:flex items-center gap-3">
                  <Link to="/user/login" className="px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors font-medium">
                    تسجيل دخول
                  </Link>
                  <Link to="/register" className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium">
                    <IoRocket size={18} /> ابدأ مشروعك
                  </Link>
                </div>

                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  {isMenuOpen ? <IoClose size={24} /> : <IoMenu size={24} />}
                </button>
              </div>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -20 }} 
                  className="md:hidden absolute top-16 left-0 right-0 bg-white border-t shadow-lg py-4"
                >
                  <div className="flex flex-col gap-3 px-4">
                    {['features', 'solutions', 'pricing', 'testimonials', 'faq'].map((section) => (
                      <button key={section} onClick={() => scrollToSection(section)} className="text-right py-2 text-gray-600 hover:text-blue-600">
                        {section === 'features' ? 'المميزات' : section === 'solutions' ? 'الحلول' : section === 'pricing' ? 'الأسعار' : section === 'testimonials' ? 'آراء العملاء' : 'الأسئلة الشائعة'}
                      </button>
                    ))}
                    <div className="border-t pt-3 mt-2 space-y-2">
                      <Link to="/user/login" className="block w-full text-center py-2 text-gray-600">تسجيل دخول</Link>
                      <Link to="/register" className="block w-full text-center py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl">ابدأ مشروعك</Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.header>

          {/* Hero Content */}
          <div className="relative z-10 pt-32 pb-20 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div style={{ y: heroY, opacity: heroOpacity }}>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 bg-blue-100 rounded-full px-4 py-2 mb-6"
                  >
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm text-blue-600 font-medium">🚀 ثورة المطاعم والمتاجر الرقمية</span>
                  </motion.div>
                  
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
                  >
                    حوّل عملك إلى{' '}
                    <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
                      تجربة رقمية
                    </span>{' '}
                    متكاملة
                  </motion.h1>
                  
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl text-gray-600 mb-8 leading-relaxed"
                  >
                    ديجيتال مينو هو الحل الذكي للمطاعم والمتاجر. قوائم رقمية تفاعلية، طلبات أونلاين، 
                    QR Code ذكي، وتحليلات متقدمة لتنمية أعمالك.
                  </motion.p>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap gap-4"
                  >
                    <Link 
                      to="/register" 
                      className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 group"
                    >
                      ابدأ الآن مجاناً
                      <IoArrowForward className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <button 
                      onClick={() => scrollToSection('features')} 
                      className="px-8 py-4 border-2 border-gray-300 rounded-xl font-bold hover:border-blue-500 hover:text-blue-500 transition-all"
                    >
                      اكتشف المزيد
                    </button>
                  </motion.div>

                  {/* Stats */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-8 border-t border-gray-200"
                  >
                    {stats.map((stat, idx) => (
                      <div key={idx} className="text-center md:text-right">
                        <div className="text-2xl md:text-3xl font-bold text-blue-600">{stat.value}</div>
                        <div className="text-xs md:text-sm text-gray-500">{stat.label}</div>
                      </div>
                    ))}
                  </motion.div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="relative"
                >
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=500&fit=crop" 
                      alt="Digital Menu Preview" 
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                  
                  <motion.div 
                    animate={{ y: [0, -10, 0] }} 
                    transition={{ repeat: Infinity, duration: 3 }} 
                    className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-3 hidden lg:block"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <IoCheckmarkCircle className="text-green-500 text-xl" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">طلب جديد</div>
                        <div className="text-xs text-gray-500">قيد التحضير</div>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    animate={{ y: [0, 10, 0] }} 
                    transition={{ repeat: Infinity, duration: 3, delay: 1 }} 
                    className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-3 hidden lg:block"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <IoQrCode className="text-blue-500 text-xl" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">QR Code</div>
                        <div className="text-xs text-gray-500">طاولة رقم 5</div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              className="text-center mb-12"
            >
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">مميزاتنا</span>
              <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-4">لماذا تختار ديجيتال مينو؟</h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">نقدم لك كل ما تحتاجه لإدارة مطعمك أو متجرك بكفاءة واحترافية</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: feature.delay }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group"
                >
                  <div className={`w-14 h-14 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="text-white text-2xl" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Solutions Section (Restaurants & Stores) */}
        <section id="solutions" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              className="text-center mb-12"
            >
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">حلول متكاملة</span>
              <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-4">نقدم حلولاً لمختلف الأنشطة</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">نظام واحد يدير جميع احتياجاتك الرقمية بكل سهولة ومرونة</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Restaurant Card */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }} 
                whileHover={{ y: -5 }} 
                className="bg-white rounded-3xl shadow-xl overflow-hidden group"
              >
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white">
                  <IoRestaurant className="text-6xl mb-4" />
                  <h3 className="text-3xl font-bold">حلول المطاعم</h3>
                  <p className="opacity-90 mt-2 text-lg">أدر مطعمك رقمياً بكل سهولة</p>
                </div>
                <div className="p-8">
                  <ul className="space-y-3 mb-8">
                    {[
                      'قوائم طعام رقمية تفاعلية',
                      'رموز QR للطاولات',
                      'طلبات أونلاين وتوصيل',
                      'نظام إدارة الطاولات',
                      'تحليلات المبيعات المتقدمة',
                      'إدارة الموظفين والصلاحيات',
                      'نظام ولاء للعملاء',
                      'تقارير مالية لحظية'
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <IoCheckmarkCircle className="text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link 
                    to="/register" 
                    className="block text-center py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
                  >
                    ابدأ الآن مع مطعمك
                  </Link>
                </div>
              </motion.div>

              {/* Store Card */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true }} 
                whileHover={{ y: -5 }} 
                className="bg-white rounded-3xl shadow-xl overflow-hidden group"
              >
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white">
                  <IoStorefront className="text-6xl mb-4" />
                  <h3 className="text-3xl font-bold">حلول المتاجر</h3>
                  <p className="opacity-90 mt-2 text-lg">أدر متجرك الإلكتروني باحترافية</p>
                </div>
                <div className="p-8">
                  <ul className="space-y-3 mb-8">
                    {[
                      'عرض المنتجات والتصنيفات',
                      'نظام إدارة المخزون المتقدم',
                      'طلبات أونلاين وتوصيل',
                      'عروض وخصومات مخصصة',
                      'تحليلات المبيعات المتقدمة',
                      'إدارة العملاء والتواصل',
                      'نظام نقاط ولاء',
                      'تقارير المخزون التلقائية'
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <IoCheckmarkCircle className="text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link 
                    to="/register" 
                    className="block text-center py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105"
                  >
                    ابدأ الآن مع متجرك
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              className="text-center mb-12"
            >
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">خطط مرنة</span>
              <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-4">اختر الخطة المناسبة لعملك</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">خطط تناسب جميع الأحجام والميزانيات، ابدأ مجاناً ثم ترقى عندما تنمو أعمالك</p>
              
              {/* Billing Toggle */}
              <div className="flex justify-center items-center gap-4 mt-8">
                <span className={`font-medium ${activePlan === 'monthly' ? 'text-blue-600' : 'text-gray-500'}`}>شهري</span>
                <button
                  onClick={() => setActivePlan(activePlan === 'monthly' ? 'yearly' : 'monthly')}
                  className="relative w-16 h-8 bg-gray-300 rounded-full transition-colors duration-300 focus:outline-none"
                >
                  <span className={`absolute top-1 w-6 h-6 rounded-full transition-transform duration-300 ${activePlan === 'yearly' ? 'translate-x-9 bg-blue-600' : 'translate-x-1 bg-white'}`} />
                </button>
                <span className={`font-medium ${activePlan === 'yearly' ? 'text-green-600' : 'text-gray-500'}`}>
                  سنوي 
                  <span className="text-xs text-green-600 mr-1">(وفر 20%)</span>
                </span>
              </div>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -10 }}
                  className={`relative bg-white rounded-3xl shadow-xl overflow-hidden transition-all ${plan.recommended ? 'ring-2 ring-blue-500 scale-105 md:scale-105' : 'hover:shadow-2xl'}`}
                >
                  {plan.recommended && (
                    <div className="absolute top-6 right-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
                      الأكثر شعبية
                    </div>
                  )}
                  
                  <div className={`bg-gradient-to-r ${plan.color} p-8 text-white`}>
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="opacity-90 text-sm">{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        {activePlan === 'monthly' ? plan.price : plan.yearlyPrice}
                      </span>
                      <span className="text-sm opacity-90"> ريال / {activePlan === 'monthly' ? plan.period : 'سنة'}</span>
                    </div>
                    {activePlan === 'yearly' && plan.saveAmount && (
                      <p className="text-xs mt-1 text-green-200">{plan.saveAmount}</p>
                    )}
                  </div>
                  
                  <div className="p-8">
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <IoCheckmarkCircle className="text-green-500 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleRegisterClick(plan.id)}
                      className={`w-full py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
                        plan.recommended 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700' 
                          : 'border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white'
                      }`}
                    >
                      {plan.buttonText}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            <p className="text-center text-gray-500 text-sm mt-8">
              * جميع الخطط تشمل تحديثات مجانية ودعم فني<br />
              ** يمكنك الترقية أو التخفيض في أي وقت
            </p>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              className="text-center mb-12"
            >
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">آراء العملاء</span>
              <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-4">ماذا يقول عملاؤنا عنا؟</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">نفخر بثقة آلاف المطاعم والمتاجر التي تختارنا لإدارة أعمالها</p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              <div className="relative bg-white rounded-3xl shadow-xl p-8 md:p-12">
                <div className="absolute top-8 right-8 text-6xl text-blue-100">“</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTestimonial}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <img 
                        src={testimonials[activeTestimonial].image} 
                        alt={testimonials[activeTestimonial].name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-bold text-lg">{testimonials[activeTestimonial].name}</h4>
                        <p className="text-gray-500 text-sm">{testimonials[activeTestimonial].role}</p>
                        <div className="flex gap-1 mt-1">
                          {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                            <IoStar key={i} className="text-yellow-400 text-sm" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                      “{testimonials[activeTestimonial].content}”
                    </p>
                  </motion.div>
                </AnimatePresence>
                
                {/* Dots */}
                <div className="flex justify-center gap-2 mt-6">
                  {testimonials.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTestimonial(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${idx === activeTestimonial ? 'w-8 bg-blue-500' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              className="text-center mb-12"
            >
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">الأسئلة الشائعة</span>
              <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-4">هل لديك أسئلة؟</h2>
              <p className="text-gray-600">نحن هنا للإجابة على جميع استفساراتك</p>
            </motion.div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <IoBulb className="text-blue-500" />
                    {faq.question}
                  </h3>
                  <p className="text-gray-600 pr-6">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">جاهز لتحويل عملك إلى تجربة رقمية؟</h2>
              <p className="text-white/90 text-lg mb-8">انضم إلى آلاف المطاعم والمتاجر التي تثق بنا</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link 
                  to="/register" 
                  className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <IoRocket size={20} /> ابدأ الآن مجاناً
                </Link>
                <Link 
                  to="/user/login" 
                  className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold hover:bg-white hover:text-blue-600 transition-all"
                >
                  تسجيل الدخول
                </Link>
              </div>
              <p className="text-white/70 text-sm mt-4">لا حاجة لبطاقة ائتمان • يمكنك الإلغاء في أي وقت • دعم فني على مدار الساعة</p>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <IoRestaurant className="text-white text-xl" />
                  </div>
                  <span className="text-xl font-bold">ديجيتال مينو</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  الحل الرقمي المتكامل للمطاعم والمتاجر. قوائم ذكية، طلبات أونلاين، وتحليلات متقدمة لتنمية أعمالك.
                </p>
                <div className="flex gap-3 mt-4">
                  <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
                    <IoLogoWhatsapp />
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors">
                    <IoLogoInstagram />
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                    <IoLogoFacebook />
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors">
                    <IoLogoTwitter />
                  </a>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold mb-4">المنتج</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">المميزات</button></li>
                  <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">الأسعار</button></li>
                  <li><Link to="/" className="hover:text-white transition-colors">تحديثات</Link></li>
                  <li><Link to="/" className="hover:text-white transition-colors">API</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-4">الدعم</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><Link to="/" className="hover:text-white transition-colors">مركز المساعدة</Link></li>
                  <li><Link to="/" className="hover:text-white transition-colors">تواصل معنا</Link></li>
                  <li><Link to="/" className="hover:text-white transition-colors">الأسئلة الشائعة</Link></li>
                  <li><Link to="/" className="hover:text-white transition-colors">حالة النظام</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-4">القانوني</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><Link to="/" className="hover:text-white transition-colors">شروط الاستخدام</Link></li>
                  <li><Link to="/" className="hover:text-white transition-colors">سياسة الخصوصية</Link></li>
                  <li><Link to="/" className="hover:text-white transition-colors">ملفات تعريف الارتباط</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
              © {new Date().getFullYear()} ديجيتال مينو. جميع الحقوق محفوظة. <br />
              تصميم وتطوير بخبرة و❤️
            </div>
          </div>
        </footer>

        {/* Scroll to Top Button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              onClick={scrollToTop}
              className="fixed bottom-6 left-6 z-40 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              <IoArrowUp size={20} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animation-delay-6000 { animation-delay: 6s; }
        
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient { background-size: 200% auto; animation: gradient 3s linear infinite; }
      `}</style>
    </>
  );
};

export default HomePage;