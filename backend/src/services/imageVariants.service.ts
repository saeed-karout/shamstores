// backend/src/services/imageVariants.service.ts
//
// تصغير الصور وتوليد ثلاث نسخ منها قبل الرفع.
//
// **المشكلة:** الصورة تُرفع كما خرجت من الهاتف — ثلاثة أو أربعة ميغابايت
// بأبعاد 4000 بكسل — وتُعرض في بطاقة عرضها مئتا بكسل. المتصفح ينزّل
// الميغابايتات كلها ثم يُصغّرها. صفحة بعشرين منتجاً تعني ستّين ميغابايت
// على شبكة هاتف سورية.
//
// **ثلاث نسخ لا واحدة:**
//   • `sm` (400 بكسل) — بطاقات الشبكة والمصغّرات.
//   • `md` (900 بكسل)  — الصورة الكبيرة في صفحة المنتج والبانرات.
//   • `orig` (1800 بكسل) — التكبير، وهو أقصى ما يفيد على شاشة.
//
// والصيغة WebP دائماً: تعطي ما تعطيه JPEG بثلث الحجم تقريباً، ويدعمها كل
// متصفح مستعمل اليوم.
//
// **الأسماء اصطلاحية لا مخزَّنة**: كل نسخة تحمل نفس المسار بلاحقة مختلفة،
// فتشتقّ الواجهة أي مقاس من الرابط المخزَّن بلا عمود جديد ولا ترحيل. ولأن
// اللاحقة جزء من الاسم، الروابط القديمة لا تطابق النمط فتبقى كما هي —
// فلا تُطلَب نسخة غير موجودة.

import sharp from 'sharp';

export type VariantKey = 'sm' | 'md' | 'orig';

/** أقصى بعد لكل نسخة، وجودة الضغط */
export const VARIANTS: Array<{ key: VariantKey; width: number; quality: number }> = [
  { key: 'sm', width: 400, quality: 70 },
  { key: 'md', width: 900, quality: 78 },
  { key: 'orig', width: 1800, quality: 82 }
];

/** اللاحقة التي تميّز صورة مولَّدة عن رابط قديم */
export const VARIANT_MARK = '__v';

export interface RenderedVariant {
  key: VariantKey;
  buffer: Buffer;
  contentType: string;
  /** اللاحقة التي تُضاف إلى اسم الملف */
  suffix: string;
}

/**
 * هل تصلح هذه الصورة للمعالجة؟
 *
 * GIF المتحرّك يُترك كما هو: تحويله يفقد الحركة، وهي سبب رفعه.
 * وSVG ممنوع أصلاً في فلتر الرفع.
 */
export const isProcessable = (mimetype: string): boolean =>
  ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'].includes(mimetype);

/**
 * يولّد النسخ الثلاث.
 *
 * `rotate()` بلا وسائط يطبّق دوران EXIF: صور الهواتف تُخزَّن أفقية مع علامة
 * دوران، وتجاهلها يقلب صور التجّار على جنبها.
 *
 * `withoutEnlargement` يمنع تكبير صورة صغيرة إلى 1800 بكسل — تكبيرٌ يزيد
 * الحجم ولا يزيد التفصيل.
 */
export const renderVariants = async (input: Buffer): Promise<RenderedVariant[]> => {
  const base = sharp(input, { failOn: 'none' }).rotate();
  const metadata = await base.metadata();

  const out: RenderedVariant[] = [];

  for (const variant of VARIANTS) {
    // لا نولّد نسخة أكبر من الأصل: «md» لصورة عرضها 500 بكسل نسخة مكرّرة
    if (variant.key !== 'sm' && metadata.width && metadata.width <= variant.width) {
      const already = out.find((v) => v.buffer.length > 0 && v.key !== 'sm');
      if (already && variant.key === 'orig') continue;
    }

    const buffer = await sharp(input, { failOn: 'none' })
      .rotate()
      .resize({ width: variant.width, height: variant.width, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: variant.quality })
      .toBuffer();

    out.push({
      key: variant.key,
      buffer,
      contentType: 'image/webp',
      suffix: `${VARIANT_MARK}_${variant.key}.webp`
    });
  }

  return out;
};

export default { renderVariants, isProcessable, VARIANTS, VARIANT_MARK };
