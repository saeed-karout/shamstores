// backend/scripts/backfill-subdomains.js

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runBackfill() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'digital_menu',
      multipleStatements: true,
    });

    console.log('✅ Connected to database');

    const [storeResult] = await connection.query(
      `
        UPDATE stores
        SET subdomain = slug
        WHERE (subdomain IS NULL OR subdomain = '')
          AND slug IS NOT NULL
          AND slug <> '';
      `
    );

    const [restaurantResult] = await connection.query(
      `
        UPDATE restaurants
        SET subdomain = slug
        WHERE (subdomain IS NULL OR subdomain = '')
          AND slug IS NOT NULL
          AND slug <> '';
      `
    );

    console.log('✅ Backfill completed successfully');
    console.log(`   - Stores updated: ${storeResult.affectedRows || 0}`);
    console.log(`   - Restaurants updated: ${restaurantResult.affectedRows || 0}`);
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runBackfill().catch((error) => {
  console.error('❌ Unexpected backfill error:', error);
  process.exitCode = 1;
});
