// frontend/src/utils/referral.ts
//
// التقاط رمز المسوّق من الرابط والاحتفاظ به حتى الشراء.
//
// **الزائر لا يشتري في نفس الزيارة عادةً.** يفتح الرابط، ويتصفّح، ويغادر،
// ويعود بعد يومين ليطلب. فرمزٌ يعيش في عنوان الصفحة وحده يضيع عند أوّل
// تنقّل — وتضيع معه عمولة المسوّق الذي جلبه فعلاً.
//
// **والحفظ لكل نشاط على حدة**: زائرٌ وصل إلى متجرين برابطَي مسوّقين
// مختلفين يجب أن يُنسَب كلٌّ إلى صاحبه. مفتاحٌ واحد كان سيجعل آخر رابطٍ
// فُتح يسرق إحالة الأوّل.

const TTL_DAYS = 30;
const KEY_PREFIX = 'sf-ref:';

interface StoredRef {
  code: string;
  at: number;
}

const key = (businessId: string) => `${KEY_PREFIX}${businessId}`;

/**
 * يقرأ `?ref=` ويحفظه، ثم ينظّف العنوان.
 *
 * تنظيف العنوان مقصود: رابطٌ يحمل رمز إحالة يُشارَك ويُنسخ، فينسب زائر
 * الثاني إلى مسوّق الأوّل. والحفظ تمّ فلا حاجة لبقائه ظاهراً.
 */
export const captureRef = (businessId?: string | null): string | null => {
  if (typeof window === 'undefined' || !businessId) return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get('ref') || '').trim().toUpperCase();
    if (!code) return null;

    localStorage.setItem(key(businessId), JSON.stringify({ code, at: Date.now() } as StoredRef));

    params.delete('ref');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (query ? `?${query}` : '') + window.location.hash
    );

    return code;
  } catch {
    // وضع التصفّح الخاص يرمي عند الكتابة — الإحالة تحسينٌ لا شرط للشراء
    return null;
  }
};

/**
 * الرمز المحفوظ إن لم تنتهِ صلاحيته.
 *
 * ثلاثون يوماً: أطول من دورة تفكير الزبون العادية، وأقصر من أن يُنسَب
 * شراءٌ بعد شهرين إلى إعلانٍ نسيه الجميع.
 */
export const getRef = (businessId?: string | null): string | null => {
  if (typeof window === 'undefined' || !businessId) return null;

  try {
    const raw = localStorage.getItem(key(businessId));
    if (!raw) return null;

    const stored = JSON.parse(raw) as StoredRef;
    if (!stored?.code) return null;

    const ageDays = (Date.now() - (stored.at || 0)) / (24 * 60 * 60 * 1000);
    if (ageDays > TTL_DAYS) {
      localStorage.removeItem(key(businessId));
      return null;
    }

    return stored.code;
  } catch {
    return null;
  }
};

/** يُنادى بعد نجاح الطلب: الرمز استُهلك، وإبقاؤه ينسب كل طلبٍ لاحق للمسوّق نفسه */
export const clearRef = (businessId?: string | null): void => {
  if (typeof window === 'undefined' || !businessId) return;
  try {
    localStorage.removeItem(key(businessId));
  } catch {
    /* لا شيء */
  }
};

export default { captureRef, getRef, clearRef };
