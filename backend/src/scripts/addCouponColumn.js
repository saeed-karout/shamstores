const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

const addColumn = async () => {
  try {
    console.log('🔍 Checking if column exists...');
    
    // التحقق من وجود العمود
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM coupons LIKE 'is_restaurant_only'
    `);

    if (columns.length === 0) {
      console.log('📦 Adding is_restaurant_only column to coupons table...');
      
      await sequelize.query(`
        ALTER TABLE coupons 
        ADD COLUMN is_restaurant_only BOOLEAN DEFAULT false AFTER is_active
      `);
      
      console.log('✅ Column added successfully');
    } else {
      console.log('✅ Column already exists');
    }

    // عرض هيكل الجدول للتأكد
    const [structure] = await sequelize.query(`
      DESCRIBE coupons
    `);
    
    console.log('📊 Table structure:');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (Default: ${col.Default})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding column:', error);
    process.exit(1);
  }
};

addColumn();