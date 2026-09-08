// frontend/src/utils/barcodeScanner.ts
//
// مسح الباركود بالكاميرا، بمحرّكين.
//
// **الأصيل أولاً:** `BarcodeDetector` واجهة مدمجة في Chrome/Edge — بلا
// تحميل، وتعمل على وحدة المعالجة الأصلية فتقرأ أسرع وتستهلك بطارية أقل.
//
// **وZXing احتياطاً:** Safari وiPhone لا يدعمان الأصيل، وهناك كان زرّ المسح
// يختفي كلّياً — فيبقى الكاشير على iPhone يكتب الأرقام يدوياً. المكتبة
// **تُحمَّل عند الحاجة فقط** (≈٣٣٠ كيلوبايت): من يفتح الكاشير على أندرويد
// لا يدفع بايتاً واحداً من ثمنها.
//
// ⚠️ الكاميرا لا تعمل إلا على HTTPS أو localhost — قاعدة متصفّح لا خللٌ
// عندنا. والرسالة تقول ذلك بدل «تعذّر فتح الكاميرا» الغامضة.

/** الصيغ المطبوعة على السلع فعلاً — قائمة أقصر تعني قراءةً أسرع وأقلّ خطأً */
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'];

const ZXING_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';

export type ScannerEngine = 'native' | 'zxing' | 'none';

/** أي محرّك سيُستعمل — تقرؤه الواجهة لتقرر هل تعرض الزرّ */
export const detectEngine = (): ScannerEngine => {
  if (typeof window === 'undefined') return 'none';
  if (!navigator.mediaDevices?.getUserMedia) return 'none';
  if ('BarcodeDetector' in window) return 'native';
  return 'zxing';
};

export const isSecureForCamera = (): boolean =>
  typeof window === 'undefined' ||
  window.isSecureContext ||
  window.location.hostname === 'localhost';

let zxingPromise: Promise<any> | null = null;

/** يُحمَّل مرّةً ويُعاد استعماله — إعادة الحقن تعيد التنزيل بلا داعٍ */
const loadZXing = (): Promise<any> => {
  if (zxingPromise) return zxingPromise;

  zxingPromise = new Promise((resolve, reject) => {
    const existing = (window as any).ZXing;
    if (existing) return resolve(existing);

    const script = document.createElement('script');
    script.src = ZXING_URL;
    script.async = true;
    script.onload = () => {
      const lib = (window as any).ZXing;
      if (lib) resolve(lib);
      else reject(new Error('حُمّلت المكتبة ولم تُعرّف نفسها'));
    };
    script.onerror = () => {
      // إعادة المحاولة ممكنة بعد الفشل — شبكةٌ تعطّلت لحظةً لا تعني عطلاً دائماً
      zxingPromise = null;
      reject(new Error('تعذّر تحميل قارئ الباركود — تحقّق من الاتصال'));
    };
    document.head.appendChild(script);
  });

  return zxingPromise;
};

export interface ScanHandle {
  stop: () => void;
  engine: ScannerEngine;
}

export interface StartScanOptions {
  video: HTMLVideoElement;
  onResult: (value: string) => void;
  onError?: (message: string) => void;
}

/**
 * يبدأ المسح ويعيد مقبضاً لإيقافه.
 *
 * **الإيقاف مسؤولية المنادي دائماً**: كاميرا تبقى مفتوحة بعد إغلاق الشاشة
 * تستنزف البطارية وتُبقي ضوء العدسة مضاءً — وهو ما يقرؤه المستخدم تجسّساً.
 */
export const startScan = async (options: StartScanOptions): Promise<ScanHandle> => {
  const { video, onResult, onError } = options;

  if (!isSecureForCamera()) {
    throw new Error('الكاميرا تحتاج اتصالاً آمناً (https)');
  }

  const engine = detectEngine();
  if (engine === 'none') {
    throw new Error('متصفّحك لا يتيح استخدام الكاميرا');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    // الخلفية: الأمامية تصوّر وجه الكاشير لا الباركود
    video: { facingMode: { ideal: 'environment' } }
  });

  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  await video.play().catch(() => undefined);

  const stopStream = () => stream.getTracks().forEach((track) => track.stop());

  if (engine === 'native') {
    const Detector = (window as any).BarcodeDetector;
    const detector = new Detector({ formats: FORMATS });
    let stopped = false;

    const timer = window.setInterval(async () => {
      if (stopped) return;
      try {
        const codes = await detector.detect(video);
        if (codes?.length && codes[0].rawValue) onResult(String(codes[0].rawValue));
      } catch {
        // إطارٌ لم يُقرأ ليس خطأً — الإطار التالي بعد جزءٍ من الثانية
      }
    }, 350);

    return {
      engine,
      stop: () => {
        stopped = true;
        window.clearInterval(timer);
        stopStream();
      }
    };
  }

  // ---- ZXing ----
  try {
    const ZXing = await loadZXing();
    const reader = new ZXing.BrowserMultiFormatReader();
    let stopped = false;

    reader.decodeFromStream(stream, video, (result: any) => {
      if (stopped || !result) return;
      const text = typeof result.getText === 'function' ? result.getText() : result.text;
      if (text) onResult(String(text));
    });

    return {
      engine,
      stop: () => {
        stopped = true;
        try {
          reader.reset();
        } catch {
          // بعض النسخ تسمّيها stopContinuousDecode — الإيقاف اليدوي أدناه يكفي
        }
        stopStream();
      }
    };
  } catch (error) {
    stopStream();
    onError?.((error as Error).message);
    throw error;
  }
};

export default { detectEngine, isSecureForCamera, startScan };
