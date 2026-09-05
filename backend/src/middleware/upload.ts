// backend/src/middleware/upload.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// التأكد من وجود مجلد temp مؤقت
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// تخزين مؤقت للملفات قبل رفعها إلى Cloudflare
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// فلترة الملفات
const fileFilter = (req: any, file: any, cb: any) => {
  // ملاحظة أمنية: SVG محذوف عمداً — ملف SVG يمكن أن يحتوي على <script>
  // ويصبح ثغرة XSS مخزّنة عند فتحه مباشرة من نطاق المنصة.
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
  const allowedExtensions = /\.(jpe?g|png|gif|webp|avif)$/i;

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.test(file.originalname || '')) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة بصيغة JPEG أو PNG أو GIF أو WEBP'), false);
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB
    files: 10,
    fields: 20
  },
  fileFilter: fileFilter
});

/**
 * يقبل ملفاً واحداً تحت أي اسم من الأسماء المذكورة.
 *
 * **العطل الذي يسدّه:** `api.upload` في الواجهة يرسل الملف دائماً باسم
 * الحقل `image`، بينما مسارا شعار المتجر وغلافه كانا يطلبان `logo`
 * و`cover`. multer يرى حقلاً غير متوقّع فيرمي LIMIT_UNEXPECTED_FILE، وبلا
 * معالج على المسار يصير الردّ 500 «حدث خطأ في الخادم» — فلم يعمل رفع
 * شعار متجر ولا غلافه قط.
 *
 * قبول الأسماء البديلة أبسط من تغيير عقد الواجهة، ويُبقي أي عميل قديم
 * يرسل الاسم القديم عاملاً.
 */
export const uploadSingleImage = (...fieldNames: string[]) => {
  const middleware = upload.fields(fieldNames.map((name) => ({ name, maxCount: 1 })));

  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (err: any) => {
      if (err) return handleUploadError(err, req, res, next);

      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      if (files) {
        for (const name of fieldNames) {
          if (files[name]?.[0]) {
            // المتحكّمات تقرأ req.file — نملؤه مهما كان اسم الحقل الوارد
            (req as any).file = files[name][0];
            break;
          }
        }
      }
      next();
    });
  };
};

// ✅ معالج أخطاء الرفع (مع تصحيح نوع الخطأ)
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Multer error codes
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'حجم الملف كبير جداً. راجع الحد الأقصى المسموح لنوع الملف.' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        success: false, 
        error: 'عدد الملفات كبير جداً' 
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        success: false, 
        error: 'نوع الملف غير متوقع' 
      });
    }
    return res.status(400).json({ 
      success: false, 
      error: `خطأ في رفع الملف: ${err.message}` 
    });
  }
  
  if (err) {
    return res.status(400).json({ 
      success: false, 
      error: err.message 
    });
  }
  
  next();
};

// ✅ دالة مساعدة لتنظيف الملفات المؤقتة
export const cleanupTempFile = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error cleaning up temp file:', error);
  }
};
// ==================== الفيديو ====================
// المسار الأساسي للفيديو هو الرفع المباشر إلى R2 برابط موقّع (لا يمر بالسيرفر).
// هذا المُحمِّل مسار احتياطي للمقاطع الصغيرة فقط: مهلة طلب Heroku 30 ثانية،
// وأي ملف أكبر من ذلك عبر الدينو سيفشل بـ H12.
const MAX_DIRECT_VIDEO_MB = Number(process.env.R2_MAX_DIRECT_VIDEO_MB || 25);

const videoFileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const allowedExtensions = /\.(mp4|webm|mov)$/i;

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.test(file.originalname || '')) {
    cb(null, true);
  } else {
    cb(new Error('صيغة الفيديو غير مدعومة. الصيغ المسموحة: MP4 أو WEBM أو MOV'), false);
  }
};

// تخزين في الذاكرة: الملف يُمرَّر مباشرة إلى R2 ثم يُهمَل — لا نلمس قرص الدينو المؤقت.
export const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DIRECT_VIDEO_MB * 1024 * 1024,
    files: 1,
    fields: 20
  },
  fileFilter: videoFileFilter
});
