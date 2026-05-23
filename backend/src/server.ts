// backend/src/server.ts

import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { initializeSocket } from './realtime/socket';

// استيراد المسارات
import authRoutes from './routes/authRoutes';
import restaurantRoutes from './routes/restaurantRoutes';
import menuRoutes from './routes/menuRoutes';
import orderRoutes from './routes/orderRoutes';
import tableRoutes from './routes/tableRoutes';
import uploadRoutes from './routes/uploadRoutes';
import planRoutes from './routes/planRoutes';
import qrRoutes from './routes/qrRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import couponRoutes from './routes/couponRoutes';
import deliveryRoutes from './routes/deliveryRoutes';
import storeRoutes from './routes/storeRoutes';
import featureRoutes from './routes/featureRoutes';
import platformSettingsRoutes from './routes/platformSettingsRoutes';
import publicRoutes from './routes/publicRoutes';
import marketingRoutes from './routes/marketingRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes'; 

import { extractSubdomain } from './middleware/subdomain';
import advertisementRoutes from './routes/advertisementRoutes';
import inventoryRoutes from './routes/inventoryRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

// إنشاء Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// ==============================================
// ✅ إعدادات CORS المتقدمة
// ==============================================
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      'https://shamstores.com',
      'https://www.shamstores.com',
      'http://localhost:3000',
      'http://localhost:5173',
      'https://shamstores-app-mixd9.ondigitalocean.app'
    ];

    const isShamstoresSubdomain = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.shamstores\.com$/.test(origin);
    const isLocalhost = /^https?:\/\/(([a-z0-9-]+\.)*localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (allowedOrigins.includes(origin) || isShamstoresSubdomain || isLocalhost) {
      console.log(`✅ CORS allowed for origin: ${origin}`);
      return callback(null, true);
    }

    console.log(`❌ CORS blocked for origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Subdomain'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ==============================================
// إعدادات السيرفر
// ==============================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// المجلدات الثابتة
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// تفعيل middleware استخراج الـ subdomain
app.use(extractSubdomain);

// ==============================================
// المسارات (Routes)
// ==============================================
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/platform-settings', platformSettingsRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/inventory', inventoryRoutes);


// ==============================================
// Middleware وضع الصيانة
// ==============================================
const maintenanceMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // استثناء مسارات API المهمة
  const excludedPaths = ['/api/auth/login', '/api/platform-settings/public', '/api/admin/login'];
  
  if (excludedPaths.includes(req.path)) {
    return next();
  }
  
  try {
    const maintenanceMode = await prisma.extendedPlatformSetting.findUnique({
      where: { keyName: 'maintenance_mode' }
    });
    
    if (maintenanceMode && maintenanceMode.value === 'true') {
      const maintenanceMessage = await prisma.extendedPlatformSetting.findUnique({
        where: { keyName: 'maintenance_message' }
      });
      
      return res.status(503).json({
        success: false,
        maintenance: true,
        message: maintenanceMessage?.value || 'المنصة في وضع الصيانة حالياً. نعتذر عن الإزعاج.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    next();
  }
};

// تطبيق middleware وضع الصيانة على جميع المسارات
app.use(maintenanceMiddleware);

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({
    message: 'مرحباً بك في Digital Menu SaaS API',
    version: '2.0.0',
    status: 'active',
    database: 'Prisma ORM',
    endpoints: {
      auth: '/api/auth',
      restaurants: '/api/restaurants',
      menu: '/api/menu',
      orders: '/api/orders',
      tables: '/api/tables',
      upload: '/api/upload',
      plans: '/api/plans',
      qr: '/api/qr',
      store: '/api/store',
      delivery: '/api/delivery',
      marketing: '/api/marketing'
    }
  });
});

// معالجة الأخطاء العامة
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ error: 'حدث خطأ في الخادم' });
});

// ==============================================
// إدراج البيانات الأساسية (الخطط)
// ==============================================
const seedPlans = async () => {
  try {
    const plansCount = await prisma.plan.count();
    
    if (plansCount === 0) {
      console.log('📦 جاري إدراج الخطط الأساسية...');
      
      await prisma.plan.createMany({
        data: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'free',
            slug: 'free',
            price: 0,
            maxRestaurants: 1,
            maxStores: 1,
            maxUsers: 5,
            maxMenuItems: 20,
            maxProducts: 50,
            maxOrders: 100,
            isActive: true,
            position: 1,
            description: 'مناسب للمطاعم والمتاجر الصغيرة للبدء'
          },
          {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'basic',
            slug: 'basic',
            price: 49.99,
            maxRestaurants: 1,
            maxStores: 1,
            maxUsers: 10,
            maxMenuItems: 100,
            maxProducts: 500,
            maxOrders: 1000,
            isActive: true,
            position: 2,
            description: 'مناسب للمطاعم والمتاجر المتوسطة'
          },
          {
            id: '33333333-3333-3333-3333-333333333333',
            name: 'pro',
            slug: 'pro',
            price: 99.99,
            maxRestaurants: 2,
            maxStores: 2,
            maxUsers: 20,
            maxMenuItems: 500,
            maxProducts: 5000,
            maxOrders: 10000,
            isActive: true,
            position: 3,
            description: 'مناسب للمطاعم والمتاجر الكبيرة'
          },
          {
            id: '44444444-4444-4444-4444-444444444444',
            name: 'enterprise',
            slug: 'enterprise',
            price: 199.99,
            maxRestaurants: 999999,
            maxStores: 999999,
            maxUsers: 999999,
            maxMenuItems: 999999,
            maxProducts: 999999,
            maxOrders: 999999,
            isActive: true,
            position: 4,
            description: 'غير محدود مع جميع الميزات والدعم الأولوية'
          }
        ]
      });
      
      console.log('✅ تم إدراج الخطط بنجاح');
    }
  } catch (error) {
    console.error('Error seeding plans:', error);
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
        { keyName: 'default_currency', value: 'SAR', type: 'string', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'العملة الافتراضية' },
        { keyName: 'currency_symbol', value: 'ر.س', type: 'string', settingGroup: 'payment', isPublic: true, isEditable: true, description: 'رمز العملة' },
        
        // إعدادات التوصيل
        { keyName: 'default_delivery_fee', value: '5', type: 'number', settingGroup: 'delivery', isPublic: true, isEditable: true, description: 'سعر التوصيل الافتراضي' },
        { keyName: 'free_delivery_threshold', value: '100', type: 'number', settingGroup: 'delivery', isPublic: true, isEditable: true, description: 'الحد الأدنى للتوصيل المجاني' },
        { keyName: 'estimated_delivery_time', value: '45', type: 'number', settingGroup: 'delivery', isPublic: true, isEditable: true, description: 'وقت التوصيل المتوقع بالدقائق' },
        
        // إعدادات الأمان
        { keyName: 'enable_2fa', value: 'false', type: 'boolean', settingGroup: 'security', isPublic: false, isEditable: true, description: 'تفعيل المصادقة ذات العاملين' },
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
    // الاتصال بقاعدة البيانات باستخدام Prisma
    await prisma.$connect();
    console.log('✅ Prisma connected to database successfully.');

    // إدراج البيانات الأساسية
    await seedPlans();
    await seedPlatformSettings();

    // تشغيل Socket.IO
    initializeSocket(httpServer);

    // بدء الاستماع على المنفذ
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📝 API: http://localhost:${PORT}`);
      console.log(`🔔 Socket.IO: ws://localhost:${PORT}`);
      console.log(`🌐 CORS: Enabled for shamstores.com and all subdomains`);
      console.log(`🗄️  Database: Prisma ORM`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// إغلاق الاتصال بشكل نظيف عند إيقاف السيرفر
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('🔌 Prisma disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  console.log('🔌 Prisma disconnected');
  process.exit(0);
});

startServer();

// تصدير prisma للاستخدام في الملفات الأخرى
export { prisma };