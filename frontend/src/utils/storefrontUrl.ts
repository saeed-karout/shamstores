// frontend/src/utils/storefrontUrl.ts
//
// الرابط العامّ لواجهة نشاط كما يراه زبونه وجوجل — لا كما يراه المطوّر محلياً.
//
// يطابق `canonicalOrigin` في backend/src/services/seo.service.ts: النطاق
// المخصّص الموثَّق أوّلاً، ثمّ النطاق الفرعي، ثمّ مسار المنصّة.

import { APP_DOMAIN } from './subdomain';

interface BusinessLink {
  slug?: string | null;
  subdomain?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean | null;
}

export const publicStorefrontUrl = (business?: BusinessLink | null): string => {
  if (!business) return `https://${APP_DOMAIN}`;
  if (business.customDomain && business.customDomainVerified) return `https://${business.customDomain}`;
  if (business.subdomain) return `https://${business.subdomain}.${APP_DOMAIN}`;
  if (business.slug) return `https://${APP_DOMAIN}/${business.slug}`;
  return `https://${APP_DOMAIN}`;
};

export default publicStorefrontUrl;
