// backend/src/server.ts

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import http from 'http';
import helmet from 'helmet';
import compression from 'compression';
import hpp from 'hpp';
import { PrismaClient } from '@prisma/client';
import { initializeSocket } from './realtime/socket';
import env, { isProduction } from './config/env';
import { PLAN_SEEDS } from './config/plans';
import { buildSitemap } from './services/sitemap.service';
import {
  generalLimiter,
  authLimiter,
  registerLimiter,
  publicOrderLimiter,
  uploadLimiter,
  emailLimiter,
  errorHandler,
  apiNotFound
} from './middleware/security';
import { isAllowedOrigin } from './config/origins';
import { configureLogging } from './utils/logger';
import { getReadiness, getFullHealth } from './services/health.service';
import { authenticate, authorize } from './middleware/auth';

// استيراد المسارات
import authRoutes from './routes/authRoutes';
import restaurantRoutes from './routes/restaurantRoutes';
import menuRoutes from './routes/menuRoutes';
import orderRoutes from './routes/orderRoutes';
import tableRoutes from './routes/tableRoutes';
import uploadRoutes from './routes/uploadRoutes';
import notificationRoutes from './routes/notificationRoutes';
import planRoutes from './routes/planRoutes';
import qrRoutes from './routes/qrRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import couponRoutes from './routes/couponRoutes';
import deliveryRoutes from './routes/deliveryRoutes';
import financeRoutes from './routes/financeRoutes';
import storeRoutes from './routes/storeRoutes';
import featureRoutes from './routes/featureRoutes';
import platformSettingsRoutes from './routes/platformSettingsRoutes';
import publicRoutes from './routes/publicRoutes';
import marketingRoutes from './routes/marketingRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import customDomainRoutes from './routes/customDomainRoutes';

import { extractSubdomain } from './middleware/subdomain';
import advertisementRoutes from './routes/advertisementRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import { startSchedulers } from './schedulers';

// إسكات السجلات المطوّلة في الإنتاج (كانت تطبع حمولات التوكن)
configureLogging();

const app = express();
const PORT = env.PORT;
const httpServer = http.createServer(app);

// خلف موازن تحميل (Heroku) — ضروري ليعمل rate limiting بشكل صحيح
if (env.TRUST_PROXY !== 'false') {
  app.set('trust proxy', Number(env.TRUST_PROXY) || 1);
}
app.disable('x-powered-by');

// إنشاء Prisma Client
const prisma = new PrismaClient({
  log: isProduction ? ['error'] : ['warn', 'error'],
});

// ==============================================
// ✅ ترويسات الأمان (Helmet)
// ==============================================
app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          useDefaults: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              'https://www.googletagmanager.com',
              'https://www.google-analytics.com',
              'https://apis.google.com'
            ],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            // الفيديو يُقدَّم من R2 على نطاق مختلف؛ بدون mediaSrc يمنعه defaultSrc
            mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc: ["'self'", 'https:', 'wss:'],
            frameSrc: ["'self'", 'https://www.google.com', 'https://shamstores.firebaseapp.com'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: []
          }
        }
      : false,
    crossOriginEmbedderPolicy: false,
    // الصور تأتي من R2/Cloudflare على نطاق مختلف
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: isProduction ? { maxAge: 15552000, includeSubDomains: true, preload: false } : false
  })
);

app.use(compression());

// ==============================================
// ✅ إعدادات CORS
// ==============================================
// القواعد نفسها يستخدمها Socket.IO — تعريفها في config/origins.ts
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    isAllowedOrigin(origin)
      .then((allowed) => callback(null, allowed))
      .catch(() => callback(null, false));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Subdomain'],
  maxAge: 86400,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ==============================================
// تحليل الجسم — حد منخفض: الصور تمر عبر multer لا عبر JSON
// ==============================================
const BODY_LIMIT = process.env.JSON_BODY_LIMIT || '1mb';
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
app.use(hpp());

// المجلدات الثابتة (صور قديمة محفوظة محلياً)
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; sandbox");
    }
  })
);

// خريطة الموقع — على الجذر لا تحت /api.
//
// الزواحف تطلب /sitemap.xml من جذر النطاق ولا تبحث عنها في مكان آخر،
// وrobots.txt يشير إليها هناك. الـ Worker يمرّر هذا المسار إلى هنا.
//
// التخزين المؤقت ساعة: بناؤها يقرأ كل المتاجر النشطة، وزاحف يعيد الطلب
// كل دقيقة كان سيثقل خطة قاعدة بيانات بعشرة اتصالات.
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const xml = await buildSitemap();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Error building sitemap:', error);
    res.status(500).send('sitemap unavailable');
  }
});

// فحص الصحة — يستخدمه Heroku والمراقبة
// مسبار إقلاع Heroku — سطحي عمداً: يقيس أن العملية حيّة وتستجيب، بأسرع ما
// يمكن وبلا لمس قاعدة البيانات. لا تستخدمه للمراقبة الخارجية.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), env: env.NODE_ENV });
});

// نقطة المراقبة الخارجية: تفحص قاعدة البيانات فعلاً وتردّ 503 عند سقوطها.
// بلا تفاصيل عمداً — نقطة مفتوحة للعالم لا تكشف بنيتك الداخلية ولا رسائل
// أخطاء قاعدة البيانات.
app.get('/health/ready', async (_req, res) => {
  const { ready } = await getReadiness();
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' });
});

// الصورة الكاملة — للسوبر أدمن وحده
app.get('/health/detail', authenticate, authorize(['super_admin']), async (_req, res) => {
  res.json({ success: true, data: await getFullHealth() });
});

// استخراج الـ subdomain / النطاق المخصص
app.use(extractSubdomain);

// ==============================================
// وضع الصيانة — يجب أن يسبق المسارات وإلا لن يعمل إطلاقاً
// ==============================================
const MAINTENANCE_EXCLUDED = [
  '/health',
  '/health/ready',
  '/health/detail',
  '/api/auth/login',
  '/api/auth/me',
  '/api/platform-settings/public',
  '/api/admin/login',
  '/api/admin/maintenance'
];

let maintenanceCache: { value: boolean; message: string; expires: number } = {
  value: false,
  message: '',
  expires: 0
};

const maintenanceMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (!req.path.startsWith('/api/')) return next();
  if (MAINTENANCE_EXCLUDED.some((p) => req.path === p || req.path.startsWith(p + '/'))) {
    return next();
  }

  try {
    if (maintenanceCache.expires < Date.now()) {
      const [mode, message] = await Promise.all([
        prisma.extendedPlatformSetting.findUnique({ where: { keyName: 'maintenance_mode' } }),
        prisma.extendedPlatformSetting.findUnique({ where: { keyName: 'maintenance_message' } })
      ]);
      maintenanceCache = {
        value: mode?.value === 'true',
        message: message?.value || 'المنصة في وضع الصيانة حالياً. نعتذر عن الإزعاج.',
        expires: Date.now() + 30000
      };
    }

    if (maintenanceCache.value) {
      return res.status(503).json({
        success: false,
        maintenance: true,
        message: maintenanceCache.message
      });
    }

    next();
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    next();
  }
};

app.use(maintenanceMiddleware);

// ==============================================
// حدود المعدل (Rate Limiting)
// ==============================================
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/delivery/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/register-store', registerLimiter);
app.use('/api/auth/forgot-password', emailLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/resend-verification', emailLimiter);
app.use('/api/auth/verify-email', authLimiter);
app.use('/api/upload', uploadLimiter);
// إنشاء الطلبات فقط (مسار عام بلا مصادقة) — لا نقيّد قراءة الطلبات في لوحة التاجر
app.use('/api/orders', (req, res, next) => {
  if (req.method === 'POST' && (req.path === '/' || req.path === '')) {
    return publicOrderLimiter(req, res, next);
  }
  next();
});

// ==============================================
// المسارات (Routes)
// ==============================================
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/platform-settings', platformSettingsRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/custom-domain', customDomainRoutes);


// ==============================================
// معلومات الـ API (لا تكشف بنية المسارات في الإنتاج)
// ==============================================
app.get('/api', (_req, res) => {
  res.json({
    message: 'Digital Menu SaaS API',
    version: '2.0.0',
    status: 'active'
  });
});

// 404 لمسارات الـ API غير الموجودة — قبل تقديم ملفات الواجهة
app.use('/api', apiNotFound);

// ==============================================
// تقديم الواجهة المبنية (نشر بتطبيق Heroku واحد)
// ==============================================
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');
// وجود index.html وحده لا يكفي: الملف متتبَّع في git بينما مجلد assets ناتج
// بناء غير متتبَّع. لو نُشر بلا بناء الواجهة (كما هو الحال حين تُخدم من
// Cloudflare) لكان الخادم يقدّم صفحة مكسورة بمراجع مفقودة بدل أن يعمل كـ API.
const hasFrontendBuild =
  env.SERVE_FRONTEND &&
  fs.existsSync(path.join(FRONTEND_DIST, 'index.html')) &&
  fs.existsSync(path.join(FRONTEND_DIST, 'assets'));

if (hasFrontendBuild) {
  // الأصول المُبصَمة (hashed) تُخزَّن طويلاً، وindex.html لا يُخزَّن إطلاقاً
  app.use(
    express.static(FRONTEND_DIST, {
      index: false,
      maxAge: '1y',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    })
  );

  // SPA fallback — أي مسار غير معروف يُسلَّم إلى React Router
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      message: 'مرحباً بك في Digital Menu SaaS API',
      version: '2.0.0',
      status: 'active'
    });
  });
}

// ==============================================
// معالجة الأخطاء العامة — يجب أن تكون آخر شيء
// ==============================================
app.use(errorHandler);

// ==============================================
// إدراج البيانات الأساسية (الخطط)
// ==============================================
const seedPlans = async () => {
  try {
    const plansCount = await prisma.plan.count();
    
    if (plansCount === 0) {
      console.log('📦 جاري إدراج الخطط الأساسية...');
      
      await prisma.plan.createMany({ data: PLAN_SEEDS });
      
      console.log('✅ تم إدراج الخطط بنجاح');
    }
  } catch (error) {
    console.error('Error seeding plans:', error);
  }
};

// ==============================================
// ميزة إخفاء شارة المنصة
// ==============================================
//
// تُباع مفردة لمن هو على خطة لا تمنحها. بلا صفّها في جدول الميزات لا
// يستطيع التاجر شراءها ولا السوبر أدمن إسنادها — فتبقى الشارة ظاهرة على
// كل واجهة مجانية بلا مخرج مدفوع، وهو نصف الغرض منها.
//
// `update: {}` مقصود: السوبر أدمن قد يغيّر السعر أو الوصف، وإقلاع الخادم
// لا يجوز أن يمحو تعديله.
const seedBrandingFeature = async () => {
  try {
    await prisma.feature.upsert({
      where: { code: 'branding_removal' },
      update: {},
      create: {
        code: 'branding_removal',
        name: 'إخفاء شعار المنصة',
        nameEn: 'Remove platform branding',
        description: 'تختفي شارة «انضم لنا» من قائمتك أو متجرك، فتبدو الواجهة لك وحدك.',
        category: 'both',
        group: 'branding',
        isCore: false,
        isActive: true,
        price: 2,
        isOneTime: false
      }
    });
  } catch (error) {
    console.error('Error seeding branding feature:', error);
  }
};

// ==============================================
// إدراج إعدادات المنصة الافتراضية
// ==============================================
const seedPlatformSettings = async () => {
  try {
    const settingsCount = await prisma.extendedPlatformSetting.count();
    
    if (settingsCount === 0) {
      console.log('📦 جاري إدراج إعدادات المنصة الافتراضية...');
      
      const defaultSettings = [
        // إعدادات عامة
        { keyName: 'site_name', value: 'شام ستورز', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اسم المنصة بالعربية' },
        { keyName: 'site_name_en', value: 'Sham Stores', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اسم المنصة بالإنجليزية' },
        { keyName: 'site_logo', value: '', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رابط شعار المنصة' },
        { keyName: 'site_favicon', value: '', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رابط أيقونة المنصة' },
        { keyName: 'primary_color', value: '#C8E235', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اللون الأساسي للمنصة' },
        { keyName: 'secondary_color', value: '#10B981', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'اللون الثانوي للمنصة' },
        { keyName: 'maintenance_mode', value: 'false', type: 'boolean', settingGroup: 'general', isPublic: true, isEditable: true, description: 'تفعيل وضع الصيانة' },
        { keyName: 'maintenance_message', value: 'نعمل على تحسين المنصة، نعتذر عن الإزعاج', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رسالة الصيانة بالعربية' },
        { keyName: 'maintenance_message_en', value: 'We are improving the platform, sorry for the inconvenience', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رسالة الصيانة بالإنجليزية' },
        { keyName: 'contact_email', value: 'support@digitalmenu.com', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'بريد الدعم الفني' },
        { keyName: 'contact_phone', value: '+966 123456789', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رقم الدعم الفني' },
        { keyName: 'contact_whatsapp', value: '+966 123456789', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'رقم واتساب الدعم' },
        { keyName: 'address', value: 'الرياض، المملكة العربية السعودية', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'عنوان المنصة' },
        { keyName: 'address_en', value: 'Riyadh, Saudi Arabia', type: 'string', settingGroup: 'general', isPublic: true, isEditable: true, description: 'عنوان المنصة بالإنجليزية' },
        
        // إعدادات المصادقة
        { keyName: 'allow_registration', value: 'true', type: 'boolean', settingGroup: 'auth', isPublic: true, isEditable: true, description: 'السماح بتسجيل حسابات جديدة' },
        { keyName: 'require_email_verification', value: 'false', type: 'boolean', settingGroup: 'auth', isPublic: true, isEditable: true, description: 'طلب تفعيل البريد الإلكتروني' },
        { keyName: 'max_login_attempts', value: '5', type: 'number', settingGroup: 'auth', isPublic: true, isEditable: true, description: 'الحد الأقصى لمحاولات الدخول' },
        { keyName: 'lockout_duration', value: '15', type: 'number', settingGroup: 'auth', isPublic: true, isEditable: true, description: 'مدة قفل الحساب بالدقائق' },
        { keyName: 'session_timeout_minutes', value: '720', type: 'number', settingGroup: 'auth', isPublic: true, isEditable: true, description: 'مدة انتهاء الجلسة بالدقائق' },
        
        // إعدادات الدفع
        { keyName: 'enable_cash_on_delivery', value: 'true', type: 'boolean', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'تفعيل الدفع عند الاستلام' },
        { keyName: 'enable_online_payment', value: 'false', type: 'boolean', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'تفعيل الدفع الإلكتروني' },
        { keyName: 'default_currency', value: 'SYP', type: 'string', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'العملة الافتراضية' },
        { keyName: 'usd_exchange_rate', value: '0', type: 'number', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'سعر صرف الدولار بالليرة السورية — يضبطه السوبر أدمن وحده ويسري على المنصة كلها' },
        { keyName: 'currency_symbol', value: 'ر.س', type: 'string', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'رمز العملة' },
        
        // إعدادات التوصيل
        { keyName: 'default_delivery_fee', value: '5', type: 'number', settingGroup: 'delivery', isPublic: true, isEditable: true, description: 'سعر التوصيل الافتراضي' },
        { keyName: 'free_delivery_threshold', value: '100', type: 'number', settingGroup: 'delivery', isPublic: true, isEditable: true, description: 'الحد الأدنى للتوصيل المجاني' },
        { keyName: 'estimated_delivery_time', value: '45', type: 'number', settingGroup: 'delivery', isPublic: true, isEditable: true, description: 'وقت التوصيل المتوقع بالدقائق' },
        
        // إعدادات الأمان
        { keyName: 'enable_2fa', value: 'false', type: 'boolean', settingGroup: 'auth', isPublic: false, isEditable: false, description: 'التحقق بخطوتين — غير مُنفَّذ بعد. المفتاح معطّل عمداً حتى لا يوحي بحماية غير موجودة' },
        { keyName: 'prevent_weak_passwords', value: 'true', type: 'boolean', settingGroup: 'security', isPublic: false, isEditable: true, description: 'منع كلمات المرور الضعيفة' },
        
        // إعدادات التحليلات
        { keyName: 'enable_analytics', value: 'true', type: 'boolean', settingGroup: 'analytics', isPublic: false, isEditable: true, description: 'تفعيل نظام التحليلات' },
        
        // إعدادات SEO
        { keyName: 'seo_title', value: 'شام ستورز | الحل الرقمي المتكامل للمطاعم والمتاجر', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'عنوان الصفحة الرئيسية (SEO Title)' },
        { keyName: 'seo_title_en', value: 'Sham Stores | The Complete Digital Solution for Restaurants and Stores', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'عنوان الصفحة الرئيسية بالإنجليزية' },
        { keyName: 'seo_description', value: 'حوّل مطعمك أو متجرك إلى تجربة رقمية متكاملة مع شام ستورز. قوائم ذكية، طلبات أونلاين، QR Code، وتحليلات متقدمة. ابدأ الآن مجاناً!', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'وصف الموقع' },
        { keyName: 'seo_description_en', value: 'Transform your restaurant or store into a complete digital experience with Sham Stores. Smart menus, online orders, QR Code, and advanced analytics. Start for free!', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'وصف الموقع بالإنجليزية' },
        { keyName: 'seo_keywords', value: 'قائمة رقمية, منيو مطعم, طلبات اونلاين, QR Code للمطاعم, متجر إلكتروني, نظام مطاعم, شام ستورز', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'الكلمات المفتاحية' },
        { keyName: 'seo_author', value: 'Sham Stores', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'اسم المؤلف' },
        { keyName: 'seo_robots', value: 'index, follow', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'إعدادات محركات البحث' },
        { keyName: 'seo_canonical_url', value: 'https://shamstores.com/', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'الرابط الأساسي' },
        { keyName: 'og_title', value: 'شام ستورز | الحل الرقمي المتكامل للمطاعم والمتاجر', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'عنوان Open Graph' },
        { keyName: 'og_title_en', value: 'Sham Stores | The Complete Digital Solution for Restaurants and Stores', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'عنوان Open Graph بالإنجليزية' },
        { keyName: 'og_description', value: 'حوّل مطعمك أو متجرك إلى تجربة رقمية متكاملة مع شام ستورز.', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'وصف Open Graph' },
        { keyName: 'og_description_en', value: 'Transform your restaurant or store into a complete digital experience with Sham Stores.', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'وصف Open Graph بالإنجليزية' },
        { keyName: 'og_image', value: '/og-image.jpg', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'رابط صورة Open Graph' },
        { keyName: 'og_type', value: 'website', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'نوع Open Graph' },
        { keyName: 'twitter_card', value: 'summary_large_image', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'نوع بطاقة Twitter' },
        { keyName: 'twitter_title', value: 'شام ستورز | الحل الرقمي المتكامل للمطاعم والمتاجر', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'عنوان Twitter Card' },
        { keyName: 'twitter_title_en', value: 'Sham Stores | The Complete Digital Solution for Restaurants and Stores', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'عنوان Twitter Card بالإنجليزية' },
        { keyName: 'twitter_description', value: 'حوّل مطعمك أو متجرك إلى تجربة رقمية متكاملة مع شام ستورز.', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'وصف Twitter Card' },
        { keyName: 'twitter_description_en', value: 'Transform your restaurant or store into a complete digital experience with Sham Stores.', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'وصف Twitter Card بالإنجليزية' },
        { keyName: 'twitter_image', value: '/og-image.jpg', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'رابط صورة Twitter Card' },
        { keyName: 'schema_org_type', value: 'SoftwareApplication', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'نوع Schema.org' },
        { keyName: 'schema_org_name', value: 'شام ستورز', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'اسم Schema.org' },
        { keyName: 'schema_org_name_en', value: 'Sham Stores', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'اسم Schema.org بالإنجليزية' },
        { keyName: 'schema_org_description', value: 'الحل الرقمي المتكامل للمطاعم والمتاجر - قوائم رقمية، طلبات أونلاين، QR Code، وتحليلات متقدمة', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'وصف Schema.org' },
        { keyName: 'schema_org_description_en', value: 'The complete digital solution for restaurants and stores - digital menus, online orders, QR Code, and advanced analytics', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'وصف Schema.org بالإنجليزية' },
        { keyName: 'schema_org_rating_value', value: '4.9', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'قيمة التقييم' },
        { keyName: 'schema_org_rating_count', value: '1250', type: 'string', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'عدد التقييمات' },
        { keyName: 'alternate_languages', value: '["ar","en"]', type: 'array', settingGroup: 'seo', isPublic: true, isEditable: true, description: 'اللغات البديلة' },
        { keyName: 'google_analytics_id', value: '', type: 'string', settingGroup: 'seo', isPublic: false, isEditable: true, description: 'معرف Google Analytics' },
        { keyName: 'facebook_pixel_id', value: '', type: 'string', settingGroup: 'seo', isPublic: false, isEditable: true, description: 'معرف Facebook Pixel' }
      ];

      for (const setting of defaultSettings) {
        await prisma.extendedPlatformSetting.upsert({
          where: { keyName: setting.keyName },
          update: {
            value: setting.value,
            type: setting.type as any,
            settingGroup: setting.settingGroup as any,
            isPublic: setting.isPublic,
            isEditable: setting.isEditable,
            description: setting.description
          },
          create: {
            keyName: setting.keyName,
            value: setting.value,
            type: setting.type as any,
            settingGroup: setting.settingGroup as any,
            isPublic: setting.isPublic,
            isEditable: setting.isEditable,
            description: setting.description
          }
        });
      }
      
      console.log('✅ تم إدراج إعدادات المنصة الافتراضية بنجاح');
    }
  } catch (error) {
    console.error('Error seeding platform settings:', error);
  }
};

// ==============================================
// بدء تشغيل السيرفر
// ==============================================
const startServer = async () => {
  try {
    await prisma.$connect();
    console.warn('✅ Prisma connected to database successfully.');

    // إدراج البيانات الأساسية
    await seedPlans();
    await seedBrandingFeature();
    await seedPlatformSettings();

    startSchedulers();
    initializeSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.warn(`🚀 Server running on port ${PORT} [${env.NODE_ENV}]`);
      console.warn(`🌐 App domain: ${env.APP_DOMAIN}`);
      console.warn(`🖥️  Frontend served from server: ${hasFrontendBuild ? 'yes' : 'no'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // في الإنتاج نفشل بوضوح بدل البقاء في حالة نصف عاملة
    process.exit(1);
  }
};

// ==============================================
// إغلاق نظيف — Heroku يرسل SIGTERM قبل إعادة التشغيل
// ==============================================
let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.warn(`🔻 Received ${signal}, shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    console.error('⏱️  Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 25000);
  forceExit.unref();

  httpServer.close(async () => {
    try {
      await prisma.$disconnect();
      console.warn('🔌 Prisma disconnected');
    } catch (error) {
      console.error('Error during shutdown:', error);
    } finally {
      clearTimeout(forceExit);
      process.exit(0);
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  shutdown('uncaughtException');
});

startServer();

// تصدير prisma للاستخدام في الملفات الأخرى
export { prisma };