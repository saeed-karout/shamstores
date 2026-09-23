// frontend/src/utils/staffAccess.ts
//
// صلاحيات موظّف النشاط — نظيرُ `backend/src/config/staffPermissions.ts`.
//
// كان في الواجهة ثلاثة أسماء لشيءٍ واحد: شاشتا الموظّفين تحفظان `viewOrders`،
// والشريط الجانبيّ ولوحة الموظّف يقرآن `canViewOrders` (من صلاحيات **الخطة**
// لا الموظّف)، وحارس المسارات يقرأ `viewOrders`. فالمربّعات لا أثر لها.
// هذا الملفّ هو الطريق الوحيد للسؤال: «هل يصل هذا الموظّف إلى هنا؟».

export type StaffPermissionKey =
  | 'viewOrders'
  | 'updateOrderStatus'
  | 'viewMenu'
  | 'updateMenu'
  | 'viewTables'
  | 'updateTables'
  | 'viewProducts'
  | 'updateProducts'
  | 'viewInventory'
  | 'updateInventory';

// الافتراضيّ قراءةٌ بلا تعديل — كالخادم تماماً، وإلا رأى الموظّف شاشةً
// يرفضها الخادم أو العكس.
export const DEFAULT_STAFF_PERMISSIONS: Record<StaffPermissionKey, boolean> = {
  viewOrders: true,
  updateOrderStatus: false,
  viewMenu: true,
  updateMenu: false,
  viewTables: true,
  updateTables: false,
  viewProducts: true,
  updateProducts: false,
  viewInventory: true,
  updateInventory: false,
};

const LEGACY_ALIASES: Partial<Record<StaffPermissionKey, string>> = {
  viewOrders: 'canViewOrders',
  updateOrderStatus: 'canUpdateOrderStatus',
  viewMenu: 'canViewMenu',
  updateMenu: 'canUpdateMenu',
  viewTables: 'canViewTables',
  updateTables: 'canManageTables',
};

export const resolveStaffPermissions = (raw: unknown): Record<StaffPermissionKey, boolean> => {
  const saved = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_STAFF_PERMISSIONS };
  (Object.keys(out) as StaffPermissionKey[]).forEach((key) => {
    const legacy = LEGACY_ALIASES[key];
    if (legacy && typeof saved[legacy] === 'boolean') out[key] = saved[legacy] as boolean;
    if (typeof saved[key] === 'boolean') out[key] = saved[key] as boolean;
  });
  return out;
};

interface StaffLike {
  role?: string;
  restaurantId?: string | null;
  storeId?: string | null;
  permissions?: unknown;
}

export interface StaffArea {
  path: string;
  label: string;
  description: string;
  permission: StaffPermissionKey;
}

// شاشات الموظّف بحسب نوع نشاطه. المسارات هي مسارات المالك نفسها — الشاشة
// واحدة والخادم يحكم ما يُسمح فيها.
const RESTAURANT_AREAS: StaffArea[] = [
  { path: '/menu', label: 'القائمة', description: 'عرض الأصناف وإتاحتها', permission: 'viewMenu' },
  { path: '/orders', label: 'الطلبات', description: 'عرض وتحديث حالة الطلبات', permission: 'viewOrders' },
  { path: '/tables', label: 'الطاولات', description: 'عرض الطاولات ورموزها', permission: 'viewTables' },
  { path: '/delivery', label: 'التوصيل', description: 'متابعة طلبات التوصيل', permission: 'viewOrders' },
];

const STORE_AREAS: StaffArea[] = [
  { path: '/store/products', label: 'المنتجات', description: 'عرض المنتجات وتعديلها', permission: 'viewProducts' },
  { path: '/store/orders', label: 'الطلبات', description: 'عرض وتحديث حالة الطلبات', permission: 'viewOrders' },
  { path: '/store/inventory', label: 'المخزون', description: 'متابعة الكمّيات', permission: 'viewInventory' },
];

// موظّف المنصّة (بلا نشاط): صفحات الأدمن التي يفتحها له الخادم فعلاً —
// قراءةٌ فقط، وكلّ تعديلٍ هناك للسوبر أدمن وحده. أيُّ رابطٍ خارج هذه كان
// يفتح صفحةً تمتلئ بأخطاء ٤٠٣ (الإحصاءات والخطط والإعلانات والإعدادات).
const PLATFORM_AREAS: Array<StaffArea & { any: string[] }> = [
  { path: '/admin/restaurants', label: 'المطاعم', description: '', permission: 'viewOrders', any: ['canManageRestaurants'] },
  { path: '/admin/stores', label: 'المتاجر', description: '', permission: 'viewOrders', any: ['canManageStores'] },
  { path: '/admin/users', label: 'المستخدمين', description: '', permission: 'viewOrders', any: ['canManageUsers'] },
  { path: '/admin/drivers', label: 'السائقين', description: '', permission: 'viewOrders', any: ['canManageDrivers'] },
  { path: '/admin/orders', label: 'الطلبات', description: '', permission: 'viewOrders', any: ['canManageRestaurants', 'canManageStores'] },
];

export const isPlatformStaff = (user: StaffLike | null | undefined): boolean =>
  !!user && user.role === 'staff' && !user.restaurantId && !user.storeId;

/** الشاشات التي يصلها الموظّف فعلاً — للشريط الجانبيّ ولوحته وحارس المسارات. */
export const staffAreas = (user: StaffLike | null | undefined): StaffArea[] => {
  if (!user || user.role !== 'staff') return [];
  if (isPlatformStaff(user)) {
    const sp = (user.permissions && typeof user.permissions === 'object' ? user.permissions : {}) as Record<string, unknown>;
    return PLATFORM_AREAS.filter((a) => a.any.some((k) => sp[k] === true));
  }
  const perms = resolveStaffPermissions(user.permissions);
  const areas = user.storeId ? STORE_AREAS : RESTAURANT_AREAS;
  return areas.filter((a) => perms[a.permission]);
};

/** بيتُ الموظّف: لوحته إن كان لنشاط، وأوّلُ شاشةٍ مسموحة إن كان للمنصّة. */
export const staffHome = (user: StaffLike | null | undefined): string => {
  if (!isPlatformStaff(user)) return '/dashboard';
  return staffAreas(user)[0]?.path || '/profile';
};

/** هل يصل الموظّف إلى هذا المسار؟ ما ليس من شاشاته ممنوعٌ عنه. */
export const staffCanVisit = (user: StaffLike | null | undefined, pathname: string): boolean => {
  if (pathname === '/profile') return true;
  if (pathname === '/dashboard') return !isPlatformStaff(user);
  return staffAreas(user).some((a) => pathname === a.path || pathname.startsWith(`${a.path}/`));
};
