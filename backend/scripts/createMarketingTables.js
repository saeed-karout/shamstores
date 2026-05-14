// backend/src/scripts/createMarketingTables.js

const sequelize = require('../config/database');
const MarketingSettings = require('../models/MarketingSettings');
const MarketingSection = require('../models/MarketingSection');

async function createTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // إنشاء جدول إعدادات التسويق
    await MarketingSettings.sync({ force: true });
    console.log('✅ Table "marketing_settings" created');
    
    // إنشاء جدول أقسام التسويق
    await MarketingSection.sync({ force: true });
    console.log('✅ Table "marketing_sections" created');
    
    console.log('🎉 All marketing tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createTables();