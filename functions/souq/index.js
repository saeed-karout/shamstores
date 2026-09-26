// functions/souq/index.js — وسوم صفحة «سوق شام ستورز» العامّة (انظر _souqSeo.js).
// مسارٌ ثابت يسبق `[slug].js` في توجيه Pages، فلا يُعامَل «souq» معرّفَ متجر.
import { souqSeoHandler } from '../_souqSeo.js';

export const onRequestGet = souqSeoHandler(() => null);
