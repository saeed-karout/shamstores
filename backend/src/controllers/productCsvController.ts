// backend/src/controllers/productCsvController.ts
//
// تصدير المنتجات واستيرادها بملفّ CSV.
//
// **ما تحلّه:** إدخال مئة منتج من الشاشة منتجاً منتجاً عملُ يومين، وتعديل
// أسعار مئة منتج بعد تغيّر الصرف عملُ يومٍ آخر. والتاجر يملك بياناته في
// جدولٍ أصلاً — إمّا من منصّةٍ سابقة أو من دفتره.
//
// **والقرار الذي يجعلها تُستعمل: المطابقة برمز المنتج (SKU).**
// الاستيراد ليس «إضافة» بل «إضافة أو تحديث»: رمزٌ موجود يُحدَّث، وجديد
// يُنشأ. فيصير الملفّ المصدَّر قابلاً للتعديل في Excel وإعادة الرفع —
// وهذه هي الطريقة التي يعدّل بها التاجر خمسين سعراً في دقيقتين. ولولا
// ذلك لكان كل استيراد يضاعف الكتالوج.
//
// **وقبل الكتابة يُعرَض ما سيقع (`dryRun`).** استيرادٌ يكتب أوّلاً ثم
// يُخبر بما فعل لا يُثق به: التاجر يرفع ملفّاً ويرى «حُدّث ٤٠ منتجاً» ولا
// يعرف أيّها. فالتقرير أوّلاً بأرقامه وأخطائه، ثمّ التنفيذ بضغطةٍ ثانية.

import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../services/prisma';
import { toCsv, sendCsv, parseCsv, rowsToObjects } from '../services/csv.service';
import { sanitizeTags, readTags } from '../services/catalogTaxonomy.service';

/** رؤوس الملفّ المصدَّر — وهي نفسها التي يقبلها الاستيراد */
const COLUMNS = [
  'رمز المنتج',
  'الاسم',
  'الاسم بالإنجليزية',
  'الوصف',
  'الوصف بالإنجليزية',
  'السعر',
  'السعر قبل الخصم',
  'التكلفة',
  'الكمية',
  'حد التنبيه',
  'الفئة',
  'الوحدة',
  'متوفر',
  'رابط الصورة',
  'الوسوم'
];

/**
 * الأسماء المقبولة لكل عمود.
 *
 * **التسامح مقصود:** التاجر قد يستورد ملفّاً من منصّةٍ أخرى برؤوس
 * إنجليزية، أو يفتح ملفّنا في Excel فيبدّل حرفاً. ورفض الملفّ كلّه لأجل
 * رأسٍ مختلف يجعل الميزة بلا فائدة — والأعمدة المجهولة تُبلَّغ ولا تُسقط
 * الاستيراد.
 */
const ALIASES: Record<string, string[]> = {
  sku: ['رمز المنتج', 'الرمز', 'رمز', 'sku', 'code', 'barcode', 'باركود'],
  name: ['الاسم', 'اسم المنتج', 'name', 'title'],
  nameEn: ['الاسم بالإنجليزية', 'الاسم الإنجليزي', 'name en', 'nameen', 'english name'],
  description: ['الوصف', 'description'],
  descriptionEn: ['الوصف بالإنجليزية', 'description en', 'descriptionen'],
  price: ['السعر', 'price'],
  originalPrice: ['السعر قبل الخصم', 'السعر الأصلي', 'original price', 'originalprice', 'compare price'],
  cost: ['التكلفة', 'cost'],
  stock: ['الكمية', 'المخزون', 'stock', 'quantity', 'qty'],
  minStockLevel: ['حد التنبيه', 'الحد الأدنى', 'min stock', 'minstocklevel'],
  category: ['الفئة', 'التصنيف', 'category'],
  unit: ['الوحدة', 'unit'],
  isAvailable: ['متوفر', 'متوفّر', 'available', 'is available', 'isavailable', 'الحالة'],
  imageUrl: ['رابط الصورة', 'الصورة', 'image', 'image url', 'imageurl'],
  tags: ['الوسوم', 'الوسم', 'tags', 'tag', 'labels']
};

const getStoreId = (req: AuthRequest): string | null => req.user?.storeId || null;

// ==================== التصدير ====================

export const exportProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    const products = await prisma.product.findMany({
      where: { storeId },
      include: { category: { select: { name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });

    const rows = products.map((p) => [
      p.sku,
      p.name,
      p.nameEn ?? '',
      p.description ?? '',
      p.descriptionEn ?? '',
      p.price,
      p.originalPrice ?? '',
      p.cost ?? '',
      p.stock,
      p.minStockLevel,
      p.category?.name ?? '',
      p.unit,
      // «نعم/لا» لا `true/false`: الملفّ يُقرأ بعينٍ عربية ويُعاد رفعه،
      // والاستيراد يقبل الصيغتين
      p.isAvailable ? 'نعم' : 'لا',
      p.imageUrl ?? '',
      // الفاصلة المنقوطة داخل الخلية: الفاصلة تفصل الأعمدة نفسها
      readTags(p.tags).join('; ')
    ]);

    sendCsv(res, `products-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(COLUMNS, rows));
  } catch (error) {
    console.error('exportProducts failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر تصدير المنتجات' });
  }
};

/** ملفّ فارغ بالرؤوس وحدها — نقطة البداية لمن لا يملك جدولاً */
export const productTemplate = (_req: AuthRequest, res: Response): void => {
  const sample = [
    [
      'SKU-001', 'قميص قطن', 'Cotton shirt', 'قميص قطن ١٠٠٪', '',
      45000, 55000, 30000, 12, 3, 'ملابس', 'piece', 'نعم', '',
      'قطن; صيفي; رجالي'
    ]
  ];
  sendCsv(res, 'products-template.csv', toCsv(COLUMNS, sample));
};

// ==================== الاستيراد ====================

interface RowError {
  row: number;
  sku: string;
  message: string;
}

const toNumber = (value: string): number | null => {
  if (!value) return null;
  // الأرقام العربية والفواصل الألفية: Excel العربيّ يكتب «45,000» و«٤٥٠٠٠»
  const latin = value
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[,\s٬]/g, '')
    .replace(/٫/g, '.');
  const n = Number(latin);
  return Number.isFinite(n) ? n : null;
};

const toBool = (value: string, fallback = true): boolean => {
  const v = value.trim().toLowerCase();
  if (!v) return fallback;
  if (['نعم', 'متوفر', 'متوفّر', 'true', '1', 'yes', 'y'].includes(v)) return true;
  if (['لا', 'غير متوفر', 'false', '0', 'no', 'n'].includes(v)) return false;
  return fallback;
};

/**
 * يقرأ الملفّ ويبني خطّة التنفيذ — بلا كتابة.
 *
 * تُستعمل للمعاينة وللتنفيذ معاً: خطّةٌ واحدة تُحسب مرّتين بنفس الكود
 * تعني أن ما عُرض هو ما سيقع، لا تقديراً قريباً منه.
 */
const buildPlan = async (storeId: string, csvText: string) => {
  const rows = parseCsv(csvText);
  if (rows.length === 0) throw new Error('الملفّ فارغ');
  if (rows.length === 1) throw new Error('الملفّ يحوي الرؤوس بلا صفوف');

  const { records, unknownHeaders } = rowsToObjects(rows, ALIASES);

  // الرمز والاسم والسعر هي الحدّ الأدنى — بلا رأسٍ للرمز لا مطابقة
  const header = rows[0];
  const hasSkuColumn = records.some((r) => 'sku' in r);
  if (!hasSkuColumn) {
    throw new Error(
      `لا عمود لرمز المنتج. الرؤوس المقروءة: ${header.filter(Boolean).join(' · ')}`
    );
  }

  const [existing, categories] = await Promise.all([
    prisma.product.findMany({ where: { storeId }, select: { id: true, sku: true } }),
    prisma.category.findMany({ where: { storeId }, select: { id: true, name: true } })
  ]);

  const bySku = new Map(existing.map((p) => [p.sku.trim().toLowerCase(), p.id]));
  const byCategory = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));

  const errors: RowError[] = [];
  const creates: any[] = [];
  const updates: { id: string; data: any }[] = [];
  const newCategories = new Set<string>();
  const seenSkus = new Set<string>();

  records.forEach((record, index) => {
    const line = index + 2; // الرأس سطرٌ أوّل، وExcel يعدّ من واحد
    const sku = (record.sku || '').trim();

    if (!sku) {
      errors.push({ row: line, sku: '', message: 'رمز المنتج فارغ — بلا رمزٍ لا يُعرف أيُّ منتجٍ يُحدَّث' });
      return;
    }
    const key = sku.toLowerCase();
    if (seenSkus.has(key)) {
      errors.push({ row: line, sku, message: 'الرمز مكرّر في الملفّ نفسه' });
      return;
    }
    seenSkus.add(key);

    const isUpdate = bySku.has(key);
    const name = (record.name || '').trim();
    if (!isUpdate && !name) {
      errors.push({ row: line, sku, message: 'منتجٌ جديد بلا اسم' });
      return;
    }

    const price = toNumber(record.price ?? '');
    if (!isUpdate && price === null) {
      errors.push({ row: line, sku, message: 'منتجٌ جديد بلا سعر' });
      return;
    }
    if (record.price && price === null) {
      errors.push({ row: line, sku, message: `السعر «${record.price}» ليس رقماً` });
      return;
    }
    if (price !== null && price < 0) {
      errors.push({ row: line, sku, message: 'السعر سالب' });
      return;
    }

    // الفئة بالاسم: تُطابَق، وإن غابت تُنشأ ويُبلَّغ بها — لا تُنشأ بصمت
    let categoryId: string | null | undefined;
    const categoryName = (record.category || '').trim();
    if (categoryName) {
      const found = byCategory.get(categoryName.toLowerCase());
      if (found) categoryId = found;
      else newCategories.add(categoryName);
    }

    const stock = toNumber(record.stock ?? '');
    const minStock = toNumber(record.minStockLevel ?? '');
    const original = toNumber(record.originalPrice ?? '');
    const cost = toNumber(record.cost ?? '');

    // الحقول الغائبة عن الملفّ لا تُصفَّر عند التحديث: ملفٌّ فيه عمودا
    // الرمز والسعر وحدهما يجب أن يعدّل السعر ولا يمسح الوصف والصورة
    const data: any = {};
    if (name) data.name = name;
    if ('nameEn' in record) data.nameEn = record.nameEn || null;
    if ('description' in record) data.description = record.description || null;
    if ('descriptionEn' in record) data.descriptionEn = record.descriptionEn || null;
    if (price !== null) data.price = price;
    if ('originalPrice' in record) data.originalPrice = original;
    if ('cost' in record) data.cost = cost;
    if (stock !== null) data.stock = Math.max(0, Math.round(stock));
    if (minStock !== null) data.minStockLevel = Math.max(0, Math.round(minStock));
    if ('unit' in record && record.unit) data.unit = record.unit;
    if ('isAvailable' in record) data.isAvailable = toBool(record.isAvailable);
    if ('imageUrl' in record) data.imageUrl = record.imageUrl || null;
    // الوسوم تصل نصّاً بفواصل منقوطة، و`sanitizeTags` تقبله وتطبّعه —
    // وبها يوسم التاجر مئة منتجٍ في Excel بدل مئة فتحةٍ للنموذج
    if ('tags' in record) data.tags = sanitizeTags(record.tags);
    if (categoryId !== undefined) data.categoryId = categoryId;

    if (isUpdate) {
      updates.push({ id: bySku.get(key)!, data });
    } else {
      creates.push({
        storeId,
        sku,
        name,
        price: price ?? 0,
        stock: data.stock ?? 0,
        ...data,
        // الفئة الجديدة تُربط بعد إنشائها، فتُحمل باسمها مؤقّتاً
        __categoryName: categoryId ? null : categoryName || null
      });
    }
  });

  return {
    unknownHeaders,
    newCategories: [...newCategories],
    creates,
    updates,
    errors,
    summary: {
      rows: records.length,
      willCreate: creates.length,
      willUpdate: updates.length,
      willSkip: errors.length
    }
  };
};

/** يقرأ نصّ الملفّ من الطلب — يُقبَل خامّاً أو داخل حقل JSON */
const readCsvBody = (req: AuthRequest): string => {
  if (typeof req.body === 'string') return req.body;
  const csv = (req.body as any)?.csv;
  return typeof csv === 'string' ? csv : '';
};

export const importProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      res.status(400).json({ success: false, error: 'معرف المتجر غير موجود' });
      return;
    }

    const csvText = readCsvBody(req);
    if (!csvText.trim()) {
      res.status(400).json({ success: false, error: 'لم يصل محتوى الملفّ' });
      return;
    }
    // حدٌّ يحمي الذاكرة: خمسة ميغا ≈ عشرات آلاف الصفوف
    if (csvText.length > 5_000_000) {
      res.status(413).json({ success: false, error: 'الملفّ أكبر من خمسة ميغابايت' });
      return;
    }

    const plan = await buildPlan(storeId, csvText);
    const dryRun = String(req.query.dryRun ?? '') === '1' || (req.body as any)?.dryRun === true;

    if (dryRun) {
      res.json({
        success: true,
        data: {
          dryRun: true,
          ...plan.summary,
          newCategories: plan.newCategories,
          unknownHeaders: plan.unknownHeaders,
          // عشرة أخطاء تكفي لفهم النمط، والباقي يُعدّ
          errors: plan.errors.slice(0, 10),
          errorsTotal: plan.errors.length
        }
      });
      return;
    }

    // الفئات الجديدة أوّلاً — المنتجات تحتاج معرّفاتها
    const createdCategories = new Map<string, string>();
    for (const name of plan.newCategories) {
      const category = await prisma.category.create({ data: { storeId, name } });
      createdCategories.set(name.toLowerCase(), category.id);
    }

    let created = 0;
    let updated = 0;

    // دفعاتٌ من مئة لا معاملةٌ واحدة: ملفٌّ بألف صفٍّ في معاملةٍ واحدة
    // يقفل الجدول ويتجاوز مهلة القاعدة. والدفعة الفاشلة تُبلَّغ ولا
    // تُسقط ما نجح قبلها — لأن التاجر يستطيع إعادة الرفع بأمان: المطابقة
    // بالرمز تجعل الاستيراد قابلاً للتكرار
    const chunk = 100;

    for (let i = 0; i < plan.creates.length; i += chunk) {
      const slice = plan.creates.slice(i, i + chunk).map((row) => {
        const { __categoryName, ...rest } = row;
        if (__categoryName) rest.categoryId = createdCategories.get(String(__categoryName).toLowerCase()) ?? null;
        return rest;
      });
      await prisma.$transaction(slice.map((data) => prisma.product.create({ data })));
      created += slice.length;
    }

    for (let i = 0; i < plan.updates.length; i += chunk) {
      const slice = plan.updates.slice(i, i + chunk);
      await prisma.$transaction(
        slice.map(({ id, data }) => prisma.product.update({ where: { id }, data }))
      );
      updated += slice.length;
    }

    res.json({
      success: true,
      message: `أُضيف ${created} وحُدّث ${updated}`,
      data: {
        dryRun: false,
        created,
        updated,
        skipped: plan.errors.length,
        newCategories: plan.newCategories,
        errors: plan.errors.slice(0, 10),
        errorsTotal: plan.errors.length
      }
    });
  } catch (error: any) {
    console.error('importProducts failed:', error);
    res.status(400).json({ success: false, error: error?.message || 'تعذّر استيراد الملفّ' });
  }
};

export default { exportProducts, productTemplate, importProducts };
