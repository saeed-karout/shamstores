import dotenv from 'dotenv';
dotenv.config();

import { d1Query } from '../services/d1Service';

async function main() {
  try {
    const res = await d1Query('SELECT 1');
    console.log('D1 response:', res);
  } catch (err) {
    console.error('D1 test failed:', err);
    process.exit(1);
  }
}

main();
