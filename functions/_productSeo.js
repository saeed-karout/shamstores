// functions/_productSeo.js
//
// حقن وسوم صفحة منتجٍ أو وجبة على حافّة Cloudflare — المنطق المشترك بين
// `/:slug/product/:id` و`/:slug/item/:id`.
//
// **لماذا صفحة المنتج بعينها:** الرابط الذي يشاركه التاجر في واتساب
// وإنستغرام هو رابط المنتج لا المتجر. وبلا حقنٍ كانت معاينته عنوان المنصّة
// العامّ وصورتها — لا اسم القطعة ولا صورتها ولا سعرها. والزاحف كذلك: يرى
// كل صفحات المنتجات نسخةً واحدة من الصفحة الرئيسية.
//
// والفشل مفتوحٌ كما في `[slug].js`: أي خطأ يُعيد الصفحة كما هي.

import { fetchSeo, injectSeo, tag } from './_seo.js';

export const productSeoHandler = (kind) =>
  async function onRequestGet(context) {
    const { request, params, next, waitUntil, env } = context;
    try {
      const slug = String(params.slug || '').trim();
      const id = String(params.productId || params.itemId || '').trim();
      if (!slug || !id || slug.includes('.')) return tag(await next(), 'reserved');

      const response = await next();
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) return response;

      const data = await fetchSeo(slug, waitUntil, env, id);
      if (!data) return tag(response, 'nodata');
      // منتجٌ غير موجود أو موقوف: تبقى وسوم المتجر — أفضل من وسوم المنصّة
      const url = new URL(request.url);
      return injectSeo(tag(response, data.product ? `hit-${kind}` : 'hit-store'), data, `${url.origin}${url.pathname}`, url.origin);
    } catch (error) {
      console.error('Product SEO rewrite failed:', error);
      return tag(await next(), `error:${String(error).slice(0, 60)}`);
    }
  };
