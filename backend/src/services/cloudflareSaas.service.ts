// backend/src/services/cloudflareSaas.service.ts
//
// ربط نطاق التاجر آلياً عبر Cloudflare for SaaS (Custom Hostnames).
//
// **لماذا هذا الملف موجود:**
// التحقّق من DNS وحده لا يجعل نطاق التاجر يعمل. سجلّ CNAME صحيح يوصل الطلب
// إلى شبكة Cloudflare، لكن الشبكة لا تملك شهادة TLS باسم `mystore.com`
// فتردّ بخطأ شهادة قبل أن يصل الطلب إلينا أصلاً. الشهادة تُصدَر فقط عندما
// يُسجَّل النطاق «Custom Hostname» في المنطقة.
//
// كان ذلك يُفعل يدوياً من لوحة Cloudflare لكل تاجر — أي أن كل نطاق مخصّص
// ينتظر تدخّلاً بشرياً. هذا الملف يجعل التسجيل جزءاً من طلب التاجر نفسه.
//
// **ما يفعله Cloudflare بعد التسجيل:**
//   1. يتحقّق من ملكية النطاق — إمّا بسجلّ TXT وإمّا بأن يشير النطاق إلينا
//      فعلاً (تحقّق HTTP، وهو ما نطلبه لأنه لا يطلب من التاجر سجلاً ثانياً).
//   2. يُصدر شهادة TLS مجانية باسم نطاقه.
//   3. يوجّه الطلبات إلى «الأصل الاحتياطي» (Fallback Origin) — سجلّ مُوكَّل
//      في منطقتنا، يلتقطه Worker فيقرأ المضيف ويعرض المتجر الصحيح.
//
// **الإعداد المطلوب مرّة واحدة (لوحة Cloudflare):**
//   • SSL/TLS ← Custom Hostnames ← Fallback Origin مضبوط ومفعّل.
//   • رمز API بصلاحية `Zone / SSL and Certificates / Edit` على المنطقة.
//   • متغيّرات البيئة: CLOUDFLARE_API_TOKEN و CLOUDFLARE_ZONE_ID.
//
// راجع docs/deployment/custom-domains.md

import axios, { AxiosInstance } from 'axios';
import env from '../config/env';

const API_BASE = 'https://api.cloudflare.com/client/v4';

/** حالة النطاق كما تُعيدها Cloudflare */
export type HostnameStatus =
  | 'pending'
  | 'active'
  | 'active_redeploying'
  | 'provisioning'
  | 'blocked'
  | 'moved'
  | 'deleted'
  | string;

export interface DnsRecordHint {
  type: 'CNAME' | 'TXT';
  name: string;
  value: string;
  ttl: number;
  /** شرح بالعربية يظهر للتاجر تحت السجلّ */
  hint: string;
}

export interface CustomHostnameState {
  id: string;
  hostname: string;
  /** حالة تسجيل النطاق نفسه */
  status: HostnameStatus;
  /** حالة الشهادة — النطاق لا يعمل على https قبل أن تصبح active */
  sslStatus: string;
  /** جاهز فعلاً: النطاق مفعّل والشهادة صادرة */
  ready: boolean;
  /** سجلّات يجب على التاجر إضافتها الآن */
  records: DnsRecordHint[];
  /** أخطاء تحقّق من Cloudflare — تُعرض كما هي لأن سببها عند التاجر */
  errors: string[];
}

export class CloudflareNotConfiguredError extends Error {
  constructor() {
    super('ربط النطاقات الآلي غير مُفعّل على الخادم');
    this.name = 'CloudflareNotConfiguredError';
  }
}

/**
 * هل الخادم مهيّأ للربط الآلي؟
 *
 * تُفحص قبل كل استدعاء: بيئة التطوير المحلية لا تملك الرمز عادةً، ويجب أن
 * تُخبر التاجر بذلك صراحةً لا أن ترتدّ 500.
 */
export const isConfigured = (): boolean =>
  Boolean(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ZONE_ID);

let client: AxiosInstance | null = null;

const api = (): AxiosInstance => {
  if (!isConfigured()) throw new CloudflareNotConfiguredError();
  if (!client) {
    client = axios.create({
      baseURL: `${API_BASE}/zones/${env.CLOUDFLARE_ZONE_ID}`,
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
  }
  return client;
};

/** يجمع رسائل خطأ Cloudflare في نصّ واحد مفهوم بدل كائن متداخل */
const describeError = (error: any): string => {
  const errors = error?.response?.data?.errors;
  if (Array.isArray(errors) && errors.length) {
    return errors
      .map((e: any) => {
        const chain = Array.isArray(e.error_chain) ? e.error_chain.map((c: any) => c.message).join(' — ') : '';
        return [e.message, chain].filter(Boolean).join(' — ');
      })
      .join(' | ');
  }
  return error?.message || 'خطأ غير معروف من Cloudflare';
};

/** الأصل الاحتياطي: ما يشير إليه نطاق التاجر */
export const fallbackOrigin = (): string =>
  env.CLOUDFLARE_FALLBACK_ORIGIN || `fallback-origin.${env.APP_DOMAIN}`;

const isApex = (hostname: string): boolean => hostname.split('.').length === 2;

/** سجلّ التوجيه الوحيد الذي يلزم التاجر في الحالة العادية */
export const buildCnameRecord = (hostname: string): DnsRecordHint => {
  const name = hostname.startsWith('www.') ? 'www' : isApex(hostname) ? '@' : hostname.split('.')[0];
  return {
    type: 'CNAME',
    name,
    value: fallbackOrigin(),
    ttl: 3600,
    hint:
      name === '@'
        ? 'توجيه النطاق إلى المنصّة. بعض مزوّدي النطاقات لا يقبلون CNAME على الجذر — عندها استعمل ALIAS أو ANAME بنفس القيمة، أو انقل إدارة النطاق إلى Cloudflare.'
        : 'توجيه النطاق إلى المنصّة'
  };
};

/**
 * يبني السجلّات التي يضيفها التاجر.
 *
 * سجلّ واحد فقط في الحالة العادية. ونضيف سجلّ ملكية TXT **فقط** حين تطلبه
 * Cloudflare صراحةً — طلب سجلَّين حيث يكفي واحد يضاعف فرص الخطأ ويطيل
 * الانتظار بلا مقابل.
 */
const buildRecords = (hostname: string, result: any): DnsRecordHint[] => {
  const host = hostname.replace(/^www\./, '');

  // قيمة السجلّ لا تأتي من Cloudflare أصلاً — الأصل الاحتياطي ثابت عندنا.
  // بناؤه محلياً يعني أن التاجر يرى ما يضيفه حتى لو تعذّر الاتصال بهم.
  const records: DnsRecordHint[] = [buildCnameRecord(hostname)];

  // تحقّق الملكية بسجلّ TXT — تطلبه Cloudflare حين لا يمكن التحقّق عبر HTTP
  const ownership = result?.ownership_verification;
  if (ownership?.name && ownership?.value) {
    records.push({
      type: 'TXT',
      name: String(ownership.name).replace(new RegExp(`\\.?${host}\\.?$`), '') || ownership.name,
      value: ownership.value,
      ttl: 3600,
      hint: 'إثبات ملكيتك للنطاق'
    });
  }

  // سجلّات التحقّق من الشهادة (DCV) حين تُطلب بصيغة TXT
  const validation = Array.isArray(result?.ssl?.validation_records) ? result.ssl.validation_records : [];
  for (const record of validation) {
    if (record?.txt_name && record?.txt_value) {
      records.push({
        type: 'TXT',
        name: String(record.txt_name).replace(new RegExp(`\\.?${host}\\.?$`), '') || record.txt_name,
        value: record.txt_value,
        ttl: 3600,
        hint: 'إصدار شهادة الحماية (https)'
      });
    }
  }

  return records;
};

const collectErrors = (result: any): string[] => {
  const out: string[] = [];
  if (Array.isArray(result?.verification_errors)) out.push(...result.verification_errors.map(String));
  if (Array.isArray(result?.ssl?.validation_errors)) {
    out.push(...result.ssl.validation_errors.map((e: any) => String(e?.message || e)));
  }
  return out.filter(Boolean);
};

const toState = (result: any): CustomHostnameState => {
  const status = String(result?.status || 'pending');
  const sslStatus = String(result?.ssl?.status || 'initializing');
  return {
    id: String(result?.id),
    hostname: String(result?.hostname),
    status,
    sslStatus,
    // كلاهما لازم: نطاق مفعّل بلا شهادة يعطي الزائر تحذير أمان لا صفحة
    ready: status === 'active' && sslStatus === 'active',
    records: buildRecords(String(result?.hostname), result),
    errors: collectErrors(result)
  };
};

/**
 * يسجّل نطاق التاجر، أو يعيد التسجيل القائم إن كان موجوداً.
 *
 * إعادة إنشاء نطاق مسجَّل ترتدّ بخطأ 1406 من Cloudflare. وهذا يحدث كثيراً:
 * تاجر يعيد المحاولة، أو نطاق حُذف من قاعدتنا وبقي عندهم. فنبحث أولاً.
 */
export const ensureCustomHostname = async (hostname: string): Promise<CustomHostnameState> => {
  const existing = await findCustomHostname(hostname);
  if (existing) return existing;

  try {
    const { data } = await api().post('/custom_hostnames', {
      hostname,
      ssl: {
        method: 'http',
        type: 'dv',
        bundle_method: 'ubiquitous',
        wildcard: false,
        settings: { min_tls_version: '1.2' }
      }
    });
    return toState(data?.result);
  } catch (error: any) {
    throw new Error(describeError(error));
  }
};

/** يبحث عن تسجيل قائم بالاسم — بلا معرّف محفوظ عندنا */
export const findCustomHostname = async (hostname: string): Promise<CustomHostnameState | null> => {
  try {
    const { data } = await api().get('/custom_hostnames', { params: { hostname } });
    const list = Array.isArray(data?.result) ? data.result : [];
    const match = list.find((r: any) => String(r?.hostname).toLowerCase() === hostname.toLowerCase());
    return match ? toState(match) : null;
  } catch (error: any) {
    throw new Error(describeError(error));
  }
};

/** يقرأ الحالة الحالية بالمعرّف */
export const getCustomHostname = async (id: string): Promise<CustomHostnameState | null> => {
  try {
    const { data } = await api().get(`/custom_hostnames/${id}`);
    return data?.result ? toState(data.result) : null;
  } catch (error: any) {
    // 1436 = النطاق غير موجود؛ نعامله كغياب لا كعطل
    if (error?.response?.status === 404) return null;
    throw new Error(describeError(error));
  }
};

/**
 * يحذف التسجيل من Cloudflare.
 *
 * لا يرمي عند الفشل: التاجر طلب فكّ الربط، ونجاح الحذف عندهم ليس شرطاً
 * لتوقّف عرض متجره على النطاق — ذلك يتقرّر من قاعدتنا.
 */
export const deleteCustomHostname = async (id: string): Promise<boolean> => {
  try {
    await api().delete(`/custom_hostnames/${id}`);
    return true;
  } catch (error: any) {
    console.error('تعذّر حذف النطاق من Cloudflare:', describeError(error));
    return false;
  }
};

export default {
  isConfigured,
  buildCnameRecord,
  ensureCustomHostname,
  findCustomHostname,
  getCustomHostname,
  deleteCustomHostname,
  fallbackOrigin
};
