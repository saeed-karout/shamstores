// backend/scripts/migrate-storefront-palette.js
//
// نقل الواجهات التي لم يلمس أصحابها ألوانها إلى هوية شام ستورز الفاتحة.
//
// **لماذا سكربتٌ لا تغيير الافتراضيّ وحده:** كلّ مطعمٍ ومتجر يخزّن ألوانه
// الثمانية صراحةً (افتراضيّ المخطط يُكتب عند الإنشاء). فتغيير الافتراضيّ في
// المخطط والواجهة لا يصل إلا من يُنشأ بعده، ويبقى كلّ القائمين على الأخضر
// الداكن القديم.
//
// **مَن يُنقل:** من تطابق ألوانه الثمانية كلّها الافتراضيَّ القديم حرفياً —
// أي لم يغيّر شيئاً قطّ. مَن غيّر لوناً واحداً اختار، فلا يُمسّ.
//
// الافتراضيّ معاينةٌ بلا كتابة؛ `--apply` يكتب. مُعاد التنفيذ بأمان: من نُقل
// لم يعد يطابق القديم فيُتخطّى.
//
//   node scripts/migrate-storefront-palette.js           # معاينة
//   node scripts/migrate-storefront-palette.js --apply   # تنفيذ

const { prepareDatabaseUrl } = require('./db-env');

prepareDatabaseUrl();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

// الافتراضيّ القديم كما كان في schema.prisma — يختلف الأساسيّ وحده بين النوعين
const OLD_SHARED = {
  secondaryColor: '#10b981',
  backgroundColor: '#082e24',
  cardColor: '#112e23',
  surfaceColor: '#0f3d31',
  textColor: '#e8f5e9',
  mutedColor: '#9dc4ac',
  accentColor: '#c8e235'
};
const OLD_PRIMARY = { restaurant: '#3b82f6', store: '#0d4a3a' };

// نظير SF_FALLBACK في frontend/src/utils/storefrontTheme.ts
const NEW_PALETTE = {
  primaryColor: '#084835',
  secondaryColor: '#C07CDF',
  backgroundColor: '#F6F8F5',
  cardColor: '#FFFFFF',
  surfaceColor: '#EEF3EF',
  textColor: '#10231B',
  mutedColor: '#647870',
  accentColor: '#084835'
};

const norm = (v) => String(v || '').trim().toLowerCase();

const untouched = (row, kind) =>
  norm(row.primaryColor) === OLD_PRIMARY[kind] &&
  Object.entries(OLD_SHARED).every(([key, value]) => norm(row[key]) === value);

const select = {
  id: true,
  name: true,
  primaryColor: true,
  secondaryColor: true,
  backgroundColor: true,
  cardColor: true,
  surfaceColor: true,
  textColor: true,
  mutedColor: true,
  accentColor: true
};

(async () => {
  console.log(APPLY ? 'تنفيذ النقل:' : 'معاينة (بلا كتابة — أضف --apply للتنفيذ):');

  for (const kind of ['restaurant', 'store']) {
    const model = prisma[kind];
    const rows = await model.findMany({ select });
    const targets = rows.filter((r) => untouched(r, kind));
    console.log(`\n${kind}: ${rows.length} إجمالاً، ${targets.length} على الافتراضيّ القديم، ${rows.length - targets.length} مخصَّص أو منقول`);
    targets.forEach((r) => console.log(`  • ${r.name} (${r.id})`));

    if (APPLY && targets.length > 0) {
      // تحديثٌ واحد مشروطٌ بالألوان نفسها — لا يمسّ من غيّر لونه بين القراءة والكتابة
      const result = await model.updateMany({
        where: { id: { in: targets.map((r) => r.id) }, backgroundColor: { in: ['#082E24', '#082e24'] } },
        data: NEW_PALETTE
      });
      console.log(`  ✓ نُقل ${result.count}`);
    }
  }

  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
