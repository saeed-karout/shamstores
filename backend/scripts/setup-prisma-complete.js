#!/usr/bin/env node

/**
 * Complete Prisma Migration Setup
 * This script sets up everything needed for the Prisma migration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendDir = __dirname.replace(/\/scripts$/, '');
const prismaDir = path.join(backendDir, 'prisma');
const srcDir = path.join(backendDir, 'src');

console.log('🚀 Starting complete Prisma migration setup...\n');

// Step 1: Create prisma directory
console.log('📁 Step 1: Creating prisma directory...');
if (!fs.existsSync(prismaDir)) {
  fs.mkdirSync(prismaDir, { recursive: true });
  console.log('✅ Prisma directory created');
} else {
  console.log('✅ Prisma directory already exists');
}

// Step 2: Copy schema.prisma
console.log('\n📝 Step 2: Setting up schema.prisma...');
const srcSchema = path.join(srcDir, 'prisma.schema');
const destSchema = path.join(prismaDir, 'schema.prisma');

if (fs.existsSync(srcSchema)) {
  const schemaContent = fs.readFileSync(srcSchema, 'utf-8');
  fs.writeFileSync(destSchema, schemaContent, 'utf-8');
  console.log('✅ schema.prisma copied to prisma/');
} else {
  console.log('⚠️  schema.prisma not found in src/');
}

// Step 3: Initialize prisma Client
console.log('\n🔧 Step 3: Generating Prisma Client...');
try {
  execSync('npm run prisma:generate', { cwd: backendDir, stdio: 'inherit' });
  console.log('✅ Prisma Client generated');
} catch (error) {
  console.error('❌ Error generating Prisma Client:', error.message);
}

// Step 4: Verify Prisma schema
console.log('\n✔️  Step 4: Validating Prisma schema...');
try {
  execSync('npm run prisma:validate', { cwd: backendDir, stdio: 'inherit' });
  console.log('✅ Schema validation passed');
} catch (error) {
  console.error('❌ Schema validation failed:', error.message);
}

// Step 5: Create migrations directory
console.log('\n📂 Step 5: Creating migrations directory...');
const migrationsDir = path.join(prismaDir, 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
  console.log('✅ Migrations directory created');
} else {
  console.log('✅ Migrations directory already exists');
}

// Step 6: Update .env if needed
console.log('\n⚙️  Step 6: Checking .env configuration...');
const envFile = path.join(backendDir, '.env');
if (!fs.existsSync(envFile)) {
  console.log('⚠️  .env file not found. Creating template...');
  const envContent = `# Database Configuration
DATABASE_URL="mysql://user:password@host:25060/database?sslaccept=strict"

# Node Environment
NODE_ENV=development

# Server
PORT=3000
`;
  fs.writeFileSync(envFile, envContent, 'utf-8');
  console.log('✅ .env template created - please configure with your database details');
} else {
  console.log('✅ .env file exists');
}

console.log('\n✅ Setup complete!\n');
console.log('📋 Next steps:');
console.log('1. Configure DATABASE_URL in .env');
console.log('2. Run: npm run prisma:migrate:dev --name init');
console.log('3. Run: npm run build');
console.log('4. Run: npm run dev\n');
