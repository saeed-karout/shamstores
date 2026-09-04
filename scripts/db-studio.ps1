# scripts/db-studio.ps1
#
# يفتح Prisma Studio على قاعدة بيانات الإنتاج (JawsDB) لتصفّح الجداول
# وتعديلها يدوياً من المتصفح.
#
# رابط الاتصال يُقرأ من Heroku ويُمرَّر إلى العملية مباشرة — لا يُطبع ولا
# يُكتب في أي ملف.
#
# التشغيل من جذر المستودع:
#   powershell -ExecutionPolicy Bypass -File scripts/db-studio.ps1
#
# ⚠️ هذه بيانات إنتاج حقيقية. لا تراجع عن أي تعديل هنا، ولا نسخة احتياطية
#    على خطة JawsDB المجانية. عدّل صفاً واحداً في كل مرة وتحقق منه.

param(
  [string]$App = 'shamstores'
)

$ErrorActionPreference = 'Continue'

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

if (-not (Get-Command heroku -ErrorAction SilentlyContinue)) {
  throw "heroku CLI غير موجود في PATH."
}

Write-Step "جلب رابط قاعدة البيانات من $App"
$url = heroku config:get JAWSDB_URL --app $App
if ([string]::IsNullOrWhiteSpace($url)) {
  throw "JAWSDB_URL فارغ. تحقق: heroku addons --app $App"
}

# اسم القاعدة فقط للتأكيد البصري — بلا مستخدم ولا كلمة مرور ولا مضيف
$dbName = ($url -split '/')[-1] -replace '\?.*$', ''
Write-Host ""
Write-Host "  ⚠️  قاعدة بيانات إنتاج: $dbName" -ForegroundColor Yellow
Write-Host "     أي تعديل هنا فوري ولا يمكن التراجع عنه." -ForegroundColor Yellow
Write-Host ""

# Prisma CLI يقرأ DATABASE_URL من البيئة. dotenv لا يطغى على متغيّر مضبوط
# مسبقاً، فقيمة الإنتاج هذه تسبق ما في backend/.env.
$env:DATABASE_URL = $url

Write-Step "تشغيل Prisma Studio — أوقفه بـ Ctrl+C"
Push-Location backend
try {
  npx prisma studio
} finally {
  Pop-Location
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}
