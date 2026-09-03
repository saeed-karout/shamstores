# نشر الواجهة على Cloudflare

بنية مقسّمة: الواجهة على Cloudflare، الـ API على Heroku، الوسائط على R2.
الـ Worker يجمعها على أصل واحد من منظور المتصفح.

```
shamstores.com          → Worker → Cloudflare (الواجهة المبنية)
*.shamstores.com        → Worker → Cloudflare (نفس الواجهة، تُميّز المتجر من المضيف)
  ├─ /api/*             → Worker → Heroku (Express + Prisma)
  └─ /socket.io/*       → Worker → Heroku (Socket.IO)
cdn.shamstores.com      → R2: shamstores-images (لا يمرّ بالـ Worker)
```

> البديل الأبسط قائم وجاهز: تطبيق Heroku يقدّم الواجهة بنفسه
> (`SERVE_FRONTEND=true`)، فيصبح كل شيء على أصل واحد بلا Worker إطلاقاً.
> اختيار Cloudflare يشتري تخزيناً مؤقتاً على الحافة ومرونة في توجيه النطاقات،
> ويكلّف الاعتماد على الـ Worker في كل طلب API.

---

## 1. الـ Worker

الكود في [`workers/subdomain-proxy/`](../../workers/subdomain-proxy/index.js).
ترتيب القواعد مقصود:

| # | الشرط | الوجهة |
|---|---|---|
| 0 | `cdn.shamstores.com` | تمرير مباشر — R2 |
| 1 | `/api/*` أو `/socket.io/*` | **Heroku** |
| 2 | `/assets/*` | النطاق الرئيسي (نسخة واحدة مخزّنة مؤقتاً) |
| 3 | أي مضيف آخر (نطاق فرعي أو مخصص) | النطاق الرئيسي، **بنفس المسار** |
| 4 | النطاق الرئيسي و`www` | الأصل كما هو |

### ⚠️ المسارات (Routes) يجب أن تشمل النطاقين

```
shamstores.com/*
*.shamstores.com/*
```

لو غطّت النطاقات الفرعية وحدها، فإن `/api` على النطاق الرئيسي لن يُمرَّر
وستفشل الواجهة كلها — لأن الحزمة تنادي `/api` نسبياً.

### لماذا لا يُسبَق المسار باسم النطاق الفرعي

إعادة الكتابة إلى `shamstores.com/<subdomain>/<path>` تغيّر **الطلب الخلفي
فقط**؛ عنوان المتصفح يبقى كما هو، فـ React Router لا يرى البادئة إطلاقاً.
الواجهة تتعرّف على المتجر من المضيف عبر `getCurrentSubdomain()` في
`components/PublicRouter.tsx`. ونفس الشيء للنطاقات المخصصة: أول جزء من
`mystore.com` ليس معرّف المتجر.

### النشر

```bash
npx wrangler deploy --cwd workers/subdomain-proxy
```

---

## 2. متغيرات البناء

`VITE_*` تُحقن **داخل الحزمة وقت البناء**. ضبطها بعد البناء لا يفعل شيئاً.

`frontend/.env.production` متجاهَل في git (لا يحوي أسراراً، لكن `.gitignore`
يستبعد النمط كله). أنشئه بهذا المحتوى قبل أي بناء إنتاجي:

```ini
VITE_API_URL=/api
VITE_BASE_URL=

VITE_APP_DOMAIN=shamstores.com
VITE_FRONTEND_URL=https://shamstores.com

VITE_R2_PUBLIC_URL=https://cdn.shamstores.com
VITE_MAX_VIDEO_MB=100
```

- `VITE_API_URL=/api` — نسبي، لأن الـ Worker يمرّره إلى Heroku.
- `VITE_BASE_URL=` **فارغ عمداً**: `useSocket` يسقط إلى
  `window.location.origin` فيمرّ بالـ Worker. تركه بلا تعريف كان سيرث قيمة
  `.env` التطويرية ويدفن `localhost:5000` في حزمة الإنتاج.
- بقية المتغيرات (Firebase، WhatsApp) تُورَّث من `frontend/.env`.

> لو تعطّل الـ Worker أو لم يُربط بالمسارات، بدّل مؤقتاً إلى رابط مطلق
> (`VITE_API_URL=https://<app>.herokuapp.com/api` و`VITE_BASE_URL` مثله)
> وأعد البناء. الخادم يسمح بالأصول عبر CORS في هذه الحالة.

---

## 3. البناء والنشر

```bash
npm --prefix frontend run build
```

```bash
npx wrangler deploy --cwd frontend
```

`frontend/wrangler.toml` يشير إلى `./dist`، و`public/_redirects` فيه
`/* /index.html 200` ليعمل توجيه SPA لكل المسارات.

---

## 4. التحقق بعد البناء (لا تتخطَّه)

```bash
grep -ro '"/api"' frontend/dist/assets/ | wc -l
```

يجب أن يكون أكبر من صفر. وهذان يجب أن يكونا **صفراً**:

```bash
grep -ro "herokuapp.com" frontend/dist/assets/ | wc -l
```

```bash
grep -ro "pub-0f129677" frontend/dist/assets/ | wc -l
```

أما `localhost:5000` فوجوده طبيعي: فروع تطوير محروسة بفحص `isLocal` لا
تُنفَّذ على نطاق حقيقي.

> ⚠️ الخطأ الذي وقع سابقاً: بُنيت الواجهة و`VITE_API_URL` فارغ، فحُقن
> `http://localhost:5000/api` في حزمة الإنتاج وكانت كل نداءات الـ API معطّلة
> على الموقع المنشور. هذه الخطوة تمنع تكراره.

---

## 5. نقاط تستحق الانتباه

- **CORS**: مع تمرير `/api` عبر الـ Worker تصبح الطلبات same-origin — بلا
  ترويسة `Origin` وبلا preflight. الخادم يقبلها عبر
  `if (!origin) return callback(null, true)`.
- **R2**: رفع الفيديو المباشر يذهب إلى `cdn.shamstores.com` لا عبر الـ Worker،
  فيبقى **سياسة CORS على الحاوية شرطاً** — راجع [cloudflare-r2.md](./cloudflare-r2.md).
- **Socket.IO والنطاقات الفرعية**: `getSocketCorsOrigin()` في
  `backend/src/realtime/socket.ts` يبني قائمة أصول **حرفية**
  (`CLIENT_URL`، النطاق الرئيسي، `www`) بلا مطابقة `*.shamstores.com`،
  خلافاً لـ CORS الخاص بالـ HTTP الذي يطابقها بتعبير نمطي. ترقية WebSocket
  ترسل ترويسة `Origin` دائماً حتى على نفس الأصل، فاتصال السوكِت من نطاق
  فرعي **يُرفض**. لا يظهر الأثر اليوم لأن السوكِت يتطلب رمز دخول ولوحات
  التحكم على النطاق الرئيسي — لكنه ينفجر أول ما تُقدَّم لوحة تاجر على نطاقه.
- **الجلسة**: المصادقة برأس `Authorization` لا بكوكي، فلا مشكلة عبر الأصول.
