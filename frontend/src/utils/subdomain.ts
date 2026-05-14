// frontend/src/utils/subdomain.ts

/**
 * استخراج الـ subdomain من الـ host الحالي
 * Examples:
 * - molstore.localhost:3000 -> molstore
 * - molstore.example.com -> molstore
 * - localhost:3000 -> null
 * - example.com -> null
 */
export const getCurrentSubdomain = (): string | null => {
  const host = window.location.host;
  const parts = host.split('.');
  
  console.log('🌐 getCurrentSubdomain - Host:', host);
  console.log('🌐 getCurrentSubdomain - Parts:', parts);
  
  // للتطوير المحلي (localhost)
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    // localhost:3000 -> null
    // molstore.localhost:3000 -> molstore
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
      console.log('🌐 Found subdomain (localhost):', parts[0]);
      return parts[0];
    }
    console.log('🌐 No subdomain found (localhost)');
    return null;
  }
  
  // للإنتاج (example.com)
  if (parts.length >= 3) {
    console.log('🌐 Found subdomain (production):', parts[0]);
    return parts[0];
  }
  
  console.log('🌐 No subdomain found');
  return null;
};

/**
 * التحقق مما إذا كنا في الدومين الرئيسي أو www
 */
export const isMainDomain = (): boolean => {
  const subdomain = getCurrentSubdomain();
  const host = window.location.host;
  
  // www هو subdomain افتراضي للدومين الرئيسي
  if (subdomain === 'www') return true;
  
  // إذا لم يكن هناك subdomain على الإطلاق
  if (subdomain === null) return true;
  
  // إذا كان هناك subdomain، فهذا ليس الدومين الرئيسي
  return false;
};

/**
 * الحصول على base URL بدون الـ subdomain
 * Examples:
 * - molstore.example.com -> http://example.com
 * - molstore.localhost:3000 -> http://localhost:3000
 * - example.com -> http://example.com
 */
export const getBaseUrl = (): string => {
  const host = window.location.host;
  const protocol = window.location.protocol;
  const parts = host.split('.');
  
  // إذا كان في الإنتاج (3 أجزاء أو أكثر) وليس www
  if (parts.length >= 3 && parts[0] !== 'www') {
    const baseHost = parts.slice(1).join('.');
    return `${protocol}//${baseHost}`;
  }
  
  return `${protocol}//${host}`;
};

/**
 * التحقق من صيغة الـ subdomain
 */
export const isValidSubdomain = (subdomain: string): boolean => {
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
  return subdomainRegex.test(subdomain) && subdomain.length >= 3 && subdomain.length <= 63;
};