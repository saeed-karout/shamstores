-- backend/migrations/20260127000000-create-features-system.sql

-- ==================== 1. جدول الميزات ====================
CREATE TABLE IF NOT EXISTS features (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NULL,
  description TEXT NULL,
  description_en TEXT NULL,
  category ENUM('restaurant', 'store', 'both') DEFAULT 'both',
  group_col ENUM('basic', 'marketing', 'advanced', 'payment', 'delivery', 'analytics', 'integration') DEFAULT 'basic',
  is_core BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  price DECIMAL(10,2) DEFAULT 0,
  is_one_time BOOLEAN DEFAULT FALSE,
  default_in_plans JSON DEFAULT (JSON_ARRAY()),
  depends_on JSON DEFAULT (JSON_ARRAY()),
  config_schema JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==================== 2. جدول ربط الميزات مع العملاء ====================
CREATE TABLE IF NOT EXISTS business_features (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  business_id CHAR(36) NOT NULL,
  business_type ENUM('restaurant', 'store') NOT NULL,
  feature_code VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  is_overridden BOOLEAN DEFAULT FALSE,
  override_reason TEXT NULL,
  overridden_by CHAR(36) NULL,
  expires_at DATETIME NULL,
  config JSON NULL,
  assigned_by CHAR(36) NULL,
  assigned_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_business_feature (business_id, business_type, feature_code),
  INDEX idx_business_id (business_id, business_type),
  INDEX idx_feature_code (feature_code),
  FOREIGN KEY (overridden_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ==================== 3. جدول إعدادات المنصة الموسع ====================
CREATE TABLE IF NOT EXISTS extended_platform_settings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string',
  group_col ENUM('general', 'auth', 'business', 'subscription', 'payment', 'domain', 'storage', 'delivery', 'notification', 'security', 'analytics') DEFAULT 'general',
  description TEXT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  is_editable BOOLEAN DEFAULT TRUE,
  validation JSON NULL,
  created_by CHAR(36) NULL,
  updated_by CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==================== 4. إدخال الميزات الأساسية ====================
INSERT INTO features (code, name, name_en, category, group_col, is_core, is_active, price, is_one_time) VALUES
-- الميزات الأساسية (مجانية)
('menu_management', 'إدارة القائمة', 'Menu Management', 'restaurant', 'basic', TRUE, TRUE, 0, FALSE),
('product_management', 'إدارة المنتجات', 'Product Management', 'store', 'basic', TRUE, TRUE, 0, FALSE),
('order_management', 'إدارة الطلبات', 'Order Management', 'both', 'basic', TRUE, TRUE, 0, FALSE),
('basic_analytics', 'إحصائيات أساسية', 'Basic Analytics', 'both', 'basic', TRUE, TRUE, 0, FALSE),
('staff_management', 'إدارة الموظفين', 'Staff Management', 'both', 'basic', TRUE, TRUE, 0, FALSE),

-- ميزات المطاعم المتقدمة
('table_qr', 'رموز QR للطاولات', 'Table QR Codes', 'restaurant', 'advanced', FALSE, TRUE, 29.99, FALSE),
('online_ordering', 'طلبات أونلاين', 'Online Ordering', 'restaurant', 'advanced', FALSE, TRUE, 49.99, FALSE),
('kitchen_display', 'شاشة المطبخ', 'Kitchen Display System', 'restaurant', 'advanced', FALSE, TRUE, 39.99, FALSE),

-- ميزات المتاجر المتقدمة
('inventory_management', 'نظام المخزون', 'Inventory Management', 'store', 'advanced', FALSE, TRUE, 29.99, FALSE),
('returns_management', 'نظام المرتجعات', 'Returns Management', 'store', 'advanced', FALSE, TRUE, 19.99, FALSE),
('bulk_import', 'استيراد كميات كبيرة', 'Bulk Import', 'store', 'advanced', FALSE, TRUE, 49.99, TRUE),

-- ميزات مشتركة مدفوعة
('whatsapp_button', 'زر واتساب', 'WhatsApp Button', 'both', 'marketing', FALSE, TRUE, 9.99, FALSE),
('coupons', 'نظام الكوبونات', 'Coupons System', 'both', 'marketing', FALSE, TRUE, 19.99, FALSE),
('promotions', 'العروض والخصومات', 'Promotions & Discounts', 'both', 'marketing', FALSE, TRUE, 24.99, FALSE),
('custom_domain', 'دومين مخصص', 'Custom Domain', 'both', 'advanced', FALSE, TRUE, 99.99, TRUE),
('advanced_analytics', 'تحليلات متقدمة', 'Advanced Analytics', 'both', 'analytics', FALSE, TRUE, 49.99, FALSE),
('delivery_system', 'نظام التوصيل', 'Delivery System', 'both', 'delivery', FALSE, TRUE, 59.99, FALSE),
('multi_language', 'لغات متعددة', 'Multi Language', 'both', 'advanced', FALSE, TRUE, 39.99, FALSE),
('loyalty_system', 'نظام الولاء', 'Loyalty System', 'both', 'marketing', FALSE, TRUE, 59.99, FALSE),
('api_access', 'API مخصص', 'API Access', 'both', 'integration', FALSE, TRUE, 99.99, FALSE),
('priority_support', 'دعم فني優先', 'Priority Support', 'both', 'basic', FALSE, TRUE, 49.99, FALSE),

-- ميزات إضافية متقدمة
('seo_tools', 'أدوات تحسين محركات البحث', 'SEO Tools', 'store', 'marketing', FALSE, TRUE, 39.99, FALSE),
('email_marketing', 'التسويق بالبريد الإلكتروني', 'Email Marketing', 'store', 'marketing', FALSE, TRUE, 49.99, FALSE),
('abandoned_cart', 'استرداد السلة المتروكة', 'Abandoned Cart Recovery', 'store', 'marketing', FALSE, TRUE, 29.99, FALSE),
('reviews_system', 'نظام التقييمات', 'Reviews System', 'store', 'marketing', FALSE, TRUE, 19.99, FALSE),
('wishlist', 'قائمة الرغبات', 'Wishlist', 'store', 'basic', FALSE, TRUE, 14.99, FALSE),
('compare_products', 'مقارنة المنتجات', 'Compare Products', 'store', 'basic', FALSE, TRUE, 14.99, FALSE),
('ai_recommendations', 'توصيات الذكاء الاصطناعي', 'AI Recommendations', 'store', 'advanced', FALSE, TRUE, 99.99, FALSE);

-- ==================== 5. إدخال إعدادات المنصة الافتراضية ====================
INSERT INTO extended_platform_settings (key, value, type, group_col, description, is_public) VALUES
-- General Settings
('platform_name', 'ديجيتال مينو', 'string', 'general', 'اسم المنصة', TRUE),
('platform_logo', '', 'string', 'general', 'شعار المنصة', TRUE),
('default_language', 'ar', 'string', 'general', 'اللغة الافتراضية', TRUE),
('timezone', 'Asia/Riyadh', 'string', 'general', 'المنطقة الزمنية', FALSE),
('maintenance_mode', 'false', 'boolean', 'general', 'وضع الصيانة', FALSE),

-- Auth Settings
('allow_registration', 'true', 'boolean', 'auth', 'السماح بالتسجيل', FALSE),
('allow_google_login', 'false', 'boolean', 'auth', 'تسجيل الدخول عبر Google', FALSE),
('allow_facebook_login', 'false', 'boolean', 'auth', 'تسجيل الدخول عبر Facebook', FALSE),
('require_email_verification', 'true', 'boolean', 'auth', 'تفعيل البريد الإلكتروني', FALSE),

-- Business Settings
('max_products_default', '50', 'number', 'business', 'الحد الأقصى الافتراضي للمنتجات', FALSE),
('max_orders_per_day', '1000', 'number', 'business', 'الحد الأقصى للطلبات اليومية', FALSE),
('enable_tables_by_default', 'true', 'boolean', 'business', 'تفعيل الطاولات افتراضياً', FALSE),

-- Subscription Settings
('trial_days', '14', 'number', 'subscription', 'فترة التجربة (أيام)', FALSE),
('auto_expire', 'true', 'boolean', 'subscription', 'إنهاء الاشتراك تلقائياً', FALSE),
('expiry_reminder_days', '7', 'number', 'subscription', 'أيام التذكير قبل الانتهاء', FALSE),

-- Payment Settings
('whatsapp_payment_number', '', 'string', 'payment', 'رقم واتساب للدفع', FALSE),
('payment_message_template', 'مرحباً، أود ترقية حسابي إلى الخطة %s', 'string', 'payment', 'نص رسالة الدفع', FALSE),
('payment_methods', '["cash","card"]', 'array', 'payment', 'طرق الدفع المتاحة', FALSE),

-- Domain Settings
('root_domain', 'digitalmenu.com', 'string', 'domain', 'الدومين الرئيسي', FALSE),
('subdomain_enabled', 'true', 'boolean', 'domain', 'تفعيل الدومين الفرعي', FALSE),
('custom_domain_enabled', 'true', 'boolean', 'domain', 'تفعيل الدومين المخصص', FALSE),

-- Storage Settings
('max_image_size', '5', 'number', 'storage', 'الحد الأقصى لحجم الصورة (MB)', FALSE),
('allowed_image_formats', '["jpg","png","webp","svg"]', 'array', 'storage', 'الصيغ المسموحة', FALSE),

-- Delivery Settings
('global_delivery_enabled', 'true', 'boolean', 'delivery', 'تفعيل التوصيل العام', FALSE),
('default_delivery_fee', '10', 'number', 'delivery', 'سعر التوصيل الافتراضي', FALSE),
('max_delivery_radius', '20', 'number', 'delivery', 'أقصى نصف قطر للتوصيل (كم)', FALSE),

-- Notification Settings
('enable_whatsapp_notifications', 'true', 'boolean', 'notification', 'تفعيل إشعارات واتساب', FALSE),
('enable_email_notifications', 'true', 'boolean', 'notification', 'تفعيل إشعارات البريد', FALSE),
('whatsapp_template_order', 'طلب جديد رقم %s', 'string', 'notification', 'قالب واتساب للطلبات', FALSE),

-- Security Settings
('rate_limit_per_minute', '60', 'number', 'security', 'الحد الأقصى للطلبات في الدقيقة', FALSE),
('max_login_attempts', '5', 'number', 'security', 'الحد الأقصى لمحاولات الدخول', FALSE),
('session_timeout_minutes', '720', 'number', 'security', 'مهلة الجلسة (دقائق)', FALSE),

-- Analytics Settings
('tracking_enabled', 'true', 'boolean', 'analytics', 'تفعيل التتبع', FALSE),
('data_retention_days', '365', 'number', 'analytics', 'فترة الاحتفاظ بالبيانات (أيام)', FALSE);