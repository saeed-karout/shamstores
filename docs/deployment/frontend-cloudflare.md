# نشر الواجهة على Cloudflare

بنية مقسّمة: الواجهة على Cloudflare، الـ API على Heroku، الوسائط على R2.

```
shamstores.com          → Cloudflare (الواجهة المبنية)
*.shamstores.com        → Worker: subdomain-proxy → Cloudflare
cdn.shamstores.com      → R2: shamstores-images
shamstores-…herokuapp.com → Heroku: Express + Prisma (الـ API)
```

> البديل الأبسط قائم وجاهز: تطبيق Heroku يقدّم الواجهة بنفسه
> (`SERVE_FRONTEND=true`)، فيصبح كل شيء على أصل واحد بلا CORS ولا Worker.
> اختيار Cloudflare يشتري تخزيناً مؤقتاً على الحافة ومرونة في توجيه النطاقات،
> ويكلّف تعقيد الأصلين المختلفين.

---

## 1. متغيرات البناء

`VITE_*` تُحقن **داخل الحزمة وقت البناء**. ضبطها بعد البناء لا يفعل شيئاً.

`frontend/.env.production` متجاهَل في git (لا يحوي أسراراً، لكن `.gitignore`
يستبعد النمط كله). أنشئه بهذا المحتوى قبل أي بناء إنتاجي:

```ini
VITE_API_URL=https://shamstores-5fa37cec9e6e.herokuapp.com/api
VITE_BASE_URL=https://shamstores-5fa37cec9e6e.herokuapp.com

VITE_APP_DOMAIN=shamstores.com
VITE_FRONTEND_URL=https://shamstores.com

VITE_R2_PUBLIC_URL=https://cdn.shamstores.com
VITE_MAX_VIDEO_MB=100
```

بقية المتغيرات (Firebase، WhatsApp) تُورَّث من `frontend/.env` — يحمّل Vite
`.env` أولاً ثم يطغى `.env.production` عليه في وضع البناء، فيبقى ملف التطوير
مشيراً إلى `localhost:5000` بلا تعارض.

**لماذا روابط مطلقة:** الـ Worker الحالي لا يمرّر `/api` إلى Heroku، فالمسار
النسبي لا يجد خادماً. و`useSocket` يسقط إلى `window.location.origin` — وهو
Cloudflare الذي لا يشغّل Socket.IO — ما لم يُضبط `VITE_BASE_URL`.

> ⚠️ الخطأ الذي وقع سابقاً: بُنيت الواجهة و`VITE_API_URL` فارغ، فحُقن
> `http://localhost:5000/api` في حزمة الإنتاج وكانت كل نداءات الـ API معطّلة.
> تحقق دائماً بعد البناء (القسم 3).

---

## 2. البناء والنشر

```bash
npm --prefix frontend run build
```

```bash
npx wrangler deploy --cwd frontend
```

`frontend/wrangler.toml` يشير إلى `./dist` كمجلد الأصول الثابتة،
و`public/_redirects` فيه `/* /index.html 200` ليعمل توجيه SPA لكل المسارات.

---

## 3. التحقق بعد البناء (لا تتخطَّه)

```bash
grep -ro "herokuapp.com" frontend/dist/assets/ | wc -l
```

يجب أن يكون أكبر من صفر. وللتأكد أن الرابط القديم للوسائط لم يبقَ:

```bash
grep -ro "pub-0f129677" frontend/dist/assets/ | wc -l
```

يجب أن يكون صفراً. أما `localhost:5000` فوجوده طبيعي: فروع تطوير محروسة بفحص
`isLocal` لا تُنفَّذ على نطاق حقيقي.

---

## 4. الـ Worker (`subdomain-proxy`)

يوجّه النطاقات الفرعية ونطاقات التجّار المخصصة إلى الواجهة. ثلاث ملاحظات:

### أ. تحقّق من سطر `www`

يجب أن يكون مقارنة نصية بسيطة:

```js
if (hostname !== 'shamstores.com' && hostname !== 'www.shamstores.com') {
```

إن تسرّب إليه أي تنسيق آخر فلن يطابق `www.shamstores.com` أبداً، فيُعامَل
كنطاق فرعي اسمه `www` ويُعاد كتابته إلى `shamstores.com/www/…`.

### ب. إعادة كتابة المسار لا لزوم لها

القاعدة التي تحوّل `pizza.shamstores.com/x` إلى `shamstores.com/pizza/x`
تغيّر **الطلب الخلفي فقط** — عنوان المتصفح يبقى كما هو، فـ React Router لا
يرى `/pizza` إطلاقاً. الواجهة تكتشف المتجر من المضيف نفسه عبر
`getCurrentSubdomain()` في `components/PublicRouter.tsx`.

النتيجة عملياً واحدة لأن `_redirects` يُرجع `index.html` لأي مسار، لكن
القاعدة تضيف طلباً فرعياً بلا فائدة. تمرير المسار كما هو مع تبديل المضيف
فقط أبسط وأقل عرضة لحلقات الطلبات الفرعية داخل نفس النطاق.

نفس الملاحظة تنطبق على النطاقات المخصصة: `mystore.com` ليس أول جزء منه
هو الـ slug، والواجهة تتعامل معه عبر `isCustomDomain()`.

### ج. لا قاعدة لـ `/api`

هذا ما يفرض الروابط المطلقة أعلاه. إضافة قاعدة تمرير تُلغي CORS من المعادلة
كلياً وتسمح بالعودة إلى `VITE_API_URL=/api`:

```js
if (pathname.startsWith('/api/')) {
  const upstream = new URL(request.url);
  upstream.hostname = 'shamstores-5fa37cec9e6e.herokuapp.com';
  return fetch(upstream.toString(), request);
}
```

توضع **قبل** قاعدة النطاقات الفرعية. وتذكّر أن Socket.IO يحتاج ترقية
WebSocket — تحقق من عمله عبر الـ Worker قبل الاعتماد عليه.

---

## 5. أثر الأصلين المختلفين

- **CORS**: الخادم يسمح بـ `shamstores.com` و`www` وكل `*.shamstores.com`
  ونطاقات التجّار الموثّقة — مضبوط في `backend/src/server.ts`.
- **preflight**: كل طلب `POST/PUT/DELETE` يسبقه `OPTIONS`. مدعوم عبر
  `app.options('*', cors(corsOptions))`.
- **R2**: رفع الفيديو المباشر يحتاج `AllowedOrigins` في سياسة CORS على
  الحاوية تشمل نفس الأصول — راجع [cloudflare-r2.md](./cloudflare-r2.md).
- **الجلسة**: المصادقة برأس `Authorization` لا بكوكي، فلا مشكلة عبر الأصول.
