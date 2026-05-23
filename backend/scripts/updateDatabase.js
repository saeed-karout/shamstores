// backend/src/scripts/updateDatabase.js

const sequelize = require('../config/database');
const User = require('../models/User');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');

async function updateDatabase() {
  try {
    console.log('🔄 بدء تحديث قاعدة البيانات...');
    
    // ✅ تحديث جدول users (إضافة الحقول الجديدة)
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS driver_rating DECIMAL(2,1) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS driver_rating_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(500) NULL
    `);
    console.log('✅ تم تحديث جدول users');

    // ✅ تحديث جدول orders (إضافة حقول إثبات التسليم)
    await sequelize.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS delivery_proof_image VARCHAR(500) NULL,
      ADD COLUMN IF NOT EXISTS delivery_proof_signature TEXT NULL,
      ADD COLUMN IF NOT EXISTS delivery_proof_type ENUM('photo', 'signature') NULL,
      ADD COLUMN IF NOT EXISTS proof_taken_at DATETIME NULL,
      ADD COLUMN IF NOT EXISTS driver_rating INT NULL,
      ADD COLUMN IF NOT EXISTS driver_rating_comment TEXT NULL,
      ADD COLUMN IF NOT EXISTS driver_rated_at DATETIME NULL
    `);
    console.log('✅ تم تحديث جدول orders');

    // ✅ تحديث جدول tickets (إذا كان موجوداً)
    await sequelize.query(`
      ALTER TABLE tickets 
      ADD COLUMN IF NOT EXISTS order_id VARCHAR(36) NULL,
      ADD COLUMN IF NOT EXISTS type ENUM('delivery', 'restaurant', 'store', 'general') DEFAULT 'general',
      ADD COLUMN IF NOT EXISTS response TEXT NULL,
      ADD COLUMN IF NOT EXISTS responded_by VARCHAR(36) NULL,
      ADD COLUMN IF NOT EXISTS responded_at DATETIME NULL
    `).catch(() => console.log('⚠️ جدول tickets غير موجود، سيتم إنشاؤه لاحقاً'));
    
    console.log('🎉 تم تحديث قاعدة البيانات بنجاح!');
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ في تحديث قاعدة البيانات:', error);
    process.exit(1);
  }
}

updateDatabase();