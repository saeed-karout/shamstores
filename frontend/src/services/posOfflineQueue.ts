// frontend/src/services/posOfflineQueue.ts
//
// طابور بيعات الكاشير دون اتصال.
//
// **لماذا:** المحلّ لا يتوقّف حين ينقطع الإنترنت أو تنطفئ الكهرباء عن
// الراوتر — الزبون أمام الصندوق والنقود في اليد. فالبيعة تُحفظ على الجهاز
// (IndexedDB: تبقى بعد إغلاق المتصفّح وانطفاء الهاتف، بخلاف الذاكرة)،
// ويُطبع إيصالٌ «بانتظار المزامنة»، وتُرسل وحدها حين يعود الاتصال.
//
// **ومفتاح عدم التكرار يُولَّد قبل أوّل محاولة لا عند الحفظ:** على شبكةٍ
// ضعيفة قد تصل البيعة ويضيع ردّها، فتدخل الطابور وهي مسجّلة فعلاً. المفتاح
// نفسه في المحاولتين يجعل الخادم يعيد إيصال الأولى بدل تسجيلها مرّتين —
// راجع `createSale` في backend/src/controllers/posController.ts.
//
// **والأسعار يحسبها الخادم عند المزامنة** كما في البيع العاديّ: الجهاز لا
// يُؤتمن على السعر. فإن تغيّر سعرٌ بين البيع والمزامنة يُسجَّل الفرق في
// نتيجة المزامنة ليراه الكاشير، لا يُفرض سعر الجهاز.

import api from './api';

// ---------- الأنواع ----------

export interface QueuedSaleLine {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface QueuedSale {
  /** مفتاح عدم التكرار — ومعرّف الصفّ في الطابور */
  key: string;
  /** وقت البيع على الجهاز (ISO) — يصير تاريخ البيعة عند المزامنة */
  soldAt: string;
  items: QueuedSaleLine[];
  paymentMethod: string;
  discountAmount: number;
  /** الإجمالي كما رآه الكاشير — للمقارنة مع حساب الخادم */
  localTotal: number;
  status: 'pending' | 'failed';
  attempts: number;
  /** سبب الرفض النهائيّ (4xx) — يُعرض ليقرّر الكاشير */
  error?: string;
}

export interface SyncResult {
  synced: number;
  failed: number;
  /** بيعاتٌ قُبلت والرصيد لا يكفيها — تُعلَّم في الخادم للمراجعة */
  shortages: number;
  /** بيعاتٌ حسب الخادم إجماليها بغير ما حسبه الجهاز (سعرٌ تغيّر) */
  priceChanged: number;
  /** توقّفت المزامنة لأن الشبكة لم تُجب — تُعاد لاحقاً */
  interrupted: boolean;
}

// ---------- IndexedDB ----------

const DB_NAME = 'sham-pos';
const DB_VERSION = 1;
const QUEUE = 'queue';
const CATALOG = 'catalog';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB غير متاح'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(CATALOG)) db.createObjectStore(CATALOG);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
};

const run = async <T>(
  store: string,
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = action(tx.objectStore(store));
    // الكتابة تُعدّ تامّةً عند اكتمال المعاملة لا الطلب: هاتفٌ ينطفئ بين
    // الاثنين كان سيُفقد بيعةً ظنّها الكاشير محفوظة
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

// ---------- الإشعار بالتغيّر ----------

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

export const onQueueChange = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// ---------- الطابور ----------

/** مفتاحٌ عشوائيّ فريد — `randomUUID` حيث توجد، وبديلٌ من `getRandomValues` */
export const newIdempotencyKey = (): string => {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const enqueueSale = async (sale: Omit<QueuedSale, 'status' | 'attempts'>): Promise<void> => {
  await run(QUEUE, 'readwrite', (s) => s.put({ ...sale, status: 'pending', attempts: 0 }));
  changed();
};

export const listQueue = async (): Promise<QueuedSale[]> => {
  try {
    const rows = await run<QueuedSale[]>(QUEUE, 'readonly', (s) => s.getAll() as IDBRequest<QueuedSale[]>);
    // الأقدم أوّلاً: المخزون يُخصم بترتيب البيع الفعليّ
    return rows.sort((a, b) => a.soldAt.localeCompare(b.soldAt));
  } catch {
    return [];
  }
};

export const discardSale = async (key: string): Promise<void> => {
  await run(QUEUE, 'readwrite', (s) => s.delete(key));
  changed();
};

const updateSale = async (sale: QueuedSale): Promise<void> => {
  await run(QUEUE, 'readwrite', (s) => s.put(sale));
};

// ---------- نسخة الأصناف للبحث دون اتصال ----------

/**
 * آخر قائمة أصناف كاملة — كي يجد الكاشير الصنف بالاسم أو الرمز والشبكة
 * مقطوعة. بلاها يصير الطابور بلا فائدة: لا شيء يُضاف إلى السلّة أصلاً.
 */
export const saveCatalog = async (products: unknown[]): Promise<void> => {
  try {
    await run(CATALOG, 'readwrite', (s) => s.put({ products, savedAt: Date.now() }, 'products'));
  } catch {
    // النسخة تحسين — فشلها لا يمسّ البيع
  }
};

export const loadCatalog = async <T>(): Promise<T[]> => {
  try {
    const row = await run<any>(CATALOG, 'readonly', (s) => s.get('products'));
    return Array.isArray(row?.products) ? row.products : [];
  } catch {
    return [];
  }
};

// ---------- الإرسال ----------

/** بلا ردّ = الشبكة. أي ردٍّ من الخادم — ولو خطأ — يعني أن الشبكة تعمل */
export const isNetworkError = (error: any): boolean => !!error && !error.response;

/**
 * هل يُعاد لاحقاً أم هو رفضٌ نهائيّ؟
 *
 * 401: الجلسة انتهت — تُعاد بعد الدخول لا تُرمى. 403/408/429/5xx: عارضٌ
 * أو قفلٌ مؤقّت. أمّا بقيّة 4xx (صنفٌ حُذف مثلاً) فلن تنجح بالتكرار،
 * وإعادتها للأبد تسدّ الطابور خلفها.
 */
const isRetryable = (error: any): boolean => {
  if (isNetworkError(error)) return true;
  const status = error?.response?.status;
  return status === 401 || status === 403 || status === 408 || status === 429 || status >= 500;
};

export const SALE_TIMEOUT_MS = 12000;

/**
 * يرسل بيعةً بمهلة.
 *
 * المهلة لا تُلغي الطلب — قد يصل بعدها. لكن الكاشير لا ينتظر دقيقة: بعد
 * المهلة تدخل البيعة الطابور بالمفتاح نفسه، فإن وصلت الأولى أعاد الخادم
 * إيصالها عند المزامنة ولم يسجّل ثانية.
 */
export const postSale = <T>(body: Record<string, unknown>, timeoutMs = SALE_TIMEOUT_MS): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), timeoutMs);
    api.post<T>('/pos/sale', body).then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); }
    );
  });

let syncing: Promise<SyncResult> | null = null;

/**
 * يرسل الطابور بالترتيب.
 *
 * **واحدةً واحدة ويتوقّف عند أوّل انقطاع:** الشبكة التي أسقطت الأولى
 * ستُسقط التالية، ومئة طلبٍ متوازٍ على خطٍّ يلفظ أنفاسه يخنقه أكثر.
 * ومزامنتان متزامنتان (حدث `online` ومؤقّت) تتشاركان الوعد نفسه.
 */
export const syncQueue = (): Promise<SyncResult> => {
  if (syncing) return syncing;

  syncing = (async () => {
    const result: SyncResult = { synced: 0, failed: 0, shortages: 0, priceChanged: 0, interrupted: false };
    const queue = (await listQueue()).filter((sale) => sale.status === 'pending');

    for (const sale of queue) {
      try {
        const receipt: any = await postSale({
          // السعر الذي رآه الزبون — الخادم يعتمده للبيعة المؤجّلة
          items: sale.items.map((line) => ({ productId: line.productId, quantity: line.quantity, price: line.price })),
          paymentMethod: sale.paymentMethod,
          discountAmount: sale.discountAmount,
          idempotencyKey: sale.key,
          offline: true,
          soldAt: sale.soldAt
        });
        await discardSale(sale.key);
        result.synced += 1;
        if (receipt?.stockShortage) result.shortages += 1;
        if (typeof receipt?.total === 'number' && Math.abs(receipt.total - sale.localTotal) > 0.009) {
          result.priceChanged += 1;
        }
      } catch (error: any) {
        if (isRetryable(error)) {
          await updateSale({ ...sale, attempts: sale.attempts + 1 }).catch(() => undefined);
          result.interrupted = true;
          break;
        }
        await updateSale({
          ...sale,
          status: 'failed',
          attempts: sale.attempts + 1,
          error: error?.response?.data?.error || 'رفض الخادم البيعة'
        }).catch(() => undefined);
        result.failed += 1;
      }
    }

    changed();
    return result;
  })().finally(() => {
    syncing = null;
  });

  return syncing;
};

/** يعيد بيعةً مرفوضة إلى الانتظار — بعد أن يصلح التاجر السبب (أعاد صنفاً مثلاً) */
export const retryFailed = async (key: string): Promise<void> => {
  const sale = (await listQueue()).find((s) => s.key === key);
  if (!sale) return;
  await updateSale({ ...sale, status: 'pending', error: undefined });
  changed();
};
