import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import dotenv from 'dotenv';
import sequelize, { testConnection } from './config/database';
import { initializeSocket } from './realtime/socket';

// استيراد النماذج (لتهيئة العلاقات)
import './models';

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
import { extractSubdomain } from './middleware/subdomain';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

// ✅ إعدادات CORS المتقدمة
const allowedOrigins = [
  'https://shamstores.com',
  'https://www.shamstores.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://shamstores-app-mixd9.ondigitalocean.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // ✅ في وضع التطوير، قبول أي localhost أو 127.0.0.1 (بما فيها الـ subdomains)
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost = /^https?:\/\/(([a-z0-9-]+\.)*localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) {
        console.log('✅ CORS allowed for development:', origin);
        return callback(null, true);
      }
    }
    
    const isShamstoresSubdomain = /^https:\/\/([a-z0-9-]+\.)+shamstores\.com$/.test(origin);

    if (allowedOrigins.indexOf(origin) !== -1 || isShamstoresSubdomain) {
      console.log('✅ CORS allowed for origin:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked for origin:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
}));

app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// المجلدات الثابتة
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ✅ تفعيل middleware استخراج الـ subdomain لجميع الطلبات
app.use(extractSubdomain);

// استخدام المسارات
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
app.use('/api/features', featureRoutes);
app.use('/api/platform-settings', platformSettingsRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api', publicRoutes);

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({
    message: 'مرحباً بك في Digital Menu SaaS API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      restaurants: '/api/restaurants',
      menu: '/api/menu',
      orders: '/api/orders',
      tables: '/api/tables',
      upload: '/api/upload',
      plans: '/api/plans',
      qr: '/api/qr',
      store: '/api/store'
    }
  });
});

// معالجة الأخطاء
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'حدث خطأ في الخادم' });
});

// دالة بدء الخادم
const startServer = async () => {
  try {
    // اختبار الاتصال بقاعدة البيانات
    await testConnection();
    console.log('✅ Database connection established.');

    // ✅ تعطيل sync تماماً في الإنتاج
    // في الإنتاج، يجب إدارة الجداول يدوياً عبر الـ Migrations
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Production mode: Auto-sync DISABLED.');
      console.log('✅ Database schema must be managed via migrations.');
      console.log('📋 To run migrations: npx sequelize-cli db:migrate');
    } else {
      // فقط في بيئة التطوير، وليس في الإنتاج
      // استخدم alter: false لمنع التعديلات الخطيرة
      await sequelize.sync({ alter: false });
      console.log('✅ Database tables synced (development mode).');
    }

    // إدراج البيانات الأساسية إذا لم تكن موجودة
    const Plan = (await import('./models/Plan')).default;
    const plansCount = await Plan.count();

    if (plansCount === 0) {
      console.log('📦 جاري إدراج الخطط الأساسية...');
      
      await Plan.bulkCreate([
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'free',
          price: 0,
          maxItems: 20,
          maxTables: 1,
          maxStaff: 0,
          maxProducts: 50,
          maxOrdersPerMonth: 100,
          maxStorage: 100,
          hasWhatsapp: false,
          hasOnlineOrders: false,
          hasCustomDomain: false,
          hasAnalytics: false,
          hasTableQr: true,
          hasMultiLanguage: false,
          hasPromotions: false,
          hasCoupons: false,
          hasInventory: false,
          hasReturns: false,
          hasReviews: false,
          hasWishlist: false,
          hasCompare: false,
          hasSeo: false,
          hasEmailMarketing: false,
          hasAbandonedCart: false,
          hasBulkImport: false,
          hasApiAccess: false,
          hasPrioritySupport: false,
          description: 'مناسب للمطاعم والمتاجر الصغيرة للبدء',
          isActive: true
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'basic',
          price: 49.99,
          maxItems: 100,
          maxTables: 5,
          maxStaff: 2,
          maxProducts: 500,
          maxOrdersPerMonth: 1000,
          maxStorage: 500,
          hasWhatsapp: true,
          hasOnlineOrders: true,
          hasCustomDomain: false,
          hasAnalytics: true,
          hasTableQr: true,
          hasMultiLanguage: true,
          hasPromotions: true,
          hasCoupons: true,
          hasInventory: true,
          hasReturns: true,
          hasReviews: true,
          hasWishlist: true,
          hasCompare: false,
          hasSeo: true,
          hasEmailMarketing: true,
          hasAbandonedCart: false,
          hasBulkImport: false,
          hasApiAccess: false,
          hasPrioritySupport: false,
          description: 'مناسب للمطاعم والمتاجر المتوسطة',
          isActive: true
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'pro',
          price: 99.99,
          maxItems: 500,
          maxTables: 20,
          maxStaff: 10,
          maxProducts: 5000,
          maxOrdersPerMonth: 10000,
          maxStorage: 2000,
          hasWhatsapp: true,
          hasOnlineOrders: true,
          hasCustomDomain: true,
          hasAnalytics: true,
          hasTableQr: true,
          hasMultiLanguage: true,
          hasPromotions: true,
          hasCoupons: true,
          hasInventory: true,
          hasReturns: true,
          hasReviews: true,
          hasWishlist: true,
          hasCompare: true,
          hasSeo: true,
          hasEmailMarketing: true,
          hasAbandonedCart: true,
          hasBulkImport: true,
          hasApiAccess: true,
          hasPrioritySupport: false,
          description: 'مناسب للمطاعم والمتاجر الكبيرة',
          isActive: true
        },
        {
          id: '44444444-4444-4444-4444-444444444444',
          name: 'enterprise',
          price: 199.99,
          maxItems: 999999,
          maxTables: 999999,
          maxStaff: 999999,
          maxProducts: 999999,
          maxOrdersPerMonth: 999999,
          maxStorage: 999999,
          hasWhatsapp: true,
          hasOnlineOrders: true,
          hasCustomDomain: true,
          hasAnalytics: true,
          hasTableQr: true,
          hasMultiLanguage: true,
          hasPromotions: true,
          hasCoupons: true,
          hasInventory: true,
          hasReturns: true,
          hasReviews: true,
          hasWishlist: true,
          hasCompare: true,
          hasSeo: true,
          hasEmailMarketing: true,
          hasAbandonedCart: true,
          hasBulkImport: true,
          hasApiAccess: true,
          hasPrioritySupport: true,
          description: 'غير محدود مع جميع الميزات والدعم الأولوية',
          isActive: true
        }
      ]);
      
      console.log('✅ تم إدراج الخطط بنجاح');
    }

    initializeSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📝 API: http://localhost:${PORT}`);
      console.log(`🔔 Socket.IO: ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // لا تخرج من العملية فوراً في الإنتاج، أعط فرصة لإعادة المحاولة
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

startServer();