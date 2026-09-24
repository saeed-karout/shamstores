// functions/[slug]/item/[itemId].js — وسوم صفحة وجبة المطعم (انظر _productSeo.js)
import { productSeoHandler } from '../../_productSeo.js';

export const onRequestGet = productSeoHandler('item');
