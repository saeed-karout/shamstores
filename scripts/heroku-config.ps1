# scripts/heroku-config.ps1
#
# يضبط تطبيق Heroku بالكامل: إضافة قاعدة البيانات + كل متغيرات البيئة.
#
# الأسرار تُقرأ من backend/.env محلياً وتُمرَّر مباشرة إلى Heroku — لا تُطبع
# على الشاشة ولا تُكتب في أي ملف. المطبوع هو أسماء المتغيرات فقط.
#
# التشغيل من جذر المستودع:
#   powershell -ExecutionPolicy Bypass -File scripts/heroku-config.ps1
#
# قابل لإعادة التشغيل: لا يولّد JWT_SECRET جديداً إن كان مضبوطاً مسبقاً
# (توليد مفتاح جديد يُخرج كل المستخدمين من جلساتهم).

param(
  [string]$App        = 'shamstores',
  [string]$EnvFile    = 'backend/.env',
  [string]$AppDomain  = 'shamstores.com',
  [string]$CdnUrl     = 'https://cdn.shamstores.com'
)

# ملاحظة: Continue لا Stop — PowerShell 5.1 يغلّف stderr الأوامر الأصلية في
# NativeCommandError، فـ Stop كان سيُسقط السكربت على تحذير عابر من heroku.
# أخطاؤنا نرفعها بـ throw صراحةً، وهي تعمل بصرف النظر عن هذا الإعداد.
$ErrorActionPreference = 'Continue'

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "!!  $msg" -ForegroundColor Yellow }

# ---------- فحوص أولية ----------

if (-not (Get-Command heroku -ErrorAction SilentlyContinue)) {
  throw "heroku CLI غير موجود في PATH. ثبّته بـ: npm install -g heroku"
}

$who = heroku auth:whoami 2>$null
if (-not $?) { throw "لست مسجّل الدخول. نفّذ: heroku login" }
Write-Step "الحساب: $who — التطبيق: $App"

if (-not (Test-Path $EnvFile)) { throw "لم أجد $EnvFile" }

# ---------- قراءة .env ----------

$envVars = @{}
foreach ($line in Get-Content $EnvFile -Encoding UTF8) {
  $trimmed = $line.Trim()
  if ($trimmed -eq '' -or $trimmed.StartsWith('#')) { continue }
  $parts = $trimmed -split '=', 2
  if ($parts.Count -ne 2) { continue }
  $key = $parts[0].Trim()
  $val = $parts[1]
  # نزع الاقتباس المحيط فقط — المحتوى الداخلي (مثل \n في مفتاح Firebase) يبقى حرفياً
  if ($val.Length -ge 2) {
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or
        ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
  }
  # كلمة مرور تطبيق Google تُعرض مقسّمة للقراءة (xxxx xxxx xxxx xxxx)، لكن
  # مصادقة SMTP ترفض المسافات وتردّ 535 BadCredentials. نُطبّعها هنا لأن
  # اللصق من صفحة Google يأتي بالمسافات دائماً.
  if ($key -eq 'SMTP_PASSWORD') { $val = $val -replace ' ', '' }

  $envVars[$key] = $val
}

# ---------- قاعدة البيانات ----------

$addons = heroku addons --app $App 2>&1 | Out-String
if ($addons -match 'jawsdb') {
  Write-Step "JawsDB مزوّدة مسبقاً — تخطّي"
} else {
  Write-Step "تزويد JawsDB (الخطة المجانية kitefin)"
  heroku addons:create jawsdb:kitefin --app $App | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'فشل تزويد JawsDB — راجع رسالة heroku أعلاه' }

  # التزويد لا تزامني: heroku يعود فوراً بينما JawsDB تضبط JAWSDB_URL بعد ثوانٍ.
  # بلا هذا الانتظار تقرأ خطوة التحقق أدناه إعدادات ناقصة وتبدو كأن المتغير مفقود.
  Write-Step 'انتظار ضبط JAWSDB_URL'
  $waited = 0
  while ($waited -lt 120) {
    $cfg = heroku config --shell --app $App 2>$null | Out-String
    if ($cfg -match '(?m)^JAWSDB_URL=') { Write-Step "JAWSDB_URL جاهز بعد $waited ثانية"; break }
    Start-Sleep -Seconds 5
    $waited += 5
  }
  if ($waited -ge 120) { Write-Warn 'لم يظهر JAWSDB_URL خلال دقيقتين — تحقق بـ heroku addons' }
}

# ---------- المتغيرات الثابتة ----------

$pairs = [System.Collections.ArrayList]@()
function Add-Var($key, $value) {
  if ($null -eq $value -or $value -eq '') { return $false }
  [void]$pairs.Add("$key=$value")
  return $true
}

Add-Var 'NODE_ENV'      'production'          | Out-Null
Add-Var 'JWT_EXPIRE'    '7d'                  | Out-Null
Add-Var 'APP_DOMAIN'    $AppDomain            | Out-Null
Add-Var 'CLIENT_URL'    "https://$AppDomain"  | Out-Null
Add-Var 'TRUST_PROXY'   '1'                   | Out-Null
Add-Var 'SERVE_FRONTEND' 'true'               | Out-Null

# متغيرات الواجهة — تُحقن وقت البناء، فيجب ضبطها قبل النشر
Add-Var 'VITE_API_URL'       '/api'                 | Out-Null
Add-Var 'VITE_APP_DOMAIN'    $AppDomain             | Out-Null
Add-Var 'VITE_FRONTEND_URL'  "https://$AppDomain"   | Out-Null

# الوسائط
Add-Var 'R2_PUBLIC_URL'          $CdnUrl | Out-Null
Add-Var 'VITE_R2_PUBLIC_URL'     $CdnUrl | Out-Null
Add-Var 'R2_MAX_VIDEO_MB'        '100'   | Out-Null
Add-Var 'VITE_MAX_VIDEO_MB'      '100'   | Out-Null
Add-Var 'R2_MAX_DIRECT_VIDEO_MB' '25'    | Out-Null

# ---------- الأسرار المنقولة من .env ----------

$fromEnv = @(
  'R2_ACCOUNT_ID', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM_EMAIL', 'SMTP_FROM_NAME',
  'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'
)

$missing = @()
foreach ($key in $fromEnv) {
  if (-not (Add-Var $key $envVars[$key])) { $missing += $key }
}

# R2_PUBLIC_URL نضبطه على نطاق الـ CDN دائماً، لا على قيمة .env القديمة
if ($envVars['R2_PUBLIC_URL'] -and $envVars['R2_PUBLIC_URL'] -ne $CdnUrl) {
  Write-Warn "R2_PUBLIC_URL في .env يخالف $CdnUrl — سأستخدم قيمة الـ CDN"
}

# ---------- JWT_SECRET ----------

$existingConfig = heroku config --shell --app $App 2>$null | Out-String
if ($existingConfig -match '(?m)^JWT_SECRET=') {
  Write-Step "JWT_SECRET مضبوط مسبقاً — لن أغيّره (تغييره يُخرج كل المستخدمين)"
} else {
  Write-Step "توليد JWT_SECRET جديد للإنتاج"
  $secret = node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  Add-Var 'JWT_SECRET' $secret.Trim() | Out-Null
}

# ---------- التطبيق ----------

$names = $pairs | ForEach-Object { ($_ -split '=', 2)[0] }
Write-Step "ضبط $($pairs.Count) متغيراً:"
$names | Sort-Object | ForEach-Object { Write-Host "    $_" }

# استدعاء واحد = إعادة تشغيل واحدة. المخرجات مكتومة حتى لا تُطبع أي قيمة.
$pairsArray = $pairs.ToArray()
heroku config:set @pairsArray --app $App | Out-Null
if ($LASTEXITCODE -ne 0) { throw "فشل ضبط المتغيرات (heroku config:set أرجع $LASTEXITCODE)" }

if ($missing.Count -gt 0) {
  Write-Warn "غير موجودة في $EnvFile ولم تُضبط: $($missing -join ', ')"
}

# ---------- تحقق ----------

Write-Step "المتغيرات المضبوطة الآن على $App :"
(heroku config --shell --app $App 2>$null) |
  ForEach-Object { ($_ -split '=', 2)[0] } |
  Where-Object { $_ -ne '' } |
  Sort-Object |
  ForEach-Object { Write-Host "    $_" }

Write-Host ""
Write-Step "تمّ. الخطوة التالية:"
Write-Host "    git push heroku ui-ux/storefront-redesign:main"
