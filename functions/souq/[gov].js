// functions/souq/[gov].js — وسوم صفحة محافظةٍ في السوق، مثل /souq/aleppo (انظر _souqSeo.js).
import { souqSeoHandler } from '../_souqSeo.js';

// الرمز لاتينيّ قصير (config/syria.ts) — غيره لا يُمرَّر إلى الخادم
export const onRequestGet = souqSeoHandler(({ params }) => {
  const gov = String(params.gov || '').toLowerCase();
  return /^[a-z-]{2,20}$/.test(gov) ? gov : null;
});
