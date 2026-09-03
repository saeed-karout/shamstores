# النشر على Heroku — دليل كامل

نشر **تطبيق Heroku واحد** يقدّم الـ API (Express + Prisma) وملفات الواجهة المبنية (Vite)
من نفس الأصل. هذا يلغي مشاكل CORS ويجعل النطاقات المخصصة تعمل بلا إعداد إضافي.

---

## 1. البنية

```
digital-menu-saas/
├── package.json      ← جذر المستودع: سكربتات البناء والتشغيل التي يستخدمها Heroku
├── Procfile          ← web: node backend/dist/server.js
├── app.json          ← وصف التطبيق ومتغيراته (لزر Deploy to Heroku ولمراجعة الإعدادات)
├── .node-version     ← 20.20.2
├── backend/          ← Express + Prisma  → يُبنى إلى backend/dist
└── frontend/         ← React + Vite      → يُبنى إلى frontend/dist
```

عند التشغيل، `backend/src/server.ts` يبحث عن `frontend/dist/index.html`.
إن وُجد قدّمه مع SPA fallback لكل المسارات غير المعروفة، وإلا عمل كـ API فقط.
يتحكم بذلك المتغير `SERVE_FRONTEND` (الافتراضي `true`).

**تسلسل بناء Heroku:**

1. `npm install` في الجذر (لا تبعيات فعلية هناك)
2. `heroku-postbuild` → `npm ci` في `backend` و`frontend` ثم بناؤهما
3. `npm start` → `node backend/dist/server.js`

---

## 2. المتطلبات

- حساب Heroku + [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
- Git، والفرع الذي تريد نشره
- بطاقة مضافة إلى الحساب (مطلوبة حتى للإضافات المجانية وللـ SSL)

```bash
heroku login
```

---

## 3. التطبيق

تطبيق `shamstores` **موجود مسبقاً** على الحساب (stack `heroku-24`، منطقة `us`).
اربط المستودع المحلي به:

```bash
heroku git:remote -a shamstores
```

لإنشاء تطبيق جديد من الصفر بدلاً منه:

```bash
heroku create <اسم-جديد> --stack heroku-24
```

---

## 4. قاعدة البيانات (MySQL عبر JawsDB)

Heroku لا يوفّر MySQL أصلياً، لذا نستخدم إضافة JawsDB:

```bash
heroku addons:create jawsdb:kitefin --app shamstores
```

الإضافة تضبط متغير `JAWSDB_URL` تلقائياً. التطبيق يُسقطه على `DATABASE_URL`
في `backend/src/config/env.ts`، فلا حاجة لضبط `DATABASE_URL` يدوياً.

> إذا كنت تستخدم قاعدة بيانات خارجية بدل الإضافة، اضبط `DATABASE_URL` بنفسك
> وتأكد من السماح لعناوين Heroku في جدار حماية قاعدة البيانات.

لعرض الرابط:

```bash
heroku config:get JAWSDB_URL --app shamstores
```

---

## 5. متغيرات البيئة

### الطريق السريع: سكربت الضبط

`scripts/heroku-config.ps1` ينفّذ كل ما في هذا القسم دفعة واحدة: يزوّد JawsDB،
يقرأ أسرار R2 وSMTP وFirebase من `backend/.env` ويمرّرها إلى Heroku مباشرة
(بلا طباعتها)، ويولّد `JWT_SECRET` إنتاجياً جديداً — ولا يلمسه إن كان مضبوطاً
مسبقاً، لأن تغييره يُخرج كل المستخدمين من جلساتهم.

```bash
powershell -ExecutionPolicy Bypass -File scripts/heroku-config.ps1
```

استدعاء واحد لـ `config:set` = إعادة تشغيل واحدة للتطبيق. السكربت قابل لإعادة
التشغيل بأمان. الأقسام التالية تشرح المتغيرات نفسها لمن يريد ضبطها يدوياً.

### الإلزامية

```bash
# ولّد مفتاحاً قوياً أولاً:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

heroku config:set --app shamstores \
  NODE_ENV=production \
  JWT_SECRET="<الصق الناتج هنا>" \
  JWT_EXPIRE=7d \
  APP_DOMAIN=shamstores.com \
  CLIENT_URL=https://shamstores.com \
  TRUST_PROXY=1 \
  SERVE_FRONTEND=true
```

> ⚠️ التطبيق **يرفض الإقلاع في الإنتاج** إذا كان `JWT_SECRET` غائباً أو أقصر من
> 32 حرفاً أو يساوي قيمة افتراضية معروفة. هذا مقصود.

### متغيرات الواجهة (وقت البناء)

`VITE_*` تُحقن داخل حزمة الجافاسكربت أثناء البناء، لذا يجب ضبطها **قبل** أول نشر:

```bash
heroku config:set --app shamstores \
  VITE_API_URL=/api \
  VITE_APP_DOMAIN=shamstores.com \
  VITE_FRONTEND_URL=https://shamstores.com
```

> `VITE_API_URL=/api` هو الصحيح للنشر بتطبيق واحد. لو تركته فارغاً فالتطبيق
> يستنتج `/api` على نفس الأصل تلقائياً — لكن ضبطه صراحةً أوضح.
>
> ⚠️ لا تضع أي سرّ في متغير يبدأ بـ `VITE_` — كل قيمه مرئية لأي زائر.

### الوسائط — الصور والفيديو (Cloudflare R2)

```bash
heroku config:set --app shamstores \
  R2_ACCOUNT_ID=... R2_BUCKET_NAME=... R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... R2_ENDPOINT=... R2_PUBLIC_URL=... \
  R2_MAX_VIDEO_MB=100 R2_MAX_DIRECT_VIDEO_MB=25
```

ومتغيرات الواجهة المقابلة (تُحقن وقت البناء):

```bash
heroku config:set --app shamstores \
  VITE_R2_PUBLIC_URL=https://cdn.shamstores.com VITE_MAX_VIDEO_MB=100
```

> نظام ملفات Heroku مؤقت — أي ملف يُكتب على القرص يختفي عند إعادة تشغيل الدينو.
> رفع الصور والفيديو **يجب** أن يمرّ عبر R2. لا تعتمد على `backend/uploads`.
>
> الفيديو يُرفع من المتصفح **مباشرة** إلى R2 برابط موقّع، فلا تحدّه مهلة الـ 30 ثانية
> على Heroku — لكن هذا يتطلب ضبط **CORS** على الحاوية.
>
> 📄 الإعداد الكامل خطوة بخطوة: [cloudflare-r2.md](./cloudflare-r2.md)

### البريد

```bash
heroku config:set --app shamstores \
  SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASSWORD=... \
  SMTP_FROM_EMAIL=... SMTP_FROM_NAME="Sham Stores"
```

> إن كان SMTP مضبوطاً فسيُفعَّل التحقق من البريد تلقائياً عند التسجيل والدخول.
> استعادة كلمة المرور تعتمد على SMTP أيضاً.

### Firebase (اختياري — تسجيل الدخول عبر Google)

```bash
heroku config:set --app shamstores \
  FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=...
heroku config:set --app shamstores FIREBASE_PRIVATE_KEY="$(cat key.pem)"
```

---

## 6. النشر

```bash
# من الفرع الحالي
git push heroku HEAD:main

# أو من فرع محدد
git push heroku ui-ux/storefront-redesign:main
```

تابع البناء:

```bash
heroku logs --tail --app shamstores
```

---

## 7. تهيئة مخطّط قاعدة البيانات

المشروع لا يستخدم ملفات migration، بل `prisma db push`.
**لا تُشغّل هذا تلقائياً في مرحلة release** — قد يحذف أعمدة. شغّله يدوياً وبوعي:

```bash
heroku run --app shamstores "npm --prefix backend run prisma:db-push"
```

الخطط وإعدادات المنصة الافتراضية تُزرع تلقائياً عند أول إقلاع
(`seedPlans` و`seedPlatformSettings`) إذا كانت الجداول فارغة.

### لماذا لا يقرأ Prisma رابط قاعدة البيانات وحده

إضافة JawsDB تضبط `JAWSDB_URL` لا `DATABASE_URL`. التطبيق يُسقط الاسم عند
الإقلاع في `src/config/env.ts`، لكن **Prisma CLI عملية منفصلة لا تمرّ بذلك**
الكود، فكانت الأوامر تفشل بـ:

```
Error code: P1012
error: Environment variable not found: DATABASE_URL.
```

لذلك تمرّ سكربتات Prisma عبر `backend/scripts/prisma.js` — غلاف يُسقط الاسم
بنفس منطق `env.ts` قبل استدعاء الأداة. محلياً لا يفعل شيئاً لأن `DATABASE_URL`
موجود في `backend/.env`.

لو احتجت تشغيل Prisma بلا الغلاف (نسخة أقدم من الكود مثلاً):

```bash
heroku run --app shamstores 'DATABASE_URL=$JAWSDB_URL npx prisma db push --schema backend/prisma/schema.prisma'
```

> الاقتباس **مفرد** عمداً: نريد توسيع `$JAWSDB_URL` داخل الدينو لا في صدفتك المحلية.

### إنشاء حساب سوبر أدمن

```bash
heroku run --app shamstores bash
# ثم داخل الجلسة، استخدم سكربتات backend/src/scripts أو أدخل الصف يدوياً
```

---

## 8. النطاقات و SSL

### الوضع الحالي: النطاق على Cloudflare Pages

قبل أي شيء — سجلات DNS الحالية تشير إلى نشر Pages، لا إلى Heroku:

```
shamstores.com     CNAME  shamstores.pages.dev   (Proxied)
www.shamstores.com CNAME  shamstores.pages.dev   (Proxied)
*.shamstores.com   CNAME  shamstores.pages.dev   (Proxied)
cdn.shamstores.com R2     shamstores-images      (Proxied)  ← الوسائط، يبقى كما هو
```

أول ثلاثة سجلات **يجب أن تُعاد توجيهها إلى Heroku** وإلا بقي الموقع يُخدَم من Pages.
سجل `cdn` لا يُمسّ — هو نطاق R2 وشأنه منفصل.

الترتيب الآمن للتبديل:

1. انشر على Heroku وتأكد أن كل شيء يعمل على `shamstores-5fa37cec9e6e.herokuapp.com` أولاً.
2. `heroku domains:add` للنطاقات الثلاثة — يعطيك هدف DNS لكل واحد
   (`*.herokudns.com`).
3. بدّل وجهة السجلات الثلاثة من `shamstores.pages.dev` إلى أهداف Heroku.
4. احذف نشر Pages أو أوقفه لاحقاً — لا تحذفه قبل أن تستقر Heroku.

> ⚠️ الواجهة المنشورة حالياً على Pages مبنية بـ `VITE_API_URL=http://localhost:5000/api`،
> أي أن نداءات الـ API فيها معطّلة أصلاً. لا تقلق من «كسر» شيء يعمل.

### SSL خلف Cloudflare (مهم)

السجلات **Proxied** (السحابة البرتقالية)، وهذا مقصود ومطلوب للنطاقات الفرعية للتجّار.
لكنه يعني أن إدارة شهادات Heroku التلقائية (ACM) **لن تستطيع التحقق** — فطلب
التحقق يصل من Cloudflare لا من Heroku.

الحل الصحيح لهذه البنية:

1. Cloudflare → SSL/TLS → Overview → اضبط الوضع على **Full (Strict)**.
2. Cloudflare → SSL/TLS → Origin Server → **Create Certificate**
   لـ `shamstores.com` و`*.shamstores.com` (صلاحية 15 سنة).
3. ارفعها إلى Heroku:

```bash
heroku certs:add origin-cert.pem origin-key.pem --app shamstores
```

هكذا تُصدر Cloudflare شهادة الحافة للزوار (تشمل `*.shamstores.com` تلقائياً)،
ويثق Cloudflare بشهادة Heroku الأصلية — بلا ACM وبلا شهادة wildcard مدفوعة من Heroku.

> البديل الأبسط لو تخلّيت عن النطاقات الفرعية: اجعل السجلات **DNS only** (رمادية)
> ودع `heroku certs:auto:enable` يتولّى الأمر. لكنك تخسر عندها `*.shamstores.com`.

### النطاق الرئيسي

```bash
heroku domains:add shamstores.com --app shamstores
heroku domains:add www.shamstores.com --app shamstores
heroku certs:auto:enable --app shamstores
```

ثم أضف سجلات DNS التي يعرضها الأمر التالي عند مزوّد نطاقك:

```bash
heroku domains --app shamstores
```

### النطاقات الفرعية للتجّار (`*.shamstores.com`)

```bash
heroku domains:add "*.shamstores.com" --app shamstores
```

> ⚠️ شهادة wildcard على Heroku تتطلب رفع شهادة SSL خاصة بك
> (`heroku certs:add`) — إدارة الشهادات التلقائية (ACM) **لا تصدر شهادات
> wildcard**. الخيار العملي: ضع Cloudflare أمام Heroku واستخدم شهادته
> الشاملة، مع تفعيل وضع Full (Strict).

### النطاقات المخصصة للتجّار

لكل نطاق يربطه تاجر:

1. التاجر يضيف السجلين اللذين تعرضهما شاشة «الدومين» في لوحته:
   - `TXT` على `_shamstores-verify.<نطاقه>` بقيمة رمز التحقق
   - `CNAME` يشير إلى `<subdomain>.shamstores.com`
2. التاجر يضغط «تحقق وفعّل» — الخادم يفحص DNS فعلياً ولا يُفعّل النطاق قبل نجاح الفحص.
3. **أنت** تضيف النطاق إلى Heroku ليُصدر له شهادة:

   ```bash
   heroku domains:add mystore.com --app shamstores
   ```

> الخطوة 3 يدوية بطبيعتها على Heroku. لأتمتتها لاحقاً استخدم
> [Platform API](https://devcenter.heroku.com/articles/platform-api-reference#domain)
> من داخل `verifyCustomDomain`، أو ضع Cloudflare for SaaS أمام التطبيق.

---

## 9. التحقق بعد النشر

```bash
APP=https://shamstores-5fa37cec9e6e.herokuapp.com

# فحص الصحة
curl -s $APP/health

# الـ API يستجيب
curl -s $APP/api

# مسار غير موجود يُرجع JSON لا HTML
curl -s $APP/api/does-not-exist

# ترويسات الأمان موجودة
curl -sI $APP/ | grep -iE "strict-transport|x-frame|x-content-type|content-security"

# حد المعدل يعمل على الدخول
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code} " -X POST $APP/api/auth/login \
    -H 'Content-Type: application/json' -d '{"email":"a@b.co","password":"wrong"}'
done; echo
# متوقع: عدة 401 ثم 429
```

---

## 10. التكلفة والصيانة

### الميزانية

الحساب مغطّى برصيد **Heroku for GitHub Students**: 13$ شهرياً لمدة 24 شهراً.

| المكوّن | الخطة | الكلفة | ملاحظة |
|---|---|---|---|
| الدينو | `basic` | 7$ | **الاختيار الصحيح** — لا ينام |
| الدينو | `eco` | 5$ | ينام بعد 30 دقيقة خمول؛ أول طلب بارد وبطيء |
| قاعدة البيانات | `jawsdb:kitefin` | مجاني | 5 ميغابايت تخزين |
| قاعدة البيانات | `jawsdb:leopard` | 10$ | القفزة التالية |

**التركيبة المختارة: `basic` + `kitefin` = 7$ شهرياً**، ضمن الرصيد بفائض 6$.

> `eco` مرفوض عمداً: واجهة المتجر يفتحها زبون على طاولة، وإقلاع بارد لعشر ثوانٍ
> تجربة سيئة. الفرق دولاران شهرياً.

> حدّ Kitefin (5MB) أقل رعباً مما يبدو هنا: **كل الوسائط في R2**، فالجداول
> تحمل نصوصاً وروابط فقط. لكنه جدار صلب — راقب الحجم من لوحة JawsDB، وحين
> يقترب فإما `heroku addons:upgrade jawsdb:leopard` (17$ إجمالاً، 4$ فوق الرصيد)
> أو نقل قاعدة البيانات إلى مزوّد MySQL خارجي وضبط `DATABASE_URL` يدوياً.

### الصيانة

- **الدينو**: `basic` يكفي للبداية؛ الدينو المجاني/eco ينام ويُبطئ أول طلب.
- **السجلات**: `heroku logs --tail`. في الإنتاج `console.log` مُسكَت عمداً؛
  لتفعيله مؤقتاً للتشخيص: `heroku config:set VERBOSE_LOGS=true` ثم أعِده إلى false.
- **إعادة التشغيل**: `heroku ps:restart --app shamstores`.
- **التراجع**: `heroku releases --app shamstores` ثم
  `heroku rollback v<رقم> --app shamstores`.

---

## 11. مشاكل شائعة

| العَرَض | السبب المرجّح | الحل |
|---|---|---|
| الإقلاع يفشل فوراً بخطأ `إعدادات البيئة غير صالحة` | `JWT_SECRET` غائب أو قصير | ولّد مفتاحاً 32 حرفاً فأكثر واضبطه |
| صفحة بيضاء والـ API يعمل | الواجهة لم تُبنَ | تحقق من سجلات البناء؛ `frontend/dist` يجب أن يُنتَج |
| الواجهة تنادي `localhost:5000` | `VITE_API_URL` كان خاطئاً وقت البناء | صحّحه ثم أعِد النشر (البناء يحقن القيمة) |
| `P1001 Can't reach database` | `DATABASE_URL`/`JAWSDB_URL` غير مضبوط | تحقق من `heroku config` |
| `P1012 Environment variable not found: DATABASE_URL` | Prisma CLI لا يمرّ بـ `config/env.ts` | استخدم سكربتات `prisma:*` (تمرّ بالغلاف) — راجع القسم 7 |
| `P2021 table does not exist` | المخطط لم يُدفَع بعد | نفّذ `prisma:db-push` مرة واحدة |
| النطاق المخصص لا يفتح المتجر | لم يُضَف إلى Heroku، أو التحقق لم يكتمل | راجع القسم 8 |
| `429` بسرعة على الدخول | حد المعدل | متوقع؛ 10 محاولات لكل 15 دقيقة لكل (IP + بريد) |
| رفع الصور يعمل ثم تختفي | تُحفظ على قرص الدينو المؤقت | اضبط متغيرات R2 |
| رفع الفيديو بطيء أو يفشل بـ `H12` | ذهب عبر الخادم لا مباشرة إلى R2 | اضبط CORS على الحاوية — راجع [cloudflare-r2.md](./cloudflare-r2.md) |
| مسارات الرفع تُرجع `503` | إعدادات R2 ناقصة | راجع `heroku config` وتحقق من متغيرات `R2_` |

---

## 12. قائمة تحقق قبل أول نشر إنتاجي

- [ ] `JWT_SECRET` جديد وقوي (لا تعيد استخدام مفتاح التطوير)
- [ ] `NODE_ENV=production`
- [ ] `APP_DOMAIN` و`CLIENT_URL` و`VITE_APP_DOMAIN` تطابق نطاقك الفعلي
- [ ] متغيرات R2 مضبوطة (وإلا ستضيع كل الصور) و`VITE_R2_PUBLIC_URL` كذلك
- [ ] سياسة CORS على حاوية R2 تسمح بـ `PUT` من نطاقك (شرط رفع الفيديو)
- [ ] متغيرات SMTP مضبوطة (وإلا لن تعمل استعادة كلمة المرور)
- [ ] `prisma db push` نُفّذ مرة واحدة
- [ ] حساب سوبر أدمن أُنشئ وكلمة مروره قوية
- [ ] `heroku certs:auto:enable` مُفعَّل
- [ ] `/health` يُرجع 200
- [ ] `frontend/.env` غير مُتتبَّع في Git (أُزيل من التتبع بالفعل)
