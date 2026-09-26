// frontend/src/utils/imageTools.ts
//
// معالجة الصور في المتصفّح بـcanvas — بلا مكتبات ولا خادم.
//
// **لماذا في المتصفّح:** صورة الهاتف ٤–١٢ ميغا، وإنترنت التاجر السوري بطيءٌ
// ومقطوع. تصغيرها قبل الرفع يجعل عشرين صورةً تصل في ثوانٍ بدل دقائق، ويُبقي
// كل طلبٍ تحت حدّ الخادم (١ ميغا للـJSON).
//
// **و«التحسين» تعديلاتٌ مأمونة فقط:** قصٌّ مربّع، وتمديد المستويات (سطوع
// وتباين)، وتوازن أبيض محدود. إزالة الخلفية بالتخمين تقصّ أطراف المنتج
// وتترك هالاتٍ تبدو أسوأ من الصورة الأصلية — فلا نفعلها.

export type Box = { x: number; y: number; w: number; h: number };

type Drawable = ImageBitmap | HTMLImageElement;

const sizeOf = (img: Drawable) => ({
  w: 'naturalWidth' in img ? img.naturalWidth : img.width,
  h: 'naturalHeight' in img ? img.naturalHeight : img.height
});

/** ملفّ أو Blob ← صورة قابلة للرسم، مع احترام اتجاه صور الهاتف (EXIF) */
export const loadBitmap = async (source: Blob): Promise<Drawable> => {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(source, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    } catch {
      /* متصفّحٌ قديم لا يفهم الخيار — نرجع إلى <img> */
    }
  }
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // الصورة فُكّت إلى الذاكرة؛ الرابط لم يعد لازماً
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
};

/**
 * يحمّل صورةً من رابطٍ على الشبكة.
 *
 * يرمي إن منع الخادم CORS — الرسم على canvas من أصلٍ آخر «يلوّثه» فلا تُقرأ
 * بكسلاته. والمنادي يعرض عندها اختيار ملفٍّ من الجهاز بدلاً منها.
 */
export const loadBitmapFromUrl = async (url: string): Promise<Drawable> => {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return loadBitmap(await response.blob());
};

const canvasOf = (w: number, h: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
};

const toBlob = (canvas: HTMLCanvasElement, quality = 0.88): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('تعذّر ترميز الصورة'))), 'image/jpeg', quality)
  );

/** طول base64 × ¾ ≈ عدد البايتات */
export const dataUrlBytes = (dataUrl: string) => Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);

/**
 * يصغّر الصورة إلى dataURL بصيغة JPEG تحت سقف البايتات.
 *
 * الجودة تنزل أوّلاً ثم الأبعاد: لقطة شاشةٍ فيها نصّ صغير (السعر!) تفقد
 * مقروئيتها بالتصغير أسرع ممّا تفقدها بضغط JPEG.
 */
export const toSizedDataUrl = (img: Drawable, maxDim: number, maxBytes: number): string => {
  const { w, h } = sizeOf(img);
  let scale = Math.min(1, maxDim / Math.max(w, h));
  for (let attempt = 0; attempt < 6; attempt++) {
    const { canvas, ctx } = canvasOf(w * scale, h * scale);
    // خلفية بيضاء: PNG شفاف يصير أسود في JPEG
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.85, 0.75, 0.65]) {
      const url = canvas.toDataURL('image/jpeg', q);
      if (dataUrlBytes(url) <= maxBytes) return url;
    }
    scale *= 0.8;
  }
  const { canvas, ctx } = canvasOf(w * scale, h * scale);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.6);
};

/**
 * يقصّ منتجاً من لقطة الشاشة بإطارٍ مطبَّع على ٠–١٠٠٠، ويجعله مربّعاً.
 *
 * يُوسَّع الإطار قليلاً: النموذج يرسم الإطار ملاصقاً، وقصٌّ ملاصق يأكل حافة
 * المنتج. ومربّعٌ لأن بطاقات المتجر مربّعة — الإطار الطويل يُقصّ ثانيةً عند
 * العرض فيضيع نصف المنتج.
 */
export const cropToSquare = async (img: Drawable, box: Box | null, outSize = 1000): Promise<Blob> => {
  const { w, h } = sizeOf(img);
  let bx = 0;
  let by = 0;
  let bw = w;
  let bh = h;
  if (box && box.w > 0 && box.h > 0) {
    bx = (box.x / 1000) * w;
    by = (box.y / 1000) * h;
    bw = (box.w / 1000) * w;
    bh = (box.h / 1000) * h;
    const pad = Math.max(bw, bh) * 0.04;
    bx -= pad;
    by -= pad;
    bw += pad * 2;
    bh += pad * 2;
  }
  const side = Math.min(Math.max(bw, bh), w, h);
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const sx = Math.min(Math.max(0, cx - side / 2), w - side);
  const sy = Math.min(Math.max(0, cy - side / 2), h - side);

  const size = Math.min(outSize, Math.round(side));
  const { canvas, ctx } = canvasOf(size, size);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return toBlob(canvas);
};

// ==================== التحسين ====================

const percentile = (hist: Uint32Array, total: number, p: number) => {
  const target = total * p;
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= target) return i;
  }
  return 255;
};

/**
 * يحدّ الحواف المتجانسة (إطار أبيض أو أسود حول المنتج) ليصير القصّ على
 * المنتج لا على الفراغ. متحفّظ: يتوقّف عند أوّل صفٍّ فيه تفاصيل.
 */
const trimUniformBorders = (data: Uint8ClampedArray, w: number, h: number) => {
  const at = (x: number, y: number) => (y * w + x) * 4;
  const ref = [data[0], data[1], data[2]];
  const close = (i: number) =>
    Math.abs(data[i] - ref[0]) + Math.abs(data[i + 1] - ref[1]) + Math.abs(data[i + 2] - ref[2]) < 36;
  const rowUniform = (y: number) => {
    let bad = 0;
    for (let x = 0; x < w; x += 2) if (!close(at(x, y))) bad++;
    return bad < w * 0.01;
  };
  const colUniform = (x: number, y0: number, y1: number) => {
    let bad = 0;
    for (let y = y0; y < y1; y += 2) if (!close(at(x, y))) bad++;
    return bad < (y1 - y0) * 0.01;
  };
  let top = 0;
  let bottom = h - 1;
  while (top < h * 0.4 && rowUniform(top)) top++;
  while (bottom > h * 0.6 && rowUniform(bottom)) bottom--;
  let left = 0;
  let right = w - 1;
  while (left < w * 0.4 && colUniform(left, top, bottom)) left++;
  while (right > w * 0.6 && colUniform(right, top, bottom)) right--;
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1, fill: `rgb(${ref[0]},${ref[1]},${ref[2]})` };
};

export interface EnhanceResult {
  blob: Blob;
  previewUrl: string;
}

/**
 * «حسّن الصورة»: قصٌّ مربّع على المنتج، ثم سطوعٌ وتباينٌ وتوازن أبيض تلقائي.
 *
 * - التباين: تمديد ما بين الـ٠٫٥٪ والـ٩٩٫٥٪ من الإضاءة — لا يقصّ إلا القليل.
 * - توازن الأبيض: «عالمٌ رماديّ» مخفّف بمعاملٍ محدود (٠٫٩–١٫١٥) كي لا تنقلب
 *   ألوان منتجٍ أحمر أصلاً إلى رمادي.
 * - السطوع: صورةٌ معتمة (متوسّطها تحت ١١٠) تُرفع بمنحنى غاما لا بإضافة ثابتة،
 *   فلا تحترق المناطق الفاتحة.
 */
export const enhanceImage = async (img: Drawable, outSize = 1200): Promise<EnhanceResult> => {
  const { w, h } = sizeOf(img);

  // عيّنةٌ مصغّرة للتحليل — الحساب على ١٢ ميغابكسل يجمّد هاتفاً متوسّطاً
  const probeScale = Math.min(1, 400 / Math.max(w, h));
  const probe = canvasOf(w * probeScale, h * probeScale);
  probe.ctx.drawImage(img, 0, 0, probe.canvas.width, probe.canvas.height);
  const probeData = probe.ctx.getImageData(0, 0, probe.canvas.width, probe.canvas.height).data;

  // ١) القصّ: حدود المحتوى ثم مربّعٌ حوله
  const trim = trimUniformBorders(probeData, probe.canvas.width, probe.canvas.height);
  const cx = (trim.x + trim.w / 2) / probeScale;
  const cy = (trim.y + trim.h / 2) / probeScale;
  const contentW = trim.w / probeScale;
  const contentH = trim.h / probeScale;
  const ratio = contentW / contentH;

  // منتجٌ مستطيلٌ جداً (زجاجة، حزام) يُحشى بلون الخلفية بدل قصّ طرفيه
  const pad = ratio > 1.35 || ratio < 0.74;
  const side = pad ? Math.max(contentW, contentH) * 1.04 : Math.min(contentW, contentH, w, h);
  const sx = pad ? cx - side / 2 : Math.min(Math.max(0, cx - side / 2), w - side);
  const sy = pad ? cy - side / 2 : Math.min(Math.max(0, cy - side / 2), h - side);

  const size = Math.min(outSize, Math.round(side));
  const { canvas, ctx } = canvasOf(size, size);
  ctx.fillStyle = trim.fill;
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  // ٢) المستويات
  const image = ctx.getImageData(0, 0, size, size);
  const d = image.data;
  const hr = new Uint32Array(256);
  const hg = new Uint32Array(256);
  const hb = new Uint32Array(256);
  const hl = new Uint32Array(256);
  let lumSum = 0;
  const step = Math.max(4, Math.floor((size * size) / 120_000) * 4);
  let n = 0;
  for (let i = 0; i < d.length; i += step) {
    hr[d[i]]++;
    hg[d[i + 1]]++;
    hb[d[i + 2]]++;
    const l = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    hl[l]++;
    lumSum += l;
    n++;
  }

  // نقطتا الأسود والأبيض مشتركتان للقنوات الثلاث ومسقوفتان: تمديد كل قناة
  // وحدها يُسقط لون منتجٍ أحادي اللون (فستانٍ أحمر يصير أحمر فاقعاً)،
  // وصورةٌ معتمة كلّها لا تُمدَّد حتى يصير رماديّها أسود
  const lo = Math.min(percentile(hl, n, 0.005), 20);
  const hi = Math.max(percentile(hl, n, 0.995), 200);
  const base = 255 / Math.max(1, hi - lo);

  // توازن الأبيض بطريقة «العالم الرمادي» مخفّفةً إلى النصف: إنارة المحلّ
  // الصفراء ترفع الأحمر وتخفض الأزرق في الصورة كلّها. والتخفيف والسقف
  // (٠٫٩–١٫١٥) يمنعان تحويل منتجٍ أحمر فعلاً إلى رماديّ
  const meanOf = (hist: Uint32Array) => {
    let sum = 0;
    for (let v = 0; v < 256; v++) sum += v * hist[v];
    return sum / Math.max(1, n);
  };
  const mr = meanOf(hr);
  const mg = meanOf(hg);
  const mb = meanOf(hb);
  const grey = (mr + mg + mb) / 3;
  const wb = (m: number) => Math.min(1.15, Math.max(0.9, 1 + 0.5 * (grey / Math.max(1, m) - 1)));

  const cr = { lo, gain: base * wb(mr) };
  const cg = { lo, gain: base * wb(mg) };
  const cb = { lo, gain: base * wb(mb) };

  const mean = lumSum / Math.max(1, n);
  const gamma = mean < 110 ? Math.max(0.7, Math.log(125 / 255) / Math.log(Math.max(1, mean) / 255)) : 1;

  const lut = (c: { lo: number; gain: number }) => {
    const table = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      const stretched = Math.min(255, Math.max(0, (v - c.lo) * c.gain));
      table[v] = gamma === 1 ? stretched : 255 * Math.pow(stretched / 255, gamma);
    }
    return table;
  };
  const lr = lut(cr);
  const lg = lut(cg);
  const lb = lut(cb);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lr[d[i]];
    d[i + 1] = lg[d[i + 1]];
    d[i + 2] = lb[d[i + 2]];
  }
  ctx.putImageData(image, 0, 0);

  const blob = await toBlob(canvas, 0.88);
  return { blob, previewUrl: URL.createObjectURL(blob) };
};

/** Blob ← File باسمٍ وصيغةٍ يقبلهما مسار الرفع */
export const blobToFile = (blob: Blob, name: string) =>
  new File([blob], name.replace(/\.[a-z0-9]+$/i, '') + '.jpg', { type: 'image/jpeg' });
