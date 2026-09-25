// backend/src/services/tracking.service.ts
//
// أدوات التتبّع الإعلانية لكل نشاط — Meta Pixel وTikTok Pixel وGoogle Analytics 4.
//
// **لماذا للتاجر لا للمنصّة:** من يدفع لإعلانٍ على إنستغرام يريد أن يعرف كم
// زائراً أضاف إلى السلّة وكم اشترى، وأن تتعلّم خوارزمية الإعلان من مشتريه
// هو. بكسل المنصّة لا يخدم أيّاً من ذلك — بياناته تذهب إلى حسابٍ ليس له.
//
// **ولماذا المعرّف وحده لا الشيفرة:** لصقُ `<script>` من التاجر في واجهته
// بابٌ لكل شيفرةٍ خبيثة على زبائنه. المعرّف يُفحص بصيغته، والشيفرة الرسمية
// تحقنها الواجهة بنفسها.
//
// **ومستحقّة بـ`analytics`:** الخطة «النموّ» فما فوق، أو الإضافة منفردة.

import { businessHasEntitlement, BusinessType } from './entitlement.service';

export interface TrackingSettings {
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  ga4Id?: string | null;
}

export const TRACKING_FEATURE = 'analytics';

const PATTERNS: Record<keyof TrackingSettings, RegExp> = {
  // معرّف بكسل ميتا أرقامٌ فقط (١٥–١٦ عادةً)
  metaPixelId: /^\d{8,20}$/,
  // تيك توك: حروفٌ كبيرة وأرقام، نحو عشرين
  tiktokPixelId: /^[A-Z0-9]{12,30}$/,
  // Google Analytics 4: ‏G-XXXXXXXX
  ga4Id: /^G-[A-Z0-9]{4,16}$/
};

export const TRACKING_LABELS: Record<keyof TrackingSettings, string> = {
  metaPixelId: 'معرّف Meta Pixel',
  tiktokPixelId: 'معرّف TikTok Pixel',
  ga4Id: 'معرّف Google Analytics'
};

/**
 * يُنقّي ما أرسله التاجر ويرفض الصيغ الخاطئة برسالةٍ تسمّي الحقل.
 *
 * الرفض لا الإسقاط الصامت: معرّفٌ منسوخٌ ناقصاً يُحفظ فلا يعمل البكسل، ولا
 * يعرف التاجر لماذا لا تصل أحداثه إلى مدير الإعلانات.
 */
export const sanitizeTrackingSettings = (
  input: unknown
): { ok: true; value: TrackingSettings | null } | { ok: false; error: string } => {
  if (!input || typeof input !== 'object') return { ok: true, value: null };
  const raw = input as Record<string, unknown>;
  const value: TrackingSettings = {};
  for (const key of Object.keys(PATTERNS) as Array<keyof TrackingSettings>) {
    const text = String(raw[key] ?? '').trim().toUpperCase().replace(/\s+/g, '');
    if (!text) continue;
    // ميتا أرقامٌ فقط — التحويل إلى الحروف الكبيرة لا يغيّرها
    if (!PATTERNS[key].test(text)) {
      return { ok: false, error: `${TRACKING_LABELS[key]} غير صالح — انسخه كما يظهر في لوحة الإعلانات` };
    }
    value[key] = text;
  }
  return { ok: true, value: Object.keys(value).length ? value : null };
};

export const readTrackingSettings = (value: unknown): TrackingSettings => {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const result = sanitizeTrackingSettings(parsed);
    return 'value' in result && result.value ? result.value : {};
  } catch {
    return {};
  }
};

/**
 * ما تحقنه الواجهة العامّة — `null` لمن لا يملك الاستحقاق.
 *
 * الإعداد يُحفظ ولو انتهت الخطة، ويعود يعمل حين يُجدِّد التاجر: حذفه عند
 * انتهاء الاشتراك كان سيُلزمه بنسخ المعرّفات من جديد.
 */
export const publicTracking = async (
  businessId: string,
  businessType: BusinessType,
  stored: unknown
): Promise<TrackingSettings | null> => {
  const settings = readTrackingSettings(stored);
  if (!settings.metaPixelId && !settings.tiktokPixelId && !settings.ga4Id) return null;
  try {
    return (await businessHasEntitlement(businessId, businessType, TRACKING_FEATURE)) ? settings : null;
  } catch {
    return null;
  }
};

export default { sanitizeTrackingSettings, readTrackingSettings, publicTracking, TRACKING_FEATURE };
