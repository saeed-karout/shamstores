# تخزين الوسائط على Cloudflare R2 — الصور والفيديو

قرص Heroku **مؤقت**: أي ملف يكتبه التطبيق يختفي عند إعادة تشغيل الدينو (وهذا يحدث
يومياً على الأقل). لذلك كل صورة وكل فيديو يجب أن ينتهي في R2، لا على القرص.

| | الصور | الفيديو |
|---|---|---|
| المسار | المتصفح ← خادم Heroku ← R2 | المتصفح ← **R2 مباشرة** (رابط موقّع) |
| لماذا | الملفات صغيرة (≤ 8MB) | مهلة Heroku 30 ثانية؛ ملف 100MB عبر الدينو = `H12` |
| الحد الأقصى | 8 MB | 100 MB (`R2_MAX_VIDEO_MB`) |
| الصيغ | JPEG, PNG, GIF, WEBP, AVIF | MP4, WEBM, MOV |

> SVG ممنوع عمداً في رفع الصور — ملف SVG قد يحمل `<script>` ويصبح ثغرة XSS مخزّنة.

---

## 1. إنشاء الحاوية (Bucket)

1. لوحة Cloudflare → **R2 Object Storage** → **Create bucket**
2. الاسم: `shamstores-images` (الحاوية القائمة حالياً في هذا المشروع)
3. الموقع: **Automatic**، أو `EEUR`/`WEUR` إن كان معظم زوارك في المنطقة
4. بعد الإنشاء: **Settings** → دوّن **Account ID** (سيكون `R2_ACCOUNT_ID`)

نقطة النهاية للـ API تكون دائماً:

```
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

---

## 2. الوصول العام للقراءة

الزوار يقرأون الوسائط بلا مصادقة، فالحاوية تحتاج رابطاً عاماً. أمامك خياران:

### أ. نطاق مخصص — **الموصى به**

Settings → **Public access** → **Connect Domain** → `cdn.shamstores.com`

مزاياه على `r2.dev`:

- بلا حد معدل (نطاق `r2.dev` مخصص للتجربة ومحدود ولا يُنصح به في الإنتاج)
- تخزين مؤقت (CDN) على شبكة Cloudflare وضغط تلقائي
- يمكنك لاحقاً تفعيل تحويلات الصور على النطاق نفسه
- الرابط لا يتغير لو غيّرت الحاوية

```
R2_PUBLIC_URL=https://cdn.shamstores.com
```

> **عند الانتقال من `r2.dev` إلى نطاق مخصص:** الروابط القديمة مخزّنة كاملة في
> قاعدة البيانات. الواجهة تعيد كتابتها تلقائياً على الرابط العام الحالي
> (`normalizeR2Url` في `frontend/src/utils/imageHelpers.ts`) لأن المفتاح داخل
> الحاوية لا يتغيّر — فلا حاجة لتعديل قاعدة البيانات.
> لكن **أبقِ وصول `r2.dev` مفعّلاً** حتى تتأكد أن لا جهة أخرى (بريد، وسوم SEO،
> عملاء خارجيون) ما زالت تُصدر الروابط القديمة كما هي.

### ب. نطاق r2.dev (للاختبار السريع)

Settings → **Public access** → **Allow Access** → تحصل على:

```
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxx.r2.dev
```

> ⚠️ `R2_PUBLIC_URL` **بلا شرطة مائلة في آخره**. الكود يبني الرابط بـ
> `${R2_PUBLIC_URL}/${key}`، والشرطة الزائدة تنتج `//` ومسارات 404.

---

## 3. مفاتيح الوصول (S3 API Token)

R2 → **Manage R2 API Tokens** → **Create API token**

- **Permissions**: `Object Read & Write` — لا تختر Admin
- **Specify bucket**: اختر حاويتك فقط، لا «كل الحاويات»
- **TTL**: بلا انتهاء (أو دوّن تاريخ التجديد)

انسخ `Access Key ID` و`Secret Access Key` — **السرّ يُعرض مرة واحدة فقط**.

```
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

> هذان المفتاحان يبقيان على الخادم فقط. لا تضعهما إطلاقاً في متغير يبدأ بـ `VITE_`.

---

## 4. CORS — إلزامي لرفع الفيديو

الفيديو يُرفع من المتصفح مباشرة إلى R2، فالحاوية يجب أن تسمح بذلك.
بدون هذه الخطوة يفشل الرفع المباشر ويتحوّل التطبيق تلقائياً إلى المسار الاحتياطي
عبر الخادم (الذي يقبل 25 ميغابايت فقط).

R2 → الحاوية → **Settings** → **CORS Policy** → **Edit** → الصق:

```json
[
  {
    "AllowedOrigins": [
      "https://shamstores.com",
      "https://www.shamstores.com",
      "https://*.shamstores.com",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

- أضف نطاقات التجّار المخصصة إلى `AllowedOrigins` عند تفعيلها.
- احذف سطر `localhost` من نسخة الإنتاج إن أردت التشدّد.

---

## 5. متغيرات Heroku

```bash
heroku config:set --app shamstores R2_ACCOUNT_ID=<account-id> R2_BUCKET_NAME=shamstores-images R2_ACCESS_KEY_ID=<access-key> R2_SECRET_ACCESS_KEY=<secret-key> R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com R2_PUBLIC_URL=https://cdn.shamstores.com R2_MAX_VIDEO_MB=100 R2_MAX_DIRECT_VIDEO_MB=25 R2_PRESIGN_EXPIRES=900
```

ثم متغيرات الواجهة — **تُحقن وقت البناء**، فاضبطها ثم أعِد النشر:

```bash
heroku config:set --app shamstores VITE_R2_PUBLIC_URL=https://cdn.shamstores.com VITE_MAX_VIDEO_MB=100
```

> `R2_ENDPOINT` اختياري: إن غاب يُشتق من `R2_ACCOUNT_ID` تلقائياً
> ([r2Service.ts](../../backend/src/services/r2Service.ts)).
>
> إن نقص أي متغير أساسي، يطبع الخادم عند الإقلاع تحذيراً واضحاً
> (`تخزين الوسائط غير مهيأ …`) وتُرجع مسارات الرفع `503` برسالة مفهومة
> بدل أن تفشل بصمت.

---

## 6. كيف يعمل الرفع في الكود

### الصور — طلب واحد

```
POST /api/upload            (multipart: image)      → { imageUrl, imageId }
POST /api/upload/multiple   (multipart: images[])   → { images: [...] }
```

`backend/src/services/r2ImagesService.ts` يرفع إلى R2 ويحذف الملف المؤقت فوراً.

### الفيديو — ثلاث خطوات

```
1) POST /api/upload/video/presign
   { fileName, contentType, size, type, id, subType }
   → { uploadUrl, key, publicUrl, expiresIn }

2) PUT <uploadUrl>          ← من المتصفح مباشرة إلى R2، بجسم الملف
   Header: Content-Type: video/mp4

3) POST /api/upload/video/complete
   { key, type, id, subType, originalName }
   → { videoUrl, key, sizeBytes, mimeType }
```

الخطوة 3 **لا تثق بالعميل**: الخادم ينفّذ `HeadObject` على R2 ليتأكد أن الكائن
موجود فعلاً ويطابق النوع والحجم المسموح، ويحذفه إن خالف ذلك قبل أن يسجّله.
الرابط الموقّع يوقّع الـ `host` فقط، فلا يفرض نوعاً أو حجماً بنفسه — التحقق الفعلي
يحدث في الخطوة 3، والمفتاح مقيّد مسبقاً بالكيان الذي يملكه المستخدم.

مسار احتياطي للمقاطع الصغيرة (≤ 25MB) إن تعذّر الرفع المباشر:

```
POST /api/upload/video      (multipart: video)      → { videoUrl, key }
```

الحذف موحّد للصور والفيديو (كلاهما كائن في نفس الحاوية):

```
DELETE /api/upload          { imageUrl }  أو  { imageId }
```

### من الواجهة

```ts
import { uploadService } from '../services/api/upload.service';

const { url } = await uploadService.uploadVideo(
  file,
  { type: 'restaurants', id: restaurantId, subType: 'video' },
  (percent) => setProgress(percent)          // تقدّم حقيقي من XHR
);
```

الخدمة تتحقق من الصيغة والحجم في المتصفح أولاً، ثم تجرّب الرفع المباشر،
وتسقط تلقائياً إلى المسار عبر الخادم إن فشل (CORS غير مضبوط مثلاً).

---

## 7. بنية المفاتيح داخل الحاوية

```
restaurants/<id>/logo.jpg
restaurants/<id>/cover.jpg
restaurants/<id>/menu-items/item_<ts>.webp
restaurants/<id>/videos/video_<ts>_<name>.mp4
stores/<id>/products/product_<ts>.jpg
stores/<id>/videos/...
advertisements/<id>/ad_<ts>.jpg
users/<id>/avatar.png
```

الفيديو معزول في مجلد `videos/` تحت كل كيان، ليسهل لاحقاً ضبط قاعدة
**Lifecycle** خاصة به (حذف تلقائي بعد مدة) دون المساس بالصور.

---

## 8. التحقق بعد الضبط

```bash
curl -s -X POST https://shamstores-5fa37cec9e6e.herokuapp.com/api/upload/video/presign -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"fileName":"clip.mp4","contentType":"video/mp4","size":1048576,"type":"restaurants"}'
```

```bash
curl -X PUT "<uploadUrl>" -H 'Content-Type: video/mp4' --data-binary @clip.mp4
```

```bash
curl -s -X POST https://shamstores-5fa37cec9e6e.herokuapp.com/api/upload/video/complete -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"key":"<key>","type":"restaurants"}'
```

```bash
curl -sI https://cdn.shamstores.com/<key> | head -3
```

الصيغة غير المدعومة يجب أن تُرجع `400`، وغياب إعدادات R2 يُرجع `503`.

---

## 9. التكلفة والصيانة

- **التخزين**: أول 10GB مجاناً شهرياً، ثم تسعيرة لكل GB إضافي.
- **الخروج (Egress)**: **مجاني** — وهذا سبب اختيار R2 للفيديو تحديداً؛
  نفس الحِمل على S3 يكلّف أضعافاً.
- **العمليات**: الكتابة أغلى من القراءة؛ لا شيء يُذكر بحجم الاستخدام هنا.
- الملفات المرفوعة من الخادم تحمل `Cache-Control: public, max-age=31536000, immutable`
  لأن اسم كل ملف يحمل طابعاً زمنياً فريداً — لا يُستبدل محتوى مفتاح موجود.
  الرفع المباشر من المتصفح لا يضبط الترويسة (المتصفح لا يرسلها)، لكن النطاق
  المخصص خلف Cloudflare يخزّنه مؤقتاً على أي حال؛ يمكنك فرض القاعدة عبر
  **Cache Rules** على `cdn.shamstores.com`.

> راجع صفحة تسعير R2 الرسمية للأرقام الحالية قبل أي حساب تكلفة.

---

## 10. مشاكل شائعة

| العَرَض | السبب | الحل |
|---|---|---|
| الرفع المباشر يفشل والتطبيق يعود للمسار البطيء | CORS غير مضبوط على الحاوية | القسم 4، وتأكد أن `AllowedMethods` تحوي `PUT` |
| الصور تظهر والفيديو لا يعمل في الإنتاج | توجيه `media-src` في CSP | مضبوط في `server.ts`؛ تحقق من عدم وجود وسيط يعيد كتابة الترويسة |
| `403` عند الـ PUT المباشر | انتهت صلاحية الرابط الموقّع (900 ثانية افتراضاً) | ارفع فور استلام الرابط، أو زد `R2_PRESIGN_EXPIRES` للملفات الكبيرة |
| الرابط العام يعطي 404 والملف موجود | `R2_PUBLIC_URL` خاطئ أو ينتهي بـ `/` | احذف الشرطة الأخيرة وتحقق من النطاق العام |
| صور قديمة مكسورة بعد تغيير الحاوية | الروابط القديمة مخزّنة كاملة في قاعدة البيانات | `keyFromUrl` يتعامل مع روابط `r2.dev` القديمة عند الحذف؛ للعرض استخدم نطاقاً مخصصاً منذ البداية |
| `503 تخزين الوسائط غير مهيأ` | متغير R2 ناقص | راجع `heroku config` وابحث عن متغيرات `R2_` |
| فيديو 60MB يفشل بـ `H12` | ذهب عبر المسار الاحتياطي لا المباشر | أصلح CORS؛ المسار الاحتياطي محدود بـ 25MB عمداً |
