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

## 3. إنشاء التطبيق

```bash
heroku create shamstores-app --stack heroku-24
```

---

## 4. قاعدة البيانات (MySQL عبر JawsDB)

Heroku لا يوفّر MySQL أصلياً، لذا نستخدم إضافة JawsDB:

```bash
heroku addons:create jawsdb:kitefin --app shamstores-app
```

الإضافة تضبط متغير `JAWSDB_URL` تلقائياً. التطبيق يُسقطه على `DATABASE_URL`
في `backend/src/config/env.ts`، فلا حاجة لضبط `DATABASE_URL` يدوياً.

> إذا كنت تستخدم قاعدة بيانات خارجية بدل الإضافة، اضبط `DATABASE_URL` بنفسك
> وتأكد من السماح لعناوين Heroku في جدار حماية قاعدة البيانات.

لعرض الرابط:

```bash
heroku config:get JAWSDB_URL --app shamstores-app
```

---

## 5. متغيرات البيئة

### الإلزامية

```bash
# ولّد مفتاحاً قوياً أولاً:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

heroku config:set --app shamstores-app \
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
heroku config:set --app shamstores-app \
  VITE_API_URL=/api \
  VITE_APP_DOMAIN=shamstores.com \
  VITE_FRONTEND_URL=https://shamstores.com
```

> `VITE_API_URL=/api` هو الصحيح للنشر بتطبيق واحد. لو تركته فارغاً فالتطبيق
> يستنتج `/api` على نفس الأصل تلقائياً — لكن ضبطه صراحةً أوضح.
>
> ⚠️ لا تضع أي سرّ في متغير يبدأ بـ `VITE_` — كل قيمه مرئية لأي زائر.

### الصور (Cloudflare R2)

```bash
heroku config:set --app shamstores-app \
  R2_ACCOUNT_ID=... R2_BUCKET_NAME=... R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... R2_ENDPOINT=... R2_PUBLIC_URL=...
```

> نظام ملفات Heroku مؤقت — أي ملف يُكتب على القرص يختفي عند إعادة تشغيل الدينو.
> رفع الصور **يجب** أن يمرّ عبر R2. لا تعتمد على `backend/uploads`.

### البريد

```bash
heroku config:set --app shamstores-app \
  SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASSWORD=... \
  SMTP_FROM_EMAIL=... SMTP_FROM_NAME="Sham Stores"
```

> إن كان SMTP مضبوطاً فسيُفعَّل التحقق من البريد تلقائياً عند التسجيل والدخول.
> استعادة كلمة المرور تعتمد على SMTP أيضاً.

### Firebase (اختياري — تسجيل الدخول عبر Google)

```bash
heroku config:set --app shamstores-app \
  FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=...
heroku config:set --app shamstores-app FIREBASE_PRIVATE_KEY="$(cat key.pem)"
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
heroku logs --tail --app shamstores-app
```

---

## 7. تهيئة مخطّط قاعدة البيانات

المشروع لا يستخدم ملفات migration، بل `prisma db push`.
**لا تُشغّل هذا تلقائياً في مرحلة release** — قد يحذف أعمدة. شغّله يدوياً وبوعي:

```bash
heroku run --app shamstores-app "npm --prefix backend run prisma:db-push"
```

الخطط وإعدادات المنصة الافتراضية تُزرع تلقائياً عند أول إقلاع
(`seedPlans` و`seedPlatformSettings`) إذا كانت الجداول فارغة.

### إنشاء حساب سوبر أدمن

```bash
heroku run --app shamstores-app bash
# ثم داخل الجلسة، استخدم سكربتات backend/src/scripts أو أدخل الصف يدوياً
```

---

## 8. النطاقات و SSL

### النطاق الرئيسي

```bash
heroku domains:add shamstores.com --app shamstores-app
heroku domains:add www.shamstores.com --app shamstores-app
heroku certs:auto:enable --app shamstores-app
```

ثم أضف سجلات DNS التي يعرضها الأمر التالي عند مزوّد نطاقك:

```bash
heroku domains --app shamstores-app
```

### النطاقات الفرعية للتجّار (`*.shamstores.com`)

```bash
heroku domains:add "*.shamstores.com" --app shamstores-app
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
   heroku domains:add mystore.com --app shamstores-app
   ```

> الخطوة 3 يدوية بطبيعتها على Heroku. لأتمتتها لاحقاً استخدم
> [Platform API](https://devcenter.heroku.com/articles/platform-api-reference#domain)
> من داخل `verifyCustomDomain`، أو ضع Cloudflare for SaaS أمام التطبيق.

---

## 9. التحقق بعد النشر

```bash
APP=https://shamstores-app.herokuapp.com

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

## 10. تقليل التكلفة والصيانة

- **الدينو**: `basic` يكفي للبداية؛ الدينو المجاني/eco ينام ويُبطئ أول طلب.
- **السجلات**: `heroku logs --tail`. في الإنتاج `console.log` مُسكَت عمداً؛
  لتفعيله مؤقتاً للتشخيص: `heroku config:set VERBOSE_LOGS=true` ثم أعِده إلى false.
- **إعادة التشغيل**: `heroku ps:restart --app shamstores-app`.
- **التراجع**: `heroku releases --app shamstores-app` ثم
  `heroku rollback v<رقم> --app shamstores-app`.

---

## 11. مشاكل شائعة

| العَرَض | السبب المرجّح | الحل |
|---|---|---|
| الإقلاع يفشل فوراً بخطأ `إعدادات البيئة غير صالحة` | `JWT_SECRET` غائب أو قصير | ولّد مفتاحاً 32 حرفاً فأكثر واضبطه |
| صفحة بيضاء والـ API يعمل | الواجهة لم تُبنَ | تحقق من سجلات البناء؛ `frontend/dist` يجب أن يُنتَج |
| الواجهة تنادي `localhost:5000` | `VITE_API_URL` كان خاطئاً وقت البناء | صحّحه ثم أعِد النشر (البناء يحقن القيمة) |
| `P1001 Can't reach database` | `DATABASE_URL`/`JAWSDB_URL` غير مضبوط | تحقق من `heroku config` |
| النطاق المخصص لا يفتح المتجر | لم يُضَف إلى Heroku، أو التحقق لم يكتمل | راجع القسم 8 |
| `429` بسرعة على الدخول | حد المعدل | متوقع؛ 10 محاولات لكل 15 دقيقة لكل (IP + بريد) |
| رفع الصور يعمل ثم تختفي | تُحفظ على قرص الدينو المؤقت | اضبط متغيرات R2 |

---

## 12. قائمة تحقق قبل أول نشر إنتاجي

- [ ] `JWT_SECRET` جديد وقوي (لا تعيد استخدام مفتاح التطوير)
- [ ] `NODE_ENV=production`
- [ ] `APP_DOMAIN` و`CLIENT_URL` و`VITE_APP_DOMAIN` تطابق نطاقك الفعلي
- [ ] متغيرات R2 مضبوطة (وإلا ستضيع كل الصور)
- [ ] متغيرات SMTP مضبوطة (وإلا لن تعمل استعادة كلمة المرور)
- [ ] `prisma db push` نُفّذ مرة واحدة
- [ ] حساب سوبر أدمن أُنشئ وكلمة مروره قوية
- [ ] `heroku certs:auto:enable` مُفعَّل
- [ ] `/health` يُرجع 200
- [ ] `frontend/.env` غير مُتتبَّع في Git (أُزيل من التتبع بالفعل)
