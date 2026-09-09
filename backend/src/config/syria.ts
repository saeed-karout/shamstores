// backend/src/config/syria.ts
//
// محافظات سوريا — **المرجع الوحيد** في المنصّة.
//
// **لماذا هنا لا في الواجهة أيضاً:** قائمةٌ منسوخة في مكانين تفترق عند أوّل
// تعديل، والخلاف يظهر عطلاً صامتاً: تاجرٌ يضبط أجرة لمحافظةٍ باسمٍ لا
// يرسله المتصفّح، فيدفع الزبون صفراً. الواجهة تقرأ القائمة من المنفذ.
//
// الرمز لاتينيّ لا عربيّ: يُخزَّن في قاعدة البيانات ويمرّ في الروابط، وحرفٌ
// عربيّ مختلف التطبيع (ة/ه، أ/ا) يكسر المطابقة بلا أثرٍ مرئيّ.

export interface Governorate {
  code: string;
  name: string;
  nameEn: string;
}

export const GOVERNORATES: Governorate[] = [
  { code: 'damascus', name: 'دمشق', nameEn: 'Damascus' },
  { code: 'rif-dimashq', name: 'ريف دمشق', nameEn: 'Rif Dimashq' },
  { code: 'aleppo', name: 'حلب', nameEn: 'Aleppo' },
  { code: 'homs', name: 'حمص', nameEn: 'Homs' },
  { code: 'hama', name: 'حماة', nameEn: 'Hama' },
  { code: 'latakia', name: 'اللاذقية', nameEn: 'Latakia' },
  { code: 'tartus', name: 'طرطوس', nameEn: 'Tartus' },
  { code: 'idlib', name: 'إدلب', nameEn: 'Idlib' },
  { code: 'deir-ez-zor', name: 'دير الزور', nameEn: 'Deir ez-Zor' },
  { code: 'raqqa', name: 'الرقة', nameEn: 'Raqqa' },
  { code: 'hasakah', name: 'الحسكة', nameEn: 'Al-Hasakah' },
  { code: 'daraa', name: 'درعا', nameEn: 'Daraa' },
  { code: 'suwayda', name: 'السويداء', nameEn: 'As-Suwayda' },
  { code: 'quneitra', name: 'القنيطرة', nameEn: 'Quneitra' }
];

const BY_CODE = new Map(GOVERNORATES.map((g) => [g.code, g]));

export const isGovernorate = (code: unknown): code is string =>
  typeof code === 'string' && BY_CODE.has(code);

export const governorateName = (code: string): string => BY_CODE.get(code)?.name || code;

/** طريقة التسليم المسموحة لمنطقة */
export type DeliveryMode = 'driver' | 'shipping';

export const isDeliveryMode = (value: unknown): value is DeliveryMode =>
  value === 'driver' || value === 'shipping';

export default GOVERNORATES;
