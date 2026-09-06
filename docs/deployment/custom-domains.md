# النطاقات المخصّصة — Cloudflare for SaaS

كيف يربط تاجرٌ على خطة تدعم الميزة نطاقه الخاص (`mystore.com`) بمتجره على
المنصّة، وكيف يتمّ ذلك آلياً بلا تدخّل من الإدارة.

---

## لماذا لا يكفي سجلّ CNAME

سجلّ `CNAME` صحيح يوصل طلب الزائر إلى شبكة Cloudflare. لكن الشبكة لا تملك
شهادة TLS باسم `mystore.com`، فتردّ بخطأ شهادة **قبل** أن يصل الطلب إلينا
أصلاً. الزائر يرى تحذير أمان لا متجراً.

الشهادة تُصدَر فقط حين يُسجَّل النطاق **Custom Hostname** في منطقتنا. كان
ذلك يُفعل يدوياً من لوحة Cloudflare لكل تاجر — أي أن كل نطاق ينتظر تدخّلاً
بشرياً. `backend/src/services/cloudflareSaas.service.ts` يجعل التسجيل جزءاً
من طلب التاجر نفسه.

---

## الإعداد لمرّة واحدة

### 1. لوحة Cloudflare

**SSL/TLS ← Custom Hostnames**

| الإعداد | القيمة |
|---|---|
| Fallback Origin | `fallback-origin.shamstores.com` |
| حالة الأصل الاحتياطي | يجب أن تكون **Active** |

الأصل الاحتياطي سجلٌّ **مُوكَّل** (السحابة برتقالية) في المنطقة. إليه توجَّه
كل طلبات النطاقات المخصّصة، فيلتقطها Worker `subdomain-proxy` ويقرأ المضيف
ويعرض المتجر الصحيح — مسار `*/*` يشمل النطاقات المخصّصة تلقائياً.

> ⚠️ الأصل الاحتياطي غير المفعّل يوقف التحقّق من **كل** النطاقات المخصّصة،
> لا نطاقاً واحداً. Cloudflare تقول ذلك في تنبيه صغير في أعلى الصفحة.

### 2. رمز API

**My Profile ← API Tokens ← Create Token ← Custom token**

| الصلاحية | النطاق |
|---|---|
| `Zone / SSL and Certificates / Edit` | المنطقة `shamstores.com` وحدها |

لا تستعمل «Global API Key»: يملك صلاحية كل شيء على الحساب، ونحن نحتاج
إصدار شهادات في منطقة واحدة.

### 3. متغيّرات البيئة على Heroku

اضبطها من لوحة Heroku (Settings ← Config Vars) أو من الطرفية عندك — لا
تُرسل الرمز في أي محادثة أو ملف داخل المستودع:

```bash
heroku config:set CLOUDFLARE_API_TOKEN=<الرمز> CLOUDFLARE_ZONE_ID=<معرّف المنطقة> --app <اسم التطبيق>
```

`CLOUDFLARE_ZONE_ID` يظهر في لوحة Cloudflare أسفل يمين صفحة نظرة عامة على
النطاق.

`CLOUDFLARE_FALLBACK_ORIGIN` اختياري — بغيابه تُستعمل
`fallback-origin.${APP_DOMAIN}`.

### 4. ترحيل قاعدة البيانات

الحقول الجديدة على `Restaurant` و`Store`:

```bash
npm --prefix backend run migration:run
```

| الحقل | المعنى |
|---|---|
| `customDomainHostnameId` | معرّف Custom Hostname عند Cloudflare |
| `customDomainStatus` | `pending` / `active` / `blocked` … |
| `customDomainSslStatus` | حالة الشهادة |
| `customDomainCheckedAt` | آخر مزامنة |
| `customDomainError` | آخر خطأ تحقّق، يُعرض للتاجر |

---

## ما يراه التاجر

**الإعدادات ← SEO & الدومين ← الدومين المخصص**

1. يكتب نطاقه ويضغط **اربط النطاق**.
2. الخادم يسجّله في Cloudflare فوراً، ويعيد **سجلّاً واحداً** يضيفه:

   | النوع | الاسم | القيمة |
   |---|---|---|
   | CNAME | `@` أو `www` | `fallback-origin.shamstores.com` |

3. الواجهة تسأل عن الحالة كل ٢٠ ثانية وتعرض ثلاث خطوات: تسجيل النطاق ←
   التحقّق من الملكية ← إصدار الشهادة.
4. حين تكتمل الثلاث يصبح `customDomainVerified = true` ويبدأ خدمة النطاق.

**التحقّق بطريقة HTTP** هو ما نطلبه من Cloudflare: يتحقّق بأن النطاق يشير
إلينا فعلاً، فلا يحتاج التاجر سجلاً ثانياً. وحين تعجز Cloudflare عن ذلك
تُعيد سجلّ `TXT` وتعرضه الواجهة تلقائياً بجانب الأوّل.

### النطاق الجذر (apex)

`CNAME` على الجذر ممنوع في معيار DNS. أكثر المزوّدين يقدّمون `ALIAS` أو
`ANAME` أو «CNAME flattening» بنفس القيمة — والشرح مكتوب تحت السجلّ في
الواجهة. البديل الأنظف: نقل إدارة النطاق إلى Cloudflare.

---

## لماذا لا يُخدَم النطاق قبل صدور الشهادة

`resolveBusinessByCustomDomain` تشترط `customDomainVerified: true`. ونحن
نرفع هذه الراية فقط حين يكون:

```
status === 'active' && ssl.status === 'active'
```

نطاق «مفعّل» بلا شهادة يعطي الزائر تحذير أمان لا صفحة — وعرض تحذير أمان
باسم متجر تاجر أسوأ من ألّا يعمل النطاق بعد.

---

## فكّ الربط

`DELETE /api/custom-domain/remove-domain` يحذف التسجيل من Cloudflare أيضاً.
بلا ذلك يبقى النطاق مسجّلاً في المنطقة إلى الأبد، ويمنع تاجراً آخر من ربطه،
ويُحتسب في حصّة النطاقات المخصّصة في اشتراك Cloudflare.

---

## بيئة بلا رمز

`isConfigured()` تُفحص قبل كل استدعاء. بغياب الرمز — التطوير المحلّي عادةً —
تعود الواجهة إلى المسار اليدوي القديم (`TXT` + `CNAME` مع تحقّق DNS من
الخادم)، وتقول ذلك للتاجر صراحةً بدل أن ترتدّ بخطأ غامض.

---

## المسارات

| المسار | الوظيفة |
|---|---|
| `POST /api/custom-domain/connect` | يسجّل النطاق ويعيد السجلّ المطلوب |
| `POST /api/custom-domain/refresh` | يسأل Cloudflare عن الحالة الآن |
| `GET /api/custom-domain/status` | الحالة، مع مزامنة صامتة ما دام النطاق منتظِراً |
| `DELETE /api/custom-domain/remove-domain` | فكّ الربط هنا وعندهم |
| `POST /api/custom-domain/verify-domain` | المسار اليدوي (بلا رمز Cloudflare) |

كلّها خلف `authenticate` + `authorize(['owner','super_admin'])`، والنطاق
المخصّص خلف `checkPlanFeature('custom_domain')` أيضاً.
