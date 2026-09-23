// frontend/src/utils/notificationLink.ts
//
// أين يأخذ الإشعارُ مستقبِلَه — للنافذة المنبثقة وللجرس معاً.
//
// الخادم يكتب روابط المطعم (`/plans`، `/orders`) لأيّ نشاط، ومالك المتجر
// يُنقل بها إلى شاشة المطعم. هنا تُترجم إلى نظيرها في `/store/*` حين يكون
// المستقبِل متجراً، ويُعطى الإشعار بلا رابط وجهةً بحسب نوعه ودور مستقبِله.

// مسارات المطعم التي لها نظيرٌ في المتجر
const STORE_EQUIVALENT = new Set([
  '/orders',
  '/plans',
  '/coupons',
  '/staff',
  '/analytics',
  '/settings',
  '/delivery',
  '/drivers',
  '/qr-codes',
  '/marketing',
]);

interface StoredUser {
  role?: string;
  storeId?: string | null;
}

const readUser = (): StoredUser => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') || {};
  } catch {
    return {};
  }
};

const defaultFor = (type: string | undefined, user: StoredUser): string | null => {
  switch (type) {
    case 'order':
      return user.role === 'super_admin' ? '/admin/orders' : '/orders';
    case 'upgrade_request':
      return user.role === 'super_admin' ? '/admin/plans' : '/plans';
    default:
      return null;
  }
};

export const resolveNotificationLink = (link: string | null | undefined, type?: string): string | null => {
  const user = readUser();
  const target = link || defaultFor(type, user);
  if (!target) return null;
  if (user.storeId && STORE_EQUIVALENT.has(target)) return `/store${target}`;
  return target;
};
