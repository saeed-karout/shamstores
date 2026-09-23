// backend/src/config/staffPermissions.ts
//
// صلاحيات موظّف النشاط (مطعم أو متجر) — مصدرٌ واحد للخادم.
//
// **المفاتيح هي ما تحفظه شاشتا الموظّفين فعلاً** (`viewOrders`،
// `updateOrderStatus`…). كانت الواجهة تقرأ `canViewOrders` في مواضع وتحفظ
// `viewOrders` في أخرى، فلا يطابق أيٌّ منهما الآخر، والخادم لا يقرأ شيئاً
// أصلاً: كلّ موظّفٍ يقرأ كلّ شيء. الأسماء القديمة `canView*` مقبولةٌ هنا
// بديلاً حتى لا يفقد حسابٌ محفوظٌ بها ما كان يملكه.
//
// **الافتراضيّ قراءةٌ بلا تعديل.** الموظّفون الموجودون حُفظت صلاحيّاتهم `{}`
// لأن نموذج الإضافة لم يُرسلها قطّ، وكانوا يقرؤون القائمة والطلبات لأن الخادم
// لم يسأل. فرضُ «لا شيء» عليهم الآن يُطفئ شاشاتهم بلا سبب يراه التاجر؛ أمّا
// ما عطّله التاجر صراحةً (`false`) فيبقى معطّلاً.

export const STAFF_PERMISSION_KEYS = [
  'viewOrders',
  'updateOrderStatus',
  'viewMenu',
  'updateMenu',
  'viewTables',
  'updateTables',
  'viewProducts',
  'updateProducts',
  'viewInventory',
  'updateInventory'
] as const;

export type StaffPermissionKey = (typeof STAFF_PERMISSION_KEYS)[number];

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
  updateInventory: false
};

const LEGACY_ALIASES: Partial<Record<StaffPermissionKey, string>> = {
  viewOrders: 'canViewOrders',
  updateOrderStatus: 'canUpdateOrderStatus',
  viewMenu: 'canViewMenu',
  updateMenu: 'canUpdateMenu',
  viewTables: 'canViewTables',
  updateTables: 'canManageTables'
};

/** الصلاحيات الفعليّة: الافتراضيّ، ثم الاسم القديم إن وُجد، ثم المحفوظ. */
export const resolveStaffPermissions = (
  raw: unknown
): Record<StaffPermissionKey, boolean> => {
  const saved = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_STAFF_PERMISSIONS };
  for (const key of STAFF_PERMISSION_KEYS) {
    const legacy = LEGACY_ALIASES[key];
    if (legacy && typeof saved[legacy] === 'boolean') out[key] = saved[legacy] as boolean;
    if (typeof saved[key] === 'boolean') out[key] = saved[key] as boolean;
  }
  return out;
};

/** ما يُحفظ: المفاتيح المعروفة بقيمٍ منطقيّة فقط — لا يُخزَّن ما يرسله العميل كما هو. */
export const sanitizeStaffPermissions = (
  raw: unknown
): Record<StaffPermissionKey, boolean> => resolveStaffPermissions(raw);
