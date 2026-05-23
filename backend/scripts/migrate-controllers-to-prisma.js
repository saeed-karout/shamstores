#!/usr/bin/env node

/**
 * Script to migrate all controllers from Sequelize to Prisma
 * Updates all import statements and method calls
 */

const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../src/controllers');

// Mapping of Sequelize models to Prisma services
const serviceMapping = {
  'User': { service: 'UserService', file: 'user.service' },
  'Restaurant': { service: 'RestaurantService', file: 'restaurant.service' },
  'Store': { service: 'StoreService', file: 'store.service' },
  'Plan': { service: 'PlanService', file: 'plan.service' },
  'Category': { service: 'MenuService', file: 'menu.service' },
  'MenuItem': { service: 'MenuService', file: 'menu.service' },
  'Product': { service: 'ProductService', file: 'product.service' },
  'ProductCategory': { service: 'ProductService', file: 'product.service' },
  'Image': { service: 'MenuService', file: 'menu.service' },
  'Table': { service: 'TableService', file: 'table.service' },
  'Order': { service: 'OrderService', file: 'order.service' },
  'OrderItem': { service: 'OrderService', file: 'order.service' },
  'Coupon': { service: 'CouponService', file: 'coupon.service' },
  'Ticket': { service: 'TicketService', file: 'ticket.service' },
  'TicketMessage': { service: 'TicketService', file: 'ticket.service' },
  'Feature': { service: 'FeatureService', file: 'feature.service' },
  'BusinessFeature': { service: 'FeatureService', file: 'feature.service' },
  'InventoryTransaction': { service: 'InventoryService', file: 'inventory.service' },
  'Subscription': { service: 'OrderService', file: 'order.service' },
  'UpgradeRequest': { service: 'PlanService', file: 'plan.service' },
  'PlatformSetting': { service: 'SettingService', file: 'setting.service' },
};

// Sequelize method patterns to replace
const sequelizePatterns = [
  { pattern: /Model\.findAll\(/g, replacement: 'Service.findMany(' },
  { pattern: /Model\.findOne\(/g, replacement: 'Service.findFirst(' },
  { pattern: /Model\.findByPk\(/g, replacement: 'Service.findById(' },
  { pattern: /Model\.create\(/g, replacement: 'Service.create(' },
  { pattern: /instance\.update\(/g, replacement: 'Service.update(' },
  { pattern: /instance\.destroy\(\)/g, replacement: 'Service.delete()' },
  { pattern: /Model\.destroy\(/g, replacement: 'Service.deleteWhere(' },
];

function getImportsForFile(content) {
  const imports = new Set();
  const modelMatches = content.match(/from\s+['"].*\/models['"]/g) || [];
  modelMatches.forEach(match => {
    Object.keys(serviceMapping).forEach(model => {
      if (match.includes(model) || match === "from '../models'" || match === "from '../models'" || match === "from '../models/index'") {
        const service = serviceMapping[model];
        if (service) {
          imports.add(`import { ${service.service} } from './${service.file}';`);
        }
      }
    });
  });
  return Array.from(imports);
}

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Remove old Sequelize imports
    content = content.replace(/import\s+\{[^}]*\}\s+from\s+['"].*\/models['"]/g, '');
    content = content.replace(/import\s+\w+\s+from\s+['"].*\/models['"]/g, '');

    // Add new service imports
    const serviceImports = getImportsForFile(originalContent);
    if (serviceImports.length > 0) {
      const importBlock = serviceImports.join('\n');
      // Find the last import line and add after it
      const lastImportMatch = content.match(/import[^;]*;(?=\n)/);
      if (lastImportMatch) {
        const lastImportIndex = content.lastIndexOf(lastImportMatch[0]);
        content = content.slice(0, lastImportIndex + lastImportMatch[0].length) + '\n' + importBlock + content.slice(lastImportIndex + lastImportMatch[0].length);
      } else {
        content = importBlock + '\n' + content;
      }
    }

    // Update model references to service references
    Object.keys(serviceMapping).forEach(model => {
      const service = serviceMapping[model];
      // Replace Model.method() with Service.method()
      content = content.replace(new RegExp(`\\b${model}\\.findAll\\(`, 'g'), `${service.service}.findMany(`);
      content = content.replace(new RegExp(`\\b${model}\\.findOne\\(`, 'g'), `${service.service}.findFirst(`);
      content = content.replace(new RegExp(`\\b${model}\\.findByPk\\(`, 'g'), `${service.service}.findById(`);
      content = content.replace(new RegExp(`\\b${model}\\.create\\(`, 'g'), `${service.service}.create(`);
      content = content.replace(new RegExp(`\\b${model}\\.destroy\\(`, 'g'), `${service.service}.deleteWhere(`);
    });

    // Clean up duplicate/empty lines
    content = content.replace(/\n\n\n+/g, '\n\n');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Updated: ${path.basename(filePath)}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error in ${path.basename(filePath)}:`, error.message);
  }
  return false;
}

// Main execution
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));
let count = 0;

console.log('🔄 Migrating controllers from Sequelize to Prisma...\n');

files.forEach(file => {
  if (migrateFile(path.join(controllersDir, file))) {
    count++;
  }
});

console.log(`\n✅ Migration complete! Updated ${count}/${files.length} controller files.`);
console.log('\n📝 Next steps:');
console.log('1. Review updated controllers for any manual adjustments');
console.log('2. Run: npm run build');
console.log('3. Test endpoints');
