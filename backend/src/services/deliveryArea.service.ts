// backend/src/services/deliveryArea.service.ts
//
// الأحياء داخل المحافظة، والعنوان السوريّ المنظَّم عند الطلب.
//
// **امتدادٌ لـ shipping.service لا نظامٌ موازٍ:** المحافظة تبقى الوحدة الأولى
// (مَن يُسلّم، المدّة بالأيام، حدّ المجانيّ)، والحيّ يدقّق الأجرة داخلها.
// محافظةٌ بلا أحياء مفعّلة تُسعَّر بأجرتها كما كانت، فلا يتغيّر شيء على متجرٍ
// لم يفتح شاشة الأحياء قطّ.
//
// **والعنوان في سوريا نقطةٌ دالّة لا رقمُ شارع:** «جانب فرن الأمير، البناء
// الثاني» أوضح للمندوب من أيّ اسم شارع. لذلك هي الحقل الإلزاميّ، والدبّوس على
// الخريطة اختياريّ — كثيرٌ من الزبائن لا يعرف موقعه على خريطة.

import prisma from './prisma';
import shipping, { BusinessType, QuoteResult } from './shipping.service';
import { isGovernorate, governorateName } from '../config/syria';

export interface AreaRow {
  id: string;
  governorate: string;
  name: string;
  fee: number;
  freeOverAmount: number | null;
  etaText: string | null;
  isActive: boolean;
  sortOrder: number;
}

const toRow = (a: any): AreaRow => ({
  id: a.id,
  governorate: a.governorate,
  name: a.name,
  fee: Number(a.fee) || 0,
  freeOverAmount: a.freeOverAmount ?? null,
  etaText: a.etaText ?? null,
  isActive: Boolean(a.isActive),
  sortOrder: a.sortOrder ?? 0
});

const ORDER_BY = [{ sortOrder: 'asc' as const }, { name: 'asc' as const }];

export const listAreas = async (
  businessId: string,
  businessType: BusinessType,
  governorate?: string
): Promise<AreaRow[]> => {
  const rows = await prisma.deliveryArea.findMany({
    where: { businessId, businessType, ...(governorate ? { governorate } : {}) },
    orderBy: ORDER_BY
  });
  return rows.map(toRow);
};

/** الأحياء المفعّلة مجمّعةً بالمحافظة — ما يُرسَل للزبون مع المحافظات */
export const activeAreasByGovernorate = async (
  businessId: string,
  businessType: BusinessType
): Promise<Map<string, AreaRow[]>> => {
  const rows = await prisma.deliveryArea.findMany({
    where: { businessId, businessType, isActive: true },
    orderBy: ORDER_BY
  });
  const out = new Map<string, AreaRow[]>();
  for (const r of rows) {
    const list = out.get(r.governorate) || [];
    list.push(toRow(r));
    out.set(r.governorate, list);
  }
  return out;
};

const clean = (value: unknown, max: number): string =>
  String(value ?? '')
    .replace(/[\u0000-\u001f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const money = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(10_000_000, n);
};

/**
 * يستبدل أحياء محافظةٍ واحدة بالقائمة المرسَلة.
 *
 * **استبدالٌ لا دمج:** الشاشة تعرض القائمة كاملة ويعدّلها التاجر ثمّ يحفظ،
 * فما غاب عنها حذفه هو. والمعرّف المرسَل يُحدَّث صفّه كي لا تتغيّر معرّفات
 * الأحياء المحفوظة في طلبات سابقة (`deliveryDetails.areaId`).
 */
export const saveAreas = async (
  businessId: string,
  businessType: BusinessType,
  governorate: string,
  incoming: unknown
): Promise<AreaRow[]> => {
  if (!isGovernorate(governorate)) throw new Error('INVALID_GOVERNORATE');
  const list = Array.isArray(incoming) ? incoming.slice(0, 200) : [];

  const existing = await prisma.deliveryArea.findMany({
    where: { businessId, businessType, governorate },
    select: { id: true }
  });
  const existingIds = new Set(existing.map((a) => a.id));
  const keep = new Set<string>();
  const seenNames = new Set<string>();

  let order = 0;
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const a = raw as Record<string, unknown>;
    const name = clean(a.name, 80);
    // الاسم المكرّر يُسقَط: حيّان باسمٍ واحد يُربكان الزبون ولا يعرف أيّهما يختار
    if (!name || seenNames.has(name)) continue;
    seenNames.add(name);

    const data = {
      name,
      fee: money(a.fee) ?? 0,
      // الصفر هنا كالمحافظة: «لا حدّ» لا «كل شيء مجانيّ»
      freeOverAmount: (() => {
        const n = money(a.freeOverAmount);
        return n && n > 0 ? n : null;
      })(),
      etaText: clean(a.etaText, 60) || null,
      isActive: a.isActive !== false,
      sortOrder: order++
    };

    const id = typeof a.id === 'string' && existingIds.has(a.id) ? a.id : null;
    if (id) {
      await prisma.deliveryArea.update({ where: { id }, data });
      keep.add(id);
    } else {
      const created = await prisma.deliveryArea.create({
        data: { ...data, businessId, businessType, governorate }
      });
      keep.add(created.id);
    }
  }

  const removed = [...existingIds].filter((id) => !keep.has(id));
  if (removed.length) await prisma.deliveryArea.deleteMany({ where: { id: { in: removed } } });

  return listAreas(businessId, businessType, governorate);
};

// ==================== أحياءٌ شائعة ====================
//
// **قائمةٌ قصيرة ومتحفّظة عمداً** — أحياءٌ معروفة لا خلاف على أسمائها، لتوفير
// الكتابة على التاجر لا لتكون مرجعاً. لا أجور فيها: الأجرة قرار التاجر، وأيّ
// رقمٍ نقترحه سيُترك كما هو ويخسر به أحدهما. ومحافظةٌ ليست هنا يضيف التاجر
// أحياءها بنفسه.
export const AREA_PRESETS: Record<string, string[]> = {
  damascus: [
    'المزة', 'كفرسوسة', 'المالكي', 'أبو رمانة', 'الشعلان', 'المزرعة', 'الصالحية',
    'ركن الدين', 'المهاجرين', 'باب توما', 'القصاع', 'الميدان', 'الشاغور',
    'البرامكة', 'برزة', 'دمر', 'مشروع دمر', 'العدوي'
  ],
  'rif-dimashq': [
    'جرمانا', 'صحنايا', 'أشرفية صحنايا', 'قدسيا', 'ضاحية قدسيا', 'التل', 'دوما',
    'حرستا', 'الكسوة', 'يعفور'
  ],
  aleppo: [
    'الفرقان', 'الجميلية', 'العزيزية', 'السليمانية', 'الشهباء', 'حلب الجديدة',
    'الموكامبو', 'المحافظة', 'السبيل', 'الحمدانية', 'سيف الدولة', 'الإسماعيلية'
  ],
  homs: ['الإنشاءات', 'الوعر', 'الحمراء', 'الغوطة', 'عكرمة', 'الزهراء', 'الخالدية', 'كرم الشامي'],
  latakia: ['الشيخ ضاهر', 'الزراعة', 'الأميركان', 'الرمل الجنوبي', 'الرمل الشمالي', 'الصليبة']
};

// ==================== التسعير ====================

export interface AddressQuote extends QuoteResult {
  area?: AreaRow | null;
  etaText?: string | null;
}

/**
 * أجرة العنوان: المحافظة أوّلاً ثمّ الحيّ إن وُجد.
 *
 * **المحافظة تبقى الحارس:** غير مفعّلة = رفضٌ حتى لو كان للحيّ صفّ. والحيّ
 * يغيّر الأجرة وحدّ المجانيّ فقط — مَن يُسلّم والمدّة من المحافظة.
 *
 * وحين تملك المحافظة أحياءً ولا يُرسَل حيّ تُستعمل أجرة المحافظة لا الرفض:
 * واجهةٌ قديمة محفوظة في متصفّح الزبون لا تعرف الأحياء بعد، وردُّ طلبه لأنه
 * لم يختر ما لم يُعرض عليه أسوأ من أجرةٍ أساسٍ ضبطها التاجر نفسه.
 */
export const quoteAddress = async (
  businessId: string,
  businessType: BusinessType,
  governorate: string,
  areaId: string | null | undefined,
  itemsSubtotal: number
): Promise<AddressQuote> => {
  const base = await shipping.quote(businessId, businessType, governorate, itemsSubtotal);
  if (!base.ok || !areaId) return { ...base, area: null };

  const area = await prisma.deliveryArea.findFirst({
    where: { id: String(areaId), businessId, businessType, governorate }
  });
  if (!area || !area.isActive) {
    return { ...base, ok: false, error: 'المتجر لا يوصّل إلى هذه المنطقة', area: null };
  }

  let threshold: number | null = area.freeOverAmount ?? null;
  if (threshold === null) {
    const zone = await prisma.shippingZone.findUnique({
      where: { businessId_businessType_governorate: { businessId, businessType, governorate } },
      select: { freeOverAmount: true }
    });
    threshold = zone?.freeOverAmount ?? null;
  }
  const freeApplied = threshold !== null && itemsSubtotal >= Number(threshold);

  return {
    ...base,
    fee: freeApplied ? 0 : Number(area.fee) || 0,
    freeApplied,
    area: toRow(area),
    etaText: area.etaText ?? null
  };
};

// ==================== العنوان المنظَّم ====================

export interface DeliveryDetails {
  governorate: string | null;
  governorateName: string | null;
  areaId: string | null;
  areaName: string | null;
  landmark: string | null;
  building: string | null;
  floor: string | null;
  lat: number | null;
  lng: number | null;
  /** الأجرة المحسوبة لحظة الطلب — لقطةٌ لا تتغيّر إن عدّل التاجر أجوره لاحقاً */
  fee: number | null;
  etaText: string | null;
}

const coord = (value: unknown, limit: number): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit && n !== 0 ? Math.round(n * 1e6) / 1e6 : null;
};

/** هل أرسلت الواجهة العنوان المنظَّم — الواجهات القديمة ترسل نصّاً فقط */
export const hasStructuredAddress = (body: any): boolean =>
  Boolean(body && (body.deliveryAreaId || body.deliveryLandmark || body.deliveryBuilding));

/**
 * يبني العنوان المنظَّم والنصّ المركّب منه.
 *
 * **النصّ يُركَّب هنا لا في الواجهة:** تطبيق السائق والتنبيهات والطلبات
 * القديمة تقرأ `deliveryAddress` وحده، فيجب أن يحمل الحيّ والنقطة الدالّة
 * وإلا وصل المندوب إلى المحافظة ولم يعرف أين يقف.
 */
export const buildDeliveryDetails = (
  body: any,
  governorate: string | null,
  quoteResult: AddressQuote | null
): { details: DeliveryDetails; addressText: string | null } => {
  const landmark = clean(body?.deliveryLandmark, 200) || null;
  const building = clean(body?.deliveryBuilding, 60) || null;
  const floor = clean(body?.deliveryFloor, 20) || null;
  const freeText = clean(body?.deliveryAddress ?? body?.customerAddress, 300) || null;
  const gov = governorate && isGovernorate(governorate) ? governorate : null;
  const area = quoteResult?.area ?? null;

  const details: DeliveryDetails = {
    governorate: gov,
    governorateName: gov ? governorateName(gov) : null,
    areaId: area?.id ?? null,
    areaName: area?.name ?? null,
    landmark,
    building,
    floor,
    lat: coord(body?.deliveryLat, 90),
    lng: coord(body?.deliveryLng, 180),
    fee: quoteResult?.ok ? quoteResult.fee : null,
    etaText: quoteResult?.etaText ?? null
  };

  const parts = [
    [details.governorateName, details.areaName].filter(Boolean).join(' - '),
    landmark ? `أقرب نقطة: ${landmark}` : null,
    [building ? `بناء ${building}` : null, floor ? `طابق ${floor}` : null].filter(Boolean).join('، '),
    // النصّ الحرّ (أو عنوان الخريطة) يأتي آخراً: أطول وأقلّ نفعاً للمندوب
    freeText
  ].filter((p) => p && String(p).trim());

  return { details, addressText: parts.length ? parts.join(' · ').slice(0, 600) : null };
};

/** رابط خريطة للمندوب والتاجر — OpenStreetMap كما في بقيّة المنصّة */
export const mapLink = (lat?: number | null, lng?: number | null): string | null =>
  lat && lng ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}` : null;

export default {
  listAreas,
  activeAreasByGovernorate,
  saveAreas,
  quoteAddress,
  buildDeliveryDetails,
  hasStructuredAddress,
  AREA_PRESETS,
  mapLink
};
