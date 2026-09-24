// functions/[slug]/product/[productId].js — وسوم صفحة منتج المتجر (انظر _productSeo.js)
import { productSeoHandler } from '../../_productSeo.js';

export const onRequestGet = productSeoHandler('product');
